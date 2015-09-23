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

// Initialize the transport we use to send messages.  See above for documentation of `options.transportOptions`.
gpii.mailer.smtp.init = function (that) {
    that.transport = nodemailer.createTransport(smtpTransport(that.options.transportOptions));
};

// Send a message using `nodemailer-smtp-transport`.  Here is a basic example of typical `mailOptions`:
//
// {
//   from:    "sender@site1.com",
//   to:      "recipient@site2.com",
//   cc:      "overseer@site3.com",
//   subject: "Sample subject...",
//   text:    "Text body of the message.\n",
//   html:    "<p>HTML body of the message.</p>\n"
// }
//
// Note that the `to` and `cc` elements can also be passed an array of email addresses.  The full syntax available for
// `mailOptions` can be found in [the nodemailer documentation](https://github.com/andris9/Nodemailer).
//
gpii.mailer.smtp.sendMessage = function (that, mailOptions) {
    that.transport.sendMail(mailOptions, gpii.mailer.smtp.getResultHandler(that));
};

// Transform a message using handlebars before sending it. If `options.templates.html` is found, the message will
// include an html body.  If `options.templates.text` is found, the message will include a text body.  Both can be
// used with the same message.
//
// The `context` argument will be sent to handlebars and can be referenced using handlebars variables.  For example,
// if you pass in `{ variable: "value" }` as the `context`, then `{{variable}}` would become `value` in the final
// output.
//
gpii.mailer.smtp.sendTemplateMessage = function (that, options, context) {
    // TODO: Transform the payload

    // TODO: Send the mail and report any problems
};

// This wrapper is necessary to avoid problems when a mail handler is destroyed before it is given a chance to handle
// a response, as happens when using the test runner.
//
// TODO:  Review and discuss with Antranig.
gpii.mailer.smtp.getResultHandler = function (that) {
    return function (err, info) {
        if (fluid.isDestroyed(that)) {
            fluid.log("Attempted to handle send result after component was destroyed...");
        }
        else {
            that.handleSendResult(err, info);
        }
    };
};

// When we know the results of sending the message, fire an appropriate event so that other components can take action.
// Fires an `onError` event if an error is received, and passes along the error message and stack.  If the message is
// sent successfully, an `onSuccess` event is fired and the `info` object is passed along.
//
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
        ignoreTLS: true
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