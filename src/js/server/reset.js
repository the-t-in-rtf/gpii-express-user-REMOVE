/*

  Provides the second half of the password reset API, and handles the last two steps.  Before using this, a user must
  have generated a reset code using the `forgot` API.  They are sent a link via email that includes a reset code.

  When they follow that link, the GET portion of this API checks the validity of the code.  If the code exists and has
  not expired, a form with a password and confirmation field is displayed.

  The POST portion of this API accepts the password, confirmation, and the reset code.  It checks to confirm that the
  code corresponds to a valid user.

 */
"use strict";
var fluid  = fluid || require("infusion");
var gpii   = fluid.registerNamespace("gpii");

reset: {
    type: "gpii.express.user.api.reset"
},
