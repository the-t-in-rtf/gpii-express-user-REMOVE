/*

  A router endpoint to allow resending of verification codes per [CTR-104](https://issues.gpii.net/browse/CTR-104).

  Consists of two parts:
  1. A GET handler that returns a form that can be used to request a reset.
  2. A POST handler that checks for the existing of a verification code for the given user and resends it if found.
    a. If the request headers indicate that JSON data is accepted, a JSON receipt is sent.
    b. If the request headers indicate that text data is accepted, a text receipt is sent.

  // TODO:  Update this to send the verification form for a GET and migrate the other bits to just the POST side.
 */
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

require("./lib/singleTemplateRouter");

fluid.registerNamespace("gpii.express.user.api.verify.resend.handler");

gpii.express.user.api.verify.resend.handler.sendVerificationMessage = function (that, user) {
    var mailOptions = fluid.copy(that.options.mailDefaults);
    mailOptions.to  = that.request.body.email;

    var templateContext = fluid.copy(that.options.templateDefaultContext);
    templateContext.user = user;
    that.mailer.sendMessage(mailOptions, templateContext); // The mailer listeners will take care of the response from here.
};

gpii.express.user.api.verify.resend.handler.getVerificationCode = function (that, user) {
    if (!user || !user.username) {
        that.sendFinalResponse(404, { ok: false, message: "I couldn't find an account that matches the email address you provided."});
    }
    else if (user.verified) {
        that.sendFinalResponse(200, { ok: true, message: "Your account has already been verified."});
    }
    else if (!user.verification_code) {
        that.sendFinalResponse(500, { ok: false, message: "Cannot retrieve verification code.  Contact an administrator."});
    }
    else {
        gpii.express.user.api.verify.resend.handler.sendVerificationMessage(that, user);
    }
};

fluid.defaults("gpii.express.user.api.verify.resend.handler", {
    gradeNames: ["gpii.express.handler"],
    mailDefaults: {
        from:    "test@localhost",
        subject: "Please verify your account..."
    },
    templateDefaultContext: {
        app: "{gpii.express}.options.config.app"
    },
    invokers: {
        handleRequest: {
            func: "{reader}.get",
            args: ["{that}.request.body"]
        }
    },
    components: {
        reader: {
            type: "gpii.express.user.couchdb.read",
            options: {
                url:     "{gpii.express.user.api.verify.resend}.options.urls.read",
                rules: {
                    read: {
                        "":         "rows.0.value"
                    }
                },
                termMap: { "email": "%email" },
                listeners: {
                    "onRead.getVerificationCode": {
                        funcName: "gpii.express.user.api.verify.resend.handler.getVerificationCode",
                        args:     ["{gpii.express.user.api.verify.resend.handler}", "{arguments}.0"],
                        priority: "last"
                    }
                }
            }
        },
        mailer: {
            type: "gpii.express.user.mailer.handlebars",
            options: {
                templateDir:     "{gpii.express.user.api.verify.resend}.options.templateDir",
                htmlTemplateKey: "email-verify-html",
                textTemplateKey: "email-verify-text",
                listeners: {
                    "onSuccess.sendResponse": {
                        func: "{gpii.express.user.api.verify.resend.handler}.sendFinalResponse",
                        args: [200, { ok: true, message: "Your verification code has been resent.  Please check your email for details."}]
                    },
                    "onError.sendResponse": {
                        func: "{gpii.express.user.api.verify.resend.handler}.sendFinalResponse",
                        args: [500, { ok: false, message: "A verification code could not be sent to you via email.  Contact an administrator."}]
                    }
                }
            }

        }
    }
});

fluid.registerNamespace("gpii.express.user.api.verify.resend.handler.html");

gpii.express.user.api.verify.resend.handler.html.sendFinalResponse = function (that, statusCode, context) {
    that.response.status(statusCode).render(that.options.templateKey, context);
};

fluid.defaults("gpii.express.user.api.verify.resend.handler.html", {
    gradeNames: ["gpii.express.user.api.verify.resend.handler"],
    templateKey: "{gpii.express.user.api.verify.resend}.options.templates.html",
    invokers: {
        sendFinalResponse: {
            funcName: "gpii.express.user.api.verify.resend.handler.text.sendFinalResponse",
            args:     ["{that}", "{arguments}.0", "{arguments}.1"] // status code, template context
        }
    }
});

fluid.defaults("gpii.express.user.api.verify.resend.handler.json", {
    gradeNames: ["gpii.express.user.api.verify.resend.handler"],
    invokers: {
        sendFinalResponse: {
            func: "{that}.sendResponse",
            args: ["{arguments}.0", "{arguments}.1"] // statusCode, message body
        }
    }
});

fluid.defaults("gpii.express.user.api.verify.resend", {
    gradeNames: ["gpii.express.router.passthrough"],
    path:       "/resend",
    method:     "use",
    urls: {
        read: {
            expander: {
                funcName: "fluid.stringTemplate",
                args:     ["%userDbUrl/_design/lookup/_view/byUsernameOrEmail?key=\"%email\"", "{that}.options.couch"]
            }
        }
    },
    components: {
        postRouter: {
            type: "gpii.express.contentAware.router",
            options: {
                path: ["/"],
                templates: {
                    html: "pages/verify-resend-receipt"
                },
                handlers: {
                    json: {
                        contentType:   "application/json",
                        handlerGrades: ["gpii.express.user.api.verify.resend.handler.json"]
                    },
                    text: {
                        contentType:   ["text/html", "text/plain"],
                        handlerGrades: ["gpii.express.user.api.verify.resend.handler.html"]
                    }
                },
                method: "post"
            }
        },
        formRouter: {
            type: "gpii.express.user.api.singleTemplateRouter",
            options: {
                templateKey: "pages/verify-resend",
                method:      "get"
            }
        }
    }
});