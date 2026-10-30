// FlashSRE Ops: mô phỏng dòng đơn của một khung chiến dịch và agent điều tra kết quả kinh doanh bất thường.
// Hệ thống chạy đúng cấu hình; sự cố đến từ nhu cầu thực tế khác dự báo. Mọi con số trên trang tính từ mô hình dưới đây,
// và agent chỉ đọc số liệu đã xảy ra tới thời điểm hiện tại (cộng giả định dự báo nó ghi rõ).

export const DAY = '2026-11-11'
export const T0 = Date.parse(`${DAY}T20:00:00+07:00`)
export const MIN = 60_000
export const N = 240 // 20:00–24:00, mỗi bước một phút

const p2 = (n) => String(n).padStart(2, '0')
export const clock = (t) => { const m = 20 * 60 + Math.round(t); return `${p2(Math.floor(m / 60) % 24 === 0 && m >= 1440 ? 24 : Math.floor(m / 60))}:${p2(m % 60)}` }
export const vnd = (n) => `${Math.round(n).toLocaleString('vi-VN')}đ`
export const money = (n) => {
  const a = Math.abs(n)
  const s = n < 0 ? '−' : ''
  if (a >= 1e9) return `${s}${(a / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`
  if (a >= 1e6) return `${s}${(a / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`
  return `${s}${vnd(a)}`
}
export const int = (n) => Math.round(n).toLocaleString('vi-VN')
export const pct = (n, d = 1) => `${(n * 100).toLocaleString('vi-VN', { maximumFractionDigits: d })}%`
const sum = (xs, f = (x) => x) => xs.reduce((s, x) => s + f(x), 0)
const mean = (xs, f) => (xs.length ? sum(xs, f) / xs.length : 0)

// Khách mở trang vào đầu mỗi giờ nhiều hơn (khung Flash Sale theo giờ)
export const shape = (t) => 1 + 0.35 * Math.exp(-(t % 60) / 12)
export const SHAPE_SUM = sum(Array.from({ length: N }, (_, t) => shape(t)))

export const TEAMS = { marketing: 'Marketing', growth: 'Growth', finance: 'Finance', logistics: 'Logistics', seller_ops: 'Seller Ops' }
export const ROLES = { marketing_lead: 'Trưởng Marketing', growth_lead: 'Trưởng Growth', finance: 'Finance' }
export const ROLE_TEAM = { marketing_lead: 'marketing', growth_lead: 'growth', finance: 'finance' }

// ============================================================== Kịch bản 1: Freeship hết ngân sách sớm
// Tỷ lệ chốt đơn theo phí ship khách còn phải trả (r): có freeship đủ thì ~80%, mất freeship thì ~58%
export const conv1 = (r) => 0.52 + 0.28 * Math.exp(-r / 12000)
export const FEES = [[12000, 0.25], [16000, 0.25], [22000, 0.25], [28000, 0.10], [36000, 0.15]] // phí ship thực tế, tỷ trọng
const ELIGIBLE_AT = { 199000: 1, 299000: 0.55 } // tỷ lệ giỏ đạt đơn tối thiểu

export const BUDGET = {
  id: 'budget', title: 'Freeship hết ngân sách sớm',
  lede: 'Freeship tối đa 30.000đ cho đơn từ 199.000đ, ngân sách 300 triệu cho 20:00–24:00. Backend, QC, giới hạn ngân sách đều đúng.',
  campaign: { code: 'FREESHIP30', name: 'Freeship tối đa 30.000đ, đơn từ 199.000đ', owner: 'marketing', budget: 300e6, cap: 30000, min_order: 199000, planned_uses: 15000, aov: 285000 },
  related: [
    { code: 'SAN50K', name: 'Voucher sàn −50.000đ, đơn từ 500.000đ', owner: 'marketing', funding: 'platform', budget: 200e6, value: 50000, planned_uses: 4000, pacing: 0.58 },
    { code: 'BANK20', name: '−20.000đ khi trả qua ngân hàng đối tác', owner: 'finance', funding: 'partner', budget: 100e6, value: 20000, planned_uses: 5000, pacing: 1.0 },
  ],
  policy: {
    transfer_max_share: 0.3, // chuyển tối đa 30% ngân sách nguồn, chỉ giữa các chương trình sàn tự tài trợ
    transfer_roles: ['marketing_lead', 'finance'],
    benefit_roles: ['marketing_lead'],
  },
  event: { label: 'KOL đăng video giới thiệu deal lúc 20:06', at: 6, ramp: 8, peak: 11, tau: 52 },
  slo: { label: 'Khung giờ nào đến 24:00 cũng còn freeship', target: 1 },
}

// Lượt mở giỏ đủ điều kiện theo kế hoạch của chương trình, hiệu chỉnh để kế hoạch đúng số lượt dùng dự kiến
const fullConv = (cap) => sum(FEES, ([fee, w]) => w * conv1(Math.max(0, fee - cap)))
const FULL_CONV = fullConv(BUDGET.campaign.cap)
export const planAttemptsOf = (sc, t) => (sc.campaign.planned_uses / fullConv(sc.campaign.cap) / SHAPE_SUM) * shape(t)
export const planAttempts = (t) => planAttemptsOf(BUDGET, t)
export function viral(t, e = BUDGET.event) {
  if (t < e.at) return 1
  if (t < e.at + e.ramp) return 1 + ((e.peak - 1) * (t - e.at)) / e.ramp
  return 1 + (e.peak - 1) * Math.exp(-(t - e.at - e.ramp) / e.tau)
}

// Cấu hình tại phút t = cấu hình gốc + các quyết định đã duyệt trước đó
function cfgAt1(sc, decisions, t) {
  const c = { cap: sc.campaign.cap, min_order: sc.campaign.min_order, slots: false }
  for (const d of decisions) if (d.t <= t) Object.assign(c, d.change.cap != null ? { cap: d.change.cap } : {}, d.change.min_order != null ? { min_order: d.change.min_order } : {}, d.change.slots ? { slots: true } : {})
  return c
}
// Một phút của chiến dịch: nhu cầu, ai được freeship (tới khi hết ngân sách), ai chốt đơn
function minute1(sc, attempts, cfg, left) {
  const elig = ELIGIBLE_AT[cfg.min_order] ?? 1
  let wantCost = 0
  let wantUses = 0
  for (const [fee, w] of FEES) {
    const a = attempts * elig * w
    const c = conv1(Math.max(0, fee - cfg.cap))
    wantUses += a * c
    wantCost += a * c * Math.min(fee, cfg.cap)
  }
  const active = left >= cfg.cap
  const cover = !active ? 0 : wantCost <= left ? 1 : left / wantCost
  let orders = 0
  for (const [fee, w] of FEES) {
    const a = attempts * w
    const withFs = conv1(Math.max(0, fee - cfg.cap))
    const without = conv1(fee)
    orders += a * elig * (cover * withFs + (1 - cover) * without) + a * (1 - elig) * without
  }
  return { uses: wantUses * cover, spend: wantCost * cover, orders, active: cover > 0, cover, want: wantUses }
}

