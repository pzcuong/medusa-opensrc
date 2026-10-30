#!/usr/bin/env node
/**
 * Replay các giỏ hàng đại diện của phát hiện baseline trên Medusa thật (Store API), so từng mã giảm giá với
 * kết quả mô phỏng của oracle (computeActions). Mục đích: chứng minh mô phỏng khớp hành vi checkout thật.
 *
 * Usage: node incidents/replay-baseline.mjs     (cần setup marketplace + contract trước)
 * Env: BASE, EMAIL, PASSWORD
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE || 'https://flashsre-commerce-30123348ca77.herokuapp.com'
const PASSWORD = process.env.PASSWORD
if (!PASSWORD) {
  console.error('Thiếu biến môi trường PASSWORD (mật khẩu admin)')
  process.exit(1)
}
const HOST = new URL(BASE).host.replace(/[^a-z0-9.-]/gi, '_')
const STATE = JSON.parse(readFileSync(join(HERE, 'out', `marketplace-state-${HOST}.json`), 'utf8'))
const CONTRACT = 'CT-1111-MARKETPLACE'
const OTHER_CONTRACTS = ['CT-BRANDDAY-AIRCHEF', 'CT-GIADUNG-WEEK']
const CODES = ['FS-MK-SAN10', 'FS-MK-NEWBIE50K', 'FS-MK-AIRCHEF100K', 'FS-MK-GLOW30K', 'FS-MK-BABY40K']
const CARTS = [
  { skus: ['FS-MK-WATCHX-S3'], segment: 'REGULAR', why: 'thiếu trần 150.000đ' },
  { skus: ['FS-MK-WATCHX-S3'], segment: 'NEW', why: 'thiếu trần + thứ tự áp' },
  { skus: ['FS-MK-TZ-BUDS'], segment: 'NEW', why: 'thứ tự áp (giảm cố định trước %)' },
  { skus: ['FS-MK-AIRCHEF6-DEN'], segment: 'REGULAR', why: 'Brand Day tính trên giá flash 11.11, không phải giá niêm yết' },
  { skus: ['FS-MK-HOMELUX-V8'], segment: 'REGULAR', why: 'SAN10 vượt trần 150.000đ khi cộng với Tuần lễ Gia dụng' },
  { skus: ['FS-MK-HOMELUX-V8', 'FS-MK-AIRCHEF-MINI'], segment: 'REGULAR', why: 'vượt trần 300.000đ/đơn, cộng dồn 3 campaign' },
  { skus: ['FS-MK-HOMELUX-V8', 'FS-MK-AIRCHEF-MINI'], segment: 'NEW', why: 'vượt trần 300.000đ/đơn, cộng dồn 3 campaign' },
]

async function call(path, { method = 'GET', body, bearer, pk } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (bearer) headers.Authorization = `Bearer ${bearer}`
  if (pk) headers['x-publishable-api-key'] = pk
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  let json = null
  try { json = await r.json() } catch {}
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(json).slice(0, 200)}`)
  return json
}

// Khách thật thuộc nhóm "Khách mới": đăng ký qua Store API, admin gán nhóm
async function newSegmentCustomer(admin) {
  const email = 'replay.new@flashsre.dev'
  const pw = 'replay-new-customer'
  let tok
  try {
    tok = (await call('/auth/customer/emailpass', { method: 'POST', body: { email, password: pw } })).token
  } catch {
    const reg = (await call('/auth/customer/emailpass/register', { method: 'POST', body: { email, password: pw } })).token
    await call('/store/customers', { method: 'POST', bearer: reg, pk: STATE.pk, body: { email, first_name: 'Replay', last_name: 'New' } })
    tok = (await call('/auth/customer/emailpass', { method: 'POST', body: { email, password: pw } })).token
  }
  const me = (await call('/store/customers/me', { bearer: tok, pk: STATE.pk })).customer
  await call(`/admin/customer-groups/${STATE.new_group}/customers`, { method: 'POST', bearer: admin, body: { add: [me.id] } }).catch(() => null)
  return tok
}

async function main() {
  const admin = (await call('/auth/user/emailpass', { method: 'POST', body: { email: process.env.EMAIL || 'admin@flashsre.dev', password: PASSWORD } })).token
  const check = (await call(`/admin/flashsre/contracts/${CONTRACT}/check`, { method: 'POST', bearer: admin })).check
  // Cùng một giỏ phải ra cùng số tiền dù contract nào mô phỏng (giá live và ưu đãi không phụ thuộc contract)
  const others = {}
  for (const id of OTHER_CONTRACTS) others[id] = (await call(`/admin/flashsre/contracts/${id}/check`, { method: 'POST', bearer: admin })).check
  const newTok = await newSegmentCustomer(admin)
  const rows = []
  for (const c of CARTS) {
    const bearer = c.segment === 'NEW' ? newTok : undefined
    const cart = (await call('/store/carts', {
      method: 'POST', pk: STATE.pk, bearer,
      body: {
        region_id: STATE.region, sales_channel_id: STATE.sales_channel, email: c.segment === 'NEW' ? 'replay.new@flashsre.dev' : 'replay.guest@flashsre.dev',
        items: c.skus.map((s) => ({ variant_id: STATE.variants[s], quantity: 1 })),
        shipping_address: { first_name: 'Lan', last_name: 'Nguyen', address_1: '1 Lê Lợi', city: 'Hà Nội', country_code: 'vn', postal_code: '100000' },
      },
    })).cart
    await call(`/store/carts/${cart.id}/shipping-methods`, { method: 'POST', pk: STATE.pk, bearer, body: { option_id: STATE.options['fs-ghn'] } })
    const f = '?fields=id,total,item_subtotal,customer_id,items.variant_sku,items.adjustments.code,items.adjustments.amount,shipping_methods.adjustments.amount'
    const res = (await call(`/store/carts/${cart.id}/promotions${f}`, { method: 'POST', pk: STATE.pk, bearer, body: { promo_codes: CODES } })).cart
    const real = {}
    for (const it of res.items) for (const a of it.adjustments ?? []) real[a.code] = (real[a.code] ?? 0) + Number(a.amount)
    const sim = check.simulation.find((r) => r.sku === c.skus.join('+') && r.segment === c.segment && r.provider === 'fs-ghn')
    const codes = [...new Set([...Object.keys(real), ...Object.keys(sim?.item_discounts ?? {})])].sort()
    const perCode = codes.map((code) => ({ code, real: Math.round(real[code] ?? 0), simulated: Math.round(sim?.item_discounts?.[code] ?? 0), expected_by_contract: sim?.expected_discounts?.[code] ?? null }))
    const match = perCode.every((p) => Math.abs(p.real - p.simulated) <= 1)
    const otherPays = Object.fromEntries(Object.entries(others).map(([id, ch]) => {
      const r = ch.simulation.find((x) => x.sku === c.skus.join('+') && x.segment === c.segment && x.provider === 'fs-ghn')
      return [id, r ? Math.round(r.customer_pays) : null]
    }))
    const crossMatch = Object.values(otherPays).every((v) => v === null || Math.abs(v - Number(res.total)) <= 1)
    rows.push({ ...c, cart_id: res.id, customer: res.customer_id ?? null, real_total: Number(res.total), simulated_pays: Math.round(sim?.customer_pays ?? NaN), expected_pays: Math.round(sim?.expected_pays ?? NaN), match, per_code: perCode, other_contracts_pays: otherPays, cross_contract_match: crossMatch })
    console.error(`${match && crossMatch ? 'KHỚP' : 'LỆCH'} ${c.skus.join('+')} ${c.segment} [contract khác: ${Object.entries(otherPays).map(([k, v]) => `${k.slice(3, 11)} ${v ?? '-'}`).join(', ')}]: thật ${Math.round(Number(res.total)).toLocaleString('vi-VN')}đ, mô phỏng ${Math.round(sim?.customer_pays ?? NaN).toLocaleString('vi-VN')}đ | ${perCode.map((p) => `${p.code} ${p.real}/${p.simulated}`).join(', ')}`)
  }
  const dir = join(HERE, 'replay')
  mkdirSync(dir, { recursive: true })
  const md = [
    `# Replay phát hiện baseline trên Medusa thật (${HOST})`, '',
    `Contract ${CONTRACT} v${check.contract_version}. Giỏ thật qua Store API, nhập ${CODES.join(', ')}; ưu đãi tự động (Brand Day, Gia dụng Week, freeship) tự áp. Giao GHN.`, '',
    '| Giỏ | Phân khúc | Vì sao chọn | Khách trả (thật) | Khách trả (mô phỏng) | Mô phỏng của Brand Day / Gia dụng Week | Theo contract | Từng mã: thật / mô phỏng / contract | Khớp |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.skus.join(' + ')} | ${r.segment} | ${r.why} | ${r.real_total.toLocaleString('vi-VN')} | ${r.simulated_pays.toLocaleString('vi-VN')} | ${Object.values(r.other_contracts_pays).map((v) => (v === null ? '-' : v.toLocaleString('vi-VN'))).join(' / ')} | ${r.expected_pays.toLocaleString('vi-VN')} | ${r.per_code.map((p) => `${p.code}: ${p.real} / ${p.simulated} / ${p.expected_by_contract ?? '-'}`).join('<br>')} | ${r.match && r.cross_contract_match ? 'có' : 'KHÔNG'} |`),
  ].join('\n')
  writeFileSync(join(dir, `replay-${HOST}.md`), md + '\n')
  writeFileSync(join(dir, `replay-${HOST}.json`), JSON.stringify(rows, null, 2))
  console.error(`[replay] ${rows.filter((r) => r.match && r.cross_contract_match).length}/${rows.length} giỏ khớp (cả mô phỏng của 3 contract); ${join(dir, `replay-${HOST}.md`)}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
