// Test all user management functions using only a browser (and something to receive emails).
//
// There is some overlap between this and the server-tests.js, a test that fails in both is likely broken on the server side, a test that only fails here is likely broken in the client-facing code.

// TODO: Test signup form with various errors.  Password length errors and messages regarding duplicate users are not displayed correctly.
"use strict";
var fluid         = fluid || require("infusion");
var gpii          = fluid.registerNamespace("gpii");

var jqUnit        = fluid.require("jqUnit");
var Browser       = require("zombie");

var fs            = require("fs");

require("./lib/browser-sanity.js");
require("../test-environment.js");
require("../../../node_modules/gpii-express/tests/js/lib/test-helpers");

fluid.registerNamespace("gpii.express.user.tests.signup.client");

gpii.express.user.tests.signup.client.submitDuplicateUser = function (harness) {
    var timestamp = (new Date()).getTime();
    var username  = "user-" + timestamp;
    var password  = "Pass-" + timestamp;
    var email     = "existing@localhost";

    var browser = new Browser();

    jqUnit.stop();
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

                var feedback = browser.window.$(".signup-success");
                jqUnit.assertEquals("There should not be a positive feedback message...", 0, feedback.html().length);

                var alert = browser.window.$(".alert");
                jqUnit.assertTrue("There should be an alert...", alert.html().length > 0);
                if (alert.html()) {
                    jqUnit.assertTrue("The alert should have content.", alert.html().trim().length > 0);
                }

                // Make sure the test harness waits for us to actually be finished.
                harness.events.onReadyToDie.fire();
            });
    });
};

gpii.express.user.tests.signup.client.mismatchedPasswords = function (harness) {
    var browser = new Browser();
    var timestamp = (new Date()).getTime();
    var username  = "user-" + timestamp;
    var password  = "Pass-" + timestamp;
    var email     = "email-" + timestamp + "@localhost";

    jqUnit.stop();
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

                // Make sure the test harness waits for us to actually be finished.
                harness.events.onReadyToDie.fire();
            });
    });
};

gpii.express.user.tests.signup.client.invalidVerificationCode = function (harness) {
    var browser = new Browser();
    var timestamp = (new Date()).getTime();

    jqUnit.stop();
    browser.visit(harness.options.apiUrl + "verify/" + timestamp).then(function () {
        jqUnit.start();

        // There should be at least one alert
        var alert = browser.window.$(".alert");
        jqUnit.assertTrue("There should be an alert...", alert.html().length > 0);
        if (alert.html()) {
            jqUnit.assertTrue("The alert should have content.", alert.html().trim().length > 0);
        }

        // Make sure the test harness waits for us to actually be finished.
        harness.events.onReadyToDie.fire();
    });
};

gpii.express.user.tests.signup.client.startSignupFromBrowser = function (harness) {
    var browser = new Browser();

    var timestamp = (new Date()).getTime();
    var username  = "user-" + timestamp;
    var password  = "Pass-" + timestamp;
    var email     = "email-" + timestamp + "@localhost";

    // Save the sample user so that we can test the login later in the process.
    harness.user = {
        username: username,
        password: password
    };

    jqUnit.stop();
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
};

gpii.express.user.tests.signup.client.continueSignupFromEmail = function (harness) {
    var MailParser = require("mailparser").MailParser,
        mailparser = new MailParser();

    // If this ends up going any deeper, we should refactor to use a testEnvironment and testCaseHolder
    mailparser.on("end", function (mailObject) {
        jqUnit.start();
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
                var feedback = verifyBrowser.window.$(".success");
                jqUnit.assertNotUndefined("There should be a positive feedback message...", feedback.html());

                // There should be no alerts
                var alert = verifyBrowser.window.$(".alert");
                jqUnit.assertUndefined("There should not be an alert...", alert.html());

                // Log in using the new account
                jqUnit.stop();
                verifyBrowser.visit(harness.options.apiUrl + "login").then(function () {
                    jqUnit.start();
                    gpii.express.user.api.tests.isBrowserSane(jqUnit, verifyBrowser);
                    jqUnit.stop();

                    verifyBrowser.fill("username", harness.user.username)
                        .fill("password", harness.user.password)
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

                            // Make sure the test harness waits for us to actually be finished.
                            harness.events.onReadyToDie.fire();
                        });
                });
            });
        }
    });

    // send the email source to the parser
    jqUnit.stop();
    var content = fs.readFileSync(harness.smtp.mailServer.currentMessageFile);
    mailparser.write(content);
    mailparser.end();
};

fluid.defaults("gpii.express.user.tests.signup.client.caseHolder", {
    gradeNames: ["gpii.express.tests.caseHolder"],
    rawModules: [
        {
            tests: [
                {
                    name: "Try to create a user with the same address as an existing user...",
                    type: "test",
                    sequence: [
                        {
                            funcName: "gpii.express.user.tests.signup.client.submitDuplicateUser",
                            args:     ["{testEnvironment}.harness"]
                        },
                        {
                            listener: "fluid.identity",
                            event: "{testEnvironment}.harness.events.onReadyToDie"
                        }
                    ]
                },
                {
                    name: "Try to create a user with mismatching passwords...",
                    type: "test",
                    sequence: [
                        {
                            funcName: "gpii.express.user.tests.signup.client.mismatchedPasswords",
                            args:     ["{testEnvironment}.harness"]
                        },
                        {
                            listener: "fluid.identity",
                            event: "{testEnvironment}.harness.events.onReadyToDie"
                        }
                    ]
                },
                {
                    name: "Try to use an invalid verification code...",
                    type: "test",
                    sequence: [
                        {
                            funcName: "gpii.express.user.tests.signup.client.invalidVerificationCode",
                            args:     ["{testEnvironment}.harness"]
                        },
                        {
                            listener: "fluid.identity",
                            event: "{testEnvironment}.harness.events.onReadyToDie"
                        }
                    ]
                },
                {
                    name: "Create and verify a new user...",
                    type: "test",
                    sequence: [
                        {
                            funcName: "gpii.express.user.tests.signup.client.startSignupFromBrowser",
                            args:     ["{testEnvironment}.harness"]
                        },
                        {
                            listener: "gpii.express.user.tests.signup.client.continueSignupFromEmail",
                            event:    "{testEnvironment}.harness.smtp.events.onMessageReceived",
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
    apiPort:   7532,
    pouchPort: 7542,
    mailPort:  4089,
    components: {
        testCaseHolder: {
            type: "gpii.express.user.tests.signup.client.caseHolder"
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

