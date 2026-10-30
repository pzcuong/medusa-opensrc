import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { recordConfigChangeWorkflow } from "../../workflows/flashsre/record-config-change"
import { diffEntities } from "./diff"
import { extractEntityId, findAuditedSpec, isRootEntityPath, loadEntity } from "./entities"

// Captures before/after state of every admin config write and records who (and which team) made it
export async function auditConfigChange(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const path = (req.originalUrl || req.url).split("?")[0]
  const spec = findAuditedSpec(path)
  if (!spec || !["POST", "DELETE"].includes(req.method)) {
    return next()
  }
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const pathId = extractEntityId(path, spec.prefix)
  let before: Record<string, any> | null = null
  if (pathId) {
    before = await loadEntity(req.scope, spec, pathId).catch((e) => {
      logger.warn(`[flashsre-audit] cannot load ${spec.entity} ${pathId}: ${e.message}`)
      return null
    })
  }

  let responseBody: Record<string, any> | undefined
  const originalJson = res.json.bind(res)
  res.json = ((body: Record<string, any>) => {
    responseBody = body
    return originalJson(body)
  }) as typeof res.json

  res.on("finish", () => {
    if (res.statusCode >= 400) {
      return
    }
    const record = async () => {
      const entityId = pathId ?? responseBody?.[spec.responseKey]?.id ?? null
      const deleted = req.method === "DELETE" && isRootEntityPath(path, spec.prefix)
      const after = entityId && !deleted ? await loadEntity(req.scope, spec, entityId) : null
      const actorId = (req as AuthenticatedMedusaRequest).auth_context?.actor_id ?? null
      let actorEmail: string | null = null
      let team: string | null = null
      if (actorId) {
        const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
        const { data } = await query.graph({
          entity: "user",
          fields: ["id", "email", "metadata"],
          filters: { id: actorId },
        })
        actorEmail = data?.[0]?.email ?? null
        team = (data?.[0]?.metadata as Record<string, any> | null)?.team ?? null
      }
      await recordConfigChangeWorkflow(req.scope).run({
        input: {
          actor_id: actorId,
          actor_email: actorEmail,
          team,
          method: req.method,
          route: path,
          entity_type: spec.entity,
          entity_id: entityId,
          entity_label: spec.label(after ?? before ?? {}),
          status_code: res.statusCode,
          request_body: (req.body as Record<string, unknown>) ?? null,
          before,
          after,
          diff: diffEntities(before, after),
        },
      })
    }
    record().catch((e) => logger.warn(`[flashsre-audit] failed to record ${req.method} ${path}: ${e.message}`))
  })

  next()
}
