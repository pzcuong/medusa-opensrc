import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FLASHSRE_MODULE } from "../../modules/flashsre"
import type FlashsreModuleService from "../../modules/flashsre/service"
import type { CampaignContractBody, Finding, FindingEntity, FindingKind } from "./contract-types"
import { AUDITED_ENTITIES } from "./entities"

type Row = Record<string, any>

const PROMO_FIELDS = [
  ...AUDITED_ENTITIES.find((s) => s.entity === "promotion")!.fields,
  "campaign.campaign_identifier",
]
const THRESHOLD_ATTRIBUTES = ["item_subtotal", "item_total", "subtotal", "total"]

const num = (v: unknown) => Number(v ?? 0)
const ruleOf = (list: Row[] | undefined, attribute: string) => (list ?? []).find((r) => r.attribute === attribute)
const valuesOf = (rule: Row | undefined) => (rule?.values ?? []).map((v: Row) => String(v.value)).sort()
const thresholdRule = (promo: Row) =>
  (promo.rules ?? []).find((r: Row) => THRESHOLD_ATTRIBUTES.includes(r.attribute) && ["gte", "gt"].includes(r.operator))
const sameSet = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

export type ContractCheckResult = {
  contract_id: string
  checked_at: string
  summary: { total: number; by_kind: Record<string, number>; by_fix_owner: Record<string, number> }
  simulation: Row[]
  findings: Finding[]
}

