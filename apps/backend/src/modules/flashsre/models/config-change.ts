import { model } from "@medusajs/framework/utils"

// Append-only audit record of one admin configuration change
const ConfigChange = model
  .define("flashsre_config_change", {
    id: model.id({ prefix: "fcc" }).primaryKey(),
    actor_id: model.text().nullable(),
    actor_email: model.text().nullable(),
    team: model.text().nullable(),
    method: model.text(),
    route: model.text(),
    entity_type: model.text(),
    entity_id: model.text().nullable(),
    entity_label: model.text().nullable(),
    status_code: model.number(),
    request_body: model.json().nullable(),
    before: model.json().nullable(),
    after: model.json().nullable(),
    diff: model.json().nullable(),
  })
  .indexes([{ on: ["entity_id"] }, { on: ["team"] }])

export default ConfigChange
