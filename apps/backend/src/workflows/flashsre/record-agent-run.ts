import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { FLASHSRE_MODULE } from "../../modules/flashsre"
import FlashsreModuleService from "../../modules/flashsre/service"

export type RecordAgentRunInput = {
  contract_id: string
  finding_key: string
  title: string
  verdict: string
  confidence: number
  status: string
  llm: string
  dossier: Record<string, unknown>
}

const createAgentRunStep = createStep(
  "create-agent-run",
  async (input: RecordAgentRunInput, { container }) => {
    const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
    const run = await service.createAgentRuns(input)
    return new StepResponse(run, run.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
    await service.deleteAgentRuns(id)
  }
)

export const recordAgentRunWorkflow = createWorkflow(
  "record-agent-run",
  (input: RecordAgentRunInput) => {
    const run = createAgentRunStep(input)
    return new WorkflowResponse(run)
  }
)
