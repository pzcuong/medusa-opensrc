// Client demo trên Medusa: điện thoại hiển thị đúng giỏ Medusa trả về; panel phải điều khiển kịch bản, đồng hồ, admin, oracle.
import { at, fmtDate, fmtTime, fmtWeekday, fromLocalInput, pct, TEAMS, toLocalInput, vnd } from './engine.mjs'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${vnd(Math.abs(n))}`
const $ = (s) => document.querySelector(s)
const DAY = '2026-11-11'
const teamName = (t) => TEAMS[t] ?? (t === 'finance' ? 'Finance' : t ?? 'Admin')
const SEGMENTS = { REGULAR: 'Khách thường', NEW: 'Khách hàng mới' }
const KIND_TAG = { shop: 'Shop', platform: 'Sàn', brand_day: 'BD', freeship: 'Ship', segment: 'Mới', category: 'Ngành' }
const REASON_TAG = { MIN_SPEND: 'Chưa đủ giá trị đơn', SCOPE: 'Không đúng sản phẩm/shop', SEGMENT: 'Không đúng nhóm khách', PROVIDER: 'Không hỗ trợ vận chuyển', PAUSED: 'Tạm dừng', BUDGET: 'Ngân sách', NOT_STARTED: 'Chưa đến giờ', EXPIRED: 'Đã hết hạn', UNKNOWN: 'Chưa rõ', EMPTY: 'Giỏ trống' }

let ST = null // trạng thái phiên trên server
let R = null // giỏ Medusa vừa đo
let CFG = null // cấu hình Medusa liên quan
let TG = {} // trạng thái các toggle
let PRODUCTS = null
let ORACLE = null
let CHANGES = null
let SPLIT = null // kiểm tra tách đơn giỏ hiện tại
let SEARCH = null // agent dò toàn catalog
const UI = { screen: 'cart', panel: 'control', measuring: false, draft: null, toast: '', drawer: false, running: false, speed: 60, ticking: false, oracleBusy: false, splitBusy: false, searchBusy: false, prev: new Map() }

async function api(path, body, method = body === undefined ? 'GET' : 'POST') {
  const r = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const j = await r.json()
  if (!r.ok) throw new Error(j.error || r.statusText)
  return j
}
function toast(msg) {
  UI.toast = msg
  const t = $('#toast')
  t.textContent = msg
  t.hidden = false
  clearTimeout(toast.t)
  toast.t = setTimeout(() => { t.hidden = true }, 3500)
}
const fail = (e) => { toast(`Lỗi: ${e.message}`); console.error(e) }

// ------------------------------------------------------------------ đồng bộ với Medusa
async function measure() {
  if (!ST?.scenario) return
  UI.measuring = true
  render()
  try {
    R = await api('/api/measure', {})
  } catch (e) { fail(e) } finally { UI.measuring = false }
  render()
}
async function refresh({ config = true, products = false } = {}) {
  ST = await api('/api/state')
  if (!ST.scenario || ST.busy) return render()
  const jobs = [measure()]
  if (config) jobs.push(api('/api/config').then((c) => { CFG = c }), api('/api/toggles').then((t) => { TG = t }))
  if (products || UI.screen === 'store') jobs.push(loadProducts())
  if (UI.panel === 'sre') jobs.push(loadChanges())
  await Promise.all(jobs).catch(fail)
  render()
}
async function loadProducts() { PRODUCTS = await api('/api/products') }
async function loadChanges() { CHANGES = await api('/api/changes') }
async function setSpec(patch) {
  await api('/api/spec', patch)
  ST.spec = { ...ST.spec, ...patch }
  await measure()
  if (UI.screen === 'store') { await loadProducts(); render() }
}
async function waitScenario() {
  for (;;) {
    ST = await api('/api/state')
    render()
    if (!ST.busy) break
    await new Promise((ok) => setTimeout(ok, 1500))
  }
  R = null
  ORACLE = null
  CHANGES = null
  SPLIT = null
  SEARCH = null
  await refresh({ products: true })
}
async function setClock(now) {
  ST.now = now
  // giữ số cũ bị che cho tới khi biết lịch trên Medusa có đổi hay không
  const ticking = UI.running
  if (!ticking) { UI.measuring = true; render() }
  const r = await api('/api/clock', { now })
  if (r.changed) await refresh({ config: false, products: UI.screen === 'store' })
  else { UI.measuring = false; render() }
}

// ------------------------------------------------------------------ điện thoại
function thumb(title) {
  const ini = title.split(' ').filter((w) => /^[A-ZĐ0-9]/.test(w)).slice(0, 2).map((w) => w[0]).join('') || title[0]
  return `<div class="thumb" aria-hidden="true">${esc(ini)}</div>`
}
function renderPhone() {
  const lines = ST?.spec?.lines ?? []
  const count = lines.reduce((s, l) => s + l.qty, 0)
  const nav = `<div class="st-bar"><span>${ST ? fmtTime(ST.now) : ''}</span><span>●●● ▮</span></div>
    <nav class="st-nav"><button class="st-link l" data-act="screen" data-to="store">Cửa hàng</button><span class="st-logo">FlashSRE Store</span><button class="st-link r" data-act="screen" data-to="cart">Giỏ hàng (${count})</button></nav>`
  if (!ST?.scenario) {
    return `${nav}<div class="st-body"><div class="empty"><b>Chưa có kịch bản nào trên Medusa</b><span>Chọn một kịch bản ở Demo Control. Server sẽ dựng lại lab trên Medusa rồi để từng team cấu hình bằng tài khoản của mình.</span></div></div>${ST?.busy ? overlay(ST.busy.label) : ''}`
  }
  const body = UI.screen === 'store' ? storeScreen() : UI.screen === 'offers' ? offersScreen() : cartScreen()
  const busy = ST.busy ? overlay(ST.busy.label) : UI.measuring ? overlay('Medusa đang tính giỏ…') : ''
  return nav + body + busy
}
const overlay = (label) => `<div class="overlay"><div><div class="spin"></div>${esc(label)}</div></div>`

function storeScreen() {
  const cards = ST.products.map((p) => {
    const pr = PRODUCTS?.[p.sku]
    const amount = pr?.amount ?? p.price
    const sale = amount < (pr?.original ?? p.price)
    return `<button class="st-card" data-act="add" data-sku="${p.sku}">
      ${thumb(p.title)}
      <span class="t">${esc(p.title)}</span>
      <span class="price"><span class="now ${sale ? 'sale' : ''}">${vnd(amount)}</span>${sale ? `<s>${vnd(pr.original)}</s>` : ''}</span>
      ${pr?.source ? `<span class="tag ${/Flash/.test(pr.source) ? 'flash' : ''}">${esc(pr.source)}</span>` : ''}
    </button>`
  }).join('')
  return `<div class="st-body"><h1 class="st-h1">Sản phẩm 11.11</h1><p class="muted small">Giá do Medusa tính theo price list đang hiệu lực${ST.spec.segment === 'NEW' ? ' cho khách hàng mới' : ''}. Chạm để thêm vào giỏ.</p><div class="st-grid">${cards}</div></div>`
}

function cartScreen() {
  if (!R) return '<div class="st-body"></div>'
  if (R.empty) return `<div class="st-body"><h1 class="st-h1">Giỏ hàng</h1><div class="empty">Giỏ hàng đang trống.<button class="st-btn ghost" data-act="screen" data-to="store">Xem sản phẩm</button></div></div>`
  const items = R.items.map((i) => `<div class="item">
      ${thumb(i.title)}
      <div>
        <div class="t">${esc(i.title)}</div>
        <div class="price"><span class="now ${i.unit_price < i.list_price ? 'sale' : ''}" data-watch="p-${i.sku}">${vnd(i.unit_price)}</span>${i.unit_price < i.list_price ? `<s>${vnd(i.list_price)}</s>` : ''}</div>
        <div><span class="tag ${i.source && /Flash/.test(i.source.title) ? 'flash' : ''}">${esc(i.source ? `${i.source.title} · ${teamName(i.source.team)}` : 'Giá niêm yết')}</span></div>
        ${i.adjustments.map((a) => `<div class="adj">${esc(a.code)} −${vnd(a.amount)}</div>`).join('')}
      </div>
      <div class="qty"><button data-act="qty" data-sku="${i.sku}" data-d="-1" aria-label="Bớt">−</button><span>${i.qty}</span><button data-act="qty" data-sku="${i.sku}" data-d="1" aria-label="Thêm">+</button></div>
    </div>`).join('')
  const fsTypes = CFG?.promotions.find((p) => p.kind === 'freeship')?.target_rules.find((r) => r.attribute.endsWith('shipping_option_type_id'))?.values ?? []
  const ship = ST.providers.map((p) => `<label class="radio ${ST.spec.provider === p.id ? 'on' : ''}">
      <input type="radio" name="prov" id="prov-${p.id}" data-act="provider" value="${p.id}" ${ST.spec.provider === p.id ? 'checked' : ''}>
      <span>${esc(p.name)}<span class="sub ${fsTypes.includes(p.type_id) ? 'fs' : ''}">${fsTypes.includes(p.type_id) ? 'Có Freeship Xtra' : 'Không có freeship'}</span></span>
      <span>${vnd(p.fee)}</span></label>`).join('')
  const ex = R.explain ?? []
  const applied = R.applied
  const lost = ex.filter((e) => e.state === 'selected_not_applied')
  const t = R.totals
  const itemDisc = t.discount_total - t.shipping_discount
  return `<div class="st-body">
    <h1 class="st-h1">Giỏ hàng</h1>
    <section class="sec">${items}</section>
    <section class="sec"><h2 class="st-h2">Vận chuyển</h2>${ship}</section>
    <section class="sec">
      <h2 class="st-h2">Mã khuyến mãi</h2>
      <div class="codes">
        ${applied.map((a) => `<div class="code"><span><b>${esc(a.code)}</b> · ${esc(teamName(a.owner))}</span><span>−${vnd(a.amount)} ${ST.spec.codes.includes(a.code) ? `<button class="x" data-act="rm-code" data-code="${esc(a.code)}" aria-label="Bỏ mã">×</button>` : '<span class="muted small">tự động</span>'}</span></div>`).join('')}
        ${lost.map((e) => `<div class="code lost"><span><b>${esc(e.code)}</b> — ${e.auto ? 'tự động, ' : 'bạn đã chọn, '}hiện không áp dụng<br><span>${esc(e.reason)}</span></span>${e.entered ? `<button class="x" data-act="rm-code" data-code="${esc(e.code)}" aria-label="Bỏ mã">×</button>` : ''}</div>`).join('')}
      </div>
      <button class="st-btn ghost" data-act="open-offers">Chọn hoặc nhập mã khuyến mãi</button>
    </section>
    <section class="sec">
      <h2 class="st-h2">Tóm tắt đơn</h2>
      <div class="sum-row"><span>Tạm tính</span><b data-watch="sub">${vnd(t.item_subtotal)}</b></div>
      ${itemDisc ? `<div class="sum-row neg"><span>Giảm giá</span><b data-watch="disc">−${vnd(itemDisc)}</b></div>` : ''}
      <div class="sum-row"><span>Phí vận chuyển</span><b>${vnd(t.shipping_subtotal)}</b></div>
      ${t.shipping_discount ? `<div class="sum-row neg"><span>Hỗ trợ vận chuyển</span><b>−${vnd(t.shipping_discount)}</b></div>` : ''}
      <div class="sum-row"><span>Thuế</span><b>0đ</b></div>
      <div class="sum-row total"><span>Tổng cộng</span><b data-watch="total">${vnd(t.total)}</b></div>
      <div class="medusa-note"><span>Số do Medusa tính</span><code>${esc(R.cart_id)}</code></div>
    </section>
  </div>
  <div class="st-foot"><div class="row"><span class="muted">Tổng cộng</span><span class="big" data-watch="total-f">${vnd(t.total)}</span></div></div>`
}

function offersScreen() {
  const draft = UI.draft ?? [...ST.spec.codes]
  const ex = R?.explain ?? []
  const rank = { applied: 0, selected_not_applied: 1, available: 2, blocked: 3 }
  const rows = [...ex].sort((a, b) => rank[a.state] - rank[b.state]).map((e) => {
    let state
    if (e.state === 'applied') state = `<span class="o-ok">${e.auto ? 'Tự động áp dụng' : 'Đang áp dụng'} · −${vnd(e.applied_amount)}</span>`
    else if (e.state === 'available') state = `<span class="o-ok" style="color:var(--ink-2);font-weight:500">${esc(e.reason)}</span>`
    else if (e.state === 'selected_not_applied') state = `<span class="o-lost">${e.auto ? 'Tự động' : 'Bạn đã chọn'} — hiện không áp dụng. ${esc(e.reason)}</span>`
    else state = `<span class="o-why"><em>${REASON_TAG[e.reason_code] ?? ''}</em>${esc(e.reason)}</span>`
    const on = draft.includes(e.code)
    const box = e.auto ? '<span class="auto-pill">Tự động</span>'
      : `<input type="checkbox" class="ck" id="ck-${e.code}" data-act="pick" data-code="${esc(e.code)}" ${on ? 'checked' : ''} aria-label="Chọn ${esc(e.code)}">`
    return `<li class="offer k-${e.kind} st-${e.state}">
      <div class="ticket" aria-hidden="true">${KIND_TAG[e.kind] ?? ''}</div>
      <div><div class="o-title">${esc(e.headline)}</div><div class="o-code">${esc(e.code)} · ${esc(e.kind_label)} · ${esc(teamName(e.owner))}</div>
        <div class="o-cond">${esc(e.conditions.join(' · ') || 'Không có điều kiện')}</div><div class="o-state">${state}</div></div>
      <div>${box}</div></li>`
  }).join('')
  return `<div class="st-body">
    <h1 class="st-h1">Mã khuyến mãi</h1>
    <p class="sheet-note">Danh sách lấy từ promotion trên Medusa. Medusa không trả lý do khi từ chối mã; lý do ở đây FlashSRE suy ra từ rule của promotion và số tiền hàng Medusa vừa tính.</p>
    <ul class="offers">${rows}</ul>
  </div>
  <div class="st-foot"><button class="st-btn" data-act="apply-codes">Áp dụng · ${draft.length} mã</button><button class="st-btn ghost" data-act="screen" data-to="cart">Quay lại giỏ</button></div>`
}

// ------------------------------------------------------------------ panel phải
function renderSide() {
  const tabs = [['control', 'Demo Control', 'Điều khiển'], ['sre', 'FlashSRE phân tích', 'FlashSRE'], ['admin', 'Admin Medusa', 'Admin']]
  const body = !ST ? '' : UI.panel === 'sre' ? srePanel() : UI.panel === 'admin' ? adminPanel() : controlPanel()
  return `<div class="side-head"><div class="tabs" role="tablist">${tabs.map(([id, l, s]) => `<button class="tab ${UI.panel === id ? 'on' : ''}" role="tab" aria-selected="${UI.panel === id}" data-act="panel" data-to="${id}"><span class="l-long">${l}</span><span class="l-short">${s}</span></button>`).join('')}</div><button class="drawer-close" data-act="drawer" aria-label="Đóng">×</button></div>
    <div class="side-body">${banners()}${body}</div>`
}
function banners() {
  return [
    ST?.busy ? `<div class="banner busy"><div class="spin"></div><span>Đang dựng kịch bản trên Medusa: <b>${esc(ST.busy.label)}</b></span></div>` : '',
    ST?.error ? `<div class="banner err">Lỗi khi dựng kịch bản: ${esc(ST.error)}</div>` : '',
  ].join('')
}

function controlPanel() {
  const cur = ST.current
  const card = (s, on) => `<article class="sc ${on ? 'on' : ''}">
      <div class="sc-head"><span class="sc-id">${s.id}</span><h3>${esc(s.title)}</h3></div>
      <div class="chips">${s.teams.map((t) => `<span class="team">${teamName(t)}</span>`).join('')}</div>
      <p class="${on ? '' : 'sc-obs small'}">${esc(s.observe)}</p>
      <div class="btn-row">
        <button class="btn btn-sm ${on ? 'btn-ghost' : 'btn-primary'}" data-act="sc" data-id="${s.id}" data-mode="load" ${ST.busy ? 'disabled' : ''}>${on ? 'Nạp lại (reset)' : 'Nạp kịch bản'}</button>
        ${s.compare ? `<button class="btn btn-sm btn-ghost" data-act="sc" data-id="${s.id}" data-mode="compare" ${ST.busy ? 'disabled' : ''}>So sánh trước và sau</button>` : ''}
      </div>
      ${on && s.compare ? `<p class="muted small">So sánh: ${esc(s.compare)}</p>` : ''}
    </article>`
  const others = ST.scenarios.filter((s) => s.id !== cur?.id).map((s) => card(s, false)).join('')
  return `<section class="panel-sec">
      <h4>Medusa <span class="muted">· ${esc(ST.base.replace('https://', ''))}</span></h4>
      <div class="btn-row"><a class="link" href="${esc(ST.admin_url)}" target="_blank" rel="noopener">Mở Medusa Admin ↗</a><span class="muted small">Mỗi lần nạp kịch bản: setup lab sạch (~40 giây) rồi từng team cấu hình bằng tài khoản của mình, có audit.</span></div>
    </section>
    ${cur ? `<section class="panel-sec"><h4>Kịch bản đang chạy</h4>${card(cur, true)}</section>${clockSec()}${customerSec()}${compareSec()}${actionsSec()}` : ''}
    <section class="panel-sec"><h4>${cur ? 'Kịch bản khác' : 'Chọn kịch bản'}</h4><div class="sc-grid">${others}</div>
      <p class="muted small">Các kịch bản cộng dồn loại trừ, thứ tự tính và chặn cả giỏ không có trên Medusa 2.21, chỉ có ở <a class="link" href="/sim">bản mô phỏng</a>.</p></section>`
}

function clockSec() {
  const flash = ST.windows.find((w) => /Flash/.test(w.label))
  const marks = flash ? [['Trước Flash Sale', flash.start - 30 * 60e3], ['Đúng giờ bắt đầu', flash.start], ['Trong Flash Sale', flash.start + 30 * 60e3], ['Sau khi kết thúc', flash.end]] : []
  const phase = (w) => (ST.now < w.start ? ['before', 'Đã lên lịch'] : ST.now >= w.end ? ['after', 'Đã kết thúc'] : ['on', 'Đang chạy'])
  return `<section class="panel-sec">
    <h4>Đồng hồ demo <span class="muted">· giờ Việt Nam</span></h4>
    <div class="clock-face"><b>${fmtTime(ST.now, true)}</b><span>${fmtWeekday(ST.now)}, ${fmtDate(ST.now)}/2026</span><span class="run ${UI.running ? 'on' : ''}">${UI.running ? `Đang chạy ×${UI.speed}` : 'Đã dừng'}</span></div>
    ${ST.windows.length ? `<ul class="windows">${ST.windows.map((w) => { const [k, l] = phase(w); return `<li><span class="state s-${k}">${l}</span> ${esc(w.label)}</li>` }).join('')}</ul>` : ''}
    <div class="btn-row">${marks.map(([l, t]) => `<button class="btn btn-sm btn-ghost" data-act="time" data-t="${t}">${l}</button>`).join('')}${(ST.current.times ?? []).map((h) => `<button class="btn btn-sm btn-ghost" data-act="time" data-t="${at(DAY, h)}">${h}</button>`).join('')}</div>
    <div class="btn-row">
      <button class="btn btn-sm btn-ghost" data-act="step" data-ms="60000">+1 phút</button>
      <button class="btn btn-sm btn-ghost" data-act="step" data-ms="3600000">+1 giờ</button>
      <button class="btn btn-sm" data-act="run">${UI.running ? 'Tạm dừng' : 'Chạy'}</button>
      <label class="inline">Tốc độ <select id="speed" data-act="speed">${[1, 60, 600].map((x) => `<option value="${x}" ${UI.speed === x ? 'selected' : ''}>×${x}</option>`).join('')}</select></label>
      <label class="inline">Đặt giờ <input type="datetime-local" id="clock-input" data-act="clock-input" value="${toLocalInput(ST.now)}"></label>
    </div>
    <p class="muted small">Medusa chạy theo giờ thật. Đồng hồ demo đặt lịch của price list (đã lên lịch / đang chạy / đã kết thúc) và bật tắt promotion có khung giờ cho khớp giờ mô phỏng. Bắt đầu được tính, lúc kết thúc không còn hiệu lực.</p>
  </section>`
}

function customerSec() {
  const toggles = ST.current.toggles ?? []
  return `<section class="panel-sec"><h4>Khách hàng và cấu hình nhanh</h4>
    <div class="seg" role="radiogroup" aria-label="Nhóm khách">${Object.entries(SEGMENTS).map(([k, l]) => `<button role="radio" aria-checked="${ST.spec.segment === k}" class="${ST.spec.segment === k ? 'on' : ''}" data-act="segment" data-to="${k}">${l}</button>`).join('')}</div>
    <p class="muted small">Khách hàng mới là tài khoản demo đăng nhập, thuộc nhóm FS-MK Khách mới trên Medusa.</p>
    ${toggles.map((t) => `<label class="toggle"><input type="checkbox" id="tg-${t.id}" data-act="toggle" data-id="${t.id}" ${TG[t.id] ? 'checked' : ''}><span>${esc(t.label)}</span></label>`).join('')}
  </section>`
}

function compareRows(a, b) {
  const rows = []
  for (const sku of [...new Set([...a.items, ...b.items].map((i) => i.sku))]) {
    const x = a.items.find((i) => i.sku === sku)
    const y = b.items.find((i) => i.sku === sku)
    const f = (i) => (i ? `${vnd(i.unit_price)} × ${i.qty}<div class="muted small">${esc(i.source?.title ?? 'Giá niêm yết')}</div>` : '<span class="muted">không có</span>')
    rows.push([`Giá ${esc((x ?? y).title)}`, f(x), f(y)])
  }
  const codes = [...new Set([...a.applied.map((x) => x.code), ...b.applied.map((x) => x.code), ...(ST.spec.codes ?? [])])]
  for (const code of codes) {
    const f = (r) => {
      const ap = r.applied.find((x) => x.code === code)
      if (ap) return `<span class="good">được −${vnd(ap.amount)}</span>`
      const e = r.explain?.find((x) => x.code === code)
      return `<span class="bad">không áp</span>${e?.reason ? `<div class="muted small">${esc(e.reason)}</div>` : ''}`
    }
    rows.push([esc(code), f(a), f(b)])
  }
  rows.push(['Phí vận chuyển', vnd(a.totals.shipping_subtotal), vnd(b.totals.shipping_subtotal)])
  return rows
}

function compareSec() {
  const b = ST.baseline
  if (!b) {
    return `<section class="panel-sec"><h4>So sánh trước và sau</h4><p class="muted">Chụp mốc đo giỏ hiện tại trên Medusa và lưu giỏ, nhóm khách, vận chuyển, mã, giờ demo.</p><button class="btn" data-act="snapshot">Chụp mốc trước</button></section>`
  }
  if (!R || R.empty) return ''
  const before = b.result
  const d = R.totals.total - before.totals.total
  const p = before.totals.total ? (d / before.totals.total) * 100 : 0
  const extra = []
  if (JSON.stringify(b.spec.lines) !== JSON.stringify(ST.spec.lines)) extra.push('giỏ hàng')
  if (b.spec.segment !== ST.spec.segment) extra.push('nhóm khách')
  if (b.spec.provider !== ST.spec.provider) extra.push('đơn vị vận chuyển')
  if (JSON.stringify([...b.spec.codes].sort()) !== JSON.stringify([...ST.spec.codes].sort())) extra.push('mã đã chọn')
  const cfgChanged = ST.actions.length > b.actions
  return `<section class="panel-sec">
    <h4>So sánh trước và sau <span class="muted">· số Medusa</span></h4>
    <div class="note-box"><span><b>${b.now < (ST.windows.find((w) => /Flash/.test(w.label))?.start ?? 0) ? 'Mốc trước flash — mô phỏng' : 'Mốc trước — mô phỏng'}</b> · ${fmtTime(b.now)} → hiện tại ${fmtTime(ST.now)}</span></div>
    ${extra.length ? `<div class="warn-box">Ngoài thời gian và cấu hình, đã đổi thêm: <b>${extra.join(', ')}</b>. Không quy toàn bộ chênh lệch cho flash sale.</div>` : ''}
    ${cfgChanged ? `<div class="note-box">Có ${ST.actions.length - b.actions} thay đổi trên Medusa kể từ mốc (xem Nhật ký).</div>` : ''}
    <div class="tbl-wrap"><table><thead><tr><th></th><th>Mốc trước</th><th>Hiện tại</th></tr></thead><tbody>
      ${compareRows(before, R).map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
      <tr class="tot"><td>Tổng thanh toán</td><td>${vnd(before.totals.total)}</td><td>${vnd(R.totals.total)}</td></tr>
    </tbody></table></div>
    <div class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}"><span>${d > 0 ? '▲' : d < 0 ? '▼' : '■'}</span><b>${signed(d)}</b><span>(${p > 0 ? '+' : ''}${pct(p)})</span><b style="font-size:15px">${d > 0 ? 'Khách trả nhiều hơn' : d < 0 ? 'Khách trả ít hơn' : 'Không đổi'}</b></div>
    <div class="btn-row"><button class="btn btn-sm btn-ghost" data-act="snapshot">Chụp lại mốc</button><button class="btn btn-sm btn-ghost" data-act="clear-baseline">Xóa mốc</button><button class="btn btn-sm" data-act="panel" data-to="sre">FlashSRE phân tích</button></div>
  </section>`
}

function actionsSec() {
  if (!ST.actions.length) return ''
  return `<section class="panel-sec"><h4>Nhật ký thay đổi trên Medusa</h4><ul class="log">${ST.actions.map((a) => `<li><time>${fmtTime(a.demo_at)}</time><span class="team">${a.team ? teamName(a.team) : 'Đồng hồ'}</span><span>${esc(a.text)}</span></li>`).join('')}</ul></section>`
}

function srePanel() {
  if (!ST.current) return '<section class="panel-sec"><p class="muted">Nạp một kịch bản trước.</p></section>'
  const b = ST.baseline
  const lost = b && R ? b.result.applied.filter((x) => !R.applied.some((y) => y.code === x.code)).map((x) => ({ ...x, why: R.explain.find((e) => e.code === x.code)?.reason })) : []
  const d = b && R ? R.totals.total - b.result.totals.total : null
  const verdict = d == null ? '' : d > 0
    ? `<div class="warn-box" style="flex-direction:column"><b>Khách trả nhiều hơn ${vnd(d)} so với mốc</b>${lost.map((l) => `<span>Mất ${esc(l.code)} (${esc(teamName(l.owner))}): ${esc(l.why ?? '')}</span>`).join('')}</div>`
    : `<div class="note-box">${d < 0 ? `Khách trả ít hơn ${vnd(-d)}.` : 'Tổng không đổi.'} Không phát hiện bất lợi trong so sánh này.</div>`
  const findings = ORACLE?.findings ?? null
  return `<p class="muted small" style="margin:12px 0 0">Oracle và audit log là dịch vụ FlashSRE thật trên backend Medusa (<code>/admin/flashsre/*</code>).</p>
    <section class="panel-sec"><h4>Giỏ bị ảnh hưởng</h4>${b ? verdict : '<p class="muted">Chưa có mốc. Bấm So sánh trước và sau, hoặc chụp mốc ở Demo Control.</p>'}</section>
    ${ST.current.split ? splitSec() : ''}
    <section class="panel-sec">
      <h4>Oracle FlashSRE <span class="muted">· so cấu hình Medusa với contract, mô phỏng ma trận giỏ</span></h4>
      <div class="btn-row"><button class="btn btn-primary" data-act="oracle" ${UI.oracleBusy ? 'disabled' : ''}>${UI.oracleBusy ? 'Đang kiểm…' : 'Chạy oracle trên Medusa'}</button><span class="muted small">Chỉ hiện phát hiện mới so với lab sạch lúc nạp kịch bản${ORACLE ? ` (đã trừ ${ORACLE.base_count} phát hiện nền)` : ''}.</span></div>
      ${findings == null ? '' : findings.length ? findings.map(findingCard).join('') : '<div class="note-box">Oracle không có phát hiện mới.</div>'}
    </section>
    <section class="panel-sec"><h4>Audit log Medusa <span class="muted">· kể từ lúc nạp kịch bản</span></h4>
      <div class="btn-row"><button class="btn btn-sm btn-ghost" data-act="changes">Tải lại</button></div>
      ${CHANGES ? `<div class="tbl-wrap"><table><thead><tr><th>Lúc</th><th>Team</th><th>Đối tượng</th><th>Thao tác</th></tr></thead><tbody>${CHANGES.changes.map((c) => `<tr><td>${new Date(c.at).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td>${c.team ? teamName(c.team) : `<span class="muted">${esc(c.actor)}</span>`}</td><td>${esc(c.label)}<div class="muted small">${esc(c.entity_type)}</div></td><td><code>${esc(c.route)}</code></td></tr>`).join('')}</tbody></table></div>` : ''}
    </section>
    <section class="panel-sec"><h4>Agent điều tra</h4><p class="muted small">Agent tranh luận (Analyst, Engineer, Judge) đọc cùng phát hiện này và chạy sandbox trên mọi contract: <code>node incidents/agent/flashsre-agent.mjs</code>.</p></section>`
}

// Kiểm tra tách đơn: không dùng rule của voucher, chỉ so giỏ gộp với từng phần giỏ theo shop trên Medusa
function splitSec() {
  const sp = SPLIT
  const se = SEARCH
  const splitTable = sp ? `<div class="tbl-wrap"><table><thead><tr><th>Shop</th><th>Tiền hàng</th><th>Shop tự chịu khi mua riêng</th><th>Shop tự chịu trong giỏ gộp</th><th>Chênh</th></tr></thead><tbody>
      ${sp.rows.map((r) => `<tr><td>${esc(r.title)}</td><td>${vnd(r.gross)}</td><td>${vnd(r.alone.shop_funded)}<div class="muted small">${codesText(r.alone.codes)}</div></td><td>${vnd(r.combined.shop_funded)}<div class="muted small">${codesText(r.combined.codes)}</div></td><td class="${r.extra > 0 ? 'bad' : ''}">${r.extra > 0 ? `+${vnd(r.extra)}` : '0đ'}</td></tr>`).join('')}
    </tbody></table></div>
    ${sp.rows.some((r) => r.extra > 0)
      ? sp.rows.filter((r) => r.extra > 0).map((r) => `<div class="warn-box"><span><b>${esc(r.title)} chịu thêm ${vnd(r.extra)}</b> chỉ vì giỏ có hàng của shop khác. Hàng của ${esc(r.title)} không đổi (${vnd(r.gross)}), nên khoản này không thể đúng với ý định voucher của shop.</span></div>`).join('')
      : '<div class="note-box">Không shop nào chịu thêm khi gộp giỏ.</div>'}
    <p class="muted small">${sp.carts} giỏ thật trên Medusa. Phần sàn/ngành chịu được phép khác nhau giữa giỏ gộp và giỏ riêng (voucher sàn khuyến khích gom đơn); phần shop tự chịu thì không.</p>` : ''
  const searchBody = se ? `<p><b>Agent thử ${se.tested} giỏ thật</b>: ${se.hits.length} giỏ làm shop chịu thêm, ${se.clean} giỏ không.</p>
    ${se.hits.length ? `<div class="tbl-wrap"><table><thead><tr><th>Hàng của shop</th><th>Gom với</th><th>Mua riêng</th><th>Gộp</th><th>Shop chịu thêm</th></tr></thead><tbody>
      ${se.hits.slice(0, 12).map((h) => `<tr><td>${esc(h.title)}<div class="muted small">${esc(h.code)} · ${vnd(h.gross)}</div></td><td>${esc(h.with_title)}<div class="muted small">${esc(h.with_shop)}</div></td><td>${vnd(h.alone)}</td><td>${vnd(h.combined)}</td><td class="bad">+${vnd(h.extra)}</td></tr>`).join('')}
    </tbody></table></div>${se.hits.length > 12 ? `<p class="muted small">và ${se.hits.length - 12} giỏ khác.</p>` : ''}` : ''}
    <div class="note-box"><span>Oracle theo rule trên cùng cấu hình: <b>không phát hiện nào nói shop chịu thêm vì hàng shop khác</b>.${se.oracle_on_codes.length ? ` Có ${se.oracle_on_codes.length} phát hiện nền nhắc tới các voucher này nhưng về chuyện khác: ${se.oracle_on_codes.map((f) => `<code>${esc(f.invariant)}</code>`).join(', ')} (vượt trần giảm của contract).` : ''}</span></div>` : ''
  return `<section class="panel-sec">
    <h4>Kiểm tra tách đơn <span class="muted">· không dùng rule của voucher</span></h4>
    <p class="small">Tính chất: tiền giảm shop A <b>tự chịu</b> cho hàng của chính A không được đổi chỉ vì giỏ có thêm hàng của shop B. FlashSRE đo giỏ gộp và từng phần giỏ theo shop trên Medusa rồi so.</p>
    <div class="btn-row"><button class="btn btn-primary" data-act="split" ${UI.splitBusy ? 'disabled' : ''}>${UI.splitBusy ? 'Đang đo…' : 'Tách giỏ hiện tại theo shop'}</button><button class="btn" data-act="split-search" ${UI.searchBusy ? 'disabled' : ''}>${UI.searchBusy ? 'Agent đang dò (~1 phút)…' : 'Agent dò toàn catalog'}</button></div>
    ${splitTable}${searchBody}
  </section>`
}
const codesText = (codes) => Object.entries(codes).map(([c, a]) => `${c.replace('FS-MK-', '')} −${vnd(a)}`).join(' · ') || 'không mã'

function findingCard(f) {
  const ex = f.example
  return `<div class="finding ${f.kind === 'CROSS_TEAM_CONFLICT' ? 'cross' : ''}">
    <div class="btn-row"><span class="kind ${f.kind}">${esc(f.kind)}</span><span class="inv">${esc(f.invariant)}</span><span class="muted small">${esc(f.contract_id)}</span></div>
    <p><b>${esc(f.title)}</b></p>
    ${f.meaning ? `<p class="muted small">${esc(f.meaning)}</p>` : ''}
    ${ex ? `<p class="small">Giỏ ví dụ ${esc(ex.cart)} (${esc(ex.segment)}, ${esc(ex.provider)}): trong giờ flash ${vnd(ex.pays_in_flash)}, ngoài giờ flash ${vnd(ex.pays_off_flash)}.</p>` : ''}
    <div class="chips">${[...new Set(f.entities.map((e) => e.owner).filter(Boolean))].map((t) => `<span class="team">${teamName(t)}</span>`).join('')}${f.entities.map((e) => `<span class="chip">${esc(e.label)}</span>`).join('')}</div>
  </div>`
}

function adminPanel() {
  if (!CFG) return '<section class="panel-sec"><p class="muted">Nạp một kịch bản để xem cấu hình Medusa.</p></section>'
  const skuTitle = Object.fromEntries(ST.products.map((p) => [p.sku, p.title]))
  const lists = CFG.price_lists.map((l) => {
    const w = ST.windows.find((x) => /Flash/.test(x.label) && l.label.startsWith('Flash'))
    const skus = l.prices.length ? l.prices : []
    return `<div class="tbl-wrap"><table class="adm"><thead><tr><th colspan="2">${esc(l.label)} · ${teamName(l.team)} · ${l.type} · ${l.status}${w ? ` · khung ${fmtTime(w.start)}–${fmtTime(w.end)} theo đồng hồ demo` : ''}</th></tr></thead><tbody>
      ${skus.map((p) => `<tr><td>${esc(skuTitle[p.sku] ?? p.sku)}<div class="muted small">${esc(p.sku)}</div></td><td><input type="number" step="1000" min="0" id="pl-${l.id}-${p.sku}" data-op="price" data-list="${l.id}" data-sku="${p.sku}" value="${p.amount}"></td></tr>`).join('') || '<tr><td colspan="2" class="muted">Chưa có giá.</td></tr>'}
    </tbody></table></div>`
  }).join('')
  const fs = CFG.promotions.find((p) => p.kind === 'freeship')
  const fsTypes = fs?.target_rules.find((r) => r.attribute.endsWith('shipping_option_type_id'))?.values ?? []
  const promos = CFG.promotions.map((p) => {
    const min = p.rules.find((r) => r.attribute === 'item_subtotal')
    const seg = p.rules.some((r) => r.attribute === 'customer.groups.id')
    const b = p.campaign?.budget
    return `<tr>
      <td><label class="switch"><input type="checkbox" id="st-${p.code}" data-op="promo_status" data-code="${p.code}" ${p.status === 'active' ? 'checked' : ''} aria-label="Bật ${esc(p.code)}"><span></span></label></td>
      <td><b>${esc(p.code)}</b><div class="muted small">${esc(teamName(p.owner))}${p.auto ? ' · tự động' : ''}</div></td>
      <td><input type="number" id="val-${p.code}" step="${p.type === 'percentage' ? 1 : 1000}" min="0" data-op="promo_value" data-code="${p.code}" value="${p.value}"> ${p.type === 'percentage' ? '%' : 'đ'}</td>
      <td><input type="number" id="min-${p.code}" step="1000" min="0" data-op="promo_min_spend" data-code="${p.code}" value="${min ? min.values[0] : ''}" placeholder="không"></td>
      <td>${p.kind === 'segment' || seg ? `<label class="toggle"><input type="checkbox" id="seg-${p.code}" data-op="promo_segment" data-code="${p.code}" ${seg ? 'checked' : ''}>Khách mới</label>` : '<span class="muted">mọi khách</span>'}</td>
      <td>${b ? `${vnd(b.used)} / <input type="number" id="bud-${p.code}" step="10000" min="0" data-op="budget" data-code="${p.code}" value="${b.limit}"><div class="muted small">${esc(p.campaign.identifier)} · Finance</div>` : '<span class="muted">không</span>'}</td>
    </tr>`
  }).join('')
  return `<section class="panel-sec"><div class="btn-row"><span class="muted small">Mỗi thay đổi gọi Admin API Medusa bằng tài khoản của team sở hữu, nên audit log ghi đúng team.</span><a class="link" href="${esc(ST.admin_url)}" target="_blank" rel="noopener">Mở Medusa Admin ↗</a></div></section>
    <section class="panel-sec"><h4>Price list</h4>${lists}</section>
    <section class="panel-sec"><h4>Promotion</h4><div class="tbl-wrap"><table class="adm"><thead><tr><th>Bật</th><th>Mã</th><th>Mức giảm</th><th>Đơn tối thiểu</th><th>Nhóm khách</th><th>Ngân sách campaign</th></tr></thead><tbody>${promos}</tbody></table></div></section>
    <section class="panel-sec"><h4>Freeship Xtra <span class="muted">· đơn vị vận chuyển được hỗ trợ (Marketing)</span></h4>
      <div class="checks">${ST.providers.map((p) => `<label><input type="checkbox" id="fsp-${p.id}" data-op="freeship_provider" data-provider="${p.id}" ${fsTypes.includes(p.type_id) ? 'checked' : ''}>${esc(p.name)} · ${vnd(p.fee)}</label>`).join('')}</div></section>`
}

// ------------------------------------------------------------------ render
function render() {
  const phone = $('#phone')
  const ps = UI.lastScreen === UI.screen ? phone.querySelector('.st-body')?.scrollTop ?? 0 : 0
  UI.lastScreen = UI.screen
  phone.innerHTML = renderPhone()
  const pb = phone.querySelector('.st-body')
  if (pb) pb.scrollTop = ps
  const side = $('#side')
  const a = document.activeElement
  const editing = side.contains(a) && a.tagName === 'INPUT' && ['number', 'datetime-local'].includes(a.type)
  if (!editing) {
    const ss = side.querySelector('.side-body')?.scrollTop ?? 0
    side.innerHTML = renderSide()
    const sb = side.querySelector('.side-body')
    if (sb) sb.scrollTop = ss
  }
  $('#top-scenario').textContent = ST?.current ? `${ST.current.id} · ${ST.current.title}` : 'Chưa nạp kịch bản'
  $('#top-clock').textContent = ST ? `${fmtTime(ST.now)} · ${fmtDate(ST.now)}` : ''
  document.body.classList.toggle('drawer-open', UI.drawer)
  for (const el of document.querySelectorAll('[data-watch]')) {
    const k = el.dataset.watch
    if (UI.prev.has(k) && UI.prev.get(k) !== el.textContent) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump') }
    UI.prev.set(k, el.textContent)
  }
}

// ------------------------------------------------------------------ sự kiện
let ticker = null
function setRunning(on) {
  UI.running = on
  clearInterval(ticker)
  if (on) {
    ticker = setInterval(async () => {
      if (UI.ticking) return
      UI.ticking = true
      try { await setClock(ST.now + 1000 * UI.speed) } catch (e) { fail(e) } finally { UI.ticking = false }
    }, 1000)
  }
}

async function handle(act, el) {
  switch (act) {
    case 'screen':
      UI.screen = el.dataset.to
      UI.draft = null
      if (UI.screen === 'store' && !PRODUCTS) await loadProducts().catch(fail)
      break
    case 'drawer': UI.drawer = !UI.drawer; break
    case 'panel':
      UI.panel = el.dataset.to
      render()
      if (UI.panel === 'sre' && ST?.scenario) await loadChanges().catch(fail)
      if (UI.panel === 'admin' && ST?.scenario && !CFG) CFG = await api('/api/config').catch(fail)
      break
    case 'sc':
      setRunning(false)
      await api('/api/scenario', { id: el.dataset.id, mode: el.dataset.mode })
      UI.screen = 'cart'
      if (el.dataset.mode === 'compare' && !window.matchMedia('(max-width: 960px)').matches) UI.panel = 'control'
      await waitScenario()
      toast(el.dataset.mode === 'compare' ? 'Đã đo mốc trước trên Medusa và áp thay đổi của kịch bản.' : `Đã dựng kịch bản ${el.dataset.id} trên Medusa.`)
      return
    case 'add': {
      const lines = structuredClone(ST.spec.lines)
      const l = lines.find((x) => x.sku === el.dataset.sku)
      if (l) l.qty += 1
      else lines.push({ sku: el.dataset.sku, qty: 1 })
      toast('Đã thêm vào giỏ.')
      await setSpec({ lines })
      return
    }
    case 'qty': {
      const lines = structuredClone(ST.spec.lines).map((x) => (x.sku === el.dataset.sku ? { ...x, qty: Math.max(0, x.qty + Number(el.dataset.d)) } : x)).filter((x) => x.qty > 0)
      await setSpec({ lines })
      return
    }
    case 'provider': await setSpec({ provider: el.value }); return
    case 'rm-code': await setSpec({ codes: ST.spec.codes.filter((c) => c !== el.dataset.code) }); return
    case 'open-offers': UI.draft = [...ST.spec.codes]; UI.screen = 'offers'; break
    case 'pick': {
      const c = el.dataset.code
      UI.draft = UI.draft.includes(c) ? UI.draft.filter((x) => x !== c) : [...UI.draft, c]
      break
    }
    case 'apply-codes': {
      const codes = UI.draft
      UI.draft = null
      UI.screen = 'cart'
      await setSpec({ codes })
      return
    }
    case 'segment': await setSpec({ segment: el.dataset.to }); return
    case 'toggle': {
      UI.measuring = true
      render()
      await api('/api/toggle', { id: el.dataset.id, on: el.checked })
      await refresh()
      return
    }
    case 'time': await setClock(Number(el.dataset.t)); return
    case 'step': await setClock(ST.now + Number(el.dataset.ms)); return
    case 'run': setRunning(!UI.running); break
    case 'speed': UI.speed = Number(el.value); if (UI.running) setRunning(true); break
    case 'clock-input': if (el.value) await setClock(fromLocalInput(el.value)); return
    case 'snapshot': {
      UI.measuring = true
      render()
      const r = await api('/api/baseline', {})
      ST.baseline = r.baseline
      UI.measuring = false
      toast('Đã chụp mốc trước (đo trên Medusa).')
      break
    }
    case 'clear-baseline': await api('/api/baseline', undefined, 'DELETE'); ST.baseline = null; break
    case 'oracle': {
      UI.oracleBusy = true
      render()
      try { ORACLE = await api('/api/oracle', {}) } finally { UI.oracleBusy = false }
      await loadChanges().catch(() => null)
      break
    }
    case 'changes': await loadChanges(); break
    case 'split': {
      UI.splitBusy = true
      render()
      try { SPLIT = await api('/api/split', {}) } finally { UI.splitBusy = false }
      break
    }
    case 'split-search': {
      UI.searchBusy = true
      render()
      try { SEARCH = await api('/api/split-search', {}) } finally { UI.searchBusy = false }
      break
    }
    default: return
  }
  render()
}

async function adminOp(el) {
  const op = el.dataset.op
  const num = el.value === '' ? null : Math.max(0, Math.round(Number(el.value)))
  const args = {
    price: { list_id: el.dataset.list, sku: el.dataset.sku, amount: num },
    promo_status: { code: el.dataset.code, active: el.checked },
    promo_value: { code: el.dataset.code, value: num ?? 0 },
    promo_min_spend: { code: el.dataset.code, value: num },
    promo_segment: { code: el.dataset.code, on: el.checked },
    budget: { code: el.dataset.code, limit: num ?? 0 },
    freeship_provider: { provider: el.dataset.provider, on: el.checked },
  }[op]
  el.blur?.()
  UI.measuring = true
  render()
  await api('/api/admin', { op, args })
  toast('Đã cập nhật trên Medusa.')
  await refresh({ products: UI.screen === 'store' })
}

const run = (p) => p.catch((e) => { UI.measuring = false; fail(e); render() })
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]')
  if (!el || el.disabled || ['INPUT', 'SELECT'].includes(el.tagName)) return
  ev.preventDefault()
  run(handle(el.dataset.act, el))
})
document.addEventListener('change', (ev) => {
  const el = ev.target
  if (el.dataset.op) return run(adminOp(el))
  if (el.dataset.act) run(handle(el.dataset.act, el))
})

run((async () => {
  ST = await api('/api/state')
  render()
  if (ST.busy) await waitScenario()
  else if (ST.scenario) await refresh({ products: true })
})())
