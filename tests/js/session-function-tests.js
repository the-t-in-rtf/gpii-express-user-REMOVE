/*

  Tests for the session persisting middleware and its static functions.

 */
"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");
var jqUnit = require("jqUnit");

require("../../src/js/server/session");

jqUnit.module("Unit test session persisting middleware functions...");

jqUnit.test("Confirm that the time offset function works as expected", function () {
    var now = new Date();
    var offset = 98765;
    var later = gpii.express.user.middleware.session.datePlusOffset(now, offset);

    jqUnit.assertEquals("The offset should have been applied correctly...", offset, (later.getTime() - now.getTime()) / 1000);
});
