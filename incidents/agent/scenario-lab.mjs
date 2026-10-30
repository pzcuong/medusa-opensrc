#!/usr/bin/env node
/**
 * Phòng thí nghiệm kịch bản liên team: một sub-agent đề xuất, một sub-agent kiểm định độc lập, rồi đo bằng giỏ thật.
 *
 *   node incidents/agent/scenario-lab.mjs propose [--n 6] [--rounds 2] [--focus "..."]
 *       Mỗi hướng ghép team (DIRECTIONS, hoặc --focus) một sub-agent đề xuất sinh MỘT kịch bản (mỗi team đúng khi xét riêng, ghép lại khách trả sai tiền) kèm đặc tả đo.
 *       Sub-agent kiểm định chấm từng kịch bản theo các phản biện đã gặp (bình thường? giới hạn Medusa? một cảnh báo
 *       là đủ? có giống Shopee? agent biết nhầm thế nào? số có đúng?). REVISE thì người đề xuất sửa, chấm lại.
 *       Ghi incidents/scenarios/proposals/<ts>/ (proposals.jsonl, REVIEW.md).
 *   node incidents/agent/scenario-lab.mjs probe <dir> [--ids P1,P2]
 *       Đo các kịch bản ACCEPT trên Medusa thật (BASE): mỗi trạng thái dựng từ setup sạch, chỉ tạo price list tạm
 *       (FSX-PROBE) hoặc chạy một inject có sẵn của lab; đo giỏ qua Store API; so với số kịch bản khẳng định; khôi phục.
 *
 * Env: BASE, PASSWORD (probe); FLASHSRE_SUBAGENT / FLASHSRE_SUBAGENT_MODEL như sub-agent.mjs.
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENGINE_KB, FLASHSRE_SCOPE } from './knowledge.mjs'
import { pool, runSubAgent, SUBAGENT_RUNTIME } from './sub-agent.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', 'scenarios', 'proposals')
const log = (...a) => console.error(...a)
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : dflt
}

// ------------------------------------------------------------------ thế giới lab, gọn cho prompt
async function worldBrief() {
  const lab = await import('../marketplace-1111.mjs')
  const { world, contracts, samples } = lab.exportScenarios()
  const promos = Object.values(contracts).flatMap((c) => c.promotions.map((p) => ({ contract: c.contract_id, ...p })))
  return {
    lab,
    brief: {
      conventions: world.conventions,
      teams: world.teams,
      shops: world.shops,
      categories: world.categories,
      products: world.products,
      flash: Object.values(contracts).flatMap((c) => c.flash.map((f) => ({ contract: c.contract_id, ...f }))),
      promotions: promos,
      freeship: world.freeship,
      shipping_fees: world.base_providers,
      stacking: Object.fromEntries(Object.values(contracts).map((c) => [c.contract_id, c.stacking])),
      budgets: world.budgets,
      existing_families: [...new Map(samples.map((s) => [s.family, s.title])).entries()].map(([family, title]) => ({ family, example: title })),
      lab_injects: samples.map((s) => ({ sample_id: s.sample_id, team: s.team, title: s.title })),
    },
  }
}

// ------------------------------------------------------------------ tiêu chí (rút từ các phản biện đã gặp)
const CRITERIA = [
  'multi_team: ít nhất hai team, mỗi khâu do một team làm trong thẩm quyền, vì một lý do hợp lý, và ĐÚNG khi xét riêng (khớp điều khoản đã duyệt của team đó).',
  'not_normal: kết quả ghép lại là thứ không team nào muốn. Loại: "đổi thuộc tính X nên voucher theo X đổi theo" (vd hạ hạng shop thì mất voucher Mall, đổi ngành thì voucher ngành đổi) là chuyện bình thường, không phải lỗi.',
  'not_platform_gap: Medusa hỗ trợ đủ để cấu hình đúng; lỗi không dựa vào tính năng Medusa thiếu (không có trần giảm giá, không có cờ chặn cộng dồn, rule ngành không kế thừa ngành cha, ngân sách chỉ theo campaign, không giới hạn lượt theo khách). Nền tảng kiểu Shopee cũng không thể tự chặn vì nó không biết ý định (vd ngưỡng voucher được đặt để mua 1 món là đủ).',
  'not_single_warning: không bắt được bằng một kiểm tra tĩnh trên một đối tượng; mỗi đối tượng soi riêng đều đúng, chỉ khi tính cả giỏ (nhiều đối tượng của nhiều team) mới lộ.',
  'realistic_shopee: hay xảy ra trên một sàn kiểu Shopee (flash sale, voucher shop, voucher sàn, freeship, khuyến mãi của shop, khách mới); không dựa vào chính sách Shopee không có (vd giá thành viên shop theo nhóm khách).',
  'agent_can_tell_mistake: có tín hiệu cho thấy đây là nhầm chứ không phải ý định (tự mâu thuẫn: ưu đãi làm khách trả nhiều hơn; ưu đãi "riêng" đắt hơn khách thường; trái mục đích của chính chương trình), không cần đoán ý người sửa.',
  'numbers_correct: số tiền tính đúng theo dữ liệu lab và quy tắc engine (bên dưới); tự tính lại từng bước.',
  'novel: không trùng CƠ CHẾ của họ lỗi đã có, ví dụ đã chấp nhận/bị loại, hoặc kịch bản đã thử ở vòng trước. Đổi vỏ (đổi team, SKU, loại voucher, tên chương trình) mà cùng cơ chế vẫn là trùng. Cơ chế "giá giảm sâu hơn làm giỏ rớt dưới ngưỡng voucher/freeship nên khách trả nhiều hơn" đã có đủ.',
  'probe_matches_story: đặc tả đo dựng đúng các trạng thái của câu chuyện, chỉ dùng price list tạm và inject có sẵn, giỏ đo đúng giỏ minh họa.',
  'serious_hard_to_see: thiệt hại đáng kể (theo đơn hoặc theo quy mô) và khó thấy khi soi từng màn hình.',
]

const EXAMPLES = {
  accepted: [
    'Flash Sale đắt hơn hôm qua: Seller Ops chạy khuyến mãi shop AirChef 6L 1.550.000đ + voucher shop 100k cho đơn từ 1.500.000đ; Merchandising chốt flash 1.490.000đ (sửa contract). Trong giờ flash khách mất voucher, trả 1.192.000đ thay vì 1.160.000đ (đã đo giỏ thật). Bắt bằng invariant chung: cùng giỏ, trong giờ flash không được đắt hơn ngoài giờ.',
    'Flash làm mất freeship: serum Glow khuyến mãi shop 320.000đ, voucher Glow 30k từ 300.000đ, freeship từ 300.000đ; flash 289.000đ. Ngoài giờ flash khách trả 290.000đ, trong giờ flash 324.000đ (đã đo giỏ thật).',
  ],
  rejected: [
    'Hạ hạng shop Mall -> Thường làm mất voucher sàn chỉ cho Mall: "chuyện bình thường", shop mất hạng thì mất quyền lợi.',
    'Sản phẩm bỏ ngành cha nên voucher theo ngành cha không áp: "đó là feature của Medusa (không kế thừa), lỗi đâu?".',
    'Voucher -8% của category mở cho shop Mall rồi cộng dồn với Brand Day: "như lỗi BE, hệ thống vốn không hỗ trợ chặn cộng dồn".',
    'Voucher khách mới mất điều kiện nhóm khách: "một cảnh báo trên voucher là xử lý xong", agent không cần thiết.',
    'Giá thành viên shop (bảng giá theo nhóm khách) va flash: "Shopee không có chính sách này"; nền tảng tốt chặn được nên nghiêng về lỗi nền tảng.',
    'Kéo nhầm sản phẩm sang ngành khác: "đổi ngành là chuyện hiếm, đổi ngành thì voucher áp khác là bình thường".',
  ],
}

const PROBE_RULES = [
  'Mỗi trạng thái (state) được dựng từ setup sạch của lab, rồi: chạy inject (một sample_id có sẵn trong lab_injects, hoặc "" nếu không), rồi tạo các price list tạm loại sale, không điều kiện, có hiệu lực ngay (khuyến mãi của shop, flash phụ...).',
  'Bảng flash chính của contract (FS1111-MK Flash 20-22h) luôn có hiệu lực sau setup với giá trong contract; muốn flash giá khác cho SKU nào thì tạo price list tạm cho SKU đó (giá thấp hơn sẽ thắng).',
  'Price list tạm: type sale (lấy giá thấp hơn giữa giá bảng và giá niêm yết) hoặc override (luôn dùng giá bảng); segment ALL (mọi khách) hoặc NEW (chỉ nhóm Khách mới); mỗi giá có min_quantity (1 = mọi số lượng, 2 = từ 2 cái trở lên, dùng cho "mua nhiều giảm giá").',
  'Kịch bản dựa vào hành vi engine CHƯA có trong quy tắc đã kiểm (vd giá theo bậc số lượng khi có price list khác) thì ghi rõ giả định trong numbers; kiểm định chấm numbers_correct theo giả định đó và ghi giả định vào recomputed; probe trên Medusa thật sẽ xác nhận hoặc bác.',
  'Giỏ: danh sách SKU (lặp SKU để mua nhiều cái), segment REGULAR (khách vãng lai) hoặc NEW (khách thuộc nhóm Khách mới, đã đăng nhập), mã nhập tay (voucher tự động tự áp), provider ship, refresh=true nghĩa là sau khi nhập mã có cập nhật giỏ một lần (như bước thanh toán).',
  'claim.worse_state/better_state: tên hai state; khẳng định giỏ đầu tiên ở worse_state khách trả nhiều hơn better_state. expected_pays: số khách trả dự kiến của giỏ đầu tiên ở từng state (tổng tiền gồm ship sau ưu đãi).',
]

const PROPOSAL_ITEM = {
  type: 'object', additionalProperties: false,
  required: ['id', 'title', 'teams', 'steps', 'combined_effect', 'numbers', 'why_not_normal', 'why_not_platform_gap', 'why_not_single_warning', 'why_realistic', 'how_agent_tells_mistake', 'detection', 'probe'],
  properties: {
    id: { type: 'string' }, title: { type: 'string' }, teams: { type: 'array', items: { type: 'string' } },
    steps: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['team', 'action', 'reason'], properties: { team: { type: 'string' }, action: { type: 'string' }, reason: { type: 'string' } } } },
    combined_effect: { type: 'string' }, numbers: { type: 'string' },
    why_not_normal: { type: 'string' }, why_not_platform_gap: { type: 'string' }, why_not_single_warning: { type: 'string' },
    why_realistic: { type: 'string' }, how_agent_tells_mistake: { type: 'string' },
    detection: { type: 'string', description: 'invariant chung bắt được (có sẵn như FLASH_NOT_DEARER_THAN_OFF_FLASH, hoặc invariant mới cần thêm)' },
    probe: {
      type: 'object', additionalProperties: false, required: ['states', 'carts', 'claim'],
      properties: {
        states: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'inject', 'price_lists'], properties: {
          name: { type: 'string' }, inject: { type: 'string' },
          price_lists: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['label', 'type', 'segment', 'prices'], properties: {
            label: { type: 'string' }, type: { type: 'string', enum: ['sale', 'override'] }, segment: { type: 'string', enum: ['ALL', 'NEW'] },
            prices: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['sku', 'amount', 'min_quantity'], properties: { sku: { type: 'string' }, amount: { type: 'number' }, min_quantity: { type: 'number' } } } },
          } } },
        } } },
        carts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['skus', 'segment', 'codes', 'provider', 'refresh'], properties: {
          skus: { type: 'array', items: { type: 'string' } }, segment: { type: 'string', enum: ['REGULAR', 'NEW'] },
          codes: { type: 'array', items: { type: 'string' } }, provider: { type: 'string', enum: ['fs-ghn', 'fs-ghtk', 'fs-vtp', 'fs-ahamove', 'fs-jt'] },
          refresh: { type: 'boolean' },
        } } },
        claim: { type: 'object', additionalProperties: false, required: ['worse_state', 'better_state', 'expected_pays'], properties: {
          worse_state: { type: 'string' }, better_state: { type: 'string' },
          expected_pays: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['state', 'amount'], properties: { state: { type: 'string' }, amount: { type: 'number' } } } },
        } },
      },
    },
  },
}
const REVISE_SCHEMA = { type: 'object', additionalProperties: false, required: ['withdrawn', 'note', 'proposal'], properties: { withdrawn: { type: 'boolean' }, note: { type: 'string' }, proposal: PROPOSAL_ITEM } }
const CHECK_KEYS = CRITERIA.map((c) => c.split(':')[0])
const AUDIT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['verdict', 'checks', 'recomputed', 'required_changes'],
  properties: {
    verdict: { type: 'string', enum: ['ACCEPT', 'REVISE', 'REJECT'] },
    checks: { type: 'object', additionalProperties: false, required: CHECK_KEYS, properties: Object.fromEntries(CHECK_KEYS.map((k) => [k, {
      type: 'object', additionalProperties: false, required: ['ok', 'note'], properties: { ok: { type: 'boolean' }, note: { type: 'string' } },
    }])) },
    recomputed: { type: 'string', description: 'tự tính lại số tiền từng bước' },
    required_changes: { type: 'string' },
  },
}

// Kịch bản đã bị loại/rút ở các lần chạy trước: người đề xuất tránh lặp cơ chế, kiểm định dùng để chấm novel
function pastTries() {
  if (!existsSync(ROOT)) return []
  return readdirSync(ROOT).flatMap((d) => {
    const f = join(ROOT, d, 'proposals.jsonl')
    if (!existsSync(f)) return []
    return readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      .filter((it) => it.proposal && it.history?.length && (it.withdrawn || it.history.at(-1).audit.verdict === 'REJECT'))
      .map((it) => {
        const why = Object.entries(it.history.at(-1).audit.checks).filter(([, v]) => !v.ok).map(([k, v]) => `${k}: ${v.note.slice(0, 160)}`).join('; ')
        return `${it.proposal.title} -> ${it.withdrawn ? 'rút' : 'loại'} (${why})`
      })
  })
}

const shared = (brief) => [
  'FlashSRE:', ...FLASHSRE_SCOPE.map((x) => `- ${x}`), '',
  'Quy tắc engine Medusa 2.21.2 (đã kiểm):', ...ENGINE_KB.map((x) => `- ${x}`), '',
  'Tiêu chí của một kịch bản tốt:', ...CRITERIA.map((x) => `- ${x}`), '',
  'Ví dụ đã chấp nhận:', ...EXAMPLES.accepted.map((x) => `- ${x}`),
  'Ví dụ bị loại và lý do (phản biện của người dùng):', ...EXAMPLES.rejected.map((x) => `- ${x}`), '',
  'Đã thử ở các vòng trước và bị loại:', ...pastTries().map((x) => `- ${x}`), '',
  'Đặc tả đo (probe):', ...PROBE_RULES.map((x) => `- ${x}`), '',
  '# Thế giới lab', JSON.stringify(brief),
].join('\n')

// Mỗi người đề xuất nhận một hướng ghép team riêng để các kịch bản không trùng nhau
const DIRECTIONS = [
  'Mua nhiều giảm giá (seller_ops đặt giá theo bậc số lượng) × flash hoặc voucher của team khác: mua nhiều cái lại trả đắt hơn mỗi cái, hoặc đắt hơn ngoài giờ flash.',
  'Giá riêng cho khách mới (marketing, price list chỉ nhóm Khách mới) × flash hoặc khuyến mãi shop (merchandising, seller_ops): nhóm được ưu đãi riêng trả nhiều hơn khách thường.',
  'Loại price list: hai team chọn sale và override khác nhau cho cùng SKU (vd giá shop override, flash sale), ghép lại giá cuối không phải mức thấp nhất bên nào cũng muốn.',
  'Voucher % và voucher tiền cố định của hai team trên cùng giỏ nhiều shop: mỗi voucher đúng phạm vi của mình, ghép lại chia sai cho shop/món khiến khách trả sai hoặc một bên gánh sai.',
  'Hướng khác do bạn chọn, miễn nhiều team, giống Shopee, và KHÔNG dùng cơ chế rớt ngưỡng.',
]

const PROPOSER = (brief, direction, others) => [
  'Bạn là người đề xuất kịch bản sự cố cho FlashSRE. Đề xuất MỘT kịch bản MỚI: nhiều team, mỗi team làm đúng khi xét riêng, ghép lại khách trả sai tiền (nhiều hơn hoặc ít hơn mức các bên cùng muốn).',
  `Hướng của bạn: ${direction}`,
  `Người đề xuất khác đang làm các hướng: ${others.join(' | ')}. Đừng trùng.`,
  'Dùng đúng SKU, giá, mã, ngưỡng trong thế giới lab; tính số tiền từng bước theo quy tắc engine. Ưu tiên kịch bản bắt được bằng một invariant chung (không cần contract nói), như "cùng giỏ, thêm ưu đãi không được làm khách trả nhiều hơn".',
  'Nếu hướng không cho ra kịch bản đạt mọi tiêu chí, chọn biến thể gần nhất đạt được; đừng ép một kịch bản vướng phản biện.',
  'Viết tiếng Việt, ngắn, cụ thể.', '', shared(brief),
].join('\n')

const AUDITOR = (brief) => [
  'Bạn là kiểm định viên độc lập, khó tính, đóng vai đúng người dùng đã loại các ví dụ bị loại. Chấm MỘT kịch bản theo từng tiêu chí (ok/note).',
  'Tự tính lại số tiền từ dữ liệu lab và quy tắc engine (recomputed); số sai là numbers_correct=false. Kiểm đặc tả đo có dựng đúng câu chuyện không.',
  'ACCEPT chỉ khi mọi tiêu chí ok. REVISE khi sửa được (ghi rõ cần sửa gì). REJECT khi bản chất vướng một phản biện (bình thường, giới hạn nền tảng, một cảnh báo là đủ, không giống Shopee).',
  'Viết tiếng Việt, ngắn, cụ thể.', '', shared(brief),
].join('\n')

const ONE_SCHEMA = { type: 'object', additionalProperties: false, required: ['proposal'], properties: { proposal: PROPOSAL_ITEM } }

async function propose() {
  const n = Math.min(Number(arg('--n', 6)), DIRECTIONS.length)
  const rounds = Number(arg('--rounds', 2))
  const focus = arg('--focus', '')
  const directions = focus ? [focus] : DIRECTIONS.slice(0, n)
  const { brief } = await worldBrief()
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = join(ROOT, ts)
  mkdirSync(dir, { recursive: true })
  let cost = 0
  log(`[propose] ${directions.length} hướng, tối đa ${rounds} vòng sửa, ${SUBAGENT_RUNTIME.runtime}/${SUBAGENT_RUNTIME.model} -> ${dir}`)
  const audit = async (it) => {
    const a = await runSubAgent({ system: AUDITOR(brief), prompt: `# Kịch bản cần chấm\n${JSON.stringify(it.proposal)}`, schema: AUDIT_SCHEMA })
    cost += a.cost_usd ?? 0
    it.history.push({ round: it.history.length, proposal: it.proposal, audit: a.output })
    const failed = Object.entries(a.output.checks).filter(([, v]) => !v.ok).map(([k]) => k)
    log(`  [audit r${it.history.length - 1}] ${it.proposal.id} ${a.output.verdict}${failed.length ? ` | trượt: ${failed.join(',')}` : ''} | ${it.proposal.title.slice(0, 80)}`)
    return a.output.verdict
  }
  // Mỗi hướng: đề xuất -> chấm -> (sửa -> chấm lại) tối đa `rounds` lần; xong hướng nào ghi hướng đó
  const items = await pool(directions, directions.length, async (direction, i) => {
    const id = `P${i + 1}`
    const it = { direction, history: [] }
    try {
      const first = await runSubAgent({ system: PROPOSER(brief, direction, directions.filter((d) => d !== direction)), prompt: `Đề xuất một kịch bản, id ${id}.`, schema: ONE_SCHEMA })
      cost += first.cost_usd ?? 0
      it.proposal = { ...first.output.proposal, id }
      log(`  [đề xuất] ${id}: ${it.proposal.title.slice(0, 100)}`)
      let verdict = await audit(it)
      for (let r = 1; r <= rounds && verdict === 'REVISE'; r++) {
        const rv = await runSubAgent({
          system: PROPOSER(brief, direction, []),
          prompt: `Kiểm định viên yêu cầu sửa kịch bản của bạn. Sửa theo yêu cầu (giữ id), hoặc rút lại (withdrawn=true) nếu bản chất không sửa được.\n# Kịch bản\n${JSON.stringify(it.proposal)}\n# Kết quả kiểm định\n${JSON.stringify(it.history.at(-1).audit)}`,
          schema: REVISE_SCHEMA,
        })
        cost += rv.cost_usd ?? 0
        if (rv.output.withdrawn) {
          it.withdrawn = rv.output.note
          log(`  [rút r${r}] ${id}: ${rv.output.note.slice(0, 120)}`)
          break
        }
        it.proposal = { ...rv.output.proposal, id }
        verdict = await audit(it)
      }
    } catch (e) {
      it.error = e.message
      log(`  [lỗi] ${id}: ${e.message.slice(0, 200)}`)
    }
    appendFileSync(join(dir, 'proposals.jsonl'), JSON.stringify(it) + '\n')
    return it
  })
  const ok = items.filter((it) => it.proposal && it.history.length)
  writeFileSync(join(dir, 'REVIEW.md'), reviewMd(ok, cost))
  writeFileSync(join(dir, 'meta.json'), JSON.stringify({ directions, rounds, cost_usd: cost, errors: items.filter((it) => it.error).length, runtime: SUBAGENT_RUNTIME }, null, 2))
  log(`[propose] xong: ${join(dir, 'REVIEW.md')} | chi phí ~$${cost.toFixed(2)}`)
}

function reviewMd(items, cost, probes = {}) {
  const verdictOf = (it) => (it.withdrawn ? 'RÚT' : it.history.at(-1).audit.verdict)
  const rows = items.map((it) => {
    const p = it.proposal
    const pr = probes[p.id]
    return `| ${p.id} | ${p.title} | ${p.teams.join(', ')} | ${verdictOf(it)} (${it.history.length} lượt chấm) | ${pr ? (pr.holds ? `ĐÚNG: ${pr.summary}` : `SAI: ${pr.summary}`) : '-'} |`
  })
  const body = items.map((it) => {
    const p = it.proposal
    const a = it.history.at(-1).audit
    return [
      `## ${p.id}. ${p.title} (${verdictOf(it)})`, '',
      ...p.steps.map((s) => `- **${s.team}**: ${s.action} (${s.reason})`), '',
      `Ghép lại: ${p.combined_effect}`, '', `Số tiền: ${p.numbers}`, '',
      `- Không phải bình thường: ${p.why_not_normal}`, `- Không phải giới hạn nền tảng: ${p.why_not_platform_gap}`,
      `- Không bắt được bằng một cảnh báo: ${p.why_not_single_warning}`, `- Thực tế: ${p.why_realistic}`,
      `- Agent biết là nhầm: ${p.how_agent_tells_mistake}`, `- Phát hiện: ${p.detection}`, '',
      `Kiểm định: ${Object.entries(a.checks).filter(([, v]) => !v.ok).map(([k, v]) => `${k}: ${v.note}`).join(' · ') || 'mọi tiêu chí đạt'}`,
      `Tính lại: ${a.recomputed}`, a.required_changes ? `Cần sửa: ${a.required_changes}` : '',
      it.withdrawn ? `Rút lại: ${it.withdrawn}` : '',
      probes[p.id] ? `Đo giỏ thật: ${probes[p.id].detail}` : '', '',
    ].filter((x) => x !== '').join('\n')
  })
  return [
    '# Kịch bản liên team: đề xuất, kiểm định, đo giỏ thật', '',
    `${items.length} đề xuất · ACCEPT ${items.filter((i) => verdictOf(i) === 'ACCEPT').length} · ${SUBAGENT_RUNTIME.runtime}/${SUBAGENT_RUNTIME.model} · ~$${cost.toFixed(2)}`, '',
    '| ID | Kịch bản | Team | Kiểm định | Giỏ thật |', '|---|---|---|---|---|', ...rows, '', ...body,
  ].join('\n')
}

// ------------------------------------------------------------------ đo bằng giỏ thật
async function probe() {
  const dir = process.argv[3]
  if (!dir || !existsSync(join(dir, 'proposals.jsonl'))) throw new Error('Cần thư mục đề xuất có proposals.jsonl')
  if (!process.env.PASSWORD) throw new Error('Thiếu PASSWORD (admin)')
  const BASE = process.env.BASE
  const items = readFileSync(join(dir, 'proposals.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((it) => it.proposal && it.history.length)
  const pick = arg('--ids', '')?.split(',').filter(Boolean)
  const todo = items.filter((it) => !it.withdrawn && it.history.at(-1).audit.verdict === 'ACCEPT' && (!pick.length || pick.includes(it.proposal.id)))
  const { lab } = await worldBrief()
  const samples = new Map(lab.expandSamples().map((s) => [s.sample_id, s]))
  async function call(path, { method = 'GET', body, bearer, pk } = {}) {
    const headers = { 'Content-Type': 'application/json' }
    if (bearer) headers.Authorization = `Bearer ${bearer}`
    if (pk) headers['x-publishable-api-key'] = pk
    const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
    const json = await r.json().catch(() => null)
    if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(json).slice(0, 200)}`)
    return json
  }
  const admin = async () => (await call('/auth/user/emailpass', { method: 'POST', body: { email: process.env.EMAIL || 'admin@flashsre.dev', password: process.env.PASSWORD } })).token
  async function newCustomer(ids, adminTok) {
    const email = 'fsx.probe.new@flashsre.dev'
    const pw = 'fsx-probe-new'
    let tok
    try {
      tok = (await call('/auth/customer/emailpass', { method: 'POST', body: { email, password: pw } })).token
    } catch {
      const reg = (await call('/auth/customer/emailpass/register', { method: 'POST', body: { email, password: pw } })).token
      await call('/store/customers', { method: 'POST', bearer: reg, pk: ids.pk, body: { email, first_name: 'Probe', last_name: 'New' } })
      tok = (await call('/auth/customer/emailpass', { method: 'POST', body: { email, password: pw } })).token
    }
    const me = (await call('/store/customers/me', { bearer: tok, pk: ids.pk })).customer
    await call(`/admin/customer-groups/${ids.new_group}/customers`, { method: 'POST', bearer: adminTok, body: { add: [me.id] } }).catch(() => null)
    return tok
  }
  async function measure(ids, c, newTok) {
    const bearer = c.segment === 'NEW' ? newTok : undefined
    const missing = c.skus.filter((s) => !ids.variants[s])
    if (missing.length) throw new Error(`SKU không có trong lab: ${missing.join(', ')}`)
    const cart = (await call('/store/carts', {
      method: 'POST', pk: ids.pk, bearer,
      body: {
        region_id: ids.region, sales_channel_id: ids.sales_channel, email: c.segment === 'NEW' ? 'fsx.probe.new@flashsre.dev' : 'fsx.probe@flashsre.dev',
        items: Object.entries(Object.groupBy(c.skus, (s) => s)).map(([s, xs]) => ({ variant_id: ids.variants[s], quantity: xs.length })),
        shipping_address: { first_name: 'Lan', last_name: 'Nguyen', address_1: '1 Lê Lợi', city: 'Hà Nội', country_code: 'vn', postal_code: '100000' },
      },
    })).cart
    await call(`/store/carts/${cart.id}/shipping-methods`, { method: 'POST', pk: ids.pk, bearer, body: { option_id: ids.options[c.provider] } })
    if (c.codes.length) await call(`/store/carts/${cart.id}/promotions`, { method: 'POST', pk: ids.pk, bearer, body: { promo_codes: c.codes } })
    if (c.refresh) await call(`/store/carts/${cart.id}`, { method: 'POST', pk: ids.pk, bearer, body: { email: c.segment === 'NEW' ? 'fsx.probe.new@flashsre.dev' : 'fsx.probe2@flashsre.dev' } })
    const f = '?fields=id,total,items.unit_price,items.variant_sku,items.adjustments.code,items.adjustments.amount,shipping_methods.amount,shipping_methods.adjustments.code,shipping_methods.adjustments.amount'
    const r = (await call(`/store/carts/${cart.id}${f}`, { pk: ids.pk, bearer })).cart
    const adj = {}
    for (const a of [...r.items.flatMap((i) => i.adjustments ?? []), ...(r.shipping_methods ?? []).flatMap((m) => m.adjustments ?? [])]) adj[a.code] = (adj[a.code] ?? 0) + Number(a.amount)
    return { total: Number(r.total), prices: Object.fromEntries(r.items.map((i) => [i.variant_sku, Number(i.unit_price)])), ship: Number(r.shipping_methods?.[0]?.amount ?? 0), adjustments: adj }
  }
  const results = {}
  const vnd = (n) => `${Math.round(n).toLocaleString('vi-VN')}đ`
  try {
    for (const it of todo) {
      const p = it.proposal
      const out = { states: {} }
      try {
        for (const st of p.probe.states) {
          const ids = await lab.setup()
          if (st.inject) {
            const s = samples.get(st.inject)
            if (!s) throw new Error(`inject không có trong lab: ${st.inject}`)
            await lab.asTeam(s.team)
            await s.inject(ids)
          }
          const tok = await admin()
          const created = []
          try {
            for (const pl of st.price_lists) {
              created.push((await call('/admin/price-lists', {
                method: 'POST', bearer: tok,
                body: {
                  title: `FSX-PROBE ${p.id} ${pl.label}`.slice(0, 120), description: 'scenario-lab probe', type: pl.type ?? 'sale', status: 'active',
                  ...(pl.segment === 'NEW' ? { rules: { 'customer.groups.id': [ids.new_group] } } : {}),
                  prices: pl.prices.map((x) => ({ variant_id: ids.variants[x.sku], amount: x.amount, currency_code: 'vnd', ...(x.min_quantity > 1 ? { min_quantity: x.min_quantity } : {}) })),
                },
              })).price_list.id)
            }
            const newTok = p.probe.carts.some((c) => c.segment === 'NEW') ? await newCustomer(ids, tok) : null
            out.states[st.name] = []
            for (const c of p.probe.carts) out.states[st.name].push(await measure(ids, c, newTok))
          } finally {
            for (const id of created) await call(`/admin/price-lists/${id}`, { method: 'DELETE', bearer: tok }).catch(() => null)
          }
          if (st.inject && samples.get(st.inject).contract) {
            await lab.asAdmin()
            await lab.postContracts()
          }
        }
        const { worse_state: w, better_state: b, expected_pays: exp } = p.probe.claim
        const tw = out.states[w]?.[0]?.total
        const tb = out.states[b]?.[0]?.total
        const numbersOk = exp.every((e) => Math.abs((out.states[e.state]?.[0]?.total ?? NaN) - e.amount) <= 1)
        const holds = tw !== undefined && tb !== undefined && tw > tb + 1
        const per = Object.entries(out.states).map(([name, carts]) => `${name}: ${vnd(carts[0].total)} (${Object.entries(carts[0].adjustments).map(([k, v]) => `${k.replace('FS-MK-', '')} ${vnd(v)}`).join(', ') || 'không ưu đãi'}; ship ${vnd(carts[0].ship)})`).join(' · ')
        results[p.id] = {
          holds, numbers_ok: numbersOk, measured: out,
          summary: holds ? `${w} ${vnd(tw)} > ${b} ${vnd(tb)}${numbersOk ? '' : ' (số dự kiến lệch)'}` : `${w} ${vnd(tw ?? NaN)} không đắt hơn ${b} ${vnd(tb ?? NaN)}`,
          detail: `${per}. Dự kiến: ${exp.map((e) => `${e.state} ${vnd(e.amount)}`).join(', ')}${numbersOk ? ' (khớp)' : ' (lệch)'}`,
        }
      } catch (e) {
        results[p.id] = { holds: false, numbers_ok: false, error: String(e.message || e), summary: `lỗi khi đo: ${String(e.message || e).slice(0, 80)}`, detail: String(e.message || e) }
      }
      log(`[probe] ${p.id} ${results[p.id].holds ? 'ĐÚNG' : 'SAI'} | ${results[p.id].summary}`)
    }
  } finally {
    await lab.setup()
    await lab.asAdmin()
    await lab.postContracts()
    log('[probe] đã khôi phục setup + contract')
  }
  writeFileSync(join(dir, 'probe.json'), JSON.stringify(results, null, 2))
  const meta = existsSync(join(dir, 'meta.json')) ? JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) : {}
  writeFileSync(join(dir, 'REVIEW.md'), reviewMd(items, meta.cost_usd ?? 0, results))
  log(`[probe] xong: ${join(dir, 'REVIEW.md')}`)
}

const cmd = process.argv[2]
const run = cmd === 'propose' ? propose : cmd === 'probe' ? probe : async () => log('Lệnh: propose [--n 6] [--rounds 2] [--focus "..."] | probe <dir> [--ids P1,P2]')
run().catch((e) => { console.error(e); process.exit(1) })