// from: số liệu đã quan sát tới phút from.t (vd từ Medusa); mô phỏng tiếp từ trạng thái đó
export function simulateBudget(sc, { event = true, decisions = [], demand = null, from = null } = {}) {
  const rows = from ? from.rows.slice(0, from.t + 1) : []
  const last = rows.at(-1)
  let left = last ? last.left : sc.campaign.budget
  let slot = last?.slots ? last.slot_left : null // khung giờ: ngân sách còn lại chia đều cho các giờ còn lại, mở lại đầu mỗi giờ
  let san = last?.san_spent ?? 0
  let bank = last?.bank_spent ?? 0
  let exhausted = from ? rows.find((r) => r.left < r.cap)?.t ?? null : null
  for (let t = rows.length; t < N; t++) {
    const cfg = cfgAt1(sc, decisions, t)
    for (const d of decisions) if (d.t === t && d.change.add_budget) left += d.change.add_budget
    if (cfg.slots && (slot == null || t % 60 === 0)) slot = left / Math.ceil((N - t) / 60)
    const m = demand ? demand(t) : event ? viral(t, sc.event) : 1
    const plan = planAttemptsOf(sc, t)
    const attempts = plan * m
    const r = minute1(sc, attempts, cfg, cfg.slots ? Math.min(left, slot) : left)
    left -= r.spend
    if (cfg.slots) slot -= r.spend
    if (exhausted == null && left < cfg.cap) exhausted = t + 1
    const sanRate = (sc.related[0].planned_uses / SHAPE_SUM) * shape(t) * sc.related[0].pacing
    san += sanRate * sc.related[0].value
    bank += (sc.related[1].planned_uses / SHAPE_SUM) * shape(t) * sc.related[1].pacing * sc.related[1].value
    rows.push({
      t, attempts, plan_attempts: plan, ratio: m, kol_share: 1 - 1 / m,
      uses: r.uses, plan_uses: plan * fullConv(sc.campaign.cap), want: r.want, orders: r.orders, spend: r.spend, left, slot_left: cfg.slots ? slot : null, cap: cfg.cap, min_order: cfg.min_order, slots: cfg.slots,
      active: r.active, cover: r.cover, abandon: 1 - r.orders / attempts, gmv: r.orders * sc.campaign.aov,
      plan_left: sc.campaign.budget * (1 - sum(Array.from({ length: t + 1 }, (_, k) => shape(k))) / SHAPE_SUM),
      san_spent: san, bank_spent: bank, support_per_use: r.uses ? r.spend / r.uses : 0,
      uses_per_customer: 1.02, // một khách một lượt theo rule; số đo từ sổ đơn, không đổi giữa kế hoạch và thực tế
    })
  }
  return { rows, exhausted }
}
// Tỷ lệ khung giờ (từ phút from tới 24:00) còn freeship ở một thời điểm nào đó trong giờ
export function hourCoverage(rows, from) {
  const hours = [...new Set(rows.slice(from).map((r) => Math.floor(r.t / 60)))]
  return hours.filter((h) => rows.some((r) => r.t >= from && Math.floor(r.t / 60) === h && r.active)).length / hours.length
}

// ============================================================== Kịch bản 2: VIP 15% + Freeship, khách VIP mua hàng cồng kềnh
export const SIZES = {
  small: { label: 'Hàng nhỏ (≤ 2kg)', aov: 320000, fee: 24000, e: 2.0 },
  medium: { label: 'Hàng vừa (2–10kg)', aov: 950000, fee: 58000, e: 3.5 },
  bulky: { label: 'Hàng cồng kềnh (> 10kg)', aov: 5200000, fee: 190000, e: 12 },
}
export const SEGS = { REG: 'Khách thường', VIP: 'Khách VIP' }
const MIX = { REG: { small: 0.82, medium: 0.15, bulky: 0.03 }, VIP: { small: 0.70, medium: 0.22, bulky: 0.08 } }
const BASE_PER_MIN = 120
const VIP_SHARE = 0.12

export const MARGIN = {
  id: 'margin', title: 'Hai chương trình đúng, lợi nhuận hụt',
  lede: 'Marketing chạy VIP −15% (tối đa 600.000đ). Growth chạy Freeship toàn phần cho đơn từ 299.000đ. Cả hai đã duyệt, đã kiểm thử, được phép cộng.',
  aov_threshold: 299000,
  campaigns: [
    { code: 'VIP15', name: 'Khách VIP −15%, tối đa 600.000đ', owner: 'marketing', rate: 0.15, cap: 600000 },
    { code: 'FREESHIP_ALL', name: 'Freeship toàn phần, đơn từ 299.000đ', owner: 'growth', min_order: 299000 },
  ],
  take_rate: 0.11, // phí sàn + thanh toán + quảng cáo trên GMV
  plan_lift: 1.3, // kế hoạch: mỗi nhóm tăng 30% đơn, cơ cấu giỏ giữ như lịch sử
  target_share: 0.95, // mục tiêu lợi nhuận đóng góp = 95% kế hoạch
  event: { label: 'Khách VIP phản ứng mạnh với hàng cồng kềnh khi có cả hai ưu đãi', strong: true },
  slo: { label: 'Lợi nhuận đóng góp chiến dịch đạt mục tiêu', target: 1 },
}

// Ưu đãi một đơn nhận được theo cấu hình hiện hành
function benefits(sc, cfg, seg, size) {
  const s = SIZES[size]
  const vip = seg === 'VIP' && !(cfg.no_stack_bulky && size === 'bulky') ? Math.min(s.aov * sc.campaigns[0].rate, size === 'bulky' && cfg.vip_cap_bulky != null ? cfg.vip_cap_bulky : sc.campaigns[0].cap) : 0
  const shipCap = cfg.freeship_off ? 0 : size === 'bulky' && cfg.bulky_ship_cap != null ? cfg.bulky_ship_cap : Infinity
  let ship = s.aov >= sc.campaigns[1].min_order ? Math.min(s.fee, shipCap) : 0
  if (cfg.no_stack_bulky && size === 'bulky' && seg === 'VIP') ship = 0 // VIP hàng cồng kềnh chọn ưu đãi lớn hơn (VIP15), không cộng freeship
  return { vip, ship }
}
const lift = (sc, seg, size, b, strong) => {
  const s = SIZES[size]
  const e = strong ? s.e : Math.min(s.e, 3)
  return Math.exp(e * ((b.vip + b.ship) / (s.aov + s.fee)))
}
export function cellsOf(sc, cfg, strong) {
  const out = []
  for (const seg of Object.keys(SEGS)) for (const size of Object.keys(SIZES)) {
    const base = BASE_PER_MIN * (seg === 'VIP' ? VIP_SHARE : 1 - VIP_SHARE) * MIX[seg][size]
    const b = benefits(sc, cfg, seg, size)
    const s = SIZES[size]
    const orders = base * lift(sc, seg, size, b, strong)
    const per = sc.take_rate * s.aov - b.vip - b.ship
    out.push({ seg, size, base, orders, aov: s.aov, fee: s.fee, vip: b.vip, ship: b.ship, per, combo: [b.vip > 0 && 'VIP15', b.ship > 0 && 'FREESHIP_ALL'].filter(Boolean) })
  }
  return out
}
// Số đơn mỗi phút (trước dạng lưu lượng theo giờ) của một nhóm giỏ khi khách nhận ưu đãi b = { vip, ship }.
// Dùng cho bộ sinh đơn trên Medusa: b là số Medusa trả về cho giỏ báo giá, không phải số tính tay.
export function cellDemand(sc, seg, size, b, strong) {
  const base = BASE_PER_MIN * (seg === 'VIP' ? VIP_SHARE : 1 - VIP_SHARE) * MIX[seg][size]
  if (strong) return base * lift(sc, seg, size, b, true)
  return base * sc.plan_lift * (lift(sc, seg, size, b, false) / lift(sc, seg, size, benefits(sc, {}, seg, size), false))
}
// Kế hoạch: dự báo từng chương trình riêng, +30% đơn đồng đều, cơ cấu giỏ như lịch sử
export function planCells(sc) {
  const cfg = {}
  return cellsOf(sc, cfg, false).map((c) => ({ ...c, orders: c.base * sc.plan_lift }))
}
export const PLAN_PER_MIN = (sc) => sum(planCells(sc), (c) => c.orders * c.per)
export const marginTarget = (sc) => PLAN_PER_MIN(sc) * SHAPE_SUM * sc.target_share

