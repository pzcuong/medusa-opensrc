// node --test incidents/demo/
import assert from 'node:assert/strict'
import test from 'node:test'
import { analyze, applyPatch, at, evaluate, setPairMode, tryFix } from './engine.mjs'
import { DAY, SCENARIOS, scenarioById } from './scenarios.mjs'

const load = (id) => scenarioById(id).build()
const T = (hm) => at(DAY, hm)
const offerOf = (r, id) => r.offers.find((o) => o.id === id)
const deepFreeze = (o) => { Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o) }

test('A Glow: 290.000đ ngoài flash, 324.000đ trong flash, mất voucher và freeship vì thiếu 11.000đ', () => {
  const { config, ctx } = load('A')
  const off = evaluate(config, ctx)
  assert.equal(off.totals.total, 290000)
  const on = evaluate(config, { ...ctx, now: T('20:30') })
  assert.equal(on.totals.total, 324000)
  assert.equal(on.lines[0].unit_price, 289000)
  for (const id of ['GLOW30K', 'FREESHIP']) {
    const o = offerOf(on, id)
    assert.equal(o.status, 'selected_not_applied')
    assert.deepEqual(o.reason_codes, ['MIN_SPEND'])
    assert.equal(o.missing_amount, 11000)
    assert.match(o.reason_text, /Cần thêm 11\.000đ để đạt mức tối thiểu 300\.000đ/)
  }
  const a = analyze({ cfg: config, ctx }, { cfg: config, ctx: { ...ctx, now: T('20:30') } })
  assert.equal(a.delta, 34000)
  assert.equal(Math.round((a.delta / off.totals.total) * 10000) / 100, 11.72)
  assert.equal(a.verdict.code, 'BUSINESS_IMPACT')
  assert.deepEqual(a.factors, ['time'])
  assert.deepEqual(new Set(a.teams), new Set(['merchandising', 'seller_ops', 'logistics']))
})

test('B AirChef cô lập: 1.450.000đ → 1.490.000đ, thiếu 10.000đ', () => {
  const { config, ctx } = load('B')
  assert.equal(evaluate(config, ctx).totals.total, 1450000)
  const on = evaluate(config, { ...ctx, now: T('20:30') })
  assert.equal(on.totals.total, 1490000)
  assert.match(offerOf(on, 'AIRCHEF100K').reason_text, /Cần thêm 10\.000đ/)
})

test('B bật thêm voucher sàn và Brand Day: tính lại từ cấu hình', () => {
  const { config, ctx } = load('B')
  const cfg = applyPatch(applyPatch(config, { target: 'offer', id: 'SAN10', path: 'enabled', value: true }), { target: 'offer', id: 'BD20', path: 'enabled', value: true })
  const c = { ...ctx, selected: ['AIRCHEF100K', 'SAN10'] }
  // ngoài flash: BD 310.000 → còn 1.240.000; AIRCHEF100K (ngưỡng trên 1.550.000) → 1.140.000; SAN10 10% = 114.000 → 1.026.000
  assert.equal(evaluate(cfg, c).totals.total, 1026000)
  // trong flash: BD 298.000 → 1.192.000; mất AIRCHEF100K; SAN10 119.200 → 1.072.800
  assert.equal(evaluate(cfg, { ...c, now: T('20:30') }).totals.total, 1072800)
})

test('C xung đột đối xứng và cho phép cộng dồn', () => {
  const { config, ctx } = load('C')
  const a = evaluate(config, { ...ctx, selected: ['SAN10'] })
  assert.deepEqual(offerOf(a, 'BD20').conflicting_offer_ids, ['SAN10'])
  assert.match(offerOf(a, 'BD20').reason_text, /Không thể dùng cùng SAN10/)
  const b = evaluate(config, { ...ctx, selected: ['BD20'] })
  assert.deepEqual(offerOf(b, 'SAN10').conflicting_offer_ids, ['BD20'])
  assert.equal(evaluate(config, { ...ctx, selected: [] }).offers.filter((o) => o.status === 'available').length, 2)
  const allow = applyPatch(config, setPairMode(config, 'SAN10', 'BD20', 'allow'))
  const both = evaluate(allow, { ...ctx, selected: ['SAN10', 'BD20'] })
  assert.deepEqual(both.applied_ids, ['BD20', 'SAN10']) // thứ tự tính theo order, không theo thứ tự chọn
  assert.equal(both.totals.total, 890000 - 178000 - 71200 + 35000)
})

test('D thứ tự tính: 405.000đ rồi 400.000đ', () => {
  const { config, ctx } = load('D')
  assert.equal(evaluate(config, ctx).totals.total, 405000)
  const swapped = applyPatch(config, { target: 'offer', id: 'SAN10', path: 'order', value: 5 })
  assert.equal(evaluate(swapped, ctx).totals.total, 400000)
})

