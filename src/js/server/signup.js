"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

var request = require("request"); // TODO:  Replace this with a writable data source.

var path      = require("path");
var schemaDir = path.resolve(__dirname, "../../schemas");

require("./lib/datasource");
require("./lib/mailer");
require("./lib/password");
require("./lib/singleTemplateRouter");

fluid.registerNamespace("gpii.express.user.api.signup.post.handler");

// Check to see if the user exists.
gpii.express.user.api.signup.post.handler.lookupExistingUser = function (that) {
    that.reader.get(that.request.body).then(that.checkForExistingUser);
};

gpii.express.user.api.signup.post.handler.checkForExistingUser = function (that, response) {
    if (response && response.username) {
        that.sendResponse(403, { ok: false, message: "A user with this email or username already exists."});
        return;
    }

    // Encode the user's password
    var salt        = gpii.express.user.password.generateSalt(that.options.saltLength);
    var derived_key = gpii.express.user.password.encode(that.request.body.password, salt);
    var code        = gpii.express.user.password.generateSalt(that.options.verifyCodeLength);

    var combinedRecord                   = fluid.copy(that.request.body);
    // Set the "name" to the username for backward compatibility with CouchDB
    combinedRecord.name                  = combinedRecord.username;
    combinedRecord.salt                  = salt;
    combinedRecord.derived_key           = derived_key;
    combinedRecord[that.options.codeKey] = code;

    // Make sure we don't inadvertantly save the original password to the database.
    delete combinedRecord.password;
    delete combinedRecord.confirm;

    fluid.each(that.options.userDefaults, function (value, key) {
        combinedRecord[key] = value;
    });

    // Set the ID to match the CouchDB conventions, for backward compatibility
    combinedRecord._id = "org.couch.db.user:" + combinedRecord.username;

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

fluid.defaults("gpii.express.user.api.signup.post.handler", {
    gradeNames: ["gpii.express.handler"],
    templateDefaultContext: {
        app: "{gpii.express}.options.config.app"
    },
    urls: "{gpii.express.user.api.signup.post}.options.urls",
    saltLength: "{gpii.express.user.api.signup.post}.options.saltLength",
    verifyCodeLength: "{gpii.express.user.api.signup.post}.options.verifyCodeLength",
    codeKey: "{gpii.express.user.api.signup.post}.options.codeKey",
    mailDefaults: "{gpii.express.user.api.signup.post}.options.mailDefaults",
    userDefaults: "{gpii.express.user.api.signup.post}.options.userDefaults",
    invokers: {
        handleRequest: {
            funcName: "gpii.express.user.api.signup.post.handler.lookupExistingUser",
            args:     ["{that}"]
        },
        "checkForExistingUser": {
            funcName: "gpii.express.user.api.signup.post.handler.checkForExistingUser",
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
                url:     "{gpii.express.user.api.signup.post}.options.urls.read",
                termMap: "{gpii.express.user.api.signup.post}.options.termMaps.read"
            }
        },
        mailer: {
            type: "gpii.express.user.mailer.handlebars",
            options: {
                templateDir:     "{gpii.express.user.api.signup.post}.options.templateDir",
                htmlTemplateKey: "{gpii.express.user.api.signup.post}.options.htmlTemplateKey",
                textTemplateKey: "{gpii.express.user.api.signup.post}.options.textTemplateKey",
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

fluid.defaults("gpii.express.user.api.signup.post", {
    gradeNames:       ["gpii.express.router.passthrough"],
    path:             "/",
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
                args: [ "%userDbUrl%path?keys=[\"%username\",\"%email\"]", { userDbUrl: "{that}.options.couch.userDbUrl", path: "{that}.options.couchPath"}]
            }
        },
        write: "{that}.options.couch.userDbUrl"
    },
    rules: {
        write: {
            "": "",
            "name": "username" // Default rules are designed to cater to CouchDB  and express-couchUser conventions, but can be overriden.
        }
    },
    distributeOptions: {
        source: "{that}.options.rules",
        target: "{that gpii.express.handler}.options.rules"
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
    },
    components: {
        schemaMiddleware: {
            type: "gpii.schema.middleware",
            options: {
                schemaDir: schemaDir,
                schemaKey: "user-signup"
            }
        },
        requestAwareRouter: {
            type: "gpii.express.requestAware.router",
            options: {
                method:           "post",
                path:             "/",
                handlerGrades:    ["gpii.express.user.api.signup.post.handler"]
            }
        }
    }
});


fluid.defaults("gpii.express.user.api.signup", {
    gradeNames: ["gpii.express.router.passthrough"],
    path:       "/signup",
    rules: {
        user: {
            "username": "name", // Default configuration is designed for CouchDB and express-couchUser field naming conventions.
            "email":    "email"
        }
    },
    distributeOptions: [
        {
            source: "{that}.options.couch",
            target: "{that gpii.express.router}.options.couch"
        },
        {
            source: "{that}.options.couch",
            target: "{that gpii.express.handler}.options.couch"
        },
        {
            source: "{that}.options.rules",
            target: "{that gpii.express.handler}.options.rules"
        }
    ],
    components: {
        getRouter: {
            type: "gpii.express.user.api.singleTemplateRouter",
            options: {
                templateKey: "pages/signup"
            }
        },
        postRouter: {
            type: "gpii.express.user.api.signup.post"
        }
    }
});