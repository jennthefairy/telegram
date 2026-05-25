/// <reference path="../pb_data/types.d.ts" />
// Airtable ORDERS -> PocketBase orders. Airtable linked field `campaign_id` becomes
// relation `campaign` (-> campaigns); the denormalized `campaign_id_text` is RETAINED
// because the scheduler filters on it ({campaign_id_text}=...).
migrate((app) => {
  const campaigns = app.findCollectionByNameOrId("campaigns");
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
      { "id": "rel_campaign",     "name": "campaign",          "type": "relation", "required": false,
        "collectionId": campaigns.id, "cascadeDelete": false, "minSelect": 0, "maxSelect": 1 },
      { "id": "text_camp_idtext", "name": "campaign_id_text",  "type": "text",   "required": false },
      { "id": "text_cust_email",  "name": "customer_email",    "type": "text",   "required": false },
      { "id": "text_cust_name",   "name": "customer_name",     "type": "text",   "required": false },
      { "id": "num_amount",       "name": "amount_cents",      "type": "number", "required": false },
      { "id": "text_session",     "name": "stripe_session_id", "type": "text",   "required": false },
      { "id": "text_pi",          "name": "payment_intent_id", "type": "text",   "required": false },
      { "id": "sel_capture",      "name": "capture_status",    "type": "select", "required": false,
        "maxSelect": 1, "values": ["pending", "captured", "cancelled", "error"] },
      { "id": "sel_state",        "name": "state",             "type": "select", "required": false,
        "maxSelect": 1, "values": ["Pre-Auth", "Charged", "Released", "Error", "Delivered", "Refunded", "AI_Pending"] },
      { "id": "text_workflow",    "name": "workflow_name",     "type": "text",   "required": false },
      { "id": "date_last_change", "name": "last_state_change", "type": "date",   "required": false },
      { "id": "date_created",     "name": "created_at",        "type": "autodate", "onCreate": true, "onUpdate": false }
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("orders"));
});
