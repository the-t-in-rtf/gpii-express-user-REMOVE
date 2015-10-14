// A convenience script to start up a copy of the test harness for manual QA.
var fluid = fluid || require("infusion");
fluid.setLogging(true);

var gpii = fluid.registerNamespace("gpii");

require("./test-harness");

gpii.express.user.tests.harness({
    pouchPort:  "9599",
    apiPort:    "3959",
    mailPort:   "9225"
});