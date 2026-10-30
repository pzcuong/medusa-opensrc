import { Text } from "@medusajs/ui"

// Charts drawn as plain SVG with the admin theme variables, so they follow light and dark mode without a chart library
const C = {
  ink: "var(--fg-base)",
  sub: "var(--fg-subtle)",
  muted: "var(--fg-muted)",
  line: "var(--border-base)",
  bad: "var(--tag-red-icon)",
  badBg: "var(--tag-red-bg)",
  warn: "var(--tag-orange-icon)",
  good: "var(--tag-green-icon)",
  blue: "var(--tag-blue-icon)",
}

export type Benchmark = {
  id: string
  label: string
  unit: "x" | "time" | "delta" | "n"
  dir: "up" | "down"
  warn: number
  breach: number
  sustain: number
  trigger: boolean
  source: string
  fired: number | null
  status: "ok" | "warn" | "breach"
  values: (number | null)[]
}

export const N = 240
export const clock = (t: number) => {
  const m = 20 * 60 + Math.round(t)
  return m >= 1440 ? "24:00" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}
export const money = (n: number) => {
  const a = Math.abs(n)
  const s = n < 0 ? "−" : ""
  if (a >= 1e9) {
    return `${s}${(a / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`
  }
  if (a >= 1e6) {
    return `${s}${(a / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`
  }
  return `${s}${Math.round(a).toLocaleString("vi-VN")}đ`
}
export const benchFmt = (unit: Benchmark["unit"], v: number) => {
  if (unit === "x") {
    return `×${v.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}`
  }
  if (unit === "time") {
    return v >= N ? "sau 24:00" : clock(v)
  }
  if (unit === "delta") {
    return `${v >= 0 ? "+" : "−"}${(Math.abs(v) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} điểm`
  }
  return v.toLocaleString("vi-VN", { maximumFractionDigits: 2 })
}