function cfgAt2(decisions, t) {
  const c = {}
  for (const d of decisions) if (d.t <= t) Object.assign(c, d.change)
  return c
}
export function simulateMargin(sc, { event = true, decisions = [], from = null } = {}) {
  const rows = from ? from.rows.slice(0, from.t + 1) : []
  const plan = planCells(sc)
  let profit = rows.at(-1)?.cum ?? 0
  let planProfit = rows.at(-1)?.plan_cum ?? 0
  for (let t = rows.length; t < N; t++) {
    const cfg = cfgAt2(decisions, t)
    const k = shape(t)
    // không có hiệu ứng thì khách phản ứng đúng như kế hoạch (cơ cấu giỏ như lịch sử, +30% đơn); đổi cấu hình vẫn tác động theo độ co giãn thấp
    const ref = cellsOf(sc, {}, false)
    const cells = (event ? cellsOf(sc, cfg, true) : cellsOf(sc, cfg, false).map((c, i) => ({ ...c, orders: c.base * sc.plan_lift * (c.orders / ref[i].orders) })))
      .map((c) => ({ ...c, orders: c.orders * k }))
    const orders = sum(cells, (c) => c.orders)
    const p = sum(cells, (c) => c.orders * c.per)
    profit += p
    planProfit += sum(plan, (c) => c.orders * c.per) * k
    rows.push({
      t, cells, orders, plan_orders: sum(plan, (c) => c.orders) * k, gmv: sum(cells, (c) => c.orders * c.aov),
      profit: p, cum: profit, plan_cum: planProfit,
      ship_cost: sum(cells, (c) => c.orders * c.ship), discount: sum(cells, (c) => c.orders * c.vip),
      ship_per_order: sum(cells, (c) => c.orders * c.ship) / orders, plan_ship_per_order: sum(plan, (c) => c.orders * c.ship) / sum(plan, (c) => c.orders),
      bulky_share: sum(cells.filter((c) => c.size === 'bulky'), (c) => c.orders) / orders,
      plan_bulky_share: sum(plan.filter((c) => c.size === 'bulky'), (c) => c.orders) / sum(plan, (c) => c.orders),
      cfg,
    })
  }
  return { rows }
}

// ============================================================== Agent FlashSRE
// Phát hiện: chỉ dùng số liệu tới phút t
// ============================================================== Benchmark: chỉ số có mốc và ngưỡng, vượt ngưỡng đủ lâu thì agent tự mở sự cố
// Mốc lấy từ contract (kế hoạch đã duyệt) hoặc lịch sử vận hành. trigger: vượt ngưỡng này thì agent chạy; còn lại là bối cảnh.
const fmtX = (v) => `×${v.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}`
export const UNIT_FMT = { x: fmtX, time: (v) => (v >= N ? 'sau 24:00' : clock(v)), delta: (v) => `${v >= 0 ? '+' : '−'}${(Math.abs(v) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} điểm`, n: (v) => v.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) }
export const BENCHMARKS = {
  budget: [
    { id: 'burn_rate', label: 'Tốc độ tiêu ngân sách so kế hoạch', source: 'Contract: 300 tr chia theo lưu lượng dự kiến', unit: 'x', dir: 'up', warn: 1.5, breach: 2, sustain: 3, trigger: true },
    { id: 'exhaust_eta', label: 'Giờ dự kiến cạn ngân sách', source: 'Contract: ngân sách đủ đến 24:00', unit: 'time', dir: 'down', warn: N, breach: N * 0.75, sustain: 3, trigger: true },
    { id: 'traffic', label: 'Lượt mở giỏ so kế hoạch', source: 'Dự báo lưu lượng của chiến dịch', unit: 'x', dir: 'up', warn: 2, breach: 4, sustain: 3 },
    { id: 'uses_rate', label: 'Lượt dùng freeship mỗi phút so kế hoạch', source: 'Contract: 15.000 lượt', unit: 'x', dir: 'up', warn: 1.5, breach: 3, sustain: 3 },
    { id: 'abandon', label: 'Tỷ lệ bỏ giỏ so bình thường', source: 'Lịch sử: ~21,5% khi có freeship', unit: 'delta', dir: 'up', warn: 0.05, breach: 0.1, sustain: 3, min_t: 10 },
    { id: 'support', label: 'Trợ ship mỗi lượt so kế hoạch', source: 'Contract: ~20.000đ/lượt', unit: 'x', dir: 'up', warn: 1.15, breach: 1.3, sustain: 5 },
    { id: 'per_customer', label: 'Lượt freeship mỗi khách', source: 'Rule: 1 lượt/khách', unit: 'n', dir: 'up', warn: 1.05, breach: 1.2, sustain: 5 },
  ],
  margin: [
    { id: 'profit_proj', label: 'Lợi nhuận dự kiến cuối khung so mục tiêu', source: 'Contract: mục tiêu 95% kế hoạch', unit: 'x', dir: 'down', warn: 1, breach: 0.97, sustain: 5, min_t: 10, trigger: true },
    { id: 'margin_per_order', label: 'Lợi nhuận mỗi đơn so kế hoạch', source: 'Kế hoạch theo cơ cấu giỏ lịch sử', unit: 'x', dir: 'down', warn: 0.85, breach: 0.7, sustain: 5, min_t: 10 },
    { id: 'ship_per_order', label: 'Sàn trả phí ship mỗi đơn so kế hoạch', source: 'Kế hoạch: ~35.400đ/đơn', unit: 'x', dir: 'up', warn: 1.1, breach: 1.25, sustain: 5, min_t: 10 },
    { id: 'bulky_share', label: 'Tỷ trọng đơn hàng cồng kềnh so kế hoạch', source: 'Lịch sử: 3,6% đơn', unit: 'x', dir: 'up', warn: 1.5, breach: 2, sustain: 5, min_t: 10 },
    { id: 'vip_discount', label: 'Giảm VIP mỗi đơn so kế hoạch', source: 'Kế hoạch theo cơ cấu giỏ lịch sử', unit: 'x', dir: 'up', warn: 1.3, breach: 1.6, sustain: 5, min_t: 10 },
    { id: 'vip_share', label: 'Tỷ trọng đơn VIP so kế hoạch', source: 'Lịch sử: 12% đơn', unit: 'x', dir: 'up', warn: 1.3, breach: 1.6, sustain: 5, min_t: 10 },
  ],
}
const planCache = new WeakMap()
const planRowsOf = (sc) => {
  if (!planCache.has(sc)) planCache.set(sc, (sc.id === 'budget' ? simulateBudget(sc, { event: false }) : simulateMargin(sc, { event: false })).rows)
  return planCache.get(sc)
}
const prefix = (rows, f) => { const out = []; let acc = 0; for (const r of rows) { acc += f(r); out.push(acc) } return out }
const winSum = (pre, k, w) => pre[k] - (k - w >= 0 ? pre[k - w] : 0)
const cellSum = (r, f) => sum(r.cells.filter(f), (c) => c.orders)

