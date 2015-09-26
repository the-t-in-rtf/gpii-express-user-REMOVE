"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.express.user.api.login.post.handler");

//var path = require("path");
//var fs   = require("fs");

require("gpii-json-schema");
require("./lib/datasource");
require("./lib/password");
require("./lib/passthroughRouter");

//var loginSchemaContents = require("../../schemas/user-login.json");
//
//// TODO: Improve the schema middleware to make it easier to bring in schemas that depend on other schemas.
//fluid.registerNamespace("gpii.express.user.api.login");
//gpii.express.user.api.login.getSchemaFiles = function (dir) {
//    var schemaFiles = {};
//    fluid.each(fs.readdirSync(dir), function (filename) {
//        var key = filename.replace(/\.json/, "");
//        if (key !== filename) {
//            var schemaFilePath = path.resolve(dir, filename);
//            schemaFiles[key] = schemaFilePath;
//        }
//    });
//
//    return schemaFiles;
//};
//
//var schemaFiles = gpii.express.user.api.login.getSchemaFiles(path.resolve(__dirname, "../../schemas"));

// TODO:  Make this content aware and serve up the login form by default.
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
    schemaKey:  "message-core",
    schemaUrl:  "/schemas/message-core",
    sessionKey: "_gpii_user",
    url:    {
        expander: {
            funcName: "fluid.stringTemplate",
            args:     [ "http://localhost:%port/%userDbName/_design/lookup/_view/byUsernameOrEmail?key=\"%username\"", "{that}.options.couch"]
        }
    },
    method: "post",  // TODO:  Change to "use" when we set up content aware handling.
    rules: {
        user: {
            "username": "username",
            "email":    "email"
        }
    },
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
                        "": "rows.0.value"
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
    gradeNames: ["gpii.express.requestAware.router"],
    path:       "/",
    method:     "post",
    handlerGrades: ["gpii.express.user.api.login.post.handler"],
    // TODO:  set up and test Schema middleware blocking
    components: {
        //schemaMiddleware: {
        //    type: "gpii.schema.middleware",
        //    options: {
        //        schemaFiles:   schemaFiles,
        //        schemaContent: loginSchemaContents,
        //        distributeOptions: {
        //            source: "{that}.options.schemaFiles",
        //            target: "{that > validator}.options.schemaFiles"
        //        }
        //    }
        //},
    }
});

fluid.registerNamespace("gpii.express.user.api.login.get");
gpii.express.user.api.forgot.get.renderForm = function (that, request, response) {
    response.status(200).render(that.options.templateKey, that.options.defaultContext);
};

fluid.defaults("gpii.express.user.api.login.get", {
    gradeNames:      ["gpii.express.router"],
    path:            "/",
    method:          "get",
    defaultContext:  {},
    templateKey:     "pages/login",
    invokers: {
        route: {
            funcName: "gpii.express.user.api.forgot.get.renderForm",
            args:     ["{that}", "{arguments}.0", "{arguments}.1"] // request, response
        }
    }
});

fluid.defaults("gpii.express.user.api.login", {
    gradeNames: ["gpii.express.router.passthrough"],
    path:       "/login",
    distributeOptions: [
        {
            source: "{that}.options.couch",
            target: "{that gpii.express.router}.options.couch"
        },
        {
            source: "{that}.options.couch",
            target: "{that gpii.express.handler}.options.couch"
        }
    ],
    components: {
        getRouter: {
            type: "gpii.express.user.api.login.get"
        },
        postRouter: {
            type: "gpii.express.user.api.login.post"
        }
    }
});