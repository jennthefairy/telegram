/// <reference path="../pb_data/types.d.ts" />
// Airtable REFERRALS -> PocketBase referrals. Airtable `referrer_id` -> relation `referrer`,
// `referred_user_id` -> relation `referred_user`. Created by checkout.ts; vested by webhook.ts.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const collection = new Collection({
    "name": "referrals",
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
      { "id": "rel_referrer",     "name": "referrer",          "type": "relation", "required": false,
        "collectionId": users.id, "cascadeDelete": false, "minSelect": 0, "maxSelect": 1 },
      { "id": "rel_referred",     "name": "referred_user",     "type": "relation", "required": false,
        "collectionId": users.id, "cascadeDelete": false, "minSelect": 0, "maxSelect": 1 },
      { "id": "text_session",     "name": "stripe_session_id", "type": "text",   "required": false },
      { "id": "text_ref_email",   "name": "referred_email",    "type": "text",   "required": false },
      { "id": "sel_status",       "name": "status",            "type": "select", "required": false,
        "maxSelect": 1, "values": ["pending", "awarded"] },
      { "id": "num_points",       "name": "points_awarded",    "type": "number", "required": false },
      { "id": "date_vest_at",     "name": "vest_at",           "type": "date",   "required": false },
      { "id": "date_vested",      "name": "vested_at",         "type": "date",   "required": false },
      { "id": "date_created",     "name": "created_at",        "type": "autodate", "onCreate": true, "onUpdate": false }
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("referrals"));
});
