import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FLASHSRE_MODULE } from "../../modules/flashsre"
import type FlashsreModuleService from "../../modules/flashsre/service"
import type { Finding, FindingEntity, FindingKind } from "./contract-types"
import { AUDITED_ENTITIES } from "./entities"
import type { ContractCheckResult } from "./invariants"

type Row = Record<string, any>

export type Scope = { shops?: string[]; shop_types?: string[]; categories?: string[]; products?: string[] }

export type PromoClause = {
  code: string
  owner: string
  sponsor: string
  type: "fixed" | "percentage"
  value: number
  cap?: number
  min_spend?: number
  scope?: Scope
  segments: "ALL" | string[]
  automatic?: boolean
}

// Business-level changes the sandbox can apply on top of the live configuration
export type Patch =
  | { type: "promotion.state"; code: string; state: Row }
  | { type: "promotion.conform"; code: string }
  | { type: "promotion.remove"; code: string }
  | { type: "product.state"; product_id: string; tag_ids?: string[]; category_ids?: string[]; collection_id?: string | null }
  | { type: "price_list.state"; title: string; prices: { price_set_id: string; amount: number; currency_code: string }[] }
  | { type: "price_list.remove"; title: string }
  | { type: "promotion.min_spend"; code: string; value: number }
  | { type: "shipping_option.remove"; id: string }
  | { type: "campaign.budget"; campaign_identifier: string; limit: number }

export type EvaluateOptions = {
  patches?: Patch[]
  sandbox?: boolean
  other_contracts?: MarketplaceContract[]
}

export type MarketplaceContract = {
  schema: "marketplace/v1"
  contract_id: string
  title: string
  owner?: string
  market: { currency: string; country: string }
  teams: Record<string, string>
  taxonomy: {
    categories: Record<string, { handle: string; owner: string }>
    shops: Record<string, { handle: string; type: string; owner: string }>
    shop_types: Record<string, string>
    programs: Record<string, { tag: string; shops: string[] }>
    segments: Record<string, string>
    assortment?: Record<string, string>
  }
  flash: { price_list_title: string; owner: string; prices: Record<string, number> }[]
  promotions: PromoClause[]
  freeship?: {
    code: string
    owner: string
    support: number
    threshold: number
    threshold_base: "item_subtotal" | "item_total"
    program: string
    providers_included: string[]
    providers_excluded: string[]
  }
  stacking: { allowed_codes: string[]; max_item_discount_per_order: number }
  budgets: { campaign_identifier: string; owner: string; min_limit: number }[]
  carts: { mixed: string[][] }
}

type Item = {
  sku: string
  variant_id: string
  product_id: string
  product_handle: string
  shop: string | null
  live_price: number
  // Price the same customer pays outside the flash slot: every active price list except the contracts' flash lists
  off_flash_price: number
  contract_price: number
  live_categories: string[]
  semantic_categories: string[]
  contract_categories: string[]
  live_tags: string[]
  collection_id: string | null
}

type Mismatch = {
  code: string
  direction: "leak" | "loss" | "calc" | "stack" | "unordered" | "dearer"
  cause?: "cap" | "order"
  foreign?: string[]
  // dearer: what the cart costs in and outside the flash slot, and the offers it loses in the slot
  pays_in_flash?: number
  pays_off_flash?: number
  subtotal_in_flash?: number
  lost?: string[]
  cart: string
  skus: string[]
  shops: string[]
  categories: string[]
  segment: string
  provider: string
  delta: number
}

const num = (v: unknown) => Number(v ?? 0)
const round = (n: number) => Math.round(n)
const valuesOf = (rule: Row | undefined) => (rule?.values ?? []).map((v: Row) => String(v.value)).sort()
const sameSet = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
const PROMO_FIELDS = [...AUDITED_ENTITIES.find((s) => s.entity === "promotion")!.fields, "campaign.campaign_identifier"]

