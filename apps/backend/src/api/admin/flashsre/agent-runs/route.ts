import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { FLASHSRE_MODULE } from "../../../../modules/flashsre"
import FlashsreModuleService from "../../../../modules/flashsre/service"
import { recordAgentRunWorkflow } from "../../../../workflows/flashsre/record-agent-run"
import type { GetAgentRunsType, PostAgentRunType } from "../validators"

export async function GET(req: AuthenticatedMedusaRequest<unknown, GetAgentRunsType>, res: MedusaResponse) {
  const { contract_id, limit } = req.validatedQuery
  const service: FlashsreModuleService = req.scope.resolve(FLASHSRE_MODULE)
  const runs = await service.listAgentRuns(contract_id ? { contract_id } : {}, {
    order: { created_at: "DESC" },
    take: limit ?? 50,
  })
  res.json({ agent_runs: runs })
}

export async function POST(req: AuthenticatedMedusaRequest<PostAgentRunType>, res: MedusaResponse) {
  const { result } = await recordAgentRunWorkflow(req.scope).run({ input: req.validatedBody as PostAgentRunType & { dossier: Record<string, unknown> } })
  res.json({ agent_run: result })
}
