#!/usr/bin/env node
/**
 * Sub-agent kiểm định độc lập, một sub-agent cho mỗi mẫu.
 *
 *   scenarios  Kiểm định kịch bản trước khi đưa vào dataset: từng khâu có do người có thẩm quyền làm vì lý do hợp lý
 *              không, lỗi có vô tình không, vì sao không ai thấy có đáng tin không, có đúng phạm vi FlashSRE (lỗi
 *              nghiệp vụ, không phải BE) không, nhãn và invariant kỳ vọng có đúng không, mã inject có khớp câu chuyện không.
 *   handling   Kiểm định cách agent FlashSRE xử lý từng mẫu (sau `flashsre-agent.mjs eval`): phán quyết, chuỗi bằng chứng,
 *              phép thử sandbox, bản sửa có hợp lý về nghiệp vụ không (có đảo ngược một quyết định hợp lệ không), ai duyệt.
 *
 * Usage:
 *   node incidents/agent/audit.mjs scenarios [--only FAM1,FAM2] [--samples ID1,ID2] [--limit N] [--concurrency 4]
 *   node incidents/agent/audit.mjs handling <thư mục eval> [--concurrency 4]
 * Env: FLASHSRE_SUBAGENT (claude-cli | anthropic), FLASHSRE_SUBAGENT_MODEL (sonnet | opus | haiku)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENGINE_KB, FLASHSRE_SCOPE, INVARIANTS } from './knowledge.mjs'
import { SUBAGENT_RUNTIME, pool, runSubAgent } from './sub-agent.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const log = (...a) => console.error(...a)
const arg = (name) => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}
const CONCURRENCY = Number(arg('--concurrency') ?? 4)
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-')

const check = { type: 'object', properties: { ok: { type: 'boolean' }, note: { type: 'string' } }, required: ['ok', 'note'] }

// ------------------------------------------------------------------ kiểm định kịch bản
const SCENARIO_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'REVISE', 'REJECT'] },
    realism: { type: 'integer', minimum: 1, maximum: 5 },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          at: { type: 'string' }, team: { type: 'string' },
          within_mandate: { type: 'boolean' }, legitimate_intent: { type: 'boolean' }, plausible: { type: 'boolean' },
          note: { type: 'string' },
        },
        required: ['at', 'team', 'within_mandate', 'legitimate_intent', 'plausible', 'note'],
      },
    },
    criteria: {
      type: 'object',
      properties: {
        inadvertent: check, unnoticed_credible: check, flashsre_fit: check, business_not_backend: check,
        label_consistent: { type: 'object', properties: { ok: { type: 'boolean' }, suggested_kind: { type: 'string' }, note: { type: 'string' } }, required: ['ok', 'suggested_kind', 'note'] },
        expected_detection_sensible: check, inject_matches_story: check,
      },
      required: ['inadvertent', 'unnoticed_credible', 'flashsre_fit', 'business_not_backend', 'label_consistent', 'expected_detection_sensible', 'inject_matches_story'],
    },
    issues: { type: 'array', items: { type: 'string' } },
    suggested_revision: { type: 'string' },
  },
  required: ['verdict', 'realism', 'steps', 'criteria', 'issues', 'suggested_revision'],
}

const SCENARIO_SYSTEM = [
  'Bạn là kiểm định viên độc lập cho dataset sự cố của FlashSRE. Bạn không viết kịch bản này và không có lợi ích gì khi nó được duyệt.',
  'Nhiệm vụ: quyết định kịch bản có phản ánh một sự cố nghiệp vụ có thật trên sàn thương mại điện tử nhiều team hay không.',
  '',
  'FlashSRE:',
  ...FLASHSRE_SCOPE.map((x) => `- ${x}`),
  '',
  'Hành vi engine khuyến mãi (Medusa 2.21.2):',
  ...ENGINE_KB.map((x) => `- ${x}`),
  '',
  'Invariant của oracle (đọc theo mô tả, không đoán theo tên):',
  ...Object.entries(INVARIANTS).map(([k, v]) => `- ${k}: ${v}`),
  '',
  'Nhãn (kind): CONFIG_DRIFT = một team cấu hình lệch contract của chính phạm vi mình; CROSS_TEAM_CONFLICT = thay đổi của team A',
  'làm hỏng điều khoản do team B sở hữu, hoặc hai việc hợp lệ của hai team cộng lại thành lỗi; MISSING_CONFIG = thiếu/tắt cấu hình',
  'contract yêu cầu; CONTRACT_CONFLICT = hai contract đã duyệt nói ngược nhau; NO_OP = thay đổi hợp lệ, không được báo lỗi;',
  'OUT_OF_BAND = cấu hình đổi ngoài Admin API, không có audit, không được quy cho team nào.',
  'Nếu mẫu có accepted_kinds (ca biên đã biết, vd một team lệch điều khoản của chính mình và việc đó làm hỏng điều khoản của team khác),',
  'label_consistent đạt khi bản chất thuộc một trong các nhãn đó; ghi chú nhãn nào sát hơn nhưng không đánh trượt chỉ vì chọn nhãn kia.',
  '',
  'Chấm từng khâu (steps): người làm có đúng thẩm quyền theo bảng teams không, ý định có hợp lý với vai trò không, hành động có',
  'giống thao tác người thật trong admin không. Rồi chấm các tiêu chí. Khắt khe: nếu một khâu vô lý (không ai làm vậy), lỗi là cố ý,',
  'nhãn sai, invariant kỳ vọng không khớp hậu quả, hoặc mã inject không làm đúng điều câu chuyện kể, thì không được PASS.',
  'REVISE = sửa được bằng thay câu chuyện/nhãn/tham số; REJECT = bản chất không phải sự cố nghiệp vụ hợp lý hoặc trùng lặp vô nghĩa.',
  'Với kịch bản đối chứng (NO_OP, OUT_OF_BAND), "hợp lý" nghĩa là đối chứng có ý nghĩa và đúng loại. Viết tiếng Việt, ngắn, cụ thể.',
].join('\n')

function scenarioPrompt(world, contracts, s) {
  return [
    '# Thế giới',
    JSON.stringify(world),
    '# Contract đã duyệt (toàn văn, bỏ taxonomy)',
    JSON.stringify(contracts),
    '# Kịch bản cần kiểm định',
    JSON.stringify({
      sample_id: s.sample_id, family: s.family, title: s.title, story: s.story, params: s.params,
      actor_team: s.team, label_kind: s.kind, accepted_kinds: s.accepted_kinds, stages: s.stages, expected_new_invariants: s.expect, expect_any: s.expect_any,
      root_cause: s.root, changes_contract: s.contract, inject_source: s.inject_source,
    }, null, 1),
  ].join('\n')
}

async function auditScenarios() {
  const lab = await import('../marketplace-1111.mjs')
  const { world, contracts, samples } = lab.exportScenarios()
  const only = arg('--only')?.split(',')
  const pick = arg('--samples')?.split(',')
  const limit = Number(arg('--limit') ?? Infinity)
  const todo = samples.filter((s) => (!only || only.includes(s.family)) && (!pick || pick.includes(s.sample_id))).slice(0, limit)
  const dir = join(ROOT, 'scenarios', 'audit', stamp())
  mkdirSync(dir, { recursive: true })
  log(`[audit] ${todo.length} kịch bản, ${CONCURRENCY} sub-agent song song, ${SUBAGENT_RUNTIME.runtime}/${SUBAGENT_RUNTIME.model} -> ${dir}`)
  let cost = 0
  const rows = await pool(todo, CONCURRENCY, async (s, i) => {
    try {
      const r = await runSubAgent({ system: SCENARIO_SYSTEM, prompt: scenarioPrompt(world, contracts, s), schema: SCENARIO_SCHEMA })
      cost += r.cost_usd ?? 0
      const row = { sample_id: s.sample_id, family: s.family, label_kind: s.kind, model: r.model, ...r.output }
      const failed = Object.entries(row.criteria).filter(([, v]) => !v.ok).map(([k]) => k)
      log(`[${i + 1}/${todo.length}] ${s.sample_id} ${row.verdict} realism=${row.realism}${failed.length ? ` | trượt: ${failed.join(',')}` : ''}`)
      return row
    } catch (e) {
      log(`[${i + 1}/${todo.length}] ${s.sample_id} ERROR ${String(e.message).slice(0, 160)}`)
      return { sample_id: s.sample_id, family: s.family, label_kind: s.kind, verdict: 'ERROR', error: String(e.message) }
    }
  })
  writeFileSync(join(dir, 'scenario-audit.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n')
  writeFileSync(join(dir, 'AUDIT.md'), scenarioReport(rows, cost))
  // Bản mới nhất cho dataset đọc (gộp với bản cũ theo sample_id khi chỉ kiểm định một phần)
  const latest = join(ROOT, 'scenarios', 'audit', 'latest.jsonl')
  const merged = new Map(existsSync(latest) ? readFileSync(latest, 'utf8').trim().split('\n').filter(Boolean).map((l) => [JSON.parse(l).sample_id, JSON.parse(l)]) : [])
  for (const r of rows) merged.set(r.sample_id, r)
  // Bỏ mẫu đã không còn trong thư viện kịch bản
  const current = new Set(samples.map((x) => x.sample_id))
  for (const id of [...merged.keys()]) if (!current.has(id)) merged.delete(id)
  writeFileSync(latest, [...merged.values()].map((r) => JSON.stringify(r)).join('\n') + '\n')
  log(`[audit] xong: ${dir}/AUDIT.md | chi phí ~$${cost.toFixed(2)}`)
}

function scenarioReport(rows, cost) {
  const byFam = new Map()
  for (const r of rows) byFam.set(r.family, [...(byFam.get(r.family) ?? []), r])
  const n = (rs, v) => rs.filter((r) => r.verdict === v).length
  const avg = (rs) => (rs.filter((r) => r.realism).reduce((s, r) => s + r.realism, 0) / Math.max(1, rs.filter((r) => r.realism).length)).toFixed(1)
  const lines = [
    '# Kiểm định kịch bản (sub-agent độc lập, mỗi mẫu một sub-agent)', '',
    `${rows.length} mẫu: PASS ${n(rows, 'PASS')} · REVISE ${n(rows, 'REVISE')} · REJECT ${n(rows, 'REJECT')} · lỗi ${n(rows, 'ERROR')} · độ thật trung bình ${avg(rows)}/5 · ${SUBAGENT_RUNTIME.runtime}/${SUBAGENT_RUNTIME.model} · ~$${cost.toFixed(2)}`, '',
    '| Họ | Mẫu | PASS | REVISE | REJECT | Độ thật | Tiêu chí hay trượt |', '|---|---|---|---|---|---|---|',
    ...[...byFam].map(([fam, rs]) => {
      const fails = {}
      for (const r of rs) for (const [k, v] of Object.entries(r.criteria ?? {})) if (!v.ok) fails[k] = (fails[k] ?? 0) + 1
      return `| ${fam} | ${rs.length} | ${n(rs, 'PASS')} | ${n(rs, 'REVISE')} | ${n(rs, 'REJECT')} | ${avg(rs)} | ${Object.entries(fails).map(([k, c]) => `${k} (${c})`).join(', ') || '-'} |`
    }),
    '', '## Mẫu không PASS', '',
    ...rows.filter((r) => r.verdict !== 'PASS').flatMap((r) => [
      `### ${r.sample_id}: ${r.verdict}${r.realism ? ` (độ thật ${r.realism}/5)` : ''}`,
      ...(r.error ? [`- lỗi: ${r.error}`] : []),
      ...(r.steps ?? []).filter((s) => !s.within_mandate || !s.legitimate_intent || !s.plausible).map((s) => `- khâu ${s.at} (${s.team}): ${s.note}`),
      ...Object.entries(r.criteria ?? {}).filter(([, v]) => !v.ok).map(([k, v]) => `- ${k}${v.suggested_kind ? ` (đề xuất ${v.suggested_kind})` : ''}: ${v.note}`),
      ...(r.issues ?? []).map((x) => `- ${x}`),
      ...(r.suggested_revision ? [`- đề xuất sửa: ${r.suggested_revision}`] : []), '',
    ]),
  ]
  return lines.join('\n') + '\n'
}

// ------------------------------------------------------------------ kiểm định cách agent xử lý
const HANDLING_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['SOUND', 'CONCERN', 'WRONG'] },
    checks: {
      type: 'object',
      properties: {
        detected_the_incident: check, verdict_correct: check, business_vs_backend_correct: check, evidence_chain_complete: check,
        sandbox_test_adequate: check, fix_appropriate: check, does_not_undo_legitimate_decision: check, approvers_and_authority_correct: check,
      },
      required: ['detected_the_incident', 'verdict_correct', 'business_vs_backend_correct', 'evidence_chain_complete', 'sandbox_test_adequate', 'fix_appropriate', 'does_not_undo_legitimate_decision', 'approvers_and_authority_correct'],
    },
    issues: { type: 'array', items: { type: 'string' } },
    better_fix: { type: 'string' },
  },
  required: ['verdict', 'checks', 'issues', 'better_fix'],
}

const HANDLING_SYSTEM = [
  'Bạn là kiểm định viên độc lập, chấm cách agent FlashSRE xử lý một sự cố. Bạn thấy đáp án (nhãn, nguyên nhân gốc, các khâu) và toàn bộ hồ sơ của agent.',
  '',
  'FlashSRE:',
  ...FLASHSRE_SCOPE.map((x) => `- ${x}`),
  '',
  'Hành vi engine khuyến mãi (Medusa 2.21.2):',
  ...ENGINE_KB.map((x) => `- ${x}`),
  '',
  'Phán quyết của agent: BUSINESS_MISCONFIG (một team cấu hình sai), CROSS_TEAM_CONTRADICTION (thay đổi của team này làm hỏng điều khoản của team khác),',
  'CONTRACT_CONFLICT (hai contract ngược nhau, không sửa bằng config), CONTRACT_GAP (contract chưa quy định), UNATTRIBUTED_CHANGE (sửa config thì hết lỗi',
  'nhưng không có audit ai sửa: đổi ngoài luồng, chuyển platform), ENGINE_OR_BACKEND, NO_ISSUE. Quyền: AUTO_ELIGIBLE, NEEDS_APPROVAL, ESCALATE.',
  'Phép thử sandbox: resolves_target = hết lỗi đang xét; preserves = không sinh lỗi mới ở contract nào; fully_clean = sạch mọi lỗi mới.',
  '',
  'Chấm khắt khe như một SRE lead duyệt hồ sơ trước khi cho áp lên production. Đặc biệt:',
  '- Nếu một khâu trong sự cố là quyết định nghiệp vụ hợp lệ (vd hạ hạng shop theo KPI, hạ giá flash có duyệt, mở provider mới), bản sửa "rollback khâu đó"',
  '  là đảo ngược quyết định hợp lệ: chỉ chấp nhận được nếu authority là NEEDS_APPROVAL/ESCALATE và người duyệt gồm team đã ra quyết định.',
  '- AUTO_ELIGIBLE chỉ hợp lý khi lỗi là sơ suất rõ ràng của một team và bản sửa đưa đúng đối tượng đó về đúng contract.',
  '- Với mẫu NO_OP, agent không mở hồ sơ nào là đúng. Với OUT_OF_BAND, agent không được đổ cho team nghiệp vụ.',
  '- Nhãn -> phán quyết đúng: CONFIG_DRIFT/MISSING_CONFIG -> BUSINESS_MISCONFIG; CROSS_TEAM_CONFLICT -> CROSS_TEAM_CONTRADICTION; CONTRACT_CONFLICT -> CONTRACT_CONFLICT;',
  '  OUT_OF_BAND -> UNATTRIBUTED_CHANGE (hoặc ENGINE_OR_BACKEND). Phán quyết khớp bất kỳ nhãn nào trong accepted_kinds đều đúng.',
  'SOUND = có thể cho áp sau khi người duyệt ký; CONCERN = đúng hướng nhưng có điểm cần sửa; WRONG = sai phán quyết hoặc bản sửa gây hại. Viết tiếng Việt, ngắn, cụ thể.',
].join('\n')

const trimDossier = (d) => ({
  contract_id: d.contract_id, title: d.title, verdict: d.verdict, confidence: d.confidence, status: d.status,
  finding: { invariant: d.dossier.finding.invariant, kind: d.dossier.finding.kind, title: d.dossier.finding.title, expected: d.dossier.finding.expected, actual: d.dossier.finding.actual, entities: d.dossier.finding.entities, affected: d.dossier.finding.affected },
  evidence: {
    contract_changes: d.dossier.evidence.contract_changes,
    changes: d.dossier.evidence.changes.map((c) => ({ team: c.team, actor: c.actor_email, method: c.method, entity: c.entity, diff: (c.diff ?? []).slice(0, 6) })),
  },
  debate: { analyst: d.dossier.debate.analyst, engineer: d.dossier.debate.engineer, judge: d.dossier.debate.judge },
  sandbox_tests: d.dossier.tests.map((t) => ({ candidate: t.summary, kind: t.kind, resolves_target: t.resolves_target, preserves: t.preserves, fully_clean: t.fully_clean, new_findings: (t.new_keys ?? []).length })),
  chosen_fix: d.dossier.chosen_fix ? { summary: d.dossier.chosen_fix.summary, caused_by: d.dossier.chosen_fix.caused_by, patches: JSON.stringify(d.dossier.chosen_fix.patches).slice(0, 1500) } : null,
  authority: d.dossier.authority, approvers: d.dossier.approvers, consequences: d.dossier.consequences,
  // Các phát hiện cùng gốc được gộp vào hồ sơ này (hết theo bản sửa đã chọn)
  covered_findings: d.dossier.covered_detail ?? d.dossier.covered_findings,
})

async function auditHandling() {
  const dir = process.argv[3]
  if (!dir || !existsSync(join(dir, 'eval.jsonl'))) throw new Error('Cần thư mục eval có eval.jsonl và dossiers.json')
  const lab = await import('../marketplace-1111.mjs')
  const { samples } = lab.exportScenarios()
  const byId = new Map(samples.map((s) => [s.sample_id, s]))
  const rows = readFileSync(join(dir, 'eval.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => byId.has(r.sample_id))
    // Mẫu lỗi khi chạy không có gì để kiểm định cách xử lý
    .filter((r) => !r.error)
  const dossiers = JSON.parse(readFileSync(join(dir, 'dossiers.json'), 'utf8'))
  log(`[audit] ${rows.length} hồ sơ xử lý, ${CONCURRENCY} sub-agent song song, ${SUBAGENT_RUNTIME.runtime}/${SUBAGENT_RUNTIME.model}`)
  let cost = 0
  const out = await pool(rows, CONCURRENCY, async (r, i) => {
    const s = byId.get(r.sample_id)
    const ds = dossiers.filter((d) => d.sample_id === r.sample_id).map(trimDossier)
    const prompt = [
      '# Đáp án của mẫu',
      JSON.stringify({ sample_id: s.sample_id, title: s.title, story: s.story, stages: s.stages, label_kind: s.kind, accepted_kinds: s.accepted_kinds ?? [s.kind], actor_team: s.team, root_cause: s.root, expected_new_invariants: s.expect }, null, 1),
      `# Agent mở ${ds.length} hồ sơ`,
      JSON.stringify(ds, null, 1),
    ].join('\n')
    try {
      const a = await runSubAgent({ system: HANDLING_SYSTEM, prompt, schema: HANDLING_SCHEMA })
      cost += a.cost_usd ?? 0
      const failed = Object.entries(a.output.checks).filter(([, v]) => !v.ok).map(([k]) => k)
      log(`[${i + 1}/${rows.length}] ${r.sample_id} ${a.output.verdict}${failed.length ? ` | trượt: ${failed.join(',')}` : ''}`)
      return { sample_id: r.sample_id, family: r.family, truth: r.truth, agent_verdicts: r.verdicts, model: a.model, ...a.output }
    } catch (e) {
      log(`[${i + 1}/${rows.length}] ${r.sample_id} ERROR ${String(e.message).slice(0, 160)}`)
      return { sample_id: r.sample_id, family: r.family, truth: r.truth, agent_verdicts: r.verdicts, verdict: 'ERROR', error: String(e.message) }
    }
  })
  writeFileSync(join(dir, 'handling-audit.jsonl'), out.map((x) => JSON.stringify(x)).join('\n') + '\n')
  writeFileSync(join(dir, 'HANDLING_AUDIT.md'), handlingReport(out, cost))
  log(`[audit] xong: ${join(dir, 'HANDLING_AUDIT.md')} | chi phí ~$${cost.toFixed(2)}`)
}

function handlingReport(rows, cost) {
  const byFam = new Map()
  for (const r of rows) byFam.set(r.family, [...(byFam.get(r.family) ?? []), r])
  const n = (rs, v) => rs.filter((r) => r.verdict === v).length
  return [
    '# Kiểm định cách agent xử lý (sub-agent độc lập, mỗi mẫu một sub-agent)', '',
    `${rows.length} mẫu: SOUND ${n(rows, 'SOUND')} · CONCERN ${n(rows, 'CONCERN')} · WRONG ${n(rows, 'WRONG')} · lỗi ${n(rows, 'ERROR')} · ${SUBAGENT_RUNTIME.runtime}/${SUBAGENT_RUNTIME.model} · ~$${cost.toFixed(2)}`, '',
    '| Họ | Mẫu | SOUND | CONCERN | WRONG | Điểm hay trượt |', '|---|---|---|---|---|---|',
    ...[...byFam].map(([fam, rs]) => {
      const fails = {}
      for (const r of rs) for (const [k, v] of Object.entries(r.checks ?? {})) if (!v.ok) fails[k] = (fails[k] ?? 0) + 1
      return `| ${fam} | ${rs.length} | ${n(rs, 'SOUND')} | ${n(rs, 'CONCERN')} | ${n(rs, 'WRONG')} | ${Object.entries(fails).map(([k, c]) => `${k} (${c})`).join(', ') || '-'} |`
    }),
    '', '## Mẫu không SOUND', '',
    ...rows.filter((r) => r.verdict !== 'SOUND').flatMap((r) => [
      `### ${r.sample_id}: ${r.verdict} (agent: ${(r.agent_verdicts ?? []).join(', ') || 'không mở hồ sơ'})`,
      ...(r.error ? [`- lỗi: ${r.error}`] : []),
      ...Object.entries(r.checks ?? {}).filter(([, v]) => !v.ok).map(([k, v]) => `- ${k}: ${v.note}`),
      ...(r.issues ?? []).map((x) => `- ${x}`),
      ...(r.better_fix ? [`- bản sửa tốt hơn: ${r.better_fix}`] : []), '',
    ]),
  ].join('\n') + '\n'
}

const cmd = process.argv[2]
const main = cmd === 'scenarios' ? auditScenarios : cmd === 'handling' ? auditHandling
  : async () => log('Lệnh: scenarios [--only ...] [--samples ...] [--limit N] [--concurrency N] | handling <thư mục eval>')
main().catch((e) => { console.error(e); process.exit(1) })