test('E giỏ hỗn hợp: chỉ dòng mỹ phẩm được giảm; rule lỗi chặn cả giỏ', () => {
  const { config, ctx } = load('E')
  const r = evaluate(config, ctx)
  const disc = Object.fromEntries(r.lines.map((l) => [l.sku, l.discounts.reduce((s, d) => s + d.amount, 0)]))
  assert.equal(disc['TZ-BUDS'], 0)
  assert.ok(disc['GLOW-SERUM'] > 0 && disc['SONXINH-VELVET'] > 0)
  assert.equal(disc['GLOW-SERUM'] + disc['SONXINH-VELVET'], 71850) // 15% × 479.000, làm tròn xuống
  const bad = evaluate(applyPatch(config, { target: 'offer', id: 'VIP15', path: 'scope_mode', value: 'cart' }), ctx)
  assert.deepEqual(offerOf(bad, 'VIP15').reason_codes, ['SCOPE_CART'])
})

test('F đổi sang Viettel Post mất freeship, thêm provider thì có lại', () => {
  const { config, ctx } = load('F')
  const vtp = evaluate(config, { ...ctx, provider: 'vtp' })
  assert.deepEqual(offerOf(vtp, 'FREESHIP').reason_codes, ['PROVIDER'])
  assert.match(offerOf(vtp, 'FREESHIP').reason_text, /Không hỗ trợ Viettel Post\. Có thể dùng với GHN, GHTK\./)
  const fixed = applyPatch(config, { target: 'offer', id: 'FREESHIP', path: 'providers', value: ['ghn', 'ghtk', 'vtp'] })
  assert.equal(evaluate(fixed, { ...ctx, provider: 'vtp' }).totals.total, 420000)
})

test('G chồng thời gian và biên bắt đầu/kết thúc', () => {
  const { config, ctx } = load('G')
  const run = (hm) => evaluate(config, { ...ctx, now: T(hm) })
  assert.equal(run('19:59').lines[0].source.id, 'SHOP-AIRCHEF')
  assert.equal(run('20:00').lines[0].source.id, 'FLASH-2022') // start được tính
  assert.equal(run('22:00').lines[0].source.id, 'SHOP-AIRCHEF') // end không còn hiệu lực
  assert.equal(evaluate(config, { ...ctx, now: T('21:59:59') }).lines[0].source.id, 'FLASH-2022')
  assert.deepEqual(['19:59', '20:00', '21:00', '22:00', '23:00'].map((h) => run(h).totals.total), [
    1550000 - 100000 + 35000,
    1490000 + 35000,
    1490000 - 298000 + 35000,
    1550000 - 310000 - 100000 + 35000,
    1550000 - 100000 + 35000,
  ])
})

test('H nhóm khách', () => {
  const { config, ctx } = load('H')
  const total = (segment, cfg = config) => evaluate(cfg, { ...ctx, segment }).totals.total
  assert.deepEqual(['REGULAR', 'NEW', 'VIP'].map((s) => total(s)), [450000, 400000, 450000])
  const leak = applyPatch(config, { target: 'offer', id: 'NEWBIE50K', path: 'segments', value: null })
  assert.equal(total('REGULAR', leak), 400000)
  const a = analyze({ cfg: config, ctx }, { cfg: leak, ctx })
  assert.equal(a.verdict.code, 'CONTRACT_VIOLATION')
})

test('I tạm dừng và ngân sách không đủ', () => {
  const { config, ctx } = load('I')
  assert.equal(offerOf(evaluate(config, ctx), 'SAN10').calculated_discount, 89000)
  const paused = evaluate(applyPatch(config, { target: 'offer', id: 'SAN10', path: 'enabled', value: false }), ctx)
  assert.deepEqual(offerOf(paused, 'SAN10').reason_codes, ['PAUSED'])
  assert.match(offerOf(paused, 'SAN10').reason_text, /Marketing tạm dừng/)
  const low = evaluate(applyPatch(config, { target: 'offer', id: 'SAN10', path: 'budget', value: 50000 }), ctx)
  assert.deepEqual(offerOf(low, 'SAN10').reason_codes, ['BUDGET'])
  assert.equal(low.totals.goods_discount, 0) // không giảm một phần
})

test('J đối chứng: flash giảm thật, không cảnh báo', () => {
  const { config, ctx } = load('J')
  const a = analyze({ cfg: config, ctx }, { cfg: config, ctx: { ...ctx, now: T('20:30') } })
  assert.equal(a.before.totals.total, 350000)
  assert.equal(a.after.totals.total, 319000)
  assert.equal(a.verdict.code, 'NO_ISSUE')
  assert.equal(a.options.length, 0)
})

test('Phương án sửa chạy trên bản sao và kiểm cả giỏ đối chứng', () => {
  const s = scenarioById('A')
  const { config, ctx } = s.build()
  const before = { cfg: config, ctx }
  const after = { cfg: config, ctx: { ...ctx, now: T('20:30') } }
  const a = analyze(before, after)
  const basis = a.options.find((o) => o.id === 'basis:GLOW30K')
  assert.ok(basis)
  const r = tryFix(basis, before, after, s.controls)
  assert.equal(r.rows[0].before, 324000)
  assert.equal(r.rows[0].after, 294000) // giữ voucher Glow, freeship vẫn mất
  assert.equal(evaluate(config, after.ctx).totals.total, 324000) // cấu hình gốc không đổi
})

test('evaluate không sửa cấu hình, mỗi lần build là dữ liệu mới', () => {
  for (const s of SCENARIOS) {
    const a = s.build()
    const b = s.build()
    assert.notEqual(a.config, b.config)
    deepFreeze(a.config)
    assert.doesNotThrow(() => evaluate(a.config, a.ctx), s.id)
  }
})
