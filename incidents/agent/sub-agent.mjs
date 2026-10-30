/**
 * Chạy một sub-agent độc lập, không tool, trả JSON đúng schema.
 * Runtime: FLASHSRE_SUBAGENT=claude-cli (mặc định, dùng `claude -p` headless với tài khoản đang đăng nhập)
 *          hoặc anthropic (cần ANTHROPIC_API_KEY). Model: FLASHSRE_SUBAGENT_MODEL (mặc định sonnet).
 * Sub-agent không đọc repo, không có tool: chỉ thấy đúng hồ sơ được đưa vào prompt.
 */
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'

const RUNTIME = process.env.FLASHSRE_SUBAGENT || 'claude-cli'
const MODEL = process.env.FLASHSRE_SUBAGENT_MODEL || 'sonnet'
const TIMEOUT_MS = Number(process.env.FLASHSRE_SUBAGENT_TIMEOUT_MS || 15 * 60 * 1000)

// CLI gọi thêm model nhỏ cho việc phụ; model làm bài là model tốn chi phí nhất
const mainModel = (usage = {}) => Object.entries(usage).sort((x, y) => (y[1].costUSD ?? 0) - (x[1].costUSD ?? 0))[0]?.[0]

function viaCli({ system, prompt, schema, model }) {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--model', model, '--tools', '', '--strict-mcp-config', '--no-session-persistence', '--setting-sources', '',
      '--system-prompt', system, '--output-format', 'json', '--json-schema', JSON.stringify(schema)]
    // cwd tạm: không nạp CLAUDE.md/AGENTS.md của repo, sub-agent chỉ thấy hồ sơ
    const child = spawn('claude', args, { cwd: tmpdir(), stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    // lượt treo bị dừng và tính là lỗi để retry, không chặn cả lần chạy
    const timer = setTimeout(() => { err = `quá ${TIMEOUT_MS / 1000}s`; child.kill('SIGTERM') }, TIMEOUT_MS)
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('error', reject)
    child.on('close', (code) => {
      clearTimeout(timer)
      try {
        const r = JSON.parse(out)
        if (r.is_error || !r.structured_output) return reject(new Error(`sub-agent lỗi: ${r.result ?? r.subtype ?? err}`.slice(0, 300)))
        resolve({ output: r.structured_output, cost_usd: r.total_cost_usd ?? null, model: mainModel(r.modelUsage) ?? model })
      } catch {
        reject(new Error(`sub-agent thoát ${code}: ${(err || out).slice(0, 300)}`))
      }
    })
    child.stdin.end(prompt)
  })
}

async function viaAnthropic({ system, prompt, schema, model }) {
  const id = { sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5', haiku: 'claude-haiku-5-5' }[model] ?? model
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: id, max_tokens: 4000, system,
      tools: [{ name: 'report', description: 'Nộp kết quả kiểm định', input_schema: schema }],
      tool_choice: { type: 'tool', name: 'report' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${JSON.stringify(j).slice(0, 300)}`)
  return { output: j.content.find((c) => c.type === 'tool_use').input, cost_usd: null, model: id }
}

export async function runSubAgent({ system, prompt, schema, model = MODEL, retries = 2 }) {
  const run = RUNTIME === 'anthropic' ? viaAnthropic : viaCli
  for (let i = 0; ; i++) {
    try {
      return await run({ system, prompt, schema, model })
    } catch (e) {
      if (i >= retries) throw e
      console.error(`  [sub-agent] thử lại ${i + 1}/${retries}: ${e.message.slice(0, 160)}`)
    }
  }
}

// Chạy song song có giới hạn
export async function pool(items, concurrency, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }))
  return out
}

export const SUBAGENT_RUNTIME = { runtime: RUNTIME, model: MODEL }
