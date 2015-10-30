// Test the "forgot password" reset mechanism end-to-end
"use strict";
var fluid      = fluid || require("infusion");
var gpii       = fluid.registerNamespace("gpii");

var jqUnit     = fluid.require("jqUnit");
var Browser    = require("zombie");

var fs         = require("fs");

require("./lib/browser-sanity.js");
require("../test-environment.js");
require("../../../node_modules/gpii-express/tests/js/lib/test-helpers");

fluid.registerNamespace("gpii.express.user.tests.forgot.client");

gpii.express.user.tests.forgot.client.testMismatchingPasswords = function (harness) {
    var browser = new Browser();

    jqUnit.stop();
    browser.visit(harness.options.apiUrl + "forgot").then(function () {
        jqUnit.start();
        gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);
        jqUnit.stop();

        browser
            .fill("email", "existing@localhost")
            .pressButton("Send Email", function () {
                jqUnit.start();
                gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);

                // The "forgot password" form should not be visible
                var forgotForm = browser.window.$(".forgot-form");
                jqUnit.assertTrue("There should be a \"forgot password\" form...", forgotForm.html().length > 0);
                jqUnit.assertEquals("The \"forgot password\" form should be hidden...", "none", forgotForm.css("display"));


                // A "success" message should be visible
                var feedback = browser.window.$(".forgot-success");
                jqUnit.assertTrue("There should be a positive feedback message...", feedback.html().length > 0);

                // There should be no alerts
                var alert = browser.window.$(".forgot-error");
                jqUnit.assertEquals("There should not be an alert...", 0, alert.html().length);
            });
    });
};

gpii.express.user.tests.forgot.client.continueMismatchedPasswordTestFromEmail = function (harness) {
    var timestamp = (new Date()).getTime();
    var content = fs.readFileSync(harness.smtp.mailServer.currentMessageFile, "utf8");

    // Get the reset code and continue the reset process
    var resetCodeRegexp = new RegExp("(http.+reset/[a-z0-9-]+)", "i");
    var matches = content.toString().match(resetCodeRegexp);

    jqUnit.assertNotNull("There should be a reset code in the email sent to the user.", matches);
    if (matches) {
        var resetUrl = matches[1];
        jqUnit.stop();

        // We need a separate browser to avoid clobbering the instance used to generate this email, which still needs to check the results of its activity.
        var resetBrowser = new Browser();
        resetBrowser.visit(resetUrl).then(function () {
            jqUnit.start();
            gpii.express.user.api.tests.isBrowserSane(jqUnit, resetBrowser);
            jqUnit.stop();

            // Fill out the form
            resetBrowser
                .fill("password", timestamp)
                .fill("confirm", timestamp + "x")
                .pressButton("Reset Password", function () {
                    jqUnit.start();
                    gpii.express.user.api.tests.isBrowserSane(jqUnit, resetBrowser);

                    // The forgot password form should be visible
                    var resetForm = resetBrowser.window.$(".reset-form");
                    jqUnit.assertTrue("There should be a form...", resetForm.html().length > 0);
                    jqUnit.assertEquals("The form should not be hidden...", "", resetForm.css("display"));

                    // A "success" message should not be visible
                    var feedback = resetBrowser.window.$(".success");
                    jqUnit.assertUndefined("There should not be a positive feedback message...", feedback.html());

                    // There should be an alert
                    var alert = resetBrowser.window.$(".alert");
                    jqUnit.assertTrue("There should be at least one alert...", alert.html().length > 0);
                    if (alert.html()) {
                        jqUnit.assertTrue("The alert should have content.", alert.html().trim().length > 0);
                    }

                    // Make sure the test harness waits for us to actually be finished.
                    harness.events.onReadyToDie.fire();
                });
        });
    }
};

gpii.express.user.tests.forgot.client.resetMissingUser = function (harness) {
    var browser = new Browser();
    var timestamp = (new Date()).getTime();

    jqUnit.stop();
    browser.visit(harness.options.apiUrl + "forgot").then(function () {
        jqUnit.start();
        gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);
        jqUnit.stop();

        browser
            .fill("email", timestamp + "@localhost")
            .pressButton("Send Email", function () {
                jqUnit.start();

                // The "forgot password" form should be visible
                var forgotForm = browser.window.$(".forgot-form");
                jqUnit.assertTrue("There should be a \"forgot password\" form...", forgotForm.html().length > 0);
                jqUnit.assertEquals("The \"forgot password\" form should not be hidden...", "", forgotForm.css("display"));

                // A "success" message should be visible
                var feedback = browser.window.$(".forgot-success");
                jqUnit.assertEquals("There should not be a positive feedback message...", 0, feedback.html().length);

                // There should be no alerts
                var alert = browser.window.$(".forgot-error");
                jqUnit.assertTrue("There should be an alert...", alert.html().length > 0);
                if (alert.html()) {
                    jqUnit.assertTrue("The alert should have content.", alert.html().trim().length > 0);
                }

                // Make sure the test harness waits for us to actually be finished.
                harness.events.onReadyToDie.fire();
            });
    });
};

