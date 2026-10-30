import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { preflightPromotionWorkflow } from "../../workflows/flashsre/preflight-promotion"
import type { PromotionDraft } from "./preflight"

// Before a promotion is created, match it against the agent's lessons and attach the result as a response header.
// It warns and never blocks: lab scripts and existing flows keep working, the admin widget shows the detail.
export async function preflightPromotionCreate(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const path = (req.originalUrl || req.url).split("?")[0].replace(/\/$/, "")
  if (req.method !== "POST" || path !== "/admin/promotions") {
    return next()
  }
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const { result } = await preflightPromotionWorkflow(req.scope).run({ input: (req.body ?? {}) as PromotionDraft })
    res.setHeader("x-flashsre-preflight", JSON.stringify({ verdict: result.verdict, lessons: result.matched.map((m) => ({ id: m.lesson_id, covered: m.covered })) }))
    if (result.verdict === "warn") {
      logger.warn(`[flashsre-preflight] ${(req.body as PromotionDraft)?.code}: ${result.matched.filter((m) => !m.covered).map((m) => m.lesson_id).join(", ")}`)
    }
  } catch (e) {
    logger.warn(`[flashsre-preflight] skipped: ${(e as Error).message}`)
  }
  return next()
}
