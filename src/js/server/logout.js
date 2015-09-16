"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

// TODO:  Delete our session cookie

// TODO: Remove our session from the shared cache

logout: {
    type: "gpii.express.user.api.logout"
},
