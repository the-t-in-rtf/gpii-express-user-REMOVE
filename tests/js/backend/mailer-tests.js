// Testing the mail handling, including support for handlebars templates
//
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var fs         = require("fs");
var path       = require("path");
var jqUnit     = require("jqUnit");
var MailParser = require("mailparser").MailParser;

var templateDir = path.resolve(__dirname, "../templates");

require("gpii-mail-test");
require("./../kettle-includes");

require("../../../src/js/server/lib/mailer");

// Although we are not working with express, we need to wire in a similar delay to ensure that QUnit has time to comb
// its hair or whatever it is it needs to do before we start imposing on it by asking it to do its job.
require("../../../node_modules/gpii-express/tests/js/lib/test-helpers");

fluid.registerNamespace("gpii.mailer.tests");

gpii.mailer.tests.checkResponse = function (mailServerComponent, expected) {
    var mailContent = fs.readFileSync(mailServerComponent.currentMessageFile, "utf8");

    jqUnit.assertTrue("There should be mail content...", mailContent && mailContent.length > 0);

    if (expected) {
        var mailparser = new MailParser();

        mailparser.on("end", function (message) {
            jqUnit.start();
            jqUnit.assertLeftHand("The message sent should be as expected", expected, message);
        });

        // send the email source to the parser
        jqUnit.stop();
        mailparser.write(mailContent);
        mailparser.end();
    }


};

fluid.defaults("gpii.mailer.tests.caseHolder", {
    gradeNames: ["gpii.express.tests.caseHolder"],
    expected: {
        textMessage: {
            from:    [ { address: "sample@localhost", name: "" }],
            to:      [ { address: "other@localhost",  name: "" }],
            subject: "sample text message...",
            text:    "This is a sample message body."
        },
        templateMessage: {
            from:    [ { address: "sample@localhost", name: "" }],
            to:      [ { address: "other@localhost",  name: "" }],
            subject: "sample template message...",
            text:    "I am convincingly and customizably happy to be writing you.",
            html:    "I am convincingly and customizably <p><em>happy</em></p> to be writing you."
        }
    },
    messages: {
        textMessage: {
            from:    "sample@localhost",
            to:      "other@localhost",
            subject: "sample text message...",
            text:    "This is a sample message body."
        },
        templateMessage: {
            from:    "sample@localhost",
            to:      "other@localhost",
            subject: "sample template message..."
        }
    },
    templateMessageContext: {
        variable: "convincingly and customizably"
    },
    rawModules: [
        {
            tests: [
                {
                    name: "Test sending a simple message...",
                    type: "test",
                    sequence: [
                        {
                            func: "{textMailer}.sendMessage",
                            args: ["{caseHolder}.options.messages.textMessage"]
                        },
                        {
                            listener: "gpii.mailer.tests.checkResponse",
                            event: "{testEnvironment}.events.onMessageReceived",
                            args:  ["{arguments}.0", "{caseHolder}.options.expected.textMessage"]
                        }
                    ]
                },
                {
                    name: "Test sending a template message...",
                    type: "test",
                    sequence: [
                        {
                            func: "{templateMailer}.sendMessage",
                            args: ["{caseHolder}.options.messages.templateMessage", "{caseHolder}.options.templateMessageContext"]
                        },
                        {
                            listener: "gpii.mailer.tests.checkResponse",
                            event: "{testEnvironment}.events.onMessageReceived",
                            args:  ["{arguments}.0", "{caseHolder}.options.expected.templateMessage"]
                        }
                    ]
                }
            ]
        }
    ],
    components: {
        textMailer: {
            type: "gpii.mailer.smtp.text",
            options: {
                transportOptions: {
                    port: "{testEnvironment}.options.mailPort"
                }
            }
        },
        templateMailer: {
            type: "gpii.mailer.smtp.handlebars",
            options: {
                transportOptions: {
                    port: "{testEnvironment}.options.mailPort"
                },
                templateDir: templateDir,
                textTemplateKey: "mail-text",
                htmlTemplateKey: "mail-html"
            }
        }
    }
});

fluid.defaults("gpii.mailer.tests.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    mailPort:   "9925",
    events: {
        constructServer:   null,
        onStarted:         null,
        onMessageReceived: null
    },
    components: {
        mailServer: {
            type:          "gpii.test.mail.smtp",
            createOnEvent: "constructServer",
            options: {
                port: "{testEnvironment}.options.mailPort",
                components: {
                    mailServer: {
                        options: {
                            listeners: {
                                "ready.notifyEnvironment": {
                                    func: "{testEnvironment}.events.onStarted.fire"
                                },
                                "messageReceived.notifyEnvironment": {
                                    func: "{testEnvironment}.events.onMessageReceived.fire",
                                    args: ["{arguments}.0", "{arguments}.1"]
                                }
                            }
                        }
                    }
                }
            }
        },
        caseHolder: {
            type: "gpii.mailer.tests.caseHolder"
        }
    }

});

gpii.mailer.tests.environment();