// Giá trị từng benchmark ở mọi phút tới t, trạng thái và chuỗi phút vượt ngưỡng liên tiếp
export function evaluateBenchmarks(sc, rows, t) {
  const plan = planRowsOf(sc)
  const n = Math.min(t, rows.length - 1)
  const values = {}
  if (sc.id === 'budget') {
    const P = (f, xs = rows) => prefix(xs.slice(0, n + 1), f)
    const spend = P((r) => r.spend)
    const uses = P((r) => r.uses)
    const planUses = P((r) => r.plan_uses, plan)
    const attempts = P((r) => r.attempts)
    const planAtt = P((r) => r.plan_attempts, plan)
    const orders = P((r) => r.orders)
    const planOrders = P((r) => r.orders, plan)
    const planSpend = P((r) => sc.campaign.budget * shape(r.t) / SHAPE_SUM, plan)
    const support = sc.campaign.budget / sc.campaign.planned_uses
    for (let k = 0; k <= n; k++) {
      const w = Math.min(3, k + 1)
      const burn = winSum(spend, k, w) / w
      values[k] = {
        burn_rate: winSum(spend, k, w) / Math.max(1, winSum(planSpend, k, w)),
        exhaust_eta: rows[k].left < rows[k].cap ? k : burn > 0 ? Math.min(N, k + rows[k].left / burn) : N,
        traffic: winSum(attempts, k, w) / Math.max(1e-9, winSum(planAtt, k, w)),
        uses_rate: winSum(uses, k, w) / Math.max(1e-9, winSum(planUses, k, w)),
        abandon: (1 - winSum(orders, k, w) / Math.max(1e-9, winSum(attempts, k, w))) - (1 - winSum(planOrders, k, w) / Math.max(1e-9, winSum(planAtt, k, w))),
        support: uses[k] > 0 ? spend[k] / uses[k] / support : 1,
        per_customer: rows[k].uses_per_customer ?? 1,
      }
    }
  } else {
    const P = (f, xs = rows) => prefix(xs.slice(0, n + 1), f)
    const ord = P((r) => r.orders)
    const pOrd = P((r) => r.orders, plan)
    const ship = P((r) => r.ship_cost)
    const pShip = P((r) => r.ship_cost, plan)
    const disc = P((r) => r.discount)
    const pDisc = P((r) => r.discount, plan)
    const bulky = P((r) => cellSum(r, (c) => c.size === 'bulky'))
    const pBulky = P((r) => cellSum(r, (c) => c.size === 'bulky'), plan)
    const vip = P((r) => cellSum(r, (c) => c.seg === 'VIP'))
    const pVip = P((r) => cellSum(r, (c) => c.seg === 'VIP'), plan)
    const target = marginTarget(sc)
    for (let k = 0; k <= n; k++) {
      const per = (x, o) => (o[k] ? x / o[k] : 0)
      values[k] = {
        profit_proj: projectMargin(sc, rows, k) / target,
        margin_per_order: per(rows[k].cum, ord) / (per(plan[k].plan_cum, pOrd) || 1),
        ship_per_order: per(ship[k], ord) / (per(pShip[k], pOrd) || 1),
        bulky_share: per(bulky[k], ord) / (per(pBulky[k], pOrd) || 1),
        vip_discount: per(disc[k], ord) / (per(pDisc[k], pOrd) || 1),
        vip_share: per(vip[k], ord) / (per(pVip[k], pOrd) || 1),
      }
    }
  }
  return BENCHMARKS[sc.id].map((b) => {
    const series = []
    let streak = 0
    let fired = null
    for (let k = 0; k <= n; k++) {
      const v = values[k][b.id]
      const early = k < (b.min_t ?? 1)
      const over = (x) => (b.dir === 'up' ? v > x : v < x)
      const st = early ? 'ok' : over(b.breach) ? 'breach' : over(b.warn) ? 'warn' : 'ok'
      streak = st === 'breach' ? streak + 1 : 0
      if (fired == null && streak >= b.sustain) fired = k
      series.push({ k, v, st })
    }
    const now = series.at(-1)
    return { ...b, series, value: now?.v, status: now?.st ?? 'ok', fired, fmt: UNIT_FMT[b.unit] }
  })
}

