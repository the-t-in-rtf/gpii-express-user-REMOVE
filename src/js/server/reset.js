/*

  Provides the second half of the password reset API, and handles the last two steps.  Before using this, a user must
  have generated a reset code using the `forgot` API.  They are sent a link via email that includes a reset code.

  When they follow that link, the GET portion of this API checks the validity of the code.  If the code exists and has
  not expired, a form with a password and confirmation field is displayed.

  The POST portion of this API accepts the password, confirmation, and the reset code.  It checks to confirm that the
  code corresponds to a valid user.

 */
"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

require("./lib/password");
require("./lib/singleTemplateRouter");
require("./lib/datasource");

// TODO:  Replace this with a writable `dataSource`
var request = require("request");

fluid.registerNamespace("gpii.express.user.api.reset.handler");

// TODO: Check this against a schema using a schemaHandler
gpii.express.user.api.reset.handler.checkResetCode = function (that, dataSourceResponse) {
    // Prepare dates that will be used in later sanity checks.
    var earliestAcceptable = new Date((new Date()).getTime() - that.options.codeExpiration);
    var issueDate          = new Date(dataSourceResponse[that.options.codeIssuedKey]);

    if (!dataSourceResponse || !dataSourceResponse[that.options.codeKey] || (that.request.params.code !== dataSourceResponse[that.options.codeKey])) {
        that.sendFinalResponse(400, { ok: false, message: "You must provide a valid reset code to use this interface."});
    }
    // We cannot perform the next two checks using JSON Schema, so we must do it here.
    // We should not accept a reset code issued earlier than the current time minus our expiration period (a day by default).
    else if (isNaN(issueDate) || issueDate < earliestAcceptable) {
        that.sendFinalResponse(400, { ok: false, message: "Your reset code is too old.  Please request another one."});
    }
    // Confirm that the password and confirmation password are the same.
    else if (that.request.body.password !== that.request.body.confirm) {
        that.sendFinalResponse(400, { ok: false, message: "The password and confirmation passwords must match."});
    }
    else {
        var updatedUserRecord = fluid.copy(dataSourceResponse);
        delete updatedUserRecord[that.options.codeKey];

        var salt                      = gpii.express.user.password.generateSalt(that.options.saltLength);
        updatedUserRecord.salt        = salt;
        updatedUserRecord.derived_key = gpii.express.user.password.encode(that.request.body.password, salt);

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
                that.sendFinalResponse(200, { ok: true, message: "Your password has been reset."});
            }
        });
    }
};

fluid.defaults("gpii.express.user.api.reset.handler", {
    gradeNames:  ["gpii.express.handler"],
    components: {
        reader: {
            type: "gpii.express.user.couchdb.read",
            options: {
                url: "{gpii.express.user.api.reset}.options.urls.read",
                rules: {
                    read: {
                        "": "rows.0.value"
                    }
                },
                termMap: { code: "%code"},
                listeners: {
                    "onRead.checkResetCode": {
                        nameSpace: "gpii.express.user.api.reset",
                        priority:  "last",
                        funcName:  "gpii.express.user.api.reset.handler.checkResetCode",
                        args:      ["{gpii.express.handler}", "{arguments}.0"] // dataSource response
                    },
                    "onError.sendErrorResponse": {
                        func: "{gpii.express.user.api.reset.handler}.sendFinalResponse",
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
            func: "{that}.sendResponse",
            args: ["{arguments}.0", "{arguments}.1"] // statusCode, response
        }
    }
});

// GET /api/user/reset/:code, a `singleTemplateRouter` that just serves up the client-side form.
fluid.defaults("gpii.express.user.api.reset.formRouter", {
    gradeNames:  ["gpii.express.user.api.singleTemplateRouter"],
    path:        "/:code",
    method:      "get",
    templateKey: "pages/reset"
});

fluid.defaults("gpii.express.user.api.reset", {
    gradeNames:    ["gpii.express.router.passthrough"],
    method:        "use",
    path:          "/reset",
    // The next two variables must match the value in gpii.express.user.api.forgot
    codeKey:       "reset_code",
    codeIssuedKey: "reset_code_issued",
    codeExpiration: 86400000, // How long a reset code is valid, in milliseconds.  Defaults to a day.
    // The salt length should match what's used in gpii.express.user.api.signup
    saltLength:    32,
    urls: {
        read: {
            expander: {
                funcName: "fluid.stringTemplate",
                args:     [ "%userDbUrl/_design/lookup/_view/byResetCode?key=\"%code\"", "{that}.options.couch"]
            }
        },
        write: {
            expander: {
                funcName: "fluid.stringTemplate",
                args:     [ "%userDbUrl/%id", "{that}.options.couch"]
            }
        }
    },
    distributeOptions: [
        {
            source: "{that}.options.codeKey",
            target: "{that gpii.express.handler}.options.codeKey"
        },
        {
            source: "{that}.options.saltLength",
            target: "{that gpii.express.handler}.options.saltLength"
        },
        {
            source: "{that}.options.urls",
            target: "{that gpii.express.handler}.options.urls"
        },
        {
            source: "{that}.options.codeIssuedKey",
            target: "{that gpii.express.handler}.options.codeIssuedKey"
        },
        {
            source: "{that}.options.codeExpiration",
            target: "{that gpii.express.handler}.options.codeExpiration"
        }
    ],
    components: {
        formRouter: {
            type: "gpii.express.user.api.reset.formRouter"
        },
        mainRouter: {
            type: "gpii.express.requestAware.router",
            options: {
                path:   ["/:code", "/"],
                method: "post",
                handlerGrades: ["gpii.express.user.api.reset.handler"]
            }
        }
    }
});