/*

    The password reset process has two steps.  These tests exercise both steps independently and together.

 */
"use strict";

var fluid        = fluid || require("infusion");
var gpii         = fluid.registerNamespace("gpii");

// We use just the request-handling bits of the kettle stack in our tests, but we include the whole thing to pick up the base grades
require("../../../node_modules/kettle");
require("../../../node_modules/kettle/lib/test/KettleTestUtils");

require("../../../node_modules/gpii-express/tests/js/lib/test-helpers");
require("../test-environment");

var jqUnit       = require("jqUnit");
var fs           = require("fs");

fluid.registerNamespace("gpii.express.user.api.reset.test.caseHolder");

// Listen for the email with the reset code and launch the reset request
gpii.express.user.api.reset.test.caseHolder.fullResetVerifyEmail = function (verificationRequest, testEnvironment) {
    gpii.express.user.api.reset.test.caseHolder.extractResetCode(testEnvironment).then(gpii.express.user.api.signup.test.caseHolder.checkResetCode).then(function (code) {
        verificationRequest.options.path = fluid.stringTemplate(verificationRequest.options.path, { code: code });
        verificationRequest.send({}, { headers: { "Accept": "application/json" }});
    });
};

gpii.express.user.api.reset.test.caseHolder.checkResetCode = function (code) {
    jqUnit.assertNotNull("There should be a verification code in the email sent to the user.", code);
    return code;
};

gpii.express.user.api.reset.test.caseHolder.checkEnvironmentForResetCode = function (testEnvironment) {
    gpii.express.user.api.reset.test.caseHolder.extractResetCode(testEnvironment).then(gpii.express.user.api.reset.test.caseHolder.checkResetCode);
};

gpii.express.user.api.reset.test.caseHolder.extractResetCode = function (testEnvironment) {
    return gpii.express.user.api.test.extractCode(testEnvironment, "https?://[^/]+/api/user/reset/([a-z0-9-]+)");
};

fluid.defaults("gpii.express.user.api.reset.test.request", {
    gradeNames: ["kettle.test.request.httpCookie"],
    path: {
        expander: {
            funcName: "fluid.stringTemplate",
            args:     ["%apiUrl%endpoint", { apiUrl: "{testEnvironment}.options.apiUrl", endpoint: "{that}.options.endpoint"}]
        }
    },
    port: "{testEnvironment}.options.apiPort"
});

// Each test has a request instance of `kettle.test.request.http` or `kettle.test.request.httpCookie`, and a test module that wires the request to the listener that handles its results.
fluid.defaults("gpii.express.user.api.reset.test.caseHolder", {
    gradeNames: ["gpii.express.tests.caseHolder"],
    testUser: {
        username: "existing",
        email:    "existing@localhost",
        password: "Password1"
    },
    components: {
        cookieJar: {
            type: "kettle.test.cookieJar"
        },
        loginRequest: {
            type: "gpii.express.user.api.reset.test.request",
            options: {
                endpoint: "login",
                method:   "POST"
            }
        },
        bogusResetRequest: {
            type: "gpii.express.user.api.reset.test.request",
            options: {
                endpoint: "reset",
                method:   "POST"
            }
        },
        fullResetForgotRequest: {
            type: "gpii.express.user.api.reset.test.request",
            options: {
                endpoint: "forgot",
                method:   "POST"
            }
        },
        fullResetVerifyResetRequest: {
            type: "gpii.express.user.api.reset.test.request",
            options: {
                user: "{caseHolder}.options.testUser",
                endpoint: "reset/%code",
                method:   "POST"
            }
        },
        fullResetLoginRequest: {
            type: "gpii.express.user.api.reset.test.request",
            options: {
                endpoint: "login",
                method:   "POST"
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
                            listener: "gpii.express.user.api.reset.test.caseHolder.verifyResponse",
                            event: "{bogusResetRequest}.events.onComplete",
                            args: ["{bogusResetRequest}.nativeResponse", "{arguments}.0", 400, null, ["ok"]]
                        }
                    ]
                },
                {
                    name: "Testing resetting a user's password, end-to-end...",
                    type: "test",
                    sequence: [
                        {
                            func: "{fullResetForgotRequest}.send",
                            args: [ { email: "{that}.options.testUser.email" } ]
                        },
                        // If we catch this event, the timing won't work out to cache the initial response.  We can safely ignore it for now.
                        //{
                        //    listener: "gpii.express.user.api.reset.test.caseHolder.verifyResponse",
                        //    event: "{fullResetForgotRequest}.events.onComplete",
                        //    args: ["{fullResetForgotRequest}", "{fullResetForgotRequest}.nativeResponse", "{arguments}.0", 200]
                        //},
                        {
                            listener: "gpii.express.user.api.reset.test.caseHolder.fullResetVerifyEmail",
                            event:    "{testEnvironment}.harness.smtp.mailServer.events.onMessageReceived",
                            args:     ["{fullResetVerifyResetRequest}", "{testEnvironment}"]
                        },
                        {
                            listener: "gpii.express.user.api.reset.test.caseHolder.verifyResponse",
                            event: "{fullResetVerifyResetRequest}.events.onComplete",
                            args: ["{fullResetVerifyResetRequest}.nativeResponse", "{arguments}.0", 200, ["ok"]]
                        },
                        {
                            func: "{fullResetLoginRequest}.send",
                            args: [{ username: "{that}.options.testUser.username", password: "{that}.options.testUser.password"}]
                        },
                        {
                            listener: "gpii.express.user.api.reset.test.caseHolder.verifyResponse",
                            event: "{fullResetLoginRequest}.events.onComplete",
                            args: ["{fullResetLoginRequest}.nativeResponse", "{arguments}.0", 200, ["ok", "user"]]
                        }
                    ]
                }
            ]
        }
    ]
});


gpii.express.user.api.reset.test.caseHolder.verifyResponse = function (response, body, statusCode, truthy, falsy, hasCurrentUser) {
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
gpii.express.user.api.reset.test.caseHolder.fullResetVerifyEmail = function (resetRequest, testEnvironment) {
    var content = fs.readFileSync(testEnvironment.harness.smtp.mailServer.currentMessageFile);

    var MailParser = require("mailparser").MailParser,
        mailparser = new MailParser({ debug: false });

    // If this gets any deeper, refactor to use a separate function
    mailparser.on("end", function (mailObject) {
        var content = mailObject.text;
        var resetCodeRegexp = new RegExp("https?://[^/]+/api/user/reset/([a-z0-9-]+)", "i");
        var matches = content.toString().match(resetCodeRegexp);

        jqUnit.assertNotNull("There should be a reset code in the email sent to the user.", matches);

        if (matches) {
            var code = matches[1];
            resetRequest.options.path = fluid.stringTemplate(resetRequest.options.path, { code: code});

            resetRequest.send({ password: resetRequest.options.user.password, confirm: resetRequest.options.user.password});
        }
    });

    mailparser.write(content);
    mailparser.end();
};

gpii.express.user.tests.environment({
    apiPort:   8779,
    pouchPort: 8765,
    mailPort:  8825,
    components: {
        caseHolder: {
            type: "gpii.express.user.api.reset.test.caseHolder"
        }
    }
});