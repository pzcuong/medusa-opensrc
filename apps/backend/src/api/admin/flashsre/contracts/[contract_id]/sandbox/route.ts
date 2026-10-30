import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Patch } from "../../../../../../lib/flashsre/marketplace-check"
import { sandboxCampaignContractWorkflow } from "../../../../../../workflows/flashsre/sandbox-campaign-contract"
import type { PostSandboxType } from "../../../validators"

export async function POST(req: AuthenticatedMedusaRequest<PostSandboxType>, res: MedusaResponse) {
  const { result } = await sandboxCampaignContractWorkflow(req.scope).run({
    input: { contract_id: req.params.contract_id, patches: req.validatedBody.patches as Patch[] },
  })
  res.json({ sandbox: result })
}
