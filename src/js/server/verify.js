"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

verify: {
    type: "gpii.express.user.api.verify"
}

codeKey:       "verification_code",  // Must match the value in gpii.express.user.api.verify
