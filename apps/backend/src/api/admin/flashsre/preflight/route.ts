import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { PROMOTION_PREFLIGHT_FIELDS, PromotionDraft } from "../../../../lib/flashsre/preflight"
import { preflightPromotionWorkflow } from "../../../../workflows/flashsre/preflight-promotion"
import type { GetPreflightType, PostPreflightType } from "../validators"

// Checks a saved promotion against the agent's lessons (used by the promotion page widget)
export async function GET(req: AuthenticatedMedusaRequest<unknown, GetPreflightType>, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "promotion", fields: PROMOTION_PREFLIGHT_FIELDS, filters: { id: req.validatedQuery.promotion_id } })
  if (!data.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Promotion ${req.validatedQuery.promotion_id} không tồn tại`)
  }
  const { result } = await preflightPromotionWorkflow(req.scope).run({ input: data[0] as PromotionDraft })
  res.json({ promotion: { id: data[0].id, code: data[0].code }, ...result })
}

// Checks a draft that is not saved yet
export async function POST(req: AuthenticatedMedusaRequest<PostPreflightType>, res: MedusaResponse) {
  const { result } = await preflightPromotionWorkflow(req.scope).run({ input: req.validatedBody.promotion as PromotionDraft })
  res.json(result)
}