// Agent tự mở sự cố khi một benchmark kích hoạt vượt ngưỡng đủ số phút liên tiếp
export function detect(sc, rows, t) {
  const bench = evaluateBenchmarks(sc, rows, t)
  const fired = bench.filter((b) => b.trigger && b.fired != null).sort((a, b) => a.fired - b.fired)[0]
  if (!fired) return null
  const k = fired.fired
  const at = (id) => bench.find((b) => b.id === id).series[k]
  const told = sc.id === 'budget' ? ['burn_rate', 'exhaust_eta'] : ['profit_proj']
  const also = bench.filter((b) => !told.includes(b.id) && b.series[k]?.st === 'breach').map((b) => `${b.label} ${b.fmt(b.series[k].v)}`)
  let signal
  if (sc.id === 'budget') {
    const burn = at('burn_rate').v
    const eta = at('exhaust_eta').v
    signal = `Benchmark "${fired.label}" vượt ngưỡng ${fired.sustain} phút liền: tốc độ tiêu ngân sách gấp ${burn.toFixed(1)} lần kế hoạch; với tốc độ này ngân sách cạn lúc ${clock(eta)} thay vì 24:00.`
  } else {
    const target = marginTarget(sc)
    const proj = at('profit_proj').v * target
    signal = `Benchmark "${fired.label}" vượt ngưỡng ${fired.sustain} phút liền: lợi nhuận đóng góp dự kiến đến 24:00 là ${money(proj)}, dưới mục tiêu ${money(target)} (${pct(proj / target - 1)}).`
  }
  if (also.length) signal += ` Cùng lúc vượt ngưỡng: ${also.join('; ')}.`
  return { t: k, onset: sc.id === 'budget' ? firstAbove(rows, k, (x) => x.ratio > 1.05) : 0, signal, benchmark: fired.id, breached: bench.filter((b) => b.series[k]?.st === 'breach').map((b) => b.id) }
}
const firstAbove = (rows, upto, f) => { for (let k = 0; k <= upto; k++) if (f(rows[k])) return k; return 0 }
// Dự báo lợi nhuận cuối khung: luỹ kế + tốc độ 10 phút gần nhất, điều chỉnh theo dạng lưu lượng theo giờ
function projectMargin(sc, rows, t) {
  const last = rows.slice(Math.max(0, t - 9), t + 1)
  const perShape = sum(last, (r) => r.profit) / sum(last, (r) => shape(r.t))
  let rest = 0
  for (let k = t + 1; k < N; k++) rest += perShape * shape(k)
  return rows[t].cum + rest
}

// Dự báo nhu cầu của agent cho phần còn lại của khung (kịch bản 1): tỷ lệ vượt kế hoạch quan sát được
// giảm dần với nửa vòng đời 40 phút (giả định từ các đợt viral trước), nếu còn đang tăng thì giữ đỉnh thêm 5 phút
const HALF_LIFE = 40
function demandForecast(rows, t) {
  const last = rows.slice(Math.max(0, t - 2), t + 1)
  const ratio = mean(last, (r) => r.attempts / r.plan_attempts)
  const rising = t >= 2 && rows[t].ratio > rows[t - 2].ratio * 1.02
  const hold = rising ? 5 : 0
  return (k) => (k <= t ? rows[k].ratio : 1 + (ratio * (rising ? 1.25 : 1) - 1) * Math.pow(0.5, Math.max(0, k - t - hold) / HALF_LIFE))
}

// Các bước điều tra: mỗi bước hỏi một hệ thống, kết quả tính từ số liệu tới phút t
// facts: dữ kiện từ hệ thống thật nếu có (nhật ký cấu hình, bảng phí ship); không có thì dùng giá trị của mô hình
export function investigate(sc, sim, t, facts = {}) {
  const rows = sim.rows
  const r = rows[t]
  const changes = facts.changes ?? []
  const changeText = changes.length ? `${changes.length} thay đổi: ${changes.slice(0, 3).map((c) => c.text).join('; ')}.` : null
  if (sc.id === 'budget') {
    const used = sc.campaign.budget - r.left
    const planUsed = sc.campaign.budget - r.plan_left
    const last5 = rows.slice(Math.max(0, t - 4), t + 1)
    const supNow = mean(last5.filter((x) => x.uses > 0), (x) => x.support_per_use)
    const supPlan = sum(FEES, ([fee, w]) => w * conv1(Math.max(0, fee - sc.campaign.cap)) * Math.min(fee, sc.campaign.cap)) / FULL_CONV
    const kol = mean(last5, (x) => x.kol_share)
    const sanLeft = sc.related[0].budget - r.san_spent - (sc.related[0].planned_uses / SHAPE_SUM) * sc.related[0].pacing * sc.related[0].value * sum(Array.from({ length: N - t - 1 }, (_, k) => shape(t + 1 + k)))
    const steps = [
      { system: 'Ngân sách chiến dịch', ask: 'Đã dùng bao nhiêu ngân sách FREESHIP30, so với kế hoạch?', found: `${money(used)} (${pct(used / sc.campaign.budget)}), kế hoạch tới giờ này là ${money(planUsed)} (${pct(planUsed / sc.campaign.budget)}).`, verdict: 'bad' },
      changes.length ? { system: 'Nhật ký cấu hình', ask: 'Có ai đổi mức trợ giá, đơn tối thiểu hay ngân sách từ lúc mở chiến dịch?', found: changeText, verdict: 'bad' } : { system: 'Nhật ký cấu hình', ask: 'Có ai đổi mức trợ giá, đơn tối thiểu hay ngân sách từ lúc mở chiến dịch?', found: 'Không có thay đổi nào. Cấu hình đang chạy đúng bản đã duyệt.', verdict: 'clear', rules_out: 'Lỗi cấu hình' },
      { system: 'Sổ đơn hàng', ask: 'Mỗi lượt dùng có được trợ đúng mức, mỗi khách có dùng quá lượt?', found: `Trợ trung bình ${vnd(supNow)}/lượt (kế hoạch ${vnd(supPlan)}). ${r.uses_per_customer.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} lượt/khách, đúng giới hạn 1 lượt.`, verdict: 'clear', rules_out: 'Voucher áp sai, lạm dụng' },
      { system: 'Phân tích lưu lượng', ask: 'Lượt vào chiến dịch tăng từ đâu?', found: `Lượt mở giỏ gấp ${r.ratio.toFixed(1)} lần kế hoạch. ${pct(kol, 0)} lượt mở giỏ 5 phút qua đến từ link video của một KOL, bắt đầu ${clock(sim.onset ?? 6)}.`, verdict: 'cause' },
      { system: 'Ngân sách các chương trình liên quan', ask: 'Chương trình nào dự kiến còn dư ngân sách đến 24:00?', found: `SAN50K đang chạy ${pct(sc.related[0].pacing, 0)} kế hoạch, dự kiến dư ${money(sanLeft)}. BANK20 chạy đúng kế hoạch và do ngân hàng đối tác tài trợ, chính sách không cho chuyển.`, verdict: 'info' },
    ]
    return { steps, cause: 'Nhu cầu thật tăng đột biến từ một video KOL. Hệ thống làm đúng: sẽ dừng freeship khi hết ngân sách. Vấn đề là ngân sách cạn quá sớm so với kế hoạch kinh doanh.', san_left: sanLeft }
  }
  // kịch bản 2
  const window = rows.slice(0, t + 1)
  const plan = planCells(sc)
  const planPerShape = (c) => plan.find((p) => p.seg === c.seg && p.size === c.size)
  const shapeSum = sum(window, (x) => shape(x.t))
  const gaps = Object.keys(SEGS).flatMap((seg) => Object.keys(SIZES).map((size) => {
    const actual = sum(window, (x) => { const c = x.cells.find((y) => y.seg === seg && y.size === size); return c.orders * c.per })
    const p = planPerShape({ seg, size })
    const expected = p.orders * p.per * shapeSum
    const ordersA = sum(window, (x) => x.cells.find((y) => y.seg === seg && y.size === size).orders)
    const c = [...window].reverse().map((x) => x.cells.find((y) => y.seg === seg && y.size === size)).find((y) => y.orders > 0) ?? r.cells.find((y) => y.seg === seg && y.size === size)
    return { seg, size, actual, expected, gap: actual - expected, orders: ordersA, plan_orders: p.orders * shapeSum, per: c.per, vip: c.vip, ship: c.ship, combo: c.combo }
  })).sort((a, b) => a.gap - b.gap)
  const totalGap = sum(gaps, (g) => g.gap)
  const top = gaps[0]
  const ordersAll = sum(gaps, (g) => g.orders)
  const alone = (cfg) => cellsOf(sc, cfg, true).find((c) => c.seg === top.seg && c.size === top.size).per
  const s = SIZES[top.size]
  const vipOnly = sc.take_rate * s.aov - top.vip
  const shipOnly = sc.take_rate * s.aov - top.ship
  const steps = [
    { system: 'Báo cáo lợi nhuận', ask: 'Lợi nhuận đóng góp đang ở đâu so với kế hoạch?', found: `${money(r.cum)}, kế hoạch ${money(r.plan_cum)} (${pct(r.cum / r.plan_cum - 1)}). Trợ ship trung bình ${vnd(r.ship_per_order)}/đơn, kế hoạch ${vnd(r.plan_ship_per_order)}.`, verdict: 'bad' },
    changes.length ? { system: 'Nhật ký cấu hình', ask: 'Có ai đổi VIP15 hay FREESHIP_ALL từ lúc mở chiến dịch?', found: changeText, verdict: 'bad' } : { system: 'Nhật ký cấu hình', ask: 'Có ai đổi VIP15 hay FREESHIP_ALL từ lúc mở chiến dịch?', found: 'Không có thay đổi nào. Hai chương trình chạy đúng bản đã duyệt, được phép cộng theo quy định.', verdict: 'clear', rules_out: 'Lỗi cấu hình' },
    { system: 'Sổ đơn hàng', ask: 'Có đơn nào được giảm sai rule không?', found: `Kiểm ${int(ordersAll)} đơn: mức giảm VIP và tiền ship sàn trả đều khớp rule của từng chương trình.`, verdict: 'clear', rules_out: 'Voucher áp sai' },
    { system: 'Bảng phí vận chuyển', ask: 'Phí ship thực tế của hãng có tăng?', found: `Không. Hàng nhỏ ${vnd(facts.fees?.small ?? SIZES.small.fee)}, hàng vừa ${vnd(facts.fees?.medium ?? SIZES.medium.fee)}, cồng kềnh ${vnd(facts.fees?.bulky ?? SIZES.bulky.fee)}, như bảng giá hợp đồng.`, verdict: 'clear', rules_out: 'Hãng vận chuyển tăng phí' },
    { system: 'Phân tích giỏ hàng', ask: 'Khoản hụt nằm ở nhóm giỏ nào?', found: `${SEGS[top.seg]} × ${SIZES[top.size].label.toLowerCase()} chiếm ${pct(top.gap / totalGap, 0)} khoản hụt dù chỉ là ${pct(top.orders / ordersAll)} số đơn. Số đơn nhóm này gấp ${(top.orders / top.plan_orders).toFixed(1)} lần kế hoạch.`, verdict: 'cause' },
    { system: 'Kinh tế một đơn', ask: `Một đơn ${SEGS[top.seg].toLowerCase()} mua ${SIZES[top.size].label.toLowerCase()} đem lại bao nhiêu?`, found: `Chỉ VIP15: ${vnd(vipOnly)}. Chỉ Freeship: ${vnd(shipOnly)}. Cả hai cộng nhau: ${vnd(top.per)}/đơn.`, verdict: 'cause' },
  ]
  const who = `${SEGS[top.seg].toLowerCase()} mua ${SIZES[top.size].label.split(' (')[0].toLowerCase()}`
  const cause = top.combo.length === 2 && top.per < 0
    ? `Không có bug và không có voucher áp sai. Khi hai chương trình cùng chạy, ${who} được giảm cả ${vnd(top.vip)} lẫn ${vnd(top.ship)} phí ship, nên mua nhóm hàng này nhiều hơn hẳn dự báo; mỗi đơn như vậy làm sàn mất ${vnd(-top.per)}.`
    : `Không có bug và không có voucher áp sai. Khoản hụt lớn nhất đến từ nhóm ${who}: số đơn bằng ${(top.orders / top.plan_orders).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} lần kế hoạch, mỗi đơn ${top.per < 0 ? 'lỗ' : 'lãi'} ${vnd(Math.abs(top.per))}.`
  return { steps, gaps, total_gap: totalGap, top, cause, alone }
}

