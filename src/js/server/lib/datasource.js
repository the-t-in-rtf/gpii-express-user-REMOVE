// A rewritten version of `kettle.dataSource.CouchDB.read` that allows rewriting of the response using the
// transformation rules found in `options.rules.read`.  We cannot directly extend the existing couch grade in Kettle
// because it has a non-namespaced listener for `onRead`, which we cannot replace. The `gradeNames` and `listener` block
// are copied from that grade.
// 
// To work with the value returned from CouchDB, you most likely will simply want to add another `onRead` listener with 
// a lower priority than `kettle.dataSource.priorities.CouchDB`, as in:
//
// listeners: {
//   "onRead.logResponse": {
//     funcName: "console.log",
//     args: ["I received the following response:", "{arguments}.0"],
//     priority: "after:gpii.express.user.couchdb.read"
//   }
// }
//
// For more information on priorities, see: http://docs.fluidproject.org/infusion/development/Priorities.html
//
"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");
var kettle = require("kettle");

fluid.registerNamespace("gpii.express.user.couchdb.read");

// Replacement for a similar function in the default implementation in dataSource.js.  Adds support for rule-based 
// decoding of couch response, which can work with lists, individual records, shows, whatever.
gpii.express.user.couchdb.read.transformCouchResults = function (that, resp) {
    // if undefined, pass that through as per dataSource (just for consistency in FS-backed tests)
    var togo;
    if (resp === undefined) {
        togo = undefined;
    } else {
        if (resp.error) {
            var error = {
                isError: true,
                message: resp.error + ": " + resp.reason
            };
            togo = fluid.promise();
            togo.reject(error);
        } else {
            togo = fluid.model.transformWithRules(resp, that.options.rules.read);
        }
    }
    return togo;
};

fluid.defaults("gpii.express.user.couchdb.read", {
    gradeNames: ["kettle.dataSource.URL"],
    rules: {
        read: {
            "": ""
        }
    },
    listeners: {
        "onRead.transformCouchResults": {
            funcName: "gpii.express.user.couchdb.read.transformCouchResults",
            args: ["{that}", "{arguments}.0"],
            namespace: "gpii.express.user.couchdb",
            priority: kettle.dataSource.priorities.CouchDB
        }
    }
});



// A rewritten version of `kettle.dataSource.CouchDB.write` that decouples the read and write URLS (so that you can
// read from a _view and write to a native Couch API.  The "read" URL is found at `options.urls.read`, and the "write" 
// URL is set using `options.url.write`.   As this class  extends `kettle.dataSource.URL.writable`, `options.url` is 
// set to the value of `options.url.write` by default.
// 
// Also allows rewriting of all payloads and responses using transformation rules.

fluid.registerNamespace("gpii.express.user.couchdb.writable");

// A replacement for the default couch "write" operation that removes the hard-coded `value` wrapper in favor of rules.
gpii.express.user.couchdb.writable.transformModelToCouch = function (that, model, options) {
    var jsonModel = typeof model === "string" ? JSON.parse(model) : model; // TODO: WHYYYYYYY?????
    var doc = fluid.model.transformWithRules(jsonModel, that.options.rules.write);
    var original = that.reader.get(options.termMap, {filterNamespaces: ["JSON"]});
    var togo = fluid.promise();
    original.then(function (originalDoc) {
        // We will always get a response even if the document is not found, so we have to check for more than just a value.
        if (originalDoc && originalDoc._id && originalDoc._rev) {
            doc._id = originalDoc._id;
            doc._rev = originalDoc._rev;
        } else {
            options.writeMethod = "POST"; // returned out to URL dataSource handler
        }
        togo.resolve(JSON.stringify(doc));
    });
    return togo;
};

fluid.defaults("gpii.express.user.couchdb.writable", {
    // We cannot directly extend the existing couch grade in Kettle because it has a non-namespaced listener for
    // `onRead`. The gradeNames and listener are copied from that grade.
    gradeNames: ["kettle.dataSource.URL.writable"],
    rules: {
        read: {
            "": "rows.0"
        },
        write: {
            "": ""
        }
    },
    urls: {
        read:  "http://localhost:5984/ul/%id",
        write: "http://localhost:5984/ul/%id"
    },
    termMap: {
    },
    url: "{that}.options.urls.write",
    listeners: {
        "onWrite.transformModelToCouch": {
            funcName:  "gpii.express.user.couchdb.writable.transformModelToCouch",
            args:      ["{that}", "{arguments}.0", "{arguments}.1"], // model, options
            namespace: "gpii.express.user.couchdb",
            priority:  kettle.dataSource.priorities.CouchDB
        },
        "onError.log": {
            priority: 100,
            funcName: "fluid.log",
            args: ["There was an error in writing to couch:", "{arguments}.0"]
        }
    },
    components: {
        reader: {
            type: "gpii.express.user.couchdb.read",
            options: {
                url: "{writable}.options.urls.read",
                rules: {
                    read: "{writable}.options.rules.read"
                }
            }
        }
    }
});
