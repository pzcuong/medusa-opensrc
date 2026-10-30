import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { preflightPromotion, PromotionDraft } from "../../lib/flashsre/preflight"

// Read-only: matches a promotion (saved or about to be saved) against the lessons the agent learned from past incidents
const evaluatePreflightStep = createStep(
  "evaluate-preflight",
  async (input: PromotionDraft, { container }) => {
    const result = await preflightPromotion(container, input)
    return new StepResponse(result)
  }
)

export const preflightPromotionWorkflow = createWorkflow(
  "preflight-promotion",
  (input: PromotionDraft) => {
    const result = evaluatePreflightStep(input)
    return new WorkflowResponse(result)
  }
)
