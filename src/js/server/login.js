"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.express.user.api.login.post.handler");

var path      = require("path");
var schemaDir = path.resolve(__dirname, "../../schemas");

require("gpii-json-schema");
require("./lib/datasource");
require("./lib/password");
require("./lib/passthroughRouter");
require("./lib/singleTemplateRouter");

fluid.registerNamespace("gpii.express.user.api.login");

gpii.express.user.api.login.post.handler.verifyPassword = function (that, response) {
    if (that.request.body && that.request.body.username && that.request.body.password && response.salt && response.derived_key) {
        var encodedPassword = gpii.express.user.password.encode(that.request.body.password, response.salt, response.iterations, response.keyLength, response.digest);
        if (encodedPassword === response.derived_key) {
            // Transform the raw response to ensure that nothing sensitive is exposed to the user
            var user = fluid.model.transformWithRules(response, that.options.rules.user);
            that.request.session[that.options.sessionKey] = user;
            that.sendResponse(200, { ok: true, message: "You have successfully logged in.", user: user});
            return;
        }
    }

    that.sendResponse(401, { ok: false, message: "Invalid username or password."});
};

fluid.defaults("gpii.express.user.api.login.post.handler", {
    gradeNames: ["gpii.schema.handler"],
    schemaKey:  "message-core.json",
    schemaUrl:  "/schemas/message-core",
    sessionKey: "_gpii_user",
    url:    {
        expander: {
            funcName: "fluid.stringTemplate",
            args:     [ "%userDbUrl/_design/lookup/_view/byUsernameOrEmail?key=\"%username\"", "{that}.options.couch"]
        }
    },
    method: "post",
    invokers: {
        handleRequest: {
            func: "{reader}.get",
            args: ["{that}.request.body"]
        }
    },
    components: {
        reader: {
            type: "gpii.express.user.couchdb.read",
            options: {
                url: "{gpii.express.user.api.login.post.handler}.options.url",
                rules: {
                    read: {
                        "":         "rows.0.value",
                        "username": "rows.0.value.name"
                    }
                },
                termMap: { username: "%username"},
                listeners: {
                    "onRead.verifyPassword": {
                        nameSpace: "gpii.express.user.api.login",
                        priority:  "last",
                        funcName:  "gpii.express.user.api.login.post.handler.verifyPassword",
                        args:      ["{gpii.express.user.api.login.post.handler}", "{arguments}.0"]
                    },
                    "onError.sendErrorResponse": {
                        func: "{gpii.express.user.api.login.post.handler}.sendResponse",
                        args: [500, { ok: false, message: "Error checking username and password."}]
                    }
                }
            }
        }
    }
});

fluid.defaults("gpii.express.user.api.login.post", {
    gradeNames: ["gpii.express.router.passthrough"],
    path:       "/",
    method:     "use",
    components: {
        schemaMiddleware: {
            type: "gpii.schema.middleware",
            options: {
                schemaDir: schemaDir,
                schemaKey: "user-login.json"
            }
        },
        requestAwareRouter: {
            type: "gpii.express.requestAware.router",
            options: {
                path:          "/",
                method:        "post",
                handlerGrades: ["gpii.express.user.api.login.post.handler"]
            }
        }
    }
});

fluid.defaults("gpii.express.user.api.login", {
    gradeNames: ["gpii.express.router.passthrough"],
    path:       "/login",
    rules: {
        user: {
            "username": "name", // Default configuration is designed for CouchDB and express-couchUser field naming conventions.
            "email":    "email",
            "roles":    "roles"
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
                templateKey: "pages/login"
            }
        },
        postRouter: {
            type: "gpii.express.user.api.login.post"
        }
    }
});