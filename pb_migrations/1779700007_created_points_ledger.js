/// <reference path="../pb_data/types.d.ts" />
// Airtable POINTS_LEDGER -> PocketBase points_ledger. Airtable `user_id` -> relation `user`.
// Append-only; written by webhook.ts on referral vest.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const collection = new Collection({
    "name": "points_ledger",
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
      { "id": "rel_user",      "name": "user",            "type": "relation", "required": false,
        "collectionId": users.id, "cascadeDelete": false, "minSelect": 0, "maxSelect": 1 },
      { "id": "num_delta",     "name": "delta",           "type": "number", "required": false },
      { "id": "num_running",   "name": "running_balance", "type": "number", "required": false },
      { "id": "text_reason",   "name": "reason",          "type": "text",   "required": false },
      { "id": "text_ref_id",   "name": "ref_id",          "type": "text",   "required": false },
      { "id": "text_period",   "name": "period_month",    "type": "text",   "required": false },
      { "id": "date_created",  "name": "created_at",      "type": "autodate", "onCreate": true, "onUpdate": false }
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("points_ledger"));
});
