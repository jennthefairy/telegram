/// <reference path="../pb_data/types.d.ts" />
// Airtable USERS -> PocketBase users. Field names derived from telegram src plus the
// full Airtable column set (1:1 with the live base; rollup/reverse-link columns excluded).
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
      { "id": "text_username",     "name": "username",            "type": "text",   "required": false },
      { "id": "text_first_name",   "name": "first_name",          "type": "text",   "required": false },
      { "id": "text_tg_chat_id",   "name": "telegram_chat_id",    "type": "text",   "required": false },
      { "id": "sel_bot_state",     "name": "bot_state",           "type": "select", "required": false,
        "maxSelect": 1, "values": ["new", "awaiting_username", "active"] },
      { "id": "bool_is_flagged",   "name": "is_flagged",          "type": "bool",   "required": false },
      { "id": "text_email",        "name": "email",               "type": "text",   "required": false },
      { "id": "num_points_bal",    "name": "points_balance",      "type": "number", "required": false },
      { "id": "bool_magic_wand",   "name": "magic_wand_active",   "type": "bool",   "required": false },
      { "id": "num_subm_24h",      "name": "submission_count_24h","type": "number", "required": false },
      { "id": "text_stripe_cust",  "name": "stripe_customer_id",  "type": "text",   "required": false },
      { "id": "num_total_camp",    "name": "total_campaigns",     "type": "number", "required": false },
      { "id": "num_succ_camp",     "name": "successful_campaigns","type": "number", "required": false },
      { "id": "num_total_earn",    "name": "total_earnings",      "type": "number", "required": false },
      { "id": "text_pending_sku",  "name": "pending_sku",         "type": "text",   "required": false },
      { "id": "num_pending_goal",  "name": "pending_goal",        "type": "number", "required": false },
      { "id": "date_created",      "name": "created_at",          "type": "autodate", "onCreate": true, "onUpdate": false }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_users_username` ON `users` (`username`) WHERE `username` != ''"
    ]
  });
  app.save(collection);

  // self-referential relation (added after creation so the collection id exists)
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new Field({
    "id": "rel_referrer_user", "name": "referrer_user", "type": "relation", "required": false,
    "collectionId": users.id, "cascadeDelete": false, "minSelect": 0, "maxSelect": 1
  }));
  app.save(users);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("users"));
});
