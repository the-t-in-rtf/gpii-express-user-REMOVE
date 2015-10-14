// TODO:  Remove this once we have broken out the remaining content
/* Tests for the "express" and "router" module */
"use strict";

var fluid        = fluid || require("infusion");
var gpii         = fluid.registerNamespace("gpii");

// We use just the request-handling bits of the kettle stack in our tests, but we include the whole thing to pick up the base grades
require("../../node_modules/kettle");
require("../../node_modules/kettle/lib/test/KettleTestUtils");

require("../../node_modules/gpii-express/tests/js/lib/test-helpers");

var jqUnit       = require("jqUnit");
var fs           = require("fs");

fluid.registerNamespace("gpii.express.user.test.server.caseHolder");

fluid.setLogging(true);

gpii.express.user.test.server.caseHolder.verifyResponse = function (response, body, statusCode, truthy, falsy, hasCurrentUser) {
    if (!statusCode) { statusCode = 200; }
    gpii.express.tests.helpers.isSaneResponse(jqUnit, response, body, statusCode);

    var data = typeof body === "string" ? JSON.parse(body): body;

    if (truthy) {
        truthy.forEach(function (key) {
            jqUnit.assertTrue("The data for '" + key + "' should be truthy...", data[key]);
        });
    }

    if (falsy) {
        falsy.forEach(function (key) {
            jqUnit.assertFalse("The data for '" + key + "' should be falsy...", data[key]);
        });
    }

    if (hasCurrentUser) {
        jqUnit.assertEquals("The current user should be returned.", "admin", data.user.name);
    }
};

// Listen for the email with the verification code and launch the verification request
gpii.express.user.test.server.caseHolder.fullResetVerifyEmail = function (forgotRequest, resetRequest, testEnvironment) {
    var content = fs.readFileSync(testEnvironment.smtp.mailServer.currentMessageFile);

    var MailParser = require("mailparser").MailParser,
    mailparser = new MailParser({ debug: false });

    // If this gets any deeper, refactor to use a separate function
    mailparser.on("end", function (mailObject) {
        var content = mailObject.text;
        var resetCodeRegexp = new RegExp("content/reset[?]code=([a-z0-9-]+)", "i");
        var matches = content.toString().match(resetCodeRegexp);

        jqUnit.assertNotNull("There should be a reset code in the email sent to the user.", matches);

        if (matches) {
            forgotRequest.code = matches[1];
            resetRequest.send({code: forgotRequest.code, password: forgotRequest.options.user.password });
        }
    });

    mailparser.write(content);
    mailparser.end();
};

// Each test has a request instance of `kettle.test.request.http` or `kettle.test.request.httpCookie`, and a test module that wires the request to the listener that handles its results.
fluid.defaults("gpii.express.user.test.server.caseHolder", {
    gradeNames: ["gpii.express.tests.caseHolder"],
    components: {
        cookieJar: {
            type: "kettle.test.cookieJar"
        },
        loginRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args:     ["{testEnvironment}.options.baseUrl", "api/user/signin"]
                    }

                },
                port: "{testEnvironment}.options.port",
                method: "POST"
            }
        },
        bogusResetRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args: ["{testEnvironment}.options.baseUrl", "api/user/reset"]
                    }
                },
                port: "{testEnvironment}.options.port",
                method: "POST"
            }
        },
        fullResetForgotRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args:     ["{testEnvironment}.options.baseUrl", "api/user/forgot"]
                    }

                },
                user: {
                    name:     "reset",
                    password: {
                        expander: {
                            funcName: "gpii.express.user.api.signup.test.generatePassword"
                        }
                    },
                    email:    "reset@localhost"
                },
                port: "{testEnvironment}.options.port",
                method: "POST"
            }
        },
        fullResetVerifyResetRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args:     ["{testEnvironment}.options.baseUrl", "api/user/reset"]
                    }
                },
                port: "{testEnvironment}.options.port",
                method: "POST"
            }
        },
        fullResetLoginRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args:     ["{testEnvironment}.options.baseUrl", "api/user/signin"]
                    }
                },
                port: "{testEnvironment}.options.port",
                method: "POST"
            }
        }
    },
    rawModules: [
        {
            tests: [
                {
                    name: "Testing resetting a user's password with a bogus reset code...",
                    type: "test",
                    sequence: [
                        {
                            func: "{bogusResetRequest}.send",
                            args: [{ code: "utter-nonsense-which-should-never-work", password: "something" }]
                        },
                        {
                            listener: "gpii.express.user.test.server.caseHolder.verifyResponse",
                            event: "{bogusResetRequest}.events.onComplete",
                            args: ["{bogusResetRequest}.nativeResponse", "{arguments}.0", 500, null, ["ok", "user"]]
                        }
                    ]
                },
                {
                    name: "Testing resetting a user's password, end-to-end...",
                    type: "test",
                    sequence: [
                        {
                            func: "{fullResetForgotRequest}.send",
                            args: [ { email: "{fullResetForgotRequest}.options.user.email" } ]
                        },
                        // If we catch this event, the timing won't work out to cache the initial response.  We can safely ignore it for now.
                        //{
                        //    listener: "gpii.express.user.test.server.caseHolder.verifyResponse",
                        //    event: "{fullResetForgotRequest}.events.onComplete",
                        //    args: ["{fullResetForgotRequest}", "{fullResetForgotRequest}.nativeResponse", "{arguments}.0", 200]
                        //},
                        {
                            listener: "gpii.express.user.test.server.caseHolder.fullResetVerifyEmail",
                            event: "{testEnvironment}.smtp.events.onMessageReceived",
                            args: ["{fullResetForgotRequest}", "{fullResetVerifyResetRequest}", "{testEnvironment}"]
                        },
                        {
                            listener: "gpii.express.user.test.server.caseHolder.verifyResponse",
                            event: "{fullResetVerifyResetRequest}.events.onComplete",
                            args: ["{fullResetVerifyResetRequest}.nativeResponse", "{arguments}.0", 200, ["ok"]]
                        },
                        {
                            func: "{fullResetLoginRequest}.send",
                            args: [{ name: "{fullResetForgotRequest}.options.user.name", password: "{fullResetForgotRequest}.options.user.password"}]
                        },
                        {
                            listener: "gpii.express.user.test.server.caseHolder.verifyResponse",
                            event: "{fullResetLoginRequest}.events.onComplete",
                            args: ["{fullResetLoginRequest}.nativeResponse", "{arguments}.0", 200, ["ok", "user"]]
                        }
                    ]
                }
            ]
        }
    ]
});
