#!/usr/bin/env node
/**
 * Demo FlashSRE chạy trên Medusa thật (lab marketplace 11.11).
 *   BASE=... PASSWORD=... FLASHSRE_TEAM_PASSWORD=... node incidents/demo/medusa-server.mjs [port]  ->  http://localhost:5179
 *
 * - Điện thoại: mỗi lần tính là một giỏ mới tạo qua Store API; giá, ưu đãi, tổng tiền là số Medusa trả về.
 * - Demo Control: nạp kịch bản = setup lab sạch rồi từng team cấu hình bằng tài khoản của mình (có audit).
 * - Medusa dùng giờ thật, nên đồng hồ demo bật/tắt price list và promotion có khung giờ theo giờ mô phỏng.
 * - Lý do một mã không áp được FlashSRE suy ra từ rule của promotion và số của giỏ Medusa (Medusa không trả lý do).
 * Credential chỉ nằm ở server này; trình duyệt không thấy mật khẩu.
 */
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { at, fmtTime, vnd } from './engine.mjs'
import { INVARIANTS } from '../agent/knowledge.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE || 'https://flashsre-commerce-30123348ca77.herokuapp.com'
process.env.BASE = BASE
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 5179)
const TEAM_PASSWORD = process.env.FLASHSRE_TEAM_PASSWORD
if (!process.env.PASSWORD) { console.error('Thiếu PASSWORD (admin Medusa)'); process.exit(1) }
const lab = await import('../marketplace-1111.mjs')
const { world, contracts } = lab.exportScenarios()
const STATE_FILE = join(DIR, '..', 'out', `marketplace-state-${new URL(BASE).host.replace(/[^a-z0-9.-]/gi, '_')}.json`)
const DAY = '2026-11-11'
const T = (hm) => at(DAY, hm)
const log = (...a) => console.error(...a)

const TEAM_EMAILS = {
  merchandising: 'merch@flashsre.dev', seller_ops: 'sellerops@flashsre.dev', marketing: 'marketing@flashsre.dev',
  logistics: 'logistics@flashsre.dev', finance: 'finance@flashsre.dev', category: 'category@flashsre.dev',
}
const FLASH_TITLE = contracts['CT-1111-MARKETPLACE'].flash[0].price_list_title
const EXTRA = 'FS-MK-X-'

