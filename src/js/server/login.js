"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

// TODO:  hash the password before comparing it to the stored value.

login: {
    type: "gpii.express.user.api.login"
},
