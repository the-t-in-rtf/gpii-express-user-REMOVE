// Test all user management functions using only a browser (and something to receive emails).
//
// There is some overlap between this and the server-tests.js, a test that fails in both is likely broken on the server side, a test that only fails here is likely broken in the client-facing code.

"use strict";
var fluid         = fluid || require("infusion");
fluid.setLogging(true);

var gpii          = fluid.registerNamespace("gpii");

var jqUnit        = fluid.require("jqUnit");
var Browser       = require("zombie");

var fs            = require("fs");

require("./browser-sanity.js");

require("../test-harness.js");

var harness = gpii.express.user.tests.harness({
    apiPort:   7532,
    pouchPort: 7542,
    mailPort:  4089
});

function runTests() {
    var browser;

    jqUnit.module("End-to-end functional signup tests...", { "setup": function () { browser = new Browser({ continueOnError: true, headers: { "Accept": "text/html"} }); } });

    jqUnit.asyncTest("Try to create a user with the same address as an existing user...", function () {
        var timestamp = (new Date()).getTime();
        var username  = "user-" + timestamp;
        var password  = "pass-" + timestamp;
        var email     = "admin@localhost";

        browser.visit(harness.options.apiUrl + "signup").then(function () {
            jqUnit.start();
            gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);
            jqUnit.stop();

            browser
                .fill("username", username)
                .fill("password", password)
                .fill("confirm",  password)
                .fill("email", email)
                .pressButton("Sign Up", function () {
                    jqUnit.start();

                    var signupForm = browser.window.$(".signup-form");
                    jqUnit.assertNotUndefined("There should be a signup form...", signupForm.html());
                    jqUnit.assertEquals("The signup form should not be hidden...", "", signupForm.css("display"));

                    var feedback = browser.window.$(".success");
                    jqUnit.assertEquals("There should not be a positive feedback message...", 0, feedback.html().length);

                    var alert = browser.window.$(".alert");
                    jqUnit.assertTrue("There should be an alert...", alert.html().length > 0);
                    if (alert.html()) {
                        jqUnit.assertTrue("The alert should have content.", alert.html().trim().length > 0);
                    }
                });
        });
    });

    jqUnit.asyncTest("Try to create a user with mismatching passwords...", function () {
        var timestamp = (new Date()).getTime();
        var username  = "user-" + timestamp;
        var password  = "pass-" + timestamp;
        var email     = "email-" + timestamp + "@localhost";

        browser.visit(harness.options.apiUrl + "signup").then(function () {
            jqUnit.start();
            gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);
            jqUnit.stop();

            browser
                .fill("username", username)
                .fill("password", password)
                .fill("confirm",  password + "-different")
                .fill("email", email)
                .pressButton("Sign Up", function () {
                    jqUnit.start();
                    gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);

                    // The signup form should be visible
                    var signupForm = browser.window.$(".signup-form");
                    jqUnit.assertNotUndefined("There should be a signup form...", signupForm.html());
                    jqUnit.assertEquals("The signup form should be visible...", "", signupForm.css("display"));

                    // A "success" message should not be visible
                    var feedback = browser.window.$(".signup-success");
                    jqUnit.assertEquals("There should not be a positive feedback message...", 0, feedback.html().length);

                    // There should be no alerts
                    var alert = browser.window.$(".signup-error");
                    jqUnit.assertTrue("There should be an alert...", alert.html().length > 0);
                    if (alert.html()) {
                        jqUnit.assertTrue("The alert should have content.", alert.html().trim().length > 0);
                    }
                });
        });
    });

    jqUnit.asyncTest("Try to use an invalid verification code...", function () {
        var timestamp = (new Date()).getTime();
        browser.visit(harness.options.apiUrl + "verify/" + timestamp).then(function () {
            jqUnit.start();
            // A "success" message should not be visible
            var feedback = browser.window.$(".verify-success");
            jqUnit.assertEquals("There should not be a positive feedback message...", 0, feedback.html().length);

            // There should be at least one alert
            var alert = browser.window.$(".verify-error");
            jqUnit.assertTrue("There should be an alert...", alert.html().length > 0);
            if (alert.html()) {
                jqUnit.assertTrue("The alert should have content.", alert.html().trim().length > 0);
            }
        });
    });

    // This test is the only one that requires a mail handler.
    // If we have to add even one more, we'll have to look at refactoring to use a testEnvironment and testHarness, so that the mail server is never reused between tests.
    jqUnit.asyncTest("Create and verify a new user...", function () {
        var timestamp = (new Date()).getTime();
        var username  = "user-" + timestamp;
        var password  = "pass-" + timestamp;
        var email     = "email-" + timestamp + "@localhost";

        // Set up a handler to continue the process once we receive an email
        harness.smtp.events.onMessageReceived.addListener(function (that) {
            var MailParser = require("mailparser").MailParser,
                mailparser = new MailParser();

            // If this ends up going any deeper, we should refactor to use a testEnvironment and testCaseHolder
            mailparser.on("end", function (mailObject) {
                var content = mailObject.text;

                // Get the reset code and continue the reset process
                var verifyCodeRegexp = new RegExp("(http.+verify/[a-z0-9-]+)", "i");
                var matches = content.toString().match(verifyCodeRegexp);

                jqUnit.assertNotNull("There should be a verification code in the email sent to the user.", matches);
                if (matches) {
                    var verifyUrl = matches[1];
                    jqUnit.stop();

                    // We need a separate browser to avoid clobbering the instance used to generate this email, which still needs to check the results of its activity.
                    var verifyBrowser = new Browser();
                    verifyBrowser.visit(verifyUrl).then(function () {
                        jqUnit.start();
                        gpii.express.user.api.tests.isBrowserSane(jqUnit, verifyBrowser);

                        // A "success" message should be visible
                        var feedback = verifyBrowser.window.$(".verify-success");
                        jqUnit.assertNotUndefined("There should be a positive feedback message...", feedback.html());

                        // There should be no alerts
                        var alert = verifyBrowser.window.$(".verify-error");
                        jqUnit.assertUndefined("There should not be an alert...", alert.html());

                        // Log in using the new account
                        jqUnit.stop();
                        verifyBrowser.visit(harness.options.baseUrl + "login").then(function () {
                            jqUnit.start();
                            gpii.express.user.api.tests.isBrowserSane(jqUnit, verifyBrowser);
                            jqUnit.stop();

                            verifyBrowser.fill("username", "reset")
                                .fill("password", timestamp)
                                .pressButton("Log In", function () {
                                    jqUnit.start();
                                    gpii.express.user.api.tests.isBrowserSane(jqUnit, verifyBrowser);

                                    // The login form should no longer be visible
                                    var loginForm = verifyBrowser.window.$(".login-form");
                                    jqUnit.assertNotUndefined("There should be a login form...", loginForm.html());
                                    jqUnit.assertEquals("The login form should not be hidden...", "none", loginForm.css("display"));

                                    // A "success" message should be visible
                                    var feedback = verifyBrowser.window.$(".login-success");
                                    jqUnit.assertNotUndefined("There should be a positive feedback message...", feedback.html());

                                    // There should be no alerts
                                    var alert = verifyBrowser.window.$(".login-error");
                                    jqUnit.assertEquals("There should not be any alerts...", 0, alert.html().length);
                                });
                        });
                    });
                }
            });

            // send the email source to the parser
            var content = fs.readFileSync(that.currentMessageFile);
            mailparser.write(content);
            mailparser.end();
        });

        browser.visit(harness.options.apiUrl + "signup").then(function () {
            jqUnit.start();
            gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);
            jqUnit.stop();

            browser
                .fill("username", username)
                .fill("password", password)
                .fill("confirm",  password)
                .fill("email", email)
                .pressButton("Sign Up", function () {
                    jqUnit.start();
                    gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);

                    // The signup form should not be visible
                    var signupForm = browser.window.$(".signup-form");
                    jqUnit.assertNotUndefined("There should be a signup form...", signupForm.html());
                    jqUnit.assertEquals("The signup form should be hidden...", "none", signupForm.css("display"));

                    // A "success" message should be visible
                    var feedback = browser.window.$(".success");
                    jqUnit.assertNotUndefined("There should be a positive feedback message...", feedback.html());

                    // There should be no alerts
                    var alert = browser.window.$(".alert");
                    jqUnit.assertUndefined("There should not be an alert...", alert.html());
                });
        });
    });
}

runTests();
