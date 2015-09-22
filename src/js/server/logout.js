"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");


fluid.registerNamespace("gpii.express.user.api.logout.handler");

gpii.express.user.api.logout.handler.destroyUserSession = function (that) {
    if (that.request.session && that.request.session[that.options.sessionKey]) {
        delete that.request.session[that.options.sessionKey];
    }

    that.sendResponse(200, { ok: true, message: "You are now logged out."});
};

fluid.defaults("gpii.express.user.api.logout.handler", {
    gradeNames: ["gpii.express.handler"],
    sessionKey:  "_gpii_user",
    invokers: {
        handleRequest: {
            funcName: "gpii.express.user.api.logout.handler.destroyUserSession",
            args:     ["{that}"]
        }
    }
});

fluid.defaults("gpii.express.user.api.logout", {
    gradeNames:    ["gpii.express.requestAware.router"],
    handlerGrades: ["gpii.express.user.api.logout.handler"],
    path:          "/logout",
    method:        "get"
});

