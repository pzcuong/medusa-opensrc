import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FLASHSRE_MODULE } from "../../modules/flashsre"
import type FlashsreModuleService from "../../modules/flashsre/service"

export const DEFAULT_TEAMS: Record<string, string> = {
  merchandising: "Giá, SKU, flash sale",
  seller_ops: "Voucher shop",
  marketing: "Voucher sàn, phân khúc, chương trình freeship",
  logistics: "Provider, phí ship, vùng giao",
  finance: "Ngân sách, trần trợ giá",
  category: "Ưu đãi ngành hàng",
}

export type TeamUser = { id: string; email: string; first_name: string | null; team: string | null }

export async function loadTeamDirectory(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const flashsre: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
  const { data: users } = await query.graph({ entity: "user", fields: ["id", "email", "first_name", "metadata"] })
  const contracts = await flashsre.listCampaignContracts({ status: "approved" })
  const catalog: Record<string, string> = { ...DEFAULT_TEAMS }
  for (const c of contracts) {
    Object.assign(catalog, ((c.body as Record<string, any>)?.teams ?? {}) as Record<string, string>)
  }
  const members: TeamUser[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    first_name: u.first_name ?? null,
    team: ((u.metadata as Record<string, any> | null)?.team as string | undefined) ?? null,
  }))
  return { catalog, members }
}

// A user without a business team is a platform admin and may manage team membership
export function isPlatformAdmin(user: TeamUser | undefined) {
  return !!user && !user.team
}
