import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FLASHSRE_MODULE } from "../../../../modules/flashsre"
import FlashsreModuleService from "../../../../modules/flashsre/service"
import type { GetCheckRunsType } from "../validators"

// History of contract checks; only the newest run carries its full result to keep the payload small
export async function GET(req: AuthenticatedMedusaRequest<unknown, GetCheckRunsType>, res: MedusaResponse) {
  const { contract_id, limit } = req.validatedQuery
  const service: FlashsreModuleService = req.scope.resolve(FLASHSRE_MODULE)
  const runs = await service.listCheckRuns(contract_id ? { contract_id } : {}, {
    order: { created_at: "DESC" },
    take: limit ?? 50,
  })
  res.json({
    check_runs: runs.map((r, i) => ({ ...r, result: i === 0 ? r.result : undefined })),
  })
}
