import {
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { auditConfigChange } from "../lib/flashsre/audit-middleware"
import { AUDITED_ROUTE_MATCHER } from "../lib/flashsre/entities"
import { preflightPromotionCreate } from "../lib/flashsre/preflight-middleware"
import {
  GetAgentRunsSchema,
  GetCheckRunsSchema,
  GetConfigChangesSchema,
  GetMetricsSchema,
  GetPreflightSchema,
  PostAgentRunSchema,
  PostAssignTeamSchema,
  PostContractSchema,
  PostPreflightSchema,
  PostSandboxSchema,
} from "./admin/flashsre/validators"

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/admin/promotions",
      middlewares: [preflightPromotionCreate],
    },
    {
      method: ["POST", "DELETE"],
      matcher: AUDITED_ROUTE_MATCHER,
      middlewares: [auditConfigChange],
    },
    {
      method: ["GET"],
      matcher: "/admin/flashsre/preflight",
      middlewares: [validateAndTransformQuery(GetPreflightSchema, {})],
    },
    {
      method: ["POST"],
      matcher: "/admin/flashsre/preflight",
      middlewares: [validateAndTransformBody(PostPreflightSchema)],
    },
    {
      method: ["POST"],
      matcher: "/admin/flashsre/contracts",
      middlewares: [validateAndTransformBody(PostContractSchema)],
    },
    {
      method: ["GET"],
      matcher: "/admin/flashsre/config-changes",
      middlewares: [validateAndTransformQuery(GetConfigChangesSchema, {})],
    },
    {
      method: ["GET"],
      matcher: "/admin/flashsre/metrics",
      middlewares: [validateAndTransformQuery(GetMetricsSchema, {})],
    },
    {
      method: ["GET"],
      matcher: "/admin/flashsre/check-runs",
      middlewares: [validateAndTransformQuery(GetCheckRunsSchema, {})],
    },
    {
      method: ["POST"],
      matcher: "/admin/flashsre/contracts/:contract_id/sandbox",
      middlewares: [validateAndTransformBody(PostSandboxSchema)],
    },
    {
      method: ["GET"],
      matcher: "/admin/flashsre/agent-runs",
      middlewares: [validateAndTransformQuery(GetAgentRunsSchema, {})],
    },
    {
      method: ["POST"],
      matcher: "/admin/flashsre/agent-runs",
      middlewares: [validateAndTransformBody(PostAgentRunSchema)],
    },
    {
      method: ["POST"],
      matcher: "/admin/flashsre/teams/assign",
      middlewares: [validateAndTransformBody(PostAssignTeamSchema)],
    },
  ],
})
