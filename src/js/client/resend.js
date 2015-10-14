// provide a front-end to /api/user/verify/resend
/* global fluid, jQuery */
(function () {
    "use strict";

    fluid.registerNamespace("gpii.express.user.frontend.resend");

    fluid.defaults("gpii.express.user.frontend.resend", {
        gradeNames: ["gpii.express.user.frontend.canHandleStrings", "gpii.templates.templateFormControl"],
        templates: {
            initial: "resend-viewport",
            error:   "common-error",
            success: "common-success"
        },
        model: {
            user: null
        },
        components: {
            success: {
                options: {
                    model: {
                        message: "{resend}.model.successMessage"
                    },
                    modelListeners: {
                        // TODO:  Review with Antranig to confirm why the rules in `templateMessage` aren't enough to handle this.
                        message: {
                            func: "{that}.renderInitialMarkup"
                        }
                    }
                }
            },
            error: {
                options: {
                    model: {
                        message: "{resend}.model.errorMessage"
                    }
                }
            }
        },
        ajaxOptions: {
            url:      "/api/user/verify/resend",
            method:   "POST",
            json:     true,
            dataType: "json"
        },
        rules: {
            modelToRequestPayload: {
                "":    "notfound", // Required to clear out the default rules from `templateFormControl`
                email: "email"
            },
            successResponseToModel: {
                "": "notfound",
                successMessage: "responseJSON.message",
                errorMessage: {
                    literalValue: false
                }
            },
            errorResponseToModel: {
                "": "notfound",
                errorMessage: "responseJSON.message",
                successMessage: {
                    literalValue: false
                }
            }
        },
        bindings: {
            email: "email"
        },
        selectors: {
            initial:  ".resend-viewport",
            form:     ".resend-form",
            success:  ".resend-success",
            error:    ".resend-error",
            email:    "input[name='email']"
        }
    });
})(jQuery);