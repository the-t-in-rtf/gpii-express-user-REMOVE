/*

    The user self-signup is a two step process.  These tests exercise both steps independently and together.

 */
"use strict";

var fluid        = fluid || require("infusion");
var gpii         = fluid.registerNamespace("gpii");

// We use just the request-handling bits of the kettle stack in our tests, but we include the whole thing to pick up the base grades
require("../../../node_modules/kettle");
require("../../../node_modules/kettle/lib/test/KettleTestUtils");

require("../../../node_modules/gpii-express/tests/js/lib/test-helpers");
require("../test-environment");

require("../lib/generate-user");
require("../lib/extract-code");

var jqUnit       = require("jqUnit");

fluid.registerNamespace("gpii.express.user.api.signup.test.caseHolder");

gpii.express.user.api.signup.test.caseHolder.verifyResponse = function (response, body, statusCode, truthy, falsy, hasCurrentUser) {
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
gpii.express.user.api.signup.test.caseHolder.fullSignupVerifyEmail = function (signupRequest, verificationRequest, testEnvironment) {
    gpii.express.user.api.signup.test.caseHolder.extractVerificationCode(testEnvironment).then(gpii.express.user.api.signup.test.caseHolder.checkResetCode).then(function (code) {
        signupRequest.code = code;
        var path = "/api/user/verify/" + signupRequest.code;

        // I can't fix this with the model, so I have to override it completely
        verificationRequest.options.path = path;
        verificationRequest.send({}, { headers: { "Accept": "application/json" }});
    });
};

gpii.express.user.api.signup.test.caseHolder.checkVerificationCode = function (code) {
    jqUnit.assertNotNull("There should be a verification code in the email sent to the user.", code);

    return code;
};

gpii.express.user.api.signup.test.caseHolder.checkEnvironmentForVerificationCode = function (testEnvironment) {
    gpii.express.user.api.signup.test.caseHolder.extractVerificationCode(testEnvironment).then(gpii.express.user.api.signup.test.caseHolder.checkResetCode);
};

gpii.express.user.api.signup.test.caseHolder.extractVerificationCode = function (testEnvironment) {
    return gpii.express.user.api.test.extractCode(testEnvironment, "https?://[^/]+/api/user/verify/([a-z0-9-]+)");
};

fluid.defaults("gpii.express.user.api.signup.test.request", {
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
fluid.defaults("gpii.express.user.api.signup.test.caseHolder", {
    gradeNames: ["gpii.express.tests.caseHolder"],
    components: {
        cookieJar: {
            type: "kettle.test.cookieJar"
        },
        duplicateUserCreateRequest: {
            type: "gpii.express.user.api.signup.test.request",
            options: {
                endpoint: "signup",
                method:   "POST"
            }
        },
        incompleteUserCreateRequest: {
            type: "gpii.express.user.api.signup.test.request",
            options: {
                endpoint: "signup",
                method:   "POST"
            }
        },
        bogusVerificationRequest: {
            type: "gpii.express.user.api.signup.test.request",
            options: {
                endpoint: "verify/xxxxxxxxx",
                method: "GET"
            }
        },
        resendVerification: {
            type: "gpii.express.user.api.signup.test.request",
            options: {
                endpoint: "verify/resend",
                method: "POST"
            }
        },
        resendVerificationForVerifiedUser: {
            type: "gpii.express.user.api.signup.test.request",
            options: {
                endpoint: "verify/resend",
                method: "POST"
            }
        },
        resendVerificationForBogusUser: {
            type: "gpii.express.user.api.signup.test.request",
            options: {
                endpoint: "verify/resend",
                method: "POST"
            }
        },
        fullSignupInitialRequest: {
            type: "gpii.express.user.api.signup.test.request",
            options: {
                endpoint: "signup",
                user: {
                    expander: {
                        funcName: "gpii.express.user.api.signup.test.generateUser"
                    }
                },
                method: "POST"
            }
        },
        fullSignupVerifyVerificationRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                port: "{testEnvironment}.options.apiPort",
                method: "GET"
            }
        },
        fullSignupLoginRequest: {
            type: "gpii.express.user.api.signup.test.request",
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
                    name: "Testing creating an account with the same email address as an existing account...",
                    type: "test",
                    sequence: [
                        {
                            func: "{duplicateUserCreateRequest}.send",
                            args: [{ username: "new", password: "new", confirm: "new", email: "reset@localhost"}]
                        },
                        {
                            listener: "gpii.express.user.api.signup.test.caseHolder.verifyResponse",
                            event:    "{duplicateUserCreateRequest}.events.onComplete",
                            args:     ["{duplicateUserCreateRequest}.nativeResponse", "{arguments}.0", 400, null, ["ok", "user"]]
                        }
                    ]
                },
                {
                    name: "Testing creating an account without providing the required information...",
                    type: "test",
                    sequence: [
                        {
                            func: "{incompleteUserCreateRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "gpii.express.user.api.signup.test.caseHolder.verifyResponse",
                            event:    "{incompleteUserCreateRequest}.events.onComplete",
                            args:     ["{incompleteUserCreateRequest}.nativeResponse", "{arguments}.0", 400, null, ["ok", "user"]]
                        }
                    ]
                },
                {
                    name: "Testing verifying a user with a bogus verification code...",
                    type: "test",
                    sequence: [
                        {
                            func: "{bogusVerificationRequest}.send",
                            args: [{}, { headers: { "Accept": "application/json" }}]
                        },
                        {
                            listener: "gpii.express.user.api.signup.test.caseHolder.verifyResponse",
                            event:    "{bogusVerificationRequest}.events.onComplete",
                            args:     ["{bogusVerificationRequest}.nativeResponse", "{arguments}.0", 401, null, ["ok", "user"]]
                        }
                    ]
                },
                {
                    name: "Testing resending a verification code for an unverified user...",
                    type: "test",
                    sequence: [
                        {
                            func: "{resendVerification}.send",
                            args: [ { email: "unverified@localhost"} ]
                        },
                        {
                            listener: "gpii.express.user.api.signup.test.caseHolder.checkEnvironmentForVerificationCode",
                            event:    "{testEnvironment}.harness.smtp.mailServer.events.onMessageReceived",
                            args:     ["{testEnvironment}"]
                        },
                        {
                            listener: "gpii.express.user.api.signup.test.caseHolder.verifyResponse",
                            event:    "{resendVerification}.events.onComplete",
                            args:     ["{resendVerification}.nativeResponse", "{arguments}.0", 200]
                        }
                    ]
                },
                {
                    name: "Testing resending a verification code for a verified user (HTTP response)...",
                    type: "test",
                    sequence: [
                        {
                            func: "{resendVerificationForVerifiedUser}.send",
                            args: [ { email: "existing@localhost"} ]
                        },
                        {
                            listener: "gpii.express.user.api.signup.test.caseHolder.verifyResponse",
                            event:    "{resendVerificationForVerifiedUser}.events.onComplete",
                            args:     ["{resendVerificationForVerifiedUser}.nativeResponse", "{arguments}.0", 200]
                        }
                    ]
                },
                {
                    name: "Testing resending a verification code for a bogus user (HTTP response)...",
                    type: "test",
                    sequence: [
                        {
                            func: "{resendVerificationForBogusUser}.send",
                            args: [ { email: "bogus@localhost"} ]
                        },
                        {
                            listener: "gpii.express.user.api.signup.test.caseHolder.verifyResponse",
                            event:    "{resendVerificationForBogusUser}.events.onComplete",
                            args:     ["{resendVerificationForBogusUser}.nativeResponse", "{arguments}.0", 404]
                        }
                    ]
                },
                {
                    name: "Testing creating a user, end-to-end...",
                    type: "test",
                    sequence: [
                        {
                            func: "{fullSignupInitialRequest}.send",
                            args: [ "{fullSignupInitialRequest}.options.user" ]
                        },
                        {
                            listener: "gpii.express.user.api.signup.test.caseHolder.fullSignupVerifyEmail",
                            event:    "{testEnvironment}.harness.smtp.events.onMessageReceived",
                            args:     ["{fullSignupInitialRequest}", "{fullSignupVerifyVerificationRequest}", "{testEnvironment}"]
                        },
                        {
                            listener: "gpii.express.user.api.signup.test.caseHolder.verifyResponse",
                            event:    "{fullSignupInitialRequest}.events.onComplete",
                            args:     ["{fullSignupInitialRequest}.nativeResponse", "{arguments}.0", 200]
                        },
                        {
                            listener: "gpii.express.user.api.signup.test.caseHolder.verifyResponse",
                            event:    "{fullSignupVerifyVerificationRequest}.events.onComplete",
                            args:     ["{fullSignupVerifyVerificationRequest}.nativeResponse", "{arguments}.0", 200, ["ok"]]
                        },
                        {
                            func: "{fullSignupLoginRequest}.send",
                            args: [{ username: "{fullSignupInitialRequest}.options.user.username", password: "{fullSignupInitialRequest}.options.user.password" }]
                        },
                        {
                            listener: "gpii.express.user.api.signup.test.caseHolder.verifyResponse",
                            event:    "{fullSignupLoginRequest}.events.onComplete",
                            args:     ["{fullSignupLoginRequest}.nativeResponse", "{arguments}.0", 200]
                        }
                    ]
                }
            ]
        }
    ]
});

gpii.express.user.tests.environment({
    apiPort:   8778,
    pouchPort: 8764,
    mailPort:  8725,
    components: {
        caseHolder: {
            type: "gpii.express.user.api.signup.test.caseHolder"
        }
    }
});