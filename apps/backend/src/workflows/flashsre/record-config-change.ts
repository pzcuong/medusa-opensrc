import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { FLASHSRE_MODULE } from "../../modules/flashsre"
import FlashsreModuleService from "../../modules/flashsre/service"

export type RecordConfigChangeInput = {
  actor_id: string | null
  actor_email: string | null
  team: string | null
  method: string
  route: string
  entity_type: string
  entity_id: string | null
  entity_label: string | null
  status_code: number
  request_body: Record<string, unknown> | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  diff: Record<string, unknown>[] | null
}

const createConfigChangeStep = createStep(
  "create-config-change",
  async (input: RecordConfigChangeInput, { container }) => {
    const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
    const change = await service.createConfigChanges({
      ...input,
      diff: input.diff as unknown as Record<string, unknown> | null,
    })
    return new StepResponse(change, change.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
    await service.deleteConfigChanges(id)
  }
)

export const recordConfigChangeWorkflow = createWorkflow(
  "record-config-change",
  (input: RecordConfigChangeInput) => {
    const change = createConfigChangeStep(input)
    return new WorkflowResponse(change)
  }
)
