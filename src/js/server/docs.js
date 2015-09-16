// Display API docs written in Markdown
"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

var marked = require("marked");
var fs     = require("fs");
var path   = require("path");

var mdFile = path.resolve(__dirname, "../../docs/api.md");

fluid.registerNamespace("gpii.express.api.docs.router");

gpii.express.api.docs.router.route = function (that, req, res) {
    var markdown = fs.readFileSync(that.options.mdFile, {encoding: "utf8"});
    res.render("pages/page", { "title": "API Documentation", "body": marked(markdown)});
};

fluid.defaults("gpii.api.docs.router", {
    gradeNames: ["gpii.express.router"],
    path:       "/",
    mdFile:     mdFile,
    invokers: {
        route: {
            funcName: "gpii.api.docs.router.route",
            args:     ["{that}", "{arguments}.0", "{arguments}.1"]
        }
    }
});