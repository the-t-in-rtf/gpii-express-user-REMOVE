// provide a front-end to /api/user/signup
/* global fluid, jQuery */
(function () {
    "use strict";

    // TODO:  Once we have a client-side validation and feedback loop, this form needs it.

    fluid.defaults("gpii.express.user.frontend.signup", {
        gradeNames: ["gpii.express.user.frontend.canHandleStrings", "gpii.express.user.frontend.passwordCheckingForm"],
        ajaxOptions: {
            type:   "POST",
            url:    "/api/user/signup",
            json:   true
        },
        rules: {
            modelToRequestPayload: {
                name:     "username",
                password: "password",
                email:    "email",
                // Needed to ensure that our account can be created.
                roles: {
                    literalValue: ["user"]
                }
            },
            successResponseToModel: {
                successMessage: {
                    literalValue: "You have successfully created an account.  Check your email for further instructions."
                }
            },
            // TODO: replace this with a more general approach once https://issues.gpii.net/browse/GPII-1324 is resolved
            errorResponseToModel: {
                "":           "notfound",
                errorMessage: "responseJSON.message",
                fieldErrors:  "responseJSON.fieldErrors"
            }
        },
        templates: {
            initial: "signup-viewport",
            success: "common-success",
            error:   "common-schema-error"
        },
        selectors: {
            initial:  ".signup-viewport",
            success:  ".signup-success",
            error:    ".signup-error",
            submit:   ".signup-submit",
            username: "input[name='username']",
            email:    "input[name='email']",
            password: "input[name='password']",
            confirm:  "input[name='confirm']"
        },
        bindings: {
            "username": "username",
            "email":    "email"
        },
        components: {
            error: {
                options: {
                    model: {
                        fieldErrors: "{templateFormControl}.model.fieldErrors"
                    }
                }
            }
        }
    });

    fluid.defaults("gpii.express.user.frontend.signup.hasUserControls", {
        gradeNames: ["gpii.express.user.frontend.signup", "gpii.ul.hasUserControls"]
    });
})(jQuery);