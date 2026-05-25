/// <reference path="../pb_data/types.d.ts" />
// Airtable ORDERS -> PocketBase orders. Airtable linked field `campaign_id` -> relation
// `campaign`; `user_id` -> relation `user`. `campaign_id_text` retained (scheduler filters on it).
migrate((app) => {
  const campaigns = app.findCollectionByNameOrId("campaigns");
  const users = app.findCollectionByNameOrId("users");
  const collection = new Collection({
    "name": "orders",
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
      { "id": "text_order_ref",   "name": "order_ref",         "type": "text",   "required": false },
      { "id": "rel_campaign",     "name": "campaign",          "type": "relation", "required": false,
        "collectionId": campaigns.id, "cascadeDelete": false, "minSelect": 0, "maxSelect": 1 },
      { "id": "text_camp_idtext", "name": "campaign_id_text",  "type": "text",   "required": false },
      { "id": "rel_user",         "name": "user",              "type": "relation", "required": false,
        "collectionId": users.id, "cascadeDelete": false, "minSelect": 0, "maxSelect": 1 },
      { "id": "text_cust_email",  "name": "customer_email",    "type": "text",   "required": false },
      { "id": "text_cust_name",   "name": "customer_name",     "type": "text",   "required": false },
      { "id": "num_amount",       "name": "amount_cents",      "type": "number", "required": false },
      { "id": "text_session",     "name": "stripe_session_id", "type": "text",   "required": false },
      { "id": "text_pi",          "name": "payment_intent_id", "type": "text",   "required": false },
      { "id": "sel_capture",      "name": "capture_status",    "type": "select", "required": false,
        "maxSelect": 1, "values": ["pending", "captured", "cancelled", "error"] },
      { "id": "sel_state",        "name": "state",             "type": "select", "required": false,
        "maxSelect": 1, "values": ["Pre-Auth", "Charged", "Released", "Error", "Delivered", "Refunded", "AI_Pending"] },
      { "id": "text_ship_addr",   "name": "shipping_address",  "type": "text",   "required": false },
      { "id": "text_tracking",    "name": "tracking_number",   "type": "text",   "required": false },
      { "id": "date_shipped",     "name": "shipped_at",        "type": "date",   "required": false },
      { "id": "num_reject",       "name": "rejection_count",   "type": "number", "required": false },
      { "id": "num_regen",        "name": "regenerate_count",  "type": "number", "required": false },
      { "id": "bool_capturable",  "name": "is_capturable",     "type": "bool",   "required": false },
      { "id": "text_workflow",    "name": "workflow_name",     "type": "text",   "required": false },
      { "id": "date_last_change", "name": "last_state_change", "type": "date",   "required": false },
      { "id": "date_created",     "name": "created_at",        "type": "autodate", "onCreate": true, "onUpdate": false }
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("orders"));
});