// Phương án: mô phỏng phần còn lại của khung với từng thay đổi, chọn theo SLO rồi theo kết quả kinh doanh
export function options(sc, sim, t, info, ctx) {
  if (sc.id === 'budget') {
    const transfer = Math.max(0, Math.min(info.san_left, sc.related[0].budget * sc.policy.transfer_max_share))
    const demand = demandForecast(sim.rows, t)
    const defs = [
      { id: 'keep', label: 'Giữ nguyên, báo hết ưu đãi khi cạn', change: {}, roles: sc.policy.benefit_roles },
      { id: 'half', label: 'Giảm trợ giá còn tối đa 15.000đ', change: { cap: 15000 }, roles: sc.policy.benefit_roles },
      { id: 'move', label: `Chuyển ${money(transfer)} dự kiến dư từ SAN50K`, change: { add_budget: transfer }, roles: sc.policy.transfer_roles },
      { id: 'slots', label: 'Giữ 30.000đ, mở ngân sách còn lại theo khung giờ 21h, 22h, 23h', change: { slots: true }, roles: sc.policy.benefit_roles },
      { id: 'half_move_slots', label: `Giảm còn 15.000đ, chuyển ${money(transfer)} từ SAN50K, mở theo khung giờ`, change: { cap: 15000, add_budget: transfer, slots: true }, roles: [...new Set([...sc.policy.benefit_roles, ...sc.policy.transfer_roles])] },
    ]
    const out = defs.map((o) => {
      const decisions = [...ctx.decisions, { t: t + 1, change: o.change }]
      const f = simulateBudget(sc, { decisions, demand, from: { t, rows: sim.rows } })
      const rest = f.rows.slice(t + 1)
      const coverage = hourCoverage(f.rows, t + 1)
      return {
        ...o, decisions, series: f.rows.map((x) => x.left),
        lasts_until: f.exhausted ?? N, coverage, orders: sum(rest, (x) => x.orders), gmv: sum(rest, (x) => x.gmv),
        spend: sum(rest, (x) => x.spend), uses: sum(rest, (x) => x.uses), abandon: 1 - sum(rest, (x) => x.orders) / sum(rest, (x) => x.attempts),
        meets: coverage >= sc.slo.target,
      }
    })
    return rank(out, (o) => o.orders)
  }
  const defs = [
    { id: 'keep', label: 'Giữ nguyên', change: {}, roles: ['marketing_lead', 'growth_lead'] },
    { id: 'bulky_cap', label: 'Freeship hàng cồng kềnh tối đa 50.000đ', change: { bulky_ship_cap: 50000 }, roles: ['growth_lead'] },
    { id: 'vip_off_bulky', label: 'VIP15 không áp cho hàng cồng kềnh', change: { vip_cap_bulky: 0 }, roles: ['marketing_lead'] },
    { id: 'vip_cap', label: 'Trần VIP15 cho hàng cồng kềnh còn 200.000đ', change: { vip_cap_bulky: 200000 }, roles: ['marketing_lead'] },
    { id: 'off', label: 'Tắt Freeship toàn bộ', change: { freeship_off: true }, roles: ['growth_lead'] },
  ]
  const target = marginTarget(sc)
  const out = defs.map((o) => {
    const decisions = [...ctx.decisions, { t: t + 1, change: o.change }]
    const f = simulateMargin(sc, { event: ctx.event, decisions, from: { t, rows: sim.rows } })
    const rest = f.rows.slice(t + 1)
    const affected = sum(rest, (x) => sum(x.cells.filter((c) => changedFor(o.change, c)), (c) => c.orders))
    return {
      ...o, decisions, series: f.rows.map((x) => x.cum), end_profit: f.rows[N - 1].cum, gmv: sum(rest, (x) => x.gmv), orders: sum(rest, (x) => x.orders),
      affected, meets: f.rows[N - 1].cum >= target, target,
    }
  })
  return rank(out, (o) => o.gmv)
}
const changedFor = (ch, c) => (ch.bulky_ship_cap != null && c.size === 'bulky') || (ch.no_stack_bulky && c.size === 'bulky' && c.seg === 'VIP') || (ch.vip_cap_bulky != null && c.size === 'bulky' && c.seg === 'VIP') || (ch.freeship_off && c.aov >= 299000)
// Ưu tiên phương án đạt SLO; trong số đó chọn kết quả kinh doanh tốt nhất
function rank(out, score) {
  const ok = out.filter((o) => o.meets && o.id !== 'keep')
  const best = (ok.length ? ok : out.filter((o) => o.id !== 'keep')).reduce((a, b) => (score(b) > score(a) ? b : a))
  return out.map((o) => ({ ...o, recommended: o.id === best.id }))
}

