// provide a front-end to /api/user/signup
/* global fluid, jQuery */
(function () {
    "use strict";

    fluid.defaults("gpii.express.couchuser.frontend.signup", {
        gradeNames: ["gpii.express.couchuser.frontend.canHandleStrings", "gpii.express.couchuser.frontend.passwordCheckingForm"],
        container:  ".signup-viewport",
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
            }
        },
        templates: {
            initial: "signup-viewport",
            success: "common-success",
            error:   "common-error"
        },
        selectors: {
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
        }
    });

    fluid.defaults("gpii.express.couchuser.frontend.signup.hasUserControls", {
        gradeNames: ["gpii.express.couchuser.frontend.signup", "gpii.ul.hasUserControls"]
    });
})(jQuery);