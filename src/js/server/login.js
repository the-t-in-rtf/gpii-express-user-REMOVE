"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.express.user.api.login.handler");

var fs   = require("fs");
var path = require("path");

require("gpii-json-schema");

gpii.express.user.api.login.handler.handleRequest = function (that) {
    that.reader.get(that.request.body);
};

var loginSchemaContent = fs.readFileSync(path.resolve(__dirname, "../../schemas/user-login.json"), { encoding: "utf8"});

gpii.express.user.api.login.handler.verifyPassword = function (that, response) {
    var encodedPassword = gpii.express.user.password.encode(that.request.body.password, response.salt, response.iterations, response.keyLength, response.digest);
    if (encodedPassword === response.derived_key) {
        that.sendResponse(200, { ok: true, message: "You have successfully logged in."});
    }
    else {
        that.sendResponse(401, { ok: false, message: "Invalid username or password."});
    }
};

fluid.defaults("gpii.express.user.api.login.handler", {
    gradeNames: ["gpii.schema.handler"],
    schemaKey:  "message-core",
    schemaUrl:  "/schemas/message-core",
    invoker: {
        handleRequest: {
            funcName: "gpii.express.user.api.login.handler.retrieveExistingUser",
            args:     ["{that}"]
        }
    },
    components: {
        reader: {
            type: "gpii.express.user.datasource",
            listeners: {
                "onResponse.verifyPassword": {
                    funcName: "gpii.express.user.api.login.handler.verifyPassword",
                    args:     ["{gpii.express.user.api.login.handler}", "{arguments}.0"]
                }
            }
        }
    }
});

fluid.defaults("gpii.express.user.api.login", {
    gradeNames: ["gpii.express.router"],
    components: {
        schemaMiddleware: {
            type: "gpii.schema.middleware",
            options: {
                schemaContent: loginSchemaContent
            }
        },
        mainRouter: {
            gradeNames: ["gpii.express.requestAware.router"],
            handlerGrades: ["gpii.express.user.api.handler"]
        }
    }
});