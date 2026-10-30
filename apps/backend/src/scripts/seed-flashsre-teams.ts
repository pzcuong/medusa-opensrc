import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { createUsersWorkflow, updateUsersWorkflow } from "@medusajs/medusa/core-flows"

// One admin account per business team; audit records attribute changes through metadata.team
export const FLASHSRE_TEAMS = [
  { team: "merchandising", email: "merch@flashsre.dev", first_name: "Merchandising" },
  { team: "seller_ops", email: "sellerops@flashsre.dev", first_name: "Seller Ops" },
  { team: "marketing", email: "marketing@flashsre.dev", first_name: "Marketing" },
  { team: "logistics", email: "logistics@flashsre.dev", first_name: "Logistics" },
  { team: "finance", email: "finance@flashsre.dev", first_name: "Finance" },
  { team: "category", email: "category@flashsre.dev", first_name: "Category Gia dung" },
]

export default async function seedFlashsreTeams({ container }: ExecArgs) {
  const password = process.env.FLASHSRE_TEAM_PASSWORD
  if (!password) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Set FLASHSRE_TEAM_PASSWORD before seeding team accounts")
  }
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const authService = container.resolve(Modules.AUTH)

  for (const t of FLASHSRE_TEAMS) {
    const { data: existing } = await query.graph({ entity: "user", fields: ["id"], filters: { email: t.email } })
    if (existing.length) {
      await updateUsersWorkflow(container).run({
        input: { updates: [{ id: existing[0].id, metadata: { team: t.team } }] },
      })
      logger.info(`[flashsre] ${t.email} exists, team=${t.team}`)
      continue
    }
    const { result: users } = await createUsersWorkflow(container).run({
      input: { users: [{ email: t.email, first_name: t.first_name, metadata: { team: t.team } }] },
    })
    const { authIdentity, error } = await authService.register("emailpass", { body: { email: t.email, password } })
    if (error || !authIdentity) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, `Cannot register ${t.email}: ${error}`)
    }
    await authService.updateAuthIdentities({ id: authIdentity.id, app_metadata: { user_id: users[0].id } })
    logger.info(`[flashsre] created ${t.email}, team=${t.team}`)
  }
}
