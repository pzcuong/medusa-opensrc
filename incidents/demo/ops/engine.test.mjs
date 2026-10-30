// node --test incidents/demo/ops/engine.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BUDGET, MARGIN, N, STEPS, clock, detect, hourCoverage, investigate, marginTarget, options, simulateBudget, simulateMargin, verify } from './engine.mjs'

const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0)

test('đối chứng: chiến dịch chạy đúng dự báo thì agent không báo động', () => {
  const a = simulateBudget(BUDGET, { event: false })
  assert.equal(detect(BUDGET, a.rows, N - 1), null)
  assert.ok(Math.abs(sum(a.rows, (r) => r.uses) - 15000) < 50)
  const b = simulateMargin(MARGIN, { event: false })
  assert.equal(detect(MARGIN, b.rows, N - 1), null)
  assert.ok(b.rows[N - 1].cum >= marginTarget(MARGIN))
})

test('freeship: KOL làm ngân sách cạn sớm, agent phát hiện trước khi cạn', () => {
  const sim = simulateBudget(BUDGET)
  const wanted = sum(sim.rows, (r) => r.want)
  assert.ok(wanted > 45000 && wanted < 55000, `nhu cầu ${wanted}`)
  assert.ok(sim.exhausted > 25 && sim.exhausted < 45, `cạn lúc ${clock(sim.exhausted)}`)
  assert.ok(sim.rows.every((r) => r.left >= 0), 'không bao giờ chi vượt ngân sách')
  const det = detect(BUDGET, sim.rows, N - 1)
  assert.ok(det.t < sim.exhausted - 15, 'phát hiện sớm hơn lúc cạn ít nhất 15 phút')
})

test('freeship: phương án đề xuất đạt SLO trên diễn biến thật, giữ nguyên thì không', () => {
  const sim = simulateBudget(BUDGET)
  const det = detect(BUDGET, sim.rows, N - 1)
  const t = det.t + STEPS(BUDGET) + 1
  const inv = investigate(BUDGET, { ...sim, onset: det.onset }, t)
  assert.ok(inv.steps.some((s) => s.rules_out === 'Lỗi cấu hình'))
  const opts = options(BUDGET, sim, t, inv, { decisions: [] })
  const rec = opts.find((o) => o.recommended)
  assert.ok(rec.meets && rec.id !== 'keep')
  assert.ok(!opts.find((o) => o.id === 'keep').meets)
  const real = simulateBudget(BUDGET, { decisions: rec.decisions })
  assert.equal(hourCoverage(real.rows, t + 1), 1)
  assert.equal(verify(BUDGET, real, N - 1, t).ok, true)
})

test('VIP + freeship: khoản hụt nằm ở khách VIP mua hàng cồng kềnh, đề xuất đưa lợi nhuận về mục tiêu', () => {
  const sim = simulateMargin(MARGIN)
  assert.ok(sim.rows[N - 1].cum < marginTarget(MARGIN))
  const det = detect(MARGIN, sim.rows, N - 1)
  const t = det.t + STEPS(MARGIN) + 1
  const inv = investigate(MARGIN, sim, t)
  assert.equal(inv.top.seg, 'VIP')
  assert.equal(inv.top.size, 'bulky')
  assert.ok(inv.top.gap / inv.total_gap > 0.5)
  const opts = options(MARGIN, sim, t, inv, { decisions: [], event: true })
  const rec = opts.find((o) => o.recommended)
  assert.ok(rec.meets && rec.id !== 'off', `đề xuất ${rec.id}`)
  const real = simulateMargin(MARGIN, { decisions: rec.decisions })
  assert.ok(real.rows[N - 1].cum >= marginTarget(MARGIN))
  assert.equal(verify(MARGIN, real, N - 1, t).ok, true)
})
