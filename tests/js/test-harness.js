// The common test harness we will use for all tests as well as manual verification.
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

//require("../../src/js/server/api");
require("../../src/js/server/session");

require("gpii-express");
require("gpii-pouch");

var path = require("path");
var userDataFile = path.resolve(__dirname, "../data/users.json");

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
    events: {
        onPouchStarted: null,
        onApiExpressStarted: null,
        onPouchExpressStarted: null,
        onStarted: {
            events: {
                onPouchStarted:        "onPouchStarted",
                onApiExpressStarted:   "onApiExpressStarted",
                onPouchExpressStarted: "onPouchExpressStarted"
            }
        }
    },
    components: {
        api: {
            type: "gpii.express",
            options: {
                config: {
                    express: {
                        port: "{harness}.options.apiPort"
                    }
                },
                listeners: {
                    onStarted: "{harness}.events.onApiExpressStarted.fire"
                },
                components: {
                    // Required middleware
                    json: {
                        type: "gpii.express.middleware.bodyparser.json"
                    },
                    urlencoded: {
                        type: "gpii.express.middleware.bodyparser.urlencoded"
                    },
                    cookieparser: {
                        type: "gpii.express.middleware.cookieparser"
                    },
                    session: {
                        type: "gpii.express.middleware.session",
                        options: {
                            config: {
                                express: {
                                    session: {
                                        secret: "Printer, printer take a hint-ter."
                                    }
                                }
                            }
                        }
                    },

                    // Session persister
                    persister: {
                        type: "gpii.express.user.middleware.session"
                    },


                    // TODO:  We can get rid of this once the API component is ready
                    hello: {
                        type: "gpii.express.requestAware.router",
                        options: {
                            path: "/",
                            handlerGrades: ["gpii.express.user.tests.helloHandler"]
                        }
                    },

                    // TODO: We can get rid of this once we figure out cookie handling
                    cookieSetter: {
                        type: "gpii.express.user.tests.cookieSetter"
                    }

                    // API
                    //api: {
                    //    type: "gpii.express.user.router"
                    //}
                }
            }
        },
        pouch: {
            type: "gpii.express",
            options: {
                config: {
                    express: {
                        port: "{harness}.options.pouchPort"
                    }
                },
                listeners: {
                    onStarted: "{harness}.events.onPouchExpressStarted.fire"
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
                                    func: "{harness}.events.onPouchStarted.fire"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
});