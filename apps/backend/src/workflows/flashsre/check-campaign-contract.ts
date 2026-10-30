import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { CampaignContractBody } from "../../lib/flashsre/contract-types"
import { evaluateContract } from "../../lib/flashsre/invariants"
import { evaluateMarketplaceContract, MarketplaceContract } from "../../lib/flashsre/marketplace-check"
import { FLASHSRE_MODULE } from "../../modules/flashsre"
import FlashsreModuleService from "../../modules/flashsre/service"

export type CheckCampaignContractInput = { contract_id: string; trigger?: "manual" | "scheduled" }

// Other approved marketplace contracts selling in the same market, for cross-campaign checks
export async function loadOtherMarketplaceContracts(service: FlashsreModuleService, contract: MarketplaceContract) {
  const all = await service.listCampaignContracts({ status: "approved" })
  return all
    .map((c) => c.body as unknown as MarketplaceContract)
    .filter((b) => b.schema === "marketplace/v1" && b.contract_id !== contract.contract_id &&
      b.market?.currency === contract.market.currency)
}

const evaluateCampaignContractStep = createStep(
  "evaluate-campaign-contract",
  async (input: CheckCampaignContractInput, { container }) => {
    const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
    const [contract] = await service.listCampaignContracts(
      { contract_id: input.contract_id, status: "approved" },
      { order: { version: "DESC" }, take: 1 }
    )
    if (!contract) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `No approved contract ${input.contract_id}`)
    }
    const body = contract.body as Record<string, unknown>
    const result = body.schema === "marketplace/v1"
      ? await evaluateMarketplaceContract(container, body as unknown as MarketplaceContract, {
        other_contracts: await loadOtherMarketplaceContracts(service, body as unknown as MarketplaceContract),
      })
      : await evaluateContract(container, body as unknown as CampaignContractBody)
    return new StepResponse({ ...result, contract_version: contract.version, trigger: input.trigger ?? "manual" })
  }
)

type EvaluatedCheck = Awaited<ReturnType<typeof evaluateContract>> & {
  contract_version: number
  trigger: "manual" | "scheduled"
}

const saveCheckRunStep = createStep(
  "save-check-run",
  async (check: EvaluatedCheck, { container }) => {
    const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
    const run = await service.createCheckRuns({
      contract_id: check.contract_id,
      contract_version: check.contract_version,
      trigger: check.trigger,
      total: check.summary.total,
      by_kind: check.summary.by_kind,
      result: check as unknown as Record<string, unknown>,
    })
    return new StepResponse({ ...check, run_id: run.id }, run.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
    await service.deleteCheckRuns(id)
  }
)

export const checkCampaignContractWorkflow = createWorkflow(
  "check-campaign-contract",
  (input: CheckCampaignContractInput) => {
    const evaluated = evaluateCampaignContractStep(input)
    const saved = saveCheckRunStep(evaluated)
    return new WorkflowResponse(saved)
  }
)
