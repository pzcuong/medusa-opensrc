import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FLASHSRE_MODULE } from "../../../../modules/flashsre"
import FlashsreModuleService from "../../../../modules/flashsre/service"
import { upsertCampaignContractWorkflow } from "../../../../workflows/flashsre/upsert-campaign-contract"
import type { PostContractType } from "../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service: FlashsreModuleService = req.scope.resolve(FLASHSRE_MODULE)
  const contracts = await service.listCampaignContracts({ status: "approved" }, { order: { contract_id: "ASC" } })
  res.json({ contracts })
}

export async function POST(req: AuthenticatedMedusaRequest<PostContractType>, res: MedusaResponse) {
  const { contract_id, approved_by, body } = req.validatedBody
  const { result } = await upsertCampaignContractWorkflow(req.scope).run({
    input: { contract_id, approved_by: approved_by ?? req.auth_context.actor_id, body },
  })
  res.json({ contract: result })
}
