import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { checkCampaignContractWorkflow } from "../../../../../../workflows/flashsre/check-campaign-contract"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { result } = await checkCampaignContractWorkflow(req.scope).run({
    input: { contract_id: req.params.contract_id },
  })
  res.json({ check: result })
}
