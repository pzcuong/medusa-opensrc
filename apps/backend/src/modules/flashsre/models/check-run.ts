import { model } from "@medusajs/framework/utils"

// One contract check (manual or scheduled), kept so the dashboard can show history and trends
const CheckRun = model
  .define("flashsre_check_run", {
    id: model.id({ prefix: "fcr" }).primaryKey(),
    contract_id: model.text(),
    contract_version: model.number(),
    trigger: model.enum(["manual", "scheduled"]).default("manual"),
    total: model.number(),
    by_kind: model.json(),
    result: model.json(),
  })
  .indexes([{ on: ["contract_id"] }])

export default CheckRun
