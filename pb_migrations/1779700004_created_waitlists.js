/// <reference path="../pb_data/types.d.ts" />
// Airtable WAITLISTS -> PocketBase waitlists. Airtable linked field `user_id`
// becomes relation `user` (-> users). Written by routes/waitlist.ts.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const collection = new Collection({
    "name": "waitlists",
    "type": "base",
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "id": "text_id", "name": "id", "type": "text",
        "primaryKey": true, "system": true, "required": true,
        "min": 15, "max": 15, "pattern": "^[a-z0-9]+$",
        "autogeneratePattern": "[a-z0-9]{15}"
      },
      { "id": "rel_user",     "name": "user",       "type": "relation", "required": false,
        "collectionId": users.id, "cascadeDelete": false, "minSelect": 0, "maxSelect": 1 },
      { "id": "text_email",   "name": "email",      "type": "text", "required": true },
      { "id": "bool_notified","name": "notified",   "type": "bool", "required": false },
      { "id": "date_created", "name": "created_at", "type": "autodate", "onCreate": true, "onUpdate": false }
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("waitlists"));
});
