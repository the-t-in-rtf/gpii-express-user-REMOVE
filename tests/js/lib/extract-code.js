// Utility to examine a mail message and extract a code based on a regexp.  Used with both the password reset and
// account creation tests.
//
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var fs = require("fs");
var MailParser = require("mailparser").MailParser;

fluid.registerNamespace("gpii.express.user.api.test");

gpii.express.user.api.test.extractCode = function (testEnvironment, pattern) {
    var content = fs.readFileSync(testEnvironment.harness.smtp.mailServer.currentMessageFile, "utf8");

    var promise = fluid.promise();

    var mailParser = new MailParser({debug: false});

    // If this gets any deeper, refactor to use a separate function
    mailParser.on("end", function (mailObject) {
        var content = mailObject.text;
        var verificationCodeRegexp = new RegExp(pattern, "i");
        var matches = content.toString().match(verificationCodeRegexp);

        if (matches) {
            promise.resolve(matches[1]);
        }
        else {
            promise.reject();
        }
    });

    mailParser.write(content);
    mailParser.end();

    return promise;
};