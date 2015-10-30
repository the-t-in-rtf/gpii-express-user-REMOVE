// Test all user management functions using only a browser (and something to receive emails).
//
// There is some overlap between this and the server-tests.js, a test that fails in both is likely broken on the server side, a test that only fails here is likely broken in the client-facing code.

"use strict";
var fluid      = fluid || require("infusion");
fluid.setLogging(true);

var gpii       = fluid.registerNamespace("gpii");

var jqUnit     = fluid.require("jqUnit");
var Browser    = require("zombie");

require("./lib/browser-sanity.js");
require("../test-environment.js");
require("../../../node_modules/gpii-express/tests/js/lib/test-helpers");

fluid.registerNamespace("gpii.express.user.tests.login.client");

gpii.express.user.tests.login.client.loginWithValidUser = function (harness) {
    var browser = new Browser();

    jqUnit.stop();
    browser.visit(harness.options.apiUrl + "login").then(function () {
        jqUnit.start();
        gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);

        jqUnit.stop();
        browser.fill("username", "existing")
            .fill("password", "password")
            .pressButton("Log In", function () {
                jqUnit.start();
                gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);

                // The login form should no longer be visible
                var loginForm = browser.window.$(".login-form");
                jqUnit.assertNotUndefined("There should be a login form...", loginForm.html());
                jqUnit.assertEquals("The login form should be hidden...", "none", loginForm.css("display"));

                // A "success" message should be visible
                var feedback = browser.window.$(".login-success");
                jqUnit.assertTrue("There should be a positive feedback message...", feedback.html().length > 0);

                // The profile should now have data
                var toggle = browser.window.$(".user-controls-toggle");
                var username = toggle.text().trim();
                jqUnit.assertTrue("The profile username should not be undefined", username.indexOf("Not Logged In") === -1);

                // There should be no alerts
                var alert = browser.window.$(".alert");
                jqUnit.assertUndefined("There should not be any alerts...", alert.html());
                jqUnit.stop();

                // Now try to log out using the profile controls
                //
                // We had to make jQuery fire the events (see below).
                toggle.click();
                browser.evaluate("$('.user-menu-logout').click()");

                // We have to wait for the refresh to complete (the default wait period is 0.5 seconds)
                browser.wait(function () {
                    jqUnit.start();

                    // The profile should no longer have data
                    var toggleAfterLogout = browser.window.$(".user-controls-toggle");
                    var usernameAfterLogout = toggleAfterLogout.text().trim();
                    jqUnit.assertTrue("The profile username should not be set", usernameAfterLogout.indexOf("Not Logged In") !== -1);

                    // Make sure the test harness waits for us to actually be finished.
                    harness.events.onReadyToDie.fire();
                });

                // Zombie's `fire(eventName, selector, callback)` method does not appear to work at all, either as promises or as nested callbacks (see below)
                //
                // browser.fire("click", ".user-controls-toggle", function () {
                //    browser.fire("click", ".user-menu-logout", function () {
                //        jqUnit.start();
                //        gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);
                //
                //        // The profile should no longer have data
                //        var toggle = browser.window.$(".user-controls-toggle");
                //        var username = toggle.text().trim();
                //        jqUnit.assertTrue("The profile username should not be set", username.indexOf("Not Logged In") !== -1);
                //    });
                //});
            });
    });
};

gpii.express.user.tests.login.client.loginWithInvalidUser = function (harness) {
    var browser = new Browser();

    jqUnit.stop();
    browser.visit(harness.options.apiUrl + "login").then(function () {
        jqUnit.start();
        gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);

        jqUnit.stop();
        browser.fill("username", "bogus")
            .fill("password", "bogus")
            .pressButton("Log In", function () {
                jqUnit.start();
                // In this case, there should be an error in the AJAX call, so we can't use the standard browser test
                //testBrowserSanity(jqUnit, browser);

                // The login form should be visible
                var loginForm = browser.window.$(".login-form");
                jqUnit.assertNotUndefined("There should be a login form...", loginForm.html());
                jqUnit.assertEquals("The login form should not be hidden...", "", loginForm.css("display"));

                // A "success" message should be visible
                var feedback = browser.window.$(".success");
                jqUnit.assertUndefined("There should not be a positive feedback message...", feedback.html());

                // There should be no alerts
                var alert = browser.window.$(".alert");
                jqUnit.assertNotUndefined("There should be an alert...", alert.html());
                if (alert.html()) {
                    jqUnit.assertTrue("The alert should have content.", alert.html().trim().length > 0);
                }

                // Make sure the test harness waits for us to actually be finished.
                harness.events.onReadyToDie.fire();
            });
    });
};

fluid.defaults("gpii.express.user.tests.login.client.caseHolder", {
    gradeNames: ["gpii.express.tests.caseHolder"],
    rawModules: [
        {
            tests: [
                {
                    name: "Login with a valid username and password...",
                    type: "test",
                    sequence: [
                        {
                            funcName: "gpii.express.user.tests.login.client.loginWithValidUser",
                            args:     ["{testEnvironment}.harness"]
                        },
                        {
                            listener: "fluid.identity",
                            event: "{testEnvironment}.harness.events.onReadyToDie"
                        }
                    ]
                },
                {
                    name: "Login with an invalid username and password...",
                    type: "test",
                    sequence: [
                        {
                            funcName: "gpii.express.user.tests.login.client.loginWithInvalidUser",
                            args:     ["{testEnvironment}.harness"]
                        },
                        {
                            listener: "fluid.identity",
                            event: "{testEnvironment}.harness.events.onReadyToDie"
                        }
                    ]
                }
            ]
        }
    ]
});

gpii.express.user.tests.environment({
    apiPort:   7542,
    pouchPort: 7524,
    mailPort:  4099,
    components: {
        testCaseHolder: {
            type: "gpii.express.user.tests.login.client.caseHolder"
        },
        harness: {
            options: {
                events: {
                    onReadyToDie: null
                }
            }
        }
    }
});

