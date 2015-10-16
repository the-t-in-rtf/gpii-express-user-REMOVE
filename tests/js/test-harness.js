// The common test harness we will use for all tests as well as manual verification.
"use strict";
var fluid = fluid || require("infusion");

var path        = require("path");
var templateDir = path.resolve(__dirname, "../../src/templates");

require("../../src/js/server/api");

require("gpii-express");
require("gpii-handlebars");
require("gpii-mail-test");

require("./test-harness-pouch");

var bowerDir        = path.resolve(__dirname, "../../bower_components");
var srcDir          = path.resolve(__dirname, "../../src");
var modulesDir      = path.resolve(__dirname, "../../node_modules");

// TODO:  Update this to use the new version of gpii-mail-test once we have a Zombie version that works in 0.12 or higher.
fluid.defaults("gpii.express.user.tests.harness", {
    gradeNames: ["fluid.component"],
    pouchPort:  "9735",
    apiPort:    "5379",
    mailPort:   "5225",
    apiUrl: {
        expander: {
            funcName: "fluid.stringTemplate",
            args:     ["http://localhost:%port/api/user/", { port: "{that}.options.apiPort"}]
        }
    },
    // As we may commonly be working with a debugger, we need a much longer timeout for all `requestAwareRouter` and `contentAware` grades.
    timeout: 99999999,
    distributeOptions: [
        {
            source: "{that}.options.timeout",
            target: "{that gpii.express.requestAware.router}.options.timeout"
        },
        {
            source: "{that}.options.timeout",
            target: "{that gpii.express.contentAware.router}.options.timeout"
        },
        // Make sure any mailer components are aware of our outgoing mail port
        {
            source: "{that}.options.mailPort",
            target: "{that gpii.express.user.mailer}.options.transportOptions.port"
        }
    ],
    events: {
        onPouchStarted:        null,
        onApiStarted:          null,
        onPouchExpressStarted: null,
        onMailReady:           null,
        onStarted: {
            events: {
                onPouchStarted: "onPouchStarted",
                onApiStarted:   "onApiStarted",
                onMailReady:    "onMailReady"
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
                    handlebars: {
                        type: "gpii.express.hb",
                        options: {
                            components: {
                                initBlock: {
                                    options: {
                                        contextToOptionsRules: {
                                            req: "req"
                                        }
                                    }
                                }
                            }
                        }
                    },
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
                                port: "{harness}.options.pouchPort",
                                userDbName: "users",
                                userDbUrl: {
                                    expander: {
                                        funcName: "fluid.stringTemplate",
                                        args:     ["http://localhost:%port/%userDbName", "{that}.options.couch"]
                                    }
                                }
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
        },
        smtp: {
            type: "gpii.test.mail.smtp",
            options: {
                port: "{harness}.options.mailPort",
                listeners: {
                    "onReady": [
                        { funcName: "fluid.log", args: ["mail server started and notifying parent..."]},
                        {
                            func: "{harness}.events.onMailReady.fire"
                        }
                    ]
                }
            }
        }
    }
});