export async function evaluateMarketplaceContract(
  container: MedusaContainer,
  contract: MarketplaceContract,
  options: EvaluateOptions = {}
): Promise<ContractCheckResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const promotionModule = container.resolve(Modules.PROMOTION)
  const flashsre: FlashsreModuleService = container.resolve(FLASHSRE_MODULE)
  const { market, taxonomy } = contract
  const now = Date.now()

  // Resolve the contract's business vocabulary (shop, shop type, category, segment) to live ids
  const categories = (await query.graph({
    entity: "product_category", fields: ["id", "handle", "parent_category_id"],
  })).data as Row[]
  const catByHandle = new Map(categories.map((c) => [c.handle, c]))
  const catById = new Map(categories.map((c) => [c.id, c]))
  const catKeyById = new Map<string, string>()
  for (const [key, c] of Object.entries(taxonomy.categories)) {
    const id = catByHandle.get(c.handle)?.id
    if (id) {
      catKeyById.set(id, key)
    }
  }
  const collections = (await query.graph({ entity: "product_collection", fields: ["id", "handle"] })).data as Row[]
  const shopIdByKey = new Map<string, string>()
  const shopKeyById = new Map<string, string>()
  for (const [key, s] of Object.entries(taxonomy.shops)) {
    const id = collections.find((c) => c.handle === s.handle)?.id
    if (id) {
      shopIdByKey.set(key, id)
      shopKeyById.set(id, key)
    }
  }
  const tags = (await query.graph({ entity: "product_tag", fields: ["id", "value"] })).data as Row[]
  const tagIdByValue = new Map(tags.map((t) => [t.value, t.id]))
  const groups = (await query.graph({ entity: "customer_group", fields: ["id", "name"] })).data as Row[]
  const groupIdByName = new Map(groups.map((g) => [g.name, g.id]))

  let promotions = (await query.graph({ entity: "promotion", fields: PROMO_FIELDS })).data as Row[]
  let priceLists = (await query.graph({
    entity: "price_list",
    fields: ["id", "title", "status", "type", "starts_at", "ends_at", "prices.amount", "prices.currency_code", "prices.price_set_id"],
  })).data as Row[]
  let shippingOptions = ((await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "price_type", "type.id", "type.code", "prices.amount", "prices.currency_code", "service_zone.geo_zones.country_code"],
  })).data as Row[]).filter((o) => (o.service_zone?.geo_zones ?? []).some((g: Row) => g.country_code === market.country))
  const campaigns = (await query.graph({
    entity: "campaign", fields: ["id", "campaign_identifier", "budget.limit", "budget.used"],
  })).data as Row[]
  const changes = await flashsre.listConfigChanges({}, {
    order: { created_at: "DESC" }, take: 1000,
    select: ["id", "entity_id", "team", "created_at", "actor_email", "method", "route", "entity_label", "diff"],
  })
  const lastTeamOf = (id: string | null) => (id ? (changes.find((c) => c.entity_id === id)?.team ?? null) : null)

  // Campaign catalogue = every variant whose product lives in one of the contract's shops
  const variants = (await query.graph({
    entity: "product_variant",
    fields: [
      "id", "sku", "price_set.id", "price_set.prices.amount", "price_set.prices.currency_code",
      "price_set.prices.price_list_id", "product.id", "product.handle", "product.collection_id",
      "product.categories.id", "product.tags.id", "product.tags.value",
    ],
  })).data as Row[]

  // Contract clause -> the promotion rules it should translate to
  const rule = (attribute: string, operator: string, values: string[]) => ({ attribute, operator, values: values.map((value) => ({ value })) })
  const translateScope = (scope: Scope | undefined) => {
    const out: Record<string, string[]> = {}
    if (scope?.shops) {
      out["items.product.collection_id"] = scope.shops.map((k) => shopIdByKey.get(k) ?? `?${k}`)
    }
    if (scope?.shop_types) {
      out["items.product.tags.id"] = scope.shop_types.map((k) => tagIdByValue.get(taxonomy.shop_types[k]) ?? `?${k}`)
    }
    if (scope?.categories) {
      out["items.product.categories.id"] = scope.categories.map((k) => catByHandle.get(taxonomy.categories[k]?.handle)?.id ?? `?${k}`)
    }
    if (scope?.products) {
      out["items.product.id"] = scope.products.map((sku) => variants.find((v) => v.sku === sku)?.product?.id ?? `?${sku}`)
    }
    return out
  }
  const typeIdByCode = new Map(shippingOptions.map((o) => [o.type?.code, o.type?.id]))
  const conformedPromotion = (code: string): Row | null => {
    // The clause may belong to any approved contract in this market, not only the one being evaluated
    const pool = [contract, ...(options.other_contracts ?? [])]
    const clause = pool.flatMap((c) => c.promotions).find((c) => c.code === code)
    const fsc = pool.map((c) => c.freeship).find((f) => f?.code === code)
    if (clause) {
      return {
        code, status: "active", is_automatic: !!clause.automatic,
        rules: [
          rule("currency_code", "eq", [market.currency]),
          ...(clause.min_spend ? [rule("item_subtotal", "gte", [String(clause.min_spend)])] : []),
          ...(clause.segments === "ALL" ? [] : [rule("customer.groups.id", "in", clause.segments.map((k) => groupIdByName.get(taxonomy.segments[k]) ?? `?${k}`))]),
        ],
        application_method: {
          type: clause.type, value: clause.value, currency_code: clause.type === "fixed" ? market.currency : null,
          target_type: "items", allocation: "across",
          target_rules: Object.entries(translateScope(clause.scope)).map(([a, v]) => rule(a, "in", v)),
        },
      }
    }
    if (fsc && fsc.code === code) {
      const prog = taxonomy.programs[fsc.program]
      return {
        code, status: "active", is_automatic: true,
        rules: [
          rule("currency_code", "eq", [market.currency]),
          rule(fsc.threshold_base, "gte", [String(fsc.threshold)]),
          ...(prog ? [rule("items.product.tags.id", "in", [tagIdByValue.get(prog.tag) ?? `?${prog.tag}`])] : []),
        ],
        application_method: {
          type: "fixed", value: fsc.support, currency_code: market.currency, target_type: "shipping_methods",
          allocation: "each", max_quantity: 1,
          target_rules: [rule("shipping_methods.shipping_option.shipping_option_type_id", "in",
            fsc.providers_included.map((c) => typeIdByCode.get(c) ?? `?${c}`))],
        },
      }
    }
    return null
  }

  // Sandbox: overlay business-level patches on the loaded snapshot, never on the live store
  for (const patch of options.patches ?? []) {
    if (patch.type === "promotion.state") {
      const cur = promotions.find((p) => p.code === patch.code)
      const next = { ...(cur ?? { code: patch.code, is_automatic: false }), ...patch.state }
      promotions = [...promotions.filter((p) => p.code !== patch.code), next]
    } else if (patch.type === "promotion.conform") {
      const target = conformedPromotion(patch.code)
      if (target) {
        const cur = promotions.find((p) => p.code === patch.code)
        promotions = [...promotions.filter((p) => p.code !== patch.code), { ...(cur ?? {}), ...target }]
      }
    } else if (patch.type === "promotion.remove") {
      promotions = promotions.filter((p) => p.code !== patch.code)
    } else if (patch.type === "product.state") {
      for (const v of variants.filter((x) => x.product?.id === patch.product_id)) {
        if (patch.tag_ids) {
          v.product.tags = patch.tag_ids.map((id) => ({ id }))
        }
        if (patch.category_ids) {
          v.product.categories = patch.category_ids.map((id) => ({ id }))
        }
        if (patch.collection_id !== undefined) {
          v.product.collection_id = patch.collection_id
        }
      }
    } else if (patch.type === "price_list.state") {
      const pl = priceLists.find((p) => p.title === patch.title)
      if (pl) {
        pl.prices = patch.prices
      }
    } else if (patch.type === "price_list.remove") {
      priceLists = priceLists.filter((p) => p.title !== patch.title)
    } else if (patch.type === "promotion.min_spend") {
      const cur = promotions.find((p) => p.code === patch.code)
      if (cur) {
        const rules = (cur.rules ?? []).filter((r: Row) => r.attribute !== "item_subtotal")
        promotions = [...promotions.filter((p) => p.code !== patch.code),
          { ...cur, rules: [...rules, rule("item_subtotal", "gte", [String(patch.value)])] }]
      }
    } else if (patch.type === "shipping_option.remove") {
      shippingOptions = shippingOptions.filter((o) => o.id !== patch.id)
    } else if (patch.type === "campaign.budget") {
      const c = campaigns.find((x) => x.campaign_identifier === patch.campaign_identifier)
      if (c) {
        c.budget = { ...(c.budget ?? {}), limit: patch.limit }
      }
    }
  }
  const byCode = new Map<string, Row>(promotions.map((p) => [p.code, p]))
  // Approved flash price of each SKU: this contract's own clause, else the clause of another approved contract
  // running at the same time (Brand Day is computed on the 11.11 flash price, not on the list price)
  const flashPrice = new Map<string, number>()
  for (const c of [...(options.other_contracts ?? []), contract]) {
    for (const fl of c.flash ?? []) {
      for (const [sku, price] of Object.entries(fl.prices)) flashPrice.set(sku, price)
    }
  }
  const ownFlashSkus = new Set(contract.flash.flatMap((fl) => Object.keys(fl.prices)))
  const flashTitles = new Set([...(options.other_contracts ?? []), contract].flatMap((c) => (c.flash ?? []).map((fl) => fl.price_list_title)))
  // A scheduled flash list (active, not yet started) is simulated as live, so the combination is checked before the window opens
  const isActiveList = (pl: Row) => pl.status === "active" &&
    (flashTitles.has(pl.title) || !pl.starts_at || new Date(pl.starts_at).getTime() <= now) && (!pl.ends_at || new Date(pl.ends_at).getTime() >= now)
  // Pricing module (calculatePrices): price-list prices ordered by rule count then amount, only the first one counts;
  // an override is used as is, a sale yields the lower of it and the default price. These lists carry no
  // customer-group rules, so the order is by amount
  const pickPrice = (lists: { type: string; amount: number }[], baseAmount: number) => {
    const first = [...lists].sort((a, b) => a.amount - b.amount)[0]
    return !first ? baseAmount : first.type === "override" ? first.amount : Math.min(first.amount, baseAmount)
  }
  const ancestors = (id: string): string[] => {
    const out: string[] = []
    let cur = catById.get(id)
    while (cur) {
      out.push(cur.id)
      cur = cur.parent_category_id ? catById.get(cur.parent_category_id) : undefined
    }
    return out
  }
  const items: Item[] = []
  for (const v of variants) {
    const shop = shopKeyById.get(v.product?.collection_id) ?? null
    const contractSku = ownFlashSkus.has(v.sku)
    if (!shop && !contractSku) {
      continue
    }
    const base = (v.price_set?.prices ?? []).find((p: Row) => p.currency_code === market.currency && !p.price_list_id)
    // Live price comes from every active price list on the variant, whichever contract owns it: checkout does not
    // care which campaign a price list belongs to (a flash price typed too high falls back to the list price)
    const baseAmount = num(base?.amount)
    const listPrices = priceLists.filter(isActiveList).flatMap((pl) => (pl.prices ?? [])
      .filter((p: Row) => p.price_set_id === v.price_set?.id && p.currency_code === market.currency)
      .map((p: Row) => ({ type: pl.type, amount: num(p.amount), flash: flashTitles.has(pl.title) })))
    const livePrice = pickPrice(listPrices, baseAmount)
    const offFlashPrice = pickPrice(listPrices.filter((p) => !p.flash), baseAmount)
    const liveCats: string[] = (v.product?.categories ?? []).map((c: Row) => String(c.id))
    // Approved assortment says which category the SKU belongs to; without it fall back to the live tree
    const approvedLeaf = taxonomy.assortment?.[v.sku]
    const approvedId = approvedLeaf ? catByHandle.get(taxonomy.categories[approvedLeaf]?.handle)?.id : undefined
    items.push({
      sku: v.sku,
      variant_id: v.id,
      product_id: v.product.id,
      product_handle: v.product.handle,
      shop,
      live_price: livePrice,
      off_flash_price: offFlashPrice,
      contract_price: flashPrice.get(v.sku) ?? num(base?.amount),
      live_categories: liveCats,
      semantic_categories: [...new Set(liveCats.flatMap(ancestors))],
      contract_categories: approvedId ? ancestors(approvedId) : [...new Set(liveCats.flatMap(ancestors))],
      live_tags: (v.product?.tags ?? []).map((t: Row) => t.id),
      collection_id: v.product?.collection_id ?? null,
    })
  }
  const itemBySku = new Map(items.map((i) => [i.sku, i]))

  const findings: Finding[] = []
  const add = (f: Omit<Finding, "id" | "teams_involved" | "recent_changes"> & { extra_teams?: string[] }) => {
    const ids = f.entities.map((e) => e.id).filter(Boolean)
    const recent = changes.filter((c) => ids.includes(c.entity_id)).slice(0, 6).map((c) => ({
      id: c.id, at: c.created_at, team: c.team, actor_email: c.actor_email, method: c.method,
      route: c.route, entity_label: c.entity_label, diff: c.diff,
    }))
    const teams = new Set<string>([
      ...f.entities.map((e) => e.owner_team).filter((t): t is string => !!t),
      ...recent.map((c) => c.team).filter((t): t is string => !!t),
      ...(f.extra_teams ?? []),
    ])
    const { extra_teams, ...rest } = f
    findings.push({ ...rest, id: `F${findings.length + 1}`, teams_involved: [...teams], recent_changes: recent })
  }
  const promoEntity = (code: string, owner: string | null): FindingEntity => ({
    type: "promotion", id: byCode.get(code)?.id ?? null, label: code, owner_team: owner,
  })
  const productEntity = (sku: string): FindingEntity => {
    const it = itemBySku.get(sku)
    const shopOwner = it?.shop ? taxonomy.shops[it.shop]?.owner : null
    return { type: "product", id: it?.product_id ?? null, label: it?.product_handle ?? sku, owner_team: lastTeamOf(it?.product_id ?? null) ?? shopOwner ?? null }
  }

  // S1 flash prices: every listed SKU priced at the approved amount
  for (const fl of contract.flash) {
    const pl = priceLists.find((p) => p.title === fl.price_list_title)
    const plEntity: FindingEntity = { type: "price_list", id: pl?.id ?? null, label: fl.price_list_title, owner_team: fl.owner }
    for (const [sku, price] of Object.entries(fl.prices)) {
      const v = variants.find((x) => x.sku === sku)
      const p = (pl?.prices ?? []).find((x: Row) => x.price_set_id === v?.price_set?.id && x.currency_code === market.currency)
      if (!p) {
        add({
          invariant: "FLASH_PRICE_COVERS_ALL_VARIANTS", kind: "CONFIG_DRIFT", severity: "high",
          title: `${sku} không có giá flash trong "${fl.price_list_title}", khách trả giá niêm yết ${itemBySku.get(sku)?.live_price ?? "?"}`,
          fix_owner: fl.owner, entities: [plEntity, productEntity(sku)], expected: price, actual: null,
        })
      } else if (num(p.amount) !== price) {
        const paid = itemBySku.get(sku)?.live_price
        const effect = paid !== undefined && paid !== num(p.amount)
          ? `; engine lấy giá niêm yết ${paid} vì thấp hơn, khách mất ưu đãi flash ${paid - price}`
          : paid !== undefined ? `; khách trả ${paid}, lệch ${paid - price} so với contract` : ""
        add({
          invariant: "FLASH_PRICE_MATCHES_CONTRACT", kind: "CONFIG_DRIFT", severity: num(p.amount) < price * 0.5 ? "high" : "medium",
          title: `Giá flash của ${sku} là ${num(p.amount)}, contract duyệt ${price}${effect}`,
          fix_owner: fl.owner, entities: [plEntity], expected: price, actual: num(p.amount),
        })
      }
    }
  }

  // S2 static config of each promotion vs the rules its clause translates to
  for (const clause of contract.promotions) {
    const promo = byCode.get(clause.code)
    const entity = promoEntity(clause.code, clause.owner)
    if (!promo || promo.status !== "active") {
      add({
        invariant: "PROMOTION_ACTIVE", kind: "MISSING_CONFIG", severity: "high",
        title: `${clause.code} không tồn tại hoặc không active`, fix_owner: clause.owner, entities: [entity],
        expected: "active", actual: promo?.status ?? null,
      })
      continue
    }
    const am = promo.application_method ?? {}
    if (am.type !== clause.type || num(am.value) !== clause.value) {
      add({
        invariant: "PROMOTION_VALUE", kind: "CONFIG_DRIFT", severity: "high",
        title: `Giá trị ${clause.code} lệch contract`, fix_owner: clause.owner, entities: [entity],
        expected: { type: clause.type, value: clause.value }, actual: { type: am.type, value: num(am.value) },
      })
    }
    const expectedRules = translateScope(clause.scope)
    const liveRules: Record<string, string[]> = {}
    for (const r of am.target_rules ?? []) {
      liveRules[r.attribute] = valuesOf(r)
    }
    const attrs = new Set([...Object.keys(expectedRules), ...Object.keys(liveRules)])
    const scopeDiff = [...attrs].filter((a) => !sameSet(expectedRules[a] ?? [], liveRules[a] ?? []))
    if (scopeDiff.length) {
      add({
        invariant: "PROMOTION_SCOPE_RULES", kind: "CONFIG_DRIFT", severity: "high",
        title: `Phạm vi áp dụng của ${clause.code} lệch contract ở: ${scopeDiff.join(", ")}`,
        fix_owner: clause.owner, entities: [entity],
        expected: Object.fromEntries(scopeDiff.map((a) => [a, expectedRules[a] ?? null])),
        actual: Object.fromEntries(scopeDiff.map((a) => [a, liveRules[a] ?? null])),
      })
    }
    const min = (promo.rules ?? []).find((r: Row) => ["item_subtotal", "item_total"].includes(r.attribute))
    if ((clause.min_spend ?? 0) !== (min ? num(valuesOf(min)[0]) : 0) || (min && min.attribute !== "item_subtotal")) {
      add({
        invariant: "PROMOTION_MIN_SPEND", kind: "CONFIG_DRIFT", severity: "high",
        title: `Đơn tối thiểu của ${clause.code} lệch contract`, fix_owner: clause.owner, entities: [entity],
        expected: { item_subtotal_gte: clause.min_spend ?? 0 },
        actual: min ? { [`${min.attribute}_${min.operator}`]: num(valuesOf(min)[0]) } : null,
      })
    }
    const seg = (promo.rules ?? []).find((r: Row) => r.attribute === "customer.groups.id")
    const expectedSeg = clause.segments === "ALL" ? [] : clause.segments.map((k) => groupIdByName.get(taxonomy.segments[k]) ?? `?${k}`)
    if (!sameSet(expectedSeg, valuesOf(seg))) {
      add({
        invariant: "PROMOTION_SEGMENT", kind: "CONFIG_DRIFT", severity: "high",
        title: `Phân khúc khách của ${clause.code} lệch contract`, fix_owner: clause.owner, entities: [entity],
        expected: clause.segments, actual: seg ? valuesOf(seg) : "ALL",
      })
    }
  }

  // S3 freeship program config and provider coverage
  const fs = contract.freeship
  const fsPromo = fs ? byCode.get(fs.code) : undefined
  const fsEntity = promoEntity(fs?.code ?? "-", fs?.owner ?? null)
  const typeCodeById = new Map(shippingOptions.map((o) => [o.type?.id, o.type?.code]))
  if (!fs) {
    // contract has no freeship programme
  } else if (!fsPromo || fsPromo.status !== "active") {
    add({
      invariant: "FREESHIP_ACTIVE", kind: "MISSING_CONFIG", severity: "high", title: `${fs.code} không active`,
      fix_owner: fs.owner, entities: [fsEntity], expected: "active", actual: fsPromo?.status ?? null,
    })
  } else {
    const thr = (fsPromo.rules ?? []).find((r: Row) => ["item_subtotal", "item_total"].includes(r.attribute))
    if (!thr || thr.attribute !== fs.threshold_base || num(valuesOf(thr)[0]) !== fs.threshold) {
      add({
        invariant: "FREESHIP_THRESHOLD_BASE", kind: "CONFIG_DRIFT", severity: "high",
        title: "Freeship xét ngưỡng sai cơ sở hoặc sai giá trị (contract: tiền hàng trước voucher)",
        fix_owner: fs.owner, entities: [fsEntity],
        expected: { [fs.threshold_base]: fs.threshold }, actual: thr ? { [thr.attribute]: num(valuesOf(thr)[0]) } : null,
      })
    }
    const target = (fsPromo.application_method?.target_rules ?? []).find(
      (r: Row) => r.attribute === "shipping_methods.shipping_option.shipping_option_type_id"
    )
    const targeted = valuesOf(target).map((id: string) => typeCodeById.get(id) ?? id)
    if (!sameSet(targeted, fs.providers_included)) {
      add({
        invariant: "FREESHIP_PROVIDERS", kind: "CONFIG_DRIFT", severity: "high",
        title: "Danh sách provider được freeship lệch contract", fix_owner: fs.owner, entities: [fsEntity],
        expected: fs.providers_included, actual: targeted,
      })
    }
  }
  const declared = fs ? new Set([...fs.providers_included, ...fs.providers_excluded]) : null
  const pricedOptions: Row[] = []
  for (const o of shippingOptions) {
    const optionEntity: FindingEntity = { type: "shipping_option", id: o.id, label: o.name, owner_team: lastTeamOf(o.id) ?? "logistics" }
    // A "calculated" option is priced by the fulfillment provider at checkout: no price table is expected
    if (o.price_type !== "calculated" && !(o.prices ?? []).some((p: Row) => p.currency_code === market.currency)) {
      add({
        invariant: "PROVIDER_PRICED_IN_MARKET", kind: "CONFIG_DRIFT", severity: "medium",
        title: `Shipping option "${o.name}" phục vụ ${market.country} nhưng không có giá ${market.currency}`,
        fix_owner: "logistics", entities: [optionEntity], expected: market.currency,
        actual: { price_type: o.price_type, currencies: (o.prices ?? []).map((p: Row) => p.currency_code) },
      })
      continue
    }
    pricedOptions.push(o)
    if (fs && declared && !declared.has(o.type?.code)) {
      add({
        invariant: "PROVIDER_DECLARED_IN_FREESHIP", kind: "CROSS_TEAM_CONFLICT", severity: "high",
        title: `Provider "${o.name}" đang bán ở ${market.country} nhưng chương trình freeship không khai báo`,
        fix_owner: fs.owner, entities: [optionEntity, fsEntity], expected: [...declared], actual: o.type?.code ?? null,
      })
    }
  }

  // S4 budgets
  for (const b of contract.budgets) {
    const c = campaigns.find((x) => x.campaign_identifier === b.campaign_identifier)
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

  // Codes owned by the other approved contracts in this market; their overlap is judged per cart below
  const others = options.other_contracts ?? []
  const foreignOwner = new Map<string, string>()
  for (const oc of others) {
    for (const c of oc.promotions) {
      foreignOwner.set(c.code, c.owner)
    }
    if (oc.freeship) {
      foreignOwner.set(oc.freeship.code, oc.freeship.owner)
    }
  }

  // S5 automatic promotions outside the contract that reach campaign items
  const campaignProducts = new Set(items.map((i) => i.product_id))
  for (const p of promotions) {
    if (!p.is_automatic || p.status !== "active" || contract.stacking.allowed_codes.includes(p.code) || foreignOwner.has(p.code)) {
      continue
    }
    const cur = (p.rules ?? []).find((r: Row) => r.attribute === "currency_code")
    if (cur && !valuesOf(cur).includes(market.currency)) {
      continue
    }
    // Item conditions can sit in target rules or in cart-level rules ("cart contains an item that ...")
    const t = [
      ...(p.application_method?.target_type === "shipping_methods" ? [] : (p.application_method?.target_rules ?? [])),
      ...(p.rules ?? []).filter((r: Row) => String(r.attribute).startsWith("items.")),
    ]
    const hit = !t.length || items.some((i) => t.every((r: Row) => {
      const vals = valuesOf(r)
      if (r.attribute === "items.product.categories.id") {
        return i.live_categories.some((c) => vals.includes(c))
      }
      if (r.attribute === "items.product.id") {
        return vals.includes(i.product_id)
      }
      if (r.attribute === "items.product.collection_id") {
        return vals.includes(i.collection_id ?? "")
      }
      if (r.attribute === "items.product.tags.id") {
        return i.live_tags.some((x) => vals.includes(x))
      }
      return true
    }))
    if (hit && campaignProducts.size) {
      add({
        invariant: "NO_UNPLANNED_STACKING", kind: "CROSS_TEAM_CONFLICT", severity: "high",
        title: `Ưu đãi tự động ${p.code} ngoài contract đang cộng dồn lên sản phẩm của campaign`,
        fix_owner: `${lastTeamOf(p.id) ?? "chủ promotion"} + marketing`,
        entities: [{ type: "promotion", id: p.id, label: p.code, owner_team: lastTeamOf(p.id) }],
        expected: contract.stacking.allowed_codes, actual: p.code,
      })
    }
  }

  // B1 behavioural check: contract oracle vs the live promotion engine on a matrix of carts
  const segments: { key: string; group_id: string | null }[] = [
    { key: "REGULAR", group_id: null },
    ...Object.entries(taxonomy.segments).map(([key, name]) => ({ key, group_id: groupIdByName.get(name) ?? null })),
  ]
  const programShops = new Set(fs ? (taxonomy.programs[fs.program]?.shops ?? []) : [])
  const cartDefs: string[][] = [...items.map((i) => [i.sku]), ...contract.carts.mixed]
  // A shopper collects every voucher on offer, including other campaigns' ones
  const ownCodes = new Set([...contract.promotions.map((c) => c.code), ...(fs ? [fs.code] : [])])
  const voucherCodes = [...new Set([...contract.promotions.map((c) => c.code), ...others.flatMap((oc) => oc.promotions.map((c) => c.code))])]
  const allowed = new Set(contract.stacking.allowed_codes)

  // Engine: live promotions, or shadow copies in sandbox mode that real carts can never trigger
  const shadowIds: string[] = []
  let engine = async (ctx: Row): Promise<Row[]> => (await promotionModule.computeActions(voucherCodes, ctx as any)) as Row[]
  if (options.sandbox) {
    const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const prefix = `SBX${runId}-`
    const currencyOk = (p: Row) => {
      const cur = (p.rules ?? []).find((r: Row) => r.attribute === "currency_code")
      return !cur || valuesOf(cur).includes(market.currency)
    }
    const toShadow = promotions.filter((p) => p.status === "active" && currencyOk(p) && (voucherCodes.includes(p.code) || p.is_automatic))
    const plain = (rs: Row[] | undefined) => (rs ?? []).map((r: Row) => ({ attribute: r.attribute, operator: r.operator, values: valuesOf(r) }))
    const created = toShadow.length
      ? await promotionModule.createPromotions(toShadow.map((p) => {
        const am = p.application_method ?? {}
        return {
          code: `${prefix}${p.code}`, type: "standard", status: "active", is_automatic: false,
          rules: [...plain(p.rules), { attribute: "flashsre_sandbox", operator: "eq", values: [runId] }],
          application_method: {
            type: am.type, value: num(am.value), target_type: am.target_type, allocation: am.allocation,
            ...(am.type === "fixed" ? { currency_code: am.currency_code ?? market.currency } : {}),
            ...(am.max_quantity ? { max_quantity: num(am.max_quantity) } : {}),
            target_rules: plain(am.target_rules),
          },
        } as any
      }))
      : []
    shadowIds.push(...created.map((c) => c.id))
    const shadowCodes = created.map((c) => c.code as string)
    engine = async (ctx: Row) => {
      const actions = (await promotionModule.computeActions(
        shadowCodes, { ...ctx, flashsre_sandbox: runId } as any, { prevent_auto_promotions: true } as any
      )) as Row[]
      return actions.map((a) => ({ ...a, code: String(a.code ?? "").startsWith(prefix) ? String(a.code).slice(prefix.length) : a.code }))
    }
  }
  const inScope = (it: Item, scope: Scope | undefined) => {
    if (scope?.shops && !(it.shop && scope.shops.includes(it.shop))) {
      return false
    }
    if (scope?.shop_types && !(it.shop && scope.shop_types.includes(taxonomy.shops[it.shop]?.type))) {
      return false
    }
    if (scope?.categories) {
      const ids = scope.categories.map((k) => catByHandle.get(taxonomy.categories[k]?.handle)?.id)
      if (!it.contract_categories.some((c) => ids.includes(c))) {
        return false
      }
    }
    if (scope?.products && !scope.products.includes(it.sku)) {
      return false
    }
    return true
  }
  const mismatches: Mismatch[] = []
  const simulation: Row[] = []
  const typeOf = (o: Row) => o.type?.code
  const feeOf = (o: Row) => num(o.prices.find((p: Row) => p.currency_code === market.currency).amount)
  // One engine context per cart and segment: item discounts do not depend on the provider, so every
  // provider rides along as its own shipping method in the same context
  const buildContext = (cartItems: Item[], seg: { key: string; group_id: string | null }, priceOf = (i: Item) => i.live_price) => {
    const liveSubtotal = cartItems.reduce((s, i) => s + priceOf(i), 0)
    return {
      currency_code: market.currency,
      item_subtotal: liveSubtotal, item_total: liveSubtotal, subtotal: liveSubtotal, total: liveSubtotal,
      customer: seg.group_id ? { id: "flashsre_sim_customer", groups: [{ id: seg.group_id }] } : undefined,
      items: cartItems.map((i, idx) => ({
        id: `flashsre_sim_item_${idx}`, quantity: 1, subtotal: priceOf(i), original_total: priceOf(i),
        total: priceOf(i), is_discountable: true, variant_id: i.variant_id, product_id: i.product_id,
        product: {
          id: i.product_id, collection_id: i.collection_id,
          categories: i.live_categories.map((id) => ({ id })), tags: i.live_tags.map((id) => ({ id })),
        },
      })),
      shipping_methods: pricedOptions.map((o, idx) => ({
        id: `flashsre_sim_ship_${idx}`, subtotal: feeOf(o), total: feeOf(o), original_total: feeOf(o), amount: feeOf(o),
        shipping_option_id: o.id, shipping_option: { shipping_option_type_id: o.type?.id },
      })),
    }
  }
  // What the customer pays with one provider, given the engine actions on a cart, and what each offer took off
  const paysFor = (acts: Row[], oIdx: number, subtotal: number, fee: number) => {
    let off = 0
    const byCode: Record<string, number> = {}
    for (const a of acts) {
      const own = a.action === "addItemAdjustment" ||
        (a.action === "addShippingMethodAdjustment" && a.shipping_method_id === `flashsre_sim_ship_${oIdx}`)
      if (own) {
        off += num(a.amount)
        byCode[a.code] = (byCode[a.code] ?? 0) + num(a.amount)
      }
    }
    return { pays: subtotal - off + fee, byCode }
  }
  try {
  // Engine calls are read-only and independent: run them in small parallel batches
  const engineResults = new Map<string, Row[]>()
  // A cart whose flash items are priced differently outside the slot is also run at its off-flash prices
  const flashMoves = (cartItems: Item[]) => cartItems.some((i) => ownFlashSkus.has(i.sku) && i.off_flash_price !== i.live_price)
  const jobs = cartDefs.flatMap((def) => {
    const cartItems = def.map((x) => itemBySku.get(x)).filter((x): x is Item => !!x)
    return cartItems.length === def.length ? segments.flatMap((seg) => [
      { key: `${def.join("+")}|${seg.key}`, ctx: buildContext(cartItems, seg) },
      ...(flashMoves(cartItems) ? [{ key: `${def.join("+")}|${seg.key}|off`, ctx: buildContext(cartItems, seg, (i) => i.off_flash_price) }] : []),
    ]) : []
  })
  for (let i = 0; i < jobs.length; i += 8) {
    const batch = jobs.slice(i, i + 8)
    const res = await Promise.all(batch.map((j) => engine(j.ctx)))
    batch.forEach((j, k) => engineResults.set(j.key, res[k]))
  }
  for (const def of cartDefs) {
    const cartItems = def.map((s) => itemBySku.get(s)).filter((x): x is Item => !!x)
    if (cartItems.length !== def.length) {
      continue
    }
    for (const seg of segments) {
      const liveSubtotal = cartItems.reduce((s, i) => s + i.live_price, 0)
      const sharedActions = engineResults.get(`${def.join("+")}|${seg.key}`) ?? []
      for (const [oIdx, o] of pricedOptions.entries()) {
        const fee = feeOf(o)
        // Contract oracle, computed on approved prices with approved shop types and category semantics
        const remaining = new Map(cartItems.map((i) => [i.sku, i.contract_price]))
        const expSubtotal = cartItems.reduce((s, i) => s + i.contract_price, 0)
        const expected: Record<string, number> = {}
        const expectedItems = new Map<string, Set<string>>()
        for (const clause of contract.promotions) {
          if (clause.segments !== "ALL" && !clause.segments.includes(seg.key)) {
            continue
          }
          const elig = cartItems.filter((i) => inScope(i, clause.scope))
          if (!elig.length || expSubtotal < (clause.min_spend ?? 0)) {
            continue
          }
          const base = elig.reduce((s, i) => s + remaining.get(i.sku)!, 0)
          let amount = clause.type === "percentage" ? (base * clause.value) / 100 : Math.min(clause.value, base)
          if (clause.cap) {
            amount = Math.min(amount, clause.cap)
          }
          // Allocate proportionally to what is left on each eligible item
          for (const i of elig) {
            const left = remaining.get(i.sku)!
            remaining.set(i.sku, left - (base ? (amount * left) / base : 0))
          }
          if (amount > 0) {
            expected[clause.code] = round(amount)
            expectedItems.set(clause.code, new Set(elig.map((i) => i.sku)))
          }
        }
        const expShipEligible = !!fs && cartItems.some((i) => i.shop && programShops.has(i.shop)) &&
          expSubtotal >= fs.threshold && fs.providers_included.includes(typeOf(o))
        const expSupport = fs && expShipEligible ? Math.min(fs.support, fee) : 0

        // Live engine result for this provider: shared item adjustments plus this method's shipping adjustments
        const actions = sharedActions.filter((a) => a.action !== "addShippingMethodAdjustment" || a.shipping_method_id === `flashsre_sim_ship_${oIdx}`)
        const actual: Record<string, number> = {}
        const actualItems = new Map<string, Set<string>>()
        const actualByItem = new Map<string, Record<string, number>>()
        let support = 0
        const foreignShip: Record<string, number> = {}
        for (const a of actions) {
          if (a.action === "addItemAdjustment") {
            actual[a.code] = (actual[a.code] ?? 0) + num(a.amount)
            const sku = cartItems[Number(String(a.item_id).split("_").pop())]?.sku
            if (sku) {
              actualItems.set(a.code, new Set([...(actualItems.get(a.code) ?? []), sku]))
              const per = actualByItem.get(sku) ?? {}
              per[a.code] = (per[a.code] ?? 0) + num(a.amount)
              actualByItem.set(sku, per)
            }
          }
          if (a.action === "addShippingMethodAdjustment") {
            if (fs && a.code === fs.code) {
              support += num(a.amount)
            } else {
              foreignShip[a.code] = (foreignShip[a.code] ?? 0) + num(a.amount)
            }
          }
        }
        const expTotal = Object.values(expected).reduce((x, y) => x + y, 0)
        const actTotal = Object.values(actual).reduce((x, y) => x + y, 0)
        // Offers of other campaigns that this contract allows are part of what the customer is entitled to
        const foreignAllowedItems = Object.entries(actual).filter(([c]) => !ownCodes.has(c) && allowed.has(c)).reduce((x, [, y]) => x + y, 0)
        const foreignAllowedShip = Object.entries(foreignShip).filter(([c]) => allowed.has(c)).reduce((x, [, y]) => x + y, 0)
        const expPays = expSubtotal - expTotal - foreignAllowedItems + fee - expSupport - foreignAllowedShip
        // What the customer pays is the same cart whichever contract looks at it: count every shipping adjustment
        const actPays = liveSubtotal - actTotal + fee - support - Object.values(foreignShip).reduce((x, y) => x + y, 0)
        // Same cart, same customer, outside the flash slot
        const offActions = engineResults.get(`${def.join("+")}|${seg.key}|off`)
        const offFlash = offActions ? paysFor(offActions, oIdx, cartItems.reduce((s, i) => s + i.off_flash_price, 0), fee) : null
        const cartLabel = def.join("+")
        const meta = {
          cart: cartLabel, skus: def, segment: seg.key, provider: typeOf(o),
          shops: [...new Set(cartItems.map((i) => i.shop ?? "?"))],
          categories: [...new Set(cartItems.flatMap((i) => i.contract_categories.map((c) => catKeyById.get(c)).filter((x): x is string => !!x)))],
        }
        // Items this contract governs; other campaigns' offers only matter when they land on these
        const ownScope = new Set(cartItems.filter((i) => contract.promotions.some((c) => inScope(i, c.scope))).map((i) => i.sku))
        const counted = (code: string) => ownCodes.has(code) || !allowed.has(code)
        const scopedDiscount = [...ownScope].reduce((sum, sku) =>
          sum + Object.entries(actualByItem.get(sku) ?? {}).filter(([c]) => counted(c)).reduce((x, [, y]) => x + y, 0), 0)
        simulation.push({
          scoped_discount: round(scopedDiscount),
          sku: cartLabel, provider: typeOf(o), provider_name: `${o.name} · ${seg.key}`, segment: seg.key,
          unit_price: liveSubtotal, item_discounts: actual, expected_discounts: expected,
          shipping_fee: fee, shipping_support: support, foreign_shipping_support: foreignShip, expected_support: expSupport,
          customer_pays: actPays, expected_pays: expPays, customer_pays_off_flash: offFlash ? offFlash.pays : null,
          foreign_allowed_discount: round(foreignAllowedItems + foreignAllowedShip),
          amount_comparable: !Object.keys(actual).some((c) => !ownCodes.has(c)) && !Object.keys(foreignShip).length,
        })
        // A flash slot exists to make the cart cheaper: the same cart must never cost more in the slot than outside it.
        // Holds without the contract's amounts, so it also catches two approved settings that only clash together
        if (offFlash) {
          const inFlash = paysFor(sharedActions, oIdx, liveSubtotal, fee)
          if (inFlash.pays > offFlash.pays + 1) {
            mismatches.push({
              ...meta, skus: cartItems.filter((i) => ownFlashSkus.has(i.sku)).map((i) => i.sku), code: "", direction: "dearer",
              delta: inFlash.pays - offFlash.pays, pays_in_flash: inFlash.pays, pays_off_flash: offFlash.pays, subtotal_in_flash: liveSubtotal,
              lost: Object.keys(offFlash.byCode).filter((c) => (inFlash.byCode[c] ?? 0) < offFlash.byCode[c] - 1),
            })
          }
        }
        const codes = new Set([...Object.keys(expected), ...Object.keys(actual)])
        const priceDrift = cartItems.some((i) => i.live_price !== i.contract_price)
        // Other campaigns' codes: allowed ones only make amounts incomparable, the rest are stacking conflicts
        const foreignPresent = [...Object.keys(actual), ...Object.keys(foreignShip)].some((c) => !ownCodes.has(c))
        for (const code of [...Object.keys(foreignShip)]) {
          if (!allowed.has(code) && ownScope.size) {
            mismatches.push({ ...meta, code, direction: "stack", delta: foreignShip[code] })
          }
        }
        for (const code of codes) {
          if (!ownCodes.has(code) && !(code in expected)) {
            const onOwn = [...(actualItems.get(code) ?? [])].filter((sku) => ownScope.has(sku))
            if (!allowed.has(code) && onOwn.length) {
              const amount = onOwn.reduce((x, sku) => x + (actualByItem.get(sku)?.[code] ?? 0), 0)
              mismatches.push({ ...meta, skus: onOwn, code, direction: "stack", delta: amount })
            }
            continue
          }
          if (!(code in expected)) {
            mismatches.push({ ...meta, skus: [...(actualItems.get(code) ?? meta.skus)], code, direction: "leak", delta: actual[code] })
          } else if (!(code in actual)) {
            mismatches.push({ ...meta, skus: [...(expectedItems.get(code) ?? meta.skus)], code, direction: "loss", delta: -expected[code] })
          } else {
            // Same code on the cart, but on which items: a mixed cart can leak to one item and lose on another
            const exp = expectedItems.get(code) ?? new Set<string>()
            const act = actualItems.get(code) ?? new Set<string>()
            const leakedTo = [...act].filter((x) => !exp.has(x))
            const lostOn = [...exp].filter((x) => !act.has(x))
            if (leakedTo.length) {
              mismatches.push({ ...meta, skus: leakedTo, code, direction: "leak", delta: actual[code] - expected[code] })
            }
            if (lostOn.length) {
              mismatches.push({ ...meta, skus: lostOn, code, direction: "loss", delta: actual[code] - expected[code] })
            }
            if (!leakedTo.length && !lostOn.length && !priceDrift && Math.abs(actual[code] - expected[code]) > 1) {
              const clause = contract.promotions.find((c) => c.code === code)
              // A voucher's cap holds whatever the order or the other campaigns on the cart: check it on every cart,
              // only the excess counts; what is left of the difference is the order part
              const overCap = !!clause?.cap && actual[code] > clause.cap + 1
              if (overCap) {
                mismatches.push({ ...meta, code, direction: "calc", cause: "cap", delta: actual[code] - clause!.cap! })
              }
              const rest = (overCap ? clause!.cap! : actual[code]) - expected[code]
              if (Math.abs(rest) > 1 && foreignPresent) {
                // Amount depends on how this offer is ordered against other campaigns' offers: no contract says how
                mismatches.push({ ...meta, code, direction: "unordered", delta: rest, foreign: Object.keys(actual).filter((c) => !ownCodes.has(c)) })
              } else if (Math.abs(rest) > 1) {
                mismatches.push({ ...meta, code, direction: "calc", cause: "order", delta: rest })
              }
            }
          }
        }
        if (fs && expSupport > 0 && support === 0) {
          mismatches.push({ ...meta, code: fs.code, direction: "loss", delta: -expSupport })
        } else if (fs && expSupport === 0 && support > 0) {
          mismatches.push({ ...meta, code: fs.code, direction: "leak", delta: support })
        }
      }
    }
  }
  } finally {
    if (shadowIds.length) {
      await promotionModule.deletePromotions(shadowIds)
    }
  }

  // Flash slot dearer than outside it: the flash price and another team's offer condition only clash together
  const dearer = mismatches.filter((m) => m.direction === "dearer")
  if (dearer.length) {
    const skus = [...new Set(dearer.flatMap((m) => m.skus))]
    const lost = [...new Set(dearer.flatMap((m) => m.lost ?? []))]
    const worst = dearer.reduce((a, b) => (b.delta > a.delta ? b : a))
    const ownerOf = (code: string) => contract.promotions.find((c) => c.code === code)?.owner ??
      (code === fs?.code ? fs.owner : foreignOwner.get(code) ?? lastTeamOf(byCode.get(code)?.id ?? null))
    // Non-flash price lists that set the off-flash price of these SKUs (vd khuyến mãi riêng của shop)
    const setIds = new Set(skus.map((s) => variants.find((v) => v.sku === s)?.price_set?.id).filter(Boolean))
    const offLists = priceLists.filter((pl) => isActiveList(pl) && !flashTitles.has(pl.title) &&
      (pl.prices ?? []).some((p: Row) => setIds.has(p.price_set_id) && p.currency_code === market.currency))
    const flashLists = contract.flash.filter((fl) => skus.some((s) => s in fl.prices))
    add({
      invariant: "FLASH_NOT_DEARER_THAN_OFF_FLASH", kind: "CROSS_TEAM_CONFLICT", severity: "high",
      title: `Trong giờ flash khách trả nhiều hơn ngoài giờ flash trên ${dearer.length} giỏ (${skus.join(", ")}): ` +
        `giá flash thấp hơn nhưng mất ${lost.join(", ") || "ưu đãi"}; giỏ ${worst.cart} (${worst.segment}) trả ${round(worst.pays_in_flash!)} thay vì ${round(worst.pays_off_flash!)}`,
      fix_owner: [...new Set([...flashLists.map((fl) => fl.owner), ...lost.map(ownerOf)].filter(Boolean))].join(" + "),
      entities: [
        ...flashLists.map((fl): FindingEntity => ({ type: "price_list", id: priceLists.find((p) => p.title === fl.price_list_title)?.id ?? null, label: fl.price_list_title, owner_team: fl.owner })),
        ...lost.map((c) => promoEntity(c, ownerOf(c) ?? null)),
        ...offLists.map((pl): FindingEntity => ({ type: "price_list", id: pl.id, label: pl.title, owner_team: lastTeamOf(pl.id) })),
      ],
      expected: "trong giờ flash khách không trả nhiều hơn ngoài giờ flash cho cùng giỏ",
      actual: {
        example: {
          cart: worst.cart, segment: worst.segment, provider: worst.provider,
          pays_in_flash: round(worst.pays_in_flash!), pays_off_flash: round(worst.pays_off_flash!), subtotal_in_flash: round(worst.subtotal_in_flash!),
        },
        lost_codes: lost.map((c) => ({ code: c, owner: ownerOf(c) ?? null, min_spend: contract.promotions.find((x) => x.code === c)?.min_spend ?? null })),
        prices: Object.fromEntries(skus.map((s) => [s, { in_flash: itemBySku.get(s)?.live_price, off_flash: itemBySku.get(s)?.off_flash_price }])),
      },
      extra_teams: offLists.map((pl) => lastTeamOf(pl.id)).filter((t): t is string => !!t),
      affected: {
        carts: dearer.length, skus,
        segments: [...new Set(dearer.map((m) => m.segment))],
        providers: [...new Set(dearer.map((m) => m.provider))],
        delta_vnd: round(dearer.reduce((x, m) => x + m.delta, 0)),
      },
    })
  }

  // Group behavioural mismatches per code and direction, and explain them
  const groupsMap = new Map<string, Mismatch[]>()
  for (const m of mismatches.filter((x) => x.direction !== "dearer")) {
    const key = `${m.code}|${m.direction}|${m.cause ?? ""}`
    groupsMap.set(key, [...(groupsMap.get(key) ?? []), m])
  }
  const staticCodes = new Set(
    findings.filter((f) => f.kind === "CONFIG_DRIFT" || f.kind === "MISSING_CONFIG").flatMap((f) => f.entities.map((e) => e.label))
  )
  for (const [key, ms] of groupsMap) {
    const [code, direction, cause] = key.split("|") as [string, Mismatch["direction"], string]
    const clause = contract.promotions.find((c) => c.code === code)
    const owner = clause?.owner ?? (code === fs?.code ? fs.owner : lastTeamOf(byCode.get(code)?.id ?? null))
    const skus = [...new Set(ms.flatMap((m) => m.skus))]
    // Product attributes that differ from the contract's view explain a mismatch without any promotion edit
    const attrCauses: Row[] = []
    for (const sku of skus) {
      const it = itemBySku.get(sku)
      if (!it?.shop) {
        continue
      }
      const shop = taxonomy.shops[it.shop]
      const typeTag = tagIdByValue.get(taxonomy.shop_types[shop.type])
      if (typeTag && !it.live_tags.includes(typeTag)) {
        attrCauses.push({ sku, attribute: "shop_type_tag", expected: taxonomy.shop_types[shop.type] })
      }
      const prog = fs ? taxonomy.programs[fs.program] : undefined
      const progTag = prog ? tagIdByValue.get(prog.tag) : undefined
      if (prog && progTag && prog.shops.includes(it.shop) !== it.live_tags.includes(progTag)) {
        attrCauses.push({ sku, attribute: "program_tag", expected: prog.shops.includes(it.shop) ? prog.tag : `không có ${prog.tag}` })
      }
      const missing = it.contract_categories.filter((c) => !it.live_categories.includes(c) && catKeyById.has(c))
      const extra = it.live_categories.filter((c) => !it.contract_categories.includes(c) && catKeyById.has(c))
      if (missing.length || extra.length) {
        attrCauses.push({
          sku, attribute: "category_assignment",
          expected: it.contract_categories.map((c) => catKeyById.get(c)).filter(Boolean),
          actual: it.live_categories.map((c) => catKeyById.get(c)).filter(Boolean),
        })
      }
      if (it.live_price !== it.contract_price) {
        attrCauses.push({ sku, attribute: "price", expected: it.contract_price, actual: it.live_price })
      }
    }
    const promoChanged = staticCodes.has(code)
    const productDriven = !promoChanged && attrCauses.length > 0
    const unplanned = clause === undefined && code !== fs?.code
    if (direction === "unordered") {
      const foreignCodes = [...new Set(ms.flatMap((m) => m.foreign ?? []))]
      add({
        invariant: "CROSS_CAMPAIGN_ORDER_UNSPECIFIED", kind: "CONTRACT_GAP", severity: "medium",
        title: `${code}: số tiền trên ${ms.length} giỏ phụ thuộc thứ tự áp với ưu đãi của campaign khác (${skus.slice(0, 3).join(", ")}${skus.length > 3 ? "..." : ""}); ` +
          `các contract chưa quy định thứ tự hay cơ sở tính khi cộng với ${foreignCodes.join(", ")}; engine áp theo value giảm dần`,
        fix_owner: `${contract.owner ?? owner ?? "chủ contract"} + chủ các campaign cộng dồn (cần quy định thứ tự)`,
        entities: [promoEntity(code, owner ?? null), ...foreignCodes.map((c) => promoEntity(c, foreignOwner.get(c) ?? null))],
        expected: "contract quy định thứ tự áp và cơ sở tính khi cộng dồn với campaign khác",
        actual: { carts: ms.length, delta_vnd: round(ms.reduce((x, m) => x + m.delta, 0)) },
        extra_teams: contract.owner ? [contract.owner] : [],
        affected: {
          carts: ms.length, skus,
          shops: [...new Set(ms.flatMap((m) => m.shops))],
          segments: [...new Set(ms.map((m) => m.segment))],
          providers: [...new Set(ms.map((m) => m.provider))],
          delta_vnd: round(ms.reduce((x, m) => x + m.delta, 0)),
        },
      })
      continue
    }
    if (direction === "stack") {
      const foreign = foreignOwner.get(code) ?? lastTeamOf(byCode.get(code)?.id ?? null)
      add({
        invariant: "CROSS_CAMPAIGN_STACKING", kind: "CROSS_TEAM_CONFLICT", severity: "high",
        title: `${code} (campaign khác) cộng dồn lên ${ms.length} giỏ của ${contract.contract_id} mà contract này không cho phép (${skus.slice(0, 4).join(", ")})`,
        fix_owner: `${contract.owner ?? "chủ campaign"} + ${foreign ?? "chủ campaign kia"}`,
        entities: [promoEntity(code, foreign ?? null)],
        expected: { allowed_codes: contract.stacking.allowed_codes }, actual: { code, carts: ms.length },
        extra_teams: contract.owner ? [contract.owner] : [],
        affected: {
          carts: ms.length, skus,
          shops: [...new Set(ms.flatMap((m) => m.shops))],
          categories: [...new Set(ms.flatMap((m) => m.categories))],
          segments: [...new Set(ms.map((m) => m.segment))],
          providers: [...new Set(ms.map((m) => m.provider))],
          delta_vnd: round(ms.reduce((x, m) => x + m.delta, 0)),
        },
      })
      continue
    }
    const kind: FindingKind = direction === "calc" && !promoChanged ? "ENGINE_GAP"
      : productDriven || unplanned ? "CROSS_TEAM_CONFLICT" : "CONFIG_DRIFT"
    const money = ms.reduce((s, m) => s + m.delta, 0)
    const label = direction === "leak" ? "áp NGOÀI phạm vi contract" : direction === "loss" ? "BỊ MẤT dù contract cho hưởng"
      : cause === "cap" ? `vượt trần ${clause?.cap ?? ""} của contract (engine không có trường trần giảm giá)`
        : "lệch số tiền vì thứ tự áp: engine áp theo value giảm dần (mã giảm cố định trước mã %), contract tính % trước"
    const productEntities = attrCauses.length ? [...new Set(attrCauses.map((a) => a.sku))].slice(0, 5).map(productEntity) : []
    add({
      invariant: direction === "leak" ? "ELIGIBILITY_LEAK" : direction === "loss" ? "ENTITLEMENT_LOSS"
        : cause === "cap" ? "AMOUNT_CAP_NOT_ENFORCED" : "AMOUNT_ORDER_SEMANTICS",
      kind,
      severity: direction === "calc" ? "medium" : "high",
      title: `${code} ${label} trên ${ms.length} giỏ (${skus.slice(0, 4).join(", ")}${skus.length > 4 ? "..." : ""})` +
        (productDriven ? ` do thuộc tính sản phẩm bị đổi: ${[...new Set(attrCauses.map((a) => a.attribute))].join(", ")}` : ""),
      fix_owner: kind === "ENGINE_GAP" ? "engineering" : productDriven ? `${owner ?? "?"} + chủ sản phẩm` : (owner ?? "?"),
      entities: [promoEntity(code, owner ?? null), ...productEntities],
      expected: direction === "leak" ? "không áp dụng" : "áp dụng theo contract",
      actual: {
        carts: ms.length, delta_vnd: round(money), causes: attrCauses.slice(0, 8),
        // Engine gap: what the engine does and where, so the claim can be checked; root cause stays a diagnosis until
        // the agent shows in the sandbox that no configuration change removes it
        ...(kind === "ENGINE_GAP" ? {
          root_cause_status: "chẩn đoán (chưa xác nhận): không có thay đổi cấu hình nào trên promotion này; cần phép thử sandbox của agent",
          engine_evidence: cause === "cap"
            ? { rule: "Medusa 2.21.2 không có trường trần giảm giá cho promotion; chỉ có max_quantity", source: "@medusajs/promotion application_method (value, max_quantity, allocation)", cap: clause?.cap ?? null, max_excess_vnd: round(Math.max(...ms.map((m) => m.delta))) }
            : { rule: "computeActions nạp promotion theo application_method.value giảm dần (mã cố định 100.000 trước mã 10%); % tính trên phần còn lại", source: "@medusajs/promotion/dist/services/promotion-module.js: order { application_method: { value: 'DESC' } }" },
          example: { cart: ms[0].skus.join("+"), segment: ms[0].segment, provider: ms[0].provider, delta_vnd: round(ms[0].delta) },
        } : {}),
      },
      affected: {
        carts: ms.length,
        skus,
        shops: [...new Set(ms.flatMap((m) => m.shops))],
        categories: [...new Set(ms.flatMap((m) => m.categories))],
        segments: [...new Set(ms.map((m) => m.segment))],
        providers: [...new Set(ms.map((m) => m.provider))],
        delta_vnd: round(money),
      },
    })
  }

  // Intent-level: two approved contracts disagree on whether their offers may stack on the same items
  for (const oc of others) {
    const theirAllowed = new Set(oc.stacking.allowed_codes)
    for (const c of contract.promotions) {
      for (const d of oc.promotions) {
        const overlap = items.filter((i) => inScope(i, c.scope) && inScope(i, d.scope)).map((i) => i.sku)
        if (!overlap.length) {
          continue
        }
        const weAllow = allowed.has(d.code)
        const theyAllow = theirAllowed.has(c.code)
        if (weAllow !== theyAllow) {
          add({
            invariant: "CONTRACT_STACKING_AGREEMENT", kind: "CONTRACT_CONFLICT", severity: "high",
            title: `${contract.contract_id} ${weAllow ? "cho" : "không cho"} cộng ${d.code}, nhưng ${oc.contract_id} ${theyAllow ? "cho" : "không cho"} cộng ${c.code} trên cùng sản phẩm (${overlap.slice(0, 3).join(", ")}${overlap.length > 3 ? "..." : ""})`,
            fix_owner: `${contract.owner ?? c.owner} + ${oc.owner ?? d.owner} (cần thống nhất ý định)`,
            entities: [promoEntity(c.code, c.owner), promoEntity(d.code, d.owner)],
            expected: "hai contract thống nhất quy tắc cộng dồn",
            actual: { [contract.contract_id]: { allows: d.code, value: weAllow }, [oc.contract_id]: { allows: c.code, value: theyAllow } },
            extra_teams: [contract.owner, oc.owner].filter((t): t is string => !!t),
            affected: { skus: overlap },
          })
        }
      }
    }
  }

  // Order-level subsidy ceiling
  // The ceiling covers this contract's own subsidies; allowed offers of other campaigns are budgeted by their owners
  const worst = simulation.reduce((m, s) => (s.scoped_discount > m.t ? { t: s.scoped_discount as number, s } : m),
    { t: 0, s: null as Row | null })
  if (worst.t > contract.stacking.max_item_discount_per_order) {
    const unplanned = Object.keys(worst.s?.item_discounts ?? {}).filter((c) => !contract.stacking.allowed_codes.includes(c))
    const all = worst.s?.item_discounts as Record<string, number> ?? {}
    const allTotal = Object.values(all).reduce((x, y) => x + y, 0)
    const foreignAllowed = Object.entries(all).filter(([c]) => !ownCodes.has(c) && allowed.has(c))
    add({
      invariant: "MAX_ITEM_DISCOUNT_PER_ORDER", kind: unplanned.length ? "CROSS_TEAM_CONFLICT" : "ENGINE_GAP", severity: "high",
      title: `Giỏ ${worst.s?.segment ? `${worst.s.sku} (${worst.s.segment})` : worst.s?.sku}: ưu đãi thuộc ${contract.contract_id} là ${round(worst.t)}, vượt trần ${contract.stacking.max_item_discount_per_order}` +
        (unplanned.length ? ` do cộng dồn ${unplanned.join(", ")}` : "") +
        (foreignAllowed.length ? `; tổng mọi ưu đãi trên giỏ ${round(allTotal)} (gồm ${foreignAllowed.map(([c]) => c).join(", ")} của campaign khác, được phép cộng, không tính vào trần này)` : ""),
      fix_owner: unplanned.length ? "finance + marketing" : "engineering",
      // Contract's own codes first (stable key), then the other campaigns' codes that were also on the cart
      entities: [
        ...Object.keys(all).filter((c) => ownCodes.has(c) || !allowed.has(c)),
        ...foreignAllowed.map(([c]) => c),
      ].map((c) => promoEntity(c, contract.promotions.find((x) => x.code === c)?.owner ?? foreignOwner.get(c) ?? lastTeamOf(byCode.get(c)?.id ?? null))),
      expected: { max: contract.stacking.max_item_discount_per_order, ceiling_scope: "ưu đãi của contract này trên item trong phạm vi" },
      actual: {
        cart: worst.s?.sku, segment: worst.s?.segment, provider: worst.s?.provider,
        own_and_unplanned_in_scope: round(worst.t),
        other_campaigns_allowed: Object.fromEntries(foreignAllowed.map(([c, v]) => [c, round(v)])),
        all_discounts_on_cart: round(allTotal),
        by_code: Object.fromEntries(Object.entries(all).map(([c, v]) => [c, round(v)])),
        customer_pays: round(worst.s?.customer_pays ?? 0),
      },
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