// Kiểm chứng sau khi áp dụng: đã về lại SLO chưa, chỉ dùng số liệu tới phút t
export function verify(sc, sim, t, decidedAt) {
  if (decidedAt == null || t <= decidedAt + 2) return null
  for (let k = decidedAt + 3; k <= t; k++) {
    if (sc.id === 'budget') {
      const r = sim.rows[k]
      if (r.left < r.cap) return { ok: false, t: k, text: `Ngân sách vẫn cạn lúc ${clock(k)}.` }
      if (r.slots) return { ok: true, t: k, text: `Ngân sách còn ${money(r.left)} chia cho các khung giờ đến 24:00; khung hiện tại còn ${money(Math.max(0, r.slot_left))}.` }
      const burn = mean(sim.rows.slice(k - 2, k + 1), (x) => x.spend)
      const eta = k + r.left / Math.max(burn, 1)
      if (eta >= N) return { ok: true, t: k, text: `Tốc độ tiêu còn ${money(burn)}/phút; ngân sách còn ${money(r.left)}, đủ đến 24:00.` }
    } else {
      const proj = projectMargin(sc, sim.rows, k)
      if (proj >= marginTarget(sc)) return { ok: true, t: k, text: `Lợi nhuận dự kiến đến 24:00 là ${money(proj)}, đạt mục tiêu ${money(marginTarget(sc))}.` }
    }
  }
  return { ok: null, t, text: 'Đang theo dõi, chưa về lại mục tiêu.' }
}

// ============================================================== Kinh nghiệm: agent rút ra sau mỗi sự cố đã kiểm chứng
// facts/unless: dấu hiệu cấu hình để khớp với voucher mới (backend Medusa dùng cùng tên dấu hiệu khi kiểm tra trước lúc tạo)
export function learn(sc, sim, det, inv, chosen, ver, t) {
  const rows = sim.rows.slice(0, t + 1)
  const opt = chosen.options.find((o) => o.id === chosen.id)
  const keep = chosen.options.find((o) => o.id === 'keep')
  const incident = { scenario: sc.id, detected: clock(det.t), benchmark: det.benchmark, decided: clock(chosen.at), recovered: ver?.ok ? clock(ver.t) : null, fix: opt.label }
  if (sc.id === 'budget') {
    // đơn thật là số nguyên nên tỷ lệ từng phút giật; làm mượt 5 phút trước khi đo đỉnh và tốc độ giảm
    const smooth = rows.map((r, i) => ({ t: r.t, ratio: mean(rows.slice(Math.max(0, i - 2), i + 3), (x) => x.ratio) }))
    const tp = smooth.reduce((a, r) => (r.ratio > smooth[a].ratio ? r.t : a), 0)
    const peak = smooth[tp].ratio
    // nửa vòng đời của phần nhu cầu vượt kế hoạch, ước lượng từ đoạn đã giảm sau đỉnh
    const fits = smooth.filter((r) => r.t > tp + 2 && r.ratio > 1.2 && r.ratio < peak).map((r) => (r.t - tp) / Math.log((peak - 1) / (r.ratio - 1)))
    const tau = fits.length ? mean(fits, (x) => x) : 50
    return {
      id: 'L-FREESHIP-BURST', kind: 'budget_burst', severity: 'high',
      title: 'Freeship ngân sách cố định cạn sớm khi nhu cầu bùng nổ',
      learned_at: `${DAY} ${clock(t)}`, incident,
      facts: ['freeship_with_budget'], unless: ['budget_slots'],
      evidence: [
        `Lưu lượng đỉnh gấp ${peak.toFixed(1)} lần kế hoạch sau ${tp - det.onset} phút, phần vượt giảm một nửa sau khoảng ${Math.round(tau * Math.LN2)} phút.`,
        `Nếu giữ nguyên: ngân sách cạn lúc ${clock(keep.lasts_until)}, freeship chỉ có ở ${pct(keep.coverage, 0)} khung giờ còn lại.`,
        `Đã áp dụng "${opt.label}": ${ver?.text ?? ''}`,
      ],
      stress: { at: 6, ramp: Math.max(1, tp - det.onset), peak, tau },
      guardrails: [
        { id: 'slots', text: 'Mở ngân sách theo khung giờ ngay từ đầu', change: { slots: true } },
        { id: 'bench', text: 'Gắn benchmark tốc độ tiêu ngân sách (cảnh báo ×1,5, agent chạy ở ×2) và giờ dự kiến cạn' },
        { id: 'reserve', text: 'Khai báo trước nguồn dự phòng (chương trình sàn dự kiến dư) và người duyệt Marketing + Finance' },
      ],
      benchmarks: ['burn_rate', 'exhaust_eta', 'traffic', 'abandon'],
    }
  }
  const top = inv.top
  const s0 = SIZES[top.size]
  const mult = (top.orders / top.plan_orders) * sc.plan_lift // so với khi không có ưu đãi
  const e = Math.log(mult) / ((top.vip + top.ship) / (s0.aov + s0.fee))
  return {
    id: 'L-STACK-BULKY', kind: 'stack_margin', severity: 'high',
    title: 'Giảm % theo nhóm khách cộng Freeship toàn phần làm lỗ ở hàng cồng kềnh',
    learned_at: `${DAY} ${clock(t)}`, incident,
    facts: ['segment_pct_with_full_freeship'], unless: ['bulky_capped'],
    evidence: [
      `${SEGS[top.seg]} × ${s0.label.toLowerCase()}: số đơn gấp ${(top.orders / top.plan_orders).toFixed(1)} lần kế hoạch, chiếm ${pct(top.gap / inv.total_gap, 0)} khoản hụt.`,
      `Mỗi đơn: chỉ giảm VIP ${vnd(sc.take_rate * s0.aov - top.vip)}, chỉ freeship ${vnd(sc.take_rate * s0.aov - top.ship)}, cộng cả hai ${vnd(top.per)}.`,
      `Đã áp dụng "${opt.label}": ${ver?.text ?? ''}`,
    ],
    stress: { size: top.size, seg: top.seg, elasticity: e },
    guardrails: [
      { id: 'bulky_cap', text: 'Đặt trần ưu đãi cho hàng cồng kềnh (200.000đ) khi cộng với Freeship toàn phần', change: { vip_cap_bulky: 200000 } },
      { id: 'cell_check', text: 'Kiểm lãi/lỗ mỗi đơn theo nhóm khách × kích thước hàng trước khi duyệt cộng dồn' },
      { id: 'bench', text: 'Gắn benchmark tỷ trọng hàng cồng kềnh và phí ship sàn trả mỗi đơn' },
    ],
    benchmarks: ['profit_proj', 'bulky_share', 'ship_per_order', 'vip_discount'],
  }
}