gpii.express.user.tests.forgot.client.invalidResetCode = function (harness) {
    var browser = new Browser();
    var timestamp = (new Date()).getTime();

    jqUnit.stop();
    browser.visit(harness.options.apiUrl + "reset/" + timestamp).then(function () {
        jqUnit.start();
        gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);
        jqUnit.stop();

        browser.fill("password", timestamp)
            .fill("confirm", timestamp)
            .pressButton("Reset Password", function () {
                jqUnit.start();

                // The "forgot password" form should not be visible
                var resetForm = browser.window.$(".reset-form");
                jqUnit.assertTrue("There should be a \"reset\" form...", resetForm.html().length > 0);

                // A "success" message should not be visible
                var feedback = browser.window.$(".reset-success");
                jqUnit.assertEquals("There should not be a positive feedback message...", 0, feedback.html().length);

                // There should be at least one alert
                var alert = browser.window.$(".reset-error");
                jqUnit.assertTrue("The alert should have content.", alert.html().trim().length > 0);

                // Make sure the test harness waits for us to actually be finished.
                harness.events.onReadyToDie.fire();
            });
    });
};

gpii.express.user.tests.forgot.client.resetEndToEnd  = function (harness) {
    var browser = new Browser();

    jqUnit.stop();
    browser.visit(harness.options.apiUrl + "forgot").then(function () {
        jqUnit.start();
        gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);
        jqUnit.stop();

        // Because of the event sequence, we can't wait around to listen and test the results.
        // The proof will be in the pudding, i.e. if we get an email, things are hopefully OK.
        browser
            .fill("email", "existing@localhost")
            .pressButton("Send Email", function () {
                jqUnit.start();
                gpii.express.user.api.tests.isBrowserSane(jqUnit, browser);

                // The "forgot password" form should not be visible
                var forgotForm = browser.window.$(".forgot-form");
                jqUnit.assertTrue("There should be a \"forgot password\" form...", forgotForm.html().length > 0);
                jqUnit.assertEquals("The \"forgot password\" form should be hidden...", "none", forgotForm.css("display"));

                // A "success" message should be visible
                var feedback = browser.window.$(".forgot-success");
                jqUnit.assertTrue("There should be a positive feedback message...", feedback.html().length > 0);

                // There should be no alerts
                var alert = browser.window.$(".forgot-error");
                jqUnit.assertEquals("There should not be an alert...", 0, alert.html().length);
            });
    });
};

