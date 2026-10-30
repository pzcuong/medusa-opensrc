#!/usr/bin/env node
/**
 * FlashSRE Ops chạy trên Medusa thật.
 *   BASE=... PASSWORD=... FLASHSRE_TEAM_PASSWORD=... node incidents/demo/ops/medusa-ops.mjs [port]  ->  http://localhost:5180
 *
 * - Bộ sinh đơn đặt đơn thật qua Store API (giỏ, phí ship, thanh toán, hoàn tất), thu nhỏ: mỗi đơn thật đại diện cho W đơn.
 *   Khách quyết định mua hay bỏ giỏ theo freeship/giảm giá Medusa thật sự trả về cho giỏ của họ.
 * - Chỉ số đọc lại từ Medusa: đơn hàng (mức giảm từng mã, phí ship sàn trả), ngân sách campaign (Medusa tự dừng khi hết),
 *   audit log FlashSRE. Riêng lượt mở giỏ và nguồn truy cập là số liệu phiên của storefront (Medusa không lưu).
 * - Kế hoạch kinh doanh nằm trong contract đã duyệt (CT-OPS-*). Phương án đã duyệt chạy qua Admin API bằng tài khoản team.
 * Dữ liệu ops dùng tiền tố FS-OPS / fs-ops, tách khỏi lab 11.11. POST /api/cleanup gỡ shipping option và tắt promotion ops.
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as E from './engine.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE || 'https://flashsre-commerce-30123348ca77.herokuapp.com'
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 5180)
const TEAM_PASSWORD = process.env.FLASHSRE_TEAM_PASSWORD
if (!process.env.PASSWORD || !TEAM_PASSWORD) { console.error('Thiếu PASSWORD (admin) hoặc FLASHSRE_TEAM_PASSWORD (tài khoản team)'); process.exit(1) }
const HOST = new URL(BASE).host.replace(/[^a-z0-9.-]/gi, '_')
const LAB = JSON.parse(readFileSync(join(DIR, '..', '..', 'out', `state-${HOST}.json`), 'utf8')) // region, pk, kênh bán, vùng giao của lab
const CONCURRENCY = 3 // dyno Basic 512 MB của Heroku hết bộ nhớ ở 5 luồng đặt đơn song song
const log = (...a) => console.error('[ops]', ...a)

// Mỗi đơn thật đại diện cho W đơn. Kịch bản lợi nhuận lấy mẫu dày hơn ở nhóm giỏ hiếm để nhóm nào cũng có đơn thật
const W_BUDGET = 100
const W_MARGIN = { REG: { small: 100, medium: 25, bulky: 10 }, VIP: { small: 25, medium: 10, bulky: 5 } }

const TEAM_EMAILS = {
  merchandising: 'merch@flashsre.dev', marketing: 'marketing@flashsre.dev', logistics: 'logistics@flashsre.dev',
  finance: 'finance@flashsre.dev', growth: 'growth@flashsre.dev',
}

// ------------------------------------------------------------------ Medusa client
const tokens = new Map()
async function http(path, { method = 'GET', body, bearer, pk } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (bearer) headers.Authorization = `Bearer ${bearer}`
  if (pk) headers['x-publishable-api-key'] = pk
  for (let i = 0; ; i++) {
    // lỗi mạng (DNS, timeout) cũng thử lại, vì một đơn rớt là lệch số liệu
    const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) })
      .catch((e) => { if (i < 3) return null; throw e })
    if (!r) { await new Promise((ok) => setTimeout(ok, 1500 * (i + 1))); continue }
    const json = await r.json().catch(() => null)
    if (r.ok) return json
    if (r.status >= 500 && i < 2) { await new Promise((ok) => setTimeout(ok, 800 * (i + 1))); continue }
    const e = new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(json)?.slice(0, 300)}`)
    e.status = r.status
    throw e
  }
}
const login = async (email, password) => (await http('/auth/user/emailpass', { method: 'POST', body: { email, password } })).token
async function tokenOf(team = 'admin') {
  if (!tokens.has(team)) tokens.set(team, team === 'admin' ? await login('admin@flashsre.dev', process.env.PASSWORD) : await login(TEAM_EMAILS[team], TEAM_PASSWORD))
  return tokens.get(team)
}
const admin = async (path, opts = {}) => http(path, { ...opts, bearer: await tokenOf(opts.team ?? 'admin') })
const store = (path, opts = {}) => http(path, { ...opts, pk: LAB.pk })
async function pool(jobs, n = CONCURRENCY) {
  const out = []
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < jobs.length) { const k = i++; out[k] = await jobs[k]().catch((e) => ({ error: e.message })) } }))
  return out
}

// ------------------------------------------------------------------ dữ liệu ops trên Medusa
const CATS = [
  { key: 'nho', handle: 'fs-ops-hang-nho', name: 'FS-OPS Hàng nhỏ' },
  { key: 'vua', handle: 'fs-ops-hang-vua', name: 'FS-OPS Hàng vừa' },
  { key: 'cong-kenh', handle: 'fs-ops-cong-kenh', name: 'FS-OPS Hàng cồng kềnh' },
]
const PRODUCTS = [
  { handle: 'fs-ops-deal', title: 'Combo Deal 11.11', sku: 'FS-OPS-DEAL', price: E.BUDGET.campaign.aov },
  { handle: 'fs-ops-blender', title: 'Máy xay sinh tố', sku: 'FS-OPS-BLENDER', price: 650000 },
  { handle: 'fs-ops-binh', title: 'Bình giữ nhiệt', sku: 'FS-OPS-SMALL', price: E.SIZES.small.aov, cat: 'nho', size: 'small' },
  { handle: 'fs-ops-noi', title: 'Nồi chiên không dầu 5L', sku: 'FS-OPS-MEDIUM', price: E.SIZES.medium.aov, cat: 'vua', size: 'medium' },
  { handle: 'fs-ops-tulanh', title: 'Tủ lạnh 180L', sku: 'FS-OPS-BULKY', price: E.SIZES.bulky.aov, cat: 'cong-kenh', size: 'bulky' },
]
const SHIP = [
  ...E.FEES.map(([fee]) => ({ code: `fs-ops-z${fee / 1000}`, label: `Giao ${fee / 1000}k`, name: `FS-OPS Giao hàng ${E.vnd(fee)}`, amount: fee })),
  { code: 'fs-ops-express', label: 'Hoả tốc', name: 'FS-OPS Hoả tốc', amount: 25000 },
  ...Object.entries(E.SIZES).map(([size, s]) => ({ code: `fs-ops-size-${size}`, label: s.label, name: `FS-OPS Vận chuyển ${s.label.toLowerCase()}`, amount: s.fee, size })),
]
const VIP_GROUP = 'FS-OPS Khách VIP'
const VIP_EMAIL = 'fs-ops-vip@flashsre.dev'
const CODES = {
  budget: ['FS-OPS-FREESHIP30', 'FS-OPS-SAN50K', 'FS-OPS-BANK20'],
  margin: ['FS-OPS-VIP15', 'FS-OPS-VIP15-CK', 'FS-OPS-FREESHIP-ALL', 'FS-OPS-FS-CK50'],
}
const OWNER = { 'FS-OPS-FREESHIP30': 'marketing', 'FS-OPS-SAN50K': 'marketing', 'FS-OPS-BANK20': 'finance', 'FS-OPS-VIP15': 'marketing', 'FS-OPS-VIP15-CK': 'marketing', 'FS-OPS-FREESHIP-ALL': 'growth', 'FS-OPS-FS-CK50': 'growth' }

let ids = null // id của dữ liệu ops trên Medusa

async function ensureCatalog() {
  const out = { cats: {}, products: {}, variants: {}, types: {}, options: {}, fees: {} }
  const cats = (await admin('/admin/product-categories?limit=500&fields=id,handle')).product_categories
  for (const c of CATS) out.cats[c.key] = cats.find((x) => x.handle === c.handle)?.id ?? (await admin('/admin/product-categories', { method: 'POST', team: 'merchandising', body: { name: c.name, handle: c.handle, is_active: true } })).product_category.id
  for (const p of PRODUCTS) {
    let prod = (await admin(`/admin/products?handle=${p.handle}&fields=id,variants.id,variants.sku`)).products[0]
    if (!prod) {
      prod = (await admin('/admin/products', {
        method: 'POST', team: 'merchandising',
        body: {
          title: p.title, handle: p.handle, status: 'published', discountable: true, shipping_profile_id: LAB.shipping_profile, sales_channels: [{ id: LAB.sales_channel }],
          ...(p.cat ? { categories: [{ id: out.cats[p.cat] }] } : {}),
          options: [{ title: 'Phân loại', values: ['Mặc định'] }],
          variants: [{ title: 'Mặc định', sku: p.sku, manage_inventory: false, options: { 'Phân loại': 'Mặc định' }, prices: [{ currency_code: 'vnd', amount: p.price }] }],
        },
      })).product
    }
    out.products[p.sku] = prod.id
    out.variants[p.sku] = prod.variants.find((v) => v.sku === p.sku).id
  }
  const types = (await admin('/admin/shipping-option-types?limit=500')).shipping_option_types
  const opts = (await admin('/admin/shipping-options?limit=500&fields=id,name')).shipping_options
  for (const s of SHIP) {
    out.types[s.code] = types.find((t) => t.code === s.code)?.id ?? (await admin('/admin/shipping-option-types', { method: 'POST', team: 'logistics', body: { label: s.label, code: s.code, description: 'FlashSRE Ops (mô phỏng)' } })).shipping_option_type.id
    out.options[s.code] = opts.find((o) => o.name === s.name)?.id ?? (await admin('/admin/shipping-options', {
      method: 'POST', team: 'logistics',
      body: {
        name: s.name, service_zone_id: LAB.service_zone, shipping_profile_id: LAB.shipping_profile, provider_id: 'manual_manual', price_type: 'flat', type_id: out.types[s.code],
        prices: [{ currency_code: 'vnd', amount: s.amount }],
        rules: [{ attribute: 'enabled_in_store', value: 'true', operator: 'eq' }, { attribute: 'is_return', value: 'false', operator: 'eq' }],
      },
    })).shipping_option.id
    out.fees[s.code] = s.amount
  }
  const groups = (await admin('/admin/customer-groups?limit=200')).customer_groups
  out.vip_group = groups.find((g) => g.name === VIP_GROUP)?.id ?? (await admin('/admin/customer-groups', { method: 'POST', team: 'marketing', body: { name: VIP_GROUP } })).customer_group.id
  return out
}

async function vipToken() {
  const pw = 'fs-ops-vip'
  let tok
  try { tok = (await http('/auth/customer/emailpass', { method: 'POST', body: { email: VIP_EMAIL, password: pw } })).token } catch {
    const reg = (await http('/auth/customer/emailpass/register', { method: 'POST', body: { email: VIP_EMAIL, password: pw } })).token
    await http('/store/customers', { method: 'POST', bearer: reg, pk: LAB.pk, body: { email: VIP_EMAIL, first_name: 'Khách', last_name: 'VIP' } })
    tok = (await http('/auth/customer/emailpass', { method: 'POST', body: { email: VIP_EMAIL, password: pw } })).token
  }
  const me = (await http('/store/customers/me', { bearer: tok, pk: LAB.pk })).customer
  await admin(`/admin/customer-groups/${ids.vip_group}/customers`, { method: 'POST', body: { add: [me.id] } }).catch(() => null)
  return tok
}

// Kế hoạch kinh doanh đã duyệt; contract của kịch bản 2 khai báo team Growth
function contracts() {
  const b = E.BUDGET
  const m = E.MARGIN
  return {
    'CT-OPS-FREESHIP30': {
      schema: 'ops/v1', owner: 'marketing', title: 'Freeship 11.11 khung 20:00–24:00',
      window: { day: E.DAY, start: '20:00', end: '24:00' },
      plan: { code: 'FS-OPS-FREESHIP30', cap: b.campaign.cap, min_order: b.campaign.min_order, budget: b.campaign.budget, planned_uses: b.campaign.planned_uses },
      related: b.related.map((r) => ({ code: `FS-OPS-${r.code}`, owner: r.owner, funding: r.funding, budget: r.budget, planned_uses: r.planned_uses })),
      policy: { transfer: { between: 'platform_funded', max_share_of_source: b.policy.transfer_max_share, approvers: b.policy.transfer_roles }, benefit_change: { approvers: b.policy.benefit_roles } },
      slo: b.slo.label, sampling: { order_weight: W_BUDGET },
    },
    'CT-OPS-VIP-FREESHIP': {
      schema: 'ops/v1', owner: 'marketing', title: 'VIP −15% và Freeship toàn phần khung 20:00–24:00',
      teams: { growth: 'Chương trình tăng trưởng: freeship, kéo đơn' },
      window: { day: E.DAY, start: '20:00', end: '24:00' },
      programs: [
        { code: 'FS-OPS-VIP15', owner: 'marketing', rule: 'Khách VIP −15%, tối đa 600.000đ (hàng cồng kềnh cấu hình bằng FS-OPS-VIP15-CK 600.000đ vì Medusa không có trần %)' },
        { code: 'FS-OPS-FREESHIP-ALL', owner: 'growth', rule: 'Sàn trả toàn bộ phí ship, đơn từ 299.000đ' },
      ],
      stacking: { allowed: [['FS-OPS-VIP15', 'FS-OPS-FREESHIP-ALL'], ['FS-OPS-VIP15-CK', 'FS-OPS-FREESHIP-ALL']] },
      plan: { take_rate: m.take_rate, order_lift: m.plan_lift, mix: 'như lịch sử', profit_target: Math.round(E.marginTarget(m)) },
      slo: m.slo.label, sampling: { order_weight: W_MARGIN },
    },
  }
}

// Tài khoản Growth không có sẵn trong lab: tạo qua lời mời của admin rồi gán team
async function ensureGrowthUser() {
  let user = (await admin('/admin/users?limit=200&fields=id,email,metadata')).users.find((u) => u.email === TEAM_EMAILS.growth)
  if (!user) {
    log('tạo tài khoản growth@flashsre.dev qua lời mời')
    const old = (await admin('/admin/invites?limit=200')).invites.filter((i) => i.email === TEAM_EMAILS.growth)
    for (const i of old) await admin(`/admin/invites/${i.id}`, { method: 'DELETE' }).catch(() => null)
    const invite = (await admin('/admin/invites', { method: 'POST', body: { email: TEAM_EMAILS.growth } })).invite
    const reg = await http('/auth/user/emailpass/register', { method: 'POST', body: { email: TEAM_EMAILS.growth, password: TEAM_PASSWORD } }).then((r) => r.token, () => null)
      ?? (await http('/auth/user/emailpass', { method: 'POST', body: { email: TEAM_EMAILS.growth, password: TEAM_PASSWORD } })).token
    await http(`/admin/invites/accept?token=${invite.token}`, { method: 'POST', bearer: reg, body: { first_name: 'Growth', last_name: 'Team' } })
    user = (await admin('/admin/users?limit=200&fields=id,email,metadata')).users.find((u) => u.email === TEAM_EMAILS.growth)
  }
  if (user.metadata?.team !== 'growth') await admin('/admin/flashsre/teams/assign', { method: 'POST', body: { user_id: user.id, team: 'growth' } })
  tokens.delete('growth')
  await tokenOf('growth')
}

const ruleSet = (attr, op, values) => ({ attribute: attr, operator: op, values })
function promoBodies(scale = W_BUDGET) {
  const z = SHIP.filter((s) => s.code.startsWith('fs-ops-z')).map((s) => ids.types[s.code])
  const sizes = Object.keys(E.SIZES).map((k) => ids.types[`fs-ops-size-${k}`])
  const vnd = ruleSet('currency_code', 'eq', ['vnd'])
  const vip = ruleSet('customer.groups.id', 'in', [ids.vip_group])
  const b = E.BUDGET
  return {
    'FS-OPS-FREESHIP30': { campaign: { id: 'fs-ops-freeship30', limit: b.campaign.budget / scale }, auto: true, method: { type: 'fixed', value: b.campaign.cap, currency_code: 'vnd', target_type: 'shipping_methods', allocation: 'each', max_quantity: 1, target_rules: [ruleSet('shipping_methods.shipping_option.shipping_option_type_id', 'in', z)] }, rules: [vnd, ruleSet('item_subtotal', 'gte', [String(b.campaign.min_order)])] },
    'FS-OPS-SAN50K': { campaign: { id: 'fs-ops-san50k', limit: b.related[0].budget / scale }, auto: false, method: { type: 'fixed', value: b.related[0].value, currency_code: 'vnd', target_type: 'items', allocation: 'across', target_rules: [] }, rules: [vnd, ruleSet('item_subtotal', 'gte', ['500000'])] },
    'FS-OPS-BANK20': { campaign: { id: 'fs-ops-bank20', limit: b.related[1].budget / scale }, auto: false, method: { type: 'fixed', value: b.related[1].value, currency_code: 'vnd', target_type: 'items', allocation: 'across', target_rules: [] }, rules: [vnd] },
    'FS-OPS-VIP15': { campaign: { id: 'fs-ops-vip' }, auto: true, method: { type: 'percentage', value: 15, target_type: 'items', allocation: 'across', target_rules: [ruleSet('items.product.categories.id', 'in', [ids.cats.nho, ids.cats.vua])] }, rules: [vnd, vip] },
    'FS-OPS-VIP15-CK': { campaign: { id: 'fs-ops-vip' }, auto: true, method: { type: 'fixed', value: E.MARGIN.campaigns[0].cap, currency_code: 'vnd', target_type: 'items', allocation: 'across', target_rules: [ruleSet('items.product.categories.id', 'in', [ids.cats['cong-kenh']])] }, rules: [vnd, vip] },
    'FS-OPS-FREESHIP-ALL': { campaign: { id: 'fs-ops-freeship-all' }, auto: true, method: { type: 'percentage', value: 100, target_type: 'shipping_methods', allocation: 'each', max_quantity: 1, target_rules: [ruleSet('shipping_methods.shipping_option.shipping_option_type_id', 'in', sizes)] }, rules: [vnd, ruleSet('item_subtotal', 'gte', [String(E.MARGIN.campaigns[1].min_order)])] },
    'FS-OPS-FS-CK50': { campaign: { id: 'fs-ops-freeship-all' }, auto: true, method: { type: 'fixed', value: 50000, currency_code: 'vnd', target_type: 'shipping_methods', allocation: 'each', max_quantity: 1, target_rules: [ruleSet('shipping_methods.shipping_option.shipping_option_type_id', 'in', [ids.types['fs-ops-size-bulky']])] }, rules: [vnd, ruleSet('item_subtotal', 'gte', [String(E.MARGIN.campaigns[1].min_order)])], inactive: true },
  }
}

// Campaign mới mỗi lần chạy để ngân sách bắt đầu từ 0 (Medusa không cho đặt lại số đã dùng)
async function removeOpsPromotions() {
  const promos = (await admin('/admin/promotions?limit=500&fields=id,code')).promotions.filter((p) => p.code?.startsWith('FS-OPS-'))
  for (const p of promos) await admin(`/admin/promotions/${p.id}`, { method: 'DELETE' }).catch((e) => log('xóa', p.code, e.message))
  const all = (await admin('/admin/campaigns?limit=500&fields=id,campaign_identifier')).campaigns
  for (const c of all.filter((x) => x.campaign_identifier.startsWith('fs-ops-'))) await admin(`/admin/campaigns/${c.id}`, { method: 'DELETE' }).catch(() => null)
}
async function freshCampaigns(run) {
  const bodies = promoBodies()
  const out = {}
  for (const [code, p] of Object.entries(bodies)) {
    const key = p.campaign.id
    if (out[key]) continue
    const identifier = `${key}-${run}`
    out[key] = (await admin('/admin/campaigns', {
      method: 'POST', team: OWNER[code] === 'growth' ? 'growth' : 'marketing',
      body: { name: identifier, campaign_identifier: identifier, starts_at: new Date(Date.now() - 864e5).toISOString(), ends_at: new Date(Date.now() + 30 * 864e5).toISOString(), ...(p.campaign.limit ? { budget: { type: 'spend', currency_code: 'vnd', limit: Math.round(p.campaign.limit) } } : {}) },
    })).campaign.id
  }
  return out
}

async function upsertPromos(scenario, campaigns) {
  const bodies = promoBodies()
  const out = {}
  for (const [code, p] of Object.entries(bodies)) {
    const active = CODES[scenario].includes(code) && !p.inactive
    out[code] = (await admin('/admin/promotions', {
      method: 'POST', team: OWNER[code],
      body: { code, type: 'standard', status: active ? 'active' : 'inactive', is_automatic: p.auto, campaign_id: campaigns[p.campaign.id], application_method: p.method, rules: p.rules },
    })).promotion.id
  }
  return out
}

// ------------------------------------------------------------------ phiên demo
const S = {
  scenario: 'budget', event: true, t: -1, running: false, busy: null, error: null, run: null, started_at: null, scale: W_BUDGET,
  decisions: [], approvals: {}, chosen: null, decidedAt: null, actions: [],
  minutes: [], // số liệu phiên storefront theo phút: lượt mở giỏ, nguồn, có thấy freeship không
  orders: new Map(), // order id -> { t, kind, seg, size, weight }
  carry: {}, approved_total: 0, slots: false, cfg_version: 0, quotes: null, contract_versions: {},
}
const act = (team, text) => { S.actions.unshift({ at: Date.now(), t: Math.max(0, S.t), team, text }); S.actions = S.actions.slice(0, 60) }
const carry = (key, x) => { S.carry[key] = (S.carry[key] ?? 0) + x; const n = Math.floor(S.carry[key] + 1e-9); S.carry[key] -= n; return n }
const SC = () => (S.scenario === 'budget' ? E.BUDGET : E.MARGIN)

async function setup(scenario, event) {
  S.busy = { label: 'Dựng dữ liệu ops trên Medusa', at: Date.now() }
  S.error = null
  S.running = false
  ids = null // không cho bộ sinh đơn chạy trên dữ liệu đang dựng lại
  try {
    ids = { ...(await ensureCatalog()), promos: null }
    S.scenario = scenario
    S.event = event
    S.scale = scenario === 'budget' ? W_BUDGET : 1
    S.run = Date.now().toString(36)
    await postContracts() // contract khai báo team growth, phải có trước khi gán team
    await ensureGrowthUser()
    await removeOpsPromotions() // gỡ promotion và campaign cũ (gồm bản thử) để tạo lại đúng cấu hình gốc, ngân sách từ 0
    const campaigns = await freshCampaigns(S.run)
    ids.campaigns = campaigns
    const promos = await upsertPromos(scenario, campaigns)
    if (scenario === 'margin') ids.vip_token = await vipToken()
    ids.promos = promos
    Object.assign(S, { incident: null, learned: false, errors: 0, live_budget: null, t: -1, decisions: [], approvals: {}, chosen: null, decidedAt: null, actions: [], minutes: [], orders: new Map(), carry: {}, slots: false, cfg_version: 0, quotes: null })
    S.approved_total = scenario === 'budget' ? E.BUDGET.campaign.budget / W_BUDGET : 0
    // audit log sau mốc này là thay đổi trong lúc chiến dịch chạy; lấy theo giờ của Medusa để khỏi lệch đồng hồ
    await new Promise((ok) => setTimeout(ok, 1500))
    const recent = await admin(`/admin/flashsre/config-changes?since=${encodeURIComponent(new Date(Date.now() - 10 * 60e3).toISOString())}&limit=500`)
    const last = (recent.config_changes ?? recent.changes ?? []).map((c) => c.created_at).sort().at(-1)
    S.started_at = new Date(Math.max(Date.now(), last ? Date.parse(last) + 1 : 0)).toISOString()
    act(null, `Dựng ${SC().title} trên Medusa: campaign ${Object.keys(campaigns).length}, promotion ${Object.keys(ids.promos).length}, mỗi đơn thật đại diện ${scenario === 'budget' ? `${W_BUDGET} đơn` : 'theo trọng số nhóm giỏ'}`)
  } catch (e) {
    S.error = e.message
    log(e)
  } finally {
    S.busy = null
  }
}
async function postContracts() {
  for (const [id, body] of Object.entries(contracts())) {
    const r = await admin('/admin/flashsre/contracts', { method: 'POST', team: 'marketing', body: { contract_id: id, body } })
    S.contract_versions[id] = r.contract.version
  }
}

// ------------------------------------------------------------------ đặt đơn thật
const ADDRESS = { first_name: 'Lan', last_name: 'Nguyễn', address_1: '1 Lê Lợi', city: 'Hà Nội', country_code: 'vn', postal_code: '100000' }
let seq = 0
async function openCart({ sku, ship, codes = [], bearer, meta }) {
  const cart = (await store('/store/carts', {
    method: 'POST', bearer,
    body: { region_id: LAB.region, sales_channel_id: LAB.sales_channel, ...(bearer ? {} : { email: `fs-ops-${S.run}-${++seq}@flashsre.dev` }), items: [{ variant_id: ids.variants[sku], quantity: 1 }], shipping_address: ADDRESS, billing_address: ADDRESS, metadata: { ops_run: S.run, ...meta } },
  })).cart
  await store(`/store/carts/${cart.id}/shipping-methods`, { method: 'POST', bearer, body: { option_id: ids.options[ship] } })
  if (codes.length) await store(`/store/carts/${cart.id}/promotions`, { method: 'POST', bearer, body: { promo_codes: codes } })
  const c = (await store(`/store/carts/${cart.id}?fields=id,item_subtotal,shipping_methods.amount,shipping_methods.adjustments.code,shipping_methods.adjustments.amount,items.adjustments.code,items.adjustments.amount`, { bearer })).cart
  return { id: c.id, ship_adj: (c.shipping_methods?.[0]?.adjustments ?? []).reduce((s, a) => s + Number(a.amount), 0), item_adj: (c.items ?? []).flatMap((i) => i.adjustments ?? []).reduce((s, a) => s + Number(a.amount), 0), fee: Number(c.shipping_methods?.[0]?.amount ?? 0) }
}
async function checkout(cartId, bearer) {
  const pc = (await store('/store/payment-collections', { method: 'POST', bearer, body: { cart_id: cartId } })).payment_collection
  await store(`/store/payment-collections/${pc.id}/payment-sessions`, { method: 'POST', bearer, body: { provider_id: 'pp_system_default' } })
  const r = await store(`/store/carts/${cartId}/complete`, { method: 'POST', bearer })
  if (r.type !== 'order') throw new Error(`Không hoàn tất được giỏ ${cartId}: ${JSON.stringify(r.error ?? r).slice(0, 200)}`)
  return r.order.id
}

// Một phút của kịch bản freeship: lượt mở giỏ theo nhu cầu, khách mua hay bỏ theo freeship Medusa trả về
function minuteBudget(t) {
  const sc = E.BUDGET
  const m = S.event ? E.viral(t) : 1
  const stat = { t, attempts: 0, kol: 0, fs_seen: 0, bought: 0, by_tier: {} }
  const jobs = []
  for (const [fee, w] of E.FEES) {
    const n = carry(`a${fee}`, (E.planAttempts(t) * m * w) / W_BUDGET)
    for (let k = 0; k < n; k++) {
      const kol = carry('kol', 1 - 1 / m) > 0
      stat.attempts++
      if (kol) stat.kol++
      jobs.push(async () => {
        const ship = `fs-ops-z${fee / 1000}`
        const c = await openCart({ sku: 'FS-OPS-DEAL', ship, meta: { demo_minute: t, utm_source: kol ? 'kol_video' : 'app' } })
        if (c.ship_adj > 0) stat.fs_seen++
        // khách chốt đơn theo phí ship còn phải trả sau freeship thật của Medusa
        if (carry(`buy${fee}`, E.conv1(Math.max(0, c.fee - c.ship_adj))) > 0) {
          const id = await checkout(c.id)
          S.orders.set(id, { t, kind: 'freeship', weight: W_BUDGET })
          stat.bought++
        }
      })
    }
  }
  for (const r of sc.related) {
    const n = carry(r.code, ((r.planned_uses / E.SHAPE_SUM) * E.shape(t) * r.pacing) / W_BUDGET)
    for (let k = 0; k < n; k++) jobs.push(async () => {
      const c = await openCart({ sku: r.code === 'SAN50K' ? 'FS-OPS-BLENDER' : 'FS-OPS-DEAL', ship: 'fs-ops-express', codes: [`FS-OPS-${r.code}`], meta: { demo_minute: t } })
      S.orders.set(await checkout(c.id), { t, kind: r.code, weight: W_BUDGET })
    })
  }
  return { stat, jobs }
}

// Báo giá: Medusa trả bao nhiêu ưu đãi cho từng nhóm giỏ với cấu hình hiện tại (đổi cấu hình thì báo giá lại)
async function quotes() {
  if (S.quotes?.version === S.cfg_version) return S.quotes.cells
  const cells = {}
  await pool(Object.keys(E.SEGS).flatMap((seg) => Object.keys(E.SIZES).map((size) => async () => {
    const p = PRODUCTS.find((x) => x.size === size)
    const c = await openCart({ sku: p.sku, ship: `fs-ops-size-${size}`, bearer: seg === 'VIP' ? ids.vip_token : undefined, meta: { quote: true } })
    cells[`${seg}|${size}`] = { vip: c.item_adj, ship: c.ship_adj }
  })))
  S.quotes = { version: S.cfg_version, cells }
  return cells
}
function minuteMargin(t, q) {
  const sc = E.MARGIN
  const stat = { t, attempts: 0, bought: 0 } // kịch bản này không mô phỏng bỏ giỏ: mỗi giỏ mở là một đơn
  const jobs = []
  for (const seg of Object.keys(E.SEGS)) for (const size of Object.keys(E.SIZES)) {
    const w = W_MARGIN[seg][size]
    const n = carry(`${seg}${size}`, (E.cellDemand(sc, seg, size, q[`${seg}|${size}`], S.event) * E.shape(t)) / w)
    for (let k = 0; k < n; k++) jobs.push(async () => {
      const p = PRODUCTS.find((x) => x.size === size)
      const bearer = seg === 'VIP' ? ids.vip_token : undefined
      const c = await openCart({ sku: p.sku, ship: `fs-ops-size-${size}`, bearer, meta: { demo_minute: t, segment: seg, weight: w } })
      S.orders.set(await checkout(c.id, bearer), { t, kind: 'margin', seg, size, weight: w })
      stat.attempts++
      stat.bought++
    })
  }
  return { stat, jobs }
}

async function budgetOf(code) {
  const key = { 'FS-OPS-FREESHIP30': 'fs-ops-freeship30', 'FS-OPS-SAN50K': 'fs-ops-san50k', 'FS-OPS-BANK20': 'fs-ops-bank20' }[code]
  const c = (await admin(`/admin/campaigns/${ids.campaigns[key]}?fields=campaign_identifier,budget.used,budget.limit`)).campaign
  return { used: Number(c.budget?.used ?? 0), limit: Number(c.budget?.limit ?? 0) }
}

// Khung giờ: đầu mỗi giờ FlashSRE đặt hạn mức = đã dùng + phần chia đều của số còn lại (runbook đã được duyệt)
async function releaseSlot(t) {
  const b = await budgetOf('FS-OPS-FREESHIP30')
  const hours = Math.ceil((E.N - t) / 60)
  const limit = Math.round(b.used + (S.approved_total - b.used) / hours)
  await admin(`/admin/campaigns/${ids.campaigns['fs-ops-freeship30']}`, { method: 'POST', team: 'marketing', body: { budget: { limit } } })
  act('marketing', `Mở khung ${E.clock(t)}: hạn mức FREESHIP30 trên Medusa ${E.money(limit * W_BUDGET)} (đã dùng ${E.money(b.used * W_BUDGET)})`)
}

let loop = null
// Gom vài phút ít đơn vào một lượt gửi để Medusa xử lý song song; dừng gom ở đầu giờ (mở khung ngân sách)
async function runLoop() {
  while (S.running && S.t < E.N - 1) {
    const q = S.scenario === 'margin' ? await quotes() : null
    const batch = []
    let t = S.t
    while (t < E.N - 1 && batch.length < 6 && sum(batch, (b) => b.jobs.length) < 2 * CONCURRENCY) {
      t += 1
      if (S.scenario === 'budget' && S.slots && t % 60 === 0) {
        if (batch.length) { t -= 1; break }
        await releaseSlot(t)
      }
      batch.push(S.scenario === 'budget' ? minuteBudget(t) : minuteMargin(t, q))
    }
    const res = await pool(batch.flatMap((b) => b.jobs), CONCURRENCY)
    const errs = res.filter((x) => x?.error)
    if (errs.length) { S.errors += errs.length; log(`phút ${batch[0].stat.t}–${t}: ${errs.length} lỗi`, errs[0].error) }
    for (const b of batch) S.minutes[b.stat.t] = b.stat
    if (S.scenario === 'budget') S.live_budget = await budgetOf('FS-OPS-FREESHIP30')
    await syncOrders().catch((e) => log('đọc đơn', e.message))
    S.t = t
    await agentTick().catch((e) => log('agent', e.message))
  }
  S.running = false
  loop = null
}

// ------------------------------------------------------------------ đọc lại từ Medusa
const ORDER_FIELDS = 'id,email,created_at,metadata,item_subtotal,items.variant_sku,items.adjustments.code,items.adjustments.amount,shipping_methods.amount,shipping_methods.adjustments.code,shipping_methods.adjustments.amount'
let ledger = new Map() // order id -> đơn đọc từ Medusa
let ledgerRun = null
async function syncOrders() {
  if (ledgerRun !== S.run) { ledger = new Map(); ledgerRun = S.run }
  const known = [...S.orders.keys()].filter((id) => !ledger.has(id))
  for (let i = 0; i < known.length; i += 50) {
    const qs = known.slice(i, i + 50).map((id) => `id[]=${id}`).join('&')
    const r = await admin(`/admin/orders?${qs}&limit=50&fields=${ORDER_FIELDS}`)
    for (const o of r.orders) ledger.set(o.id, o)
  }
}
const adj = (o, code) => [...(o.items ?? []).flatMap((i) => i.adjustments ?? []), ...(o.shipping_methods ?? []).flatMap((s) => s.adjustments ?? [])].filter((a) => !code || a.code === code).reduce((s, a) => s + Number(a.amount), 0)
const shipAdj = (o) => (o.shipping_methods ?? []).flatMap((s) => s.adjustments ?? []).reduce((s, a) => s + Number(a.amount), 0)
const itemAdj = (o) => (o.items ?? []).flatMap((i) => i.adjustments ?? []).reduce((s, a) => s + Number(a.amount), 0)

// Chuỗi số liệu theo phút cùng dạng với engine, dựng từ đơn trên Medusa và số liệu phiên storefront
function rowsBudget() {
  const sc = E.BUDGET
  const plan = E.simulateBudget(sc, { event: false }).rows
  const byMin = Object.groupBy([...ledger.values()].map((o) => ({ o, m: S.orders.get(o.id) })).filter((x) => x.m), (x) => x.m.t)
  const rows = []
  let san = 0
  let bank = 0
  let fsUses = 0
  const emails = new Set()
  let added = 0
  let spent = 0 // tiền FREESHIP30 Medusa đã trừ trên các đơn
  for (let t = 0; t <= S.t; t++) {
    const st = S.minutes[t] ?? { attempts: 0, kol: 0, fs_seen: 0, bought: 0 }
    const list = byMin[t] ?? []
    const fs = list.filter((x) => x.m.kind === 'freeship')
    const used = fs.filter((x) => shipAdj(x.o) > 0)
    for (const d of S.decisions) if (d.t === t && d.change.add_budget) added += d.change.add_budget
    fsUses += used.length
    for (const x of used) emails.add(x.o.email)
    san += sum(list.filter((x) => x.m.kind === 'SAN50K'), (x) => adj(x.o, 'FS-OPS-SAN50K')) * W_BUDGET
    bank += sum(list.filter((x) => x.m.kind === 'BANK20'), (x) => adj(x.o, 'FS-OPS-BANK20')) * W_BUDGET
    const cap = [...S.decisions].reverse().find((d) => d.t <= t && d.change.cap != null)?.change.cap ?? sc.campaign.cap
    const slots = S.decisions.some((d) => d.t <= t && d.change.slots)
    const approved = sc.campaign.budget + added
    const attempts = st.attempts * W_BUDGET
    const spend = sum(used, (x) => shipAdj(x.o)) * W_BUDGET
    spent += spend
    const left = approved - spent
    rows.push({
      t, attempts, plan_attempts: E.planAttempts(t), ratio: attempts / E.planAttempts(t), kol_share: st.attempts ? st.kol / st.attempts : 0,
      uses: used.length * W_BUDGET, plan_uses: plan[t].plan_uses, want: used.length * W_BUDGET, orders: fs.length * W_BUDGET, spend, left,
      slot_left: slots && S.live_budget ? (S.live_budget.limit - S.live_budget.used) * W_BUDGET : null, cap, min_order: sc.campaign.min_order, slots,
      active: st.attempts ? st.fs_seen > 0 : left >= cap, cover: st.attempts ? st.fs_seen / st.attempts : 1,
      abandon: st.attempts ? 1 - st.bought / st.attempts : 0, gmv: sum(fs, (x) => Number(x.o.item_subtotal)) * W_BUDGET,
      plan_left: plan[t].plan_left, san_spent: san, bank_spent: bank, support_per_use: used.length ? spend / (used.length * W_BUDGET) : 0,
      uses_per_customer: emails.size ? fsUses / emails.size : 1,
    })
  }
  return rows
}
function rowsMargin() {
  const sc = E.MARGIN
  const plan = E.simulateMargin(sc, { event: false }).rows
  const all = [...ledger.values()].map((o) => ({ o, m: S.orders.get(o.id) })).filter((x) => x.m)
  const byMin = Object.groupBy(all, (x) => x.m.t)
  const seen = {} // giá trị ưu đãi trung bình gần nhất của từng nhóm giỏ, cho phút không có đơn
  const rows = []
  let cum = 0
  for (let t = 0; t <= S.t; t++) {
    const list = byMin[t] ?? []
    const cells = []
    for (const seg of Object.keys(E.SEGS)) for (const size of Object.keys(E.SIZES)) {
      const xs = list.filter((x) => x.m.seg === seg && x.m.size === size)
      const w = W_MARGIN[seg][size]
      if (xs.length) seen[`${seg}${size}`] = { vip: sum(xs, (x) => itemAdj(x.o)) / xs.length, ship: sum(xs, (x) => shipAdj(x.o)) / xs.length }
      const v = seen[`${seg}${size}`] ?? { vip: 0, ship: 0 }
      const s = E.SIZES[size]
      cells.push({ seg, size, orders: xs.length * w, aov: s.aov, fee: s.fee, vip: v.vip, ship: v.ship, per: sc.take_rate * s.aov - v.vip - v.ship, combo: [v.vip > 0 && 'VIP15', v.ship > 0 && 'FREESHIP_ALL'].filter(Boolean) })
    }
    const orders = sum(cells, (c) => c.orders)
    const profit = sum(list, (x) => (sc.take_rate * Number(x.o.item_subtotal) - itemAdj(x.o) - shipAdj(x.o)) * x.m.weight)
    cum += profit
    const ship = sum(list, (x) => shipAdj(x.o) * x.m.weight)
    rows.push({
      t, cells, orders, plan_orders: plan[t].plan_orders, gmv: sum(list, (x) => Number(x.o.item_subtotal) * x.m.weight), profit, cum, plan_cum: plan[t].plan_cum,
      ship_cost: ship, discount: sum(list, (x) => itemAdj(x.o) * x.m.weight), ship_per_order: orders ? ship / orders : plan[t].plan_ship_per_order, plan_ship_per_order: plan[t].plan_ship_per_order,
      bulky_share: orders ? sum(cells.filter((c) => c.size === 'bulky'), (c) => c.orders) / orders : 0, plan_bulky_share: plan[t].plan_bulky_share,
      cfg: Object.assign({}, ...S.decisions.filter((d) => d.t <= t).map((d) => d.change)),
    })
  }
  return rows
}
const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0)

async function auditSinceStart() {
  if (!S.started_at) return []
  const r = await admin(`/admin/flashsre/config-changes?since=${encodeURIComponent(S.started_at)}&limit=200`)
  const opsIds = new Set([...Object.values(ids?.promos ?? {}), ...Object.values(ids?.campaigns ?? {})])
  return (r.config_changes ?? r.changes ?? []).filter((c) => opsIds.has(c.entity_id) || /FS-OPS|fs-ops/.test(c.entity_label ?? ''))
    .map((c) => ({ at: c.created_at, team: c.team, actor: c.actor_email, entity: c.entity_label ?? c.entity_id, method: c.method, text: `${c.team ?? 'không team'} ${c.method === 'DELETE' ? 'xóa' : 'cập nhật'} ${c.entity_label ?? c.entity_type}` }))
}
async function medusaPanel() {
  if (!ids?.promos) return null
  const promos = (await admin(`/admin/promotions?limit=100&fields=id,code,status,application_method.value,campaign.campaign_identifier,campaign.budget.used,campaign.budget.limit`)).promotions.filter((p) => p.code?.startsWith('FS-OPS-'))
  const list = [...ledger.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
  return {
    promos: promos.filter((p) => CODES[S.scenario].includes(p.code)).map((p) => ({ code: p.code, status: p.status, value: Number(p.application_method?.value ?? 0), owner: OWNER[p.code], campaign: p.campaign?.campaign_identifier, used: p.campaign?.budget ? Number(p.campaign.budget.used) : null, limit: p.campaign?.budget ? Number(p.campaign.budget.limit) : null })),
    orders: ledger.size, carts: sum(S.minutes.filter(Boolean), (m) => m.attempts ?? m.bought),
    recent: list.slice(0, 6).map((o) => ({ id: o.id, at: o.created_at, t: S.orders.get(o.id)?.t, subtotal: Number(o.item_subtotal), item_adj: (o.items ?? []).flatMap((i) => i.adjustments ?? []).map((a) => ({ code: a.code, amount: Number(a.amount) })), ship_fee: Number(o.shipping_methods?.[0]?.amount ?? 0), ship_adj: (o.shipping_methods?.[0]?.adjustments ?? []).map((a) => ({ code: a.code, amount: Number(a.amount) })), weight: S.orders.get(o.id)?.weight })),
    fees: Object.fromEntries(Object.keys(E.SIZES).map((k) => [k, ids.fees[`fs-ops-size-${k}`]])),
    contracts: S.contract_versions, admin_url: `${BASE}/app/orders`,
  }
}

// ------------------------------------------------------------------ agent tự chạy: benchmark -> sự cố -> điều tra -> chờ duyệt -> kiểm chứng -> kinh nghiệm
const LESSON_CONTRACT = 'FLASHSRE-LESSONS'
const incidentContract = () => (S.scenario === 'budget' ? 'CT-OPS-FREESHIP30' : 'CT-OPS-VIP-FREESHIP')
const rowsNow = () => (S.scenario === 'budget' ? rowsBudget() : rowsMargin())
async function factsNow() {
  const changes = await auditSinceStart().catch(() => [])
  return { changes: changes.filter((c) => !S.decided_iso || c.at < S.decided_iso), fees: Object.fromEntries(Object.keys(E.SIZES).map((k) => [k, ids.fees[`fs-ops-size-${k}`]])) }
}
// Bản ghi sự cố trên Medusa: benchmark, chuỗi số liệu, các bước điều tra, phương án, kiểm chứng (Admin FlashSRE Ops vẽ chart từ đây)
function dossier(sc, rows, det, inv, extra = {}) {
  const bench = E.evaluateBenchmarks(sc, rows, S.t)
  const r2 = (v) => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null)
  const main = sc.id === 'budget'
    ? { kind: 'budget', label: 'Ngân sách FREESHIP30 còn lại', actual: rows.map((r) => Math.round(r.left)), plan: E.simulateBudget(sc, { event: false }).rows.map((r) => Math.round(r.plan_left)) }
    : { kind: 'margin', label: 'Lợi nhuận đóng góp luỹ kế', actual: rows.map((r) => Math.round(r.cum)), plan: E.simulateMargin(sc, { event: false }).rows.map((r) => Math.round(r.plan_cum)), target: Math.round(E.marginTarget(sc)) }
  return {
    scenario: sc.id, title: sc.title, run: S.run, day: E.DAY, now: S.t, sampling: S.scenario === 'budget' ? { weight: W_BUDGET } : { weights: W_MARGIN },
    detected: det && { t: det.t, signal: det.signal, benchmark: det.benchmark, breached: det.breached, onset: det.onset },
    benchmarks: bench.map((b) => ({ id: b.id, label: b.label, unit: b.unit, dir: b.dir, warn: b.warn, breach: b.breach, sustain: b.sustain, trigger: !!b.trigger, source: b.source, fired: b.fired, status: b.status, values: b.series.map((x) => r2(x.v)) })),
    series: main, steps: inv?.steps ?? [], cause: inv?.cause ?? null, actions: S.actions.slice(0, 30),
    gaps: inv?.gaps?.map(({ seg, size, gap, expected, per, orders, plan_orders }) => ({ seg, size, gap: Math.round(gap), expected: Math.round(expected), per: Math.round(per), orders: Math.round(orders), plan_orders: Math.round(plan_orders) })),
    ...extra,
  }
}
async function recordIncident(status, verdict, body) {
  const r = await admin('/admin/flashsre/agent-runs', {
    method: 'POST',
    body: { contract_id: incidentContract(), finding_key: `incident:${S.scenario}:${S.run}`, title: SC().title, verdict, confidence: 0.9, status, llm: 'flashsre-ops-playbook', dossier: body },
  })
  act(null, `FlashSRE ghi sự cố lên Medusa (${status}): ${r.agent_run?.id ?? ''}`)
}
async function agentTick() {
  const sc = SC()
  const rows = rowsNow()
  if (!rows.length) return
  const det = E.detect(sc, rows, S.t)
  if (!det) return
  const n = E.STEPS(sc)
  const facts = await factsNow()
  const inv = E.investigate(sc, { rows, onset: det.onset }, Math.min(S.t, det.t + n), facts)
  if (!S.incident) {
    S.incident = { opened: det.t }
    act(null, `Benchmark kích hoạt agent: ${det.signal}`)
  }
  // điều tra xong: tính phương án, dừng bộ sinh đơn, ghi sự cố chờ duyệt
  if (S.t >= det.t + n + 1 && !S.chosen && !S.incident.awaiting) {
    const opts = E.options(sc, { rows, exhausted: rows.find((r) => r.left < r.cap)?.t ?? null }, S.t, inv, { decisions: S.decisions, event: S.event })
    S.incident.awaiting = S.t
    S.incident.inv = inv // điều tra chốt tại thời điểm đề xuất; nhật ký sau đó là thao tác đã duyệt
    S.running = false
    act(null, `Agent dừng chờ duyệt: đề xuất "${opts.find((o) => o.recommended)?.label}"`)
    await recordIncident('awaiting_approval', 'BUSINESS_INCIDENT', dossier(sc, rows, det, inv, { options: opts.map(({ decisions, series, ...o }) => o) }))
  }
  // đã duyệt và kiểm chứng xong: ghi kinh nghiệm và đóng sự cố
  if (S.chosen && !S.learned) {
    const ver = E.verify(sc, { rows }, S.t, S.decidedAt)
    if (ver?.ok) {
      S.learned = true
      const frozen = S.incident.inv ?? inv
      const lesson = E.learn(sc, { rows }, det, frozen, S.chosen, ver, S.t)
      if (sc.id === 'margin') lesson.params = { bulky_category_handle: 'fs-ops-cong-kenh' }
      await admin('/admin/flashsre/agent-runs', {
        method: 'POST',
        body: { contract_id: LESSON_CONTRACT, finding_key: `lesson:${lesson.id}`, title: lesson.title, verdict: lesson.kind, confidence: 0.85, status: 'lesson', llm: 'flashsre-ops-playbook', dossier: lesson },
      })
      lessonCache.at = 0
      act(null, `Agent ghi kinh nghiệm lên Medusa: ${lesson.title}`)
      await recordIncident('resolved', 'BUSINESS_INCIDENT', dossier(sc, rows, det, frozen, { options: S.chosen.options, chosen: { id: S.chosen.id, at: S.chosen.at }, verification: ver, lesson: lesson.id }))
    }
  }
}
// Kinh nghiệm mới nhất của mỗi loại trên Medusa
async function lessonsOnMedusa() {
  const r = await admin(`/admin/flashsre/agent-runs?contract_id=${LESSON_CONTRACT}&limit=50`)
  const latest = new Map()
  for (const a of r.agent_runs ?? []) if (a.status === 'lesson' && !latest.has(a.finding_key)) latest.set(a.finding_key, { ...a.dossier, medusa_id: a.id, created_at: a.created_at })
  return [...latest.values()]
}

// Voucher nháp tạo qua Admin API (status draft nên chưa áp cho khách); middleware FlashSRE trên Medusa kiểm tra trước khi lưu
async function createDraft({ draft, guard }) {
  const d = E.DRAFTS.find((x) => x.id === draft)
  ids ??= await ensureCatalog()
  const code = `FS-OPS-DRAFT-${d.id.toUpperCase()}`
  const old = (await admin(`/admin/promotions?limit=50&fields=id,code`)).promotions.filter((p) => p.code.startsWith(code))
  for (const p of old) await admin(`/admin/promotions/${p.id}`, { method: 'DELETE' }).catch(() => null)
  const vnd = ruleSet('currency_code', 'eq', ['vnd'])
  let body
  if (d.kind === 'freeship') {
    const identifier = `fs-ops-draft-${d.id}-${Date.now().toString(36)}`
    const camp = (await admin('/admin/campaigns', {
      method: 'POST', team: 'marketing',
      body: { name: identifier, campaign_identifier: identifier, description: guard ? 'flashsre:budget_slots mở ngân sách theo khung giờ' : 'Freeship 12.12', starts_at: new Date(Date.now() + 864e5).toISOString(), ends_at: new Date(Date.now() + 2 * 864e5).toISOString(), budget: { type: 'spend', currency_code: 'vnd', limit: Math.round(d.budget / W_BUDGET) } },
    })).campaign
    body = { code, type: 'standard', status: 'draft', is_automatic: true, campaign_id: camp.id, application_method: { type: 'fixed', value: d.cap, currency_code: 'vnd', target_type: 'shipping_methods', allocation: 'each', max_quantity: 1, target_rules: [ruleSet('shipping_methods.shipping_option.shipping_option_type_id', 'in', SHIP.filter((x) => x.code.startsWith('fs-ops-z')).map((x) => ids.types[x.code]))] }, rules: [vnd, ruleSet('item_subtotal', 'gte', [String(d.min_order)])] }
  } else {
    const groups = (await admin('/admin/customer-groups?limit=200')).customer_groups
    const vipGroup = groups.find((g) => g.name === VIP_GROUP)?.id
    const targets = guard ? [ruleSet('items.product.categories.id', 'in', [ids.cats.nho, ids.cats.vua])] : []
    body = { code, type: 'standard', status: 'draft', is_automatic: true, application_method: { type: 'percentage', value: d.rate * 100, target_type: 'items', allocation: 'across', target_rules: targets }, rules: [vnd, ruleSet('customer.groups.id', 'in', [vipGroup])] }
  }
  const res = await fetch(`${BASE}/admin/promotions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenOf('marketing')}` }, body: JSON.stringify(body) })
  const json = await res.json()
  if (!res.ok) throw new Error(`Tạo voucher nháp: ${JSON.stringify(json).slice(0, 200)}`)
  if (guard && d.kind === 'stack') {
    await admin('/admin/promotions', { method: 'POST', team: 'marketing', body: { code: `${code}-CK`, type: 'standard', status: 'draft', is_automatic: true, application_method: { type: 'fixed', value: 200000, currency_code: 'vnd', target_type: 'items', allocation: 'across', target_rules: [ruleSet('items.product.categories.id', 'in', [ids.cats['cong-kenh']])] }, rules: body.rules } })
  }
  const header = res.headers.get('x-flashsre-preflight')
  const check = await admin(`/admin/flashsre/preflight?promotion_id=${json.promotion.id}`).catch((e) => ({ error: e.message }))
  const verdictText = { pass: 'không khớp kinh nghiệm rủi ro nào', covered: 'đã có guardrail từ kinh nghiệm', warn: 'khớp kinh nghiệm rủi ro, cần guardrail' }
  const text = check.error
    ? `Đã tạo ${code} (status draft). Backend chưa có bước kiểm tra trước (${check.error.slice(0, 80)}).`
    : `Đã tạo ${code} (status draft). Kiểm tra trước của Medusa: ${verdictText[check.verdict] ?? check.verdict}${check.matched?.length ? ` · ${check.matched.map((m) => `${m.lesson_id}${m.covered ? ' (đã có guardrail)' : ''}`).join(', ')}` : ''}.${header ? ' Middleware gắn header x-flashsre-preflight khi tạo.' : ''}`
  act('marketing', text)
  return { code, id: json.promotion.id, header, check, text }
}

// ------------------------------------------------------------------ phương án đã duyệt -> Admin API
async function promoId(code) { return ids.promos[code] }
async function targetTypes(code, keep) {
  const p = (await admin(`/admin/promotions/${await promoId(code)}?fields=application_method.target_rules.id,application_method.target_rules.attribute`)).promotion
  const r = p.application_method.target_rules.find((x) => x.attribute.endsWith('shipping_option_type_id'))
  await admin(`/admin/promotions/${p.id}/target-rules/batch`, { method: 'POST', team: OWNER[code], body: { update: [{ id: r.id, attribute: r.attribute, operator: 'in', values: keep }] } })
}
async function applyChange(change) {
  const done = []
  if (S.scenario === 'budget') {
    if (change.add_budget) {
      const add = Math.round(change.add_budget / W_BUDGET)
      const fs = await budgetOf('FS-OPS-FREESHIP30')
      const san = await budgetOf('FS-OPS-SAN50K')
      await admin(`/admin/campaigns/${ids.campaigns['fs-ops-san50k']}`, { method: 'POST', team: 'finance', body: { budget: { limit: san.limit - add } } })
      await admin(`/admin/campaigns/${ids.campaigns['fs-ops-freeship30']}`, { method: 'POST', team: 'finance', body: { budget: { limit: fs.limit + add } } })
      S.approved_total += add
      done.push(['finance', `Chuyển ${E.money(change.add_budget)} ngân sách SAN50K sang FREESHIP30`])
    }
    if (change.cap != null) {
      await admin(`/admin/promotions/${await promoId('FS-OPS-FREESHIP30')}`, { method: 'POST', team: 'marketing', body: { application_method: { value: change.cap } } })
      done.push(['marketing', `FREESHIP30 trợ tối đa ${E.vnd(change.cap)}`])
    }
    if (change.slots) {
      S.slots = true
      await releaseSlot(S.t + 1)
    }
  } else {
    if (change.bulky_ship_cap != null) {
      await targetTypes('FS-OPS-FREESHIP-ALL', ['small', 'medium'].map((k) => ids.types[`fs-ops-size-${k}`]))
      await admin(`/admin/promotions/${await promoId('FS-OPS-FS-CK50')}`, { method: 'POST', team: 'growth', body: { status: 'active', application_method: { value: change.bulky_ship_cap } } })
      done.push(['growth', `Freeship hàng cồng kềnh tối đa ${E.vnd(change.bulky_ship_cap)}`])
    }
    if (change.vip_cap_bulky != null) {
      const id = await promoId('FS-OPS-VIP15-CK')
      await admin(`/admin/promotions/${id}`, { method: 'POST', team: 'marketing', body: change.vip_cap_bulky > 0 ? { application_method: { value: change.vip_cap_bulky } } : { status: 'inactive' } })
      done.push(['marketing', change.vip_cap_bulky > 0 ? `VIP15 hàng cồng kềnh tối đa ${E.vnd(change.vip_cap_bulky)}` : 'Tắt VIP15 cho hàng cồng kềnh'])
    }
    if (change.freeship_off) {
      await admin(`/admin/promotions/${await promoId('FS-OPS-FREESHIP-ALL')}`, { method: 'POST', team: 'growth', body: { status: 'inactive' } })
      done.push(['growth', 'Tắt FREESHIP-ALL'])
    }
    S.cfg_version++
  }
  for (const [team, text] of done) act(team, `${text} (Admin API, tài khoản ${TEAM_EMAILS[team]})`)
}

async function approve({ option, role, snapshot }) {
  if (S.chosen) throw new Error('Đã có phương án được duyệt')
  S.approvals[option.id] = [...new Set([...(S.approvals[option.id] ?? []), role])]
  act(E.ROLE_TEAM[role], `${E.ROLES[role]} duyệt: ${option.label}`)
  if (!option.roles.every((r) => S.approvals[option.id].includes(r))) return
  S.running = false
  await loop
  S.busy = { label: 'Áp dụng phương án qua Admin API', at: Date.now() }
  S.decided_iso = new Date().toISOString() // nhật ký từ mốc này là thao tác của phương án đã duyệt
  try {
    await applyChange(option.change)
    S.decisions = [...S.decisions, { t: S.t + 1, change: option.change }]
    S.decidedAt = S.t
    S.chosen = { id: option.id, at: S.t, options: snapshot, keep: snapshot.find((o) => o.id === 'keep') }
  } finally {
    S.busy = null
  }
  // agent dừng bộ sinh đơn để chờ duyệt; duyệt xong thì chạy tiếp để kiểm chứng
  start()
}
function start() {
  if (S.busy) throw new Error('Đang dựng dữ liệu trên Medusa, chờ xong rồi chạy')
  if (loop || S.t >= E.N - 1 || !ids?.promos) return
  S.running = true
  loop = runLoop().catch((e) => { S.error = e.message; S.running = false; log(e); loop = null })
}

async function cleanup() {
  S.running = false
  await loop
  ids ??= await ensureCatalog()
  const promos = (await admin('/admin/promotions?limit=500&fields=id,code')).promotions.filter((p) => p.code?.startsWith('FS-OPS-'))
  for (const p of promos) await admin(`/admin/promotions/${p.id}`, { method: 'POST', body: { status: 'inactive' } }).catch(() => null)
  const opts = (await admin('/admin/shipping-options?limit=500&fields=id,name')).shipping_options.filter((o) => o.name.startsWith('FS-OPS '))
  for (const o of opts) await admin(`/admin/shipping-options/${o.id}`, { method: 'DELETE', team: 'logistics' }).catch(() => null)
  ids = null
  S.run = null
  return { promotions_off: promos.length, shipping_options_removed: opts.length }
}

// ------------------------------------------------------------------ HTTP
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' }
const SHELL = (body) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style><script>window.FLASHSRE_LIVE = true</script></head><body>${body}</body></html>`
// Trang demo hỏi trạng thái mỗi 1,5 giây; gom các lần đọc Medusa lại để không dồn tải lên dyno
const cache = new Map()
async function cached(key, ms, fn) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ms) return hit.value
  const value = await fn()
  cache.set(key, { at: Date.now(), value })
  return value
}
let lessonCache = { at: 0, value: [] }
async function lessonsCached() {
  if (Date.now() - lessonCache.at > 5000) lessonCache = { at: Date.now(), value: await lessonsOnMedusa().catch(() => lessonCache.value) }
  return lessonCache.value
}
let serial = Promise.resolve()
const once = (fn) => { const p = serial.then(fn, fn); serial = p.catch(() => null); return p }
const ROUTES = {
  'GET /api/state': async () => {
    const rows = !ids?.promos || S.t < 0 ? [] : S.scenario === 'budget' ? rowsBudget() : rowsMargin()
    const [changes, medusa, lessons] = await Promise.all([cached('audit', 4000, () => auditSinceStart().catch(() => [])), cached('panel', 4000, () => medusaPanel().catch((e) => ({ error: e.message }))), lessonsCached()])
    return {
      live: true, base: BASE, scenario: S.scenario, event: S.event, t: S.t, running: S.running, busy: S.busy, error: S.error, ready: !!ids?.promos && S.run != null,
      rows, decisions: S.decisions, approvals: S.approvals, chosen: S.chosen, decidedAt: S.decidedAt, actions: S.actions,
      facts: { changes: changes.filter((c) => !S.decidedAt || c.at < S.decided_iso), all_changes: changes, fees: medusa?.fees }, medusa,
      sampling: S.scenario === 'budget' ? { weight: W_BUDGET } : { weights: W_MARGIN }, quotes: S.quotes, errors: S.errors, lessons, incident: S.incident,
    }
  },
  'POST /api/setup': async (b) => { if (S.busy) throw new Error('Đang bận'); S.running = false; await loop; setup(b.scenario ?? S.scenario, b.event ?? true); return { started: true } },
  'POST /api/run': async (b) => { if (b.on) start(); else { S.running = false; await loop } return { running: S.running } },
  'POST /api/approve': (b) => once(async () => { await approve(b); return { ok: true } }),
  'POST /api/cleanup': () => once(cleanup),
  'POST /api/draft': (b) => once(() => createDraft(b)),
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  const route = ROUTES[`${req.method} ${url.pathname}`]
  if (route) {
    let body = ''
    for await (const c of req) body += c
    try {
      const out = await route(body ? JSON.parse(body) : {})
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(out))
    } catch (e) {
      log(e)
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: e.message }))
    }
    return
  }
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  const file = join(DIR, path === '/' ? 'index.html' : path)
  if (!file.startsWith(DIR) || !['.html', '.mjs'].includes(extname(file)) || /medusa-ops|test/.test(file)) { res.writeHead(404).end(); return }
  try {
    const buf = await readFile(file)
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)], 'Cache-Control': 'no-store' })
    res.end(extname(file) === '.html' ? SHELL(buf.toString('utf8')) : buf)
  } catch { res.writeHead(404).end() }
}).listen(PORT, () => log(`FlashSRE Ops trên Medusa: http://localhost:${PORT}  (BASE ${BASE})`))
