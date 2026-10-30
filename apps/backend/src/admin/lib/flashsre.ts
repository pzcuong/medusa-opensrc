export type TeamUser = { id: string; email: string; first_name: string | null; team: string | null }
export type Me = TeamUser & { is_platform_admin: boolean }
export type TeamEntry = { key: string; description: string; members: TeamUser[] }

export type ConfigChange = {
  id: string
  created_at: string
  team: string | null
  actor_email: string | null
  method: string
  route: string
  entity_type: string
  entity_id: string | null
  entity_label: string | null
  diff: { path: string; before: unknown; after: unknown }[] | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

export type Finding = {
  id: string
  invariant: string
  kind: "CONFIG_DRIFT" | "CROSS_TEAM_CONFLICT" | "ENGINE_GAP" | "MISSING_CONFIG" | "CONTRACT_CONFLICT" | "CONTRACT_GAP"
  severity: "high" | "medium" | "low"
  title: string
  teams_involved: string[]
  fix_owner: string
  entities: { type: string; id: string | null; label: string; owner_team: string | null }[]
  expected: unknown
  actual: unknown
  recent_changes: {
    id: string
    at: string
    team: string | null
    actor_email: string | null
    method: string
    route: string
    entity_label: string | null
    diff: { path: string; before: unknown; after: unknown }[] | null
  }[]
}

export type SimulationRow = {
  sku: string
  provider: string
  provider_name: string
  unit_price: number
  item_discounts: Record<string, number>
  shipping_fee: number
  shipping_support: number
  customer_pays: number
}

export type CheckResult = {
  contract_id: string
  contract_version: number
  checked_at: string
  trigger: "manual" | "scheduled"
  summary: { total: number; by_kind: Record<string, number>; by_fix_owner: Record<string, number> }
  simulation: SimulationRow[]
  findings: Finding[]
}

export type CheckRun = {
  id: string
  contract_id: string
  contract_version: number
  trigger: "manual" | "scheduled"
  total: number
  by_kind: Record<string, number>
  created_at: string
  result?: CheckResult
}

export type Contract = { id: string; contract_id: string; version: number; body: Record<string, any> }

export const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const r = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body.message ?? r.statusText)
  }
  return r.json()
}

export const KIND_LABEL: Record<Finding["kind"], string> = {
  CONFIG_DRIFT: "Lệch cấu hình",
  CROSS_TEAM_CONFLICT: "Xung đột liên team",
  ENGINE_GAP: "Giới hạn engine",
  MISSING_CONFIG: "Thiếu cấu hình",
  CONTRACT_CONFLICT: "Mâu thuẫn contract",
  CONTRACT_GAP: "Contract chưa quy định",
}

export const KIND_COLOR: Record<Finding["kind"], "orange" | "red" | "purple" | "grey" | "blue"> = {
  CONFIG_DRIFT: "orange",
  CROSS_TEAM_CONFLICT: "red",
  ENGINE_GAP: "purple",
  MISSING_CONFIG: "grey",
  CONTRACT_CONFLICT: "blue",
  CONTRACT_GAP: "blue",
}

const TEAM_COLORS = ["blue", "green", "orange", "purple", "red", "grey"] as const
export const teamColor = (team: string | null | undefined): (typeof TEAM_COLORS)[number] => {
  if (!team) {
    return "grey"
  }
  const order = ["merchandising", "seller_ops", "marketing", "logistics", "finance", "category"]
  const i = order.indexOf(team)
  return TEAM_COLORS[(i >= 0 ? i : team.length) % TEAM_COLORS.length]
}

export const vnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`

export const timeAgo = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) {
    return `${s} giây trước`
  }
  if (s < 3600) {
    return `${Math.round(s / 60)} phút trước`
  }
  if (s < 86400) {
    return `${Math.round(s / 3600)} giờ trước`
  }
  return new Date(iso).toLocaleString("vi-VN")
}

export const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v))