// ------------------------------------------------------------------ Medusa client
const tokens = new Map()
async function http(path, { method = 'GET', body, bearer, pk } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (bearer) headers.Authorization = `Bearer ${bearer}`
  if (pk) headers['x-publishable-api-key'] = pk
  for (let i = 0; ; i++) {
    const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
    const json = await r.json().catch(() => null)
    if (r.ok) return json
    if (r.status >= 500 && i < 2) { await new Promise((ok) => setTimeout(ok, 800 * (i + 1))); continue }
    const e = new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(json)?.slice(0, 240)}`)
    e.status = r.status
    throw e
  }
}
async function tokenOf(team = 'admin') {
  if (!tokens.has(team)) {
    const email = team === 'admin' || !TEAM_PASSWORD ? 'admin@flashsre.dev' : TEAM_EMAILS[team]
    const password = team === 'admin' || !TEAM_PASSWORD ? process.env.PASSWORD : TEAM_PASSWORD
    tokens.set(team, (await http('/auth/user/emailpass', { method: 'POST', body: { email, password } })).token)
  }
  return tokens.get(team)
}
const admin = async (path, opts = {}) => http(path, { ...opts, bearer: await tokenOf(opts.team ?? 'admin') })
let ids = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : null
const store = (path, opts = {}) => http(path, { ...opts, pk: ids.pk })

// ------------------------------------------------------------------ catalog và cấu hình hiện tại
const SKUS = world.products.flatMap((p) => p.skus.map((sku) => ({ sku, title: p.title, shop: p.shop, cat: p.cat, price: p.price, handle: p.handle })))
const contractPromos = Object.values(contracts).flatMap((c) => c.promotions.map((p) => ({ ...p, contract: c.contract_id })))
const fsC = contracts['CT-1111-MARKETPLACE'].freeship
const PROMO_META = {
  ...Object.fromEntries(contractPromos.map((p) => [p.code, {
    owner: p.owner, cap: p.cap ?? null, contract: p.contract,
    kind: p.code.includes('-BD-') ? 'brand_day' : p.sponsor === 'shop' ? 'shop' : p.segments !== 'ALL' && Array.isArray(p.segments) ? 'segment' : p.sponsor === 'category' ? 'category' : 'platform',
  }])),
  [fsC.code]: { owner: fsC.owner, cap: null, contract: 'CT-1111-MARKETPLACE', kind: 'freeship' },
}
const KIND_LABEL = { shop: 'Voucher shop', platform: 'Voucher sàn', brand_day: 'Brand Day', freeship: 'Freeship', segment: 'Ưu đãi khách mới', category: 'Ưu đãi ngành hàng' }

let catalog = null // sku -> { variant_id, product_id, collection_id, tags[], categories[] }
async function loadCatalog() {
  const r = await admin('/admin/products?limit=200&fields=id,handle,title,collection_id,tags.id,categories.id,variants.id,variants.sku')
  catalog = {}
  for (const p of r.products.filter((x) => x.handle.startsWith('fs-mk-'))) {
    for (const v of p.variants) catalog[v.sku] = { variant_id: v.id, product_id: p.id, collection_id: p.collection_id, tags: p.tags.map((t) => t.id), categories: p.categories.map((c) => c.id) }
  }
  // Admin API không trả price set của biến thể; Store API trả nó ở calculated_price.id
  const handles = [...new Set(SKUS.map((x) => x.handle))].map((h) => `handle[]=${encodeURIComponent(h)}`).join('&')
  const sp = await http(`/store/products?${handles}&region_id=${ids.region}&fields=variants.sku,*variants.calculated_price&limit=100`, { pk: ids.pk })
  for (const p of sp.products) for (const v of p.variants) if (catalog[v.sku] && v.calculated_price?.id) catalog[v.sku].price_set_id = v.calculated_price.id
}
const inv = (o) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [v, k]))
function names() {
  const shopTitle = Object.fromEntries(world.shops.map((s) => [s.key, s.title]))
  const catName = Object.fromEntries(world.categories.map((c) => [c.key, c.name]))
  const tagLabel = { 'fs-shop-mall': 'shop Mall', 'fs-shop-preferred-plus': 'shop Yêu thích+', 'fs-shop-preferred': 'shop Yêu thích', 'fs-shop-normal': 'shop thường', 'fs-freeship-xtra': 'chương trình Freeship Xtra' }
  return {
    collection: Object.fromEntries(Object.entries(ids.shops).map(([k, id]) => [id, `shop ${shopTitle[k] ?? k}`])),
    category: Object.fromEntries(Object.entries(ids.categories).map(([k, id]) => [id, `ngành ${catName[k] ?? k}`])),
    tag: Object.fromEntries(Object.entries(ids.tags).map(([k, id]) => [id, tagLabel[k] ?? k])),
    type: inv(ids.types),
  }
}

let providers = []
async function loadProviders() {
  const r = await admin('/admin/shipping-options?limit=200&fields=id,name,prices.amount,prices.currency_code')
  const byId = inv(ids.options)
  const LABEL = { 'fs-ghn': 'GHN', 'fs-ghtk': 'GHTK', 'fs-vtp': 'Viettel Post', 'fs-ahamove': 'Ahamove', 'fs-jt': 'J&T Express' }
  providers = r.shipping_options.filter((o) => byId[o.id]).map((o) => ({ id: byId[o.id], option_id: o.id, type_id: ids.types[byId[o.id]], name: LABEL[byId[o.id]] ?? o.name, fee: Number(o.prices.find((p) => p.currency_code === 'vnd')?.amount ?? 0) }))
    .sort((a, b) => Object.keys(LABEL).indexOf(a.id) - Object.keys(LABEL).indexOf(b.id))
}

const PROMO_FIELDS = 'id,code,status,is_automatic,campaign_id,*campaign,*campaign.budget,*application_method,*application_method.target_rules,*application_method.target_rules.values,*rules,*rules.values'
async function loadPromotions() {
  const r = await admin(`/admin/promotions?limit=200&fields=${PROMO_FIELDS}`)
  return r.promotions.filter((p) => p.code?.startsWith('FS-MK-')).map((p) => ({
    id: p.id, code: p.code, status: p.status, auto: !!p.is_automatic,
    type: p.application_method?.type, value: Number(p.application_method?.value ?? 0), target_type: p.application_method?.target_type,
    target_rules: (p.application_method?.target_rules ?? []).map((x) => ({ id: x.id, attribute: x.attribute, operator: x.operator, values: x.values.map((v) => v.value) })),
    rules: (p.rules ?? []).map((x) => ({ id: x.id, attribute: x.attribute, operator: x.operator, values: x.values.map((v) => v.value) })),
    campaign: p.campaign ? { id: p.campaign.id, identifier: p.campaign.campaign_identifier, starts_at: p.campaign.starts_at, ends_at: p.campaign.ends_at, budget: p.campaign.budget ? { id: p.campaign.budget.id, type: p.campaign.budget.type, limit: p.campaign.budget.limit == null ? null : Number(p.campaign.budget.limit), used: Number(p.campaign.budget.used ?? 0) } : null } : null,
    ...(PROMO_META[p.code] ?? { owner: null, cap: null, kind: 'platform' }),
  })).sort((a, b) => Object.keys(KIND_LABEL).indexOf(a.kind) - Object.keys(KIND_LABEL).indexOf(b.kind) || a.code.localeCompare(b.code))
}
async function loadPriceLists() {
  const r = await admin('/admin/price-lists?limit=200&fields=id,title,status,type,starts_at,ends_at,*prices')
  const bySku = inv(Object.fromEntries(Object.entries(catalog).map(([sku, c]) => [sku, c.price_set_id])))
  return r.price_lists.filter((l) => l.title === FLASH_TITLE || l.title.startsWith(EXTRA)).map((l) => ({
    id: l.id, title: l.title, status: l.status, type: l.type, team: l.title === FLASH_TITLE ? 'merchandising' : 'seller_ops',
    label: l.title === FLASH_TITLE ? 'Flash Sale 20–22h' : l.title.replace(EXTRA, ''),
    prices: (l.prices ?? []).filter((p) => p.currency_code === 'vnd' && bySku[p.price_set_id]).map((p) => ({ id: p.id, sku: bySku[p.price_set_id], amount: Number(p.amount) })),
  }))
}
async function config() {
  const [promotions, price_lists] = await Promise.all([loadPromotions(), loadPriceLists()])
  return { promotions, price_lists, providers }
}

// ------------------------------------------------------------------ phiên demo (một người demo)
const S = { scenario: null, now: T('19:00'), spec: { lines: [], segment: 'REGULAR', provider: 'fs-ghn', codes: [] }, windows: [], baseline: null, actions: [], busy: null, error: null, base_findings: null, loaded_at: null, toggles: {}, patches: [] }
const act = (team, text) => { S.actions.unshift({ at: Date.now(), demo_at: S.now, team, text }); S.actions = S.actions.slice(0, 100) }

async function newCustomerToken() {
  const email = 'fsx.demo.new@flashsre.dev'
  const pw = 'fsx-demo-new'
  let tok
  try { tok = (await http('/auth/customer/emailpass', { method: 'POST', body: { email, password: pw } })).token } catch {
    const reg = (await http('/auth/customer/emailpass/register', { method: 'POST', body: { email, password: pw } })).token
    await http('/store/customers', { method: 'POST', bearer: reg, pk: ids.pk, body: { email, first_name: 'Khách', last_name: 'Mới' } })
    tok = (await http('/auth/customer/emailpass', { method: 'POST', body: { email, password: pw } })).token
  }
  const me = (await http('/store/customers/me', { bearer: tok, pk: ids.pk })).customer
  await admin(`/admin/customer-groups/${ids.new_group}/customers`, { method: 'POST', body: { add: [me.id] } }).catch(() => null)
  return tok
}

// ------------------------------------------------------------------ đo giỏ trên Medusa
const CART_FIELDS = 'id,total,subtotal,item_subtotal,item_total,shipping_subtotal,shipping_total,discount_total,promotions.code,items.id,items.variant_sku,items.quantity,items.unit_price,items.compare_at_unit_price,items.subtotal,items.adjustments.code,items.adjustments.amount,shipping_methods.amount,shipping_methods.shipping_option_id,shipping_methods.adjustments.code,shipping_methods.adjustments.amount'

async function prices(skus, bearer) {
  const handles = [...new Set(skus.map((s) => SKUS.find((x) => x.sku === s)?.handle).filter(Boolean))]
  if (!handles.length) return {}
  const qs = handles.map((h) => `handle[]=${encodeURIComponent(h)}`).join('&')
  const r = await http(`/store/products?${qs}&region_id=${ids.region}&fields=id,handle,variants.sku,*variants.calculated_price&limit=50`, { pk: ids.pk, bearer })
  const out = {}
  for (const p of r.products) for (const v of p.variants) {
    const c = v.calculated_price
    out[v.sku] = { amount: Number(c?.calculated_amount), original: Number(c?.original_amount), price_list_id: c?.calculated_price?.price_list_id ?? null, price_list_type: c?.calculated_price?.price_list_type ?? null }
  }
  return out
}

async function measure(spec = S.spec) {
  const lines = spec.lines.filter((l) => l.qty > 0 && catalog[l.sku])
  const bearer = spec.segment === 'NEW' ? await newCustomerToken() : undefined
  // đọc cấu hình song song với lúc tạo giỏ
  const meta = Promise.all([loadPriceLists(), prices(lines.map((l) => l.sku), bearer), loadPromotions(), liveContracts()])
  if (!lines.length) return { empty: true, items: [], totals: { item_subtotal: 0, discount_total: 0, shipping_subtotal: 0, total: 0 }, applied: [], explain: explain(null, spec, (await meta)[2]) }
  const cart = (await http('/store/carts', {
    method: 'POST', pk: ids.pk, bearer,
    body: {
      region_id: ids.region, sales_channel_id: ids.sales_channel, email: spec.segment === 'NEW' ? 'fsx.demo.new@flashsre.dev' : 'fsx.demo.guest@flashsre.dev',
      items: lines.map((l) => ({ variant_id: catalog[l.sku].variant_id, quantity: l.qty })),
      shipping_address: { first_name: 'Lan', last_name: 'Nguyễn', address_1: '1 Lê Lợi', city: 'Hà Nội', country_code: 'vn', postal_code: '100000' },
    },
  })).cart
  const option = providers.find((p) => p.id === spec.provider)
  if (option) await http(`/store/carts/${cart.id}/shipping-methods`, { method: 'POST', pk: ids.pk, bearer, body: { option_id: option.option_id } })
  const codes = spec.codes.filter(Boolean)
  const rejected = []
  if (codes.length) {
    await http(`/store/carts/${cart.id}/promotions`, { method: 'POST', pk: ids.pk, bearer, body: { promo_codes: codes } }).catch((e) => rejected.push(e.message))
  } else {
    await http(`/store/carts/${cart.id}`, { method: 'POST', pk: ids.pk, bearer, body: { email: spec.segment === 'NEW' ? 'fsx.demo.new@flashsre.dev' : 'fsx.demo.guest2@flashsre.dev' } })
  }
  const c = (await http(`/store/carts/${cart.id}?fields=${CART_FIELDS}`, { pk: ids.pk, bearer })).cart
  const [lists, pr, promos, live] = await meta
  const listById = Object.fromEntries(lists.map((l) => [l.id, l]))
  const items = c.items.map((i) => {
    const meta = SKUS.find((x) => x.sku === i.variant_sku)
    const p = pr[i.variant_sku]
    const pl = p?.price_list_id ? listById[p.price_list_id] : null
    return {
      sku: i.variant_sku, title: meta?.title, shop: meta?.shop, qty: i.quantity, unit_price: Number(i.unit_price), list_price: meta?.price ?? Number(i.unit_price),
      source: pl ? { id: pl.id, title: pl.label, team: pl.team, type: p.price_list_type } : null,
      adjustments: (i.adjustments ?? []).map((a) => ({ code: a.code, amount: Number(a.amount) })),
    }
  })
  const sm = c.shipping_methods?.[0]
  const shipAdj = (sm?.adjustments ?? []).map((a) => ({ code: a.code, amount: Number(a.amount) }))
  const byCode = {}
  for (const a of [...items.flatMap((i) => i.adjustments), ...shipAdj]) byCode[a.code] = (byCode[a.code] ?? 0) + a.amount
  const result = {
    cart_id: c.id, items,
    shipping: { provider: spec.provider, name: option?.name, fee: Number(sm?.amount ?? 0), adjustments: shipAdj },
    totals: {
      item_subtotal: Number(c.item_subtotal), discount_total: Number(c.discount_total), shipping_subtotal: Number(c.shipping_subtotal),
      shipping_discount: shipAdj.reduce((s, a) => s + a.amount, 0), total: Number(c.total),
    },
    applied: Object.entries(byCode).map(([code, amount]) => ({ code, amount, kind: PROMO_META[code]?.kind ?? 'platform', owner: PROMO_META[code]?.owner ?? null })),
    cart_promotions: (c.promotions ?? []).map((p) => p.code),
    rejected,
  }
  result.explain = explain(result, spec, promos)
  result.by_shop = byShop(result, live)
  return result
}

// ------------------------------------------------------------------ ai chịu khoản giảm (sponsor trong contract đang duyệt)
async function liveContracts() {
  const r = await admin('/admin/flashsre/contracts')
  const latest = {}
  for (const c of r.contracts) if (!latest[c.contract_id] || c.version > latest[c.contract_id].version) latest[c.contract_id] = c
  return Object.values(latest).map((c) => c.body)
}
const sponsorOf = (code, live) => live.flatMap((c) => c.promotions ?? []).find((p) => p.code === code)?.sponsor ?? 'platform'
// Theo từng shop trong giỏ: tiền hàng, phần giảm shop tự chịu, phần sàn/ngành chịu
function byShop(result, live) {
  if (!result || !live) return null
  const out = {}
  for (const i of result.items) {
    const s = (out[i.shop] ??= { shop: i.shop, title: world.shops.find((x) => x.key === i.shop)?.title ?? i.shop, gross: 0, shop_funded: 0, platform_funded: 0, codes: {} })
    s.gross += i.unit_price * i.qty
    for (const a of i.adjustments) {
      if (sponsorOf(a.code, live) === 'shop') s.shop_funded += a.amount
      else s.platform_funded += a.amount
      s.codes[a.code] = (s.codes[a.code] ?? 0) + a.amount
    }
  }
  return out
}

// Lý do mã không áp: suy ra từ rule promotion và số của giỏ Medusa
function explain(result, spec, promos) {
  const N = names()
  const label = (attr, v) => (attr.endsWith('collection_id') ? N.collection[v] : attr.endsWith('categories.id') ? N.category[v] : attr.endsWith('tags.id') ? N.tag[v] : attr.endsWith('shipping_option_type_id') ? (providers.find((p) => p.type_id === v)?.name ?? N.type[v]) : v) ?? v
  const lines = spec.lines.filter((l) => l.qty > 0 && catalog[l.sku])
  const itemMatches = (rule, sku) => {
    const c = catalog[sku]
    const has = rule.attribute.endsWith('collection_id') ? [c.collection_id] : rule.attribute.endsWith('categories.id') ? c.categories : rule.attribute.endsWith('tags.id') ? c.tags : null
    return !has || rule.values.some((v) => has.includes(v))
  }
  const option = providers.find((p) => p.id === spec.provider)
  const subtotal = result?.totals.item_subtotal ?? 0
  return promos.map((p) => {
    const applied = result?.applied.find((a) => a.code === p.code)?.amount ?? 0
    const entered = spec.codes.includes(p.code)
    const base = {
      code: p.code, kind: p.kind, kind_label: KIND_LABEL[p.kind], owner: p.owner, auto: p.auto, status: p.status, entered,
      headline: p.target_type === 'shipping_methods' ? `Hỗ trợ ship tối đa ${vnd(p.value)}` : p.type === 'percentage' ? `Giảm ${p.value}%${p.cap ? ` · tối đa ${vnd(p.cap)} theo contract` : ''}` : `Giảm ${vnd(p.value)}`,
      conditions: [], applied_amount: applied,
    }
    const minRule = p.rules.find((r) => r.attribute === 'item_subtotal' || r.attribute === 'item_total')
    if (minRule) base.conditions.push(`Đơn tối thiểu ${vnd(Number(minRule.values[0]))} (${minRule.attribute === 'item_subtotal' ? 'tiền hàng trước giảm' : 'tiền hàng sau giảm'})`)
    for (const r of [...p.rules, ...p.target_rules].filter((x) => /collection_id|categories\.id|tags\.id|shipping_option_type_id/.test(x.attribute))) base.conditions.push(r.values.map((v) => label(r.attribute, v)).join(' / '))
    if (p.rules.some((r) => r.attribute === 'customer.groups.id')) base.conditions.push('Chỉ khách hàng mới')
    if (p.cap) base.conditions.push(`Contract ghi trần ${vnd(p.cap)}; Medusa 2.21 không có trần giảm`)
    if (applied > 0) return { ...base, state: 'applied', reason: '' }
    // mã tự động chỉ tính là "đã chọn" khi giỏ có hàng thuộc phạm vi của nó
    const why = (code, text, extra = {}) => ({ ...base, state: entered || (p.auto && !['SCOPE', 'EMPTY'].includes(code)) ? 'selected_not_applied' : 'blocked', reason_code: code, reason: text, ...extra })
    if (!lines.length) return why('EMPTY', 'Giỏ hàng đang trống.')
    const win = S.windows.find((w) => w.kind === 'promotion' && w.id === p.id)
    if (win && S.now < win.start) return why('NOT_STARTED', `Bắt đầu lúc ${fmtTime(win.start)} (giờ demo).`)
    if (win && S.now >= win.end) return why('EXPIRED', `Đã kết thúc lúc ${fmtTime(win.end)} (giờ demo).`)
    if (p.status !== 'active') return why('PAUSED', `Đang tạm dừng trên Medusa (status ${p.status})${p.owner ? `, chương trình của ${p.owner}` : ''}.`)
    const nowReal = Date.now()
    if (p.campaign?.starts_at && Date.parse(p.campaign.starts_at) > nowReal) return why('NOT_STARTED', 'Campaign chưa bắt đầu.')
    if (p.campaign?.ends_at && Date.parse(p.campaign.ends_at) <= nowReal) return why('EXPIRED', 'Campaign đã kết thúc.')
    for (const r of p.rules) {
      if (r.attribute === 'item_subtotal' && subtotal < Number(r.values[0])) {
        const min = Number(r.values[0])
        return why('MIN_SPEND', `Cần thêm ${vnd(min - subtotal)} để đạt mức tối thiểu ${vnd(min)} (Medusa tính tiền hàng ${vnd(subtotal)}).`, { missing: min - subtotal })
      }
      if (r.attribute === 'customer.groups.id' && spec.segment !== 'NEW') return why('SEGMENT', 'Chỉ áp dụng cho khách hàng mới.')
      if (/^items\.product\./.test(r.attribute) && !lines.some((l) => itemMatches(r, l.sku))) return why('SCOPE', `Giỏ không có sản phẩm thuộc ${r.values.map((v) => label(r.attribute, v)).join(' / ')}.`)
    }
    if (p.target_type === 'items') {
      const targeted = lines.filter((l) => p.target_rules.every((r) => itemMatches(r, l.sku)))
      if (!targeted.length) return why('SCOPE', `Chỉ áp dụng cho ${p.target_rules.map((r) => r.values.map((v) => label(r.attribute, v)).join(' / ')).join(' · ') || 'sản phẩm trong phạm vi'}; giỏ không có sản phẩm phù hợp.`)
    } else {
      const tr = p.target_rules.find((r) => r.attribute.endsWith('shipping_option_type_id'))
      if (tr && option && !tr.values.includes(option.type_id)) return why('PROVIDER', `Không hỗ trợ ${option.name}. Có thể dùng với ${tr.values.map((v) => label(tr.attribute, v)).join(', ')}.`)
    }
    const b = p.campaign?.budget
    if (b?.type === 'spend' && b.limit != null && b.used >= b.limit) return why('BUDGET', `Ngân sách campaign đã dùng hết (${vnd(b.used)}/${vnd(b.limit)}).`)
    if (b?.type === 'spend' && b.limit != null && entered) return why('BUDGET', `Ngân sách campaign còn ${vnd(b.limit - b.used)}, có thể không đủ cho khoản giảm. Medusa không giảm một phần.`)
    if (!entered && !p.auto) return { ...base, state: 'available', reason: 'Đủ điều kiện theo rule. Chọn để Medusa tính.' }
    return why('UNKNOWN', 'Medusa không áp mã này; FlashSRE chưa xác định được lý do từ rule.')
  })
}

// ------------------------------------------------------------------ đồng hồ demo -> lịch trên Medusa
// Price list giữ status active và dùng lịch thật của Medusa: chưa tới giờ thì lịch nằm ở tương lai (đã lên lịch),
// đang trong khung thì bao quanh giờ thật, đã qua thì nằm ở quá khứ. Promotion bật/tắt status (campaign dùng chung lịch).
const DAY_MS = 864e5
function shiftedWindow(w) {
  const real = Date.now()
  const dur = w.end - w.start
  if (S.now < w.start) return { starts_at: new Date(real + 30 * DAY_MS).toISOString(), ends_at: new Date(real + 30 * DAY_MS + dur).toISOString() }
  if (S.now >= w.end) return { starts_at: new Date(real - 30 * DAY_MS - dur).toISOString(), ends_at: new Date(real - 30 * DAY_MS).toISOString() }
  return { starts_at: new Date(real - DAY_MS).toISOString(), ends_at: new Date(real + 30 * DAY_MS).toISOString() }
}
async function syncClock() {
  let changed = 0
  for (const w of S.windows) {
    const on = S.now >= w.start && S.now < w.end
    const phase = S.now < w.start ? 'before' : on ? 'on' : 'after'
    if (w.phase === phase) continue
    if (w.kind === 'price_list') await admin(`/admin/price-lists/${w.id}`, { method: 'POST', body: { status: 'active', ...shiftedWindow(w) } })
    else await admin(`/admin/promotions/${w.id}`, { method: 'POST', body: { status: on ? 'active' : 'inactive' } })
    w.phase = phase
    w.on = on
    changed++
    act(null, `Đồng hồ demo ${fmtTime(S.now)}: ${on ? 'bật' : 'tắt'} ${w.label}`)
  }
  return changed
}

// ------------------------------------------------------------------ thao tác của các team
async function promoByCode(code) { return (await loadPromotions()).find((p) => p.code === code) }
async function flashList() { return (await loadPriceLists()).find((l) => l.title === FLASH_TITLE) }

async function setListPrice(list, sku, amount, team) {
  // xóa giá cũ và tạo giá mới trong cùng một batch (update theo id không ăn với mọi biến thể)
  const cur = list.prices.filter((p) => p.sku === sku)
  const body = { delete: cur.map((p) => p.id), create: amount == null ? [] : [{ variant_id: catalog[sku].variant_id, currency_code: 'vnd', amount }] }
  await admin(`/admin/price-lists/${list.id}/prices/batch`, { method: 'POST', team, body })
}
async function setRule(p, attribute, values, team, operator = 'in', path = 'rules') {
  const list = path === 'rules' ? p.rules : p.target_rules
  const r = list.find((x) => x.attribute === attribute)
  const body = values === null ? { delete: r ? [r.id] : [] } : r ? { update: [{ id: r.id, attribute, operator, values }] } : { create: [{ attribute, operator, values }] }
  await admin(`/admin/promotions/${p.id}/${path === 'rules' ? 'rules' : 'target-rules'}/batch`, { method: 'POST', team, body })
}

// Contract 11.11 sau mọi sửa đổi của kịch bản (lab dựng lại từ bản gốc mỗi lần đăng, nên giữ chuỗi sửa đổi ở đây)
async function patchContract(team, fn) {
  S.patches.push(fn)
  await lab.asTeam(team)
  await lab.postContracts({ 'CT-1111-MARKETPLACE': (c) => S.patches.reduce((x, f) => f(x), c) })
}
const mapPromo = (c, code, fn) => ({ ...c, promotions: c.promotions.map((p) => (p.code === code ? fn(p) : p)) })

const OPS = {
  // Merchandising chốt giá flash và cập nhật contract đã duyệt theo giá mới
  async flash_contract({ prices }) {
    await patchContract('merchandising', (c) => ({ ...c, flash: [{ ...c.flash[0], prices: { ...c.flash[0].prices, ...prices } }] }))
    for (const [sku, amount] of Object.entries(prices)) await setListPrice(await flashList(), sku, amount, 'merchandising')
    act('merchandising', `Chốt giá flash ${Object.entries(prices).map(([s, a]) => `${SKUS.find((x) => x.sku === s)?.title} ${vnd(a)}`).join(', ')} và cập nhật contract`)
  },
  async shop_price({ label, prices }) {
    const title = `${EXTRA}${label}`
    const existing = (await loadPriceLists()).find((l) => l.title === title)
    if (existing) for (const [sku, amount] of Object.entries(prices)) await setListPrice((await loadPriceLists()).find((l) => l.id === existing.id), sku, amount, 'seller_ops')
    else await admin('/admin/price-lists', { method: 'POST', team: 'seller_ops', body: { title, description: 'Khuyến mãi của shop (demo)', type: 'sale', status: 'active', prices: Object.entries(prices).map(([sku, amount]) => ({ variant_id: catalog[sku].variant_id, currency_code: 'vnd', amount })) } })
    act('seller_ops', `${label}: ${Object.entries(prices).map(([s, a]) => `${SKUS.find((x) => x.sku === s)?.title} ${vnd(a)}`).join(', ')}`)
  },
  async price({ list_id, sku, amount }) {
    const list = (await loadPriceLists()).find((l) => l.id === list_id)
    await setListPrice(list, sku, amount, list.team)
    act(list.team, `${list.label}: ${SKUS.find((x) => x.sku === sku)?.title} ${amount == null ? 'bỏ giá' : vnd(amount)}`)
  },
  async promo_status({ code, active }) {
    const p = await promoByCode(code)
    await admin(`/admin/promotions/${p.id}`, { method: 'POST', team: p.owner, body: { status: active ? 'active' : 'inactive' } })
    // đồng hồ chỉ đổi lại ở mốc giờ kế tiếp, không ghi đè thao tác vừa làm
    const w = S.windows.find((x) => x.id === p.id)
    if (w) w.on = active
    act(p.owner, `${active ? 'Bật' : 'Tạm dừng'} ${code}`)
  },
  async promo_value({ code, value }) {
    const p = await promoByCode(code)
    await admin(`/admin/promotions/${p.id}`, { method: 'POST', team: p.owner, body: { application_method: { value } } })
    act(p.owner, `${code}: mức giảm ${p.type === 'percentage' ? `${value}%` : vnd(value)}`)
  },
  async promo_min_spend({ code, value }) {
    const p = await promoByCode(code)
    await setRule(p, 'item_subtotal', value == null ? null : [String(value)], p.owner, 'gte')
    act(p.owner, `${code}: đơn tối thiểu ${value == null ? 'bỏ' : vnd(value)}`)
  },
  async promo_segment({ code, on }) {
    const p = await promoByCode(code)
    await setRule(p, 'customer.groups.id', on ? [ids.new_group] : null, p.owner)
    act(p.owner, `${code}: ${on ? 'chỉ khách hàng mới' : 'bỏ điều kiện nhóm khách'}`)
  },
  async freeship_provider({ provider, on }) {
    const p = await promoByCode(fsC.code)
    const r = p.target_rules.find((x) => x.attribute.endsWith('shipping_option_type_id'))
    const type = providers.find((x) => x.id === provider).type_id
    const values = on ? [...new Set([...(r?.values ?? []), type])] : (r?.values ?? []).filter((v) => v !== type)
    await setRule(p, r.attribute, values, p.owner, 'in', 'target_rules')
    act(p.owner, `Freeship: ${on ? 'thêm' : 'bỏ'} ${providers.find((x) => x.id === provider).name}`)
  },
  async budget({ code, limit }) {
    const p = await promoByCode(code)
    await admin(`/admin/campaigns/${p.campaign.id}`, { method: 'POST', team: 'finance', body: { budget: { limit } } })
    act('finance', `Ngân sách ${p.campaign.identifier}: ${vnd(limit)} (đã dùng ${vnd(p.campaign.budget.used)})`)
  },
  // Để ngân sách chỉ còn `left` đồng so với số đã dùng
  async budget_left({ code, left }) {
    const p = await promoByCode(code)
    return OPS.budget({ code, limit: p.campaign.budget.used + left })
  },
}

// ------------------------------------------------------------------ kịch bản trên Medusa
const GLOW = 'FS-MK-GLOW-SERUM'
const AIRCHEF = 'FS-MK-AIRCHEF6-DEN'
const AIRCHEF_PRICES = (a) => ({ 'FS-MK-AIRCHEF6-DEN': a, 'FS-MK-AIRCHEF6-TRANG': a })
const FLASH_WINDOW = { kind: 'flash', start: '20:00', end: '22:00' }
const SCENARIOS = [
  {
    id: 'A', title: 'Flash Sale rẻ hơn nhưng khách trả nhiều hơn', teams: ['seller_ops', 'merchandising', 'marketing'],
    observe: 'Seller Ops chạy khuyến mãi shop Glow 320.000đ; Merchandising chốt flash 289.000đ. Tua sang 20:00: giỏ rớt dưới 300.000đ, mất GLOW30K và freeship.',
    steps: [['shop_price', { label: 'Khuyến mãi shop Glow', prices: { [GLOW]: 320000 } }], ['flash_contract', { prices: { [GLOW]: 289000 } }]],
    windows: [FLASH_WINDOW], now: '19:00', spec: { lines: [{ sku: GLOW, qty: 1 }], segment: 'REGULAR', provider: 'fs-ghn', codes: ['FS-MK-GLOW30K'] },
    compare: { label: 'Chỉ đổi giờ 19:00 → 20:30', before: { now: '19:00' }, after: { now: '20:30' } },
  },
  {
    id: 'B', title: 'Flash Sale làm mất voucher shop AirChef', teams: ['seller_ops', 'merchandising'],
    observe: 'Khuyến mãi shop 1.550.000đ, flash 1.490.000đ dưới ngưỡng 1.500.000đ của AIRCHEF100K. Brand Day tắt để cô lập; bật lại hoặc nhập SAN10 để xem Medusa tính lại.',
    steps: [['shop_price', { label: 'Khuyến mãi shop AirChef', prices: AIRCHEF_PRICES(1550000) }], ['flash_contract', { prices: AIRCHEF_PRICES(1490000) }], ['promo_status', { code: 'FS-MK-BD-AIRCHEF20', active: false }]],
    windows: [FLASH_WINDOW], now: '19:00', spec: { lines: [{ sku: AIRCHEF, qty: 1 }], segment: 'REGULAR', provider: 'fs-ghn', codes: ['FS-MK-AIRCHEF100K'] },
    compare: { label: 'Chỉ đổi giờ 19:00 → 20:30', before: { now: '19:00' }, after: { now: '20:30' } },
    toggles: [
      { id: 'bd', label: 'Bật Brand Day −20% (Seller Ops, tự động)', op: (on) => ['promo_status', { code: 'FS-MK-BD-AIRCHEF20', active: on }], isOn: (cfg) => cfg.promotions.find((p) => p.code === 'FS-MK-BD-AIRCHEF20')?.status === 'active' },
      { id: 'san', label: 'Khách nhập thêm FS-MK-SAN10', spec: 'FS-MK-SAN10', isOn: () => S.spec.codes.includes('FS-MK-SAN10') },
    ],
  },
  {
    id: 'F', title: 'Đổi đơn vị vận chuyển làm mất freeship', teams: ['marketing', 'logistics'],
    observe: 'Freeship hỗ trợ GHN, GHTK, Viettel Post. Khách chọn J&T thì mất hỗ trợ. Thêm J&T vào freeship giữ được ưu đãi nhưng lệch contract.',
    steps: [], windows: [], now: '10:00', spec: { lines: [{ sku: GLOW, qty: 1 }], segment: 'REGULAR', provider: 'fs-ghn', codes: ['FS-MK-GLOW30K'] },
    compare: { label: 'Khách đổi GHN → J&T', before: { provider: 'fs-ghn' }, after: { provider: 'fs-jt' } },
    toggles: [{ id: 'jt', label: 'Thêm J&T vào freeship (Marketing)', op: (on) => ['freeship_provider', { provider: 'fs-jt', on }], isOn: (cfg) => { const p = cfg.promotions.find((x) => x.code === fsC.code); const t = providers.find((x) => x.id === 'fs-jt')?.type_id; return !!p?.target_rules.some((r) => r.values.includes(t)) } }],
  },
  {
    id: 'G', title: 'Campaign chồng thời gian', teams: ['seller_ops', 'merchandising'],
    observe: 'Khuyến mãi shop AirChef cả ngày, flash 20–22h, Brand Day 21–23h. Tua lần lượt 19:59, 20:00, 21:00, 22:00, 23:00.',
    steps: [['shop_price', { label: 'Khuyến mãi shop AirChef', prices: AIRCHEF_PRICES(1550000) }], ['flash_contract', { prices: AIRCHEF_PRICES(1490000) }]],
    windows: [FLASH_WINDOW, { kind: 'promotion', code: 'FS-MK-BD-AIRCHEF20', start: '21:00', end: '23:00' }],
    now: '19:59', times: ['19:59', '20:00', '21:00', '22:00', '23:00'], spec: { lines: [{ sku: AIRCHEF, qty: 1 }], segment: 'REGULAR', provider: 'fs-ghn', codes: ['FS-MK-AIRCHEF100K'] },
    compare: { label: 'Chỉ đổi giờ 19:59 → 21:00', before: { now: '19:59' }, after: { now: '21:00' } },
  },
  {
    id: 'H', title: 'Voucher khách mới theo nhóm khách', teams: ['marketing'],
    observe: 'NEWBIE50K chỉ cho nhóm Khách mới. Đổi Khách thường ↔ Khách hàng mới. Marketing xóa điều kiện nhóm khách thì ai cũng được giảm.',
    steps: [], windows: [], now: '14:00', spec: { lines: [{ sku: 'FS-MK-BABYCARE-XL', qty: 1 }], segment: 'REGULAR', provider: 'fs-ghtk', codes: ['FS-MK-NEWBIE50K'] },
    compare: { label: 'Khách thường → Khách hàng mới', before: { segment: 'REGULAR' }, after: { segment: 'NEW' } },
    toggles: [{ id: 'seg', label: 'Lỗi: Marketing bỏ điều kiện nhóm khách của NEWBIE50K', op: (on) => ['promo_segment', { code: 'FS-MK-NEWBIE50K', on: !on }], isOn: (cfg) => !cfg.promotions.find((p) => p.code === 'FS-MK-NEWBIE50K')?.rules.some((r) => r.attribute === 'customer.groups.id') }],
  },
  {
    id: 'I', title: 'Tạm dừng hoặc hết ngân sách', teams: ['marketing', 'finance'],
    observe: 'SAN10 giảm 89.000đ cho nồi cơm Sunhouse. Marketing tạm dừng, hoặc Finance để ngân sách chỉ còn 50.000đ: Medusa không cấp, không giảm một phần.',
    steps: [], windows: [], now: '16:00', spec: { lines: [{ sku: 'FS-MK-SUNHOUSE-NC', qty: 1 }], segment: 'REGULAR', provider: 'fs-ghn', codes: ['FS-MK-SAN10'] },
    toggles: [
      { id: 'pause', label: 'Marketing tạm dừng SAN10', op: (on) => ['promo_status', { code: 'FS-MK-SAN10', active: !on }], isOn: (cfg) => cfg.promotions.find((p) => p.code === 'FS-MK-SAN10')?.status !== 'active' },
      { id: 'budget', label: 'Finance: ngân sách fs-mk-san chỉ còn 50.000đ', op: (on) => (on ? ['budget_left', { code: 'FS-MK-SAN10', left: 50000 }] : ['budget', { code: 'FS-MK-SAN10', limit: 100000000 }]), isOn: (cfg) => { const b = cfg.promotions.find((p) => p.code === 'FS-MK-SAN10')?.campaign?.budget; return !!b && b.limit - b.used < 89000 } },
    ],
  },
  {
    id: 'K', title: 'Gom đơn: shop chịu giảm vì hàng của shop khác', teams: ['seller_ops'],
    observe: 'Không ai đổi cấu hình: lab 11.11 như đã duyệt. Khách gom nồi AirChef Mini với máy hút bụi HomeLux (để đủ ngưỡng voucher sàn, freeship). Mọi rule và oracle đều qua. FlashSRE tách đơn theo shop trên Medusa: AirChef chịu giảm nhiều hơn chỉ vì trong giỏ có hàng HomeLux.',
    steps: [], windows: [], now: '10:00', spec: { lines: [{ sku: 'FS-MK-AIRCHEF-MINI', qty: 1 }, { sku: 'FS-MK-HOMELUX-V8', qty: 1 }], segment: 'REGULAR', provider: 'fs-ghn', codes: ['FS-MK-AIRCHEF100K'] },
    split: true,
  },
  {
    id: 'J', title: 'Flash Sale hoạt động đúng (đối chứng)', teams: ['merchandising'],
    observe: 'Flash serum Glow 349.000đ: giỏ vẫn trên 300.000đ, giữ GLOW30K và freeship; khách trả ít hơn thật.',
    steps: [['flash_contract', { prices: { [GLOW]: 349000 } }]],
    windows: [FLASH_WINDOW], now: '19:00', spec: { lines: [{ sku: GLOW, qty: 1 }], segment: 'REGULAR', provider: 'fs-ghn', codes: ['FS-MK-GLOW30K'] },
    compare: { label: 'Chỉ đổi giờ 19:00 → 20:30', before: { now: '19:00' }, after: { now: '20:30' } },
  },
]
const scenarioMeta = (s) => ({ id: s.id, title: s.title, teams: s.teams, observe: s.observe, times: s.times ?? [], compare: s.compare?.label ?? null, toggles: (s.toggles ?? []).map((t) => ({ id: t.id, label: t.label })), split: !!s.split })

// ------------------------------------------------------------------ oracle FlashSRE
const findingKey = (f) => `${f.invariant}|${(f.entities ?? []).map((e) => e.label ?? e.id).sort().join(',')}`
async function runOracle() {
  const out = await Promise.all(Object.keys(contracts).map((id) => admin(`/admin/flashsre/contracts/${id}/check`, { method: 'POST' }).then((r) => r.check.findings.map((f) => ({ ...f, contract_id: id })))))
  return out.flat()
}
function summarizeFindings(all) {
  const base = new Set(S.base_findings ?? [])
  return all.filter((f) => !base.has(findingKey(f))).map((f) => ({
    invariant: f.invariant, meaning: INVARIANTS[f.invariant] ?? '', kind: f.kind, severity: f.severity, title: f.title, contract_id: f.contract_id,
    fix_owner: f.fix_owner, teams: f.teams_involved ?? [], entities: (f.entities ?? []).map((e) => ({ label: e.label, owner: e.owner_team })),
    example: f.actual?.example ?? null,
  }))
}

// ------------------------------------------------------------------ kiểm tra tách đơn (không dùng rule của voucher)
// Tính chất: phần giảm shop A tự chịu cho hàng của A không đổi khi giỏ có thêm hàng shop khác.
// Đo giỏ gộp và từng phần giỏ theo shop trên Medusa; chênh lệch là tiền shop chịu thêm vì hàng của shop khác.
async function pool(jobs, n = 4) {
  const out = []
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < jobs.length) { const k = i++; out[k] = await jobs[k]() } }))
  return out
}
const shopOf = (sku) => SKUS.find((x) => x.sku === sku)?.shop
async function splitCheck(spec = S.spec) {
  const shops = [...new Set(spec.lines.map((l) => shopOf(l.sku)))]
  const [live, combined, ...alone] = await Promise.all([
    liveContracts(), measure(spec),
    ...shops.map((sh) => measure({ ...spec, lines: spec.lines.filter((l) => shopOf(l.sku) === sh) })),
  ])
  const rows = shops.map((sh, k) => {
    const g = byShop(combined, live)[sh]
    const a = byShop(alone[k], live)[sh]
    return { shop: sh, title: g.title, gross: g.gross, alone: a, combined: g, extra: g.shop_funded - a.shop_funded, platform_extra: g.platform_funded - a.platform_funded }
  })
  return { lines: spec.lines, codes: spec.codes, total: combined.totals.total, rows, carts: 1 + shops.length }
}
// Agent dò: mỗi SKU của shop có voucher shop, ghép với một SKU của từng shop khác
async function splitSearch() {
  const live = await liveContracts()
  const shopCodes = live.flatMap((c) => c.promotions ?? []).filter((p) => p.sponsor === 'shop' && !p.automatic && p.scope?.shops?.length === 1)
  const pairs = []
  for (const p of shopCodes) {
    const own = SKUS.filter((x) => x.shop === p.scope.shops[0] && catalog[x.sku])
    const others = Object.values(Object.groupBy(SKUS.filter((x) => x.shop !== p.scope.shops[0] && catalog[x.sku]), (x) => x.shop)).map((xs) => xs[0])
    for (const a of own) for (const b of others) pairs.push({ code: p.code, a, b })
  }
  const base = { segment: 'REGULAR', provider: S.spec.provider, codes: [] }
  const alone = {}
  const results = await pool(pairs.map(({ code, a, b }) => async () => {
    const key = `${code}|${a.sku}`
    alone[key] ??= measure({ ...base, codes: [code], lines: [{ sku: a.sku, qty: 1 }] })
    const [x, y] = await Promise.all([alone[key], measure({ ...base, codes: [code], lines: [{ sku: a.sku, qty: 1 }, { sku: b.sku, qty: 1 }] })])
    const sa = byShop(x, live)[a.shop]
    const sg = byShop(y, live)[a.shop]
    return { code, sku: a.sku, title: a.title, shop: sa.title, with_sku: b.sku, with_title: b.title, with_shop: world.shops.find((s) => s.key === b.shop)?.title, gross: sa.gross, alone: sa.shop_funded, combined: sg.shop_funded, extra: sg.shop_funded - sa.shop_funded }
  }))
  const oracle = await runOracle()
  const codes = new Set(shopCodes.map((p) => p.code))
  return {
    tested: results.length + Object.keys(alone).length,
    hits: results.filter((r) => r.extra > 0).sort((a, b) => b.extra - a.extra),
    clean: results.filter((r) => r.extra <= 0).length,
    oracle_on_codes: oracle.filter((f) => (f.entities ?? []).some((e) => codes.has(e.label))).map((f) => ({ invariant: f.invariant, title: f.title })),
    oracle_total: oracle.length,
  }
}

// ------------------------------------------------------------------ tải kịch bản
async function step(label, fn) { S.busy = { label }; return fn() }
async function loadScenario(id, mode) {
  const sc = SCENARIOS.find((s) => s.id === id)
  S.error = null
  try {
    await step('Dựng lại lab sạch trên Medusa (setup)', async () => {
      await lab.asAdmin()
      ids = await lab.setup()
      S.patches = []
      await lab.postContracts()
      await Promise.all([loadCatalog(), loadProviders()])
    })
    await step('Chạy oracle trên lab sạch làm mốc', async () => { S.base_findings = (await runOracle()).map(findingKey) })
    S.scenario = id
    S.actions = []
    S.patches = []
    S.baseline = null
    S.loaded_at = new Date().toISOString()
    for (const [op, args] of sc.steps) await step(`Team cấu hình: ${op}`, () => OPS[op](args))
    await step('Gắn khung giờ theo đồng hồ demo', async () => {
      const lists = await loadPriceLists()
      const promos = await loadPromotions()
      S.windows = sc.windows.map((w) => {
        if (w.kind === 'flash') { const l = lists.find((x) => x.title === FLASH_TITLE); return { kind: 'price_list', id: l.id, label: `Flash Sale ${w.start}–${w.end}`, start: T(w.start), end: T(w.end), on: null, phase: null } }
        const p = promos.find((x) => x.code === w.code)
        return { kind: 'promotion', id: p.id, label: `${w.code} ${w.start}–${w.end}`, start: T(w.start), end: T(w.end), on: null, phase: null }
      })
      // Flash không thuộc kịch bản: tắt để không lẫn vào giỏ
      if (!sc.windows.some((w) => w.kind === 'flash')) {
        const l = lists.find((x) => x.title === FLASH_TITLE)
        await admin(`/admin/price-lists/${l.id}`, { method: 'POST', body: { status: 'draft', starts_at: null, ends_at: null } })
      }
      S.now = T(sc.now)
      S.spec = structuredClone(sc.spec)
      await syncClock()
    })
    if (mode === 'compare' && sc.compare) {
      await step('Đo giỏ ở mốc trước', async () => {
        const b = sc.compare.before
        if (b.now) S.now = T(b.now)
        for (const [op, args] of b.ops ?? []) await OPS[op](args)
        Object.assign(S.spec, Object.fromEntries(Object.entries(b).filter(([k]) => !['now', 'ops'].includes(k))))
        await syncClock()
        S.baseline = { spec: structuredClone(S.spec), now: S.now, result: await measure(), at: new Date().toISOString(), actions: S.actions.length }
      })
      await step('Áp thay đổi của kịch bản', async () => {
        const a = sc.compare.after
        if (a.now) S.now = T(a.now)
        for (const [op, args] of a.ops ?? []) await OPS[op](args)
        Object.assign(S.spec, Object.fromEntries(Object.entries(a).filter(([k]) => !['now', 'ops'].includes(k))))
        await syncClock()
      })
    }
  } catch (e) {
    S.error = String(e.message || e)
    log('[scenario]', e)
  } finally {
    S.busy = null
  }
}

// ------------------------------------------------------------------ HTTP
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }
const SHELL = (body) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`
const PUBLIC = new Set(['medusa.html', 'medusa.mjs', 'engine.mjs', 'index.html', 'app.mjs', 'scenarios.mjs'])

function publicState() {
  const sc = SCENARIOS.find((s) => s.id === S.scenario)
  return {
    base: BASE, admin_url: `${BASE}/app`, busy: S.busy, error: S.error, scenario: S.scenario, now: S.now, spec: S.spec,
    windows: S.windows.map(({ label, start, end, on }) => ({ label, start, end, on })), actions: S.actions,
    baseline: S.baseline, loaded_at: S.loaded_at, scenarios: SCENARIOS.map(scenarioMeta), current: sc ? scenarioMeta(sc) : null,
    products: SKUS.filter((s) => catalog?.[s.sku]).map((s) => ({ sku: s.sku, title: s.title, shop: world.shops.find((x) => x.key === s.shop)?.title ?? s.shop, price: s.price })),
    providers,
  }
}

async function body(req) {
  let s = ''
  for await (const c of req) s += c
  return s ? JSON.parse(s) : {}
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)) }

