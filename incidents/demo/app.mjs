// Giao diện demo: cửa hàng (điện thoại), Demo Control, FlashSRE phân tích, Admin. Mọi con số lấy từ engine.mjs.
import * as E from './engine.mjs'
import { DAY, SCENARIOS, scenarioById } from './scenarios.mjs'

const KEY = 'flashsre-checkout-demo-v1'
const { vnd, clone } = E
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${vnd(Math.abs(n))}`
const minus = (n) => (n ? `−${vnd(n)}` : '0đ')

// ------------------------------------------------------------------ trạng thái
function fresh(id) {
  const { config, ctx } = scenarioById(id).build()
  return { config, ctx, initial: clone(config), baseline: null, audit: [], orders: [] }
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (s && scenarioById(s.scenarioId) && s.states?.[s.scenarioId]?.config) return s
  } catch { /* bộ nhớ trình duyệt không dùng được: chạy với dữ liệu mới */ }
  return { scenarioId: 'A', states: { A: fresh('A') }, panel: 'control', screen: 'checkout', adminTab: 'campaigns' }
}
let S = load()
let saveTimer = null
function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch { /* bỏ qua */ } }, 250)
}
const UI = { draft: null, open: new Set(), codeMsg: '', toast: '', toastTimer: null, drawer: false, running: false, speed: 60, adminEdit: null, fix: null, confirmFix: false, prevWatch: new Map() }
const cur = () => S.states[S.scenarioId]
const scenario = () => scenarioById(S.scenarioId)

function toast(msg) {
  UI.toast = msg
  clearTimeout(UI.toastTimer)
  UI.toastTimer = setTimeout(() => { UI.toast = ''; renderToast() }, 3200)
  renderToast()
}

// Mọi thay đổi cấu hình đi qua đây: tăng version và ghi audit theo diff thật
function commit(patches, actor = null) {
  const st = cur()
  const old = st.config
  let cfg = old
  for (const p of patches) cfg = E.applyPatch(cfg, p)
  const diff = E.diffConfig(old, cfg)
  if (!diff.length) return
  cfg.version = old.version + 1
  st.config = cfg
  for (const d of diff) st.audit.unshift({ at: Date.now(), version: cfg.version, actor: actor ?? (d.team ? E.TEAMS[d.team] : 'Admin'), name: d.name, path: d.path, before: d.before, after: d.after })
  st.audit = st.audit.slice(0, 200)
  UI.fix = null
}

function snapshot() {
  const st = cur()
  st.baseline = { config: clone(st.config), ctx: clone(st.ctx), taken_at: Date.now() }
}

function applyToggle(t, on) {
  const st = cur()
  const r = t.set(on, st.config, st.ctx)
  if (r.patches?.length) commit(r.patches, 'Demo Control')
  if (r.ctx) Object.assign(st.ctx, r.ctx)
}

function loadScenario(id, mode = 'load') {
  S.scenarioId = id
  if (mode !== 'load' || !S.states[id]) S.states[id] = fresh(id)
  S.screen = 'checkout'
  UI.draft = null
  UI.fix = null
  UI.adminEdit = null
  if (mode === 'compare') {
    const sc = scenarioById(id)
    const st = cur()
    if (sc.compare) {
      Object.assign(st.ctx, clone(sc.compare.before))
      snapshot()
      Object.assign(st.ctx, clone(sc.compare.after))
    } else if (sc.toggles?.length) {
      snapshot()
      applyToggle(sc.toggles[0], !sc.toggles[0].isOn(st.config, st.ctx))
    } else snapshot()
    S.panel = window.matchMedia('(max-width: 960px)').matches ? S.panel : 'sre'
  }
}

// ------------------------------------------------------------------ chữ cho ưu đãi
const KIND_TAG = { shop: 'Shop', platform: 'Sàn', brand_day: 'BD', freeship: 'Ship', segment: 'Nhóm' }
const REASON_TAG = {
  MIN_SPEND: 'Chưa đủ giá trị đơn', SCOPE: 'Không đúng sản phẩm/shop', SCOPE_CART: 'Không đúng phạm vi', SEGMENT: 'Không đúng nhóm khách',
  PROVIDER: 'Không hỗ trợ đơn vị vận chuyển', NOT_STARTED: 'Chưa đến giờ', EXPIRED: 'Đã hết hạn', PAUSED: 'Đang tạm dừng',
  BUDGET: 'Hết ngân sách', USES: 'Hết lượt', CONFLICT: 'Xung đột', MAX_OFFERS: 'Đủ số ưu đãi', NO_VALUE: 'Không còn gì để giảm',
}
function headline(o) {
  if (o.kind === 'freeship') return `Hỗ trợ ship tối đa ${vnd(o.discount.value)}`
  if (o.discount.type === 'percent') return `Giảm ${o.discount.value}%${o.discount.cap != null ? ` · tối đa ${vnd(o.discount.cap)}` : ''}`
  return `Giảm ${vnd(o.discount.value)}`
}
function condition(cfg, o) {
  const parts = [o.min_spend ? `Đơn tối thiểu ${vnd(o.min_spend)}` : 'Không yêu cầu đơn tối thiểu']
  if (o.scope && (o.scope.shops?.length || o.scope.categories?.length || o.scope.skus?.length)) parts.push(E.scopeText(cfg, o))
  if (o.segments?.length) parts.push(o.segments.map((s) => E.SEGMENTS[s]).join(', '))
  if (o.kind === 'freeship' && o.providers?.length) parts.push(o.providers.map((p) => cfg.providers.find((x) => x.id === p)?.name ?? p).join(', '))
  return parts.join(' · ')
}
const offerLabel = (cfg, id) => { const o = cfg.offers.find((x) => x.id === id); return o?.code || o?.name || id }

// ------------------------------------------------------------------ điện thoại
function renderPhone(st, r) {
  const screen = S.screen
  const cartCount = st.ctx.lines.reduce((s, l) => s + l.qty, 0)
  const title = screen === 'shop' ? 'Cửa hàng 11.11' : screen === 'offers' ? 'Ưu đãi' : 'Thanh toán'
  const back = screen === 'shop' ? '' : `<button class="icon-btn" data-act="screen" data-to="${screen === 'offers' ? 'checkout' : 'shop'}" aria-label="Quay lại">${ICON.back}</button>`
  const right = screen === 'shop' ? `<button class="cart-btn" data-act="screen" data-to="checkout">Giỏ hàng <b>${cartCount}</b></button>` : ''
  const body = screen === 'shop' ? shopScreen(st) : screen === 'offers' ? offersScreen(st) : checkoutScreen(st, r)
  return `
    <div class="statusbar"><span>${E.fmtTime(st.ctx.now)}</span><span class="sb-icons">${ICON.signal}</span></div>
    <div class="appbar">${back}<h2>${title}</h2>${right}</div>
    ${body}`
}

function priceTag(l) {
  if (l.source.kind === 'list') return ''
  const cls = l.source.kind === 'flash' ? 'src-flash' : 'src-shop'
  return `<span class="src ${cls}">${esc(l.source.name)}</span>`
}

function shopScreen(st) {
  const cfg = st.config
  const r = E.evaluate(cfg, { ...st.ctx, lines: cfg.products.map((p) => ({ sku: p.sku, qty: 1 })), selected: [] })
  const rows = r.lines.map((l) => {
    const inCart = st.ctx.lines.find((x) => x.sku === l.sku)?.qty ?? 0
    return `<li class="prod">
      ${art(l.product)}
      <div class="prod-main">
        <div class="prod-name">${esc(l.product.name)}</div>
        <div class="prod-shop">${esc(cfg.shops[l.product.shop])}</div>
        <div class="prod-price"><b>${vnd(l.unit_price)}</b>${l.unit_price < l.list_price ? `<s>${vnd(l.list_price)}</s>` : ''} ${priceTag(l)}</div>
      </div>
      <button class="btn btn-sm ${inCart ? 'btn-ghost' : ''}" data-act="add" data-sku="${l.sku}">${inCart ? `Trong giỏ: ${inCart} · thêm` : 'Thêm'}</button>
    </li>`
  }).join('')
  return `<div class="screen-body"><ul class="prod-list">${rows}</ul></div>
    <div class="screen-foot"><button class="btn btn-primary btn-block" data-act="screen" data-to="checkout">Xem giỏ hàng và thanh toán</button></div>`
}

function countdown(st) {
  const skus = new Set(st.ctx.lines.map((l) => l.sku))
  const relevant = new Set([...st.config.priceRules.filter((p) => Object.keys(p.prices).some((s) => skus.has(s))).map((p) => p.id), ...st.ctx.selected, ...st.config.offers.filter((o) => o.auto).map((o) => o.id)])
  // chỉ đếm ngược khung giờ ngắn (flash, Brand Day...), bỏ chương trình chạy cả ngày
  const short = new Set([...st.config.priceRules, ...st.config.offers].filter((e) => e.start == null || e.end == null || e.end - e.start < 864e5).map((e) => e.id))
  const ev = E.upcoming(st.config, st.ctx).find((e) => relevant.has(e.id) && short.has(e.id) && e.at - st.ctx.now <= 6 * 3600e3)
  if (!ev) return ''
  const s = Math.max(0, Math.floor((ev.at - st.ctx.now) / 1000))
  const hms = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, '0')).join(':')
  return `<div class="countdown ${ev.type}"><span>${esc(ev.name)} ${ev.type === 'start' ? 'bắt đầu' : 'kết thúc'} sau</span><b>${hms}</b></div>`
}

function checkoutScreen(st, r) {
  const cfg = st.config
  const shops = [...new Set(r.lines.map((l) => l.product.shop))]
  const scoped = r.offers.filter((o) => o.applied && cfg.offers.find((x) => x.id === o.id).kind !== 'freeship')
  const lineNote = (l) => {
    const got = l.discounts.map((d) => `${esc(offerLabel(cfg, d.offer_id))} −${vnd(d.amount)}`)
    const miss = scoped.filter((o) => !l.discounts.some((d) => d.offer_id === o.id)).map((o) => `Không thuộc phạm vi ${esc(o.code || o.name)}`)
    return [...got.map((g) => `<span class="ln-good">${g}</span>`), ...miss.map((m) => `<span class="ln-muted">${m}</span>`)].join('')
  }
  const groups = shops.map((shop) => `
    <section class="card">
      <div class="shop-head">${ICON.store}<b>${esc(cfg.shops[shop])}</b></div>
      ${r.lines.filter((l) => l.product.shop === shop).map((l) => `
        <div class="line">
          ${art(l.product)}
          <div class="line-main">
            <div class="line-name">${esc(l.product.name)}</div>
            <div class="line-price"><b data-watch="price-${l.sku}">${vnd(l.unit_price)}</b>${l.unit_price < l.list_price ? `<s>${vnd(l.list_price)}</s>` : ''}</div>
            <div class="line-src">${priceTag(l) || '<span class="src">Giá niêm yết</span>'}</div>
            <div class="line-notes">${lineNote(l)}</div>
          </div>
          <div class="qty">
            <button data-act="qty" data-sku="${l.sku}" data-d="-1" aria-label="Bớt">−</button><span>${l.qty}</span><button data-act="qty" data-sku="${l.sku}" data-d="1" aria-label="Thêm">+</button>
          </div>
        </div>`).join('')}
    </section>`).join('')

  const freeship = cfg.offers.filter((o) => o.kind === 'freeship' && o.enabled)
  const ship = cfg.providers.map((p) => {
    const fs = freeship.filter((o) => !o.providers?.length || o.providers.includes(p.id))
    return `<label class="ship-opt ${st.ctx.provider === p.id ? 'on' : ''}">
      <input type="radio" name="provider" id="prov-${p.id}" data-act="provider" value="${p.id}" ${st.ctx.provider === p.id ? 'checked' : ''}>
      <span class="ship-name">${esc(p.name)}</span>
      <span class="ship-tag ${fs.length ? 'yes' : 'no'}">${fs.length ? 'Có freeship' : freeship.length ? 'Không có freeship' : ''}</span>
      <span class="ship-fee">${vnd(p.fee)}</span>
    </label>`
  }).join('')

  const applied = r.offers.filter((o) => o.applied)
  const lost = r.offers.filter((o) => o.status === 'selected_not_applied')
  const t = r.totals
  const bill = [
    ['Tổng tiền hàng (giá hiện hành)', vnd(t.subtotal), 'subtotal'],
    t.discounts.shop ? ['Giảm voucher shop', minus(t.discounts.shop), 'd-shop', 'neg'] : null,
    t.discounts.platform ? ['Giảm voucher sàn', minus(t.discounts.platform), 'd-platform', 'neg'] : null,
    t.discounts.brand_day ? ['Giảm Brand Day', minus(t.discounts.brand_day), 'd-bd', 'neg'] : null,
    t.discounts.segment ? ['Ưu đãi nhóm khách', minus(t.discounts.segment), 'd-seg', 'neg'] : null,
    ['Phí vận chuyển gốc', vnd(t.shipping_fee), 'fee'],
    t.shipping_support ? ['Hỗ trợ vận chuyển', minus(t.shipping_support), 'ship', 'neg'] : null,
  ].filter(Boolean).map(([k, v, w, c]) => `<div class="bill-row ${c ?? ''}"><span>${k}</span><b data-watch="${w}">${v}</b></div>`).join('')

  const empty = !r.lines.length
  return `<div class="screen-body">
    ${countdown(st)}
    <section class="card addr">${ICON.pin}<div><b>Lan Nguyễn · 09xx xxx 123</b><span>1 Lê Lợi, Hoàn Kiếm, Hà Nội</span></div></section>
    ${empty ? '<section class="card empty">Giỏ hàng đang trống. <button class="link" data-act="screen" data-to="shop">Chọn sản phẩm</button></section>' : groups}
    <button class="link add-more" data-act="screen" data-to="shop">+ Thêm sản phẩm khác</button>
    <section class="card">
      <div class="sec-title">Đơn vị vận chuyển</div>
      <div class="ship-list">${ship}</div>
    </section>
    <section class="card offers-entry" data-act="open-offers" role="button" tabindex="0">
      <div class="oe-head"><span class="sec-title">Ưu đãi</span><span class="oe-cta">${applied.length ? `${applied.length} đang áp dụng` : 'Chọn hoặc nhập mã'} ${ICON.chev}</span></div>
      ${applied.length ? `<div class="chips">${applied.map((o) => `<span class="chip k-${o.kind}">${esc(o.code || o.name)} −${vnd(o.calculated_discount)}</span>`).join('')}</div>` : ''}
      ${lost.map((o) => `<div class="lost">${ICON.warn}<div><b>Bạn đã chọn ${esc(o.code || o.name)} — hiện không áp dụng.</b><span>${esc(o.reason_text)}</span></div></div>`).join('')}
    </section>
    <section class="card">
      <div class="sec-title">Chi tiết thanh toán</div>
      ${bill}
      <div class="bill-row total"><span>Tổng thanh toán</span><b data-watch="total">${vnd(t.total)}</b></div>
      ${why(st, r)}
    </section>
  </div>
  <div class="screen-foot pay">
    <div><span class="muted">Tổng thanh toán</span><b class="pay-total" data-watch="total-foot">${vnd(t.total)}</b>${t.goods_discount + t.shipping_support ? `<span class="saved">Tiết kiệm ${vnd(t.goods_discount + t.shipping_support)}</span>` : ''}</div>
    <button class="btn btn-primary" data-act="order" ${empty ? 'disabled' : ''}>Đặt đơn mô phỏng</button>
  </div>`
}

function why(st, r) {
  const cfg = st.config
  const list = (ids) => (ids.length ? ids.map((id) => `<span class="chip">${esc(offerLabel(cfg, id))}</span>`).join('') : '<span class="muted">không có</span>')
  const steps = r.trace.map((s) => `<tr class="${s.result}">
      <td>${s.result === 'applied' ? s.order : '–'}</td>
      <td><b>${esc(s.name)}</b><div class="muted">${E.OFFER_KINDS[s.kind]}</div></td>
      <td>${esc(E.MIN_SPEND_BASIS[s.basis_kind] ?? '')}: ${vnd(s.basis)}${s.min_spend ? ` / cần ${vnd(s.min_spend)}` : ''}</td>
      <td>${s.result === 'applied' ? `${s.base_kind === 'shipping' ? 'Phí giao' : esc(E.DISCOUNT_BASIS[s.base_kind])}: ${vnd(s.base)}` : esc(s.reason)}</td>
      <td class="num">${s.result === 'applied' ? `−${vnd(s.discount)}` : '–'}</td>
    </tr>`).join('')
  const prices = r.lines.map((l) => `<li><b>${esc(l.product.name)}</b>: ${l.candidates.length ? l.candidates.map((c) => `${esc(c.name)} ${vnd(c.price)} <span class="muted">(${c.active ? 'đang hiệu lực' : esc(E.TIME_STATE_LABEL[c.state])})</span>`).join(' · ') + ' · ' : ''}Giá niêm yết ${vnd(l.list_price)}. <span class="win">Áp dụng: ${esc(l.source.name)} ${vnd(l.unit_price)}</span></li>`).join('')
  return `<details class="why" ${UI.open.has('why') ? 'open' : ''} data-open="why">
    <summary>Vì sao ra số tiền này?</summary>
    <div class="why-body">
      <div class="why-sets">
        <div><span class="lbl">Mã đã chọn/nhập</span>${list(r.selected_ids)}</div>
        <div><span class="lbl">Mã đủ điều kiện</span>${list(r.eligible_ids)}</div>
        <div><span class="lbl">Mã thực sự áp dụng</span>${list(r.applied_ids)}</div>
      </div>
      <div class="lbl">Nguồn giá (nhiều giá cùng hiệu lực thì giá thấp nhất thắng)</div>
      <ul class="why-prices">${prices}</ul>
      <div class="lbl">Thứ tự tính</div>
      ${steps ? `<div class="tbl-wrap"><table class="trace"><thead><tr><th>#</th><th>Ưu đãi</th><th>Điều kiện tối thiểu</th><th>Cơ sở tính</th><th>Giảm</th></tr></thead><tbody>${steps}</tbody></table></div>` : '<p class="muted">Chưa có ưu đãi nào được tính.</p>'}
      <p class="muted small">Giảm phần trăm làm tròn xuống đến đồng. Khoản giảm chia cho các dòng hàng đủ điều kiện theo tỷ lệ.</p>
    </div>
  </details>`
}

function offersScreen(st) {
  const cfg = st.config
  const draft = UI.draft ?? [...st.ctx.selected]
  const r = E.evaluate(cfg, { ...st.ctx, selected: draft })
  const rank = { applied: 0, selected_not_applied: 1, available: 2, blocked: 3 }
  const cards = [...r.offers].sort((a, b) => rank[a.status] - rank[b.status]).map((o) => offerCard(cfg, o, cfg.offers.find((x) => x.id === o.id), r)).join('')
  const picked = r.offers.filter((o) => o.selected && !o.auto)
  const n = picked.length
  const idle = picked.filter((o) => !o.applied).length
  return `<div class="screen-body offers-body">
    <form class="code-row" data-form="code">
      <label for="code-input" class="sr">Nhập mã ưu đãi</label>
      <input id="code-input" placeholder="Nhập mã ưu đãi" autocomplete="off" autocapitalize="characters">
      <button class="btn btn-sm" type="submit">Áp dụng</button>
    </form>
    ${UI.codeMsg ? `<p class="code-msg">${esc(UI.codeMsg)}</p>` : ''}
    <ul class="offer-list">${cards || '<li class="muted pad">Chưa có chương trình nào.</li>'}</ul>
  </div>
  <div class="screen-foot">
    <div class="foot-sum"><span>Giảm tiền hàng <b>${vnd(r.totals.goods_discount)}</b></span><span>Hỗ trợ vận chuyển <b>${vnd(r.totals.shipping_support)}</b></span>${idle ? `<span class="foot-idle">${idle} mã đã chọn chưa đủ điều kiện</span>` : ''}</div>
    <button class="btn btn-primary btn-block" data-act="apply-offers">Áp dụng · ${n} ưu đãi</button>
  </div>`
}

function offerCard(cfg, o, raw, r) {
  const open = UI.open.has(`offer-${o.id}`)
  let state = ''
  if (o.status === 'applied') state = `<span class="o-ok">${o.auto ? 'Tự động áp dụng' : 'Đang áp dụng'} · ${o.kind === 'freeship' ? 'hỗ trợ' : 'giảm'} ${vnd(o.calculated_discount)}</span>`
  else if (o.status === 'available') state = `<span class="o-ok soft">Dùng được · ${o.kind === 'freeship' ? 'hỗ trợ' : 'giảm'} ${vnd(o.calculated_discount)} cho giỏ này</span>`
  else if (o.status === 'selected_not_applied') state = `<span class="o-lost">${ICON.warn} ${o.auto ? 'Tự động' : 'Bạn đã chọn'} — hiện không áp dụng. ${esc(o.reason_text)}</span>`
  else state = `<span class="o-why"><em>${REASON_TAG[o.reason_codes[0]] ?? ''}</em> ${esc(o.reason_text)}</span>`
  const swapIds = o.conflicting_offer_ids.filter((id) => !cfg.offers.find((x) => x.id === id)?.auto)
  const swap = o.reason_codes[0] === 'CONFLICT' && swapIds.length === o.conflicting_offer_ids.length && !o.auto
    ? `<button class="link" data-act="swap" data-take="${o.id}" data-drop="${swapIds.join(',')}">Đổi ${esc(swapIds.map((id) => offerLabel(cfg, id)).join(', '))} lấy ${esc(o.code || o.name)}</button>` : ''
  const checked = o.selected
  const box = o.auto
    ? '<span class="auto-pill">Tự động</span>'
    : (o.status === 'available' || checked)
      ? `<input type="checkbox" class="ck" id="ck-${o.id}" data-act="pick" data-id="${o.id}" ${checked ? 'checked' : ''} aria-label="Chọn ${esc(o.code || o.name)}">`
      : `<input type="checkbox" class="ck" id="ck-${o.id}" disabled aria-label="${esc(o.code || o.name)} chưa dùng được">`
  const details = open ? `<dl class="o-details">
      <dt>Chương trình</dt><dd>${esc(raw.name)} · ${esc(E.TEAMS[raw.team])}</dd>
      ${raw.description ? `<dt>Mô tả</dt><dd>${esc(raw.description)}</dd>` : ''}
      <dt>Phạm vi</dt><dd>${esc(E.scopeText(cfg, raw))}${raw.scope_mode === 'cart' ? ' (chặn cả giỏ nếu có hàng ngoài phạm vi)' : ''}</dd>
      <dt>Nhóm khách</dt><dd>${raw.segments?.length ? raw.segments.map((s) => E.SEGMENTS[s]).join(', ') : 'Tất cả'}</dd>
      <dt>Tối thiểu</dt><dd>${raw.min_spend ? `${vnd(raw.min_spend)} · ${esc(E.MIN_SPEND_BASIS[raw.min_spend_basis])}` : 'Không yêu cầu'}${o.threshold_basis_amount != null ? ` · giỏ này: ${vnd(o.threshold_basis_amount)}` : ''}</dd>
      ${raw.kind === 'freeship' ? `<dt>Đơn vị vận chuyển</dt><dd>${raw.providers?.length ? raw.providers.map((p) => cfg.providers.find((x) => x.id === p)?.name ?? p).join(', ') : 'Tất cả'}</dd>` : `<dt>Cơ sở tính</dt><dd>${esc(E.DISCOUNT_BASIS[raw.discount_basis])}</dd>`}
      <dt>Hiệu lực</dt><dd>${esc(E.fmtRange(raw))} · ${esc(E.TIME_STATE_LABEL[o.time_state])}</dd>
      ${raw.budget != null ? `<dt>Ngân sách còn</dt><dd>${vnd(raw.budget)}${raw.uses != null ? ` · ${raw.uses} lượt` : ''}</dd>` : raw.uses != null ? `<dt>Lượt còn</dt><dd>${raw.uses}</dd>` : ''}
    </dl>` : ''
  return `<li class="offer k-${o.kind} st-${o.status}">
    <div class="ticket" aria-hidden="true"><span>${KIND_TAG[o.kind]}</span></div>
    <div class="o-main">
      <div class="o-title">${esc(headline(raw))}</div>
      <div class="o-cond">${esc(o.code || raw.name)} · ${esc(condition(cfg, raw))}</div>
      <div class="o-time">${esc(E.fmtRange(raw))}</div>
      <div class="o-state">${state}</div>
      <div class="o-actions"><button class="link" data-act="toggle-open" data-key="offer-${o.id}">${open ? 'Thu gọn' : 'Điều kiện'} ${ICON.chev}</button>${swap}</div>
      ${details}
    </div>
    <div class="o-box">${box}</div>
  </li>`
}

// ------------------------------------------------------------------ panel bên phải
function renderSide(st, r) {
  const tabs = [['control', 'Demo Control', 'Điều khiển'], ['sre', 'FlashSRE phân tích', 'FlashSRE'], ['admin', 'Admin khuyến mãi', 'Admin']]
  const body = S.panel === 'sre' ? srePanel(st) : S.panel === 'admin' ? adminPanel(st) : controlPanel(st, r)
  return `<div class="side-head">
      <div class="tabs" role="tablist">${tabs.map(([id, l, short]) => `<button role="tab" aria-selected="${S.panel === id}" class="tab ${S.panel === id ? 'on' : ''}" data-act="panel" data-to="${id}"><span class="l-long">${l}</span><span class="l-short">${short}</span></button>`).join('')}</div>
      <button class="icon-btn drawer-close" data-act="drawer" aria-label="Đóng">${ICON.close}</button>
    </div>
    <div class="side-body">${body}</div>`
}

function controlPanel(st, r) {
  const sc = scenario()
  const btns = (s, primary) => `<div class="sc-btns">
      <button class="btn btn-sm ${primary ? 'btn-primary' : 'btn-ghost'}" data-act="sc-load" data-id="${s.id}">Nạp kịch bản</button>
      <button class="btn btn-sm btn-ghost" data-act="sc-compare" data-id="${s.id}">So sánh trước và sau</button>
      <button class="btn btn-sm btn-ghost" data-act="sc-reset" data-id="${s.id}">Reset kịch bản</button>
    </div>`
  const teams = (s) => `<div class="sc-teams">${s.teams.map((t) => `<span class="team t-${t}">${E.TEAMS[t]}</span>`).join('')}</div>`
  const library = SCENARIOS.filter((s) => s.id !== sc.id).map((s) => `<article class="sc">
      <div class="sc-head"><span class="sc-id">${s.id}</span><h3>${esc(s.title)}</h3></div>
      ${teams(s)}
      <p class="sc-obs small">${esc(s.observe)}</p>
      ${btns(s, true)}
    </article>`).join('')
  return `<section class="panel-sec">
      <h4>Kịch bản đang chạy</h4>
      <article class="sc on">
        <div class="sc-head"><span class="sc-id">${sc.id}</span><h3>${esc(sc.title)}</h3></div>
        ${teams(sc)}
        <p class="sc-obs">${esc(sc.observe)}</p>
        <p class="sc-camps">Campaign: ${sc.campaigns.join(', ')}${sc.note ? ` · ${esc(sc.note)}` : ''}</p>
        ${btns(sc, false)}
      </article>
    </section>
    ${clockSec(st)}
    <section class="panel-sec">
      <h4>Khách hàng và cấu hình nhanh</h4>
      <div class="seg" role="radiogroup" aria-label="Nhóm khách">${Object.entries(E.SEGMENTS).map(([k, l]) => `<button role="radio" aria-checked="${st.ctx.segment === k}" class="${st.ctx.segment === k ? 'on' : ''}" data-act="segment" data-to="${k}">${l}</button>`).join('')}</div>
      ${(sc.toggles ?? []).map((t) => `<label class="toggle"><input type="checkbox" id="tg-${t.id}" data-act="toggle" data-id="${t.id}" ${t.isOn(st.config, st.ctx) ? 'checked' : ''}><span>${esc(t.label)}</span></label>`).join('')}
    </section>
    ${compareSec(st, r)}
    <section class="panel-sec"><h4>Thư viện kịch bản</h4><div class="sc-grid">${library}</div></section>`
}

function clockSec(st) {
  const sc = scenario()
  const flash = st.config.priceRules.find((p) => p.kind === 'flash')
  const marks = flash ? [['Trước Flash Sale', flash.start - 30 * 60e3], ['Đúng giờ bắt đầu', flash.start], ['Trong Flash Sale', flash.start + 30 * 60e3], ['Sau khi kết thúc', flash.end]] : []
  return `<section class="panel-sec clock">
    <h4>Đồng hồ demo <span class="muted">· giờ Việt Nam, độc lập với giờ máy</span></h4>
    <div class="clock-face"><b id="clock-big">${E.fmtTime(st.ctx.now, true)}</b><span>${E.fmtWeekday(st.ctx.now)}, ${E.fmtDate(st.ctx.now)}/2026</span>
      <span class="run ${UI.running ? 'on' : ''}">${UI.running ? `Đang chạy ×${UI.speed}` : 'Đã dừng'}</span></div>
    <div class="btn-row">
      ${marks.map(([l, t]) => `<button class="btn btn-sm btn-ghost" data-act="time" data-t="${t}">${l}</button>`).join('')}
      ${(sc.times ?? []).map((h) => `<button class="btn btn-sm btn-ghost" data-act="time" data-t="${E.at(DAY, h)}">${h}</button>`).join('')}
    </div>
    <div class="btn-row">
      <button class="btn btn-sm btn-ghost" data-act="step" data-ms="60000">+1 phút</button>
      <button class="btn btn-sm btn-ghost" data-act="step" data-ms="3600000">+1 giờ</button>
      <button class="btn btn-sm" data-act="run">${UI.running ? 'Tạm dừng' : 'Chạy'}</button>
      <label class="inline">Tốc độ <select id="speed" data-act="speed">${[1, 60, 600].map((x) => `<option value="${x}" ${UI.speed === x ? 'selected' : ''}>×${x}</option>`).join('')}</select></label>
      <label class="inline">Đặt giờ <input type="datetime-local" id="clock-input" data-act="clock-input" value="${E.toLocalInput(st.ctx.now)}"></label>
    </div>
    <p class="muted small">Bắt đầu được tính, thời điểm kết thúc không còn hiệu lực. Tua giờ hay xem trước không tiêu ngân sách; chỉ nút Đặt đơn mô phỏng mới ghi nhận.</p>
  </section>`
}

function baselineLabel(b) {
  const flash = b.config.priceRules.find((p) => p.kind === 'flash')
  return flash && b.ctx.now < flash.start ? 'Mốc trước flash — mô phỏng' : 'Mốc trước — mô phỏng'
}

function compareSec(st, r) {
  const b = st.baseline
  if (!b) {
    return `<section class="panel-sec"><h4>So sánh trước và sau</h4>
      <p class="muted">Chụp mốc lưu toàn bộ giỏ, nhóm khách, đơn vị vận chuyển, mã đã chọn, thời gian và version cấu hình.</p>
      <button class="btn" data-act="snapshot">Chụp mốc trước</button></section>`
  }
  const rb = E.evaluate(b.config, b.ctx)
  const factors = E.changedFactors({ cfg: b.config, ctx: b.ctx }, { cfg: st.config, ctx: st.ctx })
  const extra = factors.filter((f) => f !== 'time')
  const rows = []
  const skus = [...new Set([...rb.lines, ...r.lines].map((l) => l.sku))]
  for (const sku of skus) {
    const x = rb.lines.find((l) => l.sku === sku)
    const y = r.lines.find((l) => l.sku === sku)
    const fmt = (l) => (l ? `${vnd(l.unit_price)} × ${l.qty}<div class="muted">${esc(l.source.name)}</div>` : '<span class="muted">không có</span>')
    rows.push([`Giá ${esc((x ?? y).product.name)}`, fmt(x), fmt(y), x && y && x.amount !== y.amount ? signed(y.amount - x.amount) : ''])
  }
  const ids = [...new Set([...rb.offers, ...r.offers].filter((o) => o.selected || o.applied).map((o) => o.id))]
  for (const id of ids) {
    const x = rb.offers.find((o) => o.id === id)
    const y = r.offers.find((o) => o.id === id)
    const fmt = (o) => (!o ? '<span class="muted">không có</span>' : o.applied ? `<span class="good">được ${minus(o.calculated_discount)}</span>` : `<span class="bad">mất</span><div class="muted">${esc(o.reason_text)}</div>`)
    const label = (x ?? y).kind === 'freeship' ? `Freeship ${esc((x ?? y).code)}` : `Voucher ${esc((x ?? y).code || (x ?? y).name)}`
    rows.push([label, fmt(x), fmt(y), ''])
  }
  rows.push(['Phí giao', vnd(rb.totals.shipping_fee), vnd(r.totals.shipping_fee), ''])
  const d = r.totals.total - rb.totals.total
  const p = rb.totals.total ? (d / rb.totals.total) * 100 : 0
  const verdict = d > 0 ? 'Khách trả nhiều hơn' : d < 0 ? 'Khách trả ít hơn' : 'Không đổi'
  return `<section class="panel-sec">
    <h4>So sánh trước và sau</h4>
    <div class="base-meta"><b>${baselineLabel(b)}</b><span>${E.fmtTime(b.ctx.now)} ${E.fmtDate(b.ctx.now)} · cấu hình v${b.config.version} → hiện tại ${E.fmtTime(st.ctx.now)} · v${st.config.version}</span></div>
    ${extra.length ? `<div class="warn-box">${ICON.warn}<span>Ngoài thời gian, đã đổi thêm: <b>${extra.map((f) => E.FACTOR_LABEL[f]).join(', ')}</b>. Không quy toàn bộ chênh lệch cho flash sale.</span></div>` : factors.length ? '<div class="note-box">Chỉ thời gian thay đổi; giỏ, nhóm khách, vận chuyển, mã đã chọn và cấu hình giữ nguyên.</div>' : '<div class="note-box">Chưa có gì thay đổi so với mốc.</div>'}
    <div class="tbl-wrap"><table class="cmp">
      <thead><tr><th></th><th>Mốc trước</th><th>Hiện tại</th><th>Chênh</th></tr></thead>
      <tbody>${rows.map((x) => `<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td class="num">${x[3]}</td></tr>`).join('')}
        <tr class="tot"><td>Tổng thanh toán</td><td>${vnd(rb.totals.total)}</td><td>${vnd(r.totals.total)}</td><td></td></tr>
      </tbody></table></div>
    <div class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}"><span class="arrow">${d > 0 ? '▲' : d < 0 ? '▼' : '■'}</span><b>${signed(d)}</b><span>(${p > 0 ? '+' : ''}${E.pct(p)})</span><span class="delta-lbl">${verdict}</span></div>
    <div class="btn-row"><button class="btn btn-sm btn-ghost" data-act="snapshot">Chụp lại mốc</button><button class="btn btn-sm btn-ghost" data-act="clear-baseline">Xóa mốc</button><button class="btn btn-sm" data-act="panel" data-to="sre">Xem FlashSRE phân tích</button></div>
    ${st.orders.length ? `<p class="muted small">Đã đặt ${st.orders.length} đơn mô phỏng trong kịch bản này.</p>` : ''}
  </section>`
}

// ------------------------------------------------------------------ FlashSRE
function srePanel(st) {
  const b = st.baseline
  if (!b) {
    return `<section class="panel-sec empty-state"><h4>FlashSRE phân tích</h4>
      <p>Chưa có mốc để so sánh. Bấm <b>So sánh trước và sau</b> ở một kịch bản, hoặc chụp mốc trong Demo Control rồi đổi giờ hoặc cấu hình.</p>
      <button class="btn" data-act="snapshot">Chụp mốc trước</button></section>`
  }
  const before = { cfg: b.config, ctx: b.ctx }
  const after = { cfg: st.config, ctx: st.ctx }
  const a = E.analyze(before, after)
  const cfg = st.config
  const st2 = (s) => E.TIME_STATE_LABEL[s]
  const changes = [
    ...a.schedule.map((s) => `<li><b>${esc(s.name)}</b> (${E.TEAMS[s.team] ?? ''}): ${st2(s.before)} → ${st2(s.after)}</li>`),
    ...a.priceChanges.map((p) => `<li><b>${esc(p.name)}</b>: ${vnd(p.before.price)} (${esc(p.before.source.name)}) → ${vnd(p.after.price)} (${esc(p.after.source.name)})</li>`),
    ...a.offerChanges.map((o) => `<li><b>${esc(o.name)}</b> (${E.TEAMS[o.team]}): ${o.before.applied ? `áp dụng ${minus(o.before.calculated_discount)}` : 'không áp dụng'} → ${o.after.applied ? `áp dụng ${minus(o.after.calculated_discount)}` : `<span class="bad">không áp dụng</span>. ${esc(o.after.reason_text)}`}</li>`),
  ]
  const diff = a.diff.length
    ? `<div class="tbl-wrap"><table class="diff"><thead><tr><th>Đối tượng</th><th>Trường</th><th>Trước</th><th>Sau</th></tr></thead><tbody>${a.diff.map((d) => `<tr><td>${esc(d.name)}<div class="muted">${E.TEAMS[d.team] ?? ''}</div></td><td><code>${esc(d.path)}</code></td><td>${esc(E.fmtVal(d.before))}</td><td>${esc(E.fmtVal(d.after))}</td></tr>`).join('')}</tbody></table></div>`
    : `<p class="muted">Không có thay đổi cấu hình.${a.schedule.length ? ' Chênh lệch đến từ lịch chạy campaign.' : ''}</p>`
  const repro = { thoi_diem: `${E.fmtTime(st.ctx.now)} ${E.fmtDate(st.ctx.now)}`, gio: st.ctx.lines.filter((l) => l.qty).map((l) => `${l.sku} × ${l.qty}`), nhom_khach: st.ctx.segment, van_chuyen: st.ctx.provider, ma_da_chon: st.ctx.selected, cau_hinh: `v${cfg.version}` }
  const contracts = E.checkContracts(cfg)
  const opts = a.options.map((o) => {
    const tried = UI.fix?.id === o.id
    return `<li class="opt ${tried ? 'on' : ''}">
      <div class="opt-head"><b>${esc(o.label)}</b>${o.owner ? `<span class="team t-${o.owner}">${E.TEAMS[o.owner]}</span>` : ''}</div>
      <p class="muted">${esc(o.tradeoff)}</p>
      ${o.patch.length ? `<button class="btn btn-sm btn-ghost" data-act="fix-try" data-id="${esc(o.id)}">Thử phương án sửa</button>` : ''}
      ${tried ? fixResult(o) : ''}
    </li>`
  }).join('')
  return `<p class="det-note">Phân tích deterministic từ evaluator, không dùng LLM. Mốc: ${baselineLabel(b)} (${E.fmtTime(b.ctx.now)}, v${b.config.version}).</p>
    <section class="verdict v-${a.verdict.code}"><b>${esc(a.verdict.title)}</b><span>${esc(a.verdict.text)}</span>
      <span class="verdict-num">${signed(a.delta)} · ${vnd(a.before.totals.total)} → ${vnd(a.after.totals.total)}</span></section>
    <section class="panel-sec"><h4>Điều kiện đổi trạng thái</h4>${changes.length ? `<ul class="bullets">${changes.join('')}</ul>` : '<p class="muted">Không có điều kiện nào đổi.</p>'}</section>
    <section class="panel-sec"><h4>Campaign và team liên quan</h4><div class="chips">${a.teams.map((t) => `<span class="team t-${t}">${E.TEAMS[t]}</span>`).join('') || '<span class="muted">không có</span>'}</div></section>
    <section class="panel-sec"><h4>Thay đổi cấu hình</h4>${diff}</section>
    <section class="panel-sec"><h4>Giỏ tái hiện</h4><pre class="repro">${esc(JSON.stringify(repro, null, 2))}</pre><button class="btn btn-sm btn-ghost" data-act="copy-repro">Sao chép</button></section>
    <section class="panel-sec"><h4>Contract đã duyệt</h4>${contracts.length ? `<ul class="contracts">${contracts.map((c) => `<li class="${c.ok ? 'ok' : 'bad'}"><span>${c.ok ? 'Khớp' : 'Lệch'}</span>${esc(c.label)} · contract ${esc(E.fmtVal(c.expected))}${c.ok ? '' : `, cấu hình ${esc(E.fmtVal(c.actual))}`}</li>`).join('')}</ul>` : '<p class="muted">Kịch bản này không khai báo điều khoản contract.</p>'}</section>
    <section class="panel-sec"><h4>Phương án xử lý</h4>${opts ? `<ul class="opts">${opts}</ul>` : '<p class="muted">Không cần xử lý.</p>'}</section>`
}

function fixResult(o) {
  const rows = UI.fix.result.rows.map((x) => `<tr><td>${esc(x.label)}</td><td>${vnd(x.before)}</td><td>${vnd(x.after)}</td><td class="num">${x.after === x.before ? '0đ' : signed(x.after - x.before)}</td></tr>`).join('')
  return `<div class="fix">
    <div class="tbl-wrap"><table class="cmp"><thead><tr><th>Giỏ</th><th>Cấu hình hiện tại</th><th>Sau khi sửa</th><th>Chênh</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="muted small">Chạy trên bản sao cấu hình. Cấu hình thật chưa đổi.</p>
    ${UI.confirmFix
      ? `<div class="btn-row"><b>Áp phương án này vào cấu hình?</b><button class="btn btn-sm btn-primary" data-act="fix-apply" data-id="${esc(o.id)}">Xác nhận áp dụng</button><button class="btn btn-sm btn-ghost" data-act="fix-cancel">Hủy</button></div>`
      : `<button class="btn btn-sm" data-act="fix-confirm">Áp dụng cấu hình này</button>`}
  </div>`
}

// ------------------------------------------------------------------ Admin
const ADMIN_TABS = [['campaigns', 'Chương trình'], ['stacking', 'Cộng dồn'], ['order', 'Thứ tự tính'], ['history', 'Lịch sử']]
function adminPanel(st) {
  const t = S.adminTab ?? 'campaigns'
  const body = t === 'stacking' ? adminStacking(st) : t === 'order' ? adminOrder(st) : t === 'history' ? adminHistory(st) : adminCampaigns(st)
  return `<div class="subtabs">${ADMIN_TABS.map(([id, l]) => `<button class="${t === id ? 'on' : ''}" data-act="admin-tab" data-to="${id}">${l}</button>`).join('')}<span class="muted ver">Cấu hình v${st.config.version}</span></div>${body}`
}

function stateChip(e, now) {
  const s = E.timeState(e, now)
  return `<span class="state s-${s}">${E.TIME_STATE_LABEL[s]}</span>`
}

function adminCampaigns(st) {
  const cfg = st.config
  const row = (target, e, kindLabel) => `<tr class="${UI.adminEdit?.id === e.id ? 'sel' : ''}">
    <td><label class="switch"><input type="checkbox" id="en-${e.id}" data-edit data-target="${target}" data-id="${e.id}" data-path="enabled" data-kind="bool" ${e.enabled ? 'checked' : ''} aria-label="Bật ${esc(e.name)}"><span></span></label></td>
    <td><b>${esc(e.code || e.name)}</b><div class="muted">${esc(kindLabel)}</div></td>
    <td><span class="team t-${e.team}">${E.TEAMS[e.team]}</span></td>
    <td>${esc(E.fmtRange(e))}</td>
    <td>${stateChip(e, st.ctx.now)}</td>
    <td><button class="btn btn-sm btn-ghost" data-act="admin-edit" data-target="${target}" data-id="${e.id}">${UI.adminEdit?.id === e.id ? 'Đóng' : 'Sửa'}</button></td>
  </tr>${UI.adminEdit?.id === e.id ? `<tr class="form-row"><td colspan="6">${target === 'offer' ? offerForm(cfg, e) : priceForm(cfg, e)}</td></tr>` : ''}`
  return `<section class="panel-sec">
    <div class="create"><label for="new-kind">Tạo chương trình</label>
      <select id="new-kind">
        ${Object.entries(E.PRICE_KINDS).map(([k, l]) => `<option value="priceRule:${k}">${l}</option>`).join('')}
        ${Object.entries(E.OFFER_KINDS).map(([k, l]) => `<option value="offer:${k}">${l}</option>`).join('')}
      </select><button class="btn btn-sm" data-act="admin-create">Tạo</button></div>
    <h4>Giá</h4>
    <div class="tbl-wrap"><table class="admin"><thead><tr><th>Bật</th><th>Chương trình</th><th>Team</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>${cfg.priceRules.map((p) => row('priceRule', p, E.PRICE_KINDS[p.kind])).join('') || '<tr><td colspan="6" class="muted">Không có price rule.</td></tr>'}</tbody></table></div>
    <h4>Ưu đãi</h4>
    <div class="tbl-wrap"><table class="admin"><thead><tr><th>Bật</th><th>Chương trình</th><th>Team</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>${cfg.offers.map((o) => row('offer', o, E.OFFER_KINDS[o.kind])).join('')}</tbody></table></div>
  </section>`
}

const fid = (target, id, path) => `f-${target}-${id}-${path}`.replace(/[^a-zA-Z0-9_-]/g, '_')
function field(label, target, e, path, kind, extra = {}) {
  const id = fid(target, e.id, path)
  const v = E.getPath(e, path)
  const attrs = `id="${id}" data-edit data-target="${target}" data-id="${e.id}" data-path="${path}" data-kind="${kind}"`
  let input
  if (kind === 'select') input = `<select ${attrs}>${Object.entries(extra.options).map(([k, l]) => `<option value="${k}" ${String(v) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
  else if (kind === 'bool') input = `<input type="checkbox" ${attrs} ${v ? 'checked' : ''}>`
  else if (kind === 'time' || kind === 'timenull') input = `<input type="datetime-local" ${attrs} value="${v != null ? E.toLocalInput(v) : ''}">`
  else if (kind === 'num' || kind === 'numnull') input = `<input type="number" inputmode="numeric" step="${extra.step ?? 1000}" min="0" ${attrs} value="${v ?? ''}" placeholder="${extra.placeholder ?? ''}">`
  else input = `<input type="text" ${attrs} value="${esc(v ?? '')}" placeholder="${extra.placeholder ?? ''}">`
  return `<div class="f"><label for="${id}">${label}</label>${input}${extra.hint ? `<small>${esc(extra.hint)}</small>` : ''}</div>`
}
function listField(label, target, e, path, options, { emptyNull = false, hint = '' } = {}) {
  const v = E.getPath(e, path) ?? []
  const group = fid(target, e.id, path)
  return `<fieldset class="f f-list"><legend>${label}</legend><div class="checks">${Object.entries(options).map(([k, l]) => `<label><input type="checkbox" id="${group}-${k.replace(/[^a-zA-Z0-9_-]/g, '_')}" data-group="${group}" data-edit data-target="${target}" data-id="${e.id}" data-path="${path}" data-kind="list" data-empty="${emptyNull ? 'null' : 'arr'}" value="${esc(k)}" ${v.includes(k) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div>${hint ? `<small>${esc(hint)}</small>` : ''}</fieldset>`
}

function offerForm(cfg, o) {
  const T = 'offer'
  const products = Object.fromEntries(cfg.products.map((p) => [p.sku, p.name]))
  return `<div class="form">
    <div class="f-grid">
      ${field('Mã', T, o, 'code', 'text')}
      ${field('Tên', T, o, 'name', 'text')}
      ${field('Loại', T, o, 'kind', 'select', { options: E.OFFER_KINDS })}
      ${field('Team sở hữu', T, o, 'team', 'select', { options: E.TEAMS })}
      ${field('Bắt đầu', T, o, 'start', 'timenull')}
      ${field('Kết thúc', T, o, 'end', 'timenull', { hint: 'Lúc kết thúc đã hết hiệu lực.' })}
      ${field('Mô tả', T, o, 'description', 'text')}
      ${field('Tự động áp dụng', T, o, 'auto', 'bool')}
    </div>
    <h5>Phạm vi</h5>
    ${listField('Shop', T, o, 'scope.shops', cfg.shops, { hint: 'Không chọn = mọi shop.' })}
    ${listField('Ngành hàng', T, o, 'scope.categories', cfg.categories)}
    ${listField('SKU', T, o, 'scope.skus', products)}
    ${listField('Loại trừ SKU', T, o, 'scope.exclude_skus', products)}
    <div class="f-grid">${field('Cách áp phạm vi', T, o, 'scope_mode', 'select', { options: E.SCOPE_MODES })}</div>
    ${listField('Nhóm khách được hưởng', T, o, 'segments', E.SEGMENTS, { emptyNull: true, hint: 'Không chọn = mọi nhóm khách.' })}
    <h5>Điều kiện và mức giảm</h5>
    <div class="f-grid">
      ${field('Đơn tối thiểu', T, o, 'min_spend', 'num')}
      ${field('Cơ sở tính tối thiểu', T, o, 'min_spend_basis', 'select', { options: E.MIN_SPEND_BASIS })}
      ${field('Kiểu giảm', T, o, 'discount.type', 'select', { options: { fixed: 'Giảm cố định', percent: 'Giảm phần trăm' } })}
      ${field(o.discount.type === 'percent' ? 'Phần trăm' : o.kind === 'freeship' ? 'Hỗ trợ tối đa' : 'Số tiền giảm', T, o, 'discount.value', 'num', { step: o.discount.type === 'percent' ? 1 : 1000 })}
      ${o.kind === 'freeship' ? '' : field('Mức giảm tối đa', T, o, 'discount.cap', 'numnull', { placeholder: 'Không giới hạn' })}
      ${o.kind === 'freeship' ? '' : field('Cơ sở tính giảm', T, o, 'discount_basis', 'select', { options: E.DISCOUNT_BASIS })}
    </div>
    ${o.min_spend_basis === 'after_listed' ? listField('Tính tối thiểu sau các ưu đãi', T, o, 'min_spend_after', Object.fromEntries(cfg.offers.filter((x) => x.id !== o.id).map((x) => [x.id, x.code || x.name]))) : ''}
    ${o.kind === 'freeship' ? listField('Đơn vị vận chuyển áp dụng', T, o, 'providers', Object.fromEntries(cfg.providers.map((p) => [p.id, p.name])), { emptyNull: true, hint: 'Không chọn = mọi đơn vị.' }) : ''}
    <h5>Ngân sách, cộng dồn, thứ tự</h5>
    <div class="f-grid">
      ${field('Ngân sách còn lại', T, o, 'budget', 'numnull', { placeholder: 'Không giới hạn' })}
      ${field('Lượt còn lại', T, o, 'uses', 'numnull', { step: 1, placeholder: 'Không giới hạn' })}
      ${field('Nhóm loại trừ', T, o, 'group', 'text', { placeholder: 'vd: voucher-san', hint: 'Cùng nhóm: tối đa 1 ưu đãi.' })}
      ${field('Thứ tự tính', T, o, 'order', 'num', { step: 1, hint: 'Nhỏ tính trước. Không quyết định quyền cộng dồn.' })}
    </div>
    <div class="btn-row"><button class="btn btn-sm btn-danger" data-act="admin-delete" data-target="offer" data-id="${o.id}">Xóa chương trình</button></div>
  </div>`
}

function priceForm(cfg, p) {
  const T = 'priceRule'
  return `<div class="form">
    <div class="f-grid">
      ${field('Tên', T, p, 'name', 'text')}
      ${field('Loại', T, p, 'kind', 'select', { options: E.PRICE_KINDS })}
      ${field('Team sở hữu', T, p, 'team', 'select', { options: E.TEAMS })}
      ${field('Mô tả', T, p, 'description', 'text')}
      ${field('Bắt đầu', T, p, 'start', 'timenull')}
      ${field('Kết thúc', T, p, 'end', 'timenull', { hint: 'Lúc kết thúc đã hết hiệu lực.' })}
    </div>
    ${listField('Nhóm khách', T, p, 'segments', E.SEGMENTS, { emptyNull: true, hint: 'Không chọn = mọi nhóm khách.' })}
    <h5>Giá theo SKU <span class="muted">(để trống = không áp)</span></h5>
    <div class="f-grid">${cfg.products.map((x) => field(`${x.name} <span class="muted">· niêm yết ${vnd(x.price)}</span>`, T, p, `prices.${x.sku}`, 'numnull')).join('')}</div>
    <div class="btn-row"><button class="btn btn-sm btn-danger" data-act="admin-delete" data-target="priceRule" data-id="${p.id}">Xóa chương trình</button></div>
  </div>`
}

function adminStacking(st) {
  const cfg = st.config
  const os = cfg.offers
  const head = os.map((o) => `<th>${esc(o.code || o.name)}</th>`).join('')
  const body = os.map((a) => `<tr><th>${esc(a.code || a.name)}<div class="muted">${E.OFFER_KINDS[a.kind]}</div></th>${os.map((b) => {
    if (a.id === b.id) return '<td class="diag">—</td>'
    const m = E.pairMode(cfg, a.id, b.id)
    const grp = a.group && a.group === b.group
    return `<td><button class="pair ${m}" data-act="pair" data-a="${a.id}" data-b="${b.id}" aria-label="${esc(a.code)} với ${esc(b.code)}: ${m === 'allow' ? 'được cộng' : 'không cộng'}">${m === 'allow' ? 'Được cộng' : 'Không cộng'}${grp ? '<small>cùng nhóm</small>' : ''}</button></td>`
  }).join('')}</tr>`).join('')
  const S2 = cfg.stacking
  return `<section class="panel-sec">
    <p class="muted">Bấm một ô để đổi quan hệ. Bảng đối xứng: A với B và B với A luôn như nhau. Thứ tự tính cấu hình riêng ở tab Thứ tự tính.</p>
    <div class="tbl-wrap"><table class="matrix"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table></div>
    <div class="f-grid">
      <div class="f"><label for="stk-default">Mặc định cho cặp chưa cấu hình</label><select id="stk-default" data-edit data-target="stacking" data-id="stacking" data-path="default" data-kind="select"><option value="allow" ${S2.default === 'allow' ? 'selected' : ''}>Được cộng</option><option value="deny" ${S2.default === 'deny' ? 'selected' : ''}>Không cộng</option></select></div>
      <div class="f"><label for="stk-max">Tối đa số ưu đãi mỗi đơn</label><input type="number" id="stk-max" min="1" step="1" data-edit data-target="stacking" data-id="stacking" data-path="max_offers" data-kind="numnull" value="${S2.max_offers ?? ''}" placeholder="Không giới hạn"></div>
    </div>
    <p class="muted small">Voucher shop của các shop khác nhau tự áp trên phần hàng của từng shop nhờ phạm vi shop. Nhóm loại trừ (tối đa 1 ưu đãi mỗi nhóm) đặt trong form từng chương trình.</p>
  </section>`
}

function adminOrder(st) {
  const os = [...st.config.offers].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  return `<section class="panel-sec">
    <p class="muted">Ưu đãi nhỏ thứ tự hơn được tính trước. Ưu đãi tính sau dùng số còn lại nếu cơ sở tính là "${E.DISCOUNT_BASIS.remaining}". Thứ tự không quyết định quyền cộng dồn.</p>
    <ol class="order-list">${os.map((o, i) => `<li><span class="ord">${o.order}</span><b>${esc(o.code || o.name)}</b><span class="muted">${E.OFFER_KINDS[o.kind]} · ${esc(headline(o))}</span>
      <span class="ord-btns"><button class="icon-btn" data-act="order-move" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Lên">↑</button><button class="icon-btn" data-act="order-move" data-i="${i}" data-d="1" ${i === os.length - 1 ? 'disabled' : ''} aria-label="Xuống">↓</button></span></li>`).join('')}</ol>
  </section>`
}

function adminHistory(st) {
  return `<section class="panel-sec">
    <div class="btn-row"><button class="btn btn-sm btn-ghost" data-act="restore-config">Khôi phục cấu hình ban đầu</button><span class="muted">Cấu hình v${st.config.version} · ${st.orders.length} đơn mô phỏng</span></div>
    ${st.audit.length ? `<div class="tbl-wrap"><table class="diff"><thead><tr><th>Lúc</th><th>Ai</th><th>Đối tượng</th><th>Trường</th><th>Trước → sau</th></tr></thead><tbody>${st.audit.map((a) => `<tr><td>${new Date(a.at).toLocaleTimeString('vi-VN', { timeZone: E.TZ })}<div class="muted">v${a.version}</div></td><td>${esc(a.actor)}</td><td>${esc(a.name)}</td><td><code>${esc(a.path)}</code></td><td>${esc(E.fmtVal(a.before))} → ${esc(E.fmtVal(a.after))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Chưa có thao tác admin nào trong kịch bản này.</p>'}
  </section>`
}

// ------------------------------------------------------------------ minh họa sản phẩm và icon
const ART = { serum: ['#F6C9B6', '#C86B4A'], lipstick: ['#F3B8C8', '#B23A5E'], fryer: ['#CFD8DC', '#37474F'], cooker: ['#FFE0B2', '#B26A00'], buds: ['#D1D9FF', '#3F4BB0'], diaper: ['#CDEFE3', '#1B7F5E'] }
function art(p) {
  const [bg, fg] = ART[p.art] ?? ['#E5E7EB', '#374151']
  const initials = p.name.split(' ').filter((w) => /^[A-ZĐÂ]/.test(w)).slice(0, 2).map((w) => w[0]).join('') || p.name[0]
  return `<div class="art" style="--art-bg:${bg};--art-fg:${fg}" aria-hidden="true"><span>${esc(initials)}</span></div>`
}
const ICON = {
  back: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  warn: '<svg viewBox="0 0 24 24" width="16" height="16" class="i-warn"><path d="M12 3l10 18H2z" fill="currentColor"/><path d="M12 10v5M12 17.5v.5" stroke="var(--surface)" stroke-width="2" stroke-linecap="round"/></svg>',
  store: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 9l1.5-5h13L20 9v1a3 3 0 01-5.3 1.9A3 3 0 0112 13a3 3 0 01-2.7-1.1A3 3 0 014 10z M5 13v7h14v-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 21s7-6.3 7-11.5A7 7 0 005 9.5C5 14.7 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.5" r="2.5" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  signal: '<svg viewBox="0 0 44 12" width="44" height="12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5" width="3" height="7" rx="1" fill="currentColor"/><rect x="10" y="2" width="3" height="10" rx="1" fill="currentColor"/><rect x="20" y="1" width="20" height="10" rx="3" fill="none" stroke="currentColor"/><rect x="22" y="3" width="13" height="6" rx="1.5" fill="currentColor"/></svg>',
}

// ------------------------------------------------------------------ render
const $ = (s) => document.querySelector(s)
function render({ side = true } = {}) {
  const st = cur()
  const r = E.evaluate(st.config, st.ctx)
  const phone = $('#phone')
  const keep = (el, sel) => el.querySelector(sel)?.scrollTop ?? 0
  const focusId = document.activeElement?.id
  // đổi màn thì về đầu trang, cùng màn thì giữ vị trí cuộn
  const ps = UI.lastScreen === S.screen ? keep(phone, '.screen-body') : 0
  UI.lastScreen = S.screen
  phone.innerHTML = renderPhone(st, r)
  const pb = phone.querySelector('.screen-body')
  if (pb) pb.scrollTop = ps
  const sideEl = $('#side')
  const editing = sideEl.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox' && document.activeElement.type !== 'radio'
  if (side && !editing) {
    const ss = sideEl.querySelector('.side-body')?.scrollTop ?? 0
    sideEl.innerHTML = renderSide(st, r)
    const sb = sideEl.querySelector('.side-body')
    if (sb) sb.scrollTop = ss
  } else if (editing) {
    const big = $('#clock-big')
    if (big) big.textContent = E.fmtTime(st.ctx.now, true)
  }
  if (focusId && !document.activeElement?.id) document.getElementById(focusId)?.focus({ preventScroll: true })
  $('#top-scenario').textContent = `${scenario().id} · ${scenario().title}`
  $('#top-clock').textContent = `${E.fmtTime(st.ctx.now)} · ${E.fmtDate(st.ctx.now)}`
  document.body.classList.toggle('drawer-open', UI.drawer)
  pulse()
  save()
}
// Làm nổi nhẹ con số vừa đổi để người xem theo dõi
function pulse() {
  const seen = new Map()
  for (const el of document.querySelectorAll('[data-watch]')) {
    const k = el.dataset.watch
    seen.set(k, el.textContent)
    if (UI.prevWatch.has(k) && UI.prevWatch.get(k) !== el.textContent) {
      el.classList.remove('bump')
      void el.offsetWidth
      el.classList.add('bump')
    }
  }
  UI.prevWatch = seen
}
function renderToast() {
  const t = $('#toast')
  t.textContent = UI.toast
  t.hidden = !UI.toast
}

// ------------------------------------------------------------------ sự kiện
function setNow(ms) {
  cur().ctx.now = ms
}
let ticker = null
function setRunning(on) {
  UI.running = on
  clearInterval(ticker)
  if (on) ticker = setInterval(() => { cur().ctx.now += 1000 * UI.speed; render() }, 1000)
}

function moveOrder(i, d) {
  const os = [...cur().config.offers].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const j = i + d
  ;[os[i], os[j]] = [os[j], os[i]]
  commit(os.map((o, k) => ({ target: 'offer', id: o.id, path: 'order', value: (k + 1) * 10 })).filter((p) => cur().config.offers.find((o) => o.id === p.id).order !== p.value))
}

function createEntity(kindKey) {
  const st = cur()
  const [target, kind] = kindKey.split(':')
  const n = st.config.offers.length + st.config.priceRules.length + 1
  const span = { start: E.at(DAY, '00:00'), end: E.at('2026-11-12', '00:00') }
  const value = target === 'priceRule'
    ? { id: `PR-${n}`, name: `${E.PRICE_KINDS[kind]} mới`, kind, team: kind === 'flash' ? 'merchandising' : kind === 'shop_price' ? 'seller_ops' : 'marketing', enabled: false, segments: null, description: '', prices: {}, ...span }
    : {
      id: `OF-${n}`, code: `MOI${n}`, name: `${E.OFFER_KINDS[kind]} mới`, kind, team: { shop: 'seller_ops', platform: 'marketing', brand_day: 'seller_ops', freeship: 'logistics', segment: 'marketing' }[kind],
      description: '', enabled: false, ...span, scope: {}, scope_mode: 'items', segments: null, min_spend: 0, min_spend_basis: kind === 'freeship' ? 'cart_current' : 'eligible_current', min_spend_after: [],
      discount: { type: kind === 'freeship' ? 'fixed' : 'percent', value: kind === 'freeship' ? 30000 : 10, cap: null }, discount_basis: 'remaining',
      providers: null, budget: null, uses: null, group: null, auto: kind === 'brand_day', order: 50,
    }
  commit([{ target, op: 'create', id: value.id, value }])
  UI.adminEdit = { target, id: value.id }
  toast('Đã tạo chương trình ở trạng thái tạm dừng. Bật khi cấu hình xong.')
}

function placeOrder() {
  const st = cur()
  const r = E.evaluate(st.config, st.ctx)
  const key = JSON.stringify({ l: st.ctx.lines.filter((l) => l.qty), s: st.ctx.segment, p: st.ctx.provider, c: [...st.ctx.selected].sort(), t: st.ctx.now })
  const dup = st.orders.find((o) => o.key === key)
  if (dup) return toast(`Đơn giống hệt đã ghi nhận (#${dup.no}), không ghi lại.`)
  const patches = []
  for (const o of r.offers.filter((x) => x.applied)) {
    const raw = st.config.offers.find((x) => x.id === o.id)
    if (raw.budget != null) patches.push({ target: 'offer', id: o.id, path: 'budget', value: raw.budget - o.calculated_discount })
    if (raw.uses != null) patches.push({ target: 'offer', id: o.id, path: 'uses', value: raw.uses - 1 })
  }
  const no = st.orders.length + 1
  st.orders.push({ key, no, at: st.ctx.now, total: r.totals.total, applied: r.applied_ids })
  if (patches.length) commit(patches, `Đơn mô phỏng #${no}`)
  toast(`Đã ghi nhận đơn mô phỏng #${no}: ${vnd(r.totals.total)}${patches.length ? ', đã trừ ngân sách/lượt' : ''}.`)
}

function handle(act, el, ev) {
  const st = cur()
  switch (act) {
    case 'screen':
      if (el.dataset.to !== 'offers') UI.draft = null
      S.screen = el.dataset.to
      UI.codeMsg = ''
      break
    case 'open-offers': UI.draft = [...st.ctx.selected]; UI.codeMsg = ''; S.screen = 'offers'; break
    case 'add': {
      const l = st.ctx.lines.find((x) => x.sku === el.dataset.sku)
      if (l) l.qty += 1
      else st.ctx.lines.push({ sku: el.dataset.sku, qty: 1 })
      toast('Đã thêm vào giỏ.')
      break
    }
    case 'qty': {
      const l = st.ctx.lines.find((x) => x.sku === el.dataset.sku)
      l.qty = Math.max(0, l.qty + Number(el.dataset.d))
      st.ctx.lines = st.ctx.lines.filter((x) => x.qty > 0)
      break
    }
    case 'provider': st.ctx.provider = el.value; break
    case 'pick': {
      const id = el.dataset.id
      UI.draft = UI.draft.includes(id) ? UI.draft.filter((x) => x !== id) : [...UI.draft, id]
      break
    }
    case 'swap': {
      const drop = el.dataset.drop.split(',')
      UI.draft = [...UI.draft.filter((x) => !drop.includes(x)), el.dataset.take]
      toast(`Đã bỏ ${drop.map((id) => offerLabel(st.config, id)).join(', ')} để chọn ${offerLabel(st.config, el.dataset.take)}.`)
      break
    }
    case 'apply-offers': st.ctx.selected = UI.draft ?? st.ctx.selected; UI.draft = null; S.screen = 'checkout'; toast('Đã cập nhật ưu đãi.'); break
    case 'toggle-open': UI.open.has(el.dataset.key) ? UI.open.delete(el.dataset.key) : UI.open.add(el.dataset.key); break
    case 'order': placeOrder(); break
    case 'panel': S.panel = el.dataset.to; break
    case 'drawer': UI.drawer = !UI.drawer; break
    case 'sc-load': loadScenario(el.dataset.id); toast(`Đã nạp kịch bản ${el.dataset.id}.`); break
    case 'sc-reset': loadScenario(el.dataset.id, 'reset'); toast(`Đã reset kịch bản ${el.dataset.id}.`); break
    case 'sc-compare': loadScenario(el.dataset.id, 'compare'); toast(`Đã chụp mốc trước và áp thay đổi của kịch bản ${el.dataset.id}.`); break
    case 'time': setNow(Number(el.dataset.t)); break
    case 'step': setNow(st.ctx.now + Number(el.dataset.ms)); break
    case 'run': setRunning(!UI.running); break
    case 'speed': UI.speed = Number(el.value); if (UI.running) setRunning(true); break
    case 'clock-input': if (el.value) setNow(E.fromLocalInput(el.value)); break
    case 'segment': st.ctx.segment = el.dataset.to; break
    case 'toggle': applyToggle(scenario().toggles.find((t) => t.id === el.dataset.id), el.checked); break
    case 'snapshot': snapshot(); toast('Đã chụp mốc trước.'); break
    case 'clear-baseline': st.baseline = null; UI.fix = null; break
    case 'copy-repro': {
      const text = el.previousElementSibling.textContent
      navigator.clipboard?.writeText(text).then(() => toast('Đã sao chép giỏ tái hiện.'), () => toast('Không sao chép được; hãy bôi đen để chép.'))
      return
    }
    case 'fix-try': {
      const a = E.analyze({ cfg: st.baseline.config, ctx: st.baseline.ctx }, { cfg: st.config, ctx: st.ctx })
      const o = a.options.find((x) => x.id === el.dataset.id)
      UI.fix = { id: o.id, option: o, result: E.tryFix(o, { cfg: st.baseline.config, ctx: st.baseline.ctx }, { cfg: st.config, ctx: st.ctx }, scenario().controls ?? []) }
      UI.confirmFix = false
      break
    }
    case 'fix-confirm': UI.confirmFix = true; break
    case 'fix-cancel': UI.confirmFix = false; break
    case 'fix-apply': commit(UI.fix.option.patch, 'FlashSRE (đã xác nhận)'); UI.confirmFix = false; toast('Đã áp phương án. Mốc trước giữ nguyên để so sánh.'); break
    case 'admin-tab': S.adminTab = el.dataset.to; break
    case 'admin-edit': UI.adminEdit = UI.adminEdit?.id === el.dataset.id ? null : { target: el.dataset.target, id: el.dataset.id }; break
    case 'admin-create': createEntity($('#new-kind').value); break
    case 'admin-delete': commit([{ target: el.dataset.target, op: 'delete', id: el.dataset.id }]); UI.adminEdit = null; st.ctx.selected = st.ctx.selected.filter((x) => x !== el.dataset.id); break
    case 'pair': {
      const m = E.pairMode(st.config, el.dataset.a, el.dataset.b)
      commit([E.setPairMode(st.config, el.dataset.a, el.dataset.b, m === 'allow' ? 'deny' : 'allow')])
      break
    }
    case 'order-move': moveOrder(Number(el.dataset.i), Number(el.dataset.d)); break
    case 'restore-config': {
      const old = st.config
      st.config = { ...clone(st.initial), version: old.version + 1 }
      UI.fix = null
      for (const d of E.diffConfig(old, st.config)) st.audit.unshift({ at: Date.now(), version: st.config.version, actor: 'Khôi phục', name: d.name, path: d.path, before: d.before, after: d.after })
      toast('Đã khôi phục cấu hình ban đầu của kịch bản.')
      break
    }
    default: return
  }
  ev?.preventDefault?.()
  render()
}

function editValue(el) {
  const k = el.dataset.kind
  if (k === 'bool') return el.checked
  if (k === 'num') return el.value === '' ? 0 : Math.max(0, Math.round(Number(el.value)))
  if (k === 'numnull') return el.value === '' ? (el.dataset.path.startsWith('prices.') ? undefined : null) : Math.max(0, Math.round(Number(el.value)))
  if (k === 'time' || k === 'timenull') return el.value ? E.fromLocalInput(el.value) : null
  if (k === 'list') {
    const vals = [...document.querySelectorAll(`[data-group="${el.dataset.group}"]:checked`)].map((x) => x.value)
    return vals.length ? vals : el.dataset.empty === 'null' ? null : []
  }
  return el.value
}

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]')
  if (!el || el.disabled) return
  if (['INPUT', 'SELECT'].includes(el.tagName)) return // xử lý ở change
  handle(el.dataset.act, el, ev)
})
document.addEventListener('keydown', (ev) => {
  const el = ev.target.closest('[role="button"][data-act]')
  if (el && (ev.key === 'Enter' || ev.key === ' ')) handle(el.dataset.act, el, ev)
})
document.addEventListener('change', (ev) => {
  const el = ev.target
  if (el.matches('[data-edit]')) {
    const value = editValue(el)
    if (el.dataset.target === 'stacking') commit([{ target: 'stacking', id: 'stacking', path: el.dataset.path, value }])
    else commit([{ target: el.dataset.target, id: el.dataset.id, path: el.dataset.path, value }])
    el.blur?.()
    render()
    return
  }
  if (el.matches('[data-act]')) handle(el.dataset.act, el, ev)
})
document.addEventListener('submit', (ev) => {
  if (ev.target.dataset.form !== 'code') return
  ev.preventDefault()
  const st = cur()
  const code = $('#code-input').value.trim().toUpperCase()
  if (!code) return
  const o = st.config.offers.find((x) => (x.code || '').toUpperCase() === code)
  if (!o) UI.codeMsg = `Không tìm thấy mã "${code}".`
  else if (o.auto) UI.codeMsg = `${o.code} tự động áp dụng khi đủ điều kiện, không cần nhập.`
  else if (UI.draft.includes(o.id)) UI.codeMsg = `${o.code} đã có trong danh sách chọn.`
  else {
    const ev2 = E.evaluate(st.config, { ...st.ctx, selected: UI.draft }).offers.find((x) => x.id === o.id)
    if (['CONFLICT', 'MAX_OFFERS'].includes(ev2.reason_codes[0])) UI.codeMsg = `Chưa thêm ${o.code}: ${ev2.reason_text}`
    else {
      UI.draft = [...UI.draft, o.id]
      UI.codeMsg = ev2.status === 'available' ? `Đã thêm ${o.code}.` : `Đã thêm ${o.code}, nhưng hiện chưa áp dụng: ${ev2.reason_text}`
    }
  }
  render()
})
document.addEventListener('toggle', (ev) => {
  const k = ev.target.dataset?.open
  if (!k) return
  if (ev.target.open) UI.open.add(k)
  else UI.open.delete(k)
}, true)

render()
