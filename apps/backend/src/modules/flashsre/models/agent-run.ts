import { model } from "@medusajs/framework/utils"

// One agent investigation: debate transcript, verdict, candidate fixes and their sandbox results
const AgentRun = model
  .define("flashsre_agent_run", {
    id: model.id({ prefix: "far" }).primaryKey(),
    contract_id: model.text(),
    finding_key: model.text(),
    title: model.text(),
    verdict: model.text(),
    confidence: model.float(),
    status: model.text(),
    llm: model.text(),
    dossier: model.json(),
  })
  .indexes([{ on: ["contract_id"] }])

export default AgentRun