let queue = Promise.resolve()
const serial = (fn) => (queue = queue.then(fn, fn)) // thao tác Medusa chạy tuần tự để không đè nhau

const ROUTES = {
  'GET /api/state': async () => publicState(),
  'POST /api/scenario': async (b) => {
    if (S.busy) return { busy: S.busy }
    S.busy = { label: 'Bắt đầu' }
    serial(() => loadScenario(b.id, b.mode))
    return { started: true }
  },
  'POST /api/clock': (b) => serial(async () => { S.now = Number(b.now); return { changed: await syncClock(), now: S.now } }),
  'POST /api/spec': async (b) => { Object.assign(S.spec, b); return { spec: S.spec } },
  // Giá hiện hành Medusa trả cho từng SKU (theo nhóm khách đang chọn), cho màn cửa hàng
  'GET /api/products': () => serial(async () => {
    const bearer = S.spec.segment === 'NEW' ? await newCustomerToken() : undefined
    const [pr, lists] = await Promise.all([prices(SKUS.filter((s) => catalog[s.sku]).map((s) => s.sku), bearer), loadPriceLists()])
    const byId = Object.fromEntries(lists.map((l) => [l.id, l]))
    return Object.fromEntries(Object.entries(pr).map(([sku, p]) => [sku, { amount: p.amount, original: p.original, source: p.price_list_id ? byId[p.price_list_id]?.label ?? null : null }]))
  }),
  'POST /api/measure': () => serial(() => measure()),
  'POST /api/baseline': () => serial(async () => { S.baseline = { spec: structuredClone(S.spec), now: S.now, result: await measure(), at: new Date().toISOString(), actions: S.actions.length }; return { baseline: S.baseline } }),
  'DELETE /api/baseline': async () => { S.baseline = null; return {} },
  'GET /api/config': () => serial(() => config()),
  'POST /api/admin': (b) => serial(async () => { await OPS[b.op](b.args ?? {}); return { ok: true } }),
  'POST /api/toggle': (b) => serial(async () => {
    const t = SCENARIOS.find((s) => s.id === S.scenario)?.toggles?.find((x) => x.id === b.id)
    if (!t) throw new Error('Không có toggle này')
    if (t.spec) S.spec.codes = b.on ? [...new Set([...S.spec.codes, t.spec])] : S.spec.codes.filter((c) => c !== t.spec)
    else { const [op, args] = t.op(b.on); await OPS[op](args) }
    return { ok: true }
  }),
  'GET /api/toggles': () => serial(async () => {
    const sc = SCENARIOS.find((s) => s.id === S.scenario)
    const cfg = await config()
    return Object.fromEntries((sc?.toggles ?? []).map((t) => [t.id, !!t.isOn(cfg)]))
  }),
  'POST /api/split': () => serial(() => splitCheck()),
  'POST /api/split-search': () => serial(() => splitSearch()),
  'POST /api/oracle': () => serial(async () => ({ findings: summarizeFindings(await runOracle()), base_count: S.base_findings?.length ?? 0 })),
  'GET /api/changes': async () => {
    const since = S.loaded_at
    const r = await admin(`/admin/flashsre/config-changes?limit=100${since ? `&since=${encodeURIComponent(since)}` : ''}`)
    return { since, changes: r.config_changes.map((c) => ({ at: c.created_at, team: c.team, actor: c.actor_email, entity_type: c.entity_type, label: c.entity_label, route: `${c.method} ${c.route}`, status: c.status_code })) }
  },
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  const route = ROUTES[`${req.method} ${url.pathname}`]
  if (route) {
    try { json(res, 200, await route(req.method === 'POST' ? await body(req) : {})) } catch (e) { log('[api]', e.message); json(res, e.status === 400 ? 400 : 500, { error: e.message }) }
    return
  }
  const name = url.pathname === '/' ? 'medusa.html' : normalize(url.pathname).replace(/^\/+/, '')
  if (url.pathname === '/sim') { res.writeHead(302, { Location: '/index.html' }).end(); return }
  if (!PUBLIC.has(name)) { res.writeHead(404).end(); return }
  const buf = await readFile(join(DIR, name))
  res.writeHead(200, { 'Content-Type': TYPES[extname(name)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
  res.end(extname(name) === '.html' ? SHELL(buf.toString('utf8')) : buf)
}).listen(PORT, async () => {
  console.log(`FlashSRE demo trên Medusa: http://localhost:${PORT}  (Medusa: ${BASE})`)
  if (ids) await Promise.all([loadCatalog(), loadProviders()]).catch((e) => log('[init]', e.message))
})
