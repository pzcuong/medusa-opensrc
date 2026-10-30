import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { FLASHSRE_MODULE } from "../../modules/flashsre"
import FlashsreModuleService from "../../modules/flashsre/service"

export type UpsertCampaignContractInput = {
  contract_id: string
  approved_by: string | null
  body: Record<string, unknown>
}

type Compensation = { created_id: string; retired_ids: string[] }

// Each upsert creates a new approved version and retires the previous approved ones
const createContractVersionStep = createStep(
  "create-contract-version",
  async (input: UpsertCampaignContractInput, { container }) => {
    const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
    const existing = await service.listCampaignContracts(
      { contract_id: input.contract_id },
      { order: { version: "DESC" } }
    )
    const retired = existing.filter((c) => c.status === "approved")
    if (retired.length) {
      await service.updateCampaignContracts(
        retired.map((c) => ({ id: c.id, status: "retired" as const }))
      )
    }
    const created = await service.createCampaignContracts({
      contract_id: input.contract_id,
      version: (existing[0]?.version ?? 0) + 1,
      status: "approved",
      approved_by: input.approved_by,
      body: input.body,
    })
    return new StepResponse(created, {
      created_id: created.id,
      retired_ids: retired.map((c) => c.id),
    } as Compensation)
  },
  async (comp, { container }) => {
    if (!comp) {
      return
    }
    const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
    await service.deleteCampaignContracts(comp.created_id)
    if (comp.retired_ids.length) {
      await service.updateCampaignContracts(
        comp.retired_ids.map((id) => ({ id, status: "approved" as const }))
      )
    }
  }
)

export const upsertCampaignContractWorkflow = createWorkflow(
  "upsert-campaign-contract",
  (input: UpsertCampaignContractInput) => {
    const contract = createContractVersionStep(input)
    return new WorkflowResponse(contract)
  }
)
