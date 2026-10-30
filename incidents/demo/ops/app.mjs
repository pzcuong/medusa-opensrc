// Giao diện FlashSRE Ops: bảng vận hành chiến dịch và phòng điều tra. Mọi số liệu lấy từ engine.mjs.
// Khi trang do medusa-ops.mjs phục vụ (window.FLASHSRE_LIVE), số liệu là đơn thật đọc từ Medusa và thao tác đi qua server.
import { DRAFTS, SCENARIOS, N, ROLES, TEAMS, SEGS, SIZES, STEPS, clock, detect, evaluateBenchmarks, hourCoverage, int, investigate, learn, marginTarget, money, options, pct, preflight, run, verify, vnd } from './engine.mjs'

const $ = (id) => document.getElementById(id)
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const sum = (xs, f = (x) => x) => xs.reduce((s, x) => s + f(x), 0)

const fresh = (id) => ({ sc: id, t: 0, event: true, decisions: [], approvals: {}, chosen: null, decidedAt: null, pausedAtOptions: false })
let S = load() ?? fresh('budget')
let timer = null
let seen = 0 // số bước điều tra đã hiện, để chỉ bước mới có hiệu ứng
const LIVE = !!window.FLASHSRE_LIVE
// Kinh nghiệm agent đã học: bản mô phỏng lưu trong trình duyệt, bản Medusa lưu trên Medusa (agent run trạng thái lesson)
let LESSONS = (() => { try { return JSON.parse(localStorage.getItem('flashsre-lessons')) ?? [] } catch { return [] } })()
const PF = { draft: DRAFTS[0].id, guard: false, created: null, busy: false }
function keepLesson(l) {
  LESSONS = [l, ...LESSONS.filter((x) => x.id !== l.id)]
  try { localStorage.setItem('flashsre-lessons', JSON.stringify(LESSONS)) } catch { /* trình duyệt chặn lưu trữ thì bỏ qua */ }
}
let L = null // trạng thái phiên trên Medusa
let pausedLive = false
async function api(path, body) {
  const r = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json()
  if (!r.ok) throw new Error(j.error ?? r.statusText)
  return j
}
// Ảnh của phiên Medusa dưới dạng trạng thái mà phần vẽ dùng chung với bản mô phỏng
function fromLive() {
  S = { sc: L.scenario, t: Math.max(0, L.t), event: L.event, decisions: L.decisions, approvals: L.approvals, chosen: L.chosen, decidedAt: L.decidedAt }
}

function load() { try { return JSON.parse(localStorage.getItem('flashsre-ops')) } catch { return null } }
function save() { try { localStorage.setItem('flashsre-ops', JSON.stringify(S)) } catch { /* trình duyệt chặn lưu trữ thì bỏ qua */ } }
const SC = () => SCENARIOS.find((s) => s.id === S.sc)
const fromT = () => (S.chosen ? S.chosen.at : S.t) // dự báo "giữ nguyên" vẽ từ lúc agent tính

// ------------------------------------------------------------------ tính toàn bộ trạng thái tại phút hiện tại
function compute() {
  const sc = SC()
  const plan = run(sc, { event: false })
  const sim = LIVE ? { rows: L?.rows ?? [], exhausted: L?.rows.find((r) => r.left < r.cap)?.t ?? null } : run(sc, { event: S.event, decisions: S.decisions })
  if (sim.rows.length <= S.t) return { sc, sim, plan, empty: true, n: STEPS(sc) }
  const det = detect(sc, sim.rows, S.t)
  const n = STEPS(sc)
  let inv = null
  let opts = null
  if (det) {
    inv = investigate(sc, { ...sim, onset: det.onset }, Math.min(S.t, det.t + n), LIVE ? L.facts : {})
    if (S.t >= det.t + n + 1) opts = S.chosen ? S.chosen.options : options(sc, sim, S.t, inv, { decisions: S.decisions, event: S.event })
  }
  const ver = S.decidedAt != null ? verify(sc, sim, S.t, S.decidedAt) : null
  const bench = evaluateBenchmarks(sc, sim.rows, S.t)
  // khôi phục đã kiểm chứng thì agent ghi lại kinh nghiệm (bản Medusa do server ghi)
  if (!LIVE && ver?.ok && S.chosen && !LESSONS.some((l) => l.incident?.scenario === sc.id && l.incident?.decided === clock(S.chosen.at))) keepLesson(learn(sc, sim, det, inv, S.chosen, ver, S.t))
  return { sc, sim, plan, det, inv, opts, ver, n, bench }
}

