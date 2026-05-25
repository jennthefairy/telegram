/// <reference path="../pb_data/types.d.ts" />
// Airtable USERS -> PocketBase users. Field names derived from telegram src
// (bot/index.ts, commands.ts, callbacks.ts, routes/checkout.ts, routes/webhook.ts).
migrate((app) => {
  const collection = new Collection({
    "name": "users",
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
      { "id": "text_username",     "name": "username",         "type": "text",   "required": false },
      { "id": "text_first_name",   "name": "first_name",       "type": "text",   "required": false },
      { "id": "text_tg_chat_id",   "name": "telegram_chat_id", "type": "text",   "required": false },
      { "id": "sel_bot_state",     "name": "bot_state",        "type": "select", "required": false,
        "maxSelect": 1, "values": ["new", "awaiting_username", "active"] },
      { "id": "bool_is_flagged",   "name": "is_flagged",       "type": "bool",   "required": false },
      { "id": "text_email",        "name": "email",            "type": "text",   "required": false },
      { "id": "num_points_bal",    "name": "points_balance",   "type": "number", "required": false },
      { "id": "date_created",      "name": "created_at",        "type": "autodate", "onCreate": true, "onUpdate": false }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_users_username` ON `users` (`username`) WHERE `username` != ''"
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("users"));
});
