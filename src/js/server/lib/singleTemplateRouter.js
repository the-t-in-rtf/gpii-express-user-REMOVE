/*

  A `gpii.express.router` component that uses the standard renderer to display the template found at
  `that.options.templateKey`.  Any data in `options.defaultContext` is available when rendering the template.

  This component will only work if you have set up the `gpii.express.hb` midddleware in your `gpii.express` instance.

 */
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.express.user.api.singleTemplateRouter");
gpii.express.user.api.singleTemplateRouter.renderForm = function (that, request, response) {
    response.status(200).render(that.options.templateKey, that.options.defaultContext);
};

fluid.defaults("gpii.express.user.api.singleTemplateRouter", {
    gradeNames:      ["gpii.express.router"],
    path:            "/",
    method:          "get",
    defaultContext:  {},
    invokers: {
        route: {
            funcName: "gpii.express.user.api.singleTemplateRouter.renderForm",
            args:     ["{that}", "{arguments}.0", "{arguments}.1"] // request, response
        }
    }
});