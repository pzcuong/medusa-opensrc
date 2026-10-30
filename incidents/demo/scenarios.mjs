// Thư viện kịch bản: mỗi kịch bản chỉ nạp dữ liệu và cấu hình vào evaluator, không chứa kết quả tính sẵn.
import { at, pairMode, setPairMode } from './engine.mjs'

export const DAY = '2026-11-11'
const T = (hm, day = DAY) => at(day, hm)
const ALL_DAY = { start: T('00:00'), end: T('00:00', '2026-11-12') }

const PRODUCTS = [
  { sku: 'GLOW-SERUM', name: 'Serum Glow C 30ml', shop: 'glow', category: 'my-pham', price: 320000, art: 'serum' },
  { sku: 'SONXINH-VELVET', name: 'Son Xinh Velvet', shop: 'sonxinh', category: 'my-pham', price: 159000, art: 'lipstick' },
  { sku: 'AIRCHEF-6L', name: 'Nồi chiên AirChef 6L', shop: 'airchef', category: 'gia-dung', price: 1550000, art: 'fryer' },
  { sku: 'SUNHOUSE-NC', name: 'Nồi cơm điện Sunhouse 1.8L', shop: 'sunhouse', category: 'gia-dung', price: 890000, art: 'cooker' },
  { sku: 'TZ-BUDS', name: 'Tai nghe TechZone Buds', shop: 'techzone', category: 'dien-tu', price: 990000, art: 'buds' },
  { sku: 'BABYCARE-XL', name: 'Tã BabyCare XL 60 miếng', shop: 'babycare', category: 'me-be', price: 420000, art: 'diaper' },
]
const SHOPS = { glow: 'Glow Official', sonxinh: 'Son Xinh', airchef: 'AirChef Mall', sunhouse: 'Sunhouse', techzone: 'TechZone', babycare: 'BabyCare' }
const CATEGORIES = { 'my-pham': 'Mỹ phẩm', 'gia-dung': 'Gia dụng', 'dien-tu': 'Điện tử', 'me-be': 'Mẹ & bé' }
const PROVIDERS = [
  { id: 'ghn', name: 'GHN', fee: 35000 },
  { id: 'ghtk', name: 'GHTK', fee: 30000 },
  { id: 'vtp', name: 'Viettel Post', fee: 32000 },
  { id: 'ahamove', name: 'Ahamove', fee: 45000 },
]

function world({ prices = {}, fees = {} } = {}) {
  return {
    version: 1,
    products: PRODUCTS.map((p) => ({ ...p, price: prices[p.sku] ?? p.price })),
    shops: { ...SHOPS }, categories: { ...CATEGORIES },
    providers: PROVIDERS.map((p) => ({ ...p, fee: fees[p.id] ?? p.fee })),
    priceRules: [], offers: [],
    stacking: { default: 'allow', rules: [], max_offers: null },
    contracts: [],
  }
}

const priceRule = (r) => ({ kind: 'flash', team: 'merchandising', enabled: true, segments: null, description: '', ...ALL_DAY, ...r })
const offer = (o) => ({
  code: '', description: '', enabled: true, ...ALL_DAY,
  scope: {}, scope_mode: 'items', segments: null,
  min_spend: 0, min_spend_basis: 'eligible_current', min_spend_after: [],
  discount: { type: 'fixed', value: 0, cap: null }, discount_basis: 'remaining',
  providers: null, budget: null, uses: null, group: null, auto: false, order: 50,
  ...o,
})

const FLASH = (prices, extra = {}) => priceRule({ id: 'FLASH-2022', name: 'Flash Sale 20–22h', start: T('20:00'), end: T('22:00'), prices, description: 'Khung flash chính của sàn ngày 11.11.', ...extra })
const FREESHIP = (extra = {}) => offer({
  id: 'FREESHIP', code: 'FREESHIP', name: 'Freeship Xtra', kind: 'freeship', team: 'logistics',
  description: 'Hỗ trợ phí giao cho đơn đủ giá trị.', min_spend: 300000, min_spend_basis: 'cart_current',
  discount: { type: 'fixed', value: 35000, cap: null }, providers: ['ghn', 'ghtk'], order: 90, ...extra,
})
const SAN10 = (extra = {}) => offer({
  id: 'SAN10', code: 'SAN10', name: 'Voucher sàn 10%', kind: 'platform', team: 'marketing',
  description: 'Giảm 10% cho đơn từ 500.000đ.', min_spend: 500000, discount: { type: 'percent', value: 10, cap: 150000 }, order: 30, ...extra,
})
const BD20 = (extra = {}) => offer({
  id: 'BD20', code: 'BD20', name: 'Brand Day −20%', kind: 'brand_day', team: 'seller_ops', auto: true,
  description: 'Giảm 20% toàn bộ sản phẩm của shop trong Brand Day.', discount: { type: 'percent', value: 20, cap: null }, order: 10, ...extra,
})

