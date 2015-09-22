// Testing the mail handling, including support for handlebars templates
//
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var jqUnit = require("jqUnit");

require("./kettle-includes");

require("../../src/js/server/lib/mailer");

// Although we are not working with express, we need to wire in a similar delay to ensure that QUnit has time to comb
// its hair or whatever it is it needs to do before we start imposing on it by asking it to do its job.
require("../../node_modules/gpii-express/tests/js/lib/test-helpers");

fluid.registerNamespace("gpii.mailer.tests");

gpii.mailer.tests.checkResponse = function (connection, expected) {
    // TODO: Check response sanity
    if (expected) {
        jqUnit.assertLeftHand("The response should be as expected", expected, connection);
    }
};

fluid.defaults("gpii.mailer.tests.caseHolder", {
    gradeNames: ["gpii.express.tests.caseHolder"],
    messages: {
        text: {
            from:    "sample@localhost",
            to:      "other@localhost",
            subject: "sample text message...",
            text:    "This is a sample message body."
        }
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
                            args: ["{caseHolder}.options.messages.text"]
                        },
                        {
                            listener: "gpii.mailer.tests.checkResponse",
                            event: "{testEnvironment}.mailServer.events.messageReceived",
                            args:  ["{arguments}.1", "{caseHolder}.options.expected.textMessage"]
                        }
                    ]
                }
            ]
        }
    ],
    components: {
        textMailer: {
            type: "gpii.mailer.smtp",
            options: {
                transportOptions: {
                    port: "{testEnvironment}.options.mailPort"
                }
            }
        }
    }

});

fluid.defaults("gpii.mailer.tests.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    mailPort:   "9925",
    events: {
        constructServer: null,
        onStarted:       null
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