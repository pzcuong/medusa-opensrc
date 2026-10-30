// Evaluator dùng chung cho cửa hàng, admin và phân tích FlashSRE của demo checkout.
// Quy ước:
//  - Tiền là số nguyên đồng. Giảm phần trăm làm tròn xuống đến đồng.
//  - Khoản giảm của một ưu đãi được phân bổ cho các dòng hàng đủ điều kiện theo tỷ lệ số còn lại; phần dư theo phần lẻ lớn nhất.
//  - Khung thời gian [start, end): lúc start đã hiệu lực, lúc end hết hiệu lực.
//  - Thứ tự tính (order) và quyền cộng dồn (stacking) là hai cấu hình riêng.
//  - Ngân sách không đủ cho toàn bộ khoản giảm thì không cấp, không giảm một phần.

export const TZ = 'Asia/Ho_Chi_Minh'
const VN_OFFSET = 7 * 3600e3 // Việt Nam không có giờ mùa hè

export const vnd = (n) => `${Math.round(n).toLocaleString('vi-VN')}đ`
export const pct = (n) => `${n.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
export const at = (date, hm) => Date.parse(`${date}T${hm.length === 5 ? `${hm}:00` : hm}+07:00`)

const vnParts = (ms) => {
  const d = new Date(ms + VN_OFFSET)
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), wd: d.getUTCDay() }
}
const p2 = (n) => String(n).padStart(2, '0')
export const fmtTime = (ms, sec = false) => { const t = vnParts(ms); return `${p2(t.h)}:${p2(t.mi)}${sec ? `:${p2(t.s)}` : ''}` }
export const fmtDate = (ms) => { const t = vnParts(ms); return `${p2(t.d)}/${p2(t.mo)}` }
const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
export const fmtWeekday = (ms) => WEEKDAYS[vnParts(ms).wd]
const dayKey = (ms) => { const t = vnParts(ms); return t.y * 1e4 + t.mo * 100 + t.d }
export function relDay(ms, now) {
  const diff = Math.round((Date.UTC(...ymd(ms)) - Date.UTC(...ymd(now))) / 864e5)
  return diff === 0 ? 'hôm nay' : diff === 1 ? 'ngày mai' : diff === -1 ? 'hôm qua' : `ngày ${fmtDate(ms)}`
}
const ymd = (ms) => { const t = vnParts(ms); return [t.y, t.mo - 1, t.d] }
// Giá trị cho <input type="datetime-local"> theo giờ Việt Nam
export const toLocalInput = (ms) => { const t = vnParts(ms); return `${t.y}-${p2(t.mo)}-${p2(t.d)}T${p2(t.h)}:${p2(t.mi)}` }
export const fromLocalInput = (v) => Date.parse(`${v}:00+07:00`)
export function fmtRange(e) {
  if (e.start == null && e.end == null) return 'Không giới hạn thời gian'
  if (e.start != null && e.end != null && vnParts(e.start).h === 0 && vnParts(e.start).mi === 0 && e.end - e.start === 864e5) return `Cả ngày ${fmtDate(e.start)}`
  const a = e.start != null ? fmtTime(e.start) : '…'
  const b = e.end != null ? (dayKey(e.end) !== dayKey(e.start ?? e.end) && fmtTime(e.end) === '00:00' ? '24:00' : fmtTime(e.end)) : '…'
  return `${a}–${b} ${fmtDate(e.start ?? e.end)}`
}

export const TEAMS = { marketing: 'Marketing', seller_ops: 'Seller Ops', merchandising: 'Merchandising', logistics: 'Logistics', category: 'Category' }
export const SEGMENTS = { REGULAR: 'Khách thường', NEW: 'Khách hàng mới', VIP: 'Khách VIP' }
const SEGMENT_LOWER = { REGULAR: 'khách thường', NEW: 'khách hàng mới', VIP: 'khách VIP' }
export const OFFER_KINDS = { shop: 'Voucher shop', platform: 'Voucher sàn', brand_day: 'Brand Day', freeship: 'Freeship', segment: 'Ưu đãi nhóm khách' }
export const PRICE_KINDS = { flash: 'Giá Flash Sale', shop_price: 'Giá khuyến mãi shop', segment_price: 'Giá nhóm khách' }
export const MIN_SPEND_BASIS = {
  cart_current: 'Tổng tiền hàng hiện hành trước voucher',
  eligible_current: 'Tổng tiền hàng đủ điều kiện trước voucher',
  eligible_regular: 'Tổng hàng đủ điều kiện theo giá ngoài flash',
  after_shop: 'Tổng hàng đủ điều kiện sau voucher shop',
  after_listed: 'Tổng hàng đủ điều kiện sau các ưu đãi chỉ định',
}
export const DISCOUNT_BASIS = {
  eligible_current: 'Tiền hàng đủ điều kiện trước voucher',
  remaining: 'Số còn lại sau các ưu đãi tính trước',
}
export const SCOPE_MODES = { items: 'Chỉ giảm dòng hàng đủ điều kiện', cart: 'Chặn cả giỏ nếu có hàng ngoài phạm vi' }

export const clone = (x) => structuredClone(x)
const sum = (xs) => xs.reduce((s, x) => s + x, 0)

// ------------------------------------------------------------------ thời gian
export function timeState(e, now) {
  if (!e.enabled) return 'paused'
  if (e.start != null && now < e.start) return 'not_started'
  if (e.end != null && now >= e.end) return 'expired'
  return 'active'
}
export const TIME_STATE_LABEL = { paused: 'Tạm dừng', not_started: 'Chưa đến giờ', expired: 'Đã kết thúc', active: 'Đang chạy' }

// ------------------------------------------------------------------ giá
const productOf = (cfg, sku) => cfg.products.find((p) => p.sku === sku)

function priceLine(cfg, ctx, line) {
  const product = productOf(cfg, line.sku)
  const candidates = cfg.priceRules.filter((r) => r.prices?.[line.sku] != null).map((r) => {
    const state = timeState(r, ctx.now)
    const segment_ok = !r.segments?.length || r.segments.includes(ctx.segment)
    return { id: r.id, name: r.name, kind: r.kind, team: r.team, price: r.prices[line.sku], state, segment_ok, active: state === 'active' && segment_ok }
  })
  const list = { id: null, name: 'Giá niêm yết', kind: 'list', team: null, price: product.price }
  // Nhiều price rule cùng hiệu lực: giá thấp nhất thắng; bằng nhau thì giữ nguồn đứng trước
  const pick = (cs) => cs.reduce((best, c) => (c.price < best.price ? c : best), list)
  const active = candidates.filter((c) => c.active)
  const source = pick(active)
  const regular = pick(active.filter((c) => c.kind !== 'flash'))
  return {
    sku: line.sku, qty: line.qty, product, list_price: product.price,
    unit_price: source.price, source, candidates,
    regular_price: regular.price, amount: source.price * line.qty, regular_amount: regular.price * line.qty,
  }
}

// ------------------------------------------------------------------ điều kiện tĩnh
function inScope(o, p) {
  const s = o.scope ?? {}
  if (s.exclude_skus?.includes(p.sku)) return false
  if (s.skus?.length && !s.skus.includes(p.sku)) return false
  if (s.shops?.length && !s.shops.includes(p.shop)) return false
  if (s.categories?.length && !s.categories.includes(p.category)) return false
  return true
}

export function scopeText(cfg, o) {
  const s = o.scope ?? {}
  const parts = []
  if (s.shops?.length) parts.push(`shop ${s.shops.map((x) => cfg.shops[x] ?? x).join(', ')}`)
  if (s.categories?.length) parts.push(`ngành ${s.categories.map((x) => cfg.categories[x] ?? x).join(', ')}`)
  if (s.skus?.length) parts.push(s.skus.map((x) => productOf(cfg, x)?.name ?? x).join(', '))
  const base = parts.length ? parts.join(' · ') : 'mọi sản phẩm'
  return s.exclude_skus?.length ? `${base}, trừ ${s.exclude_skus.map((x) => productOf(cfg, x)?.name ?? x).join(', ')}` : base
}

const providerName = (cfg, id) => cfg.providers.find((p) => p.id === id)?.name ?? id
const R = (code, text, extra = {}) => ({ code, text, ...extra })

function staticCheck(cfg, ctx, lines, o) {
  const st = timeState(o, ctx.now)
  if (st === 'paused') return R('PAUSED', `Campaign đã được ${TEAMS[o.team] ?? o.team} tạm dừng.`)
  if (st === 'not_started') return R('NOT_STARTED', `Bắt đầu lúc ${fmtTime(o.start)} ${relDay(o.start, ctx.now)}.`)
  if (st === 'expired') return R('EXPIRED', `Đã kết thúc lúc ${fmtTime(o.end)} ${relDay(o.end, ctx.now)}.`)
  if (o.segments?.length && !o.segments.includes(ctx.segment)) return R('SEGMENT', `Chỉ áp dụng cho ${o.segments.map((s) => SEGMENT_LOWER[s] ?? s).join(', ')}.`)
  if (o.kind === 'freeship' && o.providers?.length && !o.providers.includes(ctx.provider)) {
    return R('PROVIDER', `Không hỗ trợ ${providerName(cfg, ctx.provider)}. Có thể dùng với ${o.providers.map((p) => providerName(cfg, p)).join(', ')}.`)
  }
  if (!lines.length) return R('SCOPE', 'Giỏ hàng đang trống.')
  const out = lines.filter((l) => !inScope(o, l.product))
  if (out.length === lines.length) return R('SCOPE', `Chỉ áp dụng cho ${scopeText(cfg, o)}; giỏ không có sản phẩm phù hợp.`)
  if (o.scope_mode === 'cart' && out.length) return R('SCOPE_CART', `Giỏ có ${out.map((l) => l.product.name).join(', ')} ngoài phạm vi nên cả giỏ không được áp.`)
  if (o.uses != null && o.uses <= 0) return R('USES', 'Đã hết lượt sử dụng.')
  return null
}

// ------------------------------------------------------------------ cộng dồn
export function pairMode(cfg, a, b) {
  const r = (cfg.stacking.rules ?? []).find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))
  return r?.mode ?? cfg.stacking.default ?? 'allow'
}

// Xung đột của ưu đãi o với tập đang giữ; luận cứ đối xứng nên chọn A trước hay B trước đều giải thích như nhau
function conflictsWith(cfg, o, held) {
  const byId = new Map(cfg.offers.map((x) => [x.id, x]))
  const pair = held.filter((id) => id !== o.id && pairMode(cfg, o.id, id) === 'deny')
  if (pair.length) return { code: 'CONFLICT', ids: pair }
  if (o.group) {
    const same = held.filter((id) => id !== o.id && byId.get(id)?.group === o.group)
    if (same.length) return { code: 'GROUP', ids: same }
  }
  const max = cfg.stacking.max_offers
  if (max != null && held.filter((id) => id !== o.id).length >= max) return { code: 'MAX_OFFERS', ids: [] }
  return null
}

function conflictReason(cfg, c, autoIds) {
  const names = c.ids.map((id) => {
    const x = cfg.offers.find((o) => o.id === id)
    return `${x?.code || x?.name || id}${autoIds.includes(id) ? ' (tự động)' : ''}`
  }).join(', ')
  if (c.code === 'CONFLICT') return R('CONFLICT', `Không thể dùng cùng ${names} đang chọn.`, { conflicting: c.ids })
  if (c.code === 'GROUP') {
    const g = cfg.offers.find((o) => o.id === c.ids[0])?.group
    return R('CONFLICT', `Chỉ được dùng 1 ưu đãi trong nhóm "${g}"; ${names} đang chọn.`, { conflicting: c.ids })
  }
  return R('MAX_OFFERS', `Đơn chỉ dùng tối đa ${cfg.stacking.max_offers} ưu đãi; đã chọn đủ.`, { conflicting: [] })
}

// ------------------------------------------------------------------ tính tiền
function allocate(total, idx, rem) {
  const out = new Array(rem.length).fill(0)
  const base = sum(idx.map((i) => rem[i]))
  if (!base) return out
  const raw = idx.map((i) => ({ i, v: (rem[i] * total) / base }))
  for (const r of raw) out[r.i] = Math.floor(r.v)
  let left = total - sum(raw.map((r) => out[r.i]))
  for (const r of [...raw].sort((x, y) => (y.v - Math.floor(y.v)) - (x.v - Math.floor(x.v)) || x.i - y.i)) {
    if (left <= 0) break
    out[r.i] += 1
    left -= 1
  }
  return out
}

export function shippingFee(cfg, ctx, lines) {
  if (!lines.length) return 0
  return cfg.providers.find((p) => p.id === ctx.provider)?.fee ?? 0
}

function apply(cfg, ctx, lines, ids) {
  const byId = new Map(cfg.offers.map((o) => [o.id, o]))
  const ordered = ids.map((id) => byId.get(id)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))
  const rem = lines.map((l) => l.amount)
  const alloc = new Map()
  const applied = new Map()
  const failed = new Map()
  const trace = []
  let shipLeft = shippingFee(cfg, ctx, lines)
  let k = 0
  for (const o of ordered) {
    const idx = lines.map((l, i) => (inScope(o, l.product) ? i : -1)).filter((i) => i >= 0)
    const eligible = sum(idx.map((i) => lines[i].amount))
    const priorOn = (pred) => sum(idx.map((i) => sum([...applied.keys()].filter((id) => pred(byId.get(id))).map((id) => alloc.get(id)?.[i] ?? 0))))
    let basis
    switch (o.min_spend_basis) {
      case 'cart_current': basis = sum(lines.map((l) => l.amount)); break
      case 'eligible_regular': basis = sum(idx.map((i) => lines[i].regular_amount)); break
      case 'after_shop': basis = eligible - priorOn((x) => x.kind === 'shop'); break
      case 'after_listed': basis = eligible - priorOn((x) => (o.min_spend_after ?? []).includes(x.id)); break
      default: basis = eligible
    }
    const min = o.min_spend ?? 0
    const step = { offer_id: o.id, name: o.code || o.name, kind: o.kind, basis, basis_kind: o.min_spend_basis ?? 'eligible_current', min_spend: min, lines: idx.map((i) => lines[i].sku) }
    const fail = (r) => { failed.set(o.id, { ...r, basis, min_spend: min }); trace.push({ ...step, result: 'fail', reason: r.text }) }
    if (basis < min) {
      fail(R('MIN_SPEND', `Cần thêm ${vnd(min - basis)} để đạt mức tối thiểu ${vnd(min)}.`, { missing: min - basis }))
      continue
    }
    let disc
    let base
    if (o.kind === 'freeship') {
      base = shipLeft
      disc = Math.min(o.discount.value, shipLeft)
    } else {
      base = o.discount_basis === 'eligible_current' ? eligible : sum(idx.map((i) => rem[i]))
      disc = o.discount.type === 'percent' ? Math.floor((base * o.discount.value) / 100) : o.discount.value
      if (o.discount.cap != null) disc = Math.min(disc, o.discount.cap)
      disc = Math.min(disc, sum(idx.map((i) => rem[i])))
    }
    if (disc <= 0) {
      fail(R('NO_VALUE', o.kind === 'freeship' ? 'Phí giao 0đ, không có gì để hỗ trợ.' : 'Phần hàng đủ điều kiện đã được giảm hết.'))
      continue
    }
    if (o.budget != null && o.budget < disc) {
      fail(R('BUDGET', `Ngân sách còn ${vnd(o.budget)}, không đủ cấp ${vnd(disc)}. Không giảm một phần.`))
      continue
    }
    if (o.kind === 'freeship') {
      shipLeft -= disc
    } else {
      const a = allocate(disc, idx, rem)
      alloc.set(o.id, a)
      a.forEach((v, i) => { rem[i] -= v })
    }
    applied.set(o.id, { discount: disc, order: ++k, basis, base })
    trace.push({ ...step, result: 'applied', base, base_kind: o.kind === 'freeship' ? 'shipping' : (o.discount_basis ?? 'remaining'), discount: disc, order: k })
  }
  return { applied, failed, alloc, trace }
}

// ------------------------------------------------------------------ evaluate
export function evaluate(cfg, ctx) {
  const lines = ctx.lines.filter((l) => l.qty > 0 && productOf(cfg, l.sku)).map((l) => priceLine(cfg, ctx, l))
  const byId = new Map(cfg.offers.map((o) => [o.id, o]))
  const statics = new Map(cfg.offers.map((o) => [o.id, staticCheck(cfg, ctx, lines, o)]))
  const autoIds = cfg.offers.filter((o) => o.auto).map((o) => o.id)
  const userSel = [...new Set(ctx.selected)].filter((id) => byId.has(id) && !byId.get(id).auto)
  const seq = [...autoIds, ...userSel]

  // Ưu đãi tự động giữ chỗ trước, rồi đến lựa chọn của khách theo thứ tự chọn.
  // Ưu đãi rớt điều kiện khi tính thì nhả chỗ, để không chặn oan ưu đãi khác.
  const dropped = new Map()
  let chosen
  let conflicts
  let run
  for (let guard = 0; guard <= cfg.offers.length; guard++) {
    chosen = []
    conflicts = new Map()
    for (const id of seq) {
      if (statics.get(id) || dropped.has(id)) continue
      const c = conflictsWith(cfg, byId.get(id), chosen)
      if (c) conflicts.set(id, conflictReason(cfg, c, autoIds))
      else chosen.push(id)
    }
    run = apply(cfg, ctx, lines, chosen)
    const fresh = [...run.failed.keys()].filter((id) => !dropped.has(id))
    if (!fresh.length) break
    for (const id of fresh) dropped.set(id, run.failed.get(id))
  }
  const held = chosen.filter((id) => run.applied.has(id))

  const offers = cfg.offers.map((o) => {
    const auto = !!o.auto
    const selected = auto ? !statics.get(o.id) : userSel.includes(o.id)
    const base = {
      id: o.id, code: o.code, name: o.name, kind: o.kind, team: o.team, auto, selected,
      eligible: false, applied: false, reason_codes: [], reason_text: '', threshold_basis_amount: null, threshold_basis: o.min_spend_basis ?? 'eligible_current',
      missing_amount: 0, conflicting_offer_ids: [], calculated_discount: 0, applied_order: null, time_state: timeState(o, ctx.now),
    }
    const reasonOf = (r) => ({
      reason_codes: [r.code], reason_text: r.text, missing_amount: r.missing ?? 0, conflicting_offer_ids: r.conflicting ?? [],
      threshold_basis_amount: r.basis ?? null,
    })
    if (run.applied.has(o.id)) {
      const a = run.applied.get(o.id)
      return { ...base, eligible: true, applied: true, status: 'applied', calculated_discount: a.discount, applied_order: a.order, threshold_basis_amount: a.basis }
    }
    const r = statics.get(o.id) ?? conflicts.get(o.id) ?? dropped.get(o.id)
    if (selected && r) return { ...base, status: 'selected_not_applied', ...reasonOf(r) }
    if (r && statics.get(o.id)) return { ...base, status: 'blocked', ...reasonOf(r) }
    const c = conflictsWith(cfg, o, held)
    if (c) return { ...base, status: 'blocked', ...reasonOf(conflictReason(cfg, c, autoIds)) }
    // Thử thêm ưu đãi này vào tập đang áp để biết nó có đủ điều kiện và giảm bao nhiêu
    const what = apply(cfg, ctx, lines, [...held, o.id])
    if (what.applied.has(o.id)) {
      const a = what.applied.get(o.id)
      return { ...base, eligible: true, status: 'available', calculated_discount: a.discount, threshold_basis_amount: a.basis }
    }
    return { ...base, status: 'blocked', ...reasonOf(what.failed.get(o.id)) }
  })

  const outLines = lines.map((l, i) => {
    const discounts = [...run.alloc.entries()].filter(([id]) => run.applied.has(id)).map(([id, a]) => ({ offer_id: id, amount: a[i] })).filter((d) => d.amount > 0)
    return { ...l, discounts, net: l.amount - sum(discounts.map((d) => d.amount)) }
  })
  const kindTotal = (kind) => sum([...run.applied.entries()].filter(([id]) => byId.get(id).kind === kind).map(([, a]) => a.discount))
  const discounts = { shop: kindTotal('shop'), platform: kindTotal('platform'), brand_day: kindTotal('brand_day'), segment: kindTotal('segment') }
  const goods = sum(Object.values(discounts))
  const fee = shippingFee(cfg, ctx, lines)
  const support = kindTotal('freeship')
  const subtotal = sum(lines.map((l) => l.amount))
  return {
    lines: outLines, offers, trace: run.trace,
    totals: {
      list_subtotal: sum(lines.map((l) => l.list_price * l.qty)), subtotal, discounts, goods_discount: goods,
      shipping_fee: fee, shipping_support: support, total: subtotal - goods + fee - support,
    },
    selected_ids: offers.filter((o) => o.selected).map((o) => o.id),
    eligible_ids: offers.filter((o) => o.eligible).map((o) => o.id),
    applied_ids: offers.filter((o) => o.applied).sort((a, b) => a.applied_order - b.applied_order).map((o) => o.id),
  }
}

// Mốc đổi giá/ưu đãi sắp tới, cho countdown
export function upcoming(cfg, ctx) {
  const ev = []
  for (const e of [...cfg.priceRules, ...cfg.offers]) {
    if (!e.enabled) continue
    if (e.start != null && e.start > ctx.now) ev.push({ at: e.start, type: 'start', id: e.id, name: e.name })
    if (e.end != null && e.end > ctx.now && (e.start == null || e.start <= ctx.now)) ev.push({ at: e.end, type: 'end', id: e.id, name: e.name })
  }
  return ev.sort((a, b) => a.at - b.at)
}

// ------------------------------------------------------------------ sửa cấu hình
const COLLECTION = { offer: 'offers', priceRule: 'priceRules', provider: 'providers' }

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}
function setPath(obj, path, value) {
  const ks = path.split('.')
  let o = obj
  for (const k of ks.slice(0, -1)) o = o[k] ??= {}
  if (value === undefined) delete o[ks.at(-1)]
  else o[ks.at(-1)] = value
}

export function findEntity(cfg, target, id) {
  if (target === 'stacking') return cfg.stacking
  return cfg[COLLECTION[target]].find((x) => x.id === id)
}

// patch: { target: offer|priceRule|provider|stacking, id, path, value } hoặc { target, op: create|delete, id, value }
export function applyPatch(cfg, patch) {
  const next = clone(cfg)
  if (patch.op === 'create') next[COLLECTION[patch.target]].push(clone(patch.value))
  else if (patch.op === 'delete') {
    next[COLLECTION[patch.target]] = next[COLLECTION[patch.target]].filter((x) => x.id !== patch.id)
    if (patch.target === 'offer') next.stacking.rules = next.stacking.rules.filter((r) => r.a !== patch.id && r.b !== patch.id)
  } else setPath(findEntity(next, patch.target, patch.id), patch.path, clone(patch.value))
  return next
}

export function setPairMode(cfg, a, b, mode) {
  const rules = (cfg.stacking.rules ?? []).filter((r) => !((r.a === a && r.b === b) || (r.a === b && r.b === a)))
  if (mode !== (cfg.stacking.default ?? 'allow')) rules.push({ a, b, mode })
  return { target: 'stacking', path: 'rules', value: rules }
}

const flatten = (obj, pre = '') => Object.entries(obj ?? {}).flatMap(([k, v]) => (
  v && typeof v === 'object' && !Array.isArray(v) ? flatten(v, `${pre}${k}.`) : [[`${pre}${k}`, v]]
))

export function diffConfig(a, b) {
  const out = []
  for (const [target, key] of [['priceRule', 'priceRules'], ['offer', 'offers'], ['provider', 'providers']]) {
    const ids = [...new Set([...a[key].map((x) => x.id), ...b[key].map((x) => x.id)])]
    for (const id of ids) {
      const x = a[key].find((e) => e.id === id)
      const y = b[key].find((e) => e.id === id)
      const name = (y ?? x).code || (y ?? x).name
      const team = (y ?? x).team ?? null
      if (!x || !y) { out.push({ target, id, name, team, path: '(toàn bộ)', before: x ? 'có' : 'không có', after: y ? 'có' : 'không có' }); continue }
      const fx = new Map(flatten(x))
      const fy = new Map(flatten(y))
      for (const p of new Set([...fx.keys(), ...fy.keys()])) {
        if (JSON.stringify(fx.get(p)) !== JSON.stringify(fy.get(p))) out.push({ target, id, name, team, path: p, before: fx.get(p), after: fy.get(p) })
      }
    }
  }
  const sa = JSON.stringify(a.stacking)
  if (sa !== JSON.stringify(b.stacking)) {
    for (const p of new Set([...flatten(a.stacking).map(([k]) => k), ...flatten(b.stacking).map(([k]) => k)])) {
      const va = getPath(a.stacking, p)
      const vb = getPath(b.stacking, p)
      if (JSON.stringify(va) !== JSON.stringify(vb)) out.push({ target: 'stacking', id: 'stacking', name: 'Cộng dồn', team: null, path: p, before: va, after: vb })
    }
  }
  return out
}

// ------------------------------------------------------------------ contract đã duyệt
export function checkContracts(cfg) {
  return (cfg.contracts ?? []).map((c) => {
    const e = findEntity(cfg, c.target, c.id)
    const actual = c.target === 'stacking' ? pairMode(cfg, c.pair[0], c.pair[1]) : getPath(e, c.path)
    return { ...c, actual, ok: JSON.stringify(actual ?? null) === JSON.stringify(c.expected ?? null) }
  })
}

// ------------------------------------------------------------------ phân tích deterministic (không dùng LLM)
const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export function changedFactors(before, after) {
  const f = []
  if (before.ctx.now !== after.ctx.now) f.push('time')
  if (before.cfg.version !== after.cfg.version || !sameJSON(diffConfig(before.cfg, after.cfg), [])) f.push('config')
  if (!sameJSON(before.ctx.lines.filter((l) => l.qty > 0), after.ctx.lines.filter((l) => l.qty > 0))) f.push('cart')
  if (before.ctx.segment !== after.ctx.segment) f.push('segment')
  if (before.ctx.provider !== after.ctx.provider) f.push('provider')
  if (!sameJSON([...before.ctx.selected].sort(), [...after.ctx.selected].sort())) f.push('selection')
  return f
}
export const FACTOR_LABEL = { time: 'thời gian', config: 'cấu hình', cart: 'giỏ hàng', segment: 'nhóm khách', provider: 'đơn vị vận chuyển', selection: 'mã khách chọn' }

export function analyze(before, after) {
  const rb = evaluate(before.cfg, before.ctx)
  const ra = evaluate(after.cfg, after.ctx)
  const factors = changedFactors(before, after)
  const teamOf = (cfg, target, id) => findEntity(cfg, target, id)?.team ?? null

  const priceChanges = ra.lines.map((l) => {
    const b = rb.lines.find((x) => x.sku === l.sku)
    if (!b || (b.unit_price === l.unit_price && b.source.id === l.source.id)) return null
    return { sku: l.sku, name: l.product.name, before: { price: b.unit_price, source: b.source }, after: { price: l.unit_price, source: l.source } }
  }).filter(Boolean)

  const offerChanges = after.cfg.offers.map((o) => {
    const a = ra.offers.find((x) => x.id === o.id)
    const b = rb.offers.find((x) => x.id === o.id)
    if (!b || (a.applied === b.applied && a.calculated_discount === b.calculated_discount)) return null
    return { id: o.id, name: o.code || o.name, team: o.team, kind: o.kind, before: b, after: a }
  }).filter(Boolean)

  const schedule = [...after.cfg.priceRules.map((r) => ['priceRule', r]), ...after.cfg.offers.map((o) => ['offer', o])].map(([target, e]) => {
    const b = timeState(findEntity(before.cfg, target, e.id) ?? e, before.ctx.now)
    const a = timeState(e, after.ctx.now)
    return a === b ? null : { target, id: e.id, name: e.code || e.name, team: e.team, before: b, after: a }
  }).filter(Boolean)

  const diff = diffConfig(before.cfg, after.cfg)
  const teams = new Set()
  for (const p of priceChanges) for (const s of [p.before.source, p.after.source]) if (s.team) teams.add(s.team)
  for (const o of offerChanges) teams.add(o.team)
  for (const d of diff) if (d.team) teams.add(d.team)

  const delta = ra.totals.total - rb.totals.total
  const violations = checkContracts(after.cfg).filter((c) => !c.ok)
  const customerInputs = factors.filter((f) => ['cart', 'segment', 'provider', 'selection'].includes(f))
  let verdict
  if (violations.length) verdict = { code: 'CONTRACT_VIOLATION', title: 'Cấu hình lệch contract đã duyệt', text: violations.map((v) => `${v.label}: contract ${fmtVal(v.expected)}, cấu hình ${fmtVal(v.actual)}`).join('; ') }
  else if (delta > 0 && !customerInputs.length) verdict = { code: 'BUSINESS_IMPACT', title: 'Đúng rule nhưng khách trả nhiều hơn', text: 'Cảnh báo tác động kinh doanh. Contract chưa cấm tổ hợp này, nên không kết luận team nào làm sai; các team liên quan cần quyết định.' }
  else if (delta > 0) verdict = { code: 'INPUT_CHANGED', title: 'Khách trả nhiều hơn sau khi đổi lựa chọn', text: `Ngoài ${factors.filter((f) => !customerInputs.includes(f)).map((f) => FACTOR_LABEL[f]).join(', ') || 'cấu hình'}, khách đã đổi ${customerInputs.map((f) => FACTOR_LABEL[f]).join(', ')}. Không quy toàn bộ chênh lệch cho flash sale.` }
  else verdict = { code: 'NO_ISSUE', title: 'Không phát hiện bất lợi trong so sánh này', text: delta < 0 ? `Khách trả ít hơn ${vnd(-delta)}.` : 'Tổng thanh toán không đổi.' }

  return { before: rb, after: ra, factors, priceChanges, offerChanges, schedule, diff, teams: [...teams], delta, violations, verdict, options: fixOptions(after, ra, priceChanges, offerChanges, violations) }
}

const fmtVal = (v) => (v == null ? 'trống' : Array.isArray(v) ? (v.length ? v.join(', ') : 'trống') : typeof v === 'number' && v >= 1000 ? vnd(v) : String(v))
export { fmtVal }

function fixOptions(after, ra, priceChanges, offerChanges, violations) {
  const opts = []
  for (const v of violations) {
    opts.push({
      id: `contract:${v.contract_id}`, owner: v.team, label: `Khôi phục ${v.label} theo contract (${fmtVal(v.expected)})`,
      tradeoff: 'Đưa cấu hình về đúng điều khoản đã duyệt. Nếu thay đổi là chủ ý thì phải sửa contract trước.',
      patch: v.target === 'stacking' ? [setPairMode(after.cfg, v.pair[0], v.pair[1], v.expected)] : [{ target: v.target, id: v.id, path: v.path, value: v.expected }],
    })
  }
  for (const oc of offerChanges) {
    if (!oc.before.applied || oc.after.applied) continue
    const o = after.cfg.offers.find((x) => x.id === oc.id)
    const code = oc.after.reason_codes[0]
    if (code === 'MIN_SPEND') {
      if (o.min_spend_basis !== 'eligible_regular') {
        opts.push({
          id: `basis:${o.id}`, owner: o.team, label: `${oc.name}: tính ngưỡng theo giá ngoài flash`,
          tradeoff: 'Khách giữ voucher khi flash làm giá giảm. Voucher tốn thêm ngân sách cho các đơn flash.',
          patch: [{ target: 'offer', id: o.id, path: 'min_spend_basis', value: 'eligible_regular' }],
        })
      }
      const lowered = Math.floor(oc.after.threshold_basis_amount / 1000) * 1000
      opts.push({
        id: `lower:${o.id}`, owner: o.team, label: `${oc.name}: hạ ngưỡng xuống ${vnd(lowered)}`,
        tradeoff: 'Giữ voucher cho giỏ này, nhưng áp cả cho giỏ nhỏ hơn ngoài giờ flash và lệch điều khoản đã duyệt.',
        patch: [{ target: 'offer', id: o.id, path: 'min_spend', value: lowered }],
      })
      const fl = priceChanges.find((p) => p.after.source.kind === 'flash' && inScope(o, ra.lines.find((l) => l.sku === p.sku).product))
      if (fl) {
        const line = ra.lines.find((l) => l.sku === fl.sku)
        const price = fl.after.price + Math.ceil(oc.after.missing_amount / line.qty / 1000) * 1000
        if (!opts.some((x) => x.id === `flash:${fl.after.source.id}:${fl.sku}`) && price < fl.before.price) {
          opts.push({
            id: `flash:${fl.after.source.id}:${fl.sku}`, owner: fl.after.source.team, label: `${fl.after.source.name}: đặt giá ${fl.name} ${vnd(price)}`,
            tradeoff: 'Khách giữ được voucher, nhưng flash giảm ít hơn mức Merchandising đã chốt.',
            patch: [{ target: 'priceRule', id: fl.after.source.id, path: `prices.${fl.sku}`, value: price }],
          })
        }
      }
    }
    if (code === 'PROVIDER') {
      opts.push({
        id: `provider:${o.id}`, owner: o.team, label: `${oc.name}: thêm ${after.cfg.providers.find((p) => p.id === after.ctx.provider)?.name} vào danh sách hỗ trợ`,
        tradeoff: 'Khách đổi đơn vị vẫn giữ freeship. Logistics phải duyệt chi phí hỗ trợ cho đơn vị mới.',
        patch: [{ target: 'offer', id: o.id, path: 'providers', value: [...(o.providers ?? []), after.ctx.provider] }],
      })
    }
  }
  if (opts.length) opts.push({ id: 'accept', owner: null, label: 'Giữ nguyên, ghi nhận là chủ ý', tradeoff: 'Không đổi cấu hình. Các team sở hữu phải xác nhận đây là kết quả họ muốn.', patch: [] })
  return opts
}

// Thử phương án trên bản sao cấu hình: giỏ bị ảnh hưởng, giỏ ở mốc trước, và các giỏ đối chứng
export function tryFix(option, before, after, controls = []) {
  const fixed = option.patch.reduce((c, p) => applyPatch(c, p), after.cfg)
  const row = (label, ctx, cfgA, cfgB) => ({ label, before: evaluate(cfgA, ctx).totals.total, after: evaluate(cfgB, ctx).totals.total })
  return {
    cfg: fixed,
    rows: [
      row('Giỏ bị ảnh hưởng (hiện tại)', after.ctx, after.cfg, fixed),
      row('Cùng giỏ ở mốc trước', before.ctx, after.cfg, fixed),
      ...controls.map((c) => row(`Đối chứng: ${c.label}`, { ...after.ctx, ...c.ctx }, after.cfg, fixed)),
    ],
  }
}
