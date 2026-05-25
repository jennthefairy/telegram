/// <reference path="../pb_data/types.d.ts" />
// Airtable AUDIT_LOGS -> PocketBase audit_logs. Superset of the scheduler writer
// ({order_id,action,details}) and the callbacks flagging writer
// ({actor,target_type,target_id,details}), plus the rest of the Airtable columns.
migrate((app) => {
  const collection = new Collection({
    "name": "audit_logs",
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
      { "id": "text_order_id",    "name": "order_id",       "type": "text", "required": false },
      { "id": "text_actor",       "name": "actor",          "type": "text", "required": false },
      { "id": "text_action",      "name": "action",         "type": "text", "required": true },
      { "id": "text_target_type", "name": "target_type",    "type": "text", "required": false },
      { "id": "text_target_id",   "name": "target_id",      "type": "text", "required": false },
      { "id": "text_details",     "name": "details",        "type": "text", "required": false },
      { "id": "text_prev_state",  "name": "previous_state", "type": "text", "required": false },
      { "id": "text_att_state",   "name": "attempted_state","type": "text", "required": false },
      { "id": "text_workflow",    "name": "workflow_name",  "type": "text", "required": false },
      { "id": "date_created",     "name": "created_at",     "type": "autodate", "onCreate": true, "onUpdate": false }
    ]
  });
  app.save(collection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("audit_logs"));
});
