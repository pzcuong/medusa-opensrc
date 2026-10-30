import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isPlatformAdmin, loadTeamDirectory } from "../../../../lib/flashsre/teams"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { catalog, members } = await loadTeamDirectory(req.scope)
  const me = members.find((m) => m.id === req.auth_context.actor_id) ?? null
  res.json({
    teams: Object.entries(catalog).map(([key, description]) => ({
      key,
      description,
      members: members.filter((m) => m.team === key),
    })),
    users: members,
    me: me ? { ...me, is_platform_admin: isPlatformAdmin(me) } : null,
  })
}
