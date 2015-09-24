// Present a standard set of user controls with login/logout/profile links
// TODO: Convert this to use a common "toggler" grade once that has been sufficiently exercised and moved somewhere central.
/* global fluid, jQuery */
(function ($) {
    "use strict";
    var gpii = fluid.registerNamespace("gpii");
    fluid.registerNamespace("gpii.express.user.frontend.controls");

    gpii.express.user.frontend.controls.handleMenuKeys = function (that, event) {
        switch (event.keyCode) {
            case 27: // escape
                that.toggleMenu();
                break;
        }

        // TODO:  Eventually, we may want to take over control of "natural" arrow key handling using event.preventDefault()
    };

    gpii.express.user.frontend.controls.handleToggleKeys = function (that, event) {
        switch (event.keyCode) {
            case 27: // escape
                that.toggleMenu();
                break;
            case 13: // enter
                that.toggleMenu();
                break;
        }
    };

    gpii.express.user.frontend.controls.handleLogoutKeys = function (that, event) {
        switch (event.keyCode) {
            case 13: // enter
                that.submitForm(event);
                break;
        }
    };

    gpii.express.user.frontend.controls.toggleMenu = function (that) {
        var toggle = that.locate("toggle");
        var menu   = that.locate("menu");

        if ($(menu).is(":hidden")) {
            menu.show();
            menu.focus();
        }
        else {
            menu.hide();
            toggle.focus();
        }
    };

    fluid.defaults("gpii.express.user.frontend.controls", {
        gradeNames: ["gpii.templates.templateFormControl"],
        container:  ".controls-viewport",
        ajaxOptions: {
            type:     "POST",
            url:      "/api/user/signout"
        },
        templates: {
            initial: "controls-viewport",
            success: "common-success",
            error:   "common-error"
        },
        rules: {
            successResponseToModel: {
                "":        "notfound",
                user: {
                    literalValue: false
                }
            }
        },
        selectors: {
            initial:  "",
            success:  ".controls-message",
            error:    ".controls-message",
            controls: ".user-controls",
            menu:     ".user-menu",
            logout:   ".user-menu-logout",
            toggle:   ".user-controls-toggle"
        },
        model: {
            user: null
        },
        modelListeners: {
            user: {
                func:          "{that}.renderInitialMarkup",
                excludeSource: "init"
            }
        },
        invokers: {
            toggleMenu: {
                funcName: "gpii.express.user.frontend.controls.toggleMenu",
                args:     [ "{that}"]
            },
            handleMenuKeys: {
                funcName: "gpii.express.user.frontend.controls.handleMenuKeys",
                args:     [ "{that}", "{arguments}.0"]
            },
            handleToggleKeys: {
                funcName: "gpii.express.user.frontend.controls.handleToggleKeys",
                args:     [ "{that}", "{arguments}.0"]
            }
        },
        listeners: {
            onMarkupRendered: [
                {
                    "this":   "{that}.dom.logout",
                    "method": "click",
                    "args":   "{that}.submitForm"
                },
                {
                    "this":   "{that}.dom.logout",
                    "method": "keydown",
                    "args":   "{that}.handleLogoutKeys"
                },
                {
                    "this":   "{that}.dom.toggle",
                    "method": "click",
                    "args":   "{that}.toggleMenu"
                },
                {
                    "this":   "{that}.dom.toggle",
                    "method": "keydown",
                    "args":   "{that}.handleToggleKeys"
                },
                {
                    "this":   "{that}.dom.menu",
                    "method": "keydown",
                    "args":   "{that}.handleMenuKeys"
                }
            ]
        }
    });

    // A convenience gradeName to make any component aware of these controls.
    fluid.defaults("gpii.ul.hasUserControls", {
        gradeNames: ["fluid.modelComponent"],
        components: {
            controls: {
                type:      "gpii.express.user.frontend.controls",
                container: ".controls-viewport",
                options: {
                    model: {
                        user: "{hasUserControls}.model.user"
                    }
                }
            }
        }
    });
})(jQuery);