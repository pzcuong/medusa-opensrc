#!/usr/bin/env node
/**
 * FlashSRE Investigation Agent: phát hiện -> thu bằng chứng -> sinh phương án -> kiểm chứng sandbox -> tranh luận -> hồ sơ.
 *
 * Tranh luận 3 vai: Business Analyst (buộc tội: lỗi cấu hình nghiệp vụ), Platform Engineer (phản biện: lỗi engine/BE,
 * hành vi đúng contract, hoặc contract mơ hồ), Judge (phán quyết). Judge bị ràng buộc bởi phép thử nhân quả trong sandbox:
 * chỉ được kết luận "lỗi nghiệp vụ" khi đưa đúng thay đổi cấu hình về trạng thái trước (hoặc về đúng contract) làm hết lỗi
 * mà không phá ưu đãi hợp lệ khác.
 *
 * Usage:
 *   node incidents/agent/flashsre-agent.mjs baseline            chụp phát hiện đã biết làm mốc (sau khi setup đúng kế hoạch)
 *   node incidents/agent/flashsre-agent.mjs run [--post]        điều tra mọi phát hiện mới, (--post) gửi hồ sơ lên dashboard
 *   node incidents/agent/flashsre-agent.mjs eval [--only FAM1,FAM2] [--limit N] [--post]
 *                                                               cài từng mẫu kịch bản, chạy agent, chấm với nhãn đáp án
 * Env: BASE, EMAIL, PASSWORD, FLASHSRE_TEAM_PASSWORD (eval)
 *      LLM tùy chọn: OPENAI_API_KEY + FLASHSRE_LLM_MODEL, hoặc ANTHROPIC_API_KEY [+ FLASHSRE_LLM_MODEL]; FLASHSRE_LLM=rules để tắt
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchRetry } from '../lib/fetch-retry.mjs'
import { ENGINE_KB } from './knowledge.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE || 'https://flashsre-commerce-30123348ca77.herokuapp.com'
const EMAIL = process.env.EMAIL || 'admin@flashsre.dev'
const PASSWORD = process.env.PASSWORD
if (!PASSWORD) {
  console.error('Thiếu biến môi trường PASSWORD (mật khẩu admin)')
  process.exit(1)
}
const HOST = new URL(BASE).host.replace(/[^a-z0-9.-]/gi, '_')
const OUT = join(HERE, '..', 'out', 'agent', HOST)
const BASELINE_FILE = join(HERE, '..', 'out', `agent-baseline-${HOST}.json`)
const log = (...a) => console.error(...a)

// ------------------------------------------------------------------ LLM (tùy chọn)
const LLM = (() => {
  const mode = process.env.FLASHSRE_LLM
  if (mode === 'rules') return { name: 'rules' }
  if (process.env.OPENAI_API_KEY && process.env.FLASHSRE_LLM_MODEL) return { name: `openai:${process.env.FLASHSRE_LLM_MODEL}`, provider: 'openai', model: process.env.FLASHSRE_LLM_MODEL }
  if (process.env.ANTHROPIC_API_KEY) return { name: `anthropic:${process.env.FLASHSRE_LLM_MODEL || 'claude-opus-5-5'}`, provider: 'anthropic', model: process.env.FLASHSRE_LLM_MODEL || 'claude-opus-5-5' }
  return { name: 'rules' }
})()

async function llmJson(system, user) {
  if (LLM.provider === 'openai') {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: LLM.model, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    })
    const j = await r.json()
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${JSON.stringify(j).slice(0, 200)}`)
    return JSON.parse(j.choices[0].message.content)
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: LLM.model, max_tokens: 2000, system, messages: [{ role: 'user', content: user }] }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${JSON.stringify(j).slice(0, 200)}`)
  const text = j.content.map((c) => c.text ?? '').join('')
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
}

// ------------------------------------------------------------------ backend
let token
async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetchRetry(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let json = null
  try { json = await r.json() } catch {}
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(json).slice(0, 300)}`)
  return json
}
async function login() {
  token = (await api('/auth/user/emailpass', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })).token
}
const keyOf = (contractId, f) => `${contractId}|${f.invariant}|${f.kind}|${f.entities?.[0]?.label ?? ''}`

async function marketplaceContracts() {
  return (await api('/admin/flashsre/contracts')).contracts.filter((c) => c.body?.schema === 'marketplace/v1')
}
async function checkAll(contracts) {
  const out = {}
  for (const c of contracts) {
    const r = (await api(`/admin/flashsre/contracts/${c.contract_id}/check`, { method: 'POST' })).check
    out[c.contract_id] = r.findings
  }
  return out
}
async function sandboxAll(contracts, patches) {
  const out = {}
  for (const c of contracts) {
    out[c.contract_id] = (await api(`/admin/flashsre/contracts/${c.contract_id}/sandbox`, { method: 'POST', body: { patches } })).sandbox.findings
  }
  return out
}
const allKeys = (byContract) => new Set(Object.entries(byContract).flatMap(([id, fs]) => fs.map((f) => keyOf(id, f))))

// Kiến thức về engine mà Platform Engineer dùng để phản biện (dùng chung với sub-agent kiểm định)

// ------------------------------------------------------------------ bằng chứng -> phương án
// Một phương án = danh sách patch nghiệp vụ mà sandbox hiểu được
function revertPatch(change) {
  const b = change.before
  const a = change.after
  switch (change.entity_type) {
    case 'promotion':
      if (!b && a) return { type: 'promotion.remove', code: a.code }
      return b ? { type: 'promotion.state', code: b.code, state: { status: b.status, is_automatic: b.is_automatic, rules: b.rules, application_method: b.application_method } } : null
    case 'product':
      return b ? { type: 'product.state', product_id: b.id, tag_ids: (b.tags ?? []).map((t) => t.id), category_ids: (b.categories ?? []).map((c) => c.id), collection_id: b.collection_id ?? null } : null
    case 'price_list':
      if (!b && a) return { type: 'price_list.remove', title: a.title }
      return b ? { type: 'price_list.state', title: b.title, prices: (b.prices ?? []).map((p) => ({ price_set_id: p.price_set_id, amount: Number(p.amount), currency_code: p.currency_code })) } : null
    case 'shipping_option':
      return !b && a ? { type: 'shipping_option.remove', id: a.id } : null
    case 'campaign':
      return b?.budget ? { type: 'campaign.budget', campaign_identifier: b.campaign_identifier, limit: Number(b.budget.limit) } : null
    default:
      return null
  }
}

// Diff gọn cho hồ sơ: batch xoá-rồi-tạo (vd prices) gộp theo khoá tự nhiên thành "cũ -> mới",
// bỏ trường định danh và các bản ghi được tạo lại y nguyên, để giá trị sai không bị đẩy ra khỏi phần trích
const ID_FIELDS = new Set(['id', 'price_set_id', 'currency_code', 'created_at', 'updated_at'])
function evidenceDiff(diff = [], n = 10) {
  const recs = new Map()
  const rest = []
  for (const d of diff) {
    const m = d.path.match(/^(\w+)\[([^\]]+)\]\.(\w+)$/)
    if (!m) { rest.push(d); continue }
    const r = recs.get(`${m[1]}[${m[2]}]`) ?? { coll: m[1], before: {}, after: {} }
    recs.set(`${m[1]}[${m[2]}]`, r)
    if (d.before != null) r.before[m[3]] = d.before
    if (d.after != null) r.after[m[3]] = d.after
  }
  const byKey = new Map()
  for (const [rk, r] of recs) {
    for (const side of ['before', 'after']) {
      const o = r[side]
      if (!Object.keys(o).length) continue
      const k = o.price_set_id ? `${r.coll}[${o.price_set_id}${o.currency_code ? `/${o.currency_code}` : ''}]` : rk
      const e = byKey.get(k) ?? { before: {}, after: {} }
      byKey.set(k, e)
      Object.assign(e[side], o)
    }
  }
  const out = [...rest]
  for (const [k, e] of byKey) {
    for (const f of new Set([...Object.keys(e.before), ...Object.keys(e.after)])) {
      if (!ID_FIELDS.has(f) && e.before[f] !== e.after[f]) out.push({ path: `${k}.${f}`, before: e.before[f] ?? null, after: e.after[f] ?? null })
    }
  }
  return out.slice(0, n)
}

// Rollback ghi lại cả price list; nói rõ giá nào thực sự đổi so với hiện tại, các giá khác ghi lại đúng giá đang có.
// raises: bản sửa làm khách trả nhiều hơn hiện tại
function priceListEffect(before, now) {
  const key = (p) => `${p.price_set_id}/${p.currency_code}`
  const cur = new Map((now?.prices ?? []).map((p) => [key(p), Number(p.amount)]))
  const old = new Map((before?.prices ?? []).map((p) => [key(p), Number(p.amount)]))
  const diffs = [...new Set([...cur.keys(), ...old.keys()])].filter((k) => cur.get(k) !== old.get(k))
    .map((k) => `${k.split('/')[0]}: ${cur.get(k) ?? 'không có'} -> ${old.get(k) ?? 'xoá'}`)
  const raises = [...old].some(([k, v]) => cur.has(k) && v > cur.get(k))
  return { raises, text: diffs.length ? ` (chỉ đổi ${diffs.length}/${old.size} giá: ${diffs.join('; ')}; các giá khác giữ nguyên)` : '' }
}

function candidatesFor(finding, changes, contracts) {
  const out = []
  // Mỗi đối tượng bị đổi kể từ mốc: đưa về trạng thái trước lần đổi đầu tiên
  const byEntity = new Map()
  for (const c of [...changes].reverse()) {
    if (!byEntity.has(c.entity_id)) byEntity.set(c.entity_id, { first: c, teams: new Set(), changes: [] })
    byEntity.get(c.entity_id).teams.add(c.team ?? 'chưa gán team')
    byEntity.get(c.entity_id).changes.push(c)
  }
  for (const [, e] of byEntity) {
    const patch = revertPatch(e.first)
    const effect = patch?.type === 'price_list.state' ? priceListEffect(e.first.before, e.changes.at(-1).after) : { raises: false, text: '' }
    e.raises = effect.raises
    if (patch) {
      out.push({
        raises_price: effect.raises,
        id: `revert:${e.first.entity_type}:${e.first.entity_label}`, kind: 'rollback', patches: [patch],
        caused_by: [...e.teams], entity: { type: e.first.entity_type, label: e.first.entity_label },
        changes: e.changes.map((c) => c.id),
        summary: `Đưa ${e.first.entity_type} "${e.first.entity_label}" về trạng thái trước thay đổi của ${[...e.teams].join(', ')}` + effect.text,
      })
    }
  }
  // Provider phục vụ thị trường nhưng không có giá ở tiền tệ đó: thử gỡ khỏi thị trường (hoặc bổ sung giá, cần người quyết)
  if (finding.invariant === 'PROVIDER_PRICED_IN_MARKET') {
    for (const e of finding.entities.filter((x) => x.type === 'shipping_option' && x.id)) {
      out.push({
        id: `unlist:${e.label}`, kind: 'conform', patches: [{ type: 'shipping_option.remove', id: e.id }],
        caused_by: [], entity: { type: 'shipping_option', label: e.label },
        summary: `Gỡ shipping option "${e.label}" khỏi thị trường (hoặc bổ sung giá theo tiền tệ thị trường)`,
      })
    }
  }
  // Flash đắt hơn ngoài giờ flash vì giỏ flash rơi dưới ngưỡng một ưu đãi: thử hạ ngưỡng đó xuống tiền hàng trong giờ flash.
  // Đây là đổi điều khoản của chủ ưu đãi, nên sandbox sẽ cho thấy nó lệch contract đã duyệt
  if (finding.invariant === 'FLASH_NOT_DEARER_THAN_OFF_FLASH') {
    const sub = finding.actual?.example?.subtotal_in_flash
    for (const l of (finding.actual?.lost_codes ?? []).filter((x) => x.min_spend && sub && sub < x.min_spend)) {
      out.push({
        id: `threshold:${l.code}`, kind: 'conform', patches: [{ type: 'promotion.min_spend', code: l.code, value: sub }],
        caused_by: [], entity: { type: 'promotion', label: l.code },
        summary: `Hạ ngưỡng ${l.code} từ ${l.min_spend.toLocaleString('vi-VN')}đ xuống ${sub.toLocaleString('vi-VN')}đ để giỏ flash vẫn đủ điều kiện (đổi điều khoản của ${l.owner ?? 'chủ ưu đãi'})`,
      })
    }
  }
  // Promotion là điều khoản contract: chỉnh cho khớp đúng điều khoản (không nhất thiết trùng trạng thái cũ)
  const clauseCodes = new Set(contracts.flatMap((c) => [...c.body.promotions.map((p) => p.code), ...(c.body.freeship ? [c.body.freeship.code] : [])]))
  for (const e of finding.entities.filter((x) => x.type === 'promotion' && clauseCodes.has(x.label))) {
    out.push({
      id: `conform:${e.label}`, kind: 'conform', patches: [{ type: 'promotion.conform', code: e.label }],
      caused_by: [], entity: { type: 'promotion', label: e.label },
      summary: `Chỉnh ${e.label} cho khớp đúng điều khoản contract`,
    })
  }
  // Bộ thay đổi của từng team (một người thường sửa nhiều đối tượng trong một lần)
  const byTeam = new Map()
  for (const e of byEntity.values()) {
    for (const t of e.teams) byTeam.set(t, [...(byTeam.get(t) ?? []), e])
  }
  for (const [team, es] of byTeam) {
    if (es.length < 2) continue
    out.push({
      id: `revert:team:${team}`, kind: 'rollback', patches: es.map((e) => revertPatch(e.first)).filter(Boolean), caused_by: [team], raises_price: es.some((e) => e.raises),
      entity: { type: es[0].first.entity_type, label: es.map((e) => e.first.entity_label).join(',') },
      summary: `Đưa ${es.length} đối tượng ${team} vừa sửa (${es.map((e) => e.first.entity_label).join(', ')}) về trạng thái trước`,
    })
  }
  if (byEntity.size > 1 && byTeam.size > 1) {
    const all = [...byEntity.values()].map((e) => revertPatch(e.first)).filter(Boolean)
    out.push({ id: 'revert:all', kind: 'rollback_all', patches: all, raises_price: [...byEntity.values()].some((e) => e.raises), caused_by: [...new Set([...byEntity.values()].flatMap((e) => [...e.teams]))], entity: null, summary: 'Rollback mọi thay đổi kể từ mốc' })
  }
  return out
}

// ------------------------------------------------------------------ tranh luận
function rulesDebate(ctx) {
  const { finding, contractId, tests, changes, chosen, verdict } = ctx
  const causal = tests.filter((t) => t.resolves_target && t.preserves)
  const kb = ENGINE_KB.filter((k) => (finding.title + JSON.stringify(finding.actual ?? '')).toLowerCase().match(/trần|cộng dồn|ngành|tối thiểu|thứ tự|tính sai/) ? true : false).slice(0, 2)
  const analyst = changes.length
    ? `Kể từ mốc có ${changes.length} thay đổi cấu hình: ${changes.slice(0, 3).map((c) => `${c.team ?? 'chưa gán team'} (${c.actor_email}) ${c.method} ${c.entity_type} "${c.entity_label}"`).join('; ')}. ` +
      `Phát hiện "${finding.title}" vi phạm ${finding.invariant} của ${contractId}. ` +
      (causal.length ? `Phép thử nhân quả: "${causal[0].summary}" trong sandbox làm hết lỗi và không phá ưu đãi hợp lệ, vậy nguyên nhân là cấu hình.` : 'Chưa phương án cấu hình nào làm hết lỗi.')
    : `Không có thay đổi cấu hình nào được ghi nhận kể từ mốc. Phát hiện "${finding.title}" vẫn lệch contract ${contractId}.`
  let engineer
  if (finding.kind === 'ENGINE_GAP') engineer = `Đây là giới hạn của engine, không phải cấu hình: ${ENGINE_KB[0]} ${ENGINE_KB[1]} Không thay đổi cấu hình nào gây ra nó.`
  else if (finding.kind === 'CONTRACT_GAP' && !causal.length) engineer = 'Engine làm đúng tài liệu (áp theo value giảm dần, % tính trên phần còn lại). Không có thay đổi cấu hình nào giải thích được; các contract chưa quy định thứ tự áp khi cộng dồn giữa campaign, nên không thể gọi là sai hay đúng.'
  else if (finding.kind === 'CONTRACT_CONFLICT') engineer = 'Cấu hình đang đúng với từng contract riêng lẻ. Mâu thuẫn nằm ở ý định: hai contract đã duyệt nói ngược nhau về cộng dồn, nên sửa cấu hình theo bên nào cũng sai với bên kia.'
  else if (finding.invariant === 'FLASH_NOT_DEARER_THAN_OFF_FLASH' && !causal.length) {
    // Liệt kê từng phương án đã thử: hết lỗi nhưng lệch điều khoản nào, hoặc bị loại vì không giúp khách trong giờ flash
    const tried = tests.map((t) => t.harm ? `"${t.summary}": loại, ${t.harm.charAt(0).toLowerCase()}${t.harm.slice(1)}`
      : t.resolves_target ? `"${t.summary}": hết lỗi nhưng lệch điều khoản đã duyệt (${[...new Set(t.new_keys.map((k) => k.split('|')[1]))].join(', ')})`
        : `"${t.summary}": không hết lỗi`)
    const ex = finding.actual?.example
    engineer = `Engine làm đúng từng quy tắc: trong giờ flash lấy giá thấp hơn, ưu đãi xét ngưỡng trên tiền hàng. Mỗi cấu hình khớp điều khoản đã duyệt của team mình; ` +
      `chỉ khi ghép lại, giỏ ${ex?.cart ?? ''} trong giờ flash trả ${Math.round(ex?.pays_in_flash ?? 0).toLocaleString('vi-VN')}đ, ngoài giờ flash ${Math.round(ex?.pays_off_flash ?? 0).toLocaleString('vi-VN')}đ. ` +
      `Đã thử: ${tried.join('; ')}. Không có bản sửa cấu hình nào vừa giúp khách vừa giữ đúng mọi điều khoản: chủ các điều khoản phải chọn sửa điều khoản nào.`
  }
  else if (!causal.length) engineer = `Không có phương án cấu hình nào làm hết lỗi trong sandbox. Có thể là lỗi engine/BE hoặc dữ liệu ngoài luồng admin. ${kb.join(' ')}`
  else if (verdict === 'UNATTRIBUTED_CHANGE') engineer = `Cấu hình đang lệch contract và "${causal[0].summary}" làm hết lỗi, nhưng không có bản ghi audit nào đụng tới đối tượng này kể từ mốc và contract không đổi. Trạng thái đã đổi ngoài Admin API (script, sửa tay DB, migration, đồng bộ dữ liệu). Chưa thể quy cho team nào; platform cần truy nguồn thay đổi trước khi áp bản sửa.`
  else engineer = `Đồng ý cấu hình là nguyên nhân, nhưng cần loại trừ: (1) engine hành xử khác tài liệu, (2) thay đổi là cố ý theo contract mới. ${kb.join(' ')} ` +
    `Phép thử cho thấy chỉ cần "${causal[0].summary}" là hết lỗi, engine không cần sửa; contract hiện hành vẫn yêu cầu như cũ.`
  return { analyst, engineer, judge_note: chosen ? `Chọn: ${chosen.summary}` : 'Không có phương án đạt' }
}

async function llmDebate(ctx, rules) {
  const evidence = JSON.stringify({
    contract_id: ctx.contractId, finding: { invariant: ctx.finding.invariant, kind: ctx.finding.kind, title: ctx.finding.title, expected: ctx.finding.expected, actual: ctx.finding.actual, affected: ctx.finding.affected },
    changes_since_baseline: ctx.changes.slice(0, 8).map((c) => ({ team: c.team, actor: c.actor_email, method: c.method, route: c.route, entity: `${c.entity_type}:${c.entity_label}`, diff: evidenceDiff(c.diff, 8) })),
    sandbox_tests: ctx.tests.map((t) => ({ candidate: t.summary, resolves_target: t.resolves_target, preserves: t.preserves, fully_clean: t.fully_clean, new_findings: t.new_keys })),
    engine_knowledge: ENGINE_KB,
  })
  const role = (r) => `Bạn là ${r} trong đội vận hành sàn thương mại điện tử. Trả lời tiếng Việt, ngắn gọn, chỉ dùng bằng chứng được cung cấp. Trả về JSON {"argument": string, "confidence": number 0..1}.`
  const analyst = await llmJson(role('Business Analyst. Lập luận rằng đây là lỗi cấu hình nghiệp vụ (config nhầm hoặc các team cấu hình mâu thuẫn), chỉ rõ team, thay đổi, điều khoản contract'), evidence)
  const engineer = await llmJson(role('Platform Engineer phản biện. Tìm giải thích khác: lỗi engine/backend, hành vi đúng contract, contract mơ hồ hoặc mâu thuẫn. Dùng engine_knowledge và sandbox_tests'), `${evidence}\nLập luận của Business Analyst: ${analyst.argument}`)
  const judge = await llmJson(
    'Bạn là Judge. Chọn verdict trong: BUSINESS_MISCONFIG, CROSS_TEAM_CONTRADICTION, CONTRACT_CONFLICT, CONTRACT_GAP, UNATTRIBUTED_CHANGE, ENGINE_OR_BACKEND, NO_ISSUE. ' +
    'Chỉ được chọn BUSINESS_MISCONFIG hoặc CROSS_TEAM_CONTRADICTION khi có sandbox_test resolves_target=true và preserves=true VÀ có changes_since_baseline đụng tới đối tượng của phát hiện; ' +
    'sửa config thì hết lỗi nhưng không có bản ghi ai sửa thì là UNATTRIBUTED_CHANGE. Trả về JSON {"verdict": string, "confidence": number, "reason": string}.',
    `${evidence}\nBusiness Analyst: ${analyst.argument}\nPlatform Engineer: ${engineer.argument}`
  )
  return { analyst: analyst.argument ?? rules.analyst, engineer: engineer.argument ?? rules.engineer, judge }
}

// Có bản ghi audit nào (kể từ mốc) đụng tới đối tượng của phát hiện không
const touchedByAudit = (finding, changes) =>
  changes.some((c) => finding.entities.some((e) => (e.id && c.entity_id === e.id) || (e.label && c.entity_label && e.label.split(',').includes(c.entity_label))))

// Phán quyết cuối cùng luôn qua ràng buộc cứng, kể cả khi có LLM
function decide(finding, tests, contracts, contractId, liveByKey, changes = [], contractChanges = []) {
  const passing = tests.filter((t) => t.resolves_target && t.preserves)
  if (finding.kind === 'CONTRACT_CONFLICT') return { verdict: 'CONTRACT_CONFLICT', confidence: 0.85, passing }
  if (finding.kind === 'ENGINE_GAP' && !passing.length) return { verdict: 'ENGINE_OR_BACKEND', confidence: 0.9, passing }
  // Contract không quy định (vd thứ tự áp giữa các campaign): nếu không config nào giải thích được thì chủ contract phải bổ sung
  if (finding.kind === 'CONTRACT_GAP' && !passing.length) return { verdict: 'CONTRACT_GAP', confidence: 0.8, passing }
  // Flash đắt hơn ngoài giờ flash mà không bản sửa cấu hình nào vừa giúp khách vừa giữ đúng điều khoản đã duyệt:
  // hai quyết định đúng va nhau, chủ các điều khoản phải chọn sửa bên nào (không phải lỗi engine)
  if (finding.invariant === 'FLASH_NOT_DEARER_THAN_OFF_FLASH' && !passing.length) return { verdict: 'CROSS_TEAM_CONTRADICTION', confidence: 0.8, passing }
  if (!passing.length) return { verdict: 'ENGINE_OR_BACKEND', confidence: 0.6, passing }
  const best = passing[0]
  // Sửa cấu hình thì hết lỗi, nhưng không có bản ghi ai sửa (audit) và contract cũng không đổi: trạng thái đổi ngoài Admin API
  // (script, sửa tay DB, migration, dữ liệu hỏng). Chỉ chứng minh được "config sai", không chứng minh được "team cấu hình sai".
  if (best.kind !== 'rollback' && best.kind !== 'rollback_all' && !touchedByAudit(finding, changes) && !contractChanges.some((c) => c.contract_id === contractId)) {
    return { verdict: 'UNATTRIBUTED_CHANGE', confidence: 0.7, passing }
  }
  // Team gây lỗi khác team sở hữu điều khoản bị ảnh hưởng: mâu thuẫn liên team
  const owners = new Set(finding.entities.map((e) => e.owner_team).filter(Boolean))
  const contract = contracts.find((c) => c.contract_id === contractId)
  if (contract?.body?.owner) owners.add(contract.body.owner)
  // Xét mọi phát hiện mà bản sửa giải quyết: chỉ cần một cái là xung đột liên team thì cả sự cố là liên team
  const covered = (best.resolves ?? []).map((k) => liveByKey.get(k)).filter(Boolean)
  for (const f of covered) for (const e of f.entities) if (e.owner_team) owners.add(e.owner_team)
  // Team gây lỗi làm lệch contract ngay trên đối tượng của chính mình (gõ sai giá, sai scope): lỗi cấu hình của team đó.
  // Ưu đãi của team khác mất theo chỉ là hệ quả, không có quyết định của hai team nào mâu thuẫn nhau
  const selfDrift = [finding, ...covered].some((f) => ['CONFIG_DRIFT', 'MISSING_CONFIG'].includes(f.kind) &&
    f.entities.some((e) => best.caused_by.includes(e.owner_team)))
  const crossTeam = !selfDrift && (finding.kind === 'CROSS_TEAM_CONFLICT' || covered.some((f) => f.kind === 'CROSS_TEAM_CONFLICT') ||
    (best.caused_by.length > 0 && best.caused_by.some((t) => !owners.has(t))))
  return { verdict: crossTeam ? 'CROSS_TEAM_CONTRADICTION' : 'BUSINESS_MISCONFIG', confidence: best.kind === 'rollback' ? 0.9 : 0.75, passing }
}

const AUTO_PATCH_TYPES = new Set(['promotion.conform', 'price_list.state', 'product.state'])

// ------------------------------------------------------------------ điều tra
async function investigate({ contracts, baselineKeys, since, baselineContracts = null }) {
  const live = await checkAll(contracts)
  const liveKeys = allKeys(live)
  const liveByKey = new Map(Object.entries(live).flatMap(([id, fs]) => fs.map((f) => [keyOf(id, f), f])))
  const queue = Object.entries(live).flatMap(([id, fs]) => fs.filter((f) => !baselineKeys.has(keyOf(id, f))).map((f) => ({ contractId: id, finding: f })))
    // Mâu thuẫn ý định giữa contract xử lý trước: các phát hiện cộng dồn chéo là hệ quả của nó
    .sort((a, b) => (b.finding.kind === 'CONTRACT_CONFLICT') - (a.finding.kind === 'CONTRACT_CONFLICT'))
  const contractChanges = baselineContracts
    ? contracts.filter((c) => baselineContracts[c.contract_id] !== undefined && baselineContracts[c.contract_id] !== c.version)
      .map((c) => ({ contract_id: c.contract_id, from: baselineContracts[c.contract_id], to: c.version, approved_by: c.approved_by }))
    : []
  const changes = (await api(`/admin/flashsre/config-changes?since=${encodeURIComponent(since)}&limit=200`)).config_changes
  // contract|invariant|label -> nhãn ở mốc, để nhận ra phát hiện ở mốc chỉ bị đổi nhãn
  const baseSubjects = new Map([...baselineKeys].map((k) => k.split('|')).map(([cid, inv, kind, label]) => [`${cid}|${inv}|${label}`, kind]))
  const covered = new Set()
  // Cùng một đối tượng (vd shipping option) bị nhiều contract báo cùng invariant: một sự cố, nhiều contract bị ảnh hưởng
  const subjectOf = (f) => `${f.invariant}|${f.entities?.[0]?.id ?? f.entities?.[0]?.label ?? ''}`
  const sameSubject = new Map()
  for (const { contractId, finding } of queue) {
    const k = subjectOf(finding)
    sameSubject.set(k, [...(sameSubject.get(k) ?? []), keyOf(contractId, finding)])
  }
  const dossiers = []
  for (const item of queue) {
    const key = keyOf(item.contractId, item.finding)
    if (covered.has(key)) continue
    const { finding, contractId } = item
    const candidates = candidatesFor(finding, changes, contracts)
    const tests = []
    if (finding.kind !== 'CONTRACT_CONFLICT') {
      for (const cand of candidates) {
        // Thử trên contract của phát hiện trước; chỉ khi hết lỗi ở đó mới kiểm các contract còn lại
        const sb = (await api(`/admin/flashsre/contracts/${contractId}/sandbox`, { method: 'POST', body: { patches: cand.patches } })).sandbox
        const first = { [contractId]: sb.findings }
        if (first[contractId].some((f) => keyOf(contractId, f) === key)) {
          tests.push({ ...cand, resolves_target: false, preserves: false, fully_clean: false, new_keys: [], remaining_keys: [key], resolves: [], patch_size: JSON.stringify(cand.patches).length })
          continue
        }
        // Flash đắt hơn ngoài giờ flash chỉ hết thật khi khách trong giờ flash trả ít đi; làm giá ngoài giờ flash đắt lên
        // (vd xoá khuyến mãi của shop) cũng xoá được cảnh báo nhưng không giúp khách nào
        const ex = finding.invariant === 'FLASH_NOT_DEARER_THAN_OFF_FLASH' ? finding.actual?.example : null
        if (ex) {
          const row = (sb.simulation ?? []).find((r) => r.sku === ex.cart && r.segment === ex.segment && r.provider === ex.provider)
          if (!row || row.customer_pays >= ex.pays_in_flash - 1) {
            const vnd = (n) => `${Math.round(n).toLocaleString('vi-VN')}đ`
            tests.push({
              ...cand, resolves_target: false, preserves: false, fully_clean: false, new_keys: [], remaining_keys: [key], resolves: [],
              patch_size: JSON.stringify(cand.patches).length,
              harm: row && row.customer_pays > ex.pays_in_flash + 1
                ? `Cảnh báo hết nhưng khách trong giờ flash trả đắt hơn: ${vnd(row.customer_pays)} thay vì ${vnd(ex.pays_in_flash)}`
                : `Cảnh báo hết nhưng khách trong giờ flash vẫn trả ${vnd(ex.pays_in_flash)}: chỉ làm giá ngoài giờ flash đắt lên`,
            })
            continue
          }
        }
        const rest = await sandboxAll(contracts.filter((c) => c.contract_id !== contractId), cand.patches)
        const res = { ...first, ...rest }
        const keys = allKeys(res)
        const newKeys = [...keys].filter((k) => !baselineKeys.has(k) && !liveKeys.has(k))
        const stillOpen = [...keys].filter((k) => !baselineKeys.has(k))
        tests.push({
          ...cand, resolves_target: !keys.has(key), preserves: newKeys.length === 0, fully_clean: stillOpen.length === 0,
          new_keys: newKeys, remaining_keys: stillOpen, resolves: [...liveKeys].filter((k) => !baselineKeys.has(k) && !keys.has(k)),
          patch_size: JSON.stringify(cand.patches).length,
        })
      }
    }
    // Ưu tiên: hết sạch lỗi mới, rồi rollback đúng thay đổi gây lỗi, rồi patch nhỏ
    tests.sort((a, b) => (b.resolves_target && b.preserves) - (a.resolves_target && a.preserves) || b.fully_clean - a.fully_clean ||
      (a.kind === 'rollback_all') - (b.kind === 'rollback_all') || (a.kind === 'conform') - (b.kind === 'conform') || a.patch_size - b.patch_size)
    let { verdict, confidence, passing } = decide(finding, tests, contracts, contractId, liveByKey, changes, contractChanges)
    let chosen = passing[0] ?? null
    // Liên team: thay đổi của team gây lỗi thường là quyết định trong thẩm quyền (hạ hạng shop theo KPI, mở provider mới).
    // Có bản sửa phía điều khoản bị ảnh hưởng thì ưu tiên; chỉ rollback mới hết lỗi thì đó là biện pháp tạm,
    // các team chủ điều khoản phải quyết phương án lâu dài (sửa điều khoản/contract theo trạng thái mới, hoặc giữ rollback)
    let interim = null
    if (verdict === 'CROSS_TEAM_CONTRADICTION' && chosen?.kind.startsWith('rollback')) {
      const keep = passing.find((t) => !t.kind.startsWith('rollback') && t.fully_clean >= chosen.fully_clean)
      // Bản sửa phía điều khoản không mang team gây lỗi; giữ lại để team đó vẫn có trong danh sách duyệt
      if (keep) chosen = { ...keep, caused_by: chosen.caused_by }
      else interim = chosen.caused_by
    }
    const rules = rulesDebate({ finding, contractId, tests, changes, chosen, verdict })
    let debate = { analyst: rules.analyst, engineer: rules.engineer, judge: { verdict, confidence, reason: rules.judge_note } }
    if (LLM.provider) {
      try {
        const d = await llmDebate({ finding, contractId, tests, changes }, rules)
        const llmVerdict = d.judge?.verdict
        const allowedBusiness = ['BUSINESS_MISCONFIG', 'CROSS_TEAM_CONTRADICTION']
        // LLM không được kết tội nghiệp vụ khi chưa có phép thử nhân quả, hoặc khi không có bằng chứng ai sửa
        const guarded = allowedBusiness.includes(llmVerdict) && (!passing.length || verdict === 'UNATTRIBUTED_CHANGE') ? verdict : (llmVerdict ?? verdict)
        debate = { analyst: d.analyst, engineer: d.engineer, judge: { ...d.judge, verdict: guarded, guarded: guarded !== llmVerdict } }
        verdict = guarded
        confidence = Math.min(confidence, Number(d.judge?.confidence ?? confidence))
      } catch (e) {
        debate.llm_error = String(e.message || e)
      }
    }
    // Chủ của mọi điều khoản mà bản sửa đụng tới đều phải duyệt, không chỉ chủ của phát hiện đầu tiên
    const resolvedOwners = (chosen?.resolves ?? []).flatMap((k) => liveByKey.get(k)?.entities ?? []).map((e) => e.owner_team)
    const approvers = [...new Set([...(verdict === 'UNATTRIBUTED_CHANGE' ? ['platform'] : []), ...(chosen?.caused_by ?? []),
      ...finding.entities.map((e) => e.owner_team), ...(verdict === 'CROSS_TEAM_CONTRADICTION' ? resolvedOwners : [])].filter(Boolean))]
    // Team gây lỗi xác nhận nhầm hay cố ý: nhầm thì áp rollback; cố ý thì chủ điều khoản quyết
    if (interim) {
      chosen = { ...chosen, summary: `${chosen.summary}. Bản sửa này đảo ngược thay đổi của ${interim.join(', ')}: nếu đó là sơ suất thì áp; nếu là quyết định hợp lệ, ` +
        `${approvers.filter((t) => !interim.includes(t)).join(', ') || 'chủ điều khoản'} phải chọn sửa điều khoản/contract theo trạng thái mới hay giữ rollback` }
    }
    if (chosen?.raises_price) {
      chosen = { ...chosen, summary: `${chosen.summary}. Bản sửa làm khách trả nhiều hơn hiện tại: nếu giá thấp hơn là thương lượng hợp lệ, ` +
        `${chosen.caused_by.join(', ')} trình sửa contract thay vì áp` }
    }
    const authority = !chosen || verdict === 'UNATTRIBUTED_CHANGE' ? 'ESCALATE'
      // Không tự áp bản sửa làm khách trả nhiều hơn giữa campaign: giá thấp hơn contract có thể là thương lượng chưa kịp sửa contract
      : verdict === 'BUSINESS_MISCONFIG' && !chosen.raises_price && chosen.patches.every((p) => AUTO_PATCH_TYPES.has(p.type)) ? 'AUTO_ELIGIBLE' : 'NEEDS_APPROVAL'
    for (const k of chosen?.resolves ?? []) covered.add(k)
    covered.add(key)
    const siblings = (sameSubject.get(subjectOf(finding)) ?? []).filter((k) => k !== key)
    for (const k of siblings) covered.add(k)
    const affectedContracts = [contractId, ...siblings.map((k) => k.split('|')[0])]
    const consequences = []
    if (finding.kind === 'CONTRACT_CONFLICT') {
      const codes = new Set(finding.entities.map((e) => e.label))
      for (const [k, f] of liveByKey) {
        // Hệ quả của mâu thuẫn ý định: cộng dồn chéo hoặc vượt trần do chính các mã đang mâu thuẫn
        if (!baselineKeys.has(k) && f.kind === 'CROSS_TEAM_CONFLICT' && ['CROSS_CAMPAIGN_STACKING', 'MAX_ITEM_DISCOUNT_PER_ORDER'].includes(f.invariant) &&
          f.entities.some((e) => codes.has(e.label))) {
          covered.add(k)
          consequences.push(k)
        }
      }
    }
    const dossier = {
      contract_id: contractId, finding_key: key, title: finding.title, verdict, confidence,
      status: chosen ? 'proposed' : 'escalated', llm: LLM.name,
      dossier: {
        finding, consequences, affected_contracts: affectedContracts, evidence: { contract_changes: contractChanges, changes: changes.slice(0, 10).map((c) => ({ id: c.id, at: c.created_at, team: c.team, actor_email: c.actor_email, method: c.method, route: c.route, entity: `${c.entity_type}:${c.entity_label}`, diff: evidenceDiff(c.diff, 10) })) },
        debate,
        tests: tests.map(({ patches, ...t }) => ({ ...t, patches })),
        chosen_fix: chosen ? { summary: chosen.summary, patches: chosen.patches, caused_by: chosen.caused_by, fully_clean: chosen.fully_clean, resolves: chosen.resolves } : null,
        authority, approvers,
        covered_findings: [...(chosen?.resolves ?? [])],
        // Vì sao từng phát hiện gộp vào đây: cùng hết theo bản sửa trong sandbox. Phát hiện kiểu engine (trần, thứ tự áp) là hành vi
        // có sẵn mà thay đổi này làm lộ ra: gốc engine vẫn còn, bản sửa chỉ đưa phạm vi về như mốc
        covered_detail: (chosen?.resolves ?? []).filter((k) => k !== key).map((k) => {
          const f = liveByKey.get(k)
          // Oracle quy lỗi trần/thứ tự sang cấu hình khi promotion vừa bị đổi; mốc đã có cùng lỗi dưới nhãn khác (ENGINE_GAP)
          const [cid, inv, kind, label] = k.split('|')
          const baseKind = baseSubjects.get(`${cid}|${inv}|${label}`)
          const why = baseKind && baseKind !== kind
            ? `đã có ở mốc dưới nhãn ${baseKind}; thay đổi này chỉ làm nó đổi nhãn. Sau bản sửa nó vẫn còn như ở mốc: chưa được giải quyết`
            : f?.kind === 'ENGINE_GAP'
              ? 'hành vi engine có sẵn (không có trần, áp theo value giảm dần), chỉ lộ ra ở đây do thay đổi này; bản sửa đưa phạm vi về như mốc, gốc engine vẫn còn'
              : 'hết cùng bản sửa trong sandbox: hệ quả của cùng thay đổi'
          return { key: k, kind: f?.kind, title: f?.title, why }
        }),
      },
    }
    dossiers.push(dossier)
    log(`  [${verdict}] ${finding.title.slice(0, 110)}`)
    log(`      đề xuất: ${chosen ? chosen.summary : 'không có, chuyển người phụ trách'} | ${authority}${approvers.length ? ` | duyệt: ${approvers.join(', ')}` : ''}`)
  }
  return { live, dossiers }
}

function toMarkdown(d) {
  const x = d.dossier
  return [
    `## ${d.title}`,
    `- Contract: ${d.contract_id} | Phán quyết: **${d.verdict}** (tin cậy ${d.confidence}) | Quyền: ${x.authority} | LLM: ${d.llm}`,
    `- Business Analyst: ${x.debate.analyst}`,
    `- Platform Engineer: ${x.debate.engineer}`,
    `- Judge: ${x.debate.judge?.reason ?? ''}`,
    '',
    '| Phương án | Hết lỗi | Giữ ưu đãi hợp lệ | Sạch hoàn toàn | Lỗi mới |',
    '|---|---|---|---|---|',
    ...x.tests.map((t) => `| ${t.summary} | ${t.resolves_target ? 'có' : 'không'} | ${t.preserves ? 'có' : 'không'} | ${t.fully_clean ? 'có' : 'không'} | ${t.new_keys.length} |`),
    '',
    `Đề xuất: ${x.chosen_fix ? x.chosen_fix.summary : 'chuyển người phụ trách'}${x.approvers.length ? ` (duyệt: ${x.approvers.join(', ')})` : ''}`,
    '',
  ].join('\n')
}

async function persist(dossiers, post, tag) {
  const dir = join(OUT, `${new Date().toISOString().replace(/[:.]/g, '-')}${tag ? `-${tag}` : ''}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'dossiers.json'), JSON.stringify(dossiers, null, 2))
  writeFileSync(join(dir, 'dossiers.md'), dossiers.map(toMarkdown).join('\n'))
  if (post) {
    for (const d of dossiers) await api('/admin/flashsre/agent-runs', { method: 'POST', body: d })
  }
  return dir
}

// ------------------------------------------------------------------ lệnh
async function takeBaseline() {
  await login()
  const contracts = await marketplaceContracts()
  const live = await checkAll(contracts)
  // --engine-gaps-only: chỉ chấp nhận giới hạn engine làm "đã biết"; lỗi cấu hình có sẵn vẫn được điều tra
  if (process.argv.includes('--engine-gaps-only')) {
    for (const id of Object.keys(live)) live[id] = live[id].filter((f) => f.kind === 'ENGINE_GAP')
  }
  const b = { taken_at: new Date().toISOString(), keys: [...allKeys(live)], contracts: Object.fromEntries(contracts.map((c) => [c.contract_id, c.version])) }
  mkdirSync(dirname(BASELINE_FILE), { recursive: true })
  writeFileSync(BASELINE_FILE, JSON.stringify(b, null, 2))
  return b
}

async function run() {
  if (!existsSync(BASELINE_FILE)) throw new Error('Chưa có mốc. Chạy "baseline" sau khi setup đúng kế hoạch.')
  const b = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))
  await login()
  const contracts = await marketplaceContracts()
  log(`[agent] LLM=${LLM.name} | mốc ${b.taken_at} | ${contracts.length} contract`)
  const { dossiers } = await investigate({ contracts, baselineKeys: new Set(b.keys), since: b.taken_at, baselineContracts: b.contracts })
  if (!dossiers.length) return log('[agent] không có phát hiện mới so với mốc: NO_ISSUE')
  log(`[agent] hồ sơ: ${await persist(dossiers, process.argv.includes('--post'))}`)
}

// Nhãn kịch bản -> phán quyết được chấp nhận
const ACCEPT = {
  CONFIG_DRIFT: ['BUSINESS_MISCONFIG'],
  MISSING_CONFIG: ['BUSINESS_MISCONFIG'],
  CROSS_TEAM_CONFLICT: ['CROSS_TEAM_CONTRADICTION'],
  CONTRACT_CONFLICT: ['CONTRACT_CONFLICT'],
  // Đổi ngoài Admin API: phải thấy lỗi nhưng không được quy cho team nào. ENGINE_OR_BACKEND chấp nhận được khi agent
  // không dựng được bản sửa (không có audit thì không biết trạng thái trước, vd mất liên kết tag của sản phẩm)
  OUT_OF_BAND: ['UNATTRIBUTED_CHANGE', 'ENGINE_OR_BACKEND'],
}

async function evaluate() {
  const lab = await import('../marketplace-1111.mjs')
  const onlyArg = process.argv.indexOf('--only')
  const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(',') : null
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity
  const post = process.argv.includes('--post')
  const pickArg = process.argv.indexOf('--samples')
  const pick = pickArg > 0 ? process.argv[pickArg + 1].split(',') : null
  // --gate: chỉ chấm trên kịch bản sub-agent kiểm định đã PASS
  const audits = lab.scenarioAudits()
  const gate = process.argv.includes('--gate')
  // --business: chỉ chấm trên lỗi nghiệp vụ, bỏ đối chứng (NO_OP, ngoài luồng, giới hạn engine)
  const business = process.argv.includes('--business')
  const samples = lab.expandSamples().filter((s) => (!only || only.includes(s.family)) && (!pick || pick.includes(s.sample_id)) &&
    (!gate || audits.get(s.sample_id)?.verdict === 'PASS') && (!business || lab.BUSINESS_KINDS.includes(s.kind))).slice(0, limit)
  let ids = await lab.setup()
  await lab.asAdmin()
  await lab.postContracts()
  const b = await takeBaseline()
  const baselineKeys = new Set(b.keys)
  log(`[eval] ${samples.length} mẫu | LLM=${LLM.name} | mốc ${b.keys.length} phát hiện đã biết`)
  const rows = []
  const all = []
  // Đối chứng "lỗi engine": bỏ mốc, mọi giới hạn engine phải được phán là ENGINE_OR_BACKEND, không phải lỗi nghiệp vụ
  if (!business) {
    await login()
    const contracts = await marketplaceContracts()
    const { dossiers } = await investigate({ contracts, baselineKeys: new Set(), since: new Date().toISOString() })
    // Chỉ chấm các giới hạn engine; lỗi cấu hình có sẵn trong môi trường (nếu có) không thuộc phép đối chứng này
    for (const d of dossiers.filter((x) => x.dossier.finding.kind === 'ENGINE_GAP')) {
      const ok = d.verdict === 'ENGINE_OR_BACKEND'
      rows.push({ sample_id: `ENGINE_CONTROL:${d.finding_key}`, family: 'ENGINE_CONTROL', truth: 'ENGINE_GAP', verdicts: [d.verdict], business_ok: ok, verdict_ok: ok, fix_ok: true, root_hit: true })
      all.push(d)
      log(`[ENGINE_CONTROL] ${ok ? 'OK' : 'SAI'} ${d.verdict} | ${d.title.slice(0, 90)}`)
    }
  }
  // Audit được ghi sau khi response trả về: chờ cho các bản ghi của setup trước đó ghi xong rồi mới đặt mốc
  const settle = () => new Promise((r) => setTimeout(r, 2500))
  for (const [n, s] of samples.entries()) {
    await settle()
    const since = new Date().toISOString()
    let dossiers = []
    let error = null
    try {
      await lab.asTeam(s.team)
      await s.inject(ids)
      await login()
      const contracts = await marketplaceContracts()
      dossiers = (await investigate({ contracts, baselineKeys, since, baselineContracts: b.contracts })).dossiers
    } catch (e) {
      error = String(e.message || e)
    }
    const verdicts = dossiers.map((d) => d.verdict)
    const truth = s.expect.length === 0 ? 'NO_OP' : s.kind
    const isBusiness = (v) => ['BUSINESS_MISCONFIG', 'CROSS_TEAM_CONTRADICTION', 'CONTRACT_CONFLICT', 'CONTRACT_GAP'].includes(v)
    const businessOk = truth === 'NO_OP' ? dossiers.length === 0
      : truth === 'OUT_OF_BAND' ? dossiers.length > 0 && !verdicts.some(isBusiness)
        : verdicts.some(isBusiness) && !verdicts.includes('ENGINE_OR_BACKEND')
    const kinds = truth === 'NO_OP' ? [truth] : (s.accepted_kinds ?? [truth])
    const verdictOk = truth === 'NO_OP' ? dossiers.length === 0 : verdicts.some((v) => kinds.some((k) => (ACCEPT[k] ?? []).includes(v)))
    const chosen = dossiers.map((d) => d.dossier.chosen_fix).filter(Boolean)
    const rootLabel = s.root?.label ?? ''
    // Hai quyết định đúng va nhau: đáp án là chuyển chủ các điều khoản, kèm phép thử cho thấy mỗi bản sửa lệch điều khoản nào,
    // và hồ sơ phải chỉ đúng các đối tượng gốc
    const escalated = !!s.escalate && dossiers.some((d) => d.dossier.authority === 'ESCALATE' && d.dossier.tests.some((t) => t.resolves_target) &&
      rootLabel.split(',').every((l) => d.dossier.finding.entities.some((e) => e.label === l)))
    const fixOk = truth === 'NO_OP' || truth === 'CONTRACT_CONFLICT' || escalated || (chosen.length > 0 && dossiers.every((d) => d.dossier.chosen_fix || d.verdict === 'CONTRACT_CONFLICT'))
    const rootHit = truth === 'NO_OP' || truth === 'CONTRACT_CONFLICT' || escalated || chosen.some((c) => c.patches.some((p) => rootLabel.split(',').some((l) => JSON.stringify(p).includes(l) || (p.code && rootLabel.includes(p.code)) || (p.title && rootLabel.includes(p.title)))) || c.summary.includes(rootLabel.split(',')[0]))
    rows.push({ sample_id: s.sample_id, family: s.family, truth, actor: s.team, verdicts, business_ok: businessOk, verdict_ok: verdictOk, fix_ok: fixOk, root_hit: rootHit, incidents: dossiers.length, error })
    all.push(...dossiers.map((d) => ({ ...d, sample_id: s.sample_id })))
    if (post) for (const d of dossiers) await api('/admin/flashsre/agent-runs', { method: 'POST', body: { ...d, title: `[${s.sample_id}] ${d.title}`.slice(0, 500) } })
    log(`[${n + 1}/${samples.length}] ${s.sample_id} ${businessOk ? 'NGHIỆP-VỤ-ĐÚNG' : 'SAI-LOẠI'} ${verdictOk ? '' : '(phán quyết lệch nhãn)'} ${rootHit ? '' : '(sửa không trúng gốc)'} -> ${verdicts.join(',') || 'không có sự cố'}${error ? ` ERROR ${error.slice(0, 100)}` : ''}`)
    ids = await lab.setup()
    if (s.contract) {
      await lab.asAdmin()
      await lab.postContracts()
    }
  }
  const dir = await persist(all, false, 'eval')
  // Mẫu lỗi khi chạy (dyno 500/503, mạng) không nói gì về agent: đếm riêng, không tính vào mẫu số
  const ran = rows.filter((r) => !r.error)
  const pct = (k) => `${ran.filter((r) => r[k]).length}/${ran.length}`
  const fams = [...new Set(rows.map((r) => r.family))]
  const md = [
    `# Agent eval (${LLM.name})`, '',
    `Phân loại đúng nghiệp vụ / không phải BE: ${pct('business_ok')} · Phán quyết khớp nhãn: ${pct('verdict_ok')} · Có bản sửa đã kiểm sandbox: ${pct('fix_ok')} · Bản sửa trúng đối tượng gốc: ${pct('root_hit')} · Lỗi khi chạy (không tính): ${rows.length - ran.length}${rows.length > ran.length ? ` (${rows.filter((r) => r.error).map((r) => r.sample_id).join(', ')})` : ''}`, '',
    '| Họ | Mẫu | Đúng loại nghiệp vụ/BE | Phán quyết khớp nhãn | Có bản sửa | Trúng gốc |', '|---|---|---|---|---|---|',
    ...fams.map((f) => {
      const r = ran.filter((x) => x.family === f)
      const c = (k) => `${r.filter((x) => x[k]).length}/${r.length}`
      return `| ${f} | ${r.length} | ${c('business_ok')} | ${c('verdict_ok')} | ${c('fix_ok')} | ${c('root_hit')} |`
    }),
  ].join('\n')
  writeFileSync(join(dir, 'EVAL.md'), md + '\n')
  writeFileSync(join(dir, 'eval.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n')
  log(md)
  log(`[eval] ${dir}`)
  // --audit: mỗi mẫu một sub-agent độc lập chấm cách agent xử lý (phán quyết, bằng chứng, sandbox, bản sửa, người duyệt)
  if (process.argv.includes('--audit')) {
    execFileSync(process.execPath, [join(HERE, 'audit.mjs'), 'handling', dir, '--concurrency', '6'], { stdio: 'inherit', env: process.env })
  }
}

const cmd = process.argv[2]
const main = cmd === 'baseline' ? async () => log(`[baseline] ${(await takeBaseline()).keys.length} phát hiện đã biết`)
  : cmd === 'run' ? run : cmd === 'eval' ? evaluate : async () => log('Lệnh: baseline | run [--post] | eval [--only ...] [--limit N] [--post]')
main().catch((e) => { console.error(e); process.exit(1) })
