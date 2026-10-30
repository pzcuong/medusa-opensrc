// fetch có thử lại khi mất mạng (DNS, reset) hoặc dyno đang khởi động lại (502/503/504).
// Các lệnh của lab là đặt trạng thái (idempotent), nên gửi lại an toàn; lỗi 4xx/500 trả về ngay.
const RETRY_STATUS = new Set([502, 503, 504])

export async function fetchRetry(url, init, { attempts = 30, delayMs = 10_000, log = console.error } = {}) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, init)
      if (!RETRY_STATUS.has(r.status) || i >= attempts) return r
      log(`[net] ${init?.method ?? 'GET'} ${new URL(url).pathname} -> ${r.status}, thử lại ${i}/${attempts}`)
    } catch (e) {
      if (i >= attempts) throw e
      log(`[net] ${init?.method ?? 'GET'} ${new URL(url).pathname}: ${e.cause?.code ?? e.message}, thử lại ${i}/${attempts}`)
    }
    await new Promise((r) => setTimeout(r, delayMs))
  }
}
