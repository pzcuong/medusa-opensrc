import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FLASHSRE_MODULE } from "../modules/flashsre"
import FlashsreModuleService from "../modules/flashsre/service"
import { checkCampaignContractWorkflow } from "../workflows/flashsre/check-campaign-contract"

// Re-checks every approved contract so drift is caught without anyone pressing a button
export default async function flashsreContractCheck(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
  const contracts = await service.listCampaignContracts({ status: "approved" })
  for (const c of contracts) {
    const { result } = await checkCampaignContractWorkflow(container).run({
      input: { contract_id: c.contract_id, trigger: "scheduled" },
    })
    logger.info(`[flashsre] ${c.contract_id} v${c.version}: ${result.summary.total} findings`)
  }
}

export const config = {
  name: "flashsre-contract-check",
  schedule: "*/5 * * * *",
}
