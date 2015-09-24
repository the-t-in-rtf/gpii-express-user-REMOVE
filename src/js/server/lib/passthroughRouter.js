// Provides the minimal wiring for a `gpii.express.router` that does nothing itself, but which presumably has child
// router components that do things.
//
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");
require("gpii-express");

fluid.registerNamespace("gpii.express.router.passthrough");

gpii.express.router.passthrough.route = function (that, request, response, next) {
    that.options.router(request, response, next);
};

fluid.defaults("gpii.express.router.passthrough", {
    gradeNames: ["gpii.express.router"],
    method:     "use",
    invokers: {
        route: {
            funcName: "gpii.express.router.passthrough.route",
            args:     ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"]
        }
    }
});