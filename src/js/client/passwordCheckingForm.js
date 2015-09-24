// A common grade for forms where a password is entered or changed.  Prevents submission unless the passwords match.
//
/* global fluid, jQuery */
(function () {
    "use strict";
    var gpii = fluid.registerNamespace("gpii");
    fluid.registerNamespace("gpii.express.user.frontend.passwordCheckingForm");

    gpii.express.user.frontend.passwordCheckingForm.checkPasswords = function (that) {
        that.passwordsMatch = (that.model.password === that.model.confirm);

        if (that.passwordsMatch) {
            that.applier.change("errorMessage", null);
        }
        else {
            that.applier.change("errorMessage", that.options.messages.passwordsDontMatch);
        }
    };

    // Override the default submission to add additional checks.  Only continue if the checks pass.
    gpii.express.user.frontend.passwordCheckingForm.checkAndSubmit = function (that, event) {
        if (that.passwordsMatch) {
            that.continueSubmission(event);
        }
        else {
            event.preventDefault();
        }
    };

    fluid.defaults("gpii.express.user.frontend.passwordCheckingForm", {
        gradeNames: ["gpii.templates.templateFormControl"],
        model: {
            password: null,
            confirm:  null
        },
        members: {
            passwordsMatch: false
        },
        messages: {
            passwordsDontMatch: {
                message: "The passwords you have entered don't match."
            }
        },
        modelListeners: {
            password: {
                funcName: "gpii.express.user.frontend.passwordCheckingForm.checkPasswords",
                args:     ["{that}"]
            },
            confirm: {
                funcName: "gpii.express.user.frontend.passwordCheckingForm.checkPasswords",
                args:     ["{that}"]
            }
        },
        selectors: {
            confirm:  "input[name='confirm']",
            password: "input[name='password']"
        },
        bindings: {
            "confirm":  "confirm",
            "password": "password"
        },
        invokers: {
            submitForm: {
                funcName: "gpii.express.user.frontend.passwordCheckingForm.checkAndSubmit",
                args:     ["{that}", "{arguments}.0"]
            },
            continueSubmission: {
                funcName: "gpii.templates.templateFormControl.submitForm",
                args:     ["{that}", "{arguments}.0"]
            }
        }
    });
})(jQuery);