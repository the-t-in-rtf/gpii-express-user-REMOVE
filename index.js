// Convenience file to allow devs to easily `require` all server-side components at once.
"use strict";
require("./src/js/server/lib/datasource.js");
require("./src/js/server/lib/mailer.js");
require("./src/js/server/lib/passthroughRouter.js");
require("./src/js/server/lib/password.js");
require("./src/js/server/lib/standaloneRenderer.js");

require("./src/js/server/api.js");
require("./src/js/server/current.js");
require("./src/js/server/docs.js");
require("./src/js/server/forgot.js");
require("./src/js/server/login.js");
require("./src/js/server/logout.js");
// TODO:  Not yet implemented
//require("./src/js/server/reset.js");
require("./src/js/server/session.js");
require("./src/js/server/signup.js");
require("./src/js/server/verify.js");
// TODO:  Not yet finished
//require("./src/js/server/verify-resend.js");