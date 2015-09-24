// A front-end component to provide meaningful feedback when users verify their accounts using /api/user/verify/:code
/* global fluid, jQuery, window */
(function () {
    "use strict";
    var gpii = fluid.registerNamespace("gpii");
    fluid.registerNamespace("gpii.express.couchuser.frontend.verify");

    gpii.express.couchuser.frontend.verify.extractQueryParams = function () {
        var rawQuery = fluid.url.parseUri(window.location.href);
        return rawQuery.queryKey;
    };

    gpii.express.couchuser.frontend.verify.assembleUrl = function (baseUrl, code) {
        return baseUrl + code;
    };

    fluid.defaults("gpii.express.couchuser.frontend.verify", {
        gradeNames: ["gpii.express.couchuser.frontend.canHandleStrings", "gpii.templates.templateFormControl"],
        container:  ".verify-viewport",
        model: {
            code:     "{that}.model.req.query.code",
            req: {
                query: {
                    expander: {
                        funcName: "gpii.express.couchuser.frontend.verify.extractQueryParams"
                    }
                }
            }
        },
        templates: {
            initial: "verify-viewport",
            success: "common-success",
            error:   "common-error"
        },
        ajaxOptions: {
            url:    {
                expander: {
                    funcName: "gpii.express.couchuser.frontend.verify.assembleUrl",
                    args:     ["/api/user/verify/", "{that}.model.code"]
                }
            },
            method: "GET"
        },
        rules: {
            modelToRequestPayload: {
                "": "notfound"
            }
        },
        hideOnSuccess: true,
        hideOnError:   true,
        selectors: {
            initial: "",
            form:    ".verify-form",
            success: ".verify-success",
            error:   ".verify-error"
        },
        listeners: {
            "onMarkupRendered.autoSubmit" : {
                func: "{that}.submitForm",
                args: [ false]
            }
        }
    });

    fluid.defaults("gpii.express.couchuser.frontend.verify.hasUserControls", {
        gradeNames: ["gpii.express.couchuser.frontend.verify", "gpii.ul.hasUserControls"]
    });
})(jQuery);