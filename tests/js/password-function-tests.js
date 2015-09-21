/*

  Tests for the password encoding static functions.

 */
"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");
var jqUnit = require("jqUnit");

require("../../src/js/server/password");

fluid.registerNamespace("gpii.express.user.password.tests");
gpii.express.user.password.tests.runTests = function (that) {
    jqUnit.module("Unit test password encoding functions...");

    jqUnit.test("Confirm that a range of known passwords are encoded as expected with full arguments...", function () {
        fluid.each(that.options.expected, function (options, password) {
            var actualEncodedString = gpii.express.user.password.encode(password, options.salt, options.iterations, 20);
            jqUnit.assertEquals("The password should have been encoded correctly...", options.derived_key, actualEncodedString);
        });
    });

    jqUnit.test("Confirm that a range of known passwords are encoded as expected with the defaults...", function () {
        fluid.each(that.options.expected, function (options, password) {
            var actualEncodedString = gpii.express.user.password.encode(password, options.salt);
            jqUnit.assertEquals("The password should have been encoded correctly...", options.derived_key, actualEncodedString);
        });
    });

    jqUnit.test("Confirm that a known password with other arguments is handled correctly...", function () {
        fluid.each(that.options.oddball, function (options, password) {
            var actualEncodedString = gpii.express.user.password.encode(password, options.salt, options.iterations, options.keyLength, options.digest);
            jqUnit.assertEquals("The password should have been encoded correctly...", options.derived_key, actualEncodedString);
        });
    });

};

fluid.defaults("gpii.express.user.password.tests", {
    gradeNames: ["fluid.component"],
    expected: {
        "admin": {
            "iterations":  10,
            "derived_key": "9ff4bc1c1846181d303971b08b65122a45174d04",
            "salt":        "2653c80aabd3889c3dfd6e198d3dca93"
        },
        "local": {
            "iterations":  10,
            "derived_key": "3cfbf59bba56c7f364973c11c5bd7f78e6879e23",
            "salt":        "2bec993281f3252dc8f56780428121c9"
        }
    },
    // A sample record that uses non-standard options, to confirm that parameters are not overridden.
    oddball: {
        "password": {
            "iterations":  23,
            "keyLength":   32,
            "digest":      "sha256",
            "derived_key": "f34467e93e3f8b73ffaa9781e815be966074c8f34911efc7b7406cb7c8e01c1e",
            "salt":        "secret"
        }

    },
    listeners: {
        "onCreate.runTests": {
            funcName: "gpii.express.user.password.tests.runTests",
            args:     ["{that}"]
        }
    }
});

gpii.express.user.password.tests();