"use strict";
module.exports = function (jqUnit, browser, status) {
    if (!status) { status = 200; }

    jqUnit.assertEquals("The browser's status code should be appropriate.", status, browser.statusCode);
    jqUnit.assertNull("There should be no errors returned by the browser.", browser.error);

    // If any of the next few tests fail, make sure you are not reusing the same browser instance across multiple async operations.
    jqUnit.assertNotUndefined("There should be a window available.", browser.window);
    if (browser.window) {
        jqUnit.assertNotUndefined("There should be a dollar sign selector available.", browser.window.$);
        if (browser.window.$) {
            jqUnit.assertNotUndefined("There should be a selectable body.", browser.window.$("body"));
        }
    }
};