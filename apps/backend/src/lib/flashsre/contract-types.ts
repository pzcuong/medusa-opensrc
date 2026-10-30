export type VoucherClause = {
  code: string
  owner: string
  sponsor: string
  type: "fixed" | "percentage"
  value: number
  cap?: number
  min_spend?: number
  min_spend_base?: "item_subtotal" | "item_total"
  segments: "ALL" | string[]
}

export type CampaignContractBody = {
  contract_id: string
  title: string
  market: { currency: string; country: string }
  teams: Record<string, string>
  flash: { price_list_title: string; price: number; skus: string[]; owner: string }
  vouchers: VoucherClause[]
  freeship: {
    code: string
    owner: string
    support: number
    threshold: number
    threshold_base: "item_subtotal" | "item_total"
    providers_included: string[]
    providers_excluded: string[]
  }
  stacking: { allowed_codes: string[]; max_item_discount_per_order: number }
  budgets: { campaign_identifier: string; owner: string; min_limit: number }[]
  hero_must_qualify: boolean
}

export type FindingKind = "CONFIG_DRIFT" | "CROSS_TEAM_CONFLICT" | "ENGINE_GAP" | "MISSING_CONFIG" | "CONTRACT_CONFLICT" | "CONTRACT_GAP"

export type FindingEntity = { type: string; id: string | null; label: string; owner_team: string | null }

export type Finding = {
  id: string
  invariant: string
  kind: FindingKind
  severity: "high" | "medium" | "low"
  title: string
  teams_involved: string[]
  fix_owner: string
  entities: FindingEntity[]
  expected: unknown
  actual: unknown
  recent_changes: Record<string, unknown>[]
  affected?: Record<string, unknown>
}
