/*

  Mount all the feature-specific endpoints under a single umbrella class.  Returns the API documentation by default.

 */
"use strict";
var fluid = fluid || require("infusion");

require("./current.js");
require("./docs.js");
require("./forgot.js");
require("./login.js");
require("./logout.js");
require("./reset.js");
require("./signup.js");
require("./verify.js");

// TODO:  Add common middleware (req.session, req.cookie, req.json, etc.)


fluid.defaults("gpii.express.user.api", {
    gradeNames: ["gpii.api.docs.router"],
    couch: {
        url:      "http://localhost:5984/_users",
        username: "admin",
        password: "admin"
    },
    distributeOptions: {
        "source": "{that}.options.couch",
        "target": "{that > gpii.express.router}.options.couch"
    },
    components: {
        current: {
            type: "gpii.express.user.api.current"
        },
        forgot: {
            type: "gpii.express.user.api.forgot"
        },
        login: {
            type: "gpii.express.user.api.login"
        },
        logout: {
            type: "gpii.express.user.api.logout"
        },
        reset: {
            type: "gpii.express.user.api.reset"
        },
        signup: {
            type: "gpii.express.user.api.signup"
        },
        verify: {
            type: "gpii.express.user.api.verify"
        }
    }
});