const has = (cfg, id) => cfg.offers.find((o) => o.id === id)
const enabled = (id) => (cfg) => !!has(cfg, id)?.enabled
const enable = (id, alsoSelect = false) => (on, cfg, ctx) => ({
  patches: [{ target: 'offer', id, path: 'enabled', value: on }],
  ctx: alsoSelect ? { selected: on ? [...new Set([...ctx.selected, id])] : ctx.selected.filter((x) => x !== id) } : null,
})

export const SCENARIOS = [
  {
    id: 'A', title: 'Flash Sale rẻ hơn nhưng khách trả nhiều hơn',
    teams: ['merchandising', 'seller_ops', 'logistics'], campaigns: ['FLASH-2022', 'GLOW30K', 'FREESHIP'],
    observe: 'Tua sang 20:00. Serum rẻ đi 31.000đ nhưng giỏ rớt dưới 300.000đ: mất voucher Glow và freeship, khách trả thêm.',
    build() {
      const config = world()
      config.priceRules.push(FLASH({ 'GLOW-SERUM': 289000 }))
      config.offers.push(
        offer({ id: 'GLOW30K', code: 'GLOW30K', name: 'Voucher shop Glow', kind: 'shop', team: 'seller_ops', description: 'Giảm 30.000đ cho đơn hàng shop Glow từ 300.000đ.', scope: { shops: ['glow'] }, min_spend: 300000, discount: { type: 'fixed', value: 30000, cap: null }, order: 20 }),
        FREESHIP(),
        SAN10({ enabled: false }),
        BD20({ enabled: false, scope: { shops: ['glow'] } }),
      )
      config.contracts = [
        { contract_id: 'c-glow-min', label: 'Ngưỡng GLOW30K', team: 'seller_ops', target: 'offer', id: 'GLOW30K', path: 'min_spend', expected: 300000 },
        { contract_id: 'c-fs-min', label: 'Ngưỡng Freeship', team: 'logistics', target: 'offer', id: 'FREESHIP', path: 'min_spend', expected: 300000 },
        { contract_id: 'c-flash-glow', label: 'Giá flash Serum Glow', team: 'merchandising', target: 'priceRule', id: 'FLASH-2022', path: 'prices.GLOW-SERUM', expected: 289000 },
      ]
      return { config, ctx: { now: T('19:00'), segment: 'REGULAR', provider: 'ghn', lines: [{ sku: 'GLOW-SERUM', qty: 1 }], selected: ['GLOW30K', 'FREESHIP'] } }
    },
    compare: { label: 'Chỉ đổi giờ: 19:00 → 20:30', before: { now: T('19:00') }, after: { now: T('20:30') } },
    controls: [{ label: '2 serum (giỏ vẫn trên ngưỡng)', ctx: { lines: [{ sku: 'GLOW-SERUM', qty: 2 }] } }],
  },
  {
    id: 'B', title: 'Flash Sale làm mất voucher shop',
    teams: ['merchandising', 'seller_ops'], campaigns: ['FLASH-2022', 'AIRCHEF100K'],
    observe: 'Giá flash 1.490.000đ thấp hơn ngưỡng 1.500.000đ của voucher shop. Bật thêm voucher sàn hoặc Brand Day để xem số đổi thế nào.',
    build() {
      const config = world({ fees: { ghn: 0, ghtk: 0, vtp: 0, ahamove: 0 } })
      config.priceRules.push(FLASH({ 'AIRCHEF-6L': 1490000 }))
      config.offers.push(
        offer({ id: 'AIRCHEF100K', code: 'AIRCHEF100K', name: 'Voucher shop AirChef', kind: 'shop', team: 'seller_ops', description: 'Giảm 100.000đ cho đơn AirChef từ 1.500.000đ.', scope: { shops: ['airchef'] }, min_spend: 1500000, discount: { type: 'fixed', value: 100000, cap: null }, order: 20 }),
        SAN10({ enabled: false, scope: { categories: ['gia-dung'] } }),
        BD20({ enabled: false, scope: { shops: ['airchef'] } }),
      )
      return { config, ctx: { now: T('19:00'), segment: 'REGULAR', provider: 'ghn', lines: [{ sku: 'AIRCHEF-6L', qty: 1 }], selected: ['AIRCHEF100K'] } }
    },
    compare: { label: 'Chỉ đổi giờ: 19:00 → 20:30', before: { now: T('19:00') }, after: { now: T('20:30') } },
    note: 'Phí giao 0đ trong kịch bản này để cô lập phép tính.',
    toggles: [
      { id: 'san', label: 'Bật voucher sàn SAN10 (khách chọn)', isOn: enabled('SAN10'), set: enable('SAN10', true) },
      { id: 'bd', label: 'Bật Brand Day −20% (tự động)', isOn: enabled('BD20'), set: enable('BD20') },
    ],
  },
  {
    id: 'C', title: 'Hai voucher loại trừ nhau',
    teams: ['marketing', 'seller_ops'], campaigns: ['SAN10', 'BD20'],
    observe: 'Chọn SAN10 thì BD20 bị khóa và ngược lại. Cho phép cộng dồn trong Admin rồi chọn cả hai.',
    build() {
      const config = world()
      config.offers.push(SAN10(), BD20({ auto: false, scope: { shops: ['sunhouse'] }, name: 'Brand Day Sunhouse −20%' }))
      config.stacking.rules.push({ a: 'SAN10', b: 'BD20', mode: 'deny' })
      config.contracts = [{ contract_id: 'c-stack', label: 'Cộng dồn SAN10 + BD20', team: 'marketing', target: 'stacking', pair: ['SAN10', 'BD20'], expected: 'deny' }]
      return { config, ctx: { now: T('21:30'), segment: 'REGULAR', provider: 'ghn', lines: [{ sku: 'SUNHOUSE-NC', qty: 1 }], selected: [] } }
    },
    toggles: [{
      id: 'stack', label: 'Cho phép cộng SAN10 với BD20',
      isOn: (cfg) => pairMode(cfg, 'SAN10', 'BD20') === 'allow',
      set: (on, cfg) => ({ patches: [setPairMode(cfg, 'SAN10', 'BD20', on ? 'allow' : 'deny')] }),
    }],
  },
  {
    id: 'D', title: 'Thứ tự ưu đãi làm thay đổi kết quả',
    teams: ['seller_ops', 'marketing'], campaigns: ['TZ50K', 'SAN10'],
    observe: 'Giỏ 500.000đ: giảm 50.000đ trước rồi 10% ra 405.000đ; 10% trước rồi 50.000đ ra 400.000đ.',
    build() {
      const config = world({ prices: { 'TZ-BUDS': 500000 }, fees: { ghn: 0, ghtk: 0, vtp: 0, ahamove: 0 } })
      config.offers.push(
        offer({ id: 'TZ50K', code: 'TZ50K', name: 'Voucher shop TechZone', kind: 'shop', team: 'seller_ops', description: 'Giảm 50.000đ cho đơn TechZone.', scope: { shops: ['techzone'] }, discount: { type: 'fixed', value: 50000, cap: null }, order: 10 }),
        SAN10({ min_spend: 0, discount: { type: 'percent', value: 10, cap: null }, description: 'Giảm 10%, không giới hạn mức giảm.', order: 20 }),
      )
      return { config, ctx: { now: T('21:00'), segment: 'REGULAR', provider: 'ghn', lines: [{ sku: 'TZ-BUDS', qty: 1 }], selected: ['TZ50K', 'SAN10'] } }
    },
    note: 'Phí giao 0đ trong kịch bản này để cô lập phép tính.',
    toggles: [{
      id: 'order', label: 'Tính giảm 10% trước giảm cố định',
      isOn: (cfg) => has(cfg, 'SAN10').order < has(cfg, 'TZ50K').order,
      set: (on) => ({ patches: [{ target: 'offer', id: 'SAN10', path: 'order', value: on ? 5 : 20 }] }),
    }],
  },
  {
    id: 'E', title: 'Giỏ hỗn hợp và phạm vi theo dòng hàng',
    teams: ['marketing'], campaigns: ['VIP15'],
    observe: 'Voucher VIP chỉ giảm mỹ phẩm. Tai nghe không được giảm nhưng không được làm mất ưu đãi của mỹ phẩm.',
    build() {
      const config = world()
      config.offers.push(offer({ id: 'VIP15', code: 'VIP15', name: 'Ưu đãi VIP mỹ phẩm', kind: 'segment', team: 'marketing', description: 'Khách VIP giảm 15% trên mỹ phẩm, tối đa 100.000đ.', segments: ['VIP'], scope: { categories: ['my-pham'] }, discount: { type: 'percent', value: 15, cap: 100000 }, order: 40 }), FREESHIP())
      config.contracts = [{ contract_id: 'c-vip-scope', label: 'Cách áp phạm vi VIP15', team: 'marketing', target: 'offer', id: 'VIP15', path: 'scope_mode', expected: 'items' }]
      return { config, ctx: { now: T('15:00'), segment: 'VIP', provider: 'ghn', lines: [{ sku: 'GLOW-SERUM', qty: 1 }, { sku: 'SONXINH-VELVET', qty: 1 }, { sku: 'TZ-BUDS', qty: 1 }], selected: ['VIP15', 'FREESHIP'] } }
    },
    toggles: [{
      id: 'cart', label: 'Rule lỗi: chặn cả giỏ nếu có hàng ngoài mỹ phẩm',
      isOn: (cfg) => has(cfg, 'VIP15').scope_mode === 'cart',
      set: (on) => ({ patches: [{ target: 'offer', id: 'VIP15', path: 'scope_mode', value: on ? 'cart' : 'items' }] }),
    }],
  },
  {
    id: 'F', title: 'Đổi đơn vị vận chuyển làm mất freeship',
    teams: ['logistics'], campaigns: ['FREESHIP'],
    observe: 'Freeship chỉ hỗ trợ GHN và GHTK. Khách chọn Viettel Post thì mất hỗ trợ; thêm Viettel Post trong Admin để khôi phục.',
    build() {
      const config = world()
      config.offers.push(FREESHIP())
      return { config, ctx: { now: T('10:00'), segment: 'REGULAR', provider: 'ghn', lines: [{ sku: 'BABYCARE-XL', qty: 1 }], selected: ['FREESHIP'] } }
    },
    compare: { label: 'Khách đổi GHN → Viettel Post', before: { provider: 'ghn' }, after: { provider: 'vtp' } },
    toggles: [{
      id: 'vtp', label: 'Thêm Viettel Post vào freeship',
      isOn: (cfg) => has(cfg, 'FREESHIP').providers.includes('vtp'),
      set: (on, cfg) => ({ patches: [{ target: 'offer', id: 'FREESHIP', path: 'providers', value: on ? [...has(cfg, 'FREESHIP').providers, 'vtp'] : has(cfg, 'FREESHIP').providers.filter((p) => p !== 'vtp') }] }),
    }],
  },
  {
    id: 'G', title: 'Campaign chồng thời gian',
    teams: ['seller_ops', 'merchandising'], campaigns: ['SHOP-AIRCHEF', 'FLASH-2022', 'BD20', 'AIRCHEF100K'],
    observe: 'Giá shop cả ngày, flash 20–22h, Brand Day 21–23h. Tua lần lượt 19:59, 20:00, 21:00, 22:00, 23:00.',
    build() {
      const config = world({ prices: { 'AIRCHEF-6L': 2490000 } })
      config.priceRules.push(
        priceRule({ id: 'SHOP-AIRCHEF', name: 'Khuyến mãi shop AirChef', kind: 'shop_price', team: 'seller_ops', prices: { 'AIRCHEF-6L': 1550000 }, description: 'Giá khuyến mãi của shop, chạy cả ngày.' }),
        FLASH({ 'AIRCHEF-6L': 1490000 }),
      )
      config.offers.push(
        BD20({ start: T('21:00'), end: T('23:00'), scope: { shops: ['airchef'] } }),
        offer({ id: 'AIRCHEF100K', code: 'AIRCHEF100K', name: 'Voucher shop AirChef', kind: 'shop', team: 'seller_ops', scope: { shops: ['airchef'] }, min_spend: 1500000, discount: { type: 'fixed', value: 100000, cap: null }, order: 20, description: 'Giảm 100.000đ cho đơn AirChef từ 1.500.000đ.' }),
      )
      return { config, ctx: { now: T('19:59'), segment: 'REGULAR', provider: 'ghn', lines: [{ sku: 'AIRCHEF-6L', qty: 1 }], selected: ['AIRCHEF100K'] } }
    },
    times: ['19:59', '20:00', '21:00', '22:00', '23:00'],
    compare: { label: 'Chỉ đổi giờ: 19:59 → 21:00', before: { now: T('19:59') }, after: { now: T('21:00') } },
  },
  {
    id: 'H', title: 'Nhóm khách đổi điều kiện ưu đãi',
    teams: ['marketing'], campaigns: ['NEWBIE50K'],
    observe: 'Đổi Khách thường → Khách hàng mới → Khách VIP. Xóa điều kiện nhóm khách trong Admin để tạo lỗi "voucher khách mới áp cho tất cả".',
    build() {
      const config = world()
      config.offers.push(offer({ id: 'NEWBIE50K', code: 'NEWBIE50K', name: 'Quà chào khách mới', kind: 'segment', team: 'marketing', description: 'Giảm 50.000đ cho đơn đầu tiên từ 200.000đ.', segments: ['NEW'], min_spend: 200000, discount: { type: 'fixed', value: 50000, cap: null }, order: 40 }))
      config.contracts = [{ contract_id: 'c-newbie-seg', label: 'Nhóm khách của NEWBIE50K', team: 'marketing', target: 'offer', id: 'NEWBIE50K', path: 'segments', expected: ['NEW'] }]
      return { config, ctx: { now: T('14:00'), segment: 'REGULAR', provider: 'ghtk', lines: [{ sku: 'BABYCARE-XL', qty: 1 }], selected: ['NEWBIE50K'] } }
    },
    toggles: [{
      id: 'seg', label: 'Lỗi: xóa điều kiện nhóm khách của NEWBIE50K',
      isOn: (cfg) => !has(cfg, 'NEWBIE50K').segments?.length,
      set: (on) => ({ patches: [{ target: 'offer', id: 'NEWBIE50K', path: 'segments', value: on ? null : ['NEW'] }] }),
    }],
  },
  {
    id: 'I', title: 'Tạm dừng hoặc hết ngân sách',
    teams: ['marketing'], campaigns: ['SAN10'],
    observe: 'SAN10 đang hợp lệ. Tạm dừng, hoặc để ngân sách còn ít hơn khoản giảm 89.000đ: voucher bị khóa đúng lý do, không giảm một phần.',
    build() {
      const config = world()
      config.offers.push(SAN10({ budget: 2000000, uses: 100 }))
      return { config, ctx: { now: T('16:00'), segment: 'REGULAR', provider: 'ghn', lines: [{ sku: 'SUNHOUSE-NC', qty: 1 }], selected: ['SAN10'] } }
    },
    toggles: [
      { id: 'pause', label: 'Marketing tạm dừng SAN10', isOn: (cfg) => !has(cfg, 'SAN10').enabled, set: (on) => ({ patches: [{ target: 'offer', id: 'SAN10', path: 'enabled', value: !on }] }) },
      { id: 'budget', label: 'Ngân sách SAN10 chỉ còn 50.000đ', isOn: (cfg) => has(cfg, 'SAN10').budget === 50000, set: (on) => ({ patches: [{ target: 'offer', id: 'SAN10', path: 'budget', value: on ? 50000 : 2000000 }] }) },
    ],
  },
  {
    id: 'J', title: 'Flash Sale hoạt động đúng (đối chứng)',
    teams: ['merchandising', 'seller_ops', 'logistics'], campaigns: ['FLASH-2022', 'GLOW30K', 'FREESHIP'],
    observe: 'Giá flash giảm nhưng giỏ vẫn trên ngưỡng 300.000đ: giữ voucher và freeship, khách trả ít hơn thật.',
    build() {
      const config = world({ prices: { 'GLOW-SERUM': 380000 } })
      config.priceRules.push(FLASH({ 'GLOW-SERUM': 349000 }))
      config.offers.push(
        offer({ id: 'GLOW30K', code: 'GLOW30K', name: 'Voucher shop Glow', kind: 'shop', team: 'seller_ops', description: 'Giảm 30.000đ cho đơn hàng shop Glow từ 300.000đ.', scope: { shops: ['glow'] }, min_spend: 300000, discount: { type: 'fixed', value: 30000, cap: null }, order: 20 }),
        FREESHIP(),
      )
      return { config, ctx: { now: T('19:00'), segment: 'REGULAR', provider: 'ghn', lines: [{ sku: 'GLOW-SERUM', qty: 1 }], selected: ['GLOW30K', 'FREESHIP'] } }
    },
    compare: { label: 'Chỉ đổi giờ: 19:00 → 20:30', before: { now: T('19:00') }, after: { now: T('20:30') } },
  },
]

export const scenarioById = (id) => SCENARIOS.find((s) => s.id === id)
