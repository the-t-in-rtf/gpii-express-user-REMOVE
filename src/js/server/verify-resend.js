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

fluid.registerNamespace("gpii.express.user.resend.verify.handler");

gpii.express.user.resend.verify.handler.sendVerificationMessage = function (that, user) {
    var mailOptions = fluid.copy(that.options.mailDefaults);
    mailOptions.to  = that.request.body.email;

    var templateContext = fluid.copy(that.options.templateDefaultContext);
    templateContext.user = user;
    that.mailer.sendMessage(mailOptions, templateContext); // The mailer listeners will take care of the response from here.
};

gpii.express.user.resend.verify.handler.checkVerificationCode = function (that, user) {
    if (user.verified) {
        that.sendFinalResponse(200, { ok: true, message: "Your account has already been verified."});
    }
    else if (!user.verification_code) {
        that.sendFinalResponse(500, { ok: false, message: "Cannot retrieve verification code.  Contact an administrator."});
    }
    else {
        gpii.express.user.resend.verify.handler.sendVerificationMessage(that, user);
    }
};

fluid.defaults("gpii.express.user.resend.verify.handler", {
    gradeNames: ["gpii.express.handler"],
    components: {
        reader: {
            type: "",
            options: {
                url:     "{gpii.express.user.api.resend.verify}.options.urls.read",
                termMap: { "code": "%code" },
                listeners: {
                    "onRead.checkVerificationCode": {
                        funcName: "gpii.express.user.resend.verify.handler.checkVerificationCode",
                        args:     ["{gpii.express.user.resend.verify.handler}", "{arguments}.0"],
                        priority: "last"
                    }
                }
            }
        },
        mailer: {
            type: "gpii.mailer.smtp.handlebars",
            options: {
                templateDir:     "{gpii.express.user.api.verify.resend}.options.templateDir",
                htmlTemplateKey: "{gpii.express.user.api.verify.resend}.options.templates.mail.html",
                textTemplateKey: "{gpii.express.user.api.verify.resend}.options.templates.mail.text",
                listeners: {
                    "onSuccess.sendResponse": {
                        func: "{gpii.express.user.resend.verify.handler}.sendFinalResponse",
                        args: [200, { ok: true, message: "Your verification code has been resent.  Please check your email for details."}]
                    },
                    "onError.sendResponse": {
                        func: "{gpii.express.user.resend.verify.handler}.sendFinalResponse",
                        args: [500, { ok: false, message: "A verification code could not be sent to you via email.  Contact an administrator."}]
                    }
                }
            }

        }
    }
});

fluid.registerNamespace("gpii.express.user.resend.verify.handler.html");

gpii.express.user.resend.verify.handler.html.sendFinalResponse = function (that, statusCode, context) {
    that.response.status(statusCode).render(that.options.templateKey, context);
};

fluid.defaults("gpii.express.user.resend.verify.handler.html", {
    gradeNames: ["gpii.express.user.resend.verify.handler"],
    templateKey: "{gpii.express.user.api.resend.verify}.options.templates.html",
    invokers: {
        sendFinalResponse: {
            funcName: "gpii.express.user.resend.verify.handler.text.sendFinalResponse",
            args:     ["{that}", "{arguments}.0", "{arguments}.1"] // status code, template context
        }
    }
});

fluid.defaults("gpii.express.user.resend.verify.handler.json", {
    gradeNames: ["gpii.express.user.resend.verify.handler"],
    invokers: {
        sendFinalResponse: {
            func: "{that}.sendResponse",
            args: ["{arguments}.0", "{arguments}.1"] // statusCode, message body
        }
    }
});

fluid.defaults("gpii.express.user.api.resend.verify", {
    gradeNames: ["gpii.express.contentAware.router"],
    templates: {
        html: "pages/verify-resend",
        mail: {
            text: "email-verify-text",
            html: "email-verify-html"
        }
    },
    urls: {
        read: {
            expander: {
                funcName: "fluid.stringTemplate",
                args:     [ "http://localhost:%port/%userDbName/_design/lookup/_view/byVerificationCode?key=\"%code\"", "{that}.options.couch"]
            }
        }
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
    }

});