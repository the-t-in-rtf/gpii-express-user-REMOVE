/*

  Provides the first part of a two-step password reset mechanism.  A user enters their email address or username, and
  is sent a special link with a reset code.  They can use this link to reset their password.  That functionality is
  handled by the `reset` module in this directory.

  This module consists of two parts:

    1. A `GET` router that serves up the initial form.
    2. A `POST` router and handlers that check to see if the user exists before generating a reset code and sending them an email.

  Unlike the API endpoints that we expect people to hit directly with their browser, this endpoint only returns a JSON
  message.

 */
"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

var request = require("request");

require("./lib/password");
require("./lib/passthroughRouter");
require("./lib/singleTemplateRouter");

fluid.registerNamespace("gpii.express.user.api.forgot.post.handler");
gpii.express.user.api.forgot.post.handler.checkUser = function (that, user) {
    if (!user || !user.username) {
        that.sendResponse(404, { ok: false, message: "No matching user found."});
    }
    else {
        // TODO:  Replace this with a writable dataSource
        that.user = fluid.copy(user);
        that.user[that.options.resetCodeKey]  = gpii.express.user.password.generateSalt(that.options.resetCodeLength);
        that.user[that.options.codeIssuedKey] = new Date();

        var writeUrl = fluid.stringTemplate(that.options.urls.write, { id: that.user._id});
        var writeOptions = {
            url:    writeUrl,
            json:   true,
            method: "PUT",
            body:   that.user
        };
        request(writeOptions, that.handleRequestResponse);
    }
};

gpii.express.user.api.forgot.post.handler.handleRequestResponse = function (that, error, response, body) {
    if (error) {
        that.sendResponse(500, { ok: false, message: error.message, stack: error.stack });
    }
    else if (response && [200, 201].indexOf(response.statusCode) === -1) {
        that.sendResponse(response.statusCode, { ok: false, message: body });
    }
    else {
        var mailOptions = fluid.copy(that.options.mailDefaults);
        mailOptions.to  = that.request.body.email;

        var templateContext  = that.options.templateDefaultContext ? fluid.copy(that.options.templateDefaultContext): {};
        templateContext.user = that.user;

        that.mailer.sendMessage(mailOptions, templateContext);
    }
};

fluid.defaults("gpii.express.user.api.forgot.post.handler", {
    gradeNames: ["gpii.express.handler"],
    members: {
        user: null
    },
    invokers: {
        handleRequest: {
            func: "{reader}.get",
            args: ["{that}.request.body"]
        },
        handleRequestResponse: {
            funcName: "gpii.express.user.api.forgot.post.handler.handleRequestResponse",
            args:     ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"] // error, response, body
        }

    },
    components: {
        reader: {
            type: "gpii.express.user.couchdb.read",
            options: {
                url:     "{gpii.express.user.api.forgot}.options.urls.read",
                termMap: { email: "%email"},
                rules: {
                    read: {
                        "" : "rows.0.value"
                    }
                },
                listeners: {
                    "onRead.checkUser": {
                        priority: "last",
                        func:     "gpii.express.user.api.forgot.post.handler.checkUser",
                        args:     ["{gpii.express.user.api.forgot.post.handler}", "{arguments}.0"] // The response from our dataSource
                    }
                }
            }
        },
        mailer: {
            type: "gpii.express.user.mailer.handlebars",
            options: {
                templateDir:     "{gpii.express.user.api.forgot}.options.templateDir",
                htmlTemplateKey: "{gpii.express.user.api.forgot}.options.templates.mail.html",
                textTemplateKey: "{gpii.express.user.api.forgot}.options.templates.mail.text",
                listeners: {
                    "onSuccess.sendResponse": {
                        func: "{handler}.sendResponse",
                        args: [200, { ok: true, message: "A password reset code and instructions have been sent to your email address."}]
                    },
                    "onError.sendResponse": {
                        func: "{handler}.sendResponse",
                        args: [500, { ok: false, message: "A password reset code could not be sent.  Contact an administrator."}]
                    }
                }
            }

        }
    }
});

fluid.registerNamespace("gpii.express.user.api.forgot.post");
fluid.defaults("gpii.express.user.api.forgot.post", {
    gradeNames: ["gpii.express.requestAware.router"],
    path:       "/",
    method:     "post",
    distributeOptions: {
        source: "{that}.options.urls",
        target: "{that > gpii.express.handler}.options.urls"
    },
    handlerGrades: ["gpii.express.user.api.forgot.post.handler"]
});

fluid.defaults("gpii.express.user.api.forgot", {
    gradeNames: ["gpii.express.router.passthrough"],
    path:       "/forgot",
    templates: {
        form:     "pages/forgot",
        mail: {
            text: "email-forgot-text",
            html: "email-forgot-html"
        }
    },
    urls: {
        read: {
            expander: {
                funcName: "fluid.stringTemplate",
                args: [
                    "%userDbUrl/_design/lookup/_view/byUsernameOrEmail?key=\"%email\"",
                    "{that}.options.couch"
                ]
            }
        },
        write: {
            expander: {
                funcName: "fluid.stringTemplate",
                args: [
                    "%userDbUrl/%id",
                    "{that}.options.couch"
                ]
            }
        }
    },
    resetCodeLength: 16,
    // Both of these should match what is used in `gpii.express.user.api.reset`
    resetCodeKey:   "reset_code",
    codeIssuedKey:  "reset_code_issued",
    mailDefaults:    {
        from:    "noreply@localhost",
        subject: "Reset your password..."
    },
    templateDefaultContext: {
        app: "{gpii.express}.options.config.app"
    },
    distributeOptions: [
        {
            source: "{that}.options.urls",
            target: "{that > gpii.express.router}.options.urls"
        },
        {
            source: "{that}.options.templateDir",
            target: "{that > gpii.express.router}.options.templateDir"
        },
        {
            source: "{that}.options.resetCodeKey",
            target: "{that gpii.express.handler}.options.resetCodeKey"
        },
        {
            source: "{that}.options.resetCodeLength",
            target: "{that gpii.express.handler}.options.resetCodeLength"
        },
        {
            source: "{that}.options.codeIssuedKey",
            target: "{that gpii.express.handler}.options.codeIssuedKey"
        },
        {
            source: "{that}.options.mailDefaults",
            target: "{that gpii.express.handler}.options.mailDefaults"
        },
        {
            source: "{that}.options.templateDefaultContext",
            target: "{that gpii.express.handler}.options.templateDefaultContext"
        }
    ],
    components: {
        getRouter: {
            type: "gpii.express.user.api.singleTemplateRouter",
            options: {
                templateKey: "{gpii.express.user.api.forgot}.options.templates.form",
                defaultContext: "{gpii.express.user.api.forgot}.options.defaultContext"
            }
        },
        postRouter: {
            type: "gpii.express.user.api.forgot.post"
        }
    }
});
