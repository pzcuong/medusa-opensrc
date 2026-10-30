import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FLASHSRE_MODULE } from "../../../../modules/flashsre"
import FlashsreModuleService from "../../../../modules/flashsre/service"
import type { GetConfigChangesType } from "../validators"

export async function GET(req: AuthenticatedMedusaRequest<unknown, GetConfigChangesType>, res: MedusaResponse) {
  const { entity_id, team, entity_type, since, limit } = req.validatedQuery
  const service: FlashsreModuleService = req.scope.resolve(FLASHSRE_MODULE)
  const changes = await service.listConfigChanges(
    {
      ...(entity_id ? { entity_id } : {}),
      ...(team ? { team } : {}),
      ...(entity_type ? { entity_type } : {}),
      ...(since ? { created_at: { $gte: new Date(since) } } : {}),
    },
    { order: { created_at: "DESC" }, take: limit ?? 100 }
  )
  res.json({ config_changes: changes })
}
