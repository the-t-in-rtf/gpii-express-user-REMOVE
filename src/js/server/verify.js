/*

  Provides the REST endpoint for `/api/user/verify/:code`, which is the second stage in the self-sign up process.  If a
  valid verification code is provided, the user's account will be flagged as verified.

  This API requires a verification code, which is generated using the `/api/user/signup` process and sent to the user
  via email.  The code can be resent by visiting `/api/user/verify/resend`.

 */
"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

// TODO: replace this with a writable dataSource
var request = require("request");

fluid.registerNamespace("gpii.express.user.api.verify.handler");

require("./lib/datasource");
require("./verify-resend");

gpii.express.user.api.verify.handler.checkVerificationCode = function (that, dataSourceResponse) {
    if (!dataSourceResponse || !dataSourceResponse[that.options.codeKey] || (that.request.params.code !== dataSourceResponse[that.options.codeKey])) {
        that.sendFinalResponse(401, { ok: false, message: "You must provide a valid verification code to use this interface."});
    }
    else {
        var updatedUserRecord = fluid.copy(dataSourceResponse);
        updatedUserRecord.verified = true;
        delete updatedUserRecord[that.options.codeKey];

        // TODO:  Convert this to use a writable dataSource
        var writeUrl = fluid.stringTemplate(that.options.urls.write, { id: updatedUserRecord._id});
        var writeOptions = {
            url:    writeUrl,
            json:   true,
            method: "PUT",
            body:   updatedUserRecord
        };
        request(writeOptions, function (error, response, body) {
            if (error) {
                that.sendFinalResponse(500, { ok: false, message: error});
            }
            else if ([201, 200].indexOf(response.statusCode) === -1) {
                that.sendFinalResponse(response.statusCode, { ok: false, message: body});
            }
            else {
                that.sendFinalResponse(200, { ok: true, message: "Your account has been verified.  You can now log in."});
            }
        });
    }
};

fluid.defaults("gpii.express.user.api.verify.handler", {
    gradeNames: ["gpii.express.handler"],
    codeKey:    "{gpii.express.user.api.verify}.options.codeKey",
    urls:       "{gpii.express.user.api.verify}.options.urls",
    components: {
        reader: {
            type: "gpii.express.user.couchdb.read",
            options: {
                url: "{gpii.express.user.api.verify}.options.urls.read",
                rules: {
                    read: {
                        "": "rows.0.value"
                    }
                },
                termMap: { code: "%code"},
                listeners: {
                    "onRead.checkVerificationCode": {
                        nameSpace: "gpii.express.user.api.verify",
                        priority:  "last",
                        funcName:  "gpii.express.user.api.verify.handler.checkVerificationCode",
                        args:      ["{gpii.express.handler}", "{arguments}.0"] // dataSource response
                    },
                    "onError.sendErrorResponse": {
                        func: "{gpii.express.user.api.verify.handler}.sendFinalResponse",
                        args: [500, { ok: false, message: "{arguments}.0"}]
                    }
                }
            }
        }
        // TODO:  Add writable data source
    },
    invokers: {
        handleRequest: {
            func: "{that}.reader.get",
            args: ["{that}.request.params"]
        },
        sendFinalResponse: {
            funcName: "fluid.notImplemented"
        }
    }
});

fluid.registerNamespace("gpii.express.user.api.verify.handler.html");

gpii.express.user.api.verify.handler.html.sendFinalResponse = function (that, statusCode, body) {
    //that.response.status(statusCode).render(that.options.templateKey, body);
    // TODO: send the upstream status code once we are using a client-side test framework that can work with non-200 status codes.
    that.response.status(200).render(that.options.templateKey, body);
};

fluid.defaults("gpii.express.user.api.verify.handler.html", {
    gradeNames:  ["gpii.express.user.api.verify.handler"],
    templateKey: "pages/verify",
    invokers: {
        sendFinalResponse: {
            funcName: "gpii.express.user.api.verify.handler.html.sendFinalResponse",
            args:     ["{that}", "{arguments}.0", "{arguments}.1"] // statusCode, response
        }
    }
});

// The JSON handler just passes the response payload on to gpii.express.handler.sendResponse
// TODO: Make this extend a schema handler instead
fluid.defaults("gpii.express.user.api.verify.handler.json", {
    gradeNames: ["gpii.express.user.api.verify.handler"],
    invokers: {
        sendFinalResponse: {
            func: "{that}.sendResponse",
            args: ["{arguments}.0", "{arguments}.1"] // statusCode, response
        }
    }
});

fluid.defaults("gpii.express.user.api.verify", {
    gradeNames: ["gpii.express.router.passthrough"],
    path:       ["/verify"],
    method:     "use",
    codeKey:    "verification_code",  // Must match the value in gpii.express.user.api.verify
    urls: {
        read: {
            expander: {
                funcName: "fluid.stringTemplate",
                args:     [ "%userDbUrl/_design/lookup/_view/byVerificationCode?key=\"%code\"", "{that}.options.couch"]
            }
        },
        write: {
            expander: {
                funcName: "fluid.stringTemplate",
                args:     [ "%userDbUrl/%id", "{that}.options.couch"]
            }
        }
    },
    components: {
        resendRouter: {
            type: "gpii.express.user.api.verify.resend",
            options: {
                templateDir: "{gpii.express.user.api.verify}.options.templateDir"
            }
        },
        mainRouter: {
            type: "gpii.express.contentAware.router",
            options: {
                path:        ["/:code", "/"],
                method:      "get",
                handlers: {
                    text: {
                        contentType:   ["text/html", "text/plain"],
                        handlerGrades: ["gpii.express.user.api.verify.handler.html"]
                    },
                    json: {
                        contentType:   "application/json",
                        handlerGrades: ["gpii.express.user.api.verify.handler.json"]
                    }
                }
            }
        }
    }
});
