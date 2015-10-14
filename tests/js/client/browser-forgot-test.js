// Test the "forgot password" reset mechanism end-to-end
"use strict";
var fluid      = fluid || require("infusion");
fluid.setLogging(true);

var gpii       = fluid.registerNamespace("gpii");

var jqUnit     = fluid.require("jqUnit");
var Browser    = require("zombie");

var fs         = require("fs");

var isBrowserSane = require("./browser-sanity.js");

require("./zombie-test-harness.js");

var harness = gpii.express.couchuser.tests.harness({
    expressPort: 7533,
    baseUrl:     "http://localhost:7533/",
    pouchPort:   7534,
    pouchUrl:    "http://localhost:7534/",
    usersUrl:    "http://localhost:7534/_users",
    smtpPort:    4082
});

function runTests() {
    var browser;

    jqUnit.module("End-to-end functional \"forgot password\" tests...", { "setup": function () { browser = new Browser(); }});

    jqUnit.asyncTest("Confirm that passwords must match...", function () {
        var timestamp = (new Date()).getTime();

        // Set up a handler to continue the process once we receive an email
        harness.smtp.events.onMessageReceived.addListener("", function (that) {
            var content = fs.readFileSync(that.currentMessageFile);

            // Get the reset code and continue the reset process
            var resetCodeRegexp = new RegExp("(http.+reset/[a-z0-9-]+)", "i");
            var matches = content.toString().match(resetCodeRegexp);

            jqUnit.assertNotNull("There should be a reset code in the email sent to the user.", matches);
            if (matches) {
                var resetUrl = matches[1];
                jqUnit.stop();

                // We need a separate browser to avoid clobbering the instance used to generate this email, which still needs to check the results of its activity.
                var resetBrowser = Browser.create();
                resetBrowser.visit(resetUrl).then(function () {
                    jqUnit.start();
                    isBrowserSane(jqUnit, resetBrowser);
                    jqUnit.stop();

                    // Fill out the form
                    resetBrowser
                        .fill("password", timestamp)
                        .fill("confirm", timestamp + "x")
                        .pressButton("Reset Password", function () {
                            jqUnit.start();
                            isBrowserSane(jqUnit, resetBrowser);

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
                        });
                });
            }
        });

        browser.visit(harness.options.baseUrl + "content/forgot").then(function () {
            jqUnit.start();
            isBrowserSane(jqUnit, browser);
            jqUnit.stop();

            browser
                .fill("email", "reset@localhost")
                .pressButton("Send Email", function () {
                    jqUnit.start();
                    isBrowserSane(jqUnit, browser);

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
    });

    jqUnit.asyncTest("Try to reset a user who doesn't exist...", function () {
        var timestamp = (new Date()).getTime();

        browser.visit(harness.options.baseUrl + "content/forgot").then(function () {
            jqUnit.start();
            isBrowserSane(jqUnit, browser);
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
                });
        });
    });

    jqUnit.asyncTest("Try to use an invalid reset code...", function () {
        var timestamp = (new Date()).getTime();
        browser.visit(harness.options.baseUrl + "content/reset?code=" + timestamp).then(function () {
            jqUnit.start();
            isBrowserSane(jqUnit, browser);
            jqUnit.stop();

            browser.fill("password", timestamp)
                .fill("confirm", timestamp)
                .pressButton("Reset Password", function () {
                    jqUnit.start();

                    // The "forgot password" form should not be visible
                    var resetForm = browser.window.$(".reset-form");
                    jqUnit.assertTrue("There should be a \"reset\" form...", resetForm.html().length > 0);

                    // A "success" message should not be visible
                    var feedback = browser.window.$(".forgot-success");
                    jqUnit.assertEquals("There should not be a positive feedback message...", 0, feedback.html().length);

                    // There should be at least one alert
                    var alert = browser.window.$(".forgot-error");
                    jqUnit.assertTrue("The alert should have content.", alert.html().trim().length > 0);
                });
        });
    });

    // Save the test that uses a mail handler for the last.
    //
    // If we have to add even one more test that works with email, we will need to refactor to use a testEnvironment
    // and testCases, as we cannot reuse a mail handler between tests.
    jqUnit.asyncTest("Reset a user's password using the \"forgot password\" form...", function () {
        var timestamp = (new Date()).getTime();

        // Set up a handler to continue the process once we receive an email
        harness.smtp.events.onMessageReceived.addListener(function (that) {
            // This is a MIME message, it will mangle the lines and special characters unless we decode it.
            var MailParser = require("mailparser").MailParser,
                mailparser = new MailParser();

            // If this ends up going any deeper, we will need to refactor using a testEnvironment and testCases.
            mailparser.on("end", function (mailObject) {
                var content = mailObject.text;

                // Get the reset code and continue the reset process
                var resetCodeRegexp = new RegExp("(http.+reset[?]code=[a-z0-9-]+)", "i");
                var matches = content.toString().match(resetCodeRegexp);

                jqUnit.assertNotNull("There should be a reset code in the email sent to the user.", matches);
                if (matches) {
                    var resetUrl = matches[1];
                    jqUnit.stop();

                    // We need a separate browser to avoid clobbering the instance used to generate this email, which still needs to check the results of its activity.
                    var resetBrowser = new Browser();
                    resetBrowser.visit(resetUrl).then(function () {
                        jqUnit.start();
                        isBrowserSane(jqUnit, resetBrowser);
                        jqUnit.stop();

                        // Fill out the form
                        resetBrowser.fill("password", timestamp)
                            .fill("confirm", timestamp)
                            .pressButton("Reset Password", function () {
                                jqUnit.start();
                                isBrowserSane(jqUnit, resetBrowser);

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
                                resetBrowser.visit(harness.options.baseUrl + "content/login").then(function () {
                                    jqUnit.start();
                                    isBrowserSane(jqUnit, resetBrowser);
                                    jqUnit.stop();

                                    resetBrowser.fill("username", "reset")
                                        .fill("password", timestamp)
                                        .pressButton("Log In", function () {
                                            jqUnit.start();
                                            isBrowserSane(jqUnit, resetBrowser);

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
                                        });
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

        browser.visit(harness.options.baseUrl + "content/forgot").then(function () {
            jqUnit.start();
            isBrowserSane(jqUnit, browser);
            jqUnit.stop();

            browser
                .fill("email", "reset@localhost")
                .pressButton("Send Email", function () {
                    jqUnit.start();
                    isBrowserSane(jqUnit, browser);

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
    });
}

runTests();