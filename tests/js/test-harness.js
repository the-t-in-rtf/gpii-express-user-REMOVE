// The common test harness we will use for all tests as well as manual verification.
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var path        = require("path");
var templateDir = path.resolve(__dirname, "../../src/templates");

require("../../src/js/server/api");
require("../../src/js/server/session");

require("gpii-express");
require("gpii-handlebars");

require("./test-harness-pouch");

var bowerDir        = path.resolve(__dirname, "../../bower_components");
var srcDir          = path.resolve(__dirname, "../../src");
var modulesDir      = path.resolve(__dirname, "../../node_modules");

// Sample static router and handler.
fluid.defaults("gpii.express.user.tests.helloHandler", {
    gradeNames: ["gpii.express.handler"],
    invokers: {
        handleRequest: {
            func: "{that}.sendResponse",
            args: [200, "Hello, ambivalent world."]
        }
    }
});

// Cookie setting test router and handler.
fluid.registerNamespace("gpii.express.user.tests.cookieSetter.handler");
gpii.express.user.tests.cookieSetter.handler.setCookie = function (that) {
    that.response.cookie("_gpii_session", { foo: "bar" });
    that.sendResponse(200, "The cookie has been set");
};

fluid.defaults("gpii.express.user.tests.cookieSetter.handler", {
    gradeNames: ["gpii.express.handler"],
    invokers: {
        handleRequest: {
            funcName: "gpii.express.user.tests.cookieSetter.handler.setCookie",
            args: ["{that}"]
        }
    }
});

fluid.defaults("gpii.express.user.tests.cookieSetter", {
    gradeNames:    ["gpii.express.requestAware.router"],
    path:          "/setCookie",
    handlerGrades: ["gpii.express.user.tests.cookieSetter.handler"]
});

fluid.defaults("gpii.express.user.tests.harness", {
    gradeNames: ["fluid.component"],
    pouchPort:  "9735",
    apiPort: "5379",
    apiUrl: {
        expander: {
            funcName: "fluid.stringTemplate",
            args:     ["http://localhost:%port/", { port: "{that}.options.apiPort"}]
        }
    },
    // As we may commonly be working with a debugger, we need a much longer timeout for all `requestAwareRouter`  and `contentAware` grades.
    timeout: 99999999,
    distributeOptions: [
        {
            source: "{that}.options.timeout",
            target: "{that gpii.express.requestAware.router}.options.timeout"
        },
        {
            source: "{that}.options.timeout",
            target: "{that gpii.express.contentAware.router}.options.timeout"
        }
    ],
    events: {
        onPouchStarted: null,
        onApiStarted: null,
        onPouchExpressStarted: null,
        onStarted: {
            events: {
                onPouchStarted: "onPouchStarted",
                onApiStarted:   "onApiStarted"
            }
        }
    },
    components: {
        api: {
            type: "gpii.express",
            options: {
                config: {
                    express: {
                        port:  "{harness}.options.apiPort",
                        views: templateDir
                    },
                    app: {
                        name: "Express User Test Harness",
                        url:  "{harness}.options.apiUrl"
                    }
                },
                listeners: {
                    onStarted: "{harness}.events.onApiStarted.fire"
                },
                components: {
                    //// Required middleware
                    //json: {
                    //    type: "gpii.express.middleware.bodyparser.json"
                    //},
                    //urlencoded: {
                    //    type: "gpii.express.middleware.bodyparser.urlencoded"
                    //},
                    //cookieparser: {
                    //    type: "gpii.express.middleware.cookieparser"
                    //},
                    //session: {
                    //    type: "gpii.express.middleware.session",
                    //    options: {
                    //        config: {
                    //            express: {
                    //                session: {
                    //                    secret: "Printer, printer take a hint-ter."
                    //                }
                    //            }
                    //        }
                    //    }
                    //},

                    //// Session persister
                    //persister: {
                    //    type: "gpii.express.user.middleware.session"
                    //},

                    handlebars: {
                        type: "gpii.express.hb"
                    },
                    // TODO:  We can get rid of this once the API component is ready
                    hello: {
                        type: "gpii.express.requestAware.router",
                        options: {
                            path: "/",
                            handlerGrades: ["gpii.express.user.tests.helloHandler"]
                        }
                    },

                    //// TODO: We can get rid of this once we figure out cookie handling
                    //cookieSetter: {
                    //    type: "gpii.express.user.tests.cookieSetter"
                    //},


                    // Front-end content used by some GET calls
                    modules: {
                        type:  "gpii.express.router.static",
                        options: {
                            path:    "/modules",
                            content: modulesDir
                        }
                    },
                    bc: {
                        type:  "gpii.express.router.static",
                        options: {
                            path:    "/bc",
                            content: bowerDir
                        }
                    },
                    inline: {
                        type: "gpii.express.hb.inline",
                        options: {
                            path: "/hbs"
                        }
                    },

                    api: {
                        type: "gpii.express.user.api",
                        options: {
                            path:        "/api/user",
                            templateDir: templateDir,
                            couch:  {
                                port: "{harness}.options.pouchPort"
                            },
                            app: "{gpii.express}.options.config.app"
                        }
                    },

                    // Serve up the rest of our static content (JS source, etc.)
                    src: {
                        type:  "gpii.express.router.static",
                        options: {
                            path:    "/",
                            content: srcDir
                        }
                    }
                }
            }
        },
        pouch: {
            type: "gpii.express.user.tests.pouch",
            options: {
                pouchPort: "{harness}.options.pouchPort",
                listeners: {
                    onAllStarted: "{harness}.events.onPouchStarted.fire"
                }
            }
        }
    }
});