// ============================================================== Kiểm tra trước khi tạo voucher: rule hợp lệ chưa đủ, phát lại sự cố đã học
export const DRAFTS = [
  { id: 'freeship1212', kind: 'freeship', title: 'Freeship 12.12 khung trưa', owner: 'marketing', desc: 'Freeship tối đa 25.000đ cho đơn từ 149.000đ, ngân sách 200 triệu, 4 giờ, dự kiến 10.000 lượt.', cap: 25000, min_order: 149000, budget: 200e6, planned_uses: 10000, slots: false },
  { id: 'gold12', kind: 'stack', title: 'Thành viên Gold −12% cộng Freeship toàn phần', owner: 'marketing', desc: 'Khách Gold −12% không trần, được cộng Freeship toàn phần của Growth (đơn từ 299.000đ).', rate: 0.12, cap: null, bulky_cap: null },
]
export const factsOf = (d) => (d.kind === 'freeship' ? ['freeship_with_budget', ...(d.slots ? ['budget_slots'] : [])] : ['segment_pct_with_full_freeship', ...(d.bulky_cap != null ? ['bulky_capped'] : [])])
export const matches = (lesson, facts) => lesson.facts.every((f) => facts.includes(f)) && !(lesson.unless ?? []).some((f) => facts.includes(f))

function draftBudget(d, stress) {
  return { ...BUDGET, campaign: { ...BUDGET.campaign, code: d.id, name: d.title, cap: d.cap, min_order: d.min_order, budget: d.budget, planned_uses: d.planned_uses }, event: { ...BUDGET.event, ...stress } }
}
function draftMargin(d) {
  return { ...MARGIN, campaigns: [{ ...MARGIN.campaigns[0], code: d.id, rate: d.rate, cap: d.cap ?? Infinity }, MARGIN.campaigns[1]] }
}
export function preflight(d, lessons) {
  const facts = factsOf(d)
  const rules = d.kind === 'freeship'
    ? ['Mức trợ, đơn tối thiểu, ngân sách hợp lệ', 'Giới hạn 1 lượt mỗi khách', 'Backend tự dừng khi hết ngân sách']
    : ['Mức giảm và nhóm khách hợp lệ', 'Được phép cộng với Freeship theo chính sách', 'Không vượt ngân sách chương trình']
  // cấu hình của chính bản nháp (đã bật guardrail nào) áp từ phút đầu
  const own = d.kind === 'freeship' ? (d.slots ? [{ t: 0, change: { slots: true } }] : []) : d.bulky_cap != null ? [{ t: 0, change: { vip_cap_bulky: d.bulky_cap } }] : []
  const matched = lessons.filter((l) => l.facts.every((f) => facts.includes(f))).map((l) => {
    const covered = !matches(l, facts) // đã có guardrail mà bài học yêu cầu
    const g = l.guardrails.find((x) => x.change)
    if (d.kind === 'freeship' && l.kind === 'budget_burst') {
      const sc = draftBudget(d, l.stress)
      const run1 = (decisions, event = true) => { const r = simulateBudget(sc, { event, decisions }); return { exhausted: r.exhausted, coverage: hourCoverage(r.rows, 0), orders: sum(r.rows, (x) => x.orders) } }
      return { lesson: l, covered, normal: run1(own, false), stressed: run1(own), guarded: run1([{ t: 0, change: g.change }]), guardrail: g, ok: (r) => r.coverage >= 1 }
    }
    if (d.kind === 'stack' && l.kind === 'stack_margin') {
      const sc = draftMargin(d)
      const target = marginTarget(sc)
      const run2 = (decisions, event = true) => { const r = simulateMargin(sc, { event, decisions }); return { profit: r.rows[N - 1].cum, target } }
      const cell = (cfg) => cellsOf(sc, cfg, true).find((c) => c.seg === l.stress.seg && c.size === l.stress.size)
      return { lesson: l, covered, normal: run2(own, false), stressed: run2(own), guarded: run2([{ t: 0, change: g.change }]), guardrail: g, cell: cell(own[0]?.change ?? {}), cell_guarded: cell(g.change), ok: (r) => r.profit >= r.target }
    }
    return { lesson: l, covered, normal: null, stressed: null, guarded: null }
  })
  const risky = matched.filter((m) => m.stressed && !m.ok(m.stressed))
  const verdict = !matched.length ? 'pass' : !risky.length ? (matched.every((m) => m.covered) ? 'covered' : 'pass') : risky.every((m) => m.ok(m.guarded)) ? 'guard' : 'block'
  return { draft: d, facts, rules, matched: matched.map(({ ok, ...m }) => ({ ...m, stressed_ok: m.stressed ? ok(m.stressed) : true, guarded_ok: m.guarded ? ok(m.guarded) : true })), verdict }
}

export const SCENARIOS = [BUDGET, MARGIN]
export const run = (sc, ctx) => (sc.id === 'budget' ? simulateBudget(sc, ctx) : simulateMargin(sc, ctx))
export const STEPS = (sc) => (sc.id === 'budget' ? 5 : 6)
