/*

  Tests for the session persisting middleware.

 */

"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

fluid.setLogging(true);

var jqUnit = require("jqUnit");
var cookie = require("cookie");

require("./kettle-includes");
require("./test-harness");

require("../../node_modules/gpii-express/tests/js/lib/test-helpers");

fluid.registerNamespace("gpii.express.user.session.tests.request");

fluid.defaults("gpii.express.user.session.tests.request", {
    gradeNames: ["kettle.test.request.httpCookie"],
    path:       "/",
    port:       "{testEnvironment}.options.apiPort",
    method:     "GET"
});

gpii.express.user.session.tests.checkCookies = function (response, body, cookieJar, cookieExpected) {
    gpii.express.tests.helpers.isSaneResponse(jqUnit, response, body, 200);

    var sessionCookie = null;
    fluid.each(cookieJar.cookie, function (value) {
        var cookieAsJson = cookie.parse(value);
        if (cookieAsJson._gpii_session) {
            // Request's `request` and `response` objects will wrap JSON content and unpack it automatically.
            // In our tests, we do it manually by looking for the `j` element that indicates wrapped JSON content.
            var trimmedString = cookieAsJson._gpii_session.substring(2);
            sessionCookie = JSON.parse(trimmedString);
        }
    });

    if (cookieExpected) {
        jqUnit.assertLeftHand("The session cookie should be as expected...", cookieExpected, sessionCookie);
    }
    else {
        jqUnit.assertNull("There should not be a session cookie...", sessionCookie);
    }
};

fluid.defaults("gpii.express.user.session.tests.caseHolder", {
    gradeNames: ["gpii.express.tests.caseHolder"],
    expectedCookie: { foo: "bar"},
    rawModules: [{
        tests: [
            // TODO: Discuss with Antranig, the order matters here as the cookieJar appears not to be reset between tests.
            {
                name: "Testing request with no session cookie...",
                type: "test",
                sequence: [
                    {
                        func: "{noCookieRequest}.send"
                    },
                    {
                        listener: "gpii.express.user.session.tests.checkCookies",
                        event: "{noCookieRequest}.events.onComplete",
                        args: ["{noCookieRequest}.nativeResponse", "{arguments}.0", "{cookieJar}", false]
                    }
                ]
            },
            {
                name: "Testing cookie renewal...",
                type: "test",
                sequence: [
                    {
                        func: "{setCookieRequest}.send"
                    },
                    {
                        listener: "fluid.identity",
                        event: "{setCookieRequest}.events.onComplete"
                    },

                    {
                        func: "{renewCookieRequest}.send"
                    },
                    {
                        listener: "gpii.express.user.session.tests.checkCookies",
                        event: "{renewCookieRequest}.events.onComplete",
                        args: ["{renewCookieRequest}.nativeResponse", "{arguments}.0", "{cookieJar}", "{that}.options.expectedCookie"]
                    }
                ]

            }
        ]
    }],
    components: {
        cookieJar: {
            type: "kettle.test.cookieJar"
        },
        setCookieRequest: {
            type: "gpii.express.user.session.tests.request",
            options: {
                path: "/setCookie"
            }
        },
        renewCookieRequest: {
            type: "gpii.express.user.session.tests.request",
            options: {
                path: "/",
                cookies: {
                    "_gpii_session": {
                        "value": "set"
                    }
                }
            }
        },
        noCookieRequest: {
            type: "gpii.express.user.session.tests.request",
            options: {
            }
        }
    }
});
fluid.defaults("gpii.express.user.session.tests.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    pouchPort:  "9500",
    apiPort:    "3960",
    events: {
        constructServer: null,
        onStarted: null
    },
    components: {
        harness: {       // instance of component under test
            createOnEvent: "constructServer",
            type:          "gpii.express.user.tests.harness",
            options: {
                pouchPort:  "{environment}.options.pouchPort",
                apiPort:    "{environment}.options.apiPort",
                listeners: {
                    "onStarted.notifyParent": {
                        func: "{environment}.events.onStarted.fire"
                    }
                }
            }
        },
        testCaseHolder: {
            type: "gpii.express.user.session.tests.caseHolder"
        }
    }
});

gpii.express.user.session.tests.environment();