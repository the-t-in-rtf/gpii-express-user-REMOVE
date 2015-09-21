/*

    A static function to consistently encode a password.  Used when storing passwords in CouchDB, and when logging in
    using a username and password.

    This package uses the `pbkdf2` functions provided by the `crypto` package built into node.  It has been tested to
    work specifically with the encoded passwords saved by CouchDB itself and by the express-couchUser package.  The
    default digest is `sha1`.  Using any other digest function is not likely to be backward compatible.

 */
"use strict";
var fluid = fluid || require("infusion");
var gpii  = fluid.registerNamespace("gpii");

var crypto = require("crypto");

fluid.registerNamespace("gpii.express.user.password");
gpii.express.user.password.encode = function (password, salt, iterations, keyLength, digest) {
    // Set defaults that are useful in dealing with CouchDB and express-couchUser data.
    iterations = iterations ? iterations : 10;
    keyLength  = keyLength  ? keyLength  : 20;
    digest     = digest     ? digest     :"sha1"; // Already used when the value is omitted, but specified for future-proofing.

    var hexEncodedValue = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest);
    return hexEncodedValue.toString("hex");
};