// Small multiple: one benchmark, its warning and trigger thresholds, the minutes it was in breach
export const BenchSpark = ({ b }: { b: Benchmark }) => {
  const W = 240
  const H = 54
  // trục ngang theo số phút đã ghi, để đường không bị dồn về một góc khi sự cố được ghi giữa khung
  const span = Math.max(30, b.values.length - 1)
  const vs = b.values.filter((v): v is number => v != null && Number.isFinite(v))
  const lo = Math.min(...vs, b.warn, b.breach)
  const hi = Math.max(...vs, b.warn, b.breach)
  const pad = (hi - lo) * 0.12 || 1
  const y = (v: number) => H - 4 - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - 8)
  const x = (k: number) => (W * k) / span
  const over = (v: number, t: number) => (b.dir === "up" ? v > t : v < t)
  const pts = b.values.map((v, k) => (v == null ? null : `${x(k).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(" ")
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block" }} aria-hidden>
      {b.values.map((v, k) =>
        v != null && over(v, b.breach) ? <rect key={k} x={x(k)} y={0} width={W / span + 0.6} height={H} style={{ fill: C.badBg }} /> : null
      )}
      <line x1={0} x2={W} y1={y(b.warn)} y2={y(b.warn)} style={{ stroke: C.warn, strokeDasharray: "4 3" }} />
      <line x1={0} x2={W} y1={y(b.breach)} y2={y(b.breach)} style={{ stroke: C.bad, strokeDasharray: "2 2" }} />
      <polyline points={pts} style={{ fill: "none", stroke: C.ink, strokeWidth: 1.6 }} />
      {b.fired != null && b.values[b.fired] != null && <circle cx={x(b.fired)} cy={y(b.values[b.fired] as number)} r={3.4} style={{ fill: C.bad }} />}
    </svg>
  )
}

type Mark = { t: number; label: string; tone?: "bad" | "good" | "blue" }

// Main campaign chart: actual against plan (and target), with the moments the agent fired, the decision and the recovery
export const CampaignChart = ({
  actual,
  plan,
  target,
  marks,
  fmt = money,
}: {
  actual: number[]
  plan: number[]
  target?: number[]
  marks: Mark[]
  fmt?: (v: number) => string
}) => {
  const W = 1100
  const H = 300
  const L = 70
  const R = 16
  const T = 18
  const B = 28
  const all = [...actual, ...plan, ...(target ?? [])].filter(Number.isFinite)
  const max = Math.max(...all, 1) * 1.06
  const min = Math.min(0, ...all)
  const x = (t: number) => L + ((W - L - R) * t) / (N - 1)
  const y = (v: number) => T + (H - T - B) * (1 - (v - min) / (max - min || 1))
  const path = (vals: number[]) => vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  const ticks = [min, min + (max - min) / 2, max]
  const tone = { bad: C.bad, good: C.good, blue: C.blue }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} style={{ stroke: C.line }} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" style={{ fill: C.muted, fontSize: 11 }}>
            {fmt(v)}
          </text>
        </g>
      ))}
      {[0, 60, 120, 180, 239].map((t) => (
        <text key={t} x={x(t)} y={H - 8} textAnchor="middle" style={{ fill: C.muted, fontSize: 11 }}>
          {t === 239 ? "24:00" : clock(t)}
        </text>
      ))}
      <polyline points={path(plan)} style={{ fill: "none", stroke: C.muted, strokeWidth: 2, strokeDasharray: "5 4" }} />
      {target && <polyline points={path(target)} style={{ fill: "none", stroke: C.warn, strokeWidth: 1.5, strokeDasharray: "8 4" }} />}
      <polygon points={`${x(0)},${y(min)} ${path(actual)} ${x(actual.length - 1)},${y(min)}`} style={{ fill: C.blue, opacity: 0.12 }} />
      <polyline points={path(actual)} style={{ fill: "none", stroke: C.blue, strokeWidth: 2.5 }} />
      {marks.map((m, i) => (
        <g key={m.label}>
          <line x1={x(m.t)} x2={x(m.t)} y1={T} y2={H - B} style={{ stroke: tone[m.tone ?? "bad"] }} />
          <text x={Math.min(x(m.t) + 4, W - R - 90)} y={T + 11 + i * 13} style={{ fill: tone[m.tone ?? "bad"], fontSize: 11, fontWeight: 600 }}>
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

export type Gap = { seg: string; size: string; gap: number; expected: number; per: number; orders: number; plan_orders: number }
const SEG: Record<string, string> = { REG: "Khách thường", VIP: "Khách VIP" }
const SIZE: Record<string, string> = { small: "hàng nhỏ", medium: "hàng vừa", bulky: "hàng cồng kềnh" }

// Waterfall from planned profit to actual profit: which basket group took the money
export const GapWaterfall = ({ plan, gaps }: { plan: number; gaps: Gap[] }) => {
  const W = 1100
  const rowH = 30
  const L = 210
  const R = 90
  const steps = [...gaps].sort((a, b) => a.gap - b.gap)
  let run = plan
  const bars = steps.map((g) => {
    const from = run
    run += g.gap
    return { g, from, to: run }
  })
  const vals = [0, plan, ...bars.map((b) => b.to)]
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const x = (v: number) => L + ((W - L - R) * (v - lo)) / (hi - lo || 1)
  const H = rowH * (bars.length + 2) + 8
  const row = (i: number) => 4 + i * rowH
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img">
      <text x={L - 10} y={row(0) + 19} textAnchor="end" style={{ fill: C.sub, fontSize: 12 }}>
        Kế hoạch
      </text>
      <rect x={x(Math.min(0, plan))} y={row(0) + 6} width={Math.abs(x(plan) - x(0))} height={rowH - 12} style={{ fill: C.muted }} />
      <text x={x(plan) + 6} y={row(0) + 19} style={{ fill: C.ink, fontSize: 11 }}>
        {money(plan)}
      </text>
      {bars.map((b, i) => (
        <g key={`${b.g.seg}-${b.g.size}`}>
          <text x={L - 10} y={row(i + 1) + 19} textAnchor="end" style={{ fill: C.sub, fontSize: 12 }}>
            {SEG[b.g.seg]} · {SIZE[b.g.size]}
          </text>
          <rect
            x={x(Math.min(b.from, b.to))}
            y={row(i + 1) + 6}
            width={Math.max(1, Math.abs(x(b.to) - x(b.from)))}
            height={rowH - 12}
            style={{ fill: b.g.gap < 0 ? C.bad : C.good }}
          />
          <text x={x(Math.max(b.from, b.to)) + 6} y={row(i + 1) + 19} style={{ fill: b.g.gap < 0 ? C.bad : C.good, fontSize: 11, fontWeight: 600 }}>
            {b.g.gap < 0 ? "" : "+"}
            {money(b.g.gap)}
          </text>
        </g>
      ))}
      <text x={L - 10} y={row(bars.length + 1) + 19} textAnchor="end" style={{ fill: C.ink, fontSize: 12, fontWeight: 600 }}>
        Thực tế tới lúc điều tra
      </text>
      <rect x={x(Math.min(0, run))} y={row(bars.length + 1) + 6} width={Math.abs(x(run) - x(0))} height={rowH - 12} style={{ fill: C.blue }} />
      <text x={x(run) + 6} y={row(bars.length + 1) + 19} style={{ fill: C.ink, fontSize: 11 }}>
        {money(run)}
      </text>
    </svg>
  )
}

export const Legend = ({ items }: { items: { label: string; color: string; dash?: string }[] }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1">
    {items.map((i) => (
      <Text key={i.label} size="xsmall" className="text-ui-fg-subtle flex items-center gap-x-1.5">
        <svg width="18" height="6" aria-hidden>
          <line x1="0" x2="18" y1="3" y2="3" style={{ stroke: i.color, strokeWidth: 2.5, strokeDasharray: i.dash }} />
        </svg>
        {i.label}
      </Text>
    ))}
  </div>
)

export const CHART_COLORS = C
