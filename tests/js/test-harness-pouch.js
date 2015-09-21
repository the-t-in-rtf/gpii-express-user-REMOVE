// Just the PouchDB bits of the test harness (which we use independently in testing our datasource grades)
var fluid = fluid || require("infusion");

require("gpii-pouch");

var path = require("path");
var userDataFile = path.resolve(__dirname, "../data/users.json");

fluid.defaults("gpii.express.user.tests.pouch", {
    gradeNames: ["gpii.express"],
    pouchPort: "3579",
    config: {
        express: {
            port: "{that}.options.pouchPort"
        }
    },
    events: {
        onPouchStarted: null,
        onAllStarted: {
            events: {
                onStarted:      "onStarted",
                onPouchStarted: "onPouchStarted"
            }
        }

    },
    components: {
        pouch: {
            type: "gpii.pouch",
            options: {
                path: "/",
                databases: {
                    "users":   { "data": userDataFile }
                },
                listeners: {
                    "onStarted.notifyParent": {
                        func: "{gpii.express.user.tests.pouch}.events.onPouchStarted.fire"
                    }
                }
            }
        }
    }
});
