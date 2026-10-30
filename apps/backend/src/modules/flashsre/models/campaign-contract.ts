import { model } from "@medusajs/framework/utils"

// Approved business intent for a campaign; the source of truth independent of live config
const CampaignContract = model
  .define("flashsre_campaign_contract", {
    id: model.id({ prefix: "fct" }).primaryKey(),
    contract_id: model.text(),
    version: model.number(),
    status: model.enum(["draft", "approved", "retired"]).default("approved"),
    approved_by: model.text().nullable(),
    body: model.json(),
  })
  .indexes([{ on: ["contract_id", "version"], unique: true }])

export default CampaignContract
