import { MedusaService } from "@medusajs/framework/utils"
import AgentRun from "./models/agent-run"
import CampaignContract from "./models/campaign-contract"
import CheckRun from "./models/check-run"
import ConfigChange from "./models/config-change"

class FlashsreModuleService extends MedusaService({
  ConfigChange,
  CampaignContract,
  CheckRun,
  AgentRun,
}) {}

export default FlashsreModuleService
