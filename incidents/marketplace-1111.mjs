#!/usr/bin/env node
/**
 * FlashSRE marketplace lab — "Shopee-lite" 11.11 trên Medusa v2 (Việt Nam / VND).
 *
 * Catalog sâu: ngành hàng (category cha/con), shop (collection), loại shop (tag Mall/Yêu thích/Thường),
 * chương trình Freeship Xtra (tag), phân khúc khách (customer group). Campaign gồm voucher shop, voucher sàn
 * theo ngành + loại shop, voucher khách mới, freeship tự động, flash sale.
 *
 * Usage:
 *   node incidents/marketplace-1111.mjs setup                 dựng/khôi phục catalog + campaign đúng kế hoạch
 *   node incidents/marketplace-1111.mjs contract              đẩy contract CT-1111-MARKETPLACE lên registry
 *   node incidents/marketplace-1111.mjs check                 chạy kiểm tra contract, in phát hiện
 *   node incidents/marketplace-1111.mjs list                  liệt kê mọi mẫu kịch bản
 *   node incidents/marketplace-1111.mjs inject <sample_id>    khôi phục rồi cài đúng một mẫu (giữ nguyên lỗi)
 *   node incidents/marketplace-1111.mjs dataset [--only fam1,fam2] [--limit N] [--no-witness]
 *
 * Env: BASE, EMAIL, PASSWORD (admin), FLASHSRE_TEAM_PASSWORD (tài khoản team; thiếu thì inject bằng admin)
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { fetchRetry } from './lib/fetch-retry.mjs'
import { STAGES } from './scenarios/stages.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE || 'https://flashsre-commerce-30123348ca77.herokuapp.com'
const EMAIL = process.env.EMAIL || 'admin@flashsre.dev'
const PASSWORD = process.env.PASSWORD
// Các lệnh offline (list, scenarios) và sub-agent kiểm định không cần đăng nhập
const IS_MAIN = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
const OFFLINE = ['list', 'scenarios'].includes(process.argv[2])
if (!PASSWORD && !OFFLINE && IS_MAIN) {
  console.error('Thiếu biến môi trường PASSWORD (mật khẩu admin)')
  process.exit(1)
}
const TEAM_PASSWORD = process.env.FLASHSRE_TEAM_PASSWORD
const TEAM_EMAILS = {
  merchandising: 'merch@flashsre.dev', seller_ops: 'sellerops@flashsre.dev', marketing: 'marketing@flashsre.dev',
  logistics: 'logistics@flashsre.dev', finance: 'finance@flashsre.dev', category: 'category@flashsre.dev',
}
const AIRCHEF_STATE = join(HERE, 'out', `state-${new URL(BASE).host.replace(/[^a-z0-9.-]/gi, '_')}.json`)
const log = (...a) => console.error(...a)
const iso = (ms) => new Date(Date.now() + ms).toISOString()

// ---------------------------------------------------------------- catalog (kế hoạch đã duyệt)
const CATEGORIES = [
  { key: 'gia-dung', handle: 'fs-mk-gia-dung', name: 'Gia dụng' },
  { key: 'noi-chien', handle: 'fs-mk-noi-chien', name: 'Nồi chiên', parent: 'gia-dung' },
  { key: 'may-hut-bui', handle: 'fs-mk-may-hut-bui', name: 'Máy hút bụi', parent: 'gia-dung' },
  { key: 'noi-com', handle: 'fs-mk-noi-com', name: 'Nồi cơm', parent: 'gia-dung' },
  { key: 'dien-tu', handle: 'fs-mk-dien-tu', name: 'Điện tử' },
  { key: 'tai-nghe', handle: 'fs-mk-tai-nghe', name: 'Tai nghe', parent: 'dien-tu' },
  { key: 'sac-du-phong', handle: 'fs-mk-sac-du-phong', name: 'Sạc dự phòng', parent: 'dien-tu' },
  { key: 'dong-ho', handle: 'fs-mk-dong-ho', name: 'Đồng hồ thông minh', parent: 'dien-tu' },
  { key: 'my-pham', handle: 'fs-mk-my-pham', name: 'Mỹ phẩm' },
  { key: 'cham-soc-da', handle: 'fs-mk-cham-soc-da', name: 'Chăm sóc da', parent: 'my-pham' },
  { key: 'trang-diem', handle: 'fs-mk-trang-diem', name: 'Trang điểm', parent: 'my-pham' },
  { key: 'me-be', handle: 'fs-mk-me-be', name: 'Mẹ & Bé' },
  { key: 'ta-bim', handle: 'fs-mk-ta-bim', name: 'Tã bỉm', parent: 'me-be' },
  { key: 'sua', handle: 'fs-mk-sua', name: 'Sữa', parent: 'me-be' },
]
const SHOP_TYPES = { mall: 'fs-shop-mall', preferred_plus: 'fs-shop-preferred-plus', preferred: 'fs-shop-preferred', normal: 'fs-shop-normal' }
const FREESHIP_TAG = 'fs-freeship-xtra'
const SHOPS = [
  { key: 'airchef', handle: 'fs-shop-airchef', title: 'AirChef Official', type: 'mall', freeship: true },
  { key: 'homelux', handle: 'fs-shop-homelux', title: 'HomeLux Store', type: 'preferred', freeship: true },
  { key: 'techzone', handle: 'fs-shop-techzone', title: 'TechZone Official', type: 'mall', freeship: true },
  { key: 'pinpro', handle: 'fs-shop-pinpro', title: 'PinPro', type: 'normal', freeship: false },
  { key: 'glow', handle: 'fs-shop-glow', title: 'Glow Beauty Mall', type: 'mall', freeship: true },
  { key: 'sonxinh', handle: 'fs-shop-sonxinh', title: 'Son Xinh', type: 'normal', freeship: false },
  { key: 'sunhouse', handle: 'fs-shop-sunhouse', title: 'Sunhouse Official', type: 'mall', freeship: true },
  { key: 'watchx', handle: 'fs-shop-watchx', title: 'WatchX Store', type: 'preferred_plus', freeship: true },
  { key: 'babycare', handle: 'fs-shop-babycare', title: 'BabyCare Mall', type: 'mall', freeship: true },
  { key: 'momshop', handle: 'fs-shop-momshop', title: 'MomShop', type: 'preferred', freeship: false },
]
const PRODUCTS = [
  { handle: 'fs-mk-airchef-6l', title: 'Nồi chiên AirChef 6L', shop: 'airchef', cat: 'noi-chien', price: 2490000, variants: [['FS-MK-AIRCHEF6-DEN', 'Đen'], ['FS-MK-AIRCHEF6-TRANG', 'Trắng']] },
  { handle: 'fs-mk-airchef-mini', title: 'Nồi chiên AirChef Mini 3L', shop: 'airchef', cat: 'noi-chien', price: 1290000, variants: [['FS-MK-AIRCHEF-MINI', 'Mặc định']] },
  { handle: 'fs-mk-homelux-v8', title: 'Máy hút bụi HomeLux V8', shop: 'homelux', cat: 'may-hut-bui', price: 3200000, variants: [['FS-MK-HOMELUX-V8', 'Mặc định']] },
  { handle: 'fs-mk-techzone-buds', title: 'Tai nghe TechZone Buds', shop: 'techzone', cat: 'tai-nghe', price: 990000, variants: [['FS-MK-TZ-BUDS', 'Mặc định']] },
  { handle: 'fs-mk-pinpro-20k', title: 'Sạc PinPro 20.000mAh', shop: 'pinpro', cat: 'sac-du-phong', price: 450000, variants: [['FS-MK-PINPRO-20K', 'Mặc định']] },
  { handle: 'fs-mk-glow-serum', title: 'Serum Glow C', shop: 'glow', cat: 'cham-soc-da', price: 380000, variants: [['FS-MK-GLOW-SERUM', 'Mặc định']] },
  { handle: 'fs-mk-sonxinh-velvet', title: 'Son Xinh Velvet', shop: 'sonxinh', cat: 'trang-diem', price: 159000, variants: [['FS-MK-SONXINH', 'Mặc định']] },
  { handle: 'fs-mk-sunhouse-noicom', title: 'Nồi cơm điện Sunhouse 1.8L', shop: 'sunhouse', cat: 'noi-com', price: 890000, variants: [['FS-MK-SUNHOUSE-NC', 'Mặc định']] },
  { handle: 'fs-mk-watchx-s3', title: 'Đồng hồ WatchX S3', shop: 'watchx', cat: 'dong-ho', price: 2190000, variants: [['FS-MK-WATCHX-S3', 'Mặc định']] },
  { handle: 'fs-mk-babycare-xl', title: 'Tã BabyCare XL 60 miếng', shop: 'babycare', cat: 'ta-bim', price: 420000, variants: [['FS-MK-BABYCARE-XL', 'Mặc định']] },
  { handle: 'fs-mk-momshop-gold', title: 'Sữa MomShop Gold 900g', shop: 'momshop', cat: 'sua', price: 620000, variants: [['FS-MK-MOMSHOP-GOLD', 'Mặc định']] },
]
const FLASH = { title: 'FS1111-MK Flash 20-22h', prices: { 'FS-MK-AIRCHEF6-DEN': 1790000, 'FS-MK-AIRCHEF6-TRANG': 1790000, 'FS-MK-HOMELUX-V8': 2690000, 'FS-MK-WATCHX-S3': 1890000 } }
const NEW_SEGMENT_GROUP = 'FS-MK Khách mới'
const PROMOS = [
  { code: 'FS-MK-AIRCHEF100K', owner: 'seller_ops', sponsor: 'shop', campaign: 'fs-mk-shop', type: 'fixed', value: 100000, min_spend: 1500000, scope: { shops: ['airchef'] }, segments: 'ALL' },
  { code: 'FS-MK-GLOW30K', owner: 'seller_ops', sponsor: 'shop', campaign: 'fs-mk-shop', type: 'fixed', value: 30000, min_spend: 300000, scope: { shops: ['glow'] }, segments: 'ALL' },
  { code: 'FS-MK-BABY40K', owner: 'seller_ops', sponsor: 'shop', campaign: 'fs-mk-shop', type: 'fixed', value: 40000, min_spend: 400000, scope: { shops: ['babycare'] }, segments: 'ALL' },
  { code: 'FS-MK-SAN10', owner: 'marketing', sponsor: 'platform', campaign: 'fs-mk-san', type: 'percentage', value: 10, cap: 150000, min_spend: 500000, scope: { shop_types: ['mall', 'preferred_plus', 'preferred'], categories: ['gia-dung', 'dien-tu', 'me-be'] }, segments: 'ALL' },
  { code: 'FS-MK-NEWBIE50K', owner: 'marketing', sponsor: 'platform', campaign: 'fs-mk-san', type: 'fixed', value: 50000, min_spend: 200000, segments: ['NEW'] },
]
// Hai campaign khác do team khác sở hữu, chạy cùng lúc và chồng lên catalog của 11.11
const BRANDDAY = { code: 'FS-MK-BD-AIRCHEF20', owner: 'seller_ops', sponsor: 'shop', campaign: 'fs-mk-brandday', type: 'percentage', value: 20, scope: { shops: ['airchef'] }, segments: 'ALL', automatic: true }
const GDWEEK = { code: 'FS-MK-GDW8', owner: 'category', sponsor: 'category', campaign: 'fs-mk-gdweek', type: 'percentage', value: 8, scope: { categories: ['gia-dung'], shop_types: ['preferred', 'normal'] }, segments: 'ALL', automatic: true }
const FREESHIP = { code: 'FS-MK-FREESHIP', owner: 'marketing', campaign: 'fs-mk-freeship', support: 40000, threshold: 300000, providers_included: ['fs-ghn', 'fs-ghtk', 'fs-vtp'], providers_excluded: ['fs-ahamove', 'fs-jt'] }
const BASE_PROVIDERS = [
  { code: 'fs-vtp', label: 'Viettel Post', name: 'FS-MK-SHIP Viettel Post', amount: 32000 },
  { code: 'fs-jt', label: 'J&T', name: 'FS-MK-SHIP J&T Express', amount: 30000 },
]
const BUDGETS = [
  { campaign_identifier: 'fs-mk-shop', owner: 'finance', limit: 50000000, min_limit: 50000000 },
  { campaign_identifier: 'fs-mk-san', owner: 'finance', limit: 100000000, min_limit: 100000000 },
  { campaign_identifier: 'fs-mk-freeship', owner: 'finance', limit: 30000000, min_limit: 30000000 },
  { campaign_identifier: 'fs-mk-brandday', owner: 'finance', limit: 40000000, min_limit: 40000000 },
  { campaign_identifier: 'fs-mk-gdweek', owner: 'finance', limit: 20000000, min_limit: 20000000 },
]
const MIXED_CARTS = [
  ['FS-MK-AIRCHEF6-DEN', 'FS-MK-GLOW-SERUM'],
  ['FS-MK-TZ-BUDS', 'FS-MK-PINPRO-20K'],
  ['FS-MK-SONXINH', 'FS-MK-PINPRO-20K'],
  ['FS-MK-HOMELUX-V8', 'FS-MK-AIRCHEF-MINI'],
  ['FS-MK-AIRCHEF-MINI', 'FS-MK-SUNHOUSE-NC'],
  ['FS-MK-BABYCARE-XL', 'FS-MK-MOMSHOP-GOLD'],
]
const CONTRACT_IDS = ['CT-1111-MARKETPLACE', 'CT-BRANDDAY-AIRCHEF', 'CT-GIADUNG-WEEK']
// Lỗi nghiệp vụ: do team cấu hình (qua Admin API, có audit) hoặc contract đã duyệt. Không gồm đối chứng không lỗi (NO_OP)
// và thay đổi ngoài luồng (OUT_OF_BAND: DB/script, không có ai cấu hình)
const BUSINESS_KINDS = ['CONFIG_DRIFT', 'CROSS_TEAM_CONFLICT', 'MISSING_CONFIG', 'CONTRACT_CONFLICT']
const EXTRA_PREFIX = 'FS-MK-X-' // promotion/shipping option/price list do kịch bản tạo thêm; setup xóa đi
const SHOP_PROMO_TITLE = `${EXTRA_PREFIX}Khuyến mãi shop AirChef`

function taxonomy() {
  return {
    categories: Object.fromEntries(CATEGORIES.map((c) => [c.key, { handle: c.handle, owner: 'merchandising' }])),
    shops: Object.fromEntries(SHOPS.map((s) => [s.key, { handle: s.handle, type: s.type, owner: 'seller_ops' }])),
    shop_types: SHOP_TYPES,
    programs: { freeship_xtra: { tag: FREESHIP_TAG, shops: SHOPS.filter((s) => s.freeship).map((s) => s.key) } },
    segments: { NEW: NEW_SEGMENT_GROUP },
    assortment: Object.fromEntries(PRODUCTS.flatMap((p) => p.variants.map(([sku]) => [sku, p.cat]))),
  }
}
const TEAMS = {
  merchandising: 'Giá, SKU, biến thể, gán ngành hàng',
  seller_ops: 'Voucher shop, Brand Day, hồ sơ shop (loại shop, chương trình tham gia)',
  marketing: 'Voucher sàn, phân khúc, chương trình freeship',
  logistics: 'Provider, phí ship, vùng giao',
  finance: 'Ngân sách sponsor, trần trợ giá mỗi đơn',
  category: 'Ưu đãi riêng của ngành hàng (Tuần lễ Gia dụng)',
}
const strip = ({ campaign, ...p }) => p
const budgetsOf = (ids) => BUDGETS.filter((b) => ids.includes(b.campaign_identifier)).map(({ limit, ...b }) => b)

// Ba contract do ba team duyệt độc lập; mỗi contract tự khai báo mã nào của campaign khác được cộng dồn
function buildContracts(overrides = {}) {
  const common = { schema: 'marketplace/v1', market: { currency: 'vnd', country: 'vn' }, teams: TEAMS, taxonomy: taxonomy() }
  const mega = {
    ...common,
    contract_id: 'CT-1111-MARKETPLACE', owner: 'marketing',
    title: '11.11 sàn: flash sale + voucher shop + voucher sàn theo ngành/loại shop + khách mới + Freeship Xtra',
    flash: [{ price_list_title: FLASH.title, owner: 'merchandising', prices: FLASH.prices }],
    promotions: PROMOS.map(strip),
    freeship: { ...strip(FREESHIP), threshold_base: 'item_subtotal', program: 'freeship_xtra' },
    stacking: { allowed_codes: [...PROMOS.map((p) => p.code), FREESHIP.code, BRANDDAY.code, GDWEEK.code], max_item_discount_per_order: 300000 },
    budgets: budgetsOf(['fs-mk-shop', 'fs-mk-san', 'fs-mk-freeship']),
    carts: { mixed: MIXED_CARTS },
  }
  const brandday = {
    ...common,
    contract_id: 'CT-BRANDDAY-AIRCHEF', owner: 'seller_ops',
    title: 'Brand Day AirChef: -20% toàn shop AirChef, được cộng voucher shop, voucher sàn, khách mới, freeship',
    flash: [],
    promotions: [strip(BRANDDAY)],
    stacking: { allowed_codes: [BRANDDAY.code, 'FS-MK-AIRCHEF100K', 'FS-MK-SAN10', 'FS-MK-NEWBIE50K', FREESHIP.code], max_item_discount_per_order: 700000 },
    budgets: budgetsOf(['fs-mk-brandday']),
    carts: { mixed: [['FS-MK-AIRCHEF6-DEN', 'FS-MK-SUNHOUSE-NC']] },
  }
  const gdweek = {
    ...common,
    contract_id: 'CT-GIADUNG-WEEK', owner: 'category',
    title: 'Tuần lễ Gia dụng: -8% ngành Gia dụng cho shop Yêu thích và Thường (Mall đã có Brand Day riêng)',
    flash: [],
    promotions: [strip(GDWEEK)],
    stacking: {
      allowed_codes: [GDWEEK.code, 'FS-MK-SAN10', 'FS-MK-NEWBIE50K', 'FS-MK-AIRCHEF100K', 'FS-MK-GLOW30K', 'FS-MK-BABY40K', FREESHIP.code],
      max_item_discount_per_order: 400000,
    },
    budgets: budgetsOf(['fs-mk-gdweek']),
    carts: { mixed: [['FS-MK-HOMELUX-V8', 'FS-MK-SUNHOUSE-NC']] },
  }
  const all = { 'CT-1111-MARKETPLACE': mega, 'CT-BRANDDAY-AIRCHEF': brandday, 'CT-GIADUNG-WEEK': gdweek }
  for (const [id, fn] of Object.entries(overrides)) all[id] = fn(all[id])
  return all
}

// ---------------------------------------------------------------- admin/store client
let token
async function api(path, { method = 'GET', body, pk } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token && !pk) headers.Authorization = `Bearer ${token}`
  if (pk) headers['x-publishable-api-key'] = pk
  const r = await fetchRetry(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let json = null
  try { json = await r.json() } catch {}
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(json).slice(0, 300)}`)
  return json
}
async function loginAs(email, password) {
  token = (await api('/auth/user/emailpass', { method: 'POST', body: { email, password } })).token
}
const asAdmin = () => loginAs(EMAIL, PASSWORD)
const asTeam = (team) => (TEAM_PASSWORD && team ? loginAs(TEAM_EMAILS[team], TEAM_PASSWORD) : asAdmin())

// Thay đổi "ngoài luồng": sửa thẳng DB, không qua Admin API nên không có audit. Heroku: heroku pg:psql; local: psql $DATABASE_URL
function sql(statement) {
  const cmd = process.env.FLASHSRE_DB_CMD
    ? process.env.FLASHSRE_DB_CMD.split(' ')
    : /herokuapp\.com$/.test(new URL(BASE).host) ? ['heroku', 'pg:psql', '-a', process.env.FLASHSRE_HEROKU_APP || 'flashsre-commerce', '-c'] : ['psql', process.env.DATABASE_URL, '-c']
  return execFileSync(cmd[0], [...cmd.slice(1), statement], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`

// ---------------------------------------------------------------- setup / restore
async function findOrCreate(listPath, listKey, match, createPath, createKey, body) {
  const found = (await api(listPath))[listKey].find(match)
  return found ?? (await api(createPath, { method: 'POST', body }))[createKey]
}

async function setup() {
  if (!existsSync(AIRCHEF_STATE)) {
    log('[setup] chưa có region/shipping Việt Nam, chạy repro-airchef-1111 setup trước ...')
    execFileSync(process.execPath, [join(HERE, 'repro-airchef-1111.mjs'), 'setup'], { stdio: 'inherit', env: process.env })
  }
  const base = JSON.parse(readFileSync(AIRCHEF_STATE, 'utf8'))
  await asAdmin()
  const ids = { region: base.region, pk: base.pk, sales_channel: base.sales_channel, shipping_profile: base.shipping_profile, service_zone: base.service_zone, types: base.types, options: base.options }

  // Ngành hàng cha/con
  ids.categories = {}
  const cats = (await api('/admin/product-categories?limit=500&fields=id,handle,name,parent_category_id')).product_categories
  for (const c of CATEGORIES) {
    const parent = c.parent ? ids.categories[c.parent] : null
    let cat = cats.find((x) => x.handle === c.handle)
    if (!cat) {
      cat = (await api('/admin/product-categories', { method: 'POST', body: { name: c.name, handle: c.handle, is_active: true, parent_category_id: parent } })).product_category
    } else if ((cat.parent_category_id ?? null) !== parent || cat.name !== c.name) {
      await api(`/admin/product-categories/${cat.id}`, { method: 'POST', body: { parent_category_id: parent, name: c.name } })
    }
    ids.categories[c.key] = cat.id
  }
  // Tag loại shop + chương trình
  ids.tags = {}
  const tagList = (await api('/admin/product-tags?limit=500')).product_tags
  for (const value of [...Object.values(SHOP_TYPES), FREESHIP_TAG]) {
    ids.tags[value] = tagList.find((t) => t.value === value)?.id ?? (await api('/admin/product-tags', { method: 'POST', body: { value } })).product_tag.id
  }
  // Shop = collection
  ids.shops = {}
  const cols = (await api('/admin/collections?limit=500')).collections
  for (const s of SHOPS) {
    const col = cols.find((c) => c.handle === s.handle)
    if (col && col.title !== s.title) await api(`/admin/collections/${col.id}`, { method: 'POST', body: { title: s.title } })
    ids.shops[s.key] = col?.id ?? (await api('/admin/collections', { method: 'POST', body: { title: s.title, handle: s.handle } })).collection.id
  }
  // Sản phẩm: luôn đặt lại shop, ngành (con + cha), tag, giá niêm yết, tiêu đề
  ids.products = {}
  ids.variants = {}
  for (const p of PRODUCTS) {
    const shop = SHOPS.find((s) => s.key === p.shop)
    const leaf = CATEGORIES.find((c) => c.key === p.cat)
    const desired = {
      title: p.title,
      collection_id: ids.shops[p.shop],
      categories: [{ id: ids.categories[p.cat] }, { id: ids.categories[leaf.parent] }],
      tags: [{ id: ids.tags[SHOP_TYPES[shop.type]] }, ...(shop.freeship ? [{ id: ids.tags[FREESHIP_TAG] }] : [])],
    }
    let prod = (await api(`/admin/products?handle=${p.handle}&fields=id,variants.id,variants.sku,variants.prices.id,variants.prices.currency_code,variants.prices.amount`)).products[0]
    if (!prod) {
      prod = (await api('/admin/products', {
        method: 'POST',
        body: {
          ...desired, handle: p.handle, status: 'published', discountable: true,
          shipping_profile_id: ids.shipping_profile, sales_channels: [{ id: ids.sales_channel }],
          options: [{ title: 'Phân loại', values: p.variants.map((v) => v[1]) }],
          variants: p.variants.map(([sku, title]) => ({
            title, sku, manage_inventory: false, options: { 'Phân loại': title }, prices: [{ currency_code: 'vnd', amount: p.price }],
          })),
        },
      })).product
    } else {
      await api(`/admin/products/${prod.id}`, { method: 'POST', body: desired })
      for (const v of prod.variants) {
        const vnd = (v.prices ?? []).find((x) => x.currency_code === 'vnd')
        if (!vnd || Number(vnd.amount) !== p.price) {
          await api(`/admin/products/${prod.id}/variants/${v.id}`, { method: 'POST', body: { prices: [{ currency_code: 'vnd', amount: p.price }] } })
        }
      }
    }
    ids.products[p.handle] = prod.id
    for (const v of prod.variants) ids.variants[v.sku] = v.id
  }
  // Phân khúc khách mới
  const groups = (await api('/admin/customer-groups?limit=200')).customer_groups
  ids.new_group = groups.find((g) => g.name === NEW_SEGMENT_GROUP)?.id ?? (await api('/admin/customer-groups', { method: 'POST', body: { name: NEW_SEGMENT_GROUP } })).customer_group.id

  // Flash sale price list: cửa sổ 2 giờ quanh thời điểm chạy
  const lists = (await api('/admin/price-lists?limit=200&fields=id,title,prices.id')).price_lists
  let pl = lists.find((l) => l.title === FLASH.title)
  const flashBody = { status: 'active', starts_at: iso(-10 * 60e3), ends_at: iso(110 * 60e3) }
  if (!pl) {
    pl = (await api('/admin/price-lists', { method: 'POST', body: { title: FLASH.title, description: 'Flash 11.11 20-22h', type: 'sale', ...flashBody, prices: [] } })).price_list
  } else {
    await api(`/admin/price-lists/${pl.id}`, { method: 'POST', body: flashBody })
  }
  ids.price_list = pl.id
  await setFlashPrices(ids, FLASH.prices)
  // Price list do kịch bản tạo thêm (vd khuyến mãi riêng của shop)
  for (const l of lists.filter((x) => x.title.startsWith(EXTRA_PREFIX))) {
    await api(`/admin/price-lists/${l.id}`, { method: 'DELETE' })
  }

  // Campaign + ngân sách theo sponsor
  ids.campaigns = {}
  const camps = (await api('/admin/campaigns?limit=200&fields=id,campaign_identifier')).campaigns
  for (const b of BUDGETS) {
    let c = camps.find((x) => x.campaign_identifier === b.campaign_identifier)
    if (!c) {
      c = (await api('/admin/campaigns', {
        method: 'POST',
        body: { name: b.campaign_identifier, campaign_identifier: b.campaign_identifier, starts_at: iso(-86400e3), ends_at: iso(30 * 86400e3), budget: { type: 'spend', currency_code: 'vnd', limit: b.limit } },
      })).campaign
    } else {
      await api(`/admin/campaigns/${c.id}`, { method: 'POST', body: { ends_at: iso(30 * 86400e3), budget: { limit: b.limit } } })
    }
    ids.campaigns[b.campaign_identifier] = c.id
  }

  // Provider cơ sở của marketplace (ngoài GHN/GHTK/AhaMove của lab AirChef)
  const types = (await api('/admin/shipping-option-types?limit=200')).shipping_option_types
  const existingOpts = (await api('/admin/shipping-options?limit=200&fields=id,name,prices.id,prices.currency_code,prices.amount')).shipping_options
  for (const bp of BASE_PROVIDERS) {
    ids.types[bp.code] = types.find((t) => t.code === bp.code)?.id ?? (await api('/admin/shipping-option-types', { method: 'POST', body: { label: bp.label, code: bp.code, description: `Provider ${bp.label} (mô phỏng)` } })).shipping_option_type.id
    const o = existingOpts.find((x) => x.name === bp.name)
    if (!o) {
      ids.options[bp.code] = (await addShippingOption(ids, bp.code, bp.label, bp.name, bp.amount)).shipping_option.id
    } else {
      ids.options[bp.code] = o.id
      const pr = o.prices.find((x) => x.currency_code === 'vnd')
      if (pr && Number(pr.amount) !== bp.amount) {
        await api(`/admin/shipping-options/${o.id}`, { method: 'POST', body: { prices: [{ id: pr.id, currency_code: 'vnd', amount: bp.amount }] } })
      }
    }
  }

  // Promotion: xóa bản cũ (kể cả bản do kịch bản tạo thêm) rồi tạo lại đúng kế hoạch
  const promos = (await api('/admin/promotions?limit=500&fields=id,code')).promotions
  for (const p of promos.filter((x) => x.code?.startsWith('FS-MK-'))) {
    await api(`/admin/promotions/${p.id}`, { method: 'DELETE' })
  }
  ids.promos = {}
  for (const p of [...PROMOS, BRANDDAY, GDWEEK]) {
    ids.promos[p.code] = (await api('/admin/promotions', { method: 'POST', body: promotionBody(ids, p) })).promotion.id
  }
  ids.promos[FREESHIP.code] = (await api('/admin/promotions', { method: 'POST', body: freeshipBody(ids) })).promotion.id

  // Shipping option do kịch bản thêm vào
  const opts = (await api('/admin/shipping-options?limit=200&fields=id,name,prices.id,prices.currency_code,prices.amount')).shipping_options
  for (const o of opts.filter((x) => x.name.startsWith(EXTRA_PREFIX))) {
    await api(`/admin/shipping-options/${o.id}`, { method: 'DELETE' })
  }
  const aha = opts.find((o) => o.id === ids.options['fs-ahamove'])
  const ahaPrice = aha?.prices?.find((p) => p.currency_code === 'vnd')
  if (ahaPrice && Number(ahaPrice.amount) !== 60000) {
    await api(`/admin/shipping-options/${aha.id}`, { method: 'POST', body: { prices: [{ id: ahaPrice.id, currency_code: 'vnd', amount: 60000 }] } })
  }
  mkdirSync(join(HERE, 'out'), { recursive: true })
  writeFileSync(join(HERE, 'out', `marketplace-state-${new URL(BASE).host.replace(/[^a-z0-9.-]/gi, '_')}.json`), JSON.stringify(ids, null, 2))
  return ids
}

async function setFlashPrices(ids, prices) {
  const current = (await api(`/admin/price-lists/${ids.price_list}?fields=prices.id`)).price_list.prices
  await api(`/admin/price-lists/${ids.price_list}/prices/batch`, {
    method: 'POST',
    body: {
      delete: current.map((p) => p.id),
      create: Object.entries(prices).map(([sku, amount]) => ({ variant_id: ids.variants[sku], currency_code: 'vnd', amount })),
    },
  })
}

function scopeRules(ids, scope = {}) {
  const rules = []
  if (scope.shops) rules.push({ attribute: 'items.product.collection_id', operator: 'in', values: scope.shops.map((k) => ids.shops[k]) })
  if (scope.shop_types) rules.push({ attribute: 'items.product.tags.id', operator: 'in', values: scope.shop_types.map((k) => ids.tags[SHOP_TYPES[k]]) })
  if (scope.categories) rules.push({ attribute: 'items.product.categories.id', operator: 'in', values: scope.categories.map((k) => ids.categories[k]) })
  return rules
}

function promotionBody(ids, p) {
  return {
    code: p.code, type: 'standard', status: 'active', is_automatic: !!p.automatic, campaign_id: ids.campaigns[p.campaign],
    application_method: {
      type: p.type, value: p.value, target_type: 'items', allocation: 'across',
      ...(p.type === 'fixed' ? { currency_code: 'vnd' } : {}),
      target_rules: scopeRules(ids, p.scope),
    },
    rules: [
      { attribute: 'currency_code', operator: 'eq', values: ['vnd'] },
      ...(p.min_spend ? [{ attribute: 'item_subtotal', operator: 'gte', values: [String(p.min_spend)] }] : []),
      ...(p.segments === 'ALL' ? [] : [{ attribute: 'customer.groups.id', operator: 'in', values: [ids.new_group] }]),
    ],
  }
}

function freeshipBody(ids) {
  return {
    code: FREESHIP.code, type: 'standard', status: 'active', is_automatic: true, campaign_id: ids.campaigns[FREESHIP.campaign],
    application_method: {
      type: 'fixed', value: FREESHIP.support, currency_code: 'vnd', target_type: 'shipping_methods', allocation: 'each', max_quantity: 1,
      target_rules: [{ attribute: 'shipping_methods.shipping_option.shipping_option_type_id', operator: 'in', values: FREESHIP.providers_included.map((c) => ids.types[c]) }],
    },
    rules: [
      { attribute: 'currency_code', operator: 'eq', values: ['vnd'] },
      { attribute: 'item_subtotal', operator: 'gte', values: [String(FREESHIP.threshold)] },
      { attribute: 'items.product.tags.id', operator: 'in', values: [ids.tags[FREESHIP_TAG]] },
    ],
  }
}

// ---------------------------------------------------------------- thao tác nghiệp vụ dùng trong kịch bản
async function promo(ids, code) {
  return (await api(`/admin/promotions/${ids.promos[code]}?fields=id,status,rules.id,rules.attribute,rules.values.value,application_method.id,application_method.target_rules.id,application_method.target_rules.attribute,application_method.target_rules.values.value`)).promotion
}
async function setTargetRule(ids, code, attribute, values) {
  const p = await promo(ids, code)
  const r = p.application_method.target_rules.find((x) => x.attribute === attribute)
  const body = values === null
    ? { delete: r ? [r.id] : [] }
    : r ? { update: [{ id: r.id, attribute, operator: 'in', values }] } : { create: [{ attribute, operator: 'in', values }] }
  return api(`/admin/promotions/${p.id}/target-rules/batch`, { method: 'POST', body })
}
async function setRule(ids, code, attribute, values, operator = 'in', newAttribute = attribute) {
  const p = await promo(ids, code)
  const r = p.rules.find((x) => x.attribute === attribute)
  const body = values === null
    ? { delete: r ? [r.id] : [] }
    : r ? { update: [{ id: r.id, attribute: newAttribute, operator, values }] } : { create: [{ attribute: newAttribute, operator, values }] }
  return api(`/admin/promotions/${p.id}/rules/batch`, { method: 'POST', body })
}
async function setPromoValue(ids, code, value) {
  return api(`/admin/promotions/${ids.promos[code]}`, { method: 'POST', body: { application_method: { value } } })
}
async function productTags(ids, handle, mutate) {
  const p = (await api(`/admin/products/${ids.products[handle]}?fields=id,tags.id`)).product
  const next = mutate(p.tags.map((t) => t.id))
  return api(`/admin/products/${p.id}`, { method: 'POST', body: { tags: next.map((id) => ({ id })) } })
}
async function productCategories(ids, handle, categoryKeys) {
  return api(`/admin/products/${ids.products[handle]}`, { method: 'POST', body: { categories: categoryKeys.map((k) => ({ id: ids.categories[k] })) } })
}
async function addShippingOption(ids, code, label, name, amount) {
  const types = (await api('/admin/shipping-option-types?limit=200')).shipping_option_types
  const typeId = types.find((t) => t.code === code)?.id ?? (await api('/admin/shipping-option-types', { method: 'POST', body: { label, code, description: `Provider ${label} (mô phỏng)` } })).shipping_option_type.id
  return api('/admin/shipping-options', {
    method: 'POST',
    body: {
      name, service_zone_id: ids.service_zone, shipping_profile_id: ids.shipping_profile, provider_id: 'manual_manual',
      price_type: 'flat', type_id: typeId, prices: [{ currency_code: 'vnd', amount }],
      rules: [{ attribute: 'enabled_in_store', value: 'true', operator: 'eq' }, { attribute: 'is_return', value: 'false', operator: 'eq' }],
    },
  })
}
const shopProducts = (shop) => PRODUCTS.filter((p) => p.shop === shop).map((p) => p.handle)

// ---------------------------------------------------------------- thư viện kịch bản (họ lỗi x tham số)
// truth: nhãn đáp án chỉ evaluator đọc. expect: invariant phải xuất hiện mới (so với baseline); [] = không được có phát hiện mới
const FAMILIES = [
  {
    family: 'FLASH_PRICE_TYPO', team: 'merchandising', kind: 'CONFIG_DRIFT',
    params: Object.keys(FLASH.prices).flatMap((sku) => [{ sku, factor: 0.1 }, { sku, factor: 10 }]),
    title: (p) => `Nhập giá flash ${p.sku} ${p.factor < 1 ? 'thiếu' : 'thừa'} một số 0`,
    story: (p) => `Merchandising nhập giá flash cho ${p.sku} từ file Excel, ô giá bị ${p.factor < 1 ? 'mất' : 'thêm'} một số 0.`,
    inject: (ids, p) => setFlashPrices(ids, { ...FLASH.prices, [p.sku]: Math.round(FLASH.prices[p.sku] * p.factor) }),
    expect: ['FLASH_PRICE_MATCHES_CONTRACT'], root: (p) => ({ entity: 'price_list', label: FLASH.title, field: `prices[${p.sku}].amount` }),
  },
  {
    family: 'FLASH_VARIANT_MISSING', team: 'merchandising', kind: 'CONFIG_DRIFT',
    params: Object.keys(FLASH.prices).map((sku) => ({ sku })),
    title: (p) => `Flash sale bỏ sót ${p.sku}`,
    story: (p) => `Merchandising chọn sản phẩm cho flash sale nhưng quên dòng ${p.sku}.`,
    inject: (ids, p) => setFlashPrices(ids, Object.fromEntries(Object.entries(FLASH.prices).filter(([s]) => s !== p.sku))),
    expect: ['FLASH_PRICE_COVERS_ALL_VARIANTS'], root: (p) => ({ entity: 'price_list', label: FLASH.title, field: `prices[${p.sku}]` }),
  },
  {
    // Merchandising lệch giá khỏi contract của chính điều khoản giá; mất voucher shop của Seller Ops là hệ quả chéo
    family: 'FLASH_DEEPER_CROSSES_THRESHOLD', team: 'merchandising', kind: 'CONFIG_DRIFT', alsoKind: 'CROSS_TEAM_CONFLICT',
    params: [{ price: 1490000 }, { price: 1450000 }, { price: 1390000 }],
    title: (p) => `Hạ giá flash AirChef 6L xuống ${p.price.toLocaleString('vi-VN')}đ, thấp hơn ngưỡng voucher shop 1.500.000đ`,
    story: () => 'Merchandising thương lượng với shop AirChef (shop đồng tài trợ) để giảm sâu hơn cạnh tranh với sàn đối thủ; ngưỡng voucher AirChef100K của Seller Ops giữ nguyên 1.500.000đ.',
    inject: (ids, p) => setFlashPrices(ids, { ...FLASH.prices, 'FS-MK-AIRCHEF6-DEN': p.price, 'FS-MK-AIRCHEF6-TRANG': p.price }),
    expect: ['FLASH_PRICE_MATCHES_CONTRACT', 'ENTITLEMENT_LOSS'], root: () => ({ entity: 'price_list', label: FLASH.title, field: 'prices[FS-MK-AIRCHEF6-*].amount' }),
  },
  {
    // Hai quyết định đều có duyệt: Seller Ops chạy khuyến mãi riêng của shop, Merchandising chốt giá flash sâu hơn (sửa contract).
    // Giá flash rơi dưới ngưỡng voucher shop 1.500.000đ mà giảm thêm chưa tới 100k: trong giờ flash khách trả nhiều hơn hôm qua.
    // Hai mẫu cuối là đối chứng: flash vẫn trên ngưỡng, hoặc giảm đủ sâu để bù voucher, không được báo gì
    family: 'FLASH_DEARER_THAN_SHOP_PROMO', team: 'merchandising', contract: true,
    kind: (p) => (p.dearer ? 'CROSS_TEAM_CONFLICT' : 'NO_OP'),
    params: [
      { shop: 1550000, flash: 1490000, dearer: true }, { shop: 1520000, flash: 1480000, dearer: true },
      { shop: 1590000, flash: 1520000, dearer: false }, { shop: 1590000, flash: 1450000, dearer: false },
    ],
    title: (p) => `Flash Sale AirChef 6L ${p.flash.toLocaleString('vi-VN')}đ trong khi shop đang tự giảm còn ${p.shop.toLocaleString('vi-VN')}đ`,
    story: (p) => `Seller Ops chạy "Khuyến mãi của shop" AirChef 6L ${p.shop.toLocaleString('vi-VN')}đ cả tháng, voucher shop AirChef100K cho đơn từ 1.500.000đ. ` +
      `Merchandising chốt suất Flash Sale ${p.flash.toLocaleString('vi-VN')}đ với shop và sửa contract theo giá mới.`,
    inject: async (ids, p) => {
      await asTeam('seller_ops')
      await api('/admin/price-lists', {
        method: 'POST',
        body: {
          title: SHOP_PROMO_TITLE, description: 'Khuyến mãi của shop AirChef, cả tháng', type: 'sale', status: 'active',
          prices: ['FS-MK-AIRCHEF6-DEN', 'FS-MK-AIRCHEF6-TRANG'].map((sku) => ({ variant_id: ids.variants[sku], currency_code: 'vnd', amount: p.shop })),
        },
      })
      await asTeam('merchandising')
      const prices = { ...FLASH.prices, 'FS-MK-AIRCHEF6-DEN': p.flash, 'FS-MK-AIRCHEF6-TRANG': p.flash }
      await postContracts({ 'CT-1111-MARKETPLACE': (c) => ({ ...c, flash: c.flash.map((fl) => ({ ...fl, prices })) }) })
      return setFlashPrices(ids, prices)
    },
    expect: (p) => (p.dearer ? ['FLASH_NOT_DEARER_THAN_OFF_FLASH'] : []),
    root: () => ({ entity: 'price_list', label: `${FLASH.title},${SHOP_PROMO_TITLE}`, field: 'prices[FS-MK-AIRCHEF6-*].amount' }),
    escalate: (p) => p.dearer,
  },
  {
    family: 'SHOP_VOUCHER_WRONG_SHOP', team: 'seller_ops', kind: 'CONFIG_DRIFT',
    params: [{ code: 'FS-MK-AIRCHEF100K', to: 'homelux' }, { code: 'FS-MK-AIRCHEF100K', to: 'sunhouse' }, { code: 'FS-MK-AIRCHEF100K', to: 'pinpro' }, { code: 'FS-MK-GLOW30K', to: 'sonxinh' }, { code: 'FS-MK-BABY40K', to: 'momshop' }],
    title: (p) => `${p.code} gắn nhầm sang shop ${p.to}`,
    story: (p) => `Seller Ops sao chép voucher từ shop khác, quên đổi shop áp dụng: ${p.code} giờ chỉ áp cho ${p.to}.`,
    inject: (ids, p) => setTargetRule(ids, p.code, 'items.product.collection_id', [ids.shops[p.to]]),
    expect: ['PROMOTION_SCOPE_RULES'], root: (p) => ({ entity: 'promotion', label: p.code, field: 'application_method.target_rules[items.product.collection_id]' }),
  },
  {
    family: 'PLATFORM_CATEGORY_SCOPE', team: 'marketing', kind: 'CONFIG_DRIFT',
    params: [{ op: 'remove' }, { op: 'add-my-pham' }, { op: 'swap-to-my-pham' }, { op: 'drop-dien-tu' }, { op: 'drop-me-be' }],
    title: (p) => ({ remove: 'Voucher sàn mất điều kiện ngành hàng', 'add-my-pham': 'Voucher sàn thêm nhầm ngành Mỹ phẩm', 'swap-to-my-pham': 'Voucher sàn đổi nhầm sang ngành Mỹ phẩm', 'drop-dien-tu': 'Voucher sàn bỏ sót ngành Điện tử', 'drop-me-be': 'Voucher sàn bỏ sót ngành Mẹ & Bé' })[p.op],
    story: () => 'Marketing sửa điều kiện "What items will the promotion be applied to?" của FS-MK-SAN10.',
    inject: (ids, p) => setTargetRule(ids, 'FS-MK-SAN10', 'items.product.categories.id', {
      remove: null, 'add-my-pham': ['gia-dung', 'dien-tu', 'me-be', 'my-pham'], 'swap-to-my-pham': ['my-pham'],
      'drop-dien-tu': ['gia-dung', 'me-be'], 'drop-me-be': ['gia-dung', 'dien-tu'],
    }[p.op]?.map?.((k) => ids.categories[k]) ?? null),
    expect: ['PROMOTION_SCOPE_RULES'], root: () => ({ entity: 'promotion', label: 'FS-MK-SAN10', field: 'application_method.target_rules[items.product.categories.id]' }),
  },
  {
    family: 'PLATFORM_SHOP_TYPE_SCOPE', team: 'marketing', kind: 'CONFIG_DRIFT',
    params: [{ types: ['mall', 'preferred_plus', 'preferred', 'normal'] }, { types: ['mall'] }, { types: null }, { types: ['mall', 'preferred'] }],
    title: (p) => (p.types ? `Voucher sàn áp cho loại shop: ${p.types.join(', ')}` : 'Voucher sàn mất điều kiện loại shop'),
    story: () => 'Marketing chỉnh danh sách loại shop được hưởng voucher sàn.',
    inject: (ids, p) => setTargetRule(ids, 'FS-MK-SAN10', 'items.product.tags.id', p.types ? p.types.map((k) => ids.tags[SHOP_TYPES[k]]) : null),
    expect: ['PROMOTION_SCOPE_RULES'], root: () => ({ entity: 'promotion', label: 'FS-MK-SAN10', field: 'application_method.target_rules[items.product.tags.id]' }),
  },
  {
    // Shop không bán ngành nằm trong phạm vi voucher (glow) hoặc hạng mới vẫn trong phạm vi (techzone): đối chứng sát nút, không được báo
    family: 'SHOP_TYPE_DOWNGRADE', team: 'seller_ops', kind: (p) => (p.shop === 'glow' || p.shop === 'techzone' ? 'NO_OP' : 'CROSS_TEAM_CONFLICT'),
    params: [{ shop: 'airchef', to: 'normal' }, { shop: 'homelux', to: 'normal' }, { shop: 'techzone', to: 'preferred' }, { shop: 'glow', to: 'normal' }, { shop: 'sunhouse', to: 'preferred' }, { shop: 'watchx', to: 'normal' }],
    title: (p) => `Hồ sơ shop ${p.shop} bị đổi loại sang ${p.to} giữa campaign`,
    story: (p) => `Seller Ops cập nhật hồ sơ shop ${p.shop} (đánh giá lại hạng shop) trong khi voucher sàn của Marketing xét theo loại shop.`,
    inject: async (ids, p) => {
      for (const h of shopProducts(p.shop)) {
        await productTags(ids, h, (tags) => [...tags.filter((t) => !Object.values(SHOP_TYPES).map((v) => ids.tags[v]).includes(t)), ids.tags[SHOP_TYPES[p.to]]])
      }
    },
    // glow bán Mỹ phẩm (ngoài voucher sàn); techzone lên preferred vẫn trong phạm vi: không ảnh hưởng nghiệp vụ.
    // sunhouse xuống preferred lọt vào Tuần lễ Gia dụng (chỉ dành cho Yêu thích/Thường); airchef xuống normal vừa mất voucher sàn
    // vừa lọt vào Tuần lễ Gia dụng, cộng thêm 8% lên Brand Day
    expect: (p) => (p.shop === 'glow' || p.shop === 'techzone' ? [] : p.shop === 'sunhouse' ? ['ELIGIBILITY_LEAK']
      : p.shop === 'airchef' ? ['ENTITLEMENT_LOSS', 'ELIGIBILITY_LEAK', 'CROSS_CAMPAIGN_STACKING'] : ['ENTITLEMENT_LOSS']),
    root: (p) => ({ entity: 'product', label: shopProducts(p.shop).join(','), field: 'tags (loại shop)' }),
  },
  {
    family: 'CATEGORY_PARENT_UNASSIGNED', team: 'merchandising', kind: (p) => (p.handle === 'fs-mk-pinpro-20k' ? 'NO_OP' : 'CROSS_TEAM_CONFLICT'),
    params: ['fs-mk-airchef-6l', 'fs-mk-airchef-mini', 'fs-mk-homelux-v8', 'fs-mk-techzone-buds', 'fs-mk-pinpro-20k', 'fs-mk-sunhouse-noicom', 'fs-mk-watchx-s3', 'fs-mk-babycare-xl'].map((handle) => ({ handle })),
    title: (p) => `Sản phẩm ${p.handle} chỉ còn gắn ngành con, mất ngành cha`,
    story: (p) => `Merchandising chuẩn hóa cây danh mục: ${p.handle} chỉ giữ ngành con. Voucher sàn của Marketing lại target ngành cha.`,
    inject: (ids, p) => productCategories(ids, p.handle, [PRODUCTS.find((x) => x.handle === p.handle).cat]),
    // PinPro là shop Thường, vốn không có voucher sàn
    expect: (p) => (p.handle === 'fs-mk-pinpro-20k' ? [] : ['ENTITLEMENT_LOSS']),
    root: (p) => ({ entity: 'product', label: p.handle, field: 'categories' }),
  },
  {
    family: 'CATEGORY_MOVED', team: 'merchandising', kind: 'CROSS_TEAM_CONFLICT',
    params: [{ handle: 'fs-mk-techzone-buds', to: ['cham-soc-da', 'my-pham'] }, { handle: 'fs-mk-glow-serum', to: ['may-hut-bui', 'gia-dung'] }, { handle: 'fs-mk-momshop-gold', to: ['noi-com', 'gia-dung'] }],
    title: (p) => `Sản phẩm ${p.handle} bị chuyển nhầm ngành sang ${p.to[1]}`,
    story: (p) => `Merchandising kéo thả một lô sản phẩm vào ngành ${p.to[0]} khi dọn danh mục, ${p.handle} lẫn vào lô; theo quy ước gán ngành, sản phẩm được gán cả ngành con ${p.to[0]} và ngành cha ${p.to[1]}.`,
    inject: (ids, p) => productCategories(ids, p.handle, p.to),
    // TZ-BUDS rời Điện tử: mất voucher sàn. Serum Glow / sữa MomShop vào Gia dụng: lọt vào voucher sàn hoặc Tuần lễ Gia dụng
    expect: (p) => (p.handle === 'fs-mk-techzone-buds' ? ['ENTITLEMENT_LOSS'] : ['ELIGIBILITY_LEAK']),
    root: (p) => ({ entity: 'product', label: p.handle, field: 'categories' }),
  },
  {
    // Marketing sở hữu chương trình freeship (kể cả ngưỡng): sơ suất của chính chủ sở hữu
    family: 'FREESHIP_THRESHOLD', team: 'marketing', kind: 'CONFIG_DRIFT',
    params: [{ op: 'base-item_total' }, { op: 'value', value: 3000000 }, { op: 'value', value: 30000 }],
    title: (p) => (p.op === 'base-item_total' ? 'Freeship xét ngưỡng sau voucher (item_total)' : `Ngưỡng freeship nhập ${p.value.toLocaleString('vi-VN')}đ`),
    story: (p) => (p.op === 'base-item_total' ? 'Marketing dựng lại rule ngưỡng freeship sau khi xóa nhầm, chọn thuộc tính item_total thay vì item_subtotal.' : 'Marketing cập nhật ngưỡng freeship, gõ sai số 0.'),
    inject: (ids, p) => (p.op === 'base-item_total'
      ? setRule(ids, FREESHIP.code, 'item_subtotal', [String(FREESHIP.threshold)], 'gte', 'item_total')
      : setRule(ids, FREESHIP.code, 'item_subtotal', [String(p.value)], 'gte')),
    expect: ['FREESHIP_THRESHOLD_BASE'], root: () => ({ entity: 'promotion', label: FREESHIP.code, field: 'rules[item_subtotal]' }),
  },
  {
    // Logistics quản lý provider nhưng danh sách provider của chương trình freeship là điều khoản Marketing sở hữu
    family: 'FREESHIP_PROVIDER_LIST', team: 'logistics', kind: 'CROSS_TEAM_CONFLICT',
    params: [{ providers: ['fs-ahamove'] }, { providers: ['fs-ghn', 'fs-ghtk'] }, { providers: ['fs-ghn', 'fs-ghtk', 'fs-vtp', 'fs-ahamove'] }, { providers: ['fs-ghn', 'fs-ghtk', 'fs-vtp', 'fs-jt'] }],
    title: (p) => `Danh sách provider freeship đổi thành ${p.providers.join(', ')}`,
    story: () => 'Logistics cập nhật provider trong admin và sửa luôn danh sách provider của promotion freeship (admin không phân quyền theo trường), điều khoản này do Marketing sở hữu.',
    inject: (ids, p) => setTargetRule(ids, FREESHIP.code, 'shipping_methods.shipping_option.shipping_option_type_id', p.providers.map((c) => ids.types[c])),
    expect: ['FREESHIP_PROVIDERS'], root: () => ({ entity: 'promotion', label: FREESHIP.code, field: 'application_method.target_rules[shipping_option_type_id]' }),
  },
  {
    family: 'NEW_PROVIDER_UNDECLARED', team: 'logistics', kind: 'CROSS_TEAM_CONFLICT',
    params: [{ code: 'fs-ninjavan', label: 'Ninja Van', fee: 25000 }, { code: 'fs-best', label: 'BEST Express', fee: 28000 }, { code: 'fs-grab', label: 'GrabExpress', fee: 45000 }],
    title: (p) => `Logistics mở provider mới ${p.label} (${p.fee.toLocaleString('vi-VN')}đ) cho Việt Nam`,
    story: (p) => `Logistics onboard ${p.label}, rẻ hơn GHN; chương trình freeship của Marketing không khai báo provider này.`,
    inject: (ids, p) => addShippingOption(ids, p.code, p.label, `${EXTRA_PREFIX}${p.label}`, p.fee),
    expect: ['PROVIDER_DECLARED_IN_FREESHIP'], root: (p) => ({ entity: 'shipping_option', label: `${EXTRA_PREFIX}${p.label}`, field: 'created' }),
  },
  {
    family: 'FREESHIP_PROGRAM_TAG', team: 'seller_ops', kind: 'CROSS_TEAM_CONFLICT',
    params: [
      ...['airchef', 'homelux', 'techzone', 'glow', 'watchx', 'babycare'].map((shop) => ({ shop, op: 'remove' })),
      ...['pinpro', 'sonxinh', 'momshop'].map((shop) => ({ shop, op: 'add' })),
    ],
    title: (p) => `Shop ${p.shop} ${p.op === 'remove' ? 'bị gỡ khỏi' : 'được gắn nhầm vào'} Freeship Xtra`,
    story: (p) => `Seller Ops cập nhật danh sách shop tham gia Freeship Xtra: ${p.op === 'remove' ? 'gỡ' : 'thêm'} ${p.shop}.`,
    inject: async (ids, p) => {
      for (const h of shopProducts(p.shop)) {
        await productTags(ids, h, (tags) => (p.op === 'remove' ? tags.filter((t) => t !== ids.tags[FREESHIP_TAG]) : [...tags, ids.tags[FREESHIP_TAG]]))
      }
    },
    expect: (p) => [p.op === 'remove' ? 'ENTITLEMENT_LOSS' : 'ELIGIBILITY_LEAK'],
    root: (p) => ({ entity: 'product', label: shopProducts(p.shop).join(','), field: `tags (${FREESHIP_TAG})` }),
  },
  {
    family: 'BUDGET_TYPO', team: 'finance', kind: 'CONFIG_DRIFT',
    params: BUDGETS.map((b) => ({ campaign: b.campaign_identifier, limit: b.limit / 1000 })),
    title: (p) => `Ngân sách ${p.campaign} nhập ${p.limit.toLocaleString('vi-VN')}đ (thiếu 3 số 0)`,
    story: (p) => `Finance cập nhật ngân sách ${p.campaign} theo đơn vị nghìn đồng.`,
    inject: (ids, p) => api(`/admin/campaigns/${ids.campaigns[p.campaign]}`, { method: 'POST', body: { budget: { limit: p.limit } } }),
    expect: ['BUDGET_LIMIT'], root: (p) => ({ entity: 'campaign', label: p.campaign, field: 'budget.limit' }),
  },
  {
    family: 'SEGMENT_RULE', team: 'marketing', kind: 'CONFIG_DRIFT',
    params: [{ code: 'FS-MK-SAN10', op: 'add-new' }, { code: 'FS-MK-NEWBIE50K', op: 'remove' }],
    title: (p) => (p.op === 'add-new' ? 'Voucher sàn bị giới hạn chỉ khách mới' : 'Voucher khách mới mất điều kiện phân khúc'),
    story: (p) => `Marketing sửa điều kiện "Who can use this code?" của ${p.code}.`,
    inject: (ids, p) => setRule(ids, p.code, 'customer.groups.id', p.op === 'remove' ? null : [ids.new_group]),
    expect: ['PROMOTION_SEGMENT'], root: (p) => ({ entity: 'promotion', label: p.code, field: 'rules[customer.groups.id]' }),
  },
  {
    family: 'MIN_SPEND_TYPO', team: 'seller_ops', kind: 'CONFIG_DRIFT',
    params: [
      { code: 'FS-MK-AIRCHEF100K', value: 150000 }, { code: 'FS-MK-AIRCHEF100K', value: 15000000 },
      { code: 'FS-MK-GLOW30K', value: 3000000 }, { code: 'FS-MK-SAN10', value: 5000000, team: 'marketing' },
    ],
    title: (p) => `Đơn tối thiểu của ${p.code} nhập ${p.value.toLocaleString('vi-VN')}đ`,
    story: (p) => `Người phụ trách ${p.code} gõ sai số 0 ở ô "đơn tối thiểu".`,
    inject: (ids, p) => setRule(ids, p.code, 'item_subtotal', [String(p.value)], 'gte'),
    expect: ['PROMOTION_MIN_SPEND'], root: (p) => ({ entity: 'promotion', label: p.code, field: 'rules[item_subtotal]' }),
  },
  {
    family: 'VALUE_TYPO', team: 'marketing', kind: 'CONFIG_DRIFT',
    params: [{ code: 'FS-MK-SAN10', value: 100 }, { code: 'FS-MK-SAN10', value: 1 }, { code: 'FS-MK-NEWBIE50K', value: 500000 }, { code: 'FS-MK-AIRCHEF100K', value: 1000000, team: 'seller_ops' }],
    title: (p) => `Giá trị ${p.code} nhập ${p.value}`,
    story: (p) => `Sửa giá trị ưu đãi ${p.code}, gõ nhầm ${p.value}.`,
    inject: (ids, p) => setPromoValue(ids, p.code, p.value),
    expect: ['PROMOTION_VALUE'], root: (p) => ({ entity: 'promotion', label: p.code, field: 'application_method.value' }),
  },
  {
    // Category chạy ưu đãi riêng cho ngành khác Gia dụng; brief "không cộng voucher khác" không biểu diễn được trong Medusa
    family: 'UNPLANNED_STACKING', team: 'category', kind: 'CROSS_TEAM_CONFLICT',
    params: [{ cat: 'dien-tu', pct: 20 }, { cat: 'my-pham', pct: 25 }, { cat: 'me-be', pct: 5 }],
    title: (p) => `Ngành hàng bật ưu đãi tự động -${p.pct}% cho ${p.cat}`,
    story: (p) => `Category team chạy ưu đãi ngành ${p.cat} -${p.pct}% cho tuần lễ ngành (brief ghi "không cộng voucher sàn/voucher shop"), Medusa không có cờ chặn cộng dồn.`,
    inject: (ids, p) => api('/admin/promotions', {
      method: 'POST',
      body: {
        code: `${EXTRA_PREFIX}CAT${p.pct}`, type: 'standard', status: 'active', is_automatic: true,
        rules: [{ attribute: 'currency_code', operator: 'eq', values: ['vnd'] }],
        application_method: {
          type: 'percentage', value: p.pct, target_type: 'items', allocation: 'across',
          target_rules: p.cat ? [{ attribute: 'items.product.categories.id', operator: 'in', values: [ids.categories[p.cat]] }] : [],
        },
      },
    }),
    expect: ['NO_UNPLANNED_STACKING'], root: (p) => ({ entity: 'promotion', label: `${EXTRA_PREFIX}CAT${p.pct}`, field: 'created' }),
  },
  {
    family: 'PROMO_PAUSED', team: 'marketing', kind: 'MISSING_CONFIG',
    params: [{ code: 'FS-MK-SAN10' }, { code: 'FS-MK-GLOW30K', team: 'seller_ops' }, { code: FREESHIP.code }],
    title: (p) => `${p.code} bị chuyển về draft`,
    story: (p) => `Người phụ trách tạm dừng ${p.code} để sửa mô tả, quên bật lại.`,
    inject: (ids, p) => api(`/admin/promotions/${ids.promos[p.code]}`, { method: 'POST', body: { status: 'draft' } }),
    expect: (p) => [p.code === FREESHIP.code ? 'FREESHIP_ACTIVE' : 'PROMOTION_ACTIVE'], root: (p) => ({ entity: 'promotion', label: p.code, field: 'status' }),
  },
  {
    family: 'BRANDDAY_SCOPE', team: 'seller_ops', kind: 'CONFIG_DRIFT',
    params: [{ op: 'remove' }, { op: 'to', shop: 'sunhouse' }, { op: 'add', shop: 'homelux' }],
    title: (p) => (p.op === 'remove' ? 'Brand Day AirChef mất điều kiện shop: -20% áp cho mọi shop' : p.op === 'to' ? `Brand Day AirChef gắn nhầm sang shop ${p.shop}` : `Brand Day AirChef thêm nhầm shop ${p.shop}`),
    story: () => 'Seller Ops nhân bản chương trình Brand Day từ shop khác và sửa điều kiện shop.',
    inject: (ids, p) => setTargetRule(ids, BRANDDAY.code, 'items.product.collection_id',
      p.op === 'remove' ? null : p.op === 'to' ? [ids.shops[p.shop]] : [ids.shops.airchef, ids.shops[p.shop]]),
    expect: ['PROMOTION_SCOPE_RULES'], root: () => ({ entity: 'promotion', label: BRANDDAY.code, field: 'application_method.target_rules[items.product.collection_id]' }),
  },
  {
    // Mở cho Mall hoặc bỏ điều kiện loại shop thì đụng Brand Day của Seller Ops (liên team);
    // sửa phạm vi ngành chỉ ảnh hưởng chương trình của chính Category (một team)
    // Lệch nằm trong contract của chính Category; cộng dồn với Brand Day (Seller Ops) là hệ quả
    family: 'GDWEEK_SCOPE', team: 'category', kind: 'CONFIG_DRIFT',
    params: [{ types: ['mall', 'preferred', 'normal'] }, { types: null }, { categories: null }, { categories: ['gia-dung', 'dien-tu'] }],
    title: (p) => (p.types !== undefined ? (p.types ? 'Tuần lễ Gia dụng mở thêm cho shop Mall' : 'Tuần lễ Gia dụng mất điều kiện loại shop') : p.categories ? 'Tuần lễ Gia dụng thêm nhầm ngành Điện tử' : 'Tuần lễ Gia dụng mất điều kiện ngành hàng'),
    story: (p) => (p.types !== undefined
      ? 'Category team mở rộng Tuần lễ Gia dụng để tăng GMV; shop Mall ngành Gia dụng (AirChef, Sunhouse) được giảm thêm 8% ngoài kế hoạch, riêng AirChef đang có Brand Day -20% của Seller Ops nên bị cộng 20% + 8%.'
      : 'Category team chỉnh điều kiện ngành của Tuần lễ Gia dụng.'),
    inject: (ids, p) => (p.types !== undefined
      ? setTargetRule(ids, GDWEEK.code, 'items.product.tags.id', p.types ? p.types.map((k) => ids.tags[SHOP_TYPES[k]]) : null)
      : setTargetRule(ids, GDWEEK.code, 'items.product.categories.id', p.categories ? p.categories.map((k) => ids.categories[k]) : null)),
    expect: (p) => (p.types !== undefined ? ['PROMOTION_SCOPE_RULES', 'ELIGIBILITY_LEAK', 'CROSS_CAMPAIGN_STACKING'] : ['PROMOTION_SCOPE_RULES', 'ELIGIBILITY_LEAK']),
    root: () => ({ entity: 'promotion', label: GDWEEK.code, field: 'application_method.target_rules' }),
  },
  {
    family: 'CONTRACT_REVISION', team: 'seller_ops', kind: 'CONTRACT_CONFLICT', contract: true,
    params: [{ op: 'bd-no-san10' }, { op: 'bd-no-newbie' }, { op: 'gd-no-san10', team: 'category' }],
    title: (p) => ({
      'bd-no-san10': 'Seller Ops sửa contract Brand Day: "không cộng voucher sàn"',
      'bd-no-newbie': 'Seller Ops sửa contract Brand Day: "không cộng voucher khách mới"',
      'gd-no-san10': 'Category sửa contract Tuần lễ Gia dụng: "không cộng voucher sàn"',
    })[p.op],
    story: () => 'Một team cập nhật contract của mình; contract 11.11 của Marketing vẫn cho phép cộng dồn. Mỗi bên chỉ duyệt contract của mình nên không ai thấy hai bản mâu thuẫn.',
    inject: (ids, p) => {
      const drop = (code) => (c) => ({ ...c, stacking: { ...c.stacking, allowed_codes: c.stacking.allowed_codes.filter((x) => x !== code) } })
      return postContracts(p.op === 'bd-no-san10' ? { 'CT-BRANDDAY-AIRCHEF': drop('FS-MK-SAN10') }
        : p.op === 'bd-no-newbie' ? { 'CT-BRANDDAY-AIRCHEF': drop('FS-MK-NEWBIE50K') }
          : { 'CT-GIADUNG-WEEK': drop('FS-MK-SAN10') })
    },
    expect: ['CONTRACT_STACKING_AGREEMENT'], root: (p) => ({ entity: 'campaign_contract', label: p.op.startsWith('bd') ? 'CT-BRANDDAY-AIRCHEF' : 'CT-GIADUNG-WEEK', field: 'stacking.allowed_codes' }),
  },
  {
    family: 'CONTRACT_CONFIG_LAG', team: 'category', kind: 'CONFIG_DRIFT', contract: true,
    // Mở thêm ngành Mẹ & Bé: MomShop (Yêu thích) có quyền theo contract mới nhưng config chưa áp, nên khách mất ưu đãi thật
    params: [{ op: 'gd-include-me-be' }, { op: 'gd-value-10' }],
    title: (p) => (p.op === 'gd-include-me-be' ? 'Contract Tuần lễ Gia dụng mở thêm ngành Mẹ & Bé, config chưa cập nhật' : 'Contract Tuần lễ Gia dụng tăng lên 10%, config vẫn 8%'),
    story: () => 'Category team được duyệt contract mới nhưng người cấu hình chưa sửa promotion theo.',
    inject: (ids, p) => postContracts({
      'CT-GIADUNG-WEEK': (c) => ({
        ...c,
        promotions: c.promotions.map((x) => (p.op === 'gd-value-10' ? { ...x, value: 10 } : { ...x, scope: { ...x.scope, categories: ['gia-dung', 'me-be'] } })),
      }),
    }),
    expect: (p) => [p.op === 'gd-value-10' ? 'PROMOTION_VALUE' : 'PROMOTION_SCOPE_RULES'],
    root: () => ({ entity: 'promotion', label: GDWEEK.code, field: 'config chưa theo contract mới' }),
  },
  {
    family: 'CONTROL_NO_OP', team: 'merchandising', kind: 'NO_OP',
    params: [{ op: 'title' }, { op: 'pricelist-desc' }, { op: 'aha-fee', team: 'logistics' }, { op: 'vtp-fee', team: 'logistics' }],
    title: (p) => ({ title: 'Đổi tiêu đề sản phẩm Son Xinh', 'pricelist-desc': 'Đổi mô tả price list flash sale', 'aha-fee': 'Tăng phí AhaMove (provider không thuộc freeship)', 'vtp-fee': 'Giảm phí Viettel Post 32.000đ xuống 28.000đ' })[p.op],
    story: () => 'Thay đổi hợp lệ, không ảnh hưởng ý định campaign. Agent không được báo lỗi.',
    inject: async (ids, p) => {
      if (p.op === 'title') return api(`/admin/products/${ids.products['fs-mk-sonxinh-velvet']}`, { method: 'POST', body: { title: 'Son Xinh Velvet (mới)' } })
      if (p.op === 'pricelist-desc') return api(`/admin/price-lists/${ids.price_list}`, { method: 'POST', body: { description: 'Flash 11.11 khung 20-22h, cập nhật banner' } })
      const code = p.op === 'aha-fee' ? 'fs-ahamove' : 'fs-vtp'
      const o = (await api(`/admin/shipping-options/${ids.options[code]}?fields=id,prices.id,prices.currency_code`)).shipping_option
      const pr = o.prices.find((x) => x.currency_code === 'vnd')
      return api(`/admin/shipping-options/${o.id}`, { method: 'POST', body: { prices: [{ id: pr.id, currency_code: 'vnd', amount: code === 'fs-ahamove' ? 70000 : 28000 } ] } })
    },
    expect: [], root: () => null,
  },
  {
    // Đối chứng: thay đổi hợp lệ đi qua các route có audit (campaign, ngành hàng, shop). Agent thấy thay đổi nhưng không được báo lỗi.
    family: 'CONTROL_BENIGN_AUDITED', team: 'marketing', kind: 'NO_OP',
    params: [{ op: 'campaign-desc' }, { op: 'category-rename', team: 'merchandising' }, { op: 'shop-title', team: 'seller_ops' }, { op: 'campaign-extend', team: 'seller_ops' }],
    title: (p) => ({ 'campaign-desc': 'Đổi mô tả campaign 11.11', 'category-rename': 'Đổi tên hiển thị ngành Gia dụng (giữ handle)', 'shop-title': 'Đổi tên hiển thị shop AirChef', 'campaign-extend': 'Gia hạn ngày kết thúc campaign Brand Day thêm 7 ngày' })[p.op],
    story: () => 'Thay đổi hợp lệ trên đối tượng có audit, không đụng điều khoản contract. Agent không được báo lỗi.',
    inject: async (ids, p) => {
      if (p.op === 'campaign-desc') return api(`/admin/campaigns/${ids.campaigns[BUDGETS[0].campaign_identifier]}`, { method: 'POST', body: { description: 'Siêu sale 11.11, cập nhật KV' } })
      if (p.op === 'category-rename') return api(`/admin/product-categories/${ids.categories['gia-dung']}`, { method: 'POST', body: { name: 'Gia dụng & Nhà bếp' } })
      if (p.op === 'shop-title') return api(`/admin/collections/${ids.shops.airchef}`, { method: 'POST', body: { title: 'AirChef Official Store' } })
      return api(`/admin/campaigns/${ids.campaigns['fs-mk-brandday']}`, { method: 'POST', body: { ends_at: iso(37 * 86400e3) } })
    },
    expect: [], root: () => null,
  },
  {
    // Đối chứng "ngoài luồng": cấu hình lệch contract nhưng không ai sửa qua Admin API (script, sửa tay DB, migration, dữ liệu hỏng).
    // Agent phải thấy lỗi, nhưng KHÔNG được quy cho team nào; phán quyết đúng là UNATTRIBUTED_CHANGE, chuyển platform.
    family: 'OUT_OF_BAND_DB', team: null, kind: 'OUT_OF_BAND',
    params: [
      { op: 'promo-value', code: 'FS-MK-SAN10', value: 1 }, { op: 'promo-value', code: 'FS-MK-NEWBIE50K', value: 500000 },
      { op: 'rule-values-lost', code: 'FS-MK-AIRCHEF100K' }, { op: 'rule-values-lost', code: 'FS-MK-SAN10' },
      { op: 'flash-price', sku: 'FS-MK-AIRCHEF6-DEN', factor: 10 }, { op: 'flash-price', sku: 'FS-MK-WATCHX-S3', factor: 0.1 },
      { op: 'tag-link-lost', shop: 'airchef' }, { op: 'tag-link-lost', shop: 'homelux' },
      { op: 'promo-draft', code: 'FS-MK-GLOW30K' },
    ],
    title: (p) => ({
      'promo-value': `DB: giá trị ${p.code} thành ${p.value} (không có audit)`,
      'rule-values-lost': `DB: mất giá trị điều kiện phạm vi của ${p.code} (không có audit)`,
      'flash-price': `DB: giá flash ${p.sku} ${p.factor > 1 ? 'x10' : '/10'} (không có audit)`,
      'tag-link-lost': `DB: shop ${p.shop} mất liên kết tag Freeship Xtra (không có audit)`,
      'promo-draft': `DB: ${p.code} chuyển draft (không có audit)`,
    })[p.op],
    story: () => 'Một script bảo trì / sửa tay DB / lỗi đồng bộ dữ liệu làm cấu hình đổi mà không đi qua Admin API. Không có bản ghi ai sửa.',
    inject: (ids, p) => {
      const promo = (code) => `(select id from promotion where code = ${q(code)} and deleted_at is null)`
      if (p.op === 'promo-value') return sql(`update promotion_application_method set value = ${p.value}, raw_value = jsonb_build_object('value', ${q(p.value)}, 'precision', 20) where promotion_id = ${promo(p.code)}`)
      if (p.op === 'rule-values-lost') return sql(`delete from promotion_rule_value where promotion_rule_id in (select promotion_rule_id from application_method_target_rules where application_method_id = (select id from promotion_application_method where promotion_id = ${promo(p.code)}))`)
      if (p.op === 'flash-price') {
        const amount = Math.round(FLASH.prices[p.sku] * p.factor)
        return sql(`update price set amount = ${amount}, raw_amount = jsonb_build_object('value', ${q(amount)}, 'precision', 20) where deleted_at is null and price_list_id = ${q(ids.price_list)} and price_set_id = (select price_set_id from product_variant_price_set where variant_id = ${q(ids.variants[p.sku])} and deleted_at is null)`)
      }
      if (p.op === 'tag-link-lost') return sql(`delete from product_tags where product_tag_id = ${q(ids.tags[FREESHIP_TAG])} and product_id in (${shopProducts(p.shop).map((h) => q(ids.products[h])).join(',')})`)
      return sql(`update promotion set status = 'draft' where id = ${promo(p.code)}`)
    },
    expect: (p) => ({ 'promo-value': ['PROMOTION_VALUE'], 'rule-values-lost': ['PROMOTION_SCOPE_RULES'], 'flash-price': ['FLASH_PRICE_MATCHES_CONTRACT'], 'tag-link-lost': ['ENTITLEMENT_LOSS'], 'promo-draft': ['PROMOTION_ACTIVE'] })[p.op],
    root: (p) => (p.op === 'flash-price' ? { entity: 'price_list', label: FLASH.title, field: `prices[${p.sku}].amount` }
      : p.op === 'tag-link-lost' ? { entity: 'product', label: shopProducts(p.shop).join(','), field: `tags (${FREESHIP_TAG})` }
        : { entity: 'promotion', label: p.code, field: p.op }),
  },
]

function expandSamples() {
  const out = []
  for (const f of FAMILIES) {
    f.params.forEach((p, i) => {
      out.push({
        sample_id: `${f.family}-${String(i + 1).padStart(2, '0')}`,
        family: f.family, team: p.team ?? f.team, kind: typeof f.kind === 'function' ? f.kind(p) : f.kind, params: p,
        title: f.title(p), story: f.story(p), stages: STAGES[f.family]?.(p) ?? null,
        // Ca biên đã biết: bản chất thuộc cả hai nhãn; evaluator chấp nhận phán quyết của cả hai
        accepted_kinds: f.alsoKind ? [typeof f.kind === 'function' ? f.kind(p) : f.kind, f.alsoKind] : null,
        expect: typeof f.expect === 'function' ? f.expect(p) : f.expect, expect_any: !!f.expectAny,
        root: f.root(p), inject: (ids) => f.inject(ids, p), inject_source: f.inject.toString(), contract: !!f.contract,
        // Đáp án đúng là chuyển chủ các điều khoản (không có bản sửa cấu hình nào giữ đúng mọi điều khoản đã duyệt)
        escalate: typeof f.escalate === 'function' ? f.escalate(p) : !!f.escalate,
      })
    })
  }
  return out
}

// ---------------------------------------------------------------- check + bằng chứng
// Kiểm tra cả ba contract; phát hiện và mô phỏng được gắn contract_id để so baseline
async function runCheck() {
  await asAdmin()
  const out = { contracts: {}, findings: [], simulation: [], summary: { total: 0 } }
  for (const id of CONTRACT_IDS) {
    const c = (await api(`/admin/flashsre/contracts/${id}/check`, { method: 'POST' })).check
    out.contracts[id] = { version: c.contract_version, summary: c.summary }
    out.findings.push(...c.findings.map((f) => ({ ...f, contract_id: id })))
    out.simulation.push(...c.simulation.map((r) => ({ ...r, contract_id: id })))
    out.summary.total += c.summary.total
  }
  return out
}
async function postContracts(overrides = {}) {
  const all = buildContracts(overrides)
  const out = []
  for (const id of CONTRACT_IDS) {
    if (Object.keys(overrides).length && !overrides[id]) continue
    const { contract } = await api('/admin/flashsre/contracts', { method: 'POST', body: { contract_id: id, body: all[id] } })
    out.push(`${contract.contract_id} v${contract.version}`)
  }
  return out
}
// Khóa ổn định: tiêu đề có số giỏ/giải thích thay đổi theo dữ liệu nên không dùng làm khóa
const findingKey = (f) => `${f.contract_id}|${f.invariant}|${f.kind}|${f.entities?.[0]?.label ?? ''}`

async function witnessCart(ids, skus) {
  const cart = (await api('/store/carts', {
    method: 'POST', pk: ids.pk,
    body: {
      region_id: ids.region, sales_channel_id: ids.sales_channel, email: 'dataset@flashsre.dev',
      items: skus.map((s) => ({ variant_id: ids.variants[s], quantity: 1 })),
      shipping_address: { first_name: 'Lan', last_name: 'Nguyen', address_1: '1 Lê Lợi', city: 'Hà Nội', country_code: 'vn', postal_code: '100000' },
    },
  })).cart
  await api(`/store/carts/${cart.id}/shipping-methods`, { method: 'POST', pk: ids.pk, body: { option_id: ids.options['fs-ghn'] } })
  const codes = PROMOS.filter((p) => p.segments === 'ALL').map((p) => p.code)
  const f = '?fields=id,item_subtotal,total,promotions.code,items.variant_sku,items.unit_price,items.adjustments.code,items.adjustments.amount,shipping_methods.amount,shipping_methods.adjustments.amount'
  const res = (await api(`/store/carts/${cart.id}/promotions${f}`, { method: 'POST', pk: ids.pk, body: { promo_codes: codes } })).cart
  return {
    cart_id: res.id, skus, provider: 'fs-ghn', codes_entered: codes,
    lines: res.items.map((i) => ({ sku: i.variant_sku, unit_price: Number(i.unit_price), adjustments: (i.adjustments ?? []).map((a) => ({ code: a.code, amount: Number(a.amount) })) })),
    shipping_fee: Number(res.shipping_methods?.[0]?.amount ?? 0),
    shipping_support: (res.shipping_methods?.[0]?.adjustments ?? []).reduce((s, a) => s + Number(a.amount), 0),
    promotions: (res.promotions ?? []).map((p) => p.code),
    total: Number(res.total),
  }
}

async function dataset() {
  const onlyArg = process.argv.indexOf('--only')
  const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(',') : null
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity
  const witness = !process.argv.includes('--no-witness')
  // --gate: chỉ nhận kịch bản sub-agent kiểm định đã PASS (incidents/scenarios/audit/latest.jsonl)
  const audits = scenarioAudits()
  const gate = process.argv.includes('--gate')
  // --business: chỉ lỗi nghiệp vụ
  const business = process.argv.includes('--business')
  const samples = expandSamples().filter((s) => (!only || only.includes(s.family)) && (!gate || audits.get(s.sample_id)?.verdict === 'PASS') &&
    (!business || BUSINESS_KINDS.includes(s.kind))).slice(0, limit)
  const dir = join(HERE, 'dataset', `marketplace-1111-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  mkdirSync(dir, { recursive: true })
  log(`[dataset] ${samples.length} mẫu -> ${dir}`)

  let ids = await setup()
  const baseline = await runCheck()
  const baselineKeys = new Set(baseline.findings.map(findingKey))
  writeFileSync(join(dir, 'baseline.json'), JSON.stringify(baseline, null, 2))
  const simKey = (r) => `${r.contract_id}|${r.sku}|${r.provider_name}`
  const baselineSim = new Map(baseline.simulation.map((s) => [simKey(s), s]))
  const rows = []

  for (const [n, s] of samples.entries()) {
    const started = new Date().toISOString()
    let error = null
    let check = null
    let wit = null
    try {
      await asTeam(s.team)
      await s.inject(ids)
      check = await runCheck()
    } catch (e) {
      error = String(e.message || e)
    }
    const newFindings = (check?.findings ?? []).filter((f) => !baselineKeys.has(findingKey(f)))
    const simDeltas = (check?.simulation ?? []).filter((r) => {
      const b = baselineSim.get(simKey(r))
      return !b || b.customer_pays !== r.customer_pays
    }).map((r) => ({ contract_id: r.contract_id, cart: r.sku, provider: r.provider, segment: r.segment, customer_pays_before: baselineSim.get(simKey(r))?.customer_pays ?? null, customer_pays_after: r.customer_pays, expected_pays: r.expected_pays, discounts_after: r.item_discounts, shipping_support_after: r.shipping_support }))
    if (witness && check && !error) {
      const target = simDeltas[0]?.cart?.split('+') ?? ['FS-MK-AIRCHEF6-DEN']
      wit = await witnessCart(ids, target).catch((e) => ({ error: String(e.message || e) }))
    }
    await asAdmin()
    // Mọi bản ghi audit kể từ lúc bắt đầu mẫu, không lọc theo team: lọc theo team gây lỗi là lộ đáp án
    const changes = (await api(`/admin/flashsre/config-changes?since=${encodeURIComponent(started)}&limit=50`)).config_changes
    // Tên họ, tiêu đề và câu chuyện kể ai làm gì, vì sao: thuộc đáp án, không để trong thứ agent được đọc
    const sample = {
      sample_id: s.sample_id, started_at: started,
      contracts: check?.contracts ?? null,
      config_changes: changes.map((c) => ({ id: c.id, at: c.created_at, team: c.team, actor_email: c.actor_email, method: c.method, route: c.route, entity_type: c.entity_type, entity_label: c.entity_label, diff: c.diff })),
      new_findings: newFindings.map((f) => ({ key: findingKey(f), contract_id: f.contract_id, invariant: f.invariant, kind: f.kind, severity: f.severity, title: f.title, fix_owner: f.fix_owner, teams_involved: f.teams_involved, entities: f.entities, affected: f.affected ?? null, expected: f.expected, actual: f.actual })),
      simulation_deltas: simDeltas,
      witness_cart: wit,
      error,
    }
    const invariants = new Set(newFindings.map((f) => f.invariant))
    const detected = s.expect.length === 0
      ? newFindings.length === 0
      : (s.expect_any ? s.expect.some((x) => invariants.has(x)) : s.expect.every((x) => invariants.has(x)))
    // Ngoài luồng (team null): oracle chỉ nêu team sở hữu điều khoản, không có ai để quy; chấm riêng ở agent eval
    const attributed = s.expect.length === 0 || !s.team || newFindings.some((f) => f.teams_involved.includes(s.team))
    // Giỏ thật so với mô phỏng cùng giỏ/provider/phân khúc: lớp kiểm độc lập cho oracle (null = không có dòng để so)
    const witSim = wit && !wit.error ? (check?.simulation ?? []).find((r) => r.sku === wit.skus.join('+') && r.provider === 'fs-ghn' && r.segment === 'REGULAR') : null
    const witnessMatch = witSim ? Math.abs(Number(witSim.customer_pays) - wit.total) <= 1 : null
    const label = {
      sample_id: s.sample_id, family: s.family, title: s.title, story: s.story, actor_team: s.team, truth_kind: s.kind, params: s.params,
      root_cause: s.root, expected_invariants: s.expect, expect_any: s.expect_any,
      scoring: { detected, attributed_actor_team: attributed, new_findings: newFindings.length, witness_match: witnessMatch, error: !!error },
      scenario_audit: audits.has(s.sample_id) ? { verdict: audits.get(s.sample_id).verdict, realism: audits.get(s.sample_id).realism ?? null } : null,
    }
    appendFileSync(join(dir, 'samples.jsonl'), JSON.stringify(sample) + '\n')
    appendFileSync(join(dir, 'labels.jsonl'), JSON.stringify(label) + '\n')
    rows.push(label)
    if (s.contract) {
      await asAdmin()
      await postContracts()
    }
    log(`[${n + 1}/${samples.length}] ${s.sample_id} ${detected ? 'DETECTED' : 'MISSED'}${attributed ? '' : ' (team?)'} new=${newFindings.length}${witnessMatch === false ? ` GIỎ-THẬT-LỆCH thật=${wit.total} sim=${witSim.customer_pays}` : ''}${error ? ` ERROR ${error.slice(0, 120)}` : ''} | ${s.title}`)
    ids = await setup()
  }
  writeReport(dir, rows)
  log(`[dataset] xong: ${dir}`)
}

function writeReport(dir, rows) {
  const byFam = new Map()
  for (const r of rows) byFam.set(r.family, [...(byFam.get(r.family) ?? []), r])
  const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-')
  const lines = [
    `# Dataset marketplace 11.11 (${CONTRACT_IDS.join(', ')})`,
    '',
    `${rows.length} mẫu, ${byFam.size} họ lỗi. Phát hiện đúng: ${rows.filter((r) => r.scoring.detected).length}/${rows.length}. ` +
      `Gắn đúng team gây lỗi: ${rows.filter((r) => r.scoring.attributed_actor_team).length}/${rows.length}. ` +
      `Giỏ thật khớp mô phỏng: ${rows.filter((r) => r.scoring.witness_match === true).length}/${rows.filter((r) => r.scoring.witness_match !== null).length} giỏ so được. ` +
      `Lỗi khi chạy: ${rows.filter((r) => r.scoring.error).length}.`,
    '',
    '| Họ lỗi | Team gây lỗi | Loại (nhãn) | Mẫu | Kịch bản PASS kiểm định | Phát hiện đúng | Gắn đúng team | Giỏ thật khớp |',
    '|---|---|---|---|---|---|---|---|',
    ...[...byFam].map(([fam, rs]) => `| ${fam} | ${[...new Set(rs.map((r) => r.actor_team ?? 'ngoài luồng (không có audit)'))].join(', ')} | ${rs[0].truth_kind} | ${rs.length} | ${rs.filter((r) => r.scenario_audit?.verdict === 'PASS').length}/${rs.filter((r) => r.scenario_audit).length} | ${pct(rs.filter((r) => r.scoring.detected).length, rs.length)} | ${pct(rs.filter((r) => r.scoring.attributed_actor_team).length, rs.length)} | ${rs.filter((r) => r.scoring.witness_match === true).length}/${rs.filter((r) => r.scoring.witness_match !== null).length} |`),
    '',
    'File: `samples.jsonl` (dữ liệu agent được đọc: audit, phát hiện mới so với baseline, delta mô phỏng, giỏ hàng thật), `labels.jsonl` (đáp án, chỉ evaluator đọc), `baseline.json`.',
  ]
  writeFileSync(join(dir, 'REPORT.md'), lines.join('\n') + '\n')
  const csv = ['sample_id,family,actor_team,truth_kind,detected,attributed_actor_team,new_findings,witness_match,error',
    ...rows.map((r) => [r.sample_id, r.family, r.actor_team, r.truth_kind, r.scoring.detected, r.scoring.attributed_actor_team, r.scoring.new_findings, r.scoring.witness_match ?? '', r.scoring.error].join(','))]
  writeFileSync(join(dir, 'labels.csv'), csv.join('\n') + '\n')
}

// ---------------------------------------------------------------- main
async function main() {
  const cmd = process.argv[2]
  if (cmd === 'list') {
    for (const s of expandSamples()) log(`${s.sample_id.padEnd(36)} ${(s.team ?? 'ngoài luồng').padEnd(14)} ${s.title}`)
    return log(`${expandSamples().length} mẫu`)
  }
  if (cmd === 'scenarios') {
    const out = join(HERE, 'scenarios', 'scenarios.json')
    writeFileSync(out, JSON.stringify(exportScenarios(), null, 2) + '\n')
    return log(`[scenarios] ${expandSamples().length} mẫu -> ${out}`)
  }
  if (cmd === 'contract') {
    await asAdmin()
    if (process.argv.includes('--write')) {
      // Toàn văn contract để người nghiệp vụ đọc/duyệt; registry giữ cùng nội dung theo phiên bản
      for (const [id, body] of Object.entries(buildContracts())) {
        writeFileSync(join(HERE, 'contracts', `${id.toLowerCase()}.json`), JSON.stringify(body, null, 2) + '\n')
      }
    }
    return log(`[contract] approved: ${(await postContracts()).join(', ')}`)
  }
  if (cmd === 'check') {
    const c = await runCheck()
    for (const [id, x] of Object.entries(c.contracts)) log(`[check] ${id} v${x.version}: ${x.summary.total} findings ${JSON.stringify(x.summary.by_kind)}`)
    for (const f of c.findings) log(`  ${f.contract_id} ${f.id} [${f.kind}] ${f.title}\n      sửa: ${f.fix_owner} | team liên quan: ${f.teams_involved.join(', ')}`)
    return
  }
  if (cmd === 'setup') {
    await setup()
    return log('[setup] catalog + campaign marketplace đúng kế hoạch')
  }
  if (cmd === 'inject') {
    const s = expandSamples().find((x) => x.sample_id === process.argv[3])
    if (!s) throw new Error(`Không có mẫu ${process.argv[3]} (xem lệnh list)`)
    const ids = await setup()
    await asTeam(s.team)
    await s.inject(ids)
    return log(`[inject ${s.sample_id} as ${TEAM_PASSWORD ? s.team : 'admin'}] ${s.title}\n  Khôi phục: node incidents/marketplace-1111.mjs setup`)
  }
  if (cmd === 'dataset') return dataset()
  log('Lệnh: setup | contract | check | list | inject <sample_id> | dataset')
}

// Phán quyết mới nhất của sub-agent kiểm định kịch bản, theo sample_id
function scenarioAudits() {
  const f = join(HERE, 'scenarios', 'audit', 'latest.jsonl')
  if (!existsSync(f)) return new Map()
  return new Map(readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((r) => [r.sample_id, r]))
}

// Kịch bản ở dạng dữ liệu cho sub-agent kiểm định: các khâu, nhãn, invariant kỳ vọng, mã inject, contract liên quan
function exportScenarios() {
  const contracts = buildContracts()
  const compact = (c) => {
    const { taxonomy: _t, teams: _x, ...rest } = c
    return rest
  }
  return {
    world: {
      conventions: [
        'Mỗi sản phẩm được gán trực tiếp cả ngành con (cat) và ngành cha của nó, vì rule danh mục của Medusa không kế thừa ngành cha.',
        'Loại shop (Mall/Yêu thích+/Yêu thích/Thường) và tham gia Freeship Xtra là tag trên từng sản phẩm của shop; shop là collection.',
        'Admin Medusa phân quyền theo route, không theo trường hay theo team sở hữu: tài khoản team nào cũng sửa được promotion, sản phẩm, shipping option.',
        'Setup đưa mọi thứ về đúng kế hoạch trước mỗi mẫu; mỗi mẫu chỉ có đúng các thay đổi trong inject.',
        'Ma trận giỏ của oracle gồm mọi SKU đơn lẻ x phân khúc (thường/khách mới) x provider, cộng các giỏ ghép trong carts.mixed của từng contract.',
      ],
      teams: TEAMS, shops: SHOPS, categories: CATEGORIES, products: PRODUCTS.map(({ variants, ...p }) => ({ ...p, skus: variants.map((v) => v[0]) })),
      freeship: FREESHIP, base_providers: BASE_PROVIDERS, budgets: BUDGETS,
    },
    contracts: Object.fromEntries(Object.entries(contracts).map(([id, c]) => [id, compact(c)])),
    samples: expandSamples().map(({ inject, ...s }) => s),
  }
}

// Chạy trực tiếp thì là CLI; import (agent) thì chỉ dùng thư viện kịch bản
if (IS_MAIN) {
  main().catch((e) => { console.error(e); process.exit(1) })
}

export { BUSINESS_KINDS, CONTRACT_IDS, asAdmin, asTeam, expandSamples, exportScenarios, postContracts, scenarioAudits, setup }
