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

fluid.registerNamespace("gpii.express.couchuser.test.server.caseHolder");

fluid.setLogging(true);

// An expander to generate a new username every time
gpii.express.couchuser.test.server.caseHolder.generateUser = function () {
    var timestamp = (new Date()).getTime();
    return {
        name:     "user-" + timestamp,
        password: "user-" + timestamp,
        email:    "user-" + timestamp + "@localhost",
        roles:    []
    };
};

// An expander to generate a new password so that we can confirm that the password reset function actually works more than once.
gpii.express.couchuser.test.server.caseHolder.generatePassword = function () {
    var timestamp = (new Date()).getTime();
    return "password-" + timestamp;
};

gpii.express.couchuser.test.server.caseHolder.verifyResponse = function (response, body, statusCode, truthy, falsy, hasCurrentUser) {
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
gpii.express.couchuser.test.server.caseHolder.fullSignupVerifyEmail = function (signupRequest, verificationRequest, testEnvironment) {
    var content = fs.readFileSync(testEnvironment.smtp.mailServer.currentMessageFile);

    var MailParser = require("mailparser").MailParser,
    mailparser = new MailParser({debug: false});

    // If this gets any deeper, refactor to use a separate function
    mailparser.on("end", function (mailObject) {
        var content = mailObject.text;
        var verificationCodeRegexp = new RegExp("content/verify[?]code=([a-z0-9-]+)", "i");
        var matches = content.toString().match(verificationCodeRegexp);

        jqUnit.assertNotNull("There should be a verification code in the email sent to the user.", matches);

        if (matches) {
            signupRequest.code = matches[1];
            var path = "/api/user/verify/" + signupRequest.code;

            // I can't fix this with the model, so I have to override it completely
            verificationRequest.options.path = path;
            verificationRequest.send();
        }
    });

    mailparser.write(content);
    mailparser.end();
};

// Listen for the email with the verification code and launch the verification request
gpii.express.couchuser.test.server.caseHolder.fullResetVerifyEmail = function (forgotRequest, resetRequest, testEnvironment) {
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
fluid.defaults("gpii.express.couchuser.test.server.caseHolder", {
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
        currentUserLoggedInRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args:     ["{testEnvironment}.options.baseUrl", "api/user/current"]
                    }

                },
                port: "{testEnvironment}.options.port",
                method: "GET"
            }
        },
        logoutRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args:     ["{testEnvironment}.options.baseUrl", "api/user/signout"]
                    }

                },
                port: "{testEnvironment}.options.port",
                method: "POST"
            }
        },
        currentUserLoggedOutRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args:     ["{testEnvironment}.options.baseUrl", "api/user/current"]
                    }

                },
                port: "{testEnvironment}.options.port",
                method: "GET"
            }
        },
        bogusLoginRequest: {
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
        unverifiedLoginRequest: {
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
        duplicateUserCreateRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args:     ["{testEnvironment}.options.baseUrl", "api/user/signup"]
                    }

                },
                port: "{testEnvironment}.options.port",
                method: "POST"
            }
        },
        incompleteUserCreateRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args:     ["{testEnvironment}.options.baseUrl", "api/user/signup"]
                    }

                },
                port: "{testEnvironment}.options.port",
                method: "POST"
            }
        },
        bogusVerificationRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args: ["{testEnvironment}.options.baseUrl", "api/user/verify/xxxxxxxxxx"]
                    }

                },
                port: "{testEnvironment}.options.port",
                method: "GET"
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
        fullSignupInitialRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "gpii.express.tests.helpers.assembleUrl",
                        args:     ["{testEnvironment}.options.baseUrl", "api/user/signup"]
                    }

                },
                user: {
                    expander: {
                        funcName: "gpii.express.couchuser.test.server.caseHolder.generateUser"
                    }
                },
                port: "{testEnvironment}.options.port",
                method: "POST"
            }
        },
        fullSignupVerifyVerificationRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                port: "{testEnvironment}.options.port",
                method: "GET"
            }
        },
        fullSignupLoginRequest: {
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
                            funcName: "gpii.express.couchuser.test.server.caseHolder.generatePassword"
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
                    name: "Testing full login/logout cycle...",
                    type: "test",
                    sequence: [
                        {
                            func: "{loginRequest}.send",
                            args: [{ name: "admin", password: "admin" }]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{loginRequest}.events.onComplete",
                            args: ["{loginRequest}.nativeResponse", "{arguments}.0", 200, ["ok", "user"], null, true]
                        },
                        {
                            func: "{currentUserLoggedInRequest}.send",
                            args: [{ name: "admin", password: "admin" }]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{currentUserLoggedInRequest}.events.onComplete",
                            args: ["{currentUserLoggedInRequest}.nativeResponse", "{arguments}.0", 200, ["ok", "user"], null, true]
                        },
                        {
                            func: "{logoutRequest}.send"
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{logoutRequest}.events.onComplete",
                            args: ["{logoutRequest}.nativeResponse", "{arguments}.0", 200, ["ok"], ["user"]]
                        },
                        {
                            func: "{currentUserLoggedOutRequest}.send"
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{currentUserLoggedOutRequest}.events.onComplete",
                            args: ["{currentUserLoggedOutRequest}.nativeResponse", "{arguments}.0",  401, null, ["ok", "user"]]
                        }
                    ]
                },
                {
                    name: "Testing logging in with a bogus username/password...",
                    type: "test",
                    sequence: [
                        {
                            func: "{bogusLoginRequest}.send",
                            args: [{ name: "bogus", password: "bogus" }]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{bogusLoginRequest}.events.onComplete",
                            args: ["{bogusLoginRequest}.nativeResponse", "{arguments}.0", 500, null, ["ok", "user"]]
                        }
                    ]
                },
                {
                    name: "Testing logging in with an unverified account...",
                    type: "test",
                    sequence: [
                        {
                            func: "{unverifiedLoginRequest}.send",
                            args: [{ name: "unverified", password: "unverified" }]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{unverifiedLoginRequest}.events.onComplete",
                            args: ["{unverifiedLoginRequest}.nativeResponse", "{arguments}.0", 401, null, ["ok", "user"]]
                        }
                    ]
                },
                {
                    name: "Testing creating an account with the same email address as an existing account...",
                    type: "test",
                    sequence: [
                        {
                            func: "{duplicateUserCreateRequest}.send",
                            args: [{ name: "new", password: "new", email: "reset@localhost", roles: [] }]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{duplicateUserCreateRequest}.events.onComplete",
                            args: ["{duplicateUserCreateRequest}.nativeResponse", "{arguments}.0", 400, null, ["ok", "user"]]
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
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{incompleteUserCreateRequest}.events.onComplete",
                            args: ["{incompleteUserCreateRequest}.nativeResponse", "{arguments}.0", 400, null, ["ok", "user"]]
                        }
                    ]
                },
                {
                    name: "Testing verifying a user with a bogus verification code...",
                    type: "test",
                    sequence: [
                        {
                            func: "{bogusVerificationRequest}.send",
                            args: [{}]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{bogusVerificationRequest}.events.onComplete",
                            args: ["{bogusVerificationRequest}.nativeResponse", "{arguments}.0", 400, null, ["ok", "user"]]
                        }
                    ]
                },
                {
                    name: "Testing resetting a user's password with a bogus reset code...",
                    type: "test",
                    sequence: [
                        {
                            func: "{bogusResetRequest}.send",
                            args: [{ code: "utter-nonsense-which-should-never-work", password: "something" }]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{bogusResetRequest}.events.onComplete",
                            args: ["{bogusResetRequest}.nativeResponse", "{arguments}.0", 500, null, ["ok", "user"]]
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
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{fullSignupInitialRequest}.events.onComplete",
                            args: ["{fullSignupInitialRequest}.nativeResponse", "{arguments}.0", 200]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.fullSignupVerifyEmail",
                            event: "{testEnvironment}.smtp.events.messageReceived",
                            args: ["{fullSignupInitialRequest}", "{fullSignupVerifyVerificationRequest}", "{testEnvironment}"]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{fullSignupVerifyVerificationRequest}.events.onComplete",
                            args: ["{fullSignupVerifyVerificationRequest}.nativeResponse", "{arguments}.0", 200, ["ok"]]
                        },
                        {
                            func: "{fullSignupLoginRequest}.send",
                            args: [{ name: "{fullSignupInitialRequest}.options.user.name", password: "{fullSignupInitialRequest}.options.user.password" }]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{fullSignupLoginRequest}.events.onComplete",
                            args: ["{fullSignupLoginRequest}.nativeResponse", "{arguments}.0", 200]
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
                        //    listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                        //    event: "{fullResetForgotRequest}.events.onComplete",
                        //    args: ["{fullResetForgotRequest}", "{fullResetForgotRequest}.nativeResponse", "{arguments}.0", 200]
                        //},
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.fullResetVerifyEmail",
                            event: "{testEnvironment}.smtp.events.messageReceived",
                            args: ["{fullResetForgotRequest}", "{fullResetVerifyResetRequest}", "{testEnvironment}"]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{fullResetVerifyResetRequest}.events.onComplete",
                            args: ["{fullResetVerifyResetRequest}.nativeResponse", "{arguments}.0", 200, ["ok"]]
                        },
                        {
                            func: "{fullResetLoginRequest}.send",
                            args: [{ name: "{fullResetForgotRequest}.options.user.name", password: "{fullResetForgotRequest}.options.user.password"}]
                        },
                        {
                            listener: "gpii.express.couchuser.test.server.caseHolder.verifyResponse",
                            event: "{fullResetLoginRequest}.events.onComplete",
                            args: ["{fullResetLoginRequest}.nativeResponse", "{arguments}.0", 200, ["ok", "user"]]
                        }
                    ]
                }
            ]
        }
    ]
});
