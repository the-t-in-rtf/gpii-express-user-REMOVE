// Provide a front-end to /api/user/reset
// The second part of the password reset process, can only be used with a code generated using the "forgot password" form.
/* global fluid, jQuery, window */
(function () {
    "use strict";
    var gpii = fluid.registerNamespace("gpii");
    fluid.registerNamespace("gpii.express.couchuser.frontend.reset");

    gpii.express.couchuser.frontend.reset.extractQueryParams = function () {
        var rawQuery = fluid.url.parseUri(window.location.href);
        return rawQuery.queryKey;
    };

    fluid.defaults("gpii.express.couchuser.frontend.reset", {
        gradeNames: ["gpii.express.couchuser.frontend.canHandleStrings", "gpii.express.couchuser.frontend.passwordCheckingForm"],
        container:  ".reset-viewport",
        ajaxOptions: {
            type:    "POST",
            url:     "/api/user/reset"
        },
        rules: {
            successResponseToModel: {
                successMessage: {
                    literalValue: "Your password has been reset."
                }
            }
        },
        templates: {
            success: "common-success",
            error:   "common-error",
            initial: "reset-viewport"
        },
        model: {
            code:     "{that}.model.req.query.code",
            req: {
                query: {
                    expander: {
                        funcName: "gpii.express.couchuser.frontend.reset.extractQueryParams"
                    }
                }
            }
        },
        selectors: {
            initial:              "",
            success:              ".reset-success",
            error:                ".reset-error",
            submit:               ".reset-button",
            code:                 "input[name='code']"
        },
        bindings: {
            "code":     "code"
        }
    });
})(jQuery);