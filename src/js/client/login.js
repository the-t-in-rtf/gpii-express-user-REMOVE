// provide a front-end to /api/user/login
/* global fluid, jQuery */
(function () {
    "use strict";
    var gpii = fluid.registerNamespace("gpii");

    fluid.registerNamespace("gpii.express.user.frontend.login");

        // If the user controls are used to log out, we have to manually clear the success message.
    // If we delegate this to the controls component, it might clobber success messages for things other than the login.
    gpii.express.user.frontend.login.checkAndClearSuccess = function (that) {
        if (!that.model.user || !that.model.user.username) {
            that.applier.change("successMessage", null);
            that.renderInitialMarkup();
        }
    };

    fluid.defaults("gpii.express.user.frontend.login", {
        gradeNames: ["gpii.express.user.frontend.canHandleStrings", "gpii.templates.templateFormControl"],
        templates: {
            initial: "login-viewport",
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
                        message: "{login}.model.successMessage"
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
                        message: "{login}.model.errorMessage"
                    }
                }
            }
        },
        ajaxOptions: {
            url:      "/api/user/login",
            method:   "POST",
            json:     true,
            dataType: "json"
        },
        modelListeners: {
            "user.refresh": [
                {
                    funcName:      "gpii.express.user.frontend.login.checkAndClearSuccess",
                    args:          ["{that}"],
                    excludeSource: "init"
                }
            ]
        },
        rules: {
            modelToRequestPayload: {
                "":       "notfound", // Required to clear out the default rules from `templateFormControl`
                username: "username",
                password: "password"
            },
            successResponseToModel: {
                "": "notfound",
                user: {
                    username: "responseJSON.user.name",
                    email:    "responseJSON.user.email"
                },
                password: {
                    literalValue: ""
                },
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
            username: "username",
            password: "password"
        },
        selectors: {
            initial:  ".login-viewport",
            form:     ".login-form",
            success:  ".login-success",
            error:    ".login-error",
            username: "input[name='username']",
            password: "input[name='password']"
        }
    });
})(jQuery);