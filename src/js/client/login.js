// provide a front-end to /api/user/login
/* global fluid, jQuery */
(function () {
    "use strict";
    var gpii = fluid.registerNamespace("gpii");

    fluid.registerNamespace("gpii.express.couchuser.frontend.login");

        // If the user controls are used to log out, we have to manually clear the success message.
    // If we delegate this to the controls component, it might clobber success messages for things other than the login.
    gpii.express.couchuser.frontend.login.checkAndClearSuccess = function (that) {
        if (!that.model.user) {
            that.applier.change("successMessage", null);
        }
    };

    fluid.defaults("gpii.express.couchuser.frontend.login", {
        gradeNames: ["gpii.express.couchuser.frontend.canHandleStrings", "gpii.templates.templateFormControl"],
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
                    template: "login-success",
                    model: {
                        user: "{login}.model.user"
                    },
                    modelListeners: {
                        // TODO:  Review with Antranig to confirm why the rules in `templateMessage` aren't enough to handle this.
                        user: {
                            func: "{that}.renderInitialMarkup"
                        }
                    }
                }
            }
        },
        ajaxOptions: {
            url:      "/api/user/signin",
            method:   "POST",
            json:     true,
            dataType: "json"
        },
        modelListeners: {
            "user.refresh": [
                {
                    func:          "{that}.renderInitialMarkup",
                    excludeSource: "init"
                },
                {
                    funcName:      "gpii.express.couchuser.frontend.login.checkAndClearSuccess",
                    args:          ["{that}"],
                    excludeSource: "init"
                }
            ]
        },
        rules: {
            modelToRequestPayload: {
                "":       "notfound", // Required to clear out the default rules from `templateFormControl`
                name:     "username",
                password: "password"
            },
            successResponseToModel: {
                user: "responseJSON.user",
                password: {
                    literalValue: ""
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