import { z } from "@medusajs/framework/zod"

export const PostContractSchema = z.object({
  contract_id: z.string().min(1),
  approved_by: z.string().nullable().optional(),
  body: z.record(z.string(), z.unknown()),
})
export type PostContractType = z.infer<typeof PostContractSchema>

export const GetConfigChangesSchema = z.object({
  entity_id: z.string().optional(),
  team: z.string().optional(),
  entity_type: z.string().optional(),
  since: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})
export type GetConfigChangesType = z.infer<typeof GetConfigChangesSchema>

export const GetMetricsSchema = z.object({
  window_hours: z.coerce.number().min(1).max(24 * 30).optional(),
})
export type GetMetricsType = z.infer<typeof GetMetricsSchema>

export const PostAssignTeamSchema = z.object({
  user_id: z.string().min(1),
  team: z.string().min(1).nullable(),
})
export type PostAssignTeamType = z.infer<typeof PostAssignTeamSchema>

export const GetCheckRunsSchema = z.object({
  contract_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})
export type GetCheckRunsType = z.infer<typeof GetCheckRunsSchema>

export const PostSandboxSchema = z.object({
  patches: z.array(z.object({ type: z.string() }).passthrough()).max(20),
})
export type PostSandboxType = z.infer<typeof PostSandboxSchema>

export const GetAgentRunsSchema = z.object({
  contract_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})
export type GetAgentRunsType = z.infer<typeof GetAgentRunsSchema>

export const PostAgentRunSchema = z.object({
  contract_id: z.string().min(1),
  finding_key: z.string().min(1),
  title: z.string().min(1),
  verdict: z.string().min(1),
  confidence: z.number().min(0).max(1),
  status: z.string().min(1),
  llm: z.string().min(1),
  dossier: z.record(z.string(), z.unknown()),
})
export type PostAgentRunType = z.infer<typeof PostAgentRunSchema>

export const GetPreflightSchema = z.object({
  promotion_id: z.string().min(1),
})
export type GetPreflightType = z.infer<typeof GetPreflightSchema>

export const PostPreflightSchema = z.object({
  promotion: z.record(z.string(), z.unknown()),
})
export type PostPreflightType = z.infer<typeof PostPreflightSchema>