gpii.express.user.tests.forgot.client.continueResetFromEmail = function (harness) {
    var timestamp = (new Date()).getTime();
    var password  = "Password-" + timestamp;

    // This is a MIME message, it will mangle the lines and special characters unless we decode it.
    var MailParser = require("mailparser").MailParser,
        mailparser = new MailParser();

    // If this ends up going any deeper, we will need to refactor using a testEnvironment and testCases.
    mailparser.on("end", function (mailObject) {
        jqUnit.start();
        var content = mailObject.text;

        // Get the reset code and continue the reset process
        var resetCodeRegexp = new RegExp("(http.+reset/[a-z0-9-]+)", "i");
        var matches = content.toString().match(resetCodeRegexp);

        jqUnit.assertNotNull("There should be a reset code in the email sent to the user.", matches);
        if (matches) {
            var resetUrl = matches[1];
            jqUnit.stop();

            // We need a separate browser to avoid clobbering the instance used to generate this email, which still needs to check the results of its activity.
            var resetBrowser = new Browser();
            resetBrowser.visit(resetUrl).then(function () {
                jqUnit.start();
                gpii.express.user.api.tests.isBrowserSane(jqUnit, resetBrowser);
                jqUnit.stop();

                // Fill out the form
                resetBrowser.fill("password", password)
                    .fill("confirm", password)
                    .pressButton("Reset Password", function () {
                        jqUnit.start();
                        gpii.express.user.api.tests.isBrowserSane(jqUnit, resetBrowser);

                        // The reset form should no longer be visible
                        var resetForm = resetBrowser.window.$(".reset-form");
                        jqUnit.assertTrue("There should be a reset form...", resetForm.html().length > 0);
                        jqUnit.assertEquals("The reset form should be hidden...", "none", resetForm.css("display"));

                        // A "success" message should be visible
                        var feedback = resetBrowser.window.$(".reset-success");
                        jqUnit.assertTrue("There should be a positive feedback message...", feedback.html().length > 0);

                        // There should be no alerts
                        var alert = resetBrowser.window.$(".alert");
                        jqUnit.assertUndefined("There should not be any alerts...", alert.html());

                        // Log in using the new details
                        jqUnit.stop();
                        resetBrowser.visit(harness.options.apiUrl + "login").then(function () {
                            jqUnit.start();
                            gpii.express.user.api.tests.isBrowserSane(jqUnit, resetBrowser);
                            jqUnit.stop();

                            resetBrowser.fill("username", "existing")
                                .fill("password", password)
                                .pressButton("Log In", function () {
                                    jqUnit.start();
                                    gpii.express.user.api.tests.isBrowserSane(jqUnit, resetBrowser);

                                    // The login form should no longer be visible
                                    var loginForm = resetBrowser.window.$(".login-form");
                                    jqUnit.assertTrue("There should be a login form...", loginForm.html().length > 0);
                                    jqUnit.assertEquals("The login form should be hidden...", "none", loginForm.css("display"));

                                    // A "success" message should be visible
                                    var feedback = resetBrowser.window.$(".success");
                                    jqUnit.assertTrue("There should be a positive feedback message...", feedback.html().length > 0);

                                    // There should be no alerts
                                    var alert = resetBrowser.window.$(".alert");
                                    jqUnit.assertUndefined("There should not be any alerts...", alert.html());

                                    // Make sure the test harness waits for us to actually be finished.
                                    harness.events.onReadyToDie.fire();
                                });
                        });
                    });
            });
        }
    });

    // send the email source to the parser
    jqUnit.stop();
    var mailFileContents = fs.readFileSync(harness.smtp.mailServer.currentMessageFile, "utf8");
    mailparser.write(mailFileContents);
    mailparser.end();
};


fluid.defaults("gpii.express.user.tests.forgot.client.caseHolder", {
    gradeNames: ["gpii.express.tests.caseHolder"],
    rawModules: [
        {
            tests: [
                {
                    name: "Confirm that passwords must match...",
                    type: "test",
                    sequence: [
                        {
                            funcName: "gpii.express.user.tests.forgot.client.testMismatchingPasswords",
                            args:     ["{testEnvironment}.harness"]
                        },
                        {
                            listener: "gpii.express.user.tests.forgot.client.continueMismatchedPasswordTestFromEmail",
                            event:    "{testEnvironment}.harness.smtp.events.onMessageReceived",
                            args:     ["{testEnvironment}.harness"]
                        },
                        {
                            listener: "fluid.identity",
                            event: "{testEnvironment}.harness.events.onReadyToDie"
                        }
                    ]
                },
                {
                    name: "Try to reset a user who doesn't exist...",
                    type: "test",
                    sequence: [
                        {
                            funcName: "gpii.express.user.tests.forgot.client.resetMissingUser",
                            args:     ["{testEnvironment}.harness"]
                        },
                        {
                            listener: "fluid.identity",
                            event: "{testEnvironment}.harness.events.onReadyToDie"
                        }
                    ]
                },
                {
                    name: "Try to use an invalid reset code...",
                    type: "test",
                    sequence: [
                        {
                            funcName: "gpii.express.user.tests.forgot.client.invalidResetCode",
                            args:     ["{testEnvironment}.harness"]
                        },
                        {
                            listener: "fluid.identity",
                            event: "{testEnvironment}.harness.events.onReadyToDie"
                        }
                    ]
                },
                {
                    name: "Reset a user's password using the \"forgot password\" form...",
                    type: "test",
                    sequence: [
                        {
                            funcName: "gpii.express.user.tests.forgot.client.resetEndToEnd",
                            args:     ["{testEnvironment}.harness"]
                        },
                        {
                            listener: "gpii.express.user.tests.forgot.client.continueResetFromEmail",
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
    apiPort:   7533,
    pouchPort: 7534,
    mailPort:  4082,
    components: {
        testCaseHolder: {
            type: "gpii.express.user.tests.forgot.client.caseHolder"
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
