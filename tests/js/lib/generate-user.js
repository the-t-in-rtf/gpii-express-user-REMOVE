// Function to generate a user when testing the signup functionality on both the server and client side.
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.express.user.api.signup.test");

gpii.express.user.api.signup.test.generateUser = function () {
    var timestamp = (new Date()).getTime();
    return {
        username: "user-" + timestamp,
        password: gpii.express.user.api.signup.test.generatePassword(timestamp),
        confirm:  gpii.express.user.api.signup.test.generatePassword(timestamp),
        email:    "email-" + timestamp + "@localhost"
    };
};

// Generate a simple password that meets our rules.  Used in testing both the signup and reset functions.
gpii.express.user.api.signup.test.generatePassword = function (timestamp) {
    if (!timestamp) {
        timestamp = (new Date()).getTime();
    }

    return "Password-" + timestamp;
};

