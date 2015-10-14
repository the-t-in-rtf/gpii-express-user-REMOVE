/*

  Test the login, logout, and "current user" APIs.

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

fluid.registerNamespace("gpii.express.user.api.login.test.caseHolder");

// An expander to generate a new username every time
gpii.express.user.api.login.test.caseHolder.generateUser = function () {
    var timestamp = (new Date()).getTime();
    return {
        username: "user-" + timestamp,
        password: "user-" + timestamp,
        email:    "user-" + timestamp + "@localhost",
        roles:    []
    };
};

// An expander to generate a new password so that we can confirm that the password reset function actually works more than once.
gpii.express.user.api.login.test.caseHolder.generatePassword = function () {
    var timestamp = (new Date()).getTime();
    return "password-" + timestamp;
};

gpii.express.user.api.login.test.caseHolder.verifyResponse = function (response, body, statusCode, truthy, falsy, hasCurrentUser) {
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
        jqUnit.assertEquals("The current user should be returned.", "existing", data.user.username);
    }
};

// Each test has a request instance of `kettle.test.request.http` or `kettle.test.request.httpCookie`, and a test module that wires the request to the listener that handles its results.
fluid.defaults("gpii.express.user.api.login.test.caseHolder", {
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
                        funcName: "fluid.stringTemplate",
                        args:     ["%apiUrl%endpoint", { apiUrl: "{testEnvironment}.options.apiUrl", endpoint: "login"}]
                    }
                },
                port: "{testEnvironment}.options.apiPort",
                method: "POST"
            }
        },
        currentUserLoggedInRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "fluid.stringTemplate",
                        args:     ["%apiUrl%endpoint", { apiUrl: "{testEnvironment}.options.apiUrl", endpoint: "current"}]
                    }
                },
                port: "{testEnvironment}.options.apiPort",
                method: "GET"
            }
        },
        logoutRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "fluid.stringTemplate",
                        args:     ["%apiUrl%endpoint", { apiUrl: "{testEnvironment}.options.apiUrl", endpoint: "logout"}]
                    }
                },
                port: "{testEnvironment}.options.apiPort",
                method: "GET"
            }
        },
        currentUserLoggedOutRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "fluid.stringTemplate",
                        args:     ["%apiUrl%endpoint", { apiUrl: "{testEnvironment}.options.apiUrl", endpoint: "current"}]
                    }
                },
                port: "{testEnvironment}.options.apiPort",
                method: "GET"
            }
        },
        bogusLoginRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "fluid.stringTemplate",
                        args:     ["%apiUrl%endpoint", { apiUrl: "{testEnvironment}.options.apiUrl", endpoint: "login"}]
                    }

                },
                port: "{testEnvironment}.options.apiPort",
                method: "POST"
            }
        },
        unverifiedLoginRequest: {
            type: "kettle.test.request.httpCookie",
            options: {
                path: {
                    expander: {
                        funcName: "fluid.stringTemplate",
                        args:     ["%apiUrl%endpoint", { apiUrl: "{testEnvironment}.options.apiUrl", endpoint: "login"}]
                    }
                },
                port:   "{testEnvironment}.options.apiPort",
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
                            args: [{ username: "existing", password: "password" }]
                        },
                        {
                            listener: "gpii.express.user.api.login.test.caseHolder.verifyResponse",
                            event: "{loginRequest}.events.onComplete",
                            args: ["{loginRequest}.nativeResponse", "{arguments}.0", 200, ["ok", "user"], null, true]
                        },
                        {
                            func: "{currentUserLoggedInRequest}.send"
                        },
                        {
                            listener: "gpii.express.user.api.login.test.caseHolder.verifyResponse",
                            event: "{currentUserLoggedInRequest}.events.onComplete",
                            args: ["{currentUserLoggedInRequest}.nativeResponse", "{arguments}.0", 200, ["ok", "user"], null, true]
                        },
                        {
                            func: "{logoutRequest}.send"
                        },
                        {
                            listener: "gpii.express.user.api.login.test.caseHolder.verifyResponse",
                            event: "{logoutRequest}.events.onComplete",
                            args: ["{logoutRequest}.nativeResponse", "{arguments}.0", 200, ["ok"], ["user"]]
                        },
                        {
                            func: "{currentUserLoggedOutRequest}.send"
                        },
                        {
                            listener: "gpii.express.user.api.login.test.caseHolder.verifyResponse",
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
                            args: [{ username: "bogus", password: "bogus" }]
                        },
                        {
                            listener: "gpii.express.user.api.login.test.caseHolder.verifyResponse",
                            event: "{bogusLoginRequest}.events.onComplete",
                            args: ["{bogusLoginRequest}.nativeResponse", "{arguments}.0", 401, null, ["ok", "user"]]
                        }
                    ]
                },
                {
                    name: "Testing logging in with an unverified account...",
                    type: "test",
                    sequence: [
                        {
                            func: "{unverifiedLoginRequest}.send",
                            args: [{ username: "unverified", password: "unverified" }]
                        },
                        {
                            listener: "gpii.express.user.api.login.test.caseHolder.verifyResponse",
                            event: "{unverifiedLoginRequest}.events.onComplete",
                            args: ["{unverifiedLoginRequest}.nativeResponse", "{arguments}.0", 401, null, ["ok", "user"]]
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
            type: "gpii.express.user.api.login.test.caseHolder"
        }
    }
});