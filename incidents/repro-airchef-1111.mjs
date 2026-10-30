#!/usr/bin/env node
/**
 * FlashSRE repro — AirChef 6L trong campaign 11.11 (flash sale + voucher shop + voucher sàn
 * + freeship + nhiều provider) trên Medusa v2 (region Việt Nam / VND).
 *
 * 1. setup: dựng cấu hình ĐÚNG kế hoạch campaign (idempotent, mọi đối tượng có tiền tố FS1111).
 * 2. Mỗi scenario: inject MỘT sai sót của người cấu hình qua đúng endpoint mà Admin UI gọi,
 *    tạo cart thật qua Store API, ghi lại kết quả, rồi khôi phục cấu hình đúng.
 *
 * Usage: node incidents/repro-airchef-1111.mjs                  -> setup + chạy mọi scenario
 *        node incidents/repro-airchef-1111.mjs setup            -> chỉ dựng/khôi phục cấu hình đúng
 *        node incidents/repro-airchef-1111.mjs inject S1        -> khôi phục rồi cài đúng một lỗi (giữ nguyên)
 *        node incidents/repro-airchef-1111.mjs cart [--variant trang] [--provider fs-ahamove]
 *             [--codes FS1111-SHOP100K,FS1111-SAN10 | --codes none] [--codes-first] [--touch]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE || 'https://flashsre-commerce-30123348ca77.herokuapp.com'
const EMAIL = process.env.EMAIL || 'admin@flashsre.dev'
const PASSWORD = process.env.PASSWORD
if (!PASSWORD) {
  console.error('Thiếu biến môi trường PASSWORD (mật khẩu admin)')
  process.exit(1)
}
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'out')
// Mỗi môi trường (local, Heroku) một file state, tránh dùng nhầm ID của nơi khác
const STATE_FILE = join(OUT_DIR, `state-${new URL(BASE).host.replace(/[^a-z0-9.-]/gi, '_')}.json`)

// Kế hoạch campaign đã duyệt (nguồn sự thật để so sánh, KHÔNG đọc từ Medusa)
const PLAN = {
  list_price: 2490000,
  flash_price: 1790000,
  shop_voucher: { code: 'FS1111-SHOP100K', fixed: 100000, min_spend: 1500000 },
  platform_voucher: { code: 'FS1111-SAN10', percent: 10, cap: 150000, min_spend: 1500000 },
  freeship: { code: 'FS1111-FREESHIP40K', support: 40000, threshold: 1600000, threshold_base: 'item_subtotal' },
  expected_goods_total: 1540000,
}
const SHIPPING = [
  { code: 'fs-ghn', label: 'GHN', name: 'FS1111 GHN Tiêu chuẩn', amount: 35000, in_program: true },
  { code: 'fs-ghtk', label: 'GHTK', name: 'FS1111 GHTK Tiết kiệm', amount: 50000, in_program: true },
  { code: 'fs-ahamove', label: 'AhaMove', name: 'FS1111 AhaMove Hỏa tốc 2h', amount: 60000, in_program: false },
]

// Có FLASHSRE_TEAM_PASSWORD thì mỗi lỗi được inject bằng tài khoản của team gây ra nó (audit ghi đúng team)
const TEAM_PASSWORD = process.env.FLASHSRE_TEAM_PASSWORD
const TEAM_EMAILS = {
  merchandising: 'merch@flashsre.dev', seller_ops: 'sellerops@flashsre.dev', marketing: 'marketing@flashsre.dev',
  logistics: 'logistics@flashsre.dev', finance: 'finance@flashsre.dev', category: 'category@flashsre.dev',
}
const CONTRACT_FILE = join(dirname(fileURLToPath(import.meta.url)), 'contracts', 'ct-airchef-1111.json')

let token
async function loginAs(email, password) {
  token = (await api('/auth/user/emailpass', { method: 'POST', body: { email, password } })).token
}
async function api(path, { method = 'GET', body, pk } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token && !pk) headers.Authorization = `Bearer ${token}`
  if (pk) headers['x-publishable-api-key'] = pk
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let json = null
  try { json = await r.json() } catch {}
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(json).slice(0, 400)}`)
  return json
}
const log = (...a) => console.error(...a)
const iso = (ms) => new Date(Date.now() + ms).toISOString()

async function setup() {
  await loginAs(EMAIL, PASSWORD)
  const ids = {}

  const store = (await api('/admin/stores?fields=id,supported_currencies.currency_code,supported_currencies.is_default')).stores[0]
  if (!store.supported_currencies.some((c) => c.currency_code === 'vnd')) {
    await api(`/admin/stores/${store.id}`, {
      method: 'POST',
      body: {
        supported_currencies: [
          ...store.supported_currencies.map((c) => ({ currency_code: c.currency_code, is_default: c.is_default })),
          { currency_code: 'vnd' },
        ],
      },
    })
  }

  const regions = (await api('/admin/regions?limit=100&fields=id,name,currency_code')).regions
  ids.region = regions.find((r) => r.currency_code === 'vnd')?.id
  if (!ids.region) {
    ids.region = (await api('/admin/regions', {
      method: 'POST',
      body: { name: 'Việt Nam (FS1111)', currency_code: 'vnd', countries: ['vn'], payment_providers: ['pp_system_default'] },
    })).region.id
  }

  const locations = (await api('/admin/stock-locations?fields=id,name,fulfillment_sets.id,fulfillment_sets.service_zones.id,fulfillment_sets.service_zones.name,sales_channels.id')).stock_locations
  const fset = locations.find((l) => l.name === 'European Warehouse').fulfillment_sets[0]
  ids.service_zone = fset.service_zones.find((z) => z.name === 'Việt Nam (FS1111)')?.id
  if (!ids.service_zone) {
    const res = await api(`/admin/fulfillment-sets/${fset.id}/service-zones`, {
      method: 'POST',
      body: { name: 'Việt Nam (FS1111)', geo_zones: [{ type: 'country', country_code: 'vn' }] },
    })
    ids.service_zone = res.fulfillment_set.service_zones.find((z) => z.name === 'Việt Nam (FS1111)').id
  }

  const profiles = (await api('/admin/shipping-profiles')).shipping_profiles
  ids.shipping_profile = profiles.find((p) => p.name === 'Default Shipping Profile').id
  const types = (await api('/admin/shipping-option-types?limit=100')).shipping_option_types
  const options = (await api('/admin/shipping-options?limit=100&fields=id,name')).shipping_options
  ids.types = {}
  ids.options = {}
  for (const s of SHIPPING) {
    ids.types[s.code] = types.find((t) => t.code === s.code)?.id
    if (!ids.types[s.code]) {
      ids.types[s.code] = (await api('/admin/shipping-option-types', {
        method: 'POST', body: { label: s.label, code: s.code, description: `Provider ${s.label} (mô phỏng)` },
      })).shipping_option_type.id
    }
    ids.options[s.code] = options.find((o) => o.name === s.name)?.id
    if (!ids.options[s.code]) {
      ids.options[s.code] = (await api('/admin/shipping-options', {
        method: 'POST',
        body: {
          name: s.name, service_zone_id: ids.service_zone, shipping_profile_id: ids.shipping_profile,
          provider_id: 'manual_manual', price_type: 'flat', type_id: ids.types[s.code],
          prices: [{ currency_code: 'vnd', amount: s.amount }],
          rules: [
            { attribute: 'enabled_in_store', value: 'true', operator: 'eq' },
            { attribute: 'is_return', value: 'false', operator: 'eq' },
          ],
        },
      })).shipping_option.id
    }
  }

  ids.sales_channel = (await api('/admin/sales-channels')).sales_channels[0].id
  ids.pk = (await api('/admin/api-keys?type=publishable')).api_keys.find((k) => !k.revoked_at).token

  const cats = (await api('/admin/product-categories?handle=fs-gia-dung')).product_categories
  ids.category = cats[0]?.id || (await api('/admin/product-categories', {
    method: 'POST', body: { name: 'Gia dụng', handle: 'fs-gia-dung', is_active: true },
  })).product_category.id

  let product = (await api('/admin/products?handle=fs-airchef-6l&fields=id,variants.id,variants.sku')).products[0]
  if (!product) {
    product = (await api('/admin/products', {
      method: 'POST',
      body: {
        title: 'Nồi chiên không dầu AirChef 6L', handle: 'fs-airchef-6l', status: 'published', discountable: true,
        shipping_profile_id: ids.shipping_profile, categories: [{ id: ids.category }],
        sales_channels: [{ id: ids.sales_channel }],
        options: [{ title: 'Màu', values: ['Đen', 'Trắng'] }],
        variants: ['Đen', 'Trắng'].map((c) => ({
          title: c, sku: `FS-AIRCHEF-${c === 'Đen' ? 'DEN' : 'TRANG'}`, manage_inventory: false,
          options: { 'Màu': c }, prices: [{ currency_code: 'vnd', amount: PLAN.list_price }],
        })),
      },
    })).product
  }
  ids.product = product.id
  ids.variant_den = product.variants.find((v) => v.sku === 'FS-AIRCHEF-DEN').id
  ids.variant_trang = product.variants.find((v) => v.sku === 'FS-AIRCHEF-TRANG').id

  // Flash sale 20-22h: cửa sổ 2 giờ quanh thời điểm chạy để price list đang hiệu lực
  const flashWindow = { starts_at: iso(-10 * 60e3), ends_at: iso(110 * 60e3) }
  const lists = (await api('/admin/price-lists?limit=100&fields=id,title,prices.id,prices.variant_id')).price_lists
  let pl = lists.find((l) => l.title === 'FS1111 Flash sale AirChef 20-22h')
  if (!pl) {
    pl = (await api('/admin/price-lists', {
      method: 'POST',
      body: {
        title: 'FS1111 Flash sale AirChef 20-22h', description: 'Flash sale 11.11 khung 20-22h', type: 'sale', status: 'active',
        ...flashWindow,
        prices: [ids.variant_den, ids.variant_trang].map((v) => ({ variant_id: v, currency_code: 'vnd', amount: PLAN.flash_price })),
      },
    })).price_list
  } else {
    await api(`/admin/price-lists/${pl.id}`, { method: 'POST', body: { status: 'active', ...flashWindow } })
  }
  ids.price_list = pl.id

  const campaigns = (await api('/admin/campaigns?limit=100&fields=id,campaign_identifier,budget.id')).campaigns
  ids.campaigns = {}
  for (const [key, limit] of [['shop', 50000000], ['san', 80000000], ['freeship', 20000000]]) {
    const ident = `fs1111-${key}`
    let c = campaigns.find((x) => x.campaign_identifier === ident)
    if (!c) {
      c = (await api('/admin/campaigns', {
        method: 'POST',
        body: {
          name: `FS1111 ${key}`, campaign_identifier: ident, starts_at: iso(-86400e3), ends_at: iso(30 * 86400e3),
          budget: { type: 'spend', currency_code: 'vnd', limit },
        },
      })).campaign
    }
    ids.campaigns[key] = c.id
    await api(`/admin/campaigns/${c.id}`, { method: 'POST', body: { budget: { limit } } })
  }

  ids.promos = {}
  const spendRule = (min) => [
    { attribute: 'currency_code', operator: 'eq', values: ['vnd'] },
    { attribute: 'item_subtotal', operator: 'gte', values: [String(min)] },
  ]
  const promoDefs = {
    shop: {
      code: PLAN.shop_voucher.code, is_automatic: false, campaign_id: ids.campaigns.shop,
      application_method: { type: 'fixed', value: PLAN.shop_voucher.fixed, currency_code: 'vnd', target_type: 'order', allocation: 'across' },
      rules: spendRule(PLAN.shop_voucher.min_spend),
    },
    san: {
      code: PLAN.platform_voucher.code, is_automatic: false, campaign_id: ids.campaigns.san,
      application_method: { type: 'percentage', value: PLAN.platform_voucher.percent, target_type: 'order', allocation: 'across' },
      rules: spendRule(PLAN.platform_voucher.min_spend),
    },
    freeship: {
      code: PLAN.freeship.code, is_automatic: true, campaign_id: ids.campaigns.freeship,
      application_method: {
        type: 'fixed', value: PLAN.freeship.support, currency_code: 'vnd', target_type: 'shipping_methods',
        allocation: 'each', max_quantity: 1,
        target_rules: [{
          attribute: 'shipping_methods.shipping_option.shipping_option_type_id', operator: 'in',
          values: SHIPPING.filter((s) => s.in_program).map((s) => ids.types[s.code]),
        }],
      },
      // Chỉ cho sản phẩm của lab này, để không cộng dồn sang campaign khác trên cùng store
      rules: [
        ...spendRule(PLAN.freeship.threshold),
        { attribute: 'items.product.id', operator: 'in', values: [ids.product] },
      ],
    },
  }
  for (const [key, def] of Object.entries(promoDefs)) {
    const existing = (await api(`/admin/promotions?code=${def.code}&fields=id`)).promotions[0]
    if (existing) {
      // Khôi phục đúng kế hoạch: xóa rồi tạo lại để rules/target_rules không còn dấu vết inject
      await api(`/admin/promotions/${existing.id}`, { method: 'DELETE' })
    }
    ids.promos[key] = (await api('/admin/promotions', {
      method: 'POST', body: { type: 'standard', status: 'active', ...def },
    })).promotion.id
  }

  // Khôi phục giá flash cho cả 2 biến thể (price list chỉ lộ price_set_id nên thay toàn bộ)
  await setFlashPrices(ids, [ids.variant_den, ids.variant_trang])
  await removeCrossTeamExtras()
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify({ ...ids, flash_window: flashWindow }, null, 2))
  return ids
}

async function setFlashPrices(ids, variantIds, amount = PLAN.flash_price) {
  const current = (await api(`/admin/price-lists/${ids.price_list}?fields=prices.id`)).price_list.prices
  await api(`/admin/price-lists/${ids.price_list}/prices/batch`, {
    method: 'POST',
    body: {
      delete: current.map((p) => p.id),
      create: variantIds.map((v) => ({ variant_id: v, currency_code: 'vnd', amount })),
    },
  })
}

// Đối tượng do các case chồng chéo (X*) tạo thêm; setup xóa chúng để về đúng kế hoạch
const EXTRA_SHIPPING = { code: 'fs-jt', label: 'J&T', name: 'FS1111 J&T Express', amount: 30000 }
const EXTRA_PROMO_CODE = 'FS1111-GIADUNG15'

async function removeCrossTeamExtras() {
  const opt = (await api('/admin/shipping-options?limit=100&fields=id,name')).shipping_options.find((o) => o.name === EXTRA_SHIPPING.name)
  if (opt) await api(`/admin/shipping-options/${opt.id}`, { method: 'DELETE' })
  const promo = (await api(`/admin/promotions?code=${EXTRA_PROMO_CODE}&fields=id`)).promotions[0]
  if (promo) await api(`/admin/promotions/${promo.id}`, { method: 'DELETE' })
}

const CART_FIELDS = [
  'id', 'item_subtotal', 'item_total', 'discount_total', 'shipping_subtotal', 'shipping_total', 'total',
  'promotions.code', 'items.variant_sku', 'items.unit_price', 'items.quantity',
  'items.adjustments.code', 'items.adjustments.amount',
  'shipping_methods.name', 'shipping_methods.amount', 'shipping_methods.adjustments.code', 'shipping_methods.adjustments.amount',
].join(',')

function summarize(cart) {
  const sum = (arr) => (arr || []).reduce((a, x) => a + Number(x.amount), 0)
  const byCode = {}
  for (const it of cart.items) for (const a of it.adjustments || []) byCode[a.code] = (byCode[a.code] || 0) + Number(a.amount)
  const sm = cart.shipping_methods?.[0]
  return {
    cart_id: cart.id,
    sku: cart.items.map((i) => i.variant_sku).join('+'),
    unit_price: Number(cart.items[0]?.unit_price),
    item_subtotal: Number(cart.item_subtotal),
    item_discounts: byCode,
    goods_total_after_vouchers: Number(cart.item_subtotal) - sum(cart.items.flatMap((i) => i.adjustments || [])),
    shipping: sm ? { name: sm.name, fee: Number(sm.amount), support: sum(sm.adjustments) } : null,
    promotions: (cart.promotions || []).map((p) => p.code),
    total: Number(cart.total),
  }
}

// Mô phỏng một khách checkout: chọn biến thể, provider, nhập voucher theo thứ tự `order`
async function shopperCart(ids, { variant = 'den', provider = 'fs-ghn', codes = [], order = 'ship-then-codes', touchAfter = false }) {
  const pk = ids.pk
  const f = `?fields=${CART_FIELDS}`
  let cart = (await api('/store/carts', {
    method: 'POST', pk,
    body: {
      region_id: ids.region, sales_channel_id: ids.sales_channel, email: 'shopper@flashsre.dev',
      items: [{ variant_id: variant === 'den' ? ids.variant_den : ids.variant_trang, quantity: 1 }],
      shipping_address: { first_name: 'Lan', last_name: 'Nguyen', address_1: '1 Lê Lợi', city: 'Hà Nội', country_code: 'vn', postal_code: '100000' },
    },
  })).cart
  const addShip = () => api(`/store/carts/${cart.id}/shipping-methods${f}`, { method: 'POST', pk, body: { option_id: ids.options[provider] } })
  const addCodes = () => api(`/store/carts/${cart.id}/promotions${f}`, { method: 'POST', pk, body: { promo_codes: codes } })
  const steps = []
  const shipStep = async () => { cart = (await addShip()).cart; steps.push({ step: `chọn ship ${provider}`, ...summarize(cart) }) }
  const codeStep = async () => { cart = (await addCodes()).cart; steps.push({ step: `nhập ${codes.join(' + ')}`, ...summarize(cart) }) }
  if (order === 'ship-then-codes') {
    await shipStep()
    if (codes.length) await codeStep()
  } else {
    if (codes.length) await codeStep()
    await shipStep()
  }
  if (touchAfter) {
    // Thao tác vô hại (khách sửa ghi chú/email) -> Medusa refresh lại promotion
    cart = (await api(`/store/carts/${cart.id}${f}`, { method: 'POST', pk, body: { email: 'shopper+edit@flashsre.dev' } })).cart
    steps.push({ step: 'sửa email (refresh)', ...summarize(cart) })
  }
  return { final: steps[steps.length - 1], steps }
}

async function ruleId(promoId, attribute, kind = 'rules') {
  const p = (await api(`/admin/promotions/${promoId}?fields=rules.id,rules.attribute,application_method.target_rules.id,application_method.target_rules.attribute`)).promotion
  const list = kind === 'rules' ? p.rules : p.application_method.target_rules
  return list.find((r) => r.attribute === attribute).id
}

const SCENARIOS = [
  {
    id: 'S0', title: 'Cấu hình đúng kế hoạch (baseline)',
    mistake: null,
    run: (ids) => shopperCart(ids, { codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code] }),
  },
  {
    id: 'S1', team: 'logistics', title: 'Freeship xét ngưỡng SAU voucher (item_total) thay vì trước voucher (item_subtotal)',
    mistake: 'Logistics sửa rule FREESHIP: item_subtotal -> item_total (1 dropdown)',
    inject: async (ids) => api(`/admin/promotions/${ids.promos.freeship}/rules/batch`, {
      method: 'POST',
      body: { update: [{ id: await ruleId(ids.promos.freeship, 'item_subtotal'), attribute: 'item_total', operator: 'gte', values: [String(PLAN.freeship.threshold)] }] },
    }),
    run: async (ids) => ({
      two_vouchers_ship_first: await shopperCart(ids, { codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code], touchAfter: true }),
      two_vouchers_codes_first: await shopperCart(ids, { codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code], order: 'codes-then-ship', touchAfter: true }),
      one_voucher: await shopperCart(ids, { codes: [PLAN.shop_voucher.code], touchAfter: true }),
    }),
  },
  {
    id: 'S2', team: 'logistics', title: 'Freeship chọn nhầm provider',
    mistake: 'Logistics thay danh sách provider của FREESHIP: [GHN, GHTK] -> [AhaMove]',
    inject: async (ids) => api(`/admin/promotions/${ids.promos.freeship}/target-rules/batch`, {
      method: 'POST',
      body: {
        update: [{
          id: await ruleId(ids.promos.freeship, 'shipping_methods.shipping_option.shipping_option_type_id', 'target_rules'),
          attribute: 'shipping_methods.shipping_option.shipping_option_type_id', operator: 'in', values: [ids.types['fs-ahamove']],
        }],
      },
    }),
    run: async (ids) => ({
      ghn: await shopperCart(ids, { provider: 'fs-ghn', codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code] }),
      ahamove: await shopperCart(ids, { provider: 'fs-ahamove', codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code] }),
    }),
  },
  {
    id: 'S3', team: 'merchandising', title: 'Flash sale chọn sản phẩm nhưng thiếu một biến thể',
    mistake: 'Merchandising chỉ nhập giá flash cho biến thể Đen, bỏ sót Trắng',
    inject: (ids) => setFlashPrices(ids, [ids.variant_den]),
    run: async (ids) => ({
      den: await shopperCart(ids, { variant: 'den', codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code] }),
      trang: await shopperCart(ids, { variant: 'trang', codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code] }),
    }),
  },
  {
    id: 'S4', team: 'finance', title: 'Ngân sách con (freeship) cạn trong khi campaign còn ngân sách',
    mistake: 'Finance đặt budget freeship 30.000đ (thiếu 3 số 0) thay vì 30.000.000đ',
    inject: (ids) => api(`/admin/campaigns/${ids.campaigns.freeship}`, { method: 'POST', body: { budget: { limit: 30000 } } }),
    run: (ids) => shopperCart(ids, { codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code] }),
  },
  {
    id: 'S5', team: 'marketing', title: 'Voucher sàn chỉ cho khách mới (sai phân khúc)',
    mistake: 'Marketing thêm điều kiện customer group "Khách mới" vào voucher sàn',
    inject: async (ids) => {
      const groups = (await api('/admin/customer-groups?limit=100')).customer_groups
      const g = groups.find((x) => x.name === 'FS1111 Khách mới') || (await api('/admin/customer-groups', {
        method: 'POST', body: { name: 'FS1111 Khách mới' },
      })).customer_group
      return api(`/admin/promotions/${ids.promos.san}/rules/batch`, {
        method: 'POST', body: { create: [{ attribute: 'customer.groups.id', operator: 'in', values: [g.id] }] },
      })
    },
    run: (ids) => shopperCart(ids, { codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code] }),
  },
  // Các case chồng chéo: mỗi đội làm đúng phạm vi của mình, lỗi chỉ xuất hiện khi ghép lại
  {
    id: 'X1', team: 'merchandising', title: 'Merchandising giảm sâu giá flash -> rơi khỏi ngưỡng voucher và freeship của đội khác',
    mistake: 'Merchandising (đã được category manager duyệt) hạ giá flash 1.790.000 -> 1.490.000 để cạnh tranh; ngưỡng voucher 1.500.000 và freeship 1.600.000 của Seller Ops/Marketing/Logistics giữ nguyên',
    inject: (ids) => setFlashPrices(ids, [ids.variant_den, ids.variant_trang], 1490000),
    run: (ids) => shopperCart(ids, { codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code] }),
  },
  {
    id: 'X2', team: 'logistics', title: 'Logistics thêm provider mới -> nằm ngoài danh sách freeship của Marketing',
    mistake: 'Logistics thêm J&T Express 30.000đ (rẻ nhất) cho Việt Nam; rule FREESHIP do Marketing tạo trước đó vẫn chỉ liệt kê GHN, GHTK',
    inject: async (ids) => {
      const types = (await api('/admin/shipping-option-types?limit=100')).shipping_option_types
      const typeId = types.find((t) => t.code === EXTRA_SHIPPING.code)?.id || (await api('/admin/shipping-option-types', {
        method: 'POST', body: { label: EXTRA_SHIPPING.label, code: EXTRA_SHIPPING.code, description: 'Provider J&T (mô phỏng)' },
      })).shipping_option_type.id
      ids.options[EXTRA_SHIPPING.code] = (await api('/admin/shipping-options', {
        method: 'POST',
        body: {
          name: EXTRA_SHIPPING.name, service_zone_id: ids.service_zone, shipping_profile_id: ids.shipping_profile,
          provider_id: 'manual_manual', price_type: 'flat', type_id: typeId,
          prices: [{ currency_code: 'vnd', amount: EXTRA_SHIPPING.amount }],
          rules: [
            { attribute: 'enabled_in_store', value: 'true', operator: 'eq' },
            { attribute: 'is_return', value: 'false', operator: 'eq' },
          ],
        },
      })).shipping_option.id
      writeFileSync(STATE_FILE, JSON.stringify({ ...JSON.parse(readFileSync(STATE_FILE, 'utf8')), options: ids.options }, null, 2))
    },
    run: async (ids) => ({
      jt: await shopperCart(ids, { provider: EXTRA_SHIPPING.code, codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code] }),
      ghn: await shopperCart(ids, { provider: 'fs-ghn', codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code] }),
    }),
  },
  {
    id: 'X3', team: 'category', title: 'Ngành hàng chạy ưu đãi tự động riêng -> cộng dồn với voucher shop + sàn',
    mistake: 'Category team Gia dụng bật "Gia dụng -15% dịp 11.11" (tự động, ngân sách riêng, brief ghi "không cộng voucher sàn"); Medusa không có cờ chặn cộng dồn',
    inject: async (ids) => {
      const camp = (await api('/admin/campaigns?limit=100&fields=id,campaign_identifier')).campaigns
        .find((c) => c.campaign_identifier === 'fs1111-giadung') || (await api('/admin/campaigns', {
        method: 'POST',
        body: {
          name: 'FS1111 giadung', campaign_identifier: 'fs1111-giadung', starts_at: iso(-86400e3), ends_at: iso(30 * 86400e3),
          budget: { type: 'spend', currency_code: 'vnd', limit: 100000000 },
        },
      })).campaign
      return api('/admin/promotions', {
        method: 'POST',
        body: {
          code: EXTRA_PROMO_CODE, type: 'standard', status: 'active', is_automatic: true, campaign_id: camp.id,
          rules: [{ attribute: 'currency_code', operator: 'eq', values: ['vnd'] }],
          application_method: {
            type: 'percentage', value: 15, target_type: 'items', allocation: 'across',
            target_rules: [{ attribute: 'items.product.categories.id', operator: 'in', values: [ids.category] }],
          },
        },
      })
    },
    run: (ids) => shopperCart(ids, { codes: [PLAN.shop_voucher.code, PLAN.platform_voucher.code] }),
  },
]

const vnd = (n) => `${Number(n).toLocaleString('vi-VN')}đ`

function printCart({ steps }) {
  for (const s of steps) {
    const disc = Object.entries(s.item_discounts).map(([c, a]) => `${c} -${vnd(a)}`).join(', ') || 'không'
    const ship = s.shipping ? `${s.shipping.name} phí ${vnd(s.shipping.fee)}, hỗ trợ ${vnd(s.shipping.support)}` : 'chưa chọn'
    log(`  - ${s.step}`)
    log(`      đơn giá ${vnd(s.unit_price)} | voucher: ${disc} | tiền hàng sau voucher ${vnd(s.goods_total_after_vouchers)}`)
    log(`      ship: ${ship} | khách trả ${vnd(s.total)} | promotions: ${s.promotions.join(', ') || 'không'}`)
  }
  log(`  cart_id: ${steps[steps.length - 1].cart_id}`)
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}

async function main() {
  const cmd = process.argv[2]
  if (cmd === 'cart') {
    if (!existsSync(STATE_FILE)) throw new Error('Chưa có state.json, chạy "setup" trước')
    const ids = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
    const codesArg = arg('codes', `${PLAN.shop_voucher.code},${PLAN.platform_voucher.code}`)
    const opts = {
      variant: arg('variant', 'den'),
      provider: arg('provider', 'fs-ghn'),
      codes: codesArg === 'none' ? [] : codesArg.split(','),
      order: process.argv.includes('--codes-first') ? 'codes-then-ship' : 'ship-then-codes',
      touchAfter: process.argv.includes('--touch'),
    }
    log(`[cart] AirChef ${opts.variant}, ${opts.provider}, voucher: ${opts.codes.join(' + ') || 'không'}`)
    return printCart(await shopperCart(ids, opts))
  }
  if (cmd === 'contract') {
    await loginAs(EMAIL, PASSWORD)
    const body = JSON.parse(readFileSync(CONTRACT_FILE, 'utf8'))
    const { contract } = await api('/admin/flashsre/contracts', { method: 'POST', body: { contract_id: body.contract_id, body } })
    return log(`[contract] ${contract.contract_id} v${contract.version} approved`)
  }
  if (cmd === 'check') {
    await loginAs(EMAIL, PASSWORD)
    const { check } = await api('/admin/flashsre/contracts/CT-AIRCHEF-1111/check', { method: 'POST' })
    log(`[check] ${check.contract_id} v${check.contract_version}: ${check.summary.total} findings ${JSON.stringify(check.summary.by_kind)}`)
    for (const f of check.findings) {
      log(`  ${f.id} [${f.kind}] ${f.title}`)
      log(`      sửa: ${f.fix_owner} | team liên quan: ${f.teams_involved.join(', ')}`)
      for (const c of f.recent_changes.slice(0, 2)) log(`      thay đổi gần nhất: ${c.at} ${c.team ?? 'chưa gán team'} (${c.actor_email}) ${c.method} ${c.route}`)
    }
    return
  }
  log('[setup] dựng cấu hình đúng kế hoạch ...')
  let ids = await setup()
  if (cmd === 'setup') return log(`[setup] xong — flash sale hiệu lực tới ${new Date(JSON.parse(readFileSync(STATE_FILE, 'utf8')).flash_window.ends_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`)
  if (cmd === 'inject') {
    const s = SCENARIOS.find((x) => x.id === process.argv[3] && x.inject)
    if (!s) throw new Error(`Không có scenario inject "${process.argv[3]}". Chọn: ${SCENARIOS.filter((x) => x.inject).map((x) => x.id).join(', ')}`)
    if (TEAM_PASSWORD) await loginAs(TEAM_EMAILS[s.team], TEAM_PASSWORD)
    await s.inject(ids)
    return log(`[inject ${s.id} as ${TEAM_PASSWORD ? s.team : 'admin'}] ${s.mistake}\n  Lỗi đang hiệu lực. Khôi phục bằng: node incidents/repro-airchef-1111.mjs setup`)
  }
  const results = []
  for (const s of SCENARIOS) {
    log(`[${s.id}] ${s.title}`)
    let error = null
    let observed = null
    try {
      if (s.inject && TEAM_PASSWORD) await loginAs(TEAM_EMAILS[s.team], TEAM_PASSWORD)
      if (s.inject) await s.inject(ids)
      observed = await s.run(ids)
    } catch (e) {
      error = String(e.message || e)
      log(`  ! ${error}`)
    }
    results.push({ id: s.id, title: s.title, mistake: s.mistake, observed, error })
    if (observed) {
      for (const [k, v] of Object.entries(observed.steps ? { '': observed } : observed)) {
        if (k) log(`  [${k}]`)
        printCart(v)
      }
    }
    if (s.inject) ids = await setup()
  }
  mkdirSync(OUT_DIR, { recursive: true })
  const file = join(OUT_DIR, `airchef-1111-repro-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(file, JSON.stringify({ base: BASE, ran_at: new Date().toISOString(), plan: PLAN, results }, null, 2))
  log(`[done] ${file}`)
  process.stdout.write(JSON.stringify(results, null, 2) + '\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
