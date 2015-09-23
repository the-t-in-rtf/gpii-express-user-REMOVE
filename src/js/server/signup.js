"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

var request = require("request"); // TODO:  Replace this with a writable data source.

require("./lib/datasource");
require("./lib/mailer");
require("./lib/password");

fluid.registerNamespace("gpii.express.user.api.signup.handler");

// Check to see if the user exists.
gpii.express.user.api.signup.handler.lookupExistingUser = function (that) {
    that.reader.get(that.request.body).then(that.checkForExistingUser);
};

gpii.express.user.api.signup.handler.checkForExistingUser = function (that, response) {
    if (response && response.username) {
        that.sendResponse(403, { ok: false, message: "A user with this email or username already exists."});
        return;
    }

    // Encode the user's password
    var salt        = gpii.express.user.password.generateSalt(that.options.saltLength);
    var derived_key = gpii.express.user.password.encode(that.request.body.password, salt);
    var code        = gpii.express.user.password.generateSalt(that.options.verifyCodeLength);

    var combinedRecord                   = fluid.copy(that.request.body);
    combinedRecord.salt                  = salt;
    combinedRecord.derived_key           = derived_key;
    combinedRecord[that.options.codeKey] = code;

    fluid.each(that.options.userDefaults, function (value, key) {
        combinedRecord[key] = value;
    });

    // Write the record to couch.  TODO: Migrate this to a writable dataSource.
    var writeOptions = {
        url:    that.options.urls.write,
        method: "POST",
        json:   true,
        body:   combinedRecord
    };
    request(writeOptions, function (error, response, body) {
        if (error) {
            return that.sendResponse(500, {ok: false, message: error});
        }
        else if ([200, 201].indexOf(response.statusCode) === -1) {
            return that.sendResponse(response.statusCode, { ok: false, message: body});
        }

        var mailOptions = fluid.copy(that.options.mailDefaults);
        mailOptions.to  = that.request.body.email;

        var templateContext = fluid.copy(that.options.templateDefaultContext);
        templateContext.user = combinedRecord;
        that.mailer.sendMessage(mailOptions, templateContext); // The mailer listeners will take care of the response from here.
    });
};

fluid.defaults("gpii.express.user.api.signup.handler", {
    gradeNames: ["gpii.express.handler"],
    templateDefaultContext: {
        app: "{gpii.express}.options.config.app"
    },
    urls: "{gpii.express.user.api.signup}.options.urls",
    saltLength: "{gpii.express.user.api.signup}.options.saltLength",
    verifyCodeLength: "{gpii.express.user.api.signup}.options.verifyCodeLength",
    codeKey: "{gpii.express.user.api.signup}.options.codeKey",
    mailDefaults: "{gpii.express.user.api.signup}.options.mailDefaults",
    userDefaults: "{gpii.express.user.api.signup}.options.userDefaults",
    invokers: {
        handleRequest: {
            funcName: "gpii.express.user.api.signup.handler.lookupExistingUser",
            args:     ["{that}"]
        },
        "checkForExistingUser": {
            funcName: "gpii.express.user.api.signup.handler.checkForExistingUser",
            args:     ["{that}", "{arguments}.0"],
            priority: "last"
        }
    },
    components: {
        reader: {
            type: "gpii.express.user.couchdb.read",
            options: {
                rules: {
                    read: {
                        "": "rows.0.value"
                    }
                },
                url:     "{gpii.express.user.api.signup}.options.urls.read",
                termMap: "{gpii.express.user.api.signup}.options.termMaps.read"
            }
        },
        mailer: {
            type: "gpii.mailer.smtp.handlebars",
            options: {
                templateDir:     "{gpii.express.user.api.signup}.options.templateDir",
                htmlTemplateKey: "{gpii.express.user.api.signup}.options.htmlTemplateKey",
                textTemplateKey: "{gpii.express.user.api.signup}.options.textTemplateKey",
                listeners: {
                    "onSuccess.sendResponse": {
                        func: "{handler}.sendResponse",
                        args: [200, { ok: true, message: "Your account has been created, but must be verified.  Please check your email for details."}]
                    },
                    "onError.sendResponse": {
                        func: "{handler}.sendResponse",
                        args: [500, { ok: false, message: "Your account has been created, but a confirmation email could not be sent.  Contact an administrator."}]
                    }
                }
            }

        }
    }
});

// TODO:  Wire up JSON schema validation middleware to automatically reject bad input.

fluid.defaults("gpii.express.user.api.signup", {
    gradeNames:       ["gpii.express.requestAware.router"],
    handlerGrades:    ["gpii.express.user.api.signup.handler"],
    path:             "/signup",
    method:           "post",
    saltLength:       32,
    verifyCodeLength: 16,
    codeKey:          "verification_code",  // Must match the value in gpii.express.user.api.verify
    couchPath:        "/_design/lookup/_view/byUsernameOrEmail",
    textTemplateKey:  "email-verify-text",
    htmlTemplateKey:  "email-verify-html",
    templateDefaultContext: {},
    urls: {
        read:  {
            expander: {
                funcName: "fluid.stringTemplate",
                args: [ "%url%path?keys=[\"%username\",\"%email\"]", { url: "{that}.options.couch.url", path: "{that}.options.couchPath"}]
            }
        },
        write: "{that}.options.couch.url"
    },
    termMaps: {
        read: { username: "%username", email: "%email"}
    },
    mailDefaults: {
        from:    "test@localhost",
        subject: "Please verify your account..."
    },
    userDefaults: {
        roles:           [],
        type:            "user",
        password_scheme: "pbkdf2",
        iterations:      10,
        verified:        false
    }
});