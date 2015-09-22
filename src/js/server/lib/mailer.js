/*

  A common component for sending outgoing mail messages.  Used with the "forgot password" and "signup" APIs for now, but
  will eventually be moved to a central package for use elsewhere.

  Uses [nodemailer-smtp-transport](https://github.com/andris9/nodemailer-smtp-transport) at the moment.  All options
  supported by that package can be configured using the `options.transportOptions` setting.

  Mail content is created using `gpii-handlebars`.

 */
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var nodemailer    = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");

require("gpii-handlebars");

require("gpii-mail-test");

fluid.registerNamespace("gpii.mailer.smtp");

// Initialize the handlers we use to send messages and run our sanity checks.
gpii.mailer.smtp.init = function (that) {
    that.transport = nodemailer.createTransport(smtpTransport(that.options.transportOptions));
};

gpii.mailer.smtp.sendMessage = function (that, options) {
    that.transport.sendMail(options, that.handleSendResult);
};

//gpii.mailer.smtp.sendTemplateMessage = function (that, options) {
//    // TODO: Transform the payload
//
//    // TODO: Send the mail and report any problems
//};


gpii.mailer.smtp.handleSendResult = function (that, err, info) {
    if (err) {
        that.events.onError.fire({ message: err.message, stack: err.stack});
    }
    else {
        that.events.onSuccess.fire(info);
    }
};

fluid.defaults("gpii.mailer.smtp", {
    gradeNames: ["fluid.component"],
    transportOptions: {
    },
    events: {
        onError:   null,
        onSuccess: null
    },
    invokers: {
        sendMessage: {
            funcName: "gpii.mailer.smtp.sendMessage",
            args:     ["{that}", "{arguments}.0"] // data to plug into our template in preparing the outgoing messages.
        },
        handleSendResult: {
            funcName: "gpii.mailer.smtp.handleSendResult",
            args:     ["{that}", "{arguments}.0", "{arguments}.1"] // err, info
        }
    },
    listeners: {
        "onCreate.init": {
            funcName: "gpii.mailer.smtp.init",
            args:     ["{that}"]
        },
        "onError.log": {
            funcName: "fluid.log",
            args:     ["Message transport failed:", "{arguments}.0"]
        },
        "onSuccess.log": {
            funcName: "fluid.log",
            args:     ["Message transmitted:", "{arguments}.0"]
        }
    },
    components: {
        //handlebars: {
        //    type: ""
        //}
    }
});