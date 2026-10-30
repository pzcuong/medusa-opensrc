import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FLASHSRE_MODULE } from "../../modules/flashsre"
import type FlashsreModuleService from "../../modules/flashsre/service"

type Row = Record<string, any>

// Lessons are agent runs recorded under this pseudo contract once an incident is resolved and verified
export const LESSON_CONTRACT = "FLASHSRE-LESSONS"

export type Lesson = {
  id: string
  kind: string
  title: string
  severity: string
  learned_at?: string
  facts: string[]
  unless?: string[]
  evidence: string[]
  guardrails: { id: string; text: string }[]
  benchmarks: string[]
  params?: { bulky_category_handle?: string }
}

export type PreflightMatch = {
  lesson_id: string
  title: string
  severity: string
  covered: boolean
  guardrails: string[]
  evidence: string[]
  benchmarks: string[]
  learned_at: string | null
}

export type PreflightResult = {
  verdict: "pass" | "covered" | "warn"
  facts: string[]
  matched: PreflightMatch[]
  checked_lessons: number
}

type RuleInput = { attribute: string; operator?: string; values?: (string | { value: string })[] }
export type PromotionDraft = {
  id?: string
  code?: string
  campaign_id?: string | null
  application_method?: { type?: string; value?: number | string; target_type?: string; target_rules?: RuleInput[] }
  rules?: RuleInput[]
}

const valuesOf = (r: RuleInput) => (r.values ?? []).map((v) => (typeof v === "string" ? v : v.value))

export async function loadLessons(container: MedusaContainer): Promise<Lesson[]> {
  const service: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
  const runs = await service.listAgentRuns({ contract_id: LESSON_CONTRACT, status: "lesson" }, { order: { created_at: "DESC" }, take: 100 })
  const latest = new Map<string, Lesson>()
  for (const r of runs) {
    if (!latest.has(r.finding_key)) {
      latest.set(r.finding_key, r.dossier as unknown as Lesson)
    }
  }
  return [...latest.values()]
}

// Configuration signals of a promotion, named the same way the agent names them in its lessons
export async function promotionFacts(container: MedusaContainer, p: PromotionDraft, lessons: Lesson[]) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const am = p.application_method ?? {}
  const facts = new Set<string>()
  let campaign: Row | null = null
  if (p.campaign_id) {
    const { data } = await query.graph({ entity: "campaign", fields: ["id", "description", "budget.limit"], filters: { id: p.campaign_id } })
    campaign = data[0] ?? null
  }
  if (am.target_type === "shipping_methods" && campaign?.budget?.limit != null) {
    facts.add("freeship_with_budget")
  }
  // The budget-slot runbook is declared on the campaign so the agent can release the budget hour by hour
  if (String(campaign?.description ?? "").includes("flashsre:budget_slots")) {
    facts.add("budget_slots")
  }
  const segmented = (p.rules ?? []).some((r) => r.attribute === "customer.groups.id")
  if (am.type === "percentage" && am.target_type === "items" && segmented) {
    const { data: promos } = await query.graph({
      entity: "promotion",
      fields: ["id", "application_method.type", "application_method.value", "application_method.target_type"],
    })
    const fullFreeship = promos.some(
      (x: Row) => x.id !== p.id && x.application_method?.target_type === "shipping_methods" && x.application_method?.type === "percentage" && Number(x.application_method?.value) >= 100
    )
    if (fullFreeship) {
      facts.add("segment_pct_with_full_freeship")
    }
    // A bulky category is whatever category the agent found losing money in its incident
    const handles = lessons.map((l) => l.params?.bulky_category_handle).filter((h): h is string => !!h)
    if (handles.length) {
      const { data: cats } = await query.graph({ entity: "product_category", fields: ["id"], filters: { handle: handles } })
      const bulky = new Set(cats.map((c: Row) => c.id as string))
      const catRule = (am.target_rules ?? []).find((r) => r.attribute === "items.product.categories.id")
      const scoped = !!catRule && (catRule.operator ?? "in") === "in" && valuesOf(catRule).length > 0
      if (catRule && scoped && !valuesOf(catRule).some((v) => bulky.has(v))) {
        facts.add("bulky_capped")
      }
    }
  }
  return [...facts]
}

export async function preflightPromotion(container: MedusaContainer, p: PromotionDraft): Promise<PreflightResult> {
  const lessons = await loadLessons(container)
  const facts = await promotionFacts(container, p, lessons)
  const matched = lessons
    .filter((l) => l.facts.every((f) => facts.includes(f)))
    .map((l) => ({
      lesson_id: l.id,
      title: l.title,
      severity: l.severity,
      covered: (l.unless ?? []).some((f) => facts.includes(f)),
      guardrails: l.guardrails.map((g) => g.text),
      evidence: l.evidence,
      benchmarks: l.benchmarks,
      learned_at: l.learned_at ?? null,
    }))
  const verdict = !matched.length ? "pass" : matched.every((m) => m.covered) ? "covered" : "warn"
  return { verdict, facts, matched, checked_lessons: lessons.length }
}

export const PROMOTION_PREFLIGHT_FIELDS = [
  "id",
  "code",
  "campaign_id",
  "application_method.type",
  "application_method.value",
  "application_method.target_type",
  "application_method.target_rules.attribute",
  "application_method.target_rules.operator",
  "application_method.target_rules.values.value",
  "rules.attribute",
  "rules.operator",
  "rules.values.value",
]
