// Convenience grade to deal with APIs (like express-couchUser) that return JSON as a string.  The only expected use
// of this is in combination with an `ajaxCapable` grade, which has the rest of the wiring that uses the options and
// invokers outlined here.  Instantiating this grade by itself will not work.
//
/* global fluid */
(function () {
    "use strict";
    var gpii = fluid.registerNamespace("gpii");
    fluid.registerNamespace("gpii.express.user.frontend.canHandleStrings");

    gpii.express.user.frontend.canHandleStrings.stringToJSON = function (that, data) {
        if (typeof data === "string") {
            try {
                var jsonData = JSON.parse(data);
                return jsonData;
            }
            catch (e) {
                // Do nothing and let the normal return take place.
            }
        }

        return data;
    };

    gpii.express.user.frontend.canHandleStrings.canHandleErrorString = function (that, data) {
        var safeData = data.responseJSON ? data : { responseJSON: that.stringToJSON(data.responseText)};
        that.handleError(safeData);
    };

    gpii.express.user.frontend.canHandleStrings.canHandleSuccessString = function (that, data) {
        var safeData = data.responseJSON ? data : { responseJSON: that.stringToJSON(data.responseText)};
        // The data is expected to be the third argument.
        that.handleSuccess(null, null, safeData);
    };

    fluid.defaults("gpii.express.user.frontend.canHandleStrings", {
        ajaxOptions: {
            success: "{that}.canHandleSuccessString",
            error:   "{that}.canHandleErrorString"
        },
        invokers: {
            stringToJSON: {
                funcName: "gpii.express.user.frontend.canHandleStrings.stringToJSON",
                args: ["{that}", "{arguments}.0"]
            },
            canHandleSuccessString: {
                funcName: "gpii.express.user.frontend.canHandleStrings.canHandleSuccessString",
                args:     ["{that}", "{arguments}.2"]
            },
            canHandleErrorString: {
                funcName: "gpii.express.user.frontend.canHandleStrings.canHandleErrorString",
                args:     ["{that}", "{arguments}.0"]
            }

        }
    });
})();