/*

  Session middleware that automatically renews the session cookie on each request.  Should be loaded after
  the standard `gpii.express.middleware.cookie` and `gpii.express.middleware.session` middleware.

 */
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

require("gpii-express");

fluid.registerNamespace("gpii.express.user.middleware.session");
gpii.express.user.middleware.session.renewSessionIfFound = function (that, request, response, next) {
    if (request.cookies) {
        var existingCookie = request.cookies[that.options.cookieName];
        if (existingCookie) {
            var options = {};
            if (that.options.cookieDuration) {
                options.expires = gpii.express.user.middleware.session.nowPlusOffset(that.options.cookieDuration);
            }
            response.cookie(that.options.cookieName, existingCookie, options);
        }
    }

    next();
};

gpii.express.user.middleware.session.nowPlusOffset = function (offsetInSeconds) {
    return gpii.express.user.middleware.session.datePlusOffset(new Date(), offsetInSeconds);
};

gpii.express.user.middleware.session.datePlusOffset = function (date, offsetInSeconds) {
    return new Date(date.getTime() + (offsetInSeconds * 1000));
};


fluid.defaults("gpii.express.user.middleware.session", {
    gradeNames: ["gpii.express.middleware"],
    cookieName: "_gpii_session",
    cookieDuration: 1800, // The expiration time of the cookie, in seconds.  Defaults to a half hour.
    invokers: {
        middleware: {
            funcName: "gpii.express.user.middleware.session.renewSessionIfFound",
            args:    ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"]
        }
    }
});