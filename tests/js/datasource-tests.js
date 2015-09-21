/*

  Tests for the CouchDB data source used in this package.

 */
"use strict";
var fluid  = fluid || require("infusion");
//fluid.setLogging(true);

var gpii   = fluid.registerNamespace("gpii");
var jqUnit = require("jqUnit");

require("gpii-express");
require("./test-harness-pouch");
require("./kettle-includes");

require("../../src/js/server/lib/datasource");

require("../../node_modules/gpii-express/tests/js/lib/test-helpers");

fluid.registerNamespace("gpii.express.user.datasource.tests");
gpii.express.user.datasource.tests.checkResult = function (that, response, expected) {
    jqUnit.assertLeftHand("The response should equal or be a superset of the expected response...", expected, response);
};

gpii.express.user.datasource.tests.handleError = function (that, error) {
    jqUnit.fail("There was an unhandled error:", JSON.stringify(error, null, 2));
};

fluid.defaults("gpii.express.user.datasource.tests.read", {
    gradeNames: ["gpii.express.user.couchdb.read"],
    listeners: {
        "onError.fail": {
            funcName: "gpii.express.user.datasource.tests.handleError",
            args:     ["{that}", "{arguments}.0"],
            priority: "first"
        }
    }
});

fluid.defaults("gpii.express.user.datasource.tests.read.byId", {
    gradeNames: ["gpii.express.user.datasource.tests.read"],
    url:      "http://localhost:3579/users/%id",
    termMap: { id: "%id"}
});

fluid.defaults("gpii.express.user.datasource.tests.writable", {
    gradeNames: ["gpii.express.user.couchdb.writable"],
    termMaps: {
        read: { id: "%id"},
        write: { id: "%id"}
    },
    events: {
        onResult: null,
        onWrite:  null, // TODO:  Why is this needed?
        onError:  null // TODO:  Why is this needed?
    },
    listeners: {
        "onError.fail": {
            funcName: "gpii.express.user.datasource.tests.handleError",
            args:     ["{that}", "{arguments}.0"],
            priority: "first"
        },
        "onWrite.fireOnResult": {
            func: ["{that}.events.onResult.fire"],
            args: ["{arguments}.0"],
            priority: "last"
        }
    }
});

fluid.defaults("gpii.express.users.datasource.tests.caseHolder", {
    gradeNames: ["gpii.express.tests.caseHolder"],
    expected: {
        sample: {
            "username": "sample",
            "password": "secret",
            "email":    "sample@sample.com",
            "verified": true
        },
        createResponse: {
            ok: true,
            id: "created"
        },
        created: {
            "_id":      "created",
            "username": "created",
            "password": "secret",
            "email":    "created@sample.com"
        },
        updateResponse: {
            ok: true,
            id: "existing"
        },
        updated: {
            "_id":      "existing",
            "username": "existing",
            "password": "updated",
            "email":    "existing@sample.com",
            "verified": true
        }
    },
    rawModules: [
        {
            tests: [
                {
                    name: "Retrieve a record by a its id...",
                    type: "test",
                    sequence: [
                        {
                            func: "{idReader}.get",
                            args: [{ id: "sample"}]
                        },
                        {
                            listener: "gpii.express.user.datasource.tests.checkResult",
                            event:    "{idReader}.events.onRead",
                            priority: "last",
                            args:     ["{caseHolder}", "{arguments}.0", "{caseHolder}.options.expected.sample"]
                        }
                    ]
                },
                {
                    name: "Retrieve a record from alldocs...",
                    type: "test",
                    sequence: [
                        {
                            func: "{allDocsReader}.get",
                            args: [{ key: "sample"}]
                        },
                        {
                            listener: "gpii.express.user.datasource.tests.checkResult",
                            event:    "{allDocsReader}.events.onRead",
                            priority: "last",
                            args:     ["{caseHolder}", "{arguments}.0", "{caseHolder}.options.expected.sample"]
                        }
                    ]
                },
                {
                    name: "Create a new record...",
                    type: "test",
                    sequence: [
                        {
                            func: "{createWriter}.set",
                            args:  ["{that}.options.expected.created", {}]
                        },
                        {
                            listener: "gpii.express.user.datasource.tests.checkResult",
                            event:    "{createWriter}.events.onWrite",
                            priority: "last",
                            args:     ["{caseHolder}", "{arguments}.0", "{caseHolder}.options.expected.createResponse"]
                        },
                        //{
                        //    func: "{verifyCreateReader}.get",
                        //    args: [{ id: "created"}]
                        //},
                        //{
                        //    listener: "gpii.express.user.datasource.tests.checkResult",
                        //    event:    "{verifyCreateReader}.events.onRead",
                        //    priority: "last",
                        //    args:     ["{caseHolder}", "{arguments}.0", "{caseHolder}.options.expected.created"]
                        //}
                    ]
                }
            ]
        }
    ],
    components: {
        idReader: {
            type: "gpii.express.user.datasource.tests.read.byId"
        },
        allDocsReader: {
            type: "gpii.express.user.datasource.tests.read",
            options: {
                rules: {
                    read: {
                        "": "rows.0.doc"
                    }
                },
                url:      "http://localhost:3579/users/_all_docs?include_docs=true&key=\"%key\"",
                termMap: { key: "%key"}
            }
        },
        createWriter: {
            type: "gpii.express.user.datasource.tests.writable",
            options: {
                urls: {
                    read:  "http://localhost:3579/users/%id",
                    write: "http://localhost:3579/users/%id"
                }
            }
        },
        //verifyCreateReader: {
        //    type: "gpii.express.user.datasource.tests.read.byId"
        //},
        //updateWriter: {
        //    type: "gpii.express.user.datasource.tests.writable",
        //    options: {
        //
        //    }
        //},
        //verifyUpdateReader: {
        //    type: "gpii.express.user.datasource.tests.read.byId"
        //}
    }
});

fluid.defaults("gpii.express.user.datasource.tests", {
    gradeNames: ["fluid.test.testEnvironment"],
    pouchPort: "3579",
    events: {
        constructServer: null,
        onStarted: null
    },
    components: {
        pouch: {
            type:          "gpii.express.user.tests.pouch",
            createOnEvent: "constructServer",
            options: {
                pouchPort: "{that}.options.pouchPort",
                listeners: {
                    "onAllStarted.notifyParent": {
                        func: "{testEnvironment}.events.onStarted.fire"
                    }
                }
            }
        },
        testCaseHolder: {
            type: "gpii.express.users.datasource.tests.caseHolder"
        }
    }
});

gpii.express.user.datasource.tests();