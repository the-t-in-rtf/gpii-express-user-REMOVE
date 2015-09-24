// Provide a front-end to allow users to request that their password be reset...
/* global fluid, jQuery */
(function () {
    "use strict";
    fluid.defaults("gpii.express.user.frontend.forgot", {
        gradeNames: ["gpii.express.user.frontend.canHandleStrings", "gpii.templates.templateFormControl", "fluid.viewComponent"],
        container:  ".forgot-viewport",
        ajaxOptions: {
            type:        "POST",
            url:         "/api/user/forgot"
        },
        model: {
            email: ""
        },
        selectors: {
            initial: "",
            error:   ".forgot-error",
            success: ".forgot-success",
            submit:  ".forgot-button",
            email:    "input[name='email']"
        },
        bindings: {
            "email": "email"
        },
        templates: {
            "initial": "forgot-viewport",
            "error":   "common-error",
            "success": "success"
        }
    });

    fluid.defaults("gpii.express.user.frontend.forgot.hasUserControls", {
        gradeNames: ["gpii.ul.hasUserControls", "gpii.express.user.frontend.forgot"]
    });
})(jQuery);