import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { evaluateMarketplaceContract, MarketplaceContract, Patch } from "../../lib/flashsre/marketplace-check"
import { FLASHSRE_MODULE } from "../../modules/flashsre"
import FlashsreModuleService from "../../modules/flashsre/service"
import { loadOtherMarketplaceContracts } from "./check-campaign-contract"

export type SandboxCampaignContractInput = { contract_id: string; patches: Patch[] }

// Re-runs the contract check with candidate patches applied to shadow copies; live config is untouched
const evaluateCampaignSandboxStep = createStep(
  "evaluate-campaign-sandbox",
  async (input: SandboxCampaignContractInput, { container }) => {
    const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
    const [contract] = await service.listCampaignContracts(
      { contract_id: input.contract_id, status: "approved" },
      { order: { version: "DESC" }, take: 1 }
    )
    if (!contract) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `No approved contract ${input.contract_id}`)
    }
    const body = contract.body as unknown as MarketplaceContract
    if (body.schema !== "marketplace/v1") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Sandbox chỉ hỗ trợ contract marketplace/v1")
    }
    const result = await evaluateMarketplaceContract(container, body, {
      patches: input.patches,
      sandbox: true,
      other_contracts: await loadOtherMarketplaceContracts(service, body),
    })
    return new StepResponse({ ...result, contract_version: contract.version, patches: input.patches })
  }
)

export const sandboxCampaignContractWorkflow = createWorkflow(
  "sandbox-campaign-contract",
  (input: SandboxCampaignContractInput) => {
    const result = evaluateCampaignSandboxStep(input)
    return new WorkflowResponse(result)
  }
)
