/// <reference path="../pb_data/types.d.ts" />
// Airtable CAMPAIGNS -> PocketBase campaigns. Airtable linked field `user_id` becomes
// relation `user` (-> users). 1:1 with the live base (rollups like progress_pct excluded).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const collection = new Collection({
    "name": "campaigns",
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
      { "id": "text_camp_name",   "name": "campaign_name",     "type": "text",   "required": false },
      { "id": "text_slug",        "name": "slug",              "type": "text",   "required": false },
      { "id": "sel_status",       "name": "status",            "type": "select", "required": false,
        "maxSelect": 1, "values": ["pending", "pending_approval", "active", "successful", "completed", "failed", "cancelled"] },
      { "id": "num_current",      "name": "current_units",     "type": "number", "required": false },
      { "id": "num_goal",         "name": "goal_units",        "type": "number", "required": false },
      { "id": "date_start",       "name": "start_date",        "type": "date",   "required": false },
      { "id": "date_end",         "name": "end_date",          "type": "date",   "required": false },
      { "id": "num_retail",       "name": "retail_price",      "type": "number", "required": false },
      { "id": "num_wholesale",    "name": "wholesale_cost",    "type": "number", "required": false },
      { "id": "text_sku_code",    "name": "sku_code",          "type": "text",   "required": false },
      { "id": "text_desc",        "name": "description",       "type": "text",   "required": false },
      { "id": "url_image",        "name": "image_url",         "type": "url",    "required": false },
      { "id": "text_telegraph",   "name": "telegraph_url",     "type": "text",   "required": false },
      { "id": "text_stripe_price","name": "stripe_price_id",   "type": "text",   "required": false },
      { "id": "text_appr_by",     "name": "admin_approved_by", "type": "text",   "required": false },
      { "id": "date_appr_at",     "name": "admin_approved_at", "type": "date",   "required": false },
      { "id": "text_user_idtext", "name": "user_id_text",      "type": "text",   "required": false },
      { "id": "rel_user",         "name": "user",              "type": "relation", "required": false,
        "collectionId": users.id, "cascadeDelete": false, "minSelect": 0, "maxSelect": 1 },
      { "id": "date_created",     "name": "created_at",        "type": "autodate", "onCreate": true, "onUpdate": false }
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("campaigns"));
});