// ------------------------------------------------------------------ biểu đồ
function chart({ series, yMax, yMin = 0, fmt, marks = [], now, h = 190 }) {
  const W = 640
  const L = 58
  const R = 14
  const T = 16
  const B = 26
  const x = (t) => L + ((W - L - R) * t) / (N - 1)
  const y = (v) => T + (h - T - B) * (1 - (v - yMin) / (yMax - yMin || 1))
  const path = (vals, from = 0) => vals.map((v, i) => (v == null ? null : `${x(from + i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(' ')
  const yt = [yMin, yMin + (yMax - yMin) / 2, yMax]
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="img">
    ${yt.map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join('')}
    ${[0, 60, 120, 180, 239].map((t) => `<text x="${x(t)}" y="${h - 8}" text-anchor="middle">${t === 239 ? '24:00' : clock(t)}</text>`).join('')}
    ${series.map((s) => s.area ? `<polygon class="area" points="${x(s.from ?? 0)},${y(yMin)} ${path(s.values, s.from)} ${x((s.from ?? 0) + s.values.length - 1)},${y(yMin)}"/>` : '').join('')}
    ${series.map((s) => `<polyline class="${s.cls}" points="${path(s.values, s.from)}"/>`).join('')}
    ${marks.map((m) => `<line class="mark" x1="${x(m.t)}" x2="${x(m.t)}" y1="${T}" y2="${h - B}"/><text class="mark-t" x="${Math.min(x(m.t) + 4, W - R - 70)}" y="${T + 10 + (m.row ?? 0) * 13}">${esc(m.label)}</text>`).join('')}
    <line class="now" x1="${x(now)}" x2="${x(now)}" y1="${T}" y2="${h - B}"/>
  </svg>`
}

// ------------------------------------------------------------------ cột trái: bảng vận hành
function opsView(c) {
  const { sc, sim, plan, det } = c
  const r = sim.rows[S.t]
  const p = plan.rows[S.t]
  const marks = [det && { t: det.t, label: `Phát hiện ${clock(det.t)}` }, S.decidedAt != null && { t: S.decidedAt, label: `Duyệt ${clock(S.decidedAt)}`, row: 1 }].filter(Boolean)
  const head = `<div class="panel">
    <div class="eyebrow">Kịch bản · 11/11 · 20:00–24:00</div>
    <h2>${esc(sc.title)}</h2>
    <p class="lede">${esc(sc.lede)}</p>
    <div class="chips">${(sc.campaigns ?? [sc.campaign]).map((k) => `<span class="chip"><b>${esc(k.code)}</b> · ${esc(k.name)} · ${TEAMS[k.owner]}</span>`).join('')}</div>
    <label class="event"><input type="checkbox" id="event" ${S.event ? 'checked' : ''}><span><b>Diễn biến ngoài hệ thống:</b> ${esc(sc.event.label)}. Tắt để xem chiến dịch chạy đúng dự báo (đối chứng).</span></label>
  </div>`
  if (c.empty) return `${head}<div class="panel"><p class="empty">${L?.busy ? `${esc(L.busy.label)}…` : L?.ready ? 'Đã dựng xong trên Medusa. Bấm Chạy để mở khung 20:00 và bắt đầu đặt đơn thật.' : 'Chọn kịch bản để dựng dữ liệu trên Medusa.'}</p></div>${LIVE ? medusaView(c) : ''}`
  if (sc.id === 'budget') {
    const last5 = sim.rows.slice(Math.max(0, S.t - 4), S.t + 1)
    const ab = 1 - sum(last5, (x) => x.orders) / sum(last5, (x) => x.attempts)
    const abPlan = 1 - sum(plan.rows.slice(Math.max(0, S.t - 4), S.t + 1), (x) => x.orders) / sum(plan.rows.slice(Math.max(0, S.t - 4), S.t + 1), (x) => x.attempts)
    const keep = c.opts?.find((o) => o.id === 'keep') ?? S.chosen?.keep
    const used = sim.rows.slice(0, S.t + 1)
    const maxUse = Math.max(...sim.rows.map((x) => x.want), ...plan.rows.map((x) => x.plan_uses)) * 1.05
    return `${head}
    <div class="kpis">
      <div class="kpi ${r.left < sc.campaign.budget * 0.15 ? 'alert' : ''}"><span class="k">Ngân sách còn</span><span class="v">${money(r.left)}</span><span class="d">Kế hoạch: ${money(p.plan_left)}</span></div>
      <div class="kpi ${r.uses > 2 * r.plan_uses ? 'alert' : ''}"><span class="k">Lượt dùng / phút</span><span class="v">${int(r.uses)}</span><span class="d">Kế hoạch: ${int(r.plan_uses)}</span></div>
      <div class="kpi ${ab > abPlan + 0.08 ? 'alert' : ''}"><span class="k">Bỏ giỏ (5 phút)</span><span class="v">${pct(ab)}</span><span class="d">Bình thường: ${pct(abPlan)}</span></div>
      <div class="kpi"><span class="k">Đơn hàng luỹ kế</span><span class="v">${int(sum(used, (x) => x.orders))}</span><span class="d">${r.active ? (r.slots ? 'Freeship mở theo khung giờ' : 'Freeship đang chạy') : '<span class="bad">Freeship đã dừng</span>'}</span></div>
    </div>
    ${benchView(c)}
    ${LIVE ? medusaView(c) : ''}
    ${metricsView(c)}
    <div class="panel">
      <h2>Ngân sách FREESHIP30 còn lại</h2>
      ${chart({ yMax: sc.campaign.budget + sum(S.decisions, (d) => d.change.add_budget ?? 0), fmt: money, now: S.t, marks, series: [
        { cls: 'plan', values: plan.rows.map((x) => x.plan_left) },
        keep && det && { cls: 'fore', values: keep.series.slice(fromT()), from: fromT() },
        { cls: 'act', area: true, values: used.map((x) => x.left) },
      ].filter(Boolean) })}
      <div class="legend"><span><i></i>Thực tế</span><span><i class="plan"></i>Kế hoạch</span>${keep && det ? '<span><i class="fore"></i>Agent dự báo nếu giữ nguyên</span>' : ''}</div>
    </div>
    <div class="panel">
      <h2>Lượt dùng freeship mỗi phút</h2>
      ${chart({ yMax: maxUse, fmt: (v) => int(v), now: S.t, marks, h: 160, series: [
        { cls: 'plan', values: plan.rows.map((x) => x.plan_uses) },
        { cls: 'act', area: true, values: used.map((x) => x.uses) },
      ] })}
      <div class="legend"><span><i></i>Thực tế</span><span><i class="plan"></i>Kế hoạch</span></div>
    </div>
    <div class="panel">
      <h2>Ngân sách các chương trình cùng khung</h2>
      <div class="tbl-wrap"><table><thead><tr><th>Chương trình</th><th>Team</th><th>Nguồn tiền</th><th class="n">Ngân sách</th><th class="n">Đã dùng</th></tr></thead><tbody>
        <tr><td><b>FREESHIP30</b></td><td>${TEAMS.marketing}</td><td>Sàn</td><td class="n">${money(sc.campaign.budget + sum(S.decisions, (d) => d.change.add_budget ?? 0))}</td><td class="n">${money(sc.campaign.budget + sum(S.decisions, (d) => d.change.add_budget ?? 0) - r.left)}</td></tr>
        <tr><td><b>SAN50K</b> <span class="muted small">${esc(sc.related[0].name)}</span></td><td>${TEAMS.marketing}</td><td>Sàn</td><td class="n">${money(sc.related[0].budget - sum(S.decisions, (d) => d.change.add_budget ?? 0))}</td><td class="n">${money(r.san_spent)}</td></tr>
        <tr><td><b>BANK20</b> <span class="muted small">${esc(sc.related[1].name)}</span></td><td>${TEAMS.finance}</td><td>Ngân hàng đối tác</td><td class="n">${money(sc.related[1].budget)}</td><td class="n">${money(r.bank_spent)}</td></tr>
      </tbody></table></div>
    </div>`
  }
  // kịch bản 2
  const target = marginTarget(sc)
  const keep = c.opts?.find((o) => o.id === 'keep') ?? S.chosen?.keep
  const used = sim.rows.slice(0, S.t + 1)
  const ratio = S.t > 0 ? r.cum / r.plan_cum : 1
  const yMax = Math.max(plan.rows[N - 1].plan_cum, ...(keep ? keep.series : [0]), ...used.map((x) => x.cum)) * 1.08
  return `${head}
    <div class="kpis">
      <div class="kpi ${ratio < 0.9 && S.t > 5 ? 'alert' : ''}"><span class="k">Lợi nhuận đóng góp</span><span class="v">${money(r.cum)}</span><span class="d">Kế hoạch: ${money(r.plan_cum)}</span></div>
      <div class="kpi ${r.ship_per_order > r.plan_ship_per_order * 1.1 ? 'alert' : ''}"><span class="k">Trợ ship / đơn</span><span class="v">${vnd(r.ship_per_order)}</span><span class="d">Kế hoạch: ${vnd(r.plan_ship_per_order)}</span></div>
      <div class="kpi ${r.bulky_share > r.plan_bulky_share * 1.5 ? 'alert' : ''}"><span class="k">Đơn hàng cồng kềnh</span><span class="v">${pct(r.bulky_share)}</span><span class="d">Kế hoạch: ${pct(r.plan_bulky_share)}</span></div>
      <div class="kpi"><span class="k">GMV luỹ kế</span><span class="v">${money(sum(used, (x) => x.gmv))}</span><span class="d">${int(sum(used, (x) => x.orders))} đơn</span></div>
    </div>
    ${benchView(c)}
    ${LIVE ? medusaView(c) : ''}
    ${metricsView(c)}
    <div class="panel">
      <h2>Lợi nhuận đóng góp luỹ kế</h2>
      ${chart({ yMax, fmt: money, now: S.t, marks, series: [
        { cls: 'plan', values: plan.rows.map((x) => x.plan_cum) },
        { cls: 'target', values: plan.rows.map((x) => x.plan_cum * sc.target_share) },
        keep && det && { cls: 'fore', values: keep.series.slice(fromT()), from: fromT() },
        { cls: 'act', area: true, values: used.map((x) => x.cum) },
      ].filter(Boolean) })}
      <div class="legend"><span><i></i>Thực tế</span><span><i class="plan"></i>Kế hoạch</span><span><i class="target"></i>Mục tiêu ${money(target)}</span>${keep && det ? '<span><i class="fore"></i>Agent dự báo nếu giữ nguyên</span>' : ''}</div>
    </div>
    <div class="panel">
      <h2>Sàn trả phí ship trung bình mỗi đơn</h2>
      ${chart({ yMax: Math.max(...sim.rows.map((x) => x.ship_per_order), r.plan_ship_per_order) * 1.15, fmt: (v) => vnd(Math.round(v / 1000) * 1000), now: S.t, marks, h: 160, series: [
        { cls: 'plan', values: plan.rows.map((x) => x.plan_ship_per_order) },
        { cls: 'act', values: used.map((x) => x.ship_per_order) },
      ] })}
      <div class="legend"><span><i></i>Thực tế</span><span><i class="plan"></i>Kế hoạch</span></div>
    </div>
    <div class="panel">
      <h2>Chi phí hai chương trình tới ${clock(S.t)}</h2>
      <div class="tbl-wrap"><table><thead><tr><th>Chương trình</th><th>Team</th><th class="n">Chi phí</th></tr></thead><tbody>
        <tr><td><b>VIP15</b> <span class="muted small">${esc(sc.campaigns[0].name)}</span></td><td>${TEAMS.marketing}</td><td class="n">${money(sum(used, (x) => x.discount))}</td></tr>
        <tr><td><b>FREESHIP_ALL</b> <span class="muted small">${esc(sc.campaigns[1].name)}</span></td><td>${TEAMS.growth}</td><td class="n">${money(sum(used, (x) => x.ship_cost))}</td></tr>
      </tbody></table></div>
    </div>`
}

// ------------------------------------------------------------------ benchmark: mỗi chỉ số một đường nhỏ, vạch cảnh báo và vạch kích hoạt agent
function spark(b, t) {
  const W = 220
  const H = 46
  const vs = b.series.map((x) => x.v).filter(Number.isFinite)
  const lo = Math.min(...vs, b.warn, b.breach)
  const hi = Math.max(...vs, b.warn, b.breach)
  const pad = (hi - lo) * 0.12 || 1
  const y = (v) => H - 4 - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - 8)
  const x = (k) => (W * k) / (N - 1)
  const pts = b.series.filter((p) => Number.isFinite(p.v)).map((p) => `${x(p.k).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const hot = b.series.filter((p) => p.st === 'breach')
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    ${hot.map((p) => `<rect class="sp-hot" x="${x(p.k)}" y="0" width="${(W / (N - 1)) + 0.6}" height="${H}"/>`).join('')}
    <line class="sp-warn" x1="0" x2="${W}" y1="${y(b.warn)}" y2="${y(b.warn)}"/>
    <line class="sp-breach" x1="0" x2="${W}" y1="${y(b.breach)}" y2="${y(b.breach)}"/>
    <polyline class="sp-line" points="${pts}"/>
    ${b.fired != null ? `<circle class="sp-fire" cx="${x(b.fired)}" cy="${y(b.series[b.fired].v)}" r="3.2"/>` : ''}
    <line class="sp-now" x1="${x(t)}" x2="${x(t)}" y1="0" y2="${H}"/>
  </svg>`
}
function benchView(c) {
  const { bench } = c
  const label = { ok: 'Trong ngưỡng', warn: 'Cảnh báo', breach: 'Vượt ngưỡng' }
  return `<div class="panel">
    <div class="status"><h2>Benchmark</h2><span class="note">Agent theo dõi ${bench.length} chỉ số mỗi phút. Chỉ số có nhãn "kích hoạt agent" vượt ngưỡng đủ lâu thì agent tự mở sự cố.</span></div>
    <div class="bench">${bench.map((b) => `<div class="bm bm-${b.status}">
      <div class="bm-head"><span class="bm-label">${esc(b.label)}</span>${b.trigger ? '<span class="tag trig">kích hoạt agent</span>' : ''}</div>
      <div class="bm-val"><b>${b.value == null ? '—' : esc(b.fmt(b.value))}</b><span class="pill ${b.status === 'breach' ? 'bad' : b.status === 'warn' ? 'warn' : 'ok'}">${label[b.status]}</span></div>
      ${spark(b, S.t)}
      <div class="bm-foot">Ngưỡng ${esc(b.fmt(b.warn))} / ${esc(b.fmt(b.breach))} · ${b.sustain} phút${b.fired != null ? ` · <b class="bad">kích hoạt ${clock(b.fired)}</b>` : ''}</div>
      <div class="bm-src">${esc(b.source)}</div>
    </div>`).join('')}</div>
  </div>`
}

// ------------------------------------------------------------------ kinh nghiệm đã học và kiểm tra voucher mới trước khi tạo
function learnView() {
  const lessons = LIVE ? (L?.lessons ?? []) : LESSONS
  const base = DRAFTS.find((d) => d.id === PF.draft)
  const d = { ...base, ...(PF.guard ? (base.kind === 'freeship' ? { slots: true } : { bulky_cap: 200000 }) : {}) }
  const r = preflight(d, lessons)
  const verdict = { pass: ['ok', 'Đạt, không khớp kinh nghiệm rủi ro nào'], covered: ['ok', 'Đạt, đã có guardrail từ kinh nghiệm'], guard: ['warn', 'Cần guardrail trước khi phát hành'], block: ['bad', 'Chặn: guardrail đã học chưa đủ'] }[r.verdict]
  const res = (m, key) => {
    const x = m[key]
    if (!x) return '—'
    return d.kind === 'freeship' ? `${pct(x.coverage, 0)} khung giờ có freeship${x.exhausted != null ? ` · cạn sau ${x.exhausted} phút` : ''}` : `${money(x.profit)} / mục tiêu ${money(x.target)}`
  }
  return `<div class="panel">
      <div class="status"><h2>Kinh nghiệm agent đã học</h2><span class="pill">${lessons.length} bài học</span></div>
      ${lessons.length ? lessons.map((l) => `<div class="lesson">
        <div class="opt-head"><b>${esc(l.title)}</b><span class="tag no">${esc(l.id)}</span></div>
        <div class="note">Từ sự cố ${esc(l.learned_at)} · benchmark ${esc(l.incident?.benchmark ?? '')} · phát hiện ${esc(l.incident?.detected ?? '')}, khôi phục ${esc(l.incident?.recovered ?? '—')}</div>
        <ul class="ev">${l.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
        <div class="chips">${l.guardrails.map((g) => `<span class="chip">${esc(g.text)}</span>`).join('')}</div>
        <div class="note">Dấu hiệu khớp voucher mới: <span class="mono">${esc(l.facts.join(' + '))}</span>${l.unless?.length ? `, trừ khi có <span class="mono">${esc(l.unless.join(', '))}</span>` : ''}</div>
      </div>`).join('') : '<p class="empty">Chưa có. Chạy một kịch bản tới khi khôi phục, agent sẽ ghi lại kinh nghiệm.</p>'}
    </div>
    <div class="panel">
      <div class="status"><h2>Kiểm tra trước khi tạo voucher</h2><span class="pill ${verdict[0]}">${verdict[1]}</span></div>
      <div class="tabs" role="group" aria-label="Voucher nháp">${DRAFTS.map((x) => `<button class="tab" data-draft="${x.id}" aria-pressed="${x.id === PF.draft}">${esc(x.title)}</button>`).join('')}</div>
      <p class="lede">${esc(base.desc)}</p>
      <label class="event"><input type="checkbox" id="pf-guard" ${PF.guard ? 'checked' : ''}><span>Bật guardrail agent đề xuất: <b>${esc(base.kind === 'freeship' ? 'mở ngân sách theo khung giờ' : 'trần ưu đãi hàng cồng kềnh 200.000đ')}</b></span></label>
      <div class="facts">${r.rules.map((x) => `<div><span>Kiểm tra rule</span><span class="good">✓</span> ${esc(x)}</div>`).join('')}</div>
      ${r.matched.length ? r.matched.map((m) => `<div class="opt ${m.stressed_ok ? '' : 'rec'}">
        <div class="opt-head"><b>Khớp kinh nghiệm: ${esc(m.lesson.title)}</b><span class="tag ${m.stressed_ok ? 'ok' : 'no'}">${m.covered ? 'Đã có guardrail' : m.stressed_ok ? 'Chịu được' : 'Không chịu được'}</span></div>
        <div class="facts">
          <div><span>Nhu cầu như dự báo</span>${res(m, 'normal')}</div>
          <div><span>Phát lại sự cố đã học</span><b class="${m.stressed_ok ? 'good' : 'bad'}">${res(m, 'stressed')}</b></div>
          <div><span>Có guardrail "${esc(m.guardrail.text)}"</span><b class="${m.guarded_ok ? 'good' : 'bad'}">${res(m, 'guarded')}</b></div>
          ${m.cell ? `<div><span>Một đơn ${esc(SEGS[m.lesson.stress.seg].toLowerCase())} hàng cồng kềnh</span>${vnd(m.cell.per)} → ${vnd(m.cell_guarded.per)} khi có guardrail</div>` : ''}
        </div>
        <div class="note">Benchmark gắn sẵn cho voucher này: ${esc(m.lesson.benchmarks.join(', '))}</div>
      </div>`).join('') : `<p class="empty">${lessons.length ? 'Không khớp kinh nghiệm rủi ro nào.' : 'Chưa có kinh nghiệm nào để đối chiếu: rule hợp lệ nên voucher được tạo như bình thường.'}</p>`}
      ${LIVE ? `<div class="btn-row"><button class="btn btn-primary" id="pf-create" ${PF.busy ? 'disabled' : ''}>${PF.busy ? 'Đang tạo…' : 'Tạo voucher nháp trên Medusa'}</button></div>
        ${PF.created ? `<div class="cause"><b>Medusa:</b> ${esc(PF.created.text)}</div>` : ''}` : ''}
    </div>`
}

// ------------------------------------------------------------------ chỉ số chiến dịch: thực tế so với kế hoạch
function metricsView(c) {
  const { sc, sim, plan } = c
  const t = S.t
  const win = (rows) => rows.slice(Math.max(0, t - 4), t + 1)
  const cum = (rows) => rows.slice(0, t + 1)
  const a5 = win(sim.rows)
  const p5 = win(plan.rows)
  const a = cum(sim.rows)
  const p = cum(plan.rows)
  const div = (x, y) => (y ? x / y : 0)
  let rows
  if (sc.id === 'budget') {
    const burn = div(sum(a5, (x) => x.spend), a5.length)
    const planBurn = div(sum(p5, (x) => x.plan_uses), p5.length) * div(sc.campaign.budget, sc.campaign.planned_uses)
    const left = sim.rows[t].left
    const eta = burn > 0 ? Math.min(N, t + left / burn) : N
    rows = [
      ['Lượt mở giỏ / phút (5 phút)', int(div(sum(a5, (x) => x.attempts), a5.length)), int(div(sum(p5, (x) => x.plan_attempts), p5.length)), div(sum(a5, (x) => x.attempts), sum(p5, (x) => x.plan_attempts))],
      ['Tỷ lệ chốt đơn (5 phút)', pct(div(sum(a5, (x) => x.orders), sum(a5, (x) => x.attempts))), pct(div(sum(p5, (x) => x.orders), sum(p5, (x) => x.attempts))), div(div(sum(a5, (x) => x.orders), sum(a5, (x) => x.attempts)), div(sum(p5, (x) => x.orders), sum(p5, (x) => x.attempts)))],
      ['Lượt dùng freeship / phút (5 phút)', int(div(sum(a5, (x) => x.uses), a5.length)), int(div(sum(p5, (x) => x.plan_uses), p5.length)), div(sum(a5, (x) => x.uses), sum(p5, (x) => x.plan_uses))],
      ['Trợ ship / lượt', vnd(div(sum(a, (x) => x.spend), sum(a, (x) => x.uses))), vnd(div(sc.campaign.budget, sc.campaign.planned_uses)), div(div(sum(a, (x) => x.spend), sum(a, (x) => x.uses)), div(sc.campaign.budget, sc.campaign.planned_uses))],
      ['Tốc độ tiêu ngân sách / phút', money(burn), money(planBurn), div(burn, planBurn)],
      ['Ngân sách đã dùng', money(sum(a, (x) => x.spend)), money(sc.campaign.budget - plan.rows[t].plan_left), div(sum(a, (x) => x.spend), sc.campaign.budget - plan.rows[t].plan_left)],
      ['Dự kiến cạn ngân sách', eta >= N ? 'sau 24:00' : clock(eta), '24:00', eta >= N ? 1 : div(eta, N)],
      ['Truy cập từ link KOL (5 phút)', pct(div(sum(a5, (x) => x.kol_share * x.attempts), sum(a5, (x) => x.attempts)), 0), '0%', null],
      ['Lượt freeship / khách', (sim.rows[t].uses_per_customer ?? 1).toLocaleString('vi-VN', { maximumFractionDigits: 2 }), '1', div(sim.rows[t].uses_per_customer ?? 1, 1)],
      ['SAN50K đã dùng', money(sim.rows[t].san_spent), money(sc.related[0].budget * div(sum(p, (x) => x.plan_uses), sc.campaign.planned_uses)), div(sim.rows[t].san_spent, sc.related[0].budget * div(sum(p, (x) => x.plan_uses), sc.campaign.planned_uses))],
      ['BANK20 đã dùng', money(sim.rows[t].bank_spent), money(sc.related[1].budget * div(sum(p, (x) => x.plan_uses), sc.campaign.planned_uses)), div(sim.rows[t].bank_spent, sc.related[1].budget * div(sum(p, (x) => x.plan_uses), sc.campaign.planned_uses))],
    ]
  } else {
    const cells = (rows, f) => sum(rows, (x) => sum(x.cells.filter(f), (y) => y.orders))
    const ao = sum(a, (x) => x.orders)
    const po = sum(p, (x) => x.orders)
    const vipBulky = (y) => y.seg === 'VIP' && y.size === 'bulky'
    rows = [
      ['Đơn / phút (5 phút)', int(div(sum(a5, (x) => x.orders), a5.length)), int(div(sum(p5, (x) => x.orders), p5.length)), div(sum(a5, (x) => x.orders), sum(p5, (x) => x.orders))],
      ['GMV luỹ kế', money(sum(a, (x) => x.gmv)), money(sum(p, (x) => x.gmv)), div(sum(a, (x) => x.gmv), sum(p, (x) => x.gmv))],
      ['Giá trị đơn trung bình', vnd(div(sum(a, (x) => x.gmv), ao)), vnd(div(sum(p, (x) => x.gmv), po)), div(div(sum(a, (x) => x.gmv), ao), div(sum(p, (x) => x.gmv), po))],
      ['Lợi nhuận đóng góp / đơn', vnd(div(sim.rows[t].cum, ao)), vnd(div(plan.rows[t].plan_cum, po)), div(div(sim.rows[t].cum, ao), div(plan.rows[t].plan_cum, po))],
      ['Sàn trả phí ship / đơn', vnd(div(sum(a, (x) => x.ship_cost), ao)), vnd(div(sum(p, (x) => x.ship_cost), po)), div(div(sum(a, (x) => x.ship_cost), ao), div(sum(p, (x) => x.ship_cost), po))],
      ['Giảm VIP15 / đơn', vnd(div(sum(a, (x) => x.discount), ao)), vnd(div(sum(p, (x) => x.discount), po)), div(div(sum(a, (x) => x.discount), ao), div(sum(p, (x) => x.discount), po))],
      ['Tỷ trọng đơn VIP', pct(div(cells(a, (y) => y.seg === 'VIP'), ao)), pct(div(cells(p, (y) => y.seg === 'VIP'), po)), div(div(cells(a, (y) => y.seg === 'VIP'), ao), div(cells(p, (y) => y.seg === 'VIP'), po))],
      ['Tỷ trọng hàng cồng kềnh', pct(div(cells(a, (y) => y.size === 'bulky'), ao)), pct(div(cells(p, (y) => y.size === 'bulky'), po)), div(div(cells(a, (y) => y.size === 'bulky'), ao), div(cells(p, (y) => y.size === 'bulky'), po))],
      ['Đơn VIP × cồng kềnh', int(cells(a, vipBulky)), int(cells(p, vipBulky)), div(cells(a, vipBulky), cells(p, vipBulky))],
      ['Chi phí VIP15 luỹ kế', money(sum(a, (x) => x.discount)), money(sum(p, (x) => x.discount)), div(sum(a, (x) => x.discount), sum(p, (x) => x.discount))],
      ['Chi phí Freeship luỹ kế', money(sum(a, (x) => x.ship_cost)), money(sum(p, (x) => x.ship_cost)), div(sum(a, (x) => x.ship_cost), sum(p, (x) => x.ship_cost))],
    ]
  }
  const flag = (r) => r != null && (r > 1.5 || r < 0.67)
  return `<div class="panel">
    <h2>Chỉ số chiến dịch tới ${clock(t)}</h2>
    <div class="tbl-wrap"><table><thead><tr><th>Chỉ số</th><th class="n">Thực tế</th><th class="n">Kế hoạch</th><th class="n">So kế hoạch</th></tr></thead><tbody>
      ${rows.map(([k, v, pl, r]) => `<tr class="${flag(r) ? 'hot' : ''}"><td>${k}</td><td class="n">${v}</td><td class="n">${pl}</td><td class="n ${flag(r) ? 'bad' : ''}">${r == null ? '—' : `×${r.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}`}</td></tr>`).join('')}
    </tbody></table></div>
  </div>`
}

// ------------------------------------------------------------------ dữ liệu thật trên Medusa (chỉ bản live)
function medusaView() {
  const m = L?.medusa
  if (!m) return ''
  if (m.error) return `<div class="panel"><h2>Medusa</h2><p class="bad">${esc(m.error)}</p></div>`
  const w = L.sampling.weight ? `Mỗi đơn thật đại diện ${L.sampling.weight} đơn; ngân sách trên Medusa thu nhỏ cùng tỷ lệ.` : `Mỗi đơn thật mang trọng số theo nhóm giỏ (${Object.entries(L.sampling.weights).flatMap(([seg, x]) => Object.entries(x).map(([size, v]) => `${SEGS[seg]} ${SIZES[size].label.split(' (')[0].toLowerCase()} ×${v}`)).join(', ')}).`
  const sc = SC()
  return `<div class="panel">
    <div class="status"><h2>Dữ liệu thật trên Medusa</h2><a class="chip" href="${esc(m.admin_url)}" target="_blank" rel="noopener">Mở Medusa Admin</a></div>
    <p class="note">${esc(w)} Đơn, mức giảm và ngân sách đọc từ Medusa; lượt mở giỏ và nguồn truy cập là số liệu phiên của storefront. Kế hoạch: ${Object.entries(m.contracts).map(([k, v]) => `${k} v${v}`).join(', ')}.</p>
    <div class="facts"><div><span>Đơn thật đã đặt</span>${int(m.orders)}</div><div><span>Giỏ đã mở</span>${int(m.carts)}</div><div><span>Thay đổi cấu hình trong khung</span>${int(L.facts.all_changes.length)}</div></div>
    <div class="tbl-wrap"><table><thead><tr><th>Promotion</th><th>Team</th><th>Trạng thái</th><th class="n">Mức</th><th class="n">Ngân sách Medusa</th></tr></thead><tbody>
      ${m.promos.map((p) => `<tr><td class="mono">${esc(p.code)}</td><td>${TEAMS[p.owner] ?? p.owner}</td><td>${p.status === 'active' ? '<span class="good">Đang chạy</span>' : '<span class="muted">Tắt</span>'}</td><td class="n">${p.code.includes('FREESHIP-ALL') || p.code === 'FS-OPS-VIP15' ? `${p.value}%` : vnd(p.value)}</td><td class="n">${p.limit == null ? '—' : `${vnd(p.used)} / ${vnd(p.limit)}${sc.id === 'budget' ? `<div class="muted small">≈ ${money(p.used * L.sampling.weight)} / ${money(p.limit * L.sampling.weight)}</div>` : ''}`}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="eyebrow">Đơn mới nhất</div>
    <div class="tbl-wrap"><table><thead><tr><th>Đơn</th><th>Phút</th><th class="n">Tiền hàng</th><th>Giảm giá Medusa áp</th><th class="n">Phí ship / sàn trả</th></tr></thead><tbody>
      ${m.recent.map((o) => `<tr><td class="mono">${esc(o.id.slice(-8))}</td><td>${o.t == null ? '' : clock(o.t)}</td><td class="n">${vnd(o.subtotal)}</td><td class="small">${o.item_adj.map((a) => `${esc(a.code.replace('FS-OPS-', ''))} −${vnd(a.amount)}`).join(', ') || '—'}</td><td class="n">${vnd(o.ship_fee)}${o.ship_adj.length ? ` / <span class="good">${vnd(sum(o.ship_adj, (a) => a.amount))}</span>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
    ${L.actions.length ? `<div class="eyebrow">Nhật ký thao tác</div><ul class="steps">${L.actions.slice(0, 6).map((a) => `<li class="step"><span class="when">${clock(a.t)}</span><div class="a small">${a.team ? `<b>${TEAMS[a.team] ?? a.team}</b> · ` : ''}${esc(a.text)}</div></li>`).join('')}</ul>` : ''}
  </div>`
}

// ------------------------------------------------------------------ cột phải: FlashSRE
function sreView(c) {
  if (c.empty) return `<div class="panel"><div class="status"><h2>FlashSRE</h2><span class="pill">Chưa mở khung</span></div><p class="note">Agent bắt đầu theo dõi khi có đơn đầu tiên.</p></div>`
  const { sc, sim, det, inv, opts, ver, n } = c
  const status = !det ? ['ok', 'Bình thường'] : S.t < det.t + n + 1 ? ['bad', 'Đang điều tra'] : !S.chosen ? ['warn', 'Chờ người có thẩm quyền duyệt'] : !ver || ver.ok === null ? ['warn', 'Đã áp dụng, đang theo dõi'] : ver.ok ? ['ok', 'Đã khôi phục'] : ['bad', 'Chưa khôi phục']
  const slo = sloNow(c)
  const parts = [`<div class="panel">
    <div class="status"><h2>FlashSRE</h2><span class="pill ${status[0]}">${status[1]}</span></div>
    <div class="slo"><span>SLO kinh doanh: ${esc(sc.slo.label)}</span><b class="${slo.ok ? 'good' : 'bad'}">${esc(slo.text)}</b></div>
    <p class="note">Agent theo dõi chỉ số chiến dịch, tự điều tra khi lệch kế hoạch, mô phỏng phương án và chờ người có thẩm quyền duyệt. Agent không tự đổi ngân sách hay quyền lợi của khách.</p>
  </div>`]
  if (!det) {
    parts.push(`<div class="panel"><p class="empty">${S.event ? 'Chưa thấy bất thường. Bấm Chạy để mở khung chiến dịch.' : `Đối chứng: chiến dịch chạy đúng dự báo, agent không báo động tới ${clock(S.t)}.`}</p></div>`)
    return parts.join('')
  }
  const stepRows = inv.steps.map((s, i) => {
    const at = det.t + i + 1
    if (S.t < at) return ''
    return `<li class="step ${i >= seen ? 'fresh' : ''}"><span class="when">${clock(at)}</span><div>
      <div class="sys">${esc(s.system)}<span class="verdict v-${s.verdict}">${{ clear: s.rules_out ? `Loại trừ: ${s.rules_out}` : 'Bình thường', bad: 'Lệch kế hoạch', cause: 'Nguyên nhân', info: 'Dữ kiện' }[s.verdict]}</span></div>
      <div class="q">${esc(s.ask)}</div><div class="a">${esc(s.found)}</div>
      ${sc.id === 'margin' && s.system === 'Phân tích giỏ hàng' ? gapTable(inv) : ''}
    </div></li>`
  }).join('')
  seen = inv.steps.filter((_, i) => S.t >= det.t + i + 1).length
  parts.push(`<div class="panel">
    <div class="eyebrow">Điều tra</div>
    <ol class="steps">
      <li class="step"><span class="when">${clock(det.t)}</span><div><div class="sys">Benchmark kích hoạt agent<span class="verdict v-bad">${esc(c.bench.find((b) => b.id === det.benchmark)?.label ?? 'Bất thường')}</span></div><div class="a">${esc(det.signal)}</div></div></li>
      ${stepRows}
    </ol>
    ${S.t >= det.t + n ? `<div class="cause"><b>Kết luận:</b> ${esc(inv.cause)}</div>` : ''}
  </div>`)
  if (opts) parts.push(optionsView(c))
  if (S.chosen) parts.push(resultView(c))
  return parts.join('')
}

function gapTable(inv) {
  const rows = inv.gaps.slice(0, 4)
  return `<div class="tbl-wrap"><table><thead><tr><th>Nhóm giỏ</th><th class="n">Đơn so kế hoạch</th><th class="n">Lãi/lỗ mỗi đơn</th><th class="n">Lệch kế hoạch</th></tr></thead><tbody>
    ${rows.map((g, i) => `<tr class="${i === 0 ? 'hot' : ''}"><td>${SEGS[g.seg]} · ${esc(SIZES[g.size].label)}<div class="muted small">${g.combo.join(' + ') || 'không ưu đãi'}</div></td><td class="n">×${(g.orders / g.plan_orders).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</td><td class="n ${g.per < 0 ? 'bad' : ''}">${vnd(g.per)}</td><td class="n ${g.gap < 0 ? 'bad' : ''}">${money(g.gap)}</td></tr>`).join('')}
  </tbody></table></div>`
}

function optionsView(c) {
  const { sc, opts } = c
  const decided = !!S.chosen
  const at = decided ? S.chosen.at : S.t
  return `<div class="panel">
    <div class="eyebrow">Phương án · mô phỏng phần còn lại của khung từ ${clock(at)}</div>
    ${sc.id === 'budget' ? '<p class="note">Dự báo nhu cầu: tỷ lệ vượt kế hoạch quan sát 3 phút gần nhất, giảm một nửa sau mỗi 40 phút (giả định từ các đợt viral trước). Thực tế có thể khác; agent kiểm chứng lại sau khi áp dụng.</p>' : '<p class="note">Dự báo nhu cầu: độ co giãn theo mức ưu đãi của từng nhóm giỏ, ước lượng từ số đơn đã quan sát trong khung.</p>'}
    <div class="opts">${opts.map((o) => {
      const roles = o.roles
      const signed = S.approvals[o.id] ?? []
      const chosen = decided && S.chosen.id === o.id
      return `<div class="opt ${o.recommended ? 'rec' : ''} ${chosen ? 'chosen' : ''}">
        <div class="opt-head"><b>${esc(o.label)}</b><span class="chips">${o.recommended ? '<span class="tag rec">Agent đề xuất</span>' : ''}<span class="tag ${o.meets ? 'ok' : 'no'}">${o.meets ? 'Đạt SLO' : 'Không đạt SLO'}</span></span></div>
        <div class="facts">${facts(sc, o)}</div>
        ${decided ? (chosen ? `<div class="signed">Đã duyệt: ${roles.map((r) => ROLES[r]).join(', ')} · áp dụng từ ${clock(S.chosen.at + 1)}</div>` : '') : `<div class="approve"><span class="small muted">Cần duyệt:</span>${roles.map((r) => signed.includes(r) ? `<span class="signed">✓ ${ROLES[r]}</span>` : `<button class="btn" data-approve="${o.id}" data-role="${r}">Duyệt · ${ROLES[r]}</button>`).join('')}</div>`}
      </div>`
    }).join('')}</div>
  </div>`
}
function facts(sc, o) {
  if (sc.id === 'budget') return [
    ['Khung giờ còn freeship', pct(o.coverage, 0)],
    ['Freeship dùng đến', o.lasts_until >= N ? '24:00' : clock(o.lasts_until)],
    ['Đơn từ giờ đến 24:00', int(o.orders)],
    ['Tỷ lệ bỏ giỏ', pct(o.abandon)],
    ['Chi trợ ship đến 24:00', money(o.spend)],
  ].map(([k, v]) => `<div><span>${k}</span>${v}</div>`).join('')
  return [
    ['Lợi nhuận đến 24:00', `<span class="${o.meets ? 'good' : 'bad'}">${money(o.end_profit)}</span>`],
    ['GMV còn lại', money(o.gmv)],
    ['Đơn còn lại', int(o.orders)],
    ['Đơn bị ảnh hưởng', int(o.affected)],
  ].map(([k, v]) => `<div><span>${k}</span>${v}</div>`).join('')
}

function sloNow(c) {
  const { sc, sim, plan } = c
  if (sc.id === 'budget') {
    const end = S.t >= N - 1
    const cov = hourCoverage(sim.rows.slice(0, S.t + 1), 0)
    const r = sim.rows[S.t]
    return { ok: r.left >= r.cap, text: end ? `${pct(hourCoverage(sim.rows, 0), 0)} khung giờ có freeship` : r.left >= r.cap ? `Đang đạt · ${pct(cov, 0)} khung giờ tới giờ` : `Vi phạm từ ${clock(sim.exhausted)}` }
  }
  const target = marginTarget(sc)
  const r = sim.rows[S.t]
  const need = r.plan_cum * sc.target_share
  return { ok: r.cum >= need || S.t < 5, text: S.t < 5 ? 'Đang thu số liệu' : `${pct(r.cum / need, 0)} mức cần đạt tới giờ (mục tiêu ${money(target)})` }
}

function resultView(c) {
  const { sc, sim, det, ver } = c
  const end = S.t >= N - 1
  const mttd = det.t - det.onset
  const decide = S.chosen.at - det.t
  const rec = ver?.ok ? `${ver.t - det.t} phút` : '—'
  // Đối chứng để chấm điểm demo: cùng diễn biến thật nhưng không ai làm gì (agent không thấy được số này lúc quyết định)
  const base = run(sc, { event: S.event, decisions: [] })
  let outcome = ''
  if (sc.id === 'budget') {
    const after = (rows) => sum(rows.slice(S.chosen.at + 1), (x) => x.orders)
    outcome = end ? `<p>Đến 24:00: freeship có ở <b>${pct(hourCoverage(sim.rows, S.chosen.at + 1), 0)}</b> khung giờ còn lại, ${int(after(sim.rows))} đơn sau lúc duyệt. Đối chứng cùng diễn biến nếu giữ nguyên: ${pct(hourCoverage(base.rows, S.chosen.at + 1), 0)} khung giờ, ${int(after(base.rows))} đơn.</p>` : ''
  } else {
    outcome = end ? `<p>Đến 24:00: lợi nhuận đóng góp <b>${money(sim.rows[N - 1].cum)}</b>, mục tiêu ${money(marginTarget(sc))}. Đối chứng cùng diễn biến nếu giữ nguyên: ${money(base.rows[N - 1].cum)}.</p>` : ''
  }
  return `<div class="panel">
    <div class="eyebrow">Kiểm chứng sau khi áp dụng</div>
    <div class="result">
      <div class="kpi"><span class="k">Phát hiện sau</span><span class="v">${mttd} phút</span><span class="d">từ lúc lệch bắt đầu (${clock(det.onset)})</span></div>
      <div class="kpi"><span class="k">Đến lúc có quyết định</span><span class="v">${decide} phút</span><span class="d">điều tra + duyệt</span></div>
      <div class="kpi"><span class="k">Khôi phục SLO</span><span class="v">${rec}</span><span class="d">tính từ lúc phát hiện</span></div>
    </div>
    <p class="${ver?.ok ? 'good' : ver?.ok === false ? 'bad' : 'muted'}">${esc(ver?.text ?? 'Chờ số liệu sau khi áp dụng.')}</p>
    ${outcome}
  </div>`
}

// ------------------------------------------------------------------ vẽ và điều khiển
function render() {
  const c = compute()
  $('tabs').innerHTML = SCENARIOS.map((s) => `<button class="tab" data-sc="${s.id}" aria-pressed="${s.id === S.sc}">${esc(s.title)}</button>`).join('')
  $('clock').textContent = S.t >= N - 1 ? '24:00' : clock(S.t)
  $('scrub').value = S.t
  const running = LIVE ? L?.running : !!timer
  $('play').textContent = LIVE && L?.busy ? 'Đang dựng…' : running ? 'Dừng' : S.t >= N - 1 ? 'Hết khung' : 'Chạy'
  $('play').disabled = S.t >= N - 1 || (LIVE && (!!L?.busy || !L?.ready))
  $('scrub').hidden = LIVE
  $('speed').hidden = LIVE
  $('livebar').hidden = !LIVE
  if (LIVE) $('livebar').innerHTML = L?.error ? `<span class="bad">${esc(L.error)}</span>` : `<span class="live-dot"></span>Medusa · ${esc(new URL(L?.base ?? location.href).host)}`
  $('ops').innerHTML = opsView(c)
  $('sre').innerHTML = sreView(c)
  $('learn').innerHTML = learnView()
  // tự dừng khi phương án đã sẵn sàng, để người duyệt kịp đọc
  if (c.opts && !S.chosen && !S.pausedAtOptions && timer) { S.pausedAtOptions = true; stop(); render() }
  if (LIVE && c.opts && !S.chosen && !pausedLive && L.running) { pausedLive = true; api('/api/run', { on: false }).then(refresh) }
  if (!LIVE) save()
  return c
}
function stop() { clearInterval(timer); timer = null }
function play() {
  stop()
  timer = setInterval(() => {
    if (S.t >= N - 1) { stop(); render(); return }
    S.t += 1
    render()
  }, Number($('speed').value))
}

// Bản live: mọi thao tác đi qua server, server gọi Medusa
async function liveClick(el) {
  if (el.dataset.sc) { if (L.busy) return; pausedLive = false; seen = 0; await api('/api/setup', { scenario: el.dataset.sc, event: L.event }) }
  else if (el.id === 'play') await api('/api/run', { on: !L.running })
  else if (el.id === 'reset') { pausedLive = false; seen = 0; await api('/api/setup', { scenario: L.scenario, event: L.event }) }
  else if (el.dataset.approve) {
    const c = compute()
    const o = c.opts.find((x) => x.id === el.dataset.approve)
    const snapshot = c.opts.map(({ decisions, ...x }) => ({ ...x, decisions: [], from: S.t }))
    el.disabled = true
    await api('/api/approve', { option: { id: o.id, label: o.label, change: o.change, roles: o.roles }, role: el.dataset.role, snapshot })
  }
  await refresh()
}
async function refresh() {
  try { L = await api('/api/state') } catch (e) { L = { ...(L ?? {}), error: e.message, rows: L?.rows ?? [] } }
  if (L.scenario) fromLive()
  render()
}
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('button')
  if (!el) return
  if (el.dataset.draft) { PF.draft = el.dataset.draft; PF.created = null; render(); return }
  if (el.id === 'pf-create') { createDraft().catch(alertLive); return }
  if (LIVE) { if (el.dataset.sc || el.id === 'play' || el.id === 'reset' || el.dataset.approve) liveClick(el).catch((e) => alertLive(e)); return }
  if (el.dataset.sc) { stop(); S = fresh(el.dataset.sc); seen = 0; render(); return }
  if (el.id === 'play') { if (timer) stop(); else play(); render(); return }
  if (el.id === 'reset') { stop(); S = { ...fresh(S.sc), event: S.event }; seen = 0; render(); return }
  if (el.dataset.approve) {
    const id = el.dataset.approve
    S.approvals[id] = [...new Set([...(S.approvals[id] ?? []), el.dataset.role])]
    const c = compute()
    const o = c.opts.find((x) => x.id === id)
    if (o.roles.every((r) => S.approvals[id].includes(r))) {
      const keep = c.opts.find((x) => x.id === 'keep')
      S.decisions = o.decisions
      S.decidedAt = S.t
      S.chosen = { id, at: S.t, options: c.opts.map(({ decisions, ...x }) => ({ ...x, decisions: [], from: S.t })), keep: { ...keep, from: S.t, decisions: [] } }
    }
    render()
  }
})
// Bản Medusa: tạo voucher nháp qua Admin API; middleware FlashSRE của Medusa đối chiếu kinh nghiệm trước khi lưu
async function createDraft() {
  PF.busy = true
  render()
  try {
    const base = DRAFTS.find((d) => d.id === PF.draft)
    PF.created = await api('/api/draft', { draft: base.id, guard: PF.guard })
  } finally { PF.busy = false }
  render()
}
function alertLive(e) { L = { ...L, error: e.message }; render() }
document.addEventListener('change', (ev) => {
  if (ev.target.id === 'pf-guard') { PF.guard = ev.target.checked; PF.created = null; render(); return }
  if (LIVE && ev.target.id === 'event') { pausedLive = false; seen = 0; api('/api/setup', { scenario: L.scenario, event: ev.target.checked }).then(refresh, alertLive); return }
  if (ev.target.id === 'event') { stop(); S = { ...fresh(S.sc), event: ev.target.checked }; seen = 0; render() }
  if (ev.target.id === 'speed' && timer) play()
})
$('scrub').addEventListener('input', (ev) => {
  const t = Number(ev.target.value)
  // tua về trước lúc duyệt thì bỏ quyết định đó
  if (S.decidedAt != null && t <= S.decidedAt) { S.decisions = []; S.decidedAt = null; S.chosen = null; S.approvals = {} }
  if (t < S.t) S.pausedAtOptions = false
  S.t = t
  render()
})

if (LIVE) { S = fresh('budget'); refresh(); setInterval(refresh, 1500) } else render()
