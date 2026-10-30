import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { updateUsersWorkflow } from "@medusajs/medusa/core-flows"
import { isPlatformAdmin, loadTeamDirectory } from "../../../../../lib/flashsre/teams"
import type { PostAssignTeamType } from "../../validators"

export async function POST(req: AuthenticatedMedusaRequest<PostAssignTeamType>, res: MedusaResponse) {
  const { user_id, team } = req.validatedBody
  const { catalog, members } = await loadTeamDirectory(req.scope)
  const me = members.find((m) => m.id === req.auth_context.actor_id)
  if (!isPlatformAdmin(me)) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Chỉ platform admin (không thuộc team nghiệp vụ) mới được gán team")
  }
  if (team && !catalog[team]) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Team không tồn tại: ${team}`)
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "user", fields: ["id", "metadata"], filters: { id: user_id } })
  if (!data.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `User ${user_id} không tồn tại`)
  }
  const metadata = { ...((data[0].metadata as Record<string, unknown> | null) ?? {}), team }
  const { result } = await updateUsersWorkflow(req.scope).run({
    input: { updates: [{ id: user_id, metadata }] },
  })
  res.json({ user: result[0] })
}
