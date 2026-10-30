import { Badge, Text } from "@medusajs/ui"

export type Preflight = {
  verdict: "pass" | "covered" | "warn"
  facts: string[]
  checked_lessons: number
  matched: { lesson_id: string; title: string; covered: boolean; guardrails: string[]; evidence: string[]; benchmarks: string[] }[]
}

const VERDICT: Record<Preflight["verdict"], { label: string; color: "green" | "orange" }> = {
  pass: { label: "Không khớp kinh nghiệm rủi ro", color: "green" },
  covered: { label: "Đã có guardrail từ kinh nghiệm", color: "green" },
  warn: { label: "Khớp kinh nghiệm rủi ro, cần guardrail", color: "orange" },
}

export const PreflightView = ({ check }: { check: Preflight }) => (
  <div className="flex flex-col gap-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Badge color={VERDICT[check.verdict].color}>{VERDICT[check.verdict].label}</Badge>
      <Text size="xsmall" className="text-ui-fg-subtle font-mono">
        dấu hiệu: {check.facts.join(", ") || "không có"} · đối chiếu {check.checked_lessons} kinh nghiệm
      </Text>
    </div>
    {check.matched.map((m) => (
      <div key={m.lesson_id} className={`rounded-lg border p-3 ${m.covered ? "border-ui-border-base" : "border-ui-tag-orange-border bg-ui-tag-orange-bg"}`}>
        <Text size="small" weight="plus">
          {m.title} {m.covered ? "(đã có guardrail)" : ""}
        </Text>
        {m.evidence.slice(0, 2).map((e) => (
          <Text key={e} size="xsmall" className="text-ui-fg-subtle">
            · {e}
          </Text>
        ))}
        <Text size="xsmall">Guardrail: {m.guardrails.join("; ")}</Text>
      </div>
    ))}
  </div>
)
