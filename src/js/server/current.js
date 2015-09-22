/*

  An API endpoint that returns the current user's information if they are logged in, or an error message if they are not.

 */
"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.express.user.api.current.handler");

gpii.express.user.api.current.handler.verifyUserSession = function (that) {
    if (that.request.session && that.request.session[that.options.sessionKey]) {
        that.sendResponse(200, { ok: true, user: that.request.session[that.options.sessionKey]});
    }
    else {
        that.sendResponse(401, { ok: false, message: "You are not currently logged in."});
    }
};

fluid.defaults("gpii.express.user.api.current.handler", {
    gradeNames: ["gpii.express.handler"],
    sessionKey: "_gpii_user",
    invokers: {
        handleRequest: {
            funcName: "gpii.express.user.api.current.handler.verifyUserSession",
            args:     ["{that}"]
        }
    }
});

fluid.defaults("gpii.express.user.api.current", {
    gradeNames:    ["gpii.express.requestAware.router"],
    handlerGrades: ["gpii.express.user.api.current.handler"],
    path:          "/current"
});