export async function evaluateContract(
  container: MedusaContainer,
  contract: CampaignContractBody
): Promise<ContractCheckResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const promotionModule = container.resolve(Modules.PROMOTION)
  const flashsre: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
  const { market } = contract
  const now = Date.now()

  const promotions = (await query.graph({ entity: "promotion", fields: PROMO_FIELDS })).data as Row[]
  const byCode = new Map<string, Row>(promotions.map((p: Row) => [p.code, p]))
  const priceLists = (await query.graph({
    entity: "price_list",
    fields: ["id", "title", "status", "starts_at", "ends_at", "prices.amount", "prices.currency_code", "prices.price_set_id"],
    filters: { title: contract.flash.price_list_title },
  })).data as Row[]
  const priceList: Row | undefined = priceLists[0]
  const variants = (await query.graph({
    entity: "product_variant",
    fields: [
      "id", "sku", "title", "price_set.id", "price_set.prices.amount", "price_set.prices.currency_code",
      "price_set.prices.price_list_id", "product.id", "product.handle", "product.categories.id",
    ],
    filters: { sku: contract.flash.skus },
  })).data as Row[]
  const shippingOptions = (await query.graph({
    entity: "shipping_option",
    fields: [
      "id", "name", "type.id", "type.code", "prices.amount", "prices.currency_code",
      "service_zone.geo_zones.country_code",
    ],
  })).data as Row[]
  const marketOptions = shippingOptions.filter((o: Row) =>
    (o.service_zone?.geo_zones ?? []).some((g: Row) => g.country_code === market.country)
  )
  const campaigns = (await query.graph({
    entity: "campaign",
    fields: ["id", "campaign_identifier", "budget.type", "budget.limit", "budget.used", "budget.currency_code"],
  })).data as Row[]
  const changes = await flashsre.listConfigChanges({}, {
    order: { created_at: "DESC" }, take: 500,
    select: ["id", "entity_id", "team", "created_at", "actor_email", "method", "route", "entity_label", "diff"],
  })

  const lastTeamOf = (entityId: string | null) =>
    entityId ? (changes.find((c) => c.entity_id === entityId)?.team ?? null) : null
  const findings: Finding[] = []
  const add = (f: {
    invariant: string
    kind: FindingKind
    severity: Finding["severity"]
    title: string
    fix_owner: string
    entities: FindingEntity[]
    expected: unknown
    actual: unknown
    extra_teams?: string[]
  }) => {
    const ids = f.entities.map((e) => e.id).filter(Boolean)
    const recent = changes
      .filter((c) => ids.includes(c.entity_id))
      .slice(0, 5)
      .map((c) => ({
        id: c.id, at: c.created_at, team: c.team, actor_email: c.actor_email, method: c.method,
        route: c.route, entity_label: c.entity_label, diff: c.diff,
      }))
    const teams = new Set<string>([
      ...f.entities.map((e) => e.owner_team).filter((t): t is string => !!t),
      ...recent.map((c) => c.team).filter((t): t is string => !!t),
      ...(f.extra_teams ?? []),
    ])
    findings.push({
      id: `F${findings.length + 1}`,
      invariant: f.invariant,
      kind: f.kind,
      severity: f.severity,
      title: f.title,
      teams_involved: [...teams],
      fix_owner: f.fix_owner,
      entities: f.entities,
      expected: f.expected,
      actual: f.actual,
      recent_changes: recent,
    })
  }
  const promoEntity = (code: string, owner: string): FindingEntity => ({
    type: "promotion", id: byCode.get(code)?.id ?? null, label: code, owner_team: owner,
  })
  const flashEntity: FindingEntity = {
    type: "price_list", id: priceList?.id ?? null, label: contract.flash.price_list_title, owner_team: contract.flash.owner,
  }

  // I1 flash price covers every SKU at the approved price, and the list is live
  const livePrice = new Map<string, number>()
  if (!priceList) {
    add({
      invariant: "FLASH_PRICE_LIST_EXISTS", kind: "MISSING_CONFIG", severity: "high",
      title: "Không tìm thấy price list flash sale của campaign", fix_owner: contract.flash.owner,
      entities: [flashEntity], expected: contract.flash.price_list_title, actual: null,
    })
  }
  const listActive = !!priceList && priceList.status === "active" &&
    (!priceList.starts_at || new Date(priceList.starts_at).getTime() <= now) &&
    (!priceList.ends_at || new Date(priceList.ends_at).getTime() >= now)
  for (const sku of contract.flash.skus) {
    const v = variants.find((x: Row) => x.sku === sku)
    if (!v) {
      continue
    }
    const base = (v.price_set?.prices ?? []).find((p: Row) => p.currency_code === market.currency && !p.price_list_id)
    const flash = (priceList?.prices ?? []).find(
      (p: Row) => p.price_set_id === v.price_set?.id && p.currency_code === market.currency
    )
    livePrice.set(sku, listActive && flash ? num(flash.amount) : num(base?.amount))
    if (!flash) {
      add({
        invariant: "FLASH_PRICE_COVERS_ALL_VARIANTS", kind: "CONFIG_DRIFT", severity: "high",
        title: `Biến thể ${sku} không có giá flash, khách trả giá niêm yết ${num(base?.amount)}`,
        fix_owner: contract.flash.owner,
        entities: [flashEntity, { type: "product", id: v.product.id, label: v.product.handle, owner_team: contract.flash.owner }],
        expected: contract.flash.price, actual: null,
      })
    } else if (num(flash.amount) !== contract.flash.price) {
      add({
        invariant: "FLASH_PRICE_MATCHES_CONTRACT", kind: "CONFIG_DRIFT", severity: "medium",
        title: `Giá flash của ${sku} là ${num(flash.amount)}, contract duyệt ${contract.flash.price}`,
        fix_owner: contract.flash.owner, entities: [flashEntity], expected: contract.flash.price, actual: num(flash.amount),
      })
    }
  }

  // I2 each voucher matches its clause: value, threshold base and segment
  for (const clause of contract.vouchers) {
    const promo = byCode.get(clause.code)
    const entity = promoEntity(clause.code, clause.owner)
    if (!promo || promo.status !== "active") {
      add({
        invariant: "VOUCHER_ACTIVE", kind: "MISSING_CONFIG", severity: "high",
        title: `Voucher ${clause.code} không tồn tại hoặc không active`, fix_owner: clause.owner,
        entities: [entity], expected: "active", actual: promo?.status ?? null,
      })
      continue
    }
    const am = promo.application_method ?? {}
    if (am.type !== clause.type || num(am.value) !== clause.value) {
      add({
        invariant: "VOUCHER_VALUE", kind: "CONFIG_DRIFT", severity: "high",
        title: `Giá trị voucher ${clause.code} lệch contract`, fix_owner: clause.owner, entities: [entity],
        expected: { type: clause.type, value: clause.value }, actual: { type: am.type, value: num(am.value) },
      })
    }
    const tr = thresholdRule(promo)
    if (clause.min_spend && (!tr || tr.attribute !== clause.min_spend_base || num(valuesOf(tr)[0]) !== clause.min_spend)) {
      add({
        invariant: "VOUCHER_MIN_SPEND", kind: "CONFIG_DRIFT", severity: "high",
        title: `Điều kiện đơn tối thiểu của ${clause.code} lệch contract`, fix_owner: clause.owner, entities: [entity],
        expected: { attribute: clause.min_spend_base, gte: clause.min_spend },
        actual: tr ? { attribute: tr.attribute, [tr.operator]: num(valuesOf(tr)[0]) } : null,
      })
    }
    const seg = ruleOf(promo.rules, "customer.groups.id")
    if ((clause.segments === "ALL" && seg) || (clause.segments !== "ALL" && !sameSet(valuesOf(seg), clause.segments))) {
      add({
        invariant: "VOUCHER_SEGMENT", kind: "CONFIG_DRIFT", severity: "high",
        title: `Phân khúc khách của ${clause.code} lệch contract`, fix_owner: clause.owner, entities: [entity],
        expected: clause.segments, actual: seg ? valuesOf(seg) : "ALL",
      })
    }
  }

  // I3 freeship: threshold base and the provider list it targets
  const fs = contract.freeship
  const fsPromo = byCode.get(fs.code)
  const fsEntity = promoEntity(fs.code, fs.owner)
  const typeIdToCode = new Map<string, string>(marketOptions.map((o: Row) => [o.type?.id, o.type?.code]))
  if (!fsPromo || fsPromo.status !== "active") {
    add({
      invariant: "FREESHIP_ACTIVE", kind: "MISSING_CONFIG", severity: "high", title: `Freeship ${fs.code} không active`,
      fix_owner: fs.owner, entities: [fsEntity], expected: "active", actual: fsPromo?.status ?? null,
    })
  } else {
    const tr = thresholdRule(fsPromo)
    if (!tr || tr.attribute !== fs.threshold_base || num(valuesOf(tr)[0]) !== fs.threshold) {
      add({
        invariant: "FREESHIP_THRESHOLD_BASE", kind: "CONFIG_DRIFT", severity: "high",
        title: "Freeship xét ngưỡng sai cơ sở hoặc sai giá trị (contract: trước voucher)",
        fix_owner: fs.owner, entities: [fsEntity],
        expected: { attribute: fs.threshold_base, gte: fs.threshold },
        actual: tr ? { attribute: tr.attribute, [tr.operator]: num(valuesOf(tr)[0]) } : null,
      })
    }
    const target = ruleOf(fsPromo.application_method?.target_rules, "shipping_methods.shipping_option.shipping_option_type_id")
    const targeted = valuesOf(target).map((id: string) => typeIdToCode.get(id) ?? id)
    if (!sameSet(targeted, fs.providers_included)) {
      add({
        invariant: "FREESHIP_PROVIDERS", kind: "CONFIG_DRIFT", severity: "high",
        title: "Danh sách provider được freeship lệch contract", fix_owner: fs.owner, entities: [fsEntity],
        expected: fs.providers_included, actual: targeted,
      })
    }
  }

  // I4 cross-team: every provider serving the market is explicitly in or out of freeship, and priced
  const declared = new Set([...fs.providers_included, ...fs.providers_excluded])
  for (const o of marketOptions) {
    const optionEntity: FindingEntity = { type: "shipping_option", id: o.id, label: o.name, owner_team: lastTeamOf(o.id) ?? "logistics" }
    if (!(o.prices ?? []).some((p: Row) => p.currency_code === market.currency)) {
      add({
        invariant: "PROVIDER_PRICED_IN_MARKET", kind: "CONFIG_DRIFT", severity: "medium",
        title: `Shipping option "${o.name}" phục vụ ${market.country} nhưng không có giá ${market.currency}`,
        fix_owner: "logistics", entities: [optionEntity], expected: market.currency,
        actual: (o.prices ?? []).map((p: Row) => p.currency_code),
      })
      continue
    }
    if (!declared.has(o.type?.code)) {
      add({
        invariant: "PROVIDER_DECLARED_IN_FREESHIP", kind: "CROSS_TEAM_CONFLICT", severity: "high",
        title: `Provider "${o.name}" đang bán ở ${market.country} nhưng contract freeship không khai báo (không thuộc cả danh sách được/không được hỗ trợ)`,
        fix_owner: fs.owner, entities: [optionEntity, fsEntity],
        expected: [...declared], actual: o.type?.code ?? null,
      })
    }
  }

  // I5 finance budgets
  for (const b of contract.budgets) {
    const c = campaigns.find((x: Row) => x.campaign_identifier === b.campaign_identifier)
    const limit = num(c?.budget?.limit)
    if (!c || limit < b.min_limit) {
      add({
        invariant: "BUDGET_LIMIT", kind: c ? "CONFIG_DRIFT" : "MISSING_CONFIG", severity: "high",
        title: `Ngân sách ${b.campaign_identifier} là ${limit}, thấp hơn mức tối thiểu ${b.min_limit}`,
        fix_owner: b.owner, entities: [{ type: "campaign", id: c?.id ?? null, label: b.campaign_identifier, owner_team: b.owner }],
        expected: { min_limit: b.min_limit }, actual: { limit, used: num(c?.budget?.used) },
      })
    }
  }

  // I6 cross-team: the live hero price must still reach every voucher and freeship threshold
  if (contract.hero_must_qualify) {
    for (const [sku, price] of livePrice) {
      const gates = [
        ...contract.vouchers.filter((v) => v.min_spend).map((v) => ({ code: v.code, owner: v.owner, min: v.min_spend! })),
        { code: fs.code, owner: fs.owner, min: fs.threshold },
      ].filter((g) => price < g.min)
      if (gates.length) {
        add({
          invariant: "HERO_PRICE_REACHES_THRESHOLDS", kind: "CROSS_TEAM_CONFLICT", severity: "high",
          title: `Giá hiện tại của ${sku} (${price}) thấp hơn ngưỡng của ${gates.map((g) => g.code).join(", ")}: khách mất các ưu đãi này`,
          fix_owner: `${contract.flash.owner} + ${[...new Set(gates.map((g) => g.owner))].join(" + ")}`,
          entities: [flashEntity, ...gates.map((g) => promoEntity(g.code, g.owner))],
          expected: { hero_price_gte: Math.max(...gates.map((g) => g.min)) }, actual: { hero_price: price },
        })
      }
    }
  }

  // I7 cross-team: automatic promotions outside the contract that stack on the hero SKUs
  const heroCategories = new Set<string>(variants.flatMap((v: Row) => (v.product?.categories ?? []).map((c: Row) => c.id)))
  const heroProducts = new Set<string>(variants.map((v: Row) => v.product?.id))
  for (const p of promotions as Row[]) {
    if (!p.is_automatic || p.status !== "active" || contract.stacking.allowed_codes.includes(p.code)) {
      continue
    }
    const currency = ruleOf(p.rules, "currency_code")
    if (currency && !valuesOf(currency).includes(market.currency)) {
      continue
    }
    const targets = p.application_method?.target_rules ?? []
    const cat = ruleOf(targets, "items.product.categories.id")
    const prod = ruleOf(targets, "items.product.id")
    const hits = p.application_method?.target_type === "order" || !targets.length ||
      valuesOf(cat).some((id: string) => heroCategories.has(id)) || valuesOf(prod).some((id: string) => heroProducts.has(id))
    if (hits) {
      add({
        invariant: "NO_UNPLANNED_STACKING", kind: "CROSS_TEAM_CONFLICT", severity: "high",
        title: `Ưu đãi tự động ${p.code} ngoài contract đang cộng dồn lên SKU chủ lực (engine không có cờ chặn cộng dồn)`,
        fix_owner: `${lastTeamOf(p.id) ?? "chủ sở hữu promotion"} + marketing`,
        entities: [{ type: "promotion", id: p.id, label: p.code, owner_team: lastTeamOf(p.id) }],
        expected: contract.stacking.allowed_codes, actual: p.code,
      })
    }
  }

  // Engine simulation: the hero cart through the real promotion engine, one row per SKU x provider
  const simulation: Row[] = []
  const voucherCodes = contract.vouchers.map((v) => v.code)
  for (const v of variants as Row[]) {
    const price = livePrice.get(v.sku) ?? 0
    for (const o of marketOptions.filter((x: Row) => (x.prices ?? []).some((p: Row) => p.currency_code === market.currency))) {
      const fee = num(o.prices.find((p: Row) => p.currency_code === market.currency).amount)
      const context = {
        currency_code: market.currency,
        item_subtotal: price, item_total: price, subtotal: price, total: price,
        items: [{
          id: "flashsre_sim_item", quantity: 1, subtotal: price, original_total: price, total: price,
          is_discountable: true, variant_id: v.id, product_id: v.product.id,
          product: { id: v.product.id, categories: (v.product.categories ?? []).map((c: Row) => ({ id: c.id })) },
        }],
        shipping_methods: [{
          id: "flashsre_sim_ship", subtotal: fee, total: fee, original_total: fee, amount: fee,
          shipping_option_id: o.id, shipping_option: { shipping_option_type_id: o.type?.id },
        }],
      }
      const actions = (await promotionModule.computeActions(voucherCodes, context as any)) as Row[]
      const itemDiscounts: Record<string, number> = {}
      let support = 0
      for (const a of actions) {
        if (a.action === "addItemAdjustment") {
          itemDiscounts[a.code] = (itemDiscounts[a.code] ?? 0) + num(a.amount)
        }
        if (a.action === "addShippingMethodAdjustment") {
          support += num(a.amount)
        }
      }
      const totalItemDiscount = Object.values(itemDiscounts).reduce((x, y) => x + y, 0)
      simulation.push({
        sku: v.sku, provider: o.type?.code, provider_name: o.name, unit_price: price, item_discounts: itemDiscounts,
        shipping_fee: fee, shipping_support: support, customer_pays: price - totalItemDiscount + fee - support,
      })
    }
  }

  // I8 engine gap: caps the engine cannot express, measured on the simulation
  for (const clause of contract.vouchers.filter((c) => c.cap)) {
    const worst = Math.max(0, ...simulation.map((s) => s.item_discounts[clause.code] ?? 0))
    if (worst > clause.cap!) {
      add({
        invariant: "VOUCHER_CAP_ENFORCEABLE", kind: "ENGINE_GAP", severity: "medium",
        title: `${clause.code} giảm tới ${worst}, vượt trần ${clause.cap} (Medusa không có trường trần giảm giá)`,
        fix_owner: "engineering", entities: [promoEntity(clause.code, clause.owner)],
        expected: { max_discount: clause.cap }, actual: { simulated_discount: worst },
      })
    }
  }

  // I9 total item subsidy per order stays within the approved ceiling
  const maxSim = simulation.reduce(
    (m, s) => {
      const total = Object.values(s.item_discounts as Record<string, number>).reduce((x, y) => x + y, 0)
      return total > m.total ? { total, row: s } : m
    },
    { total: 0, row: null as Row | null }
  )
  if (maxSim.total > contract.stacking.max_item_discount_per_order) {
    // Only planned codes in the excess means the engine (missing caps) is the cause, not another team
    const unplanned = Object.keys(maxSim.row?.item_discounts ?? {}).filter((c) => !contract.stacking.allowed_codes.includes(c))
    add({
      invariant: "MAX_ITEM_DISCOUNT_PER_ORDER",
      kind: unplanned.length ? "CROSS_TEAM_CONFLICT" : "ENGINE_GAP",
      severity: "high",
      title: `Tổng giảm giá trên một đơn ${maxSim.row?.sku} đạt ${maxSim.total}, vượt trần Finance duyệt ${contract.stacking.max_item_discount_per_order}` +
        (unplanned.length ? ` do cộng dồn ${unplanned.join(", ")}` : " do engine không áp được trần giảm giá"),
      fix_owner: unplanned.length ? "finance + marketing" : "engineering",
      entities: Object.keys(maxSim.row?.item_discounts ?? {}).map((code) => {
        const owner = contract.vouchers.find((v) => v.code === code)?.owner ?? lastTeamOf(byCode.get(code)?.id ?? null)
        return promoEntity(code, owner ?? "unknown")
      }),
      expected: { max: contract.stacking.max_item_discount_per_order }, actual: maxSim.row?.item_discounts,
      extra_teams: ["finance"],
    })
  }

  const count = (key: (f: Finding) => string) =>
    findings.reduce<Record<string, number>>((m, f) => ({ ...m, [key(f)]: (m[key(f)] ?? 0) + 1 }), {})
  return {
    contract_id: contract.contract_id,
    checked_at: new Date(now).toISOString(),
    summary: { total: findings.length, by_kind: count((f) => f.kind), by_fix_owner: count((f) => f.fix_owner) },
    simulation,
    findings,
  }
}
