This directory contains the schemas that define how data is sent and received by this library.

Note that schemas are only used when JSON data is either accepted or returned to the user.  REST endpoints that are accessed via `GET` requests generally do not validate their input against a schema, but do return a message that matches an appropriate message schema (see below).

# User schemas

As there are different fields required when creating or viewing a user, the schemas are broken down as follows:

1. `user-core.json`: The core schema which defines all possible fields used in every other user-related schema.
2. `user-view.json`: Defines the format used when displaying a user record.  Explicitly prevents displaying password data.
3. `user-signup.json`: Defines the format used when creating a new user account.
4. `user-login.json`: Defines the format accepted when logging in.
5. `user-forgot.json`: Defines the format accepted when requesting a password reset.

# Group schemas

1. `group-core.json`: Defines the format used both in displaying and creating groups.

# Message schemas

1. `message-core.json`: Defines the format used when responding to all requests.
2. `user-message.json`: Extends the core message format and defines the format used when responding to requests to /api/user.
3. `group-message.json`: Extends the core message format and defines the format used when responding to requests to /api/group.

