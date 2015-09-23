This directory contains views that must be added to your database in order for basic read operations to work. These are
in a format that can be used directly with CouchDB's API, as in the following example:

    curl -H "Content-Type: application/json" -d @lookup.json http://admin:admin@localhost:5984/test/

Previously, we used couchapp to manage this, with only one view there is not much sense in doing so.