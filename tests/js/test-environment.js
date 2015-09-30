// The common test harness wired up as a `fluid.test.testEnvironment` instance.  You are expected to extend this and
// supply a specific test case holder component.
var fluid = fluid || require("infusion");

require("./test-harness");

fluid.defaults("gpii.express.user.tests.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    apiPort:    "3959",
    apiUrl: {
        expander: {
            funcName: "fluid.stringTemplate",
            args:     ["http://localhost:%port/api/user/", { port: "{that}.options.apiPort"}]
        }
    },
    pouchPort:  "9599",
    mailPort:   "2525",
    events: {
        onStarted:       null,
        constructServer: null
    },
    components: {
        harness: {
            type:          "gpii.express.user.tests.harness",
            createOnEvent: "constructServer",
            options: {
                apiPort:   "{testEnvironment}.options.apiPort",
                mailPort:  "{testEnvironment}.options.mailPort",
                pouchPort: "{testEnvironment}.options.pouchPort",
                listeners: {
                    "onStarted.notifyParent": {
                        func: "{testEnvironment}.events.onStarted.fire"
                    }
                }
            }
        }
    }
});
