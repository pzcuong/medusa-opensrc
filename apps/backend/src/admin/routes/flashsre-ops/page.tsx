import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Bolt } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Select, Table, Text, toast } from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { api, timeAgo } from "../../lib/flashsre"
import { BenchSpark, Benchmark, benchFmt, CampaignChart, CHART_COLORS, clock, Gap, GapWaterfall, Legend, money } from "../../components/ops-charts"
import { Preflight, PreflightView } from "../../components/preflight-view"

type Step = { system: string; ask: string; found: string; verdict: "bad" | "clear" | "cause" | "info"; rules_out?: string }
type Option = { id: string; label: string; meets: boolean; recommended: boolean; roles: string[]; coverage?: number; orders?: number; end_profit?: number; gmv?: number; affected?: number }
type IncidentDossier = {
  scenario: "budget" | "margin"
  title: string
  run: string
  now: number
  detected: { t: number; signal: string; benchmark: string; breached: string[]; onset: number } | null
  benchmarks: Benchmark[]
  series: { kind: string; label: string; actual: number[]; plan: number[]; target?: number }
  steps: Step[]
  cause: string | null
  gaps?: Gap[]
  options?: Option[]
  chosen?: { id: string; at: number }
  verification?: { ok: boolean; t: number; text: string }
  lesson?: string
}
type Run<D> = { id: string; created_at: string; contract_id: string; finding_key: string; title: string; status: string; dossier: D }
type Lesson = {
  id: string
  title: string
  severity: string
  learned_at: string
  facts: string[]
  unless?: string[]
  evidence: string[]
  guardrails: { id: string; text: string }[]
  benchmarks: string[]
  incident?: { detected: string; recovered: string | null; benchmark: string; fix: string }
}

const STATUS: Record<string, { label: string; color: "orange" | "green" | "red" | "grey" }> = {
  awaiting_approval: { label: "Chờ duyệt", color: "orange" },
  resolved: { label: "Đã khôi phục", color: "green" },
}

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <Container className="divide-y p-0">
    <div className="px-6 py-4">
      <Heading level="h2">{title}</Heading>
      {hint && (
        <Text size="small" className="text-ui-fg-subtle">
          {hint}
        </Text>
      )}
    </div>
    <div className="flex flex-col gap-y-4 px-6 py-4">{children}</div>
  </Container>
)

const IncidentView = ({ d }: { d: IncidentDossier }) => {
  const s = d.series
  const target = s.target ? s.plan.map((v) => (v * (s.target as number)) / (s.plan[s.plan.length - 1] || 1)) : undefined
  const marks = [
    d.detected && { t: d.detected.t, label: `Agent kích hoạt ${clock(d.detected.t)}`, tone: "bad" as const },
    d.chosen && { t: d.chosen.at, label: `Duyệt ${clock(d.chosen.at)}`, tone: "blue" as const },
    d.verification?.ok && { t: d.verification.t, label: `Khôi phục ${clock(d.verification.t)}`, tone: "good" as const },
  ].filter(Boolean) as { t: number; label: string; tone: "bad" | "blue" | "good" }[]
  const fired = d.benchmarks.find((b) => b.id === d.detected?.benchmark)
  return (
    <div className="flex flex-col gap-y-6">
      {d.detected && (
        <div className="bg-ui-tag-red-bg rounded-lg px-4 py-3">
          <Text size="small" weight="plus">
            {clock(d.detected.t)} · benchmark "{fired?.label}" kích hoạt agent
          </Text>
          <Text size="small">{d.detected.signal}</Text>
        </div>
      )}
      <div className="flex flex-col gap-y-2">
        <Text weight="plus">Benchmark ({d.benchmarks.length} chỉ số, cập nhật mỗi phút)</Text>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {d.benchmarks.map((b) => {
            const v = b.values[b.values.length - 1]
            return (
              <div key={b.id} className={`rounded-lg border p-3 ${b.status === "breach" ? "border-ui-tag-red-border bg-ui-tag-red-bg" : "border-ui-border-base"}`}>
                <div className="flex items-start justify-between gap-x-2">
                  <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
                    {b.label}
                  </Text>
                  {b.trigger && (
                    <Badge size="2xsmall" color="blue">
                      kích hoạt agent
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Heading level="h3">{v == null ? "-" : benchFmt(b.unit, v)}</Heading>
                  <Badge size="2xsmall" color={b.status === "breach" ? "red" : b.status === "warn" ? "orange" : "green"}>
                    {b.status === "breach" ? "Vượt ngưỡng" : b.status === "warn" ? "Cảnh báo" : "Trong ngưỡng"}
                  </Badge>
                </div>
                <BenchSpark b={b} />
                <Text size="xsmall" className="text-ui-fg-muted">
                  Ngưỡng {benchFmt(b.unit, b.warn)} / {benchFmt(b.unit, b.breach)} · {b.sustain} phút
                  {b.fired != null ? ` · kích hoạt ${clock(b.fired)}` : ""} · {b.source}
                </Text>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex flex-col gap-y-2">
        <Text weight="plus">{s.label}</Text>
        <CampaignChart actual={s.actual} plan={s.plan} target={target} marks={marks} />
        <Legend
          items={[
            { label: "Thực tế (đơn thật trên Medusa)", color: CHART_COLORS.blue },
            { label: "Kế hoạch trong contract", color: CHART_COLORS.muted, dash: "5 4" },
            ...(target ? [{ label: `Mục tiêu ${money(s.target as number)}`, color: CHART_COLORS.warn, dash: "8 4" }] : []),
          ]}
        />
      </div>
      {!!d.gaps?.length && (
        <div className="flex flex-col gap-y-2">
          <Text weight="plus">Khoản hụt nằm ở nhóm giỏ nào</Text>
          <GapWaterfall plan={d.gaps.reduce((a, g) => a + g.expected, 0)} gaps={d.gaps} />
        </div>
      )}
      <div className="flex flex-col gap-y-2">
        <Text weight="plus">Điều tra</Text>
        {d.steps.map((st) => (
          <div key={st.system} className="border-ui-border-base flex flex-col gap-y-0.5 border-t pt-2">
            <div className="flex items-center gap-x-2">
              <Text size="xsmall" weight="plus" className="text-ui-fg-subtle uppercase">
                {st.system}
              </Text>
              <Badge size="2xsmall" color={st.verdict === "clear" ? "green" : st.verdict === "info" ? "grey" : "red"}>
                {st.verdict === "clear" ? `Loại trừ: ${st.rules_out ?? "bình thường"}` : st.verdict === "info" ? "Dữ kiện" : st.verdict === "cause" ? "Nguyên nhân" : "Lệch kế hoạch"}
              </Badge>
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              {st.ask}
            </Text>
            <Text size="small">{st.found}</Text>
          </div>
        ))}
        {d.cause && (
          <div className="bg-ui-tag-orange-bg rounded-lg px-4 py-3">
            <Text size="small">
              <b>Kết luận:</b> {d.cause}
            </Text>
          </div>
        )}
      </div>
      {!!d.options?.length && (
        <div className="flex flex-col gap-y-2">
          <Text weight="plus">Phương án agent mô phỏng</Text>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Phương án</Table.HeaderCell>
                <Table.HeaderCell>Kết quả dự báo</Table.HeaderCell>
                <Table.HeaderCell>SLO</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {d.options.map((o) => (
                <Table.Row key={o.id}>
                  <Table.Cell>
                    <div className="flex flex-wrap items-center gap-1 py-1">
                      <Text size="small">{o.label}</Text>
                      {o.recommended && <Badge size="2xsmall" color="blue">Agent đề xuất</Badge>}
                      {d.chosen?.id === o.id && <Badge size="2xsmall" color="green">Đã duyệt {clock(d.chosen.at)}</Badge>}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="xsmall">
                      {o.coverage != null
                        ? `${Math.round(o.coverage * 100)}% khung giờ có freeship · ${Math.round(o.orders ?? 0).toLocaleString("vi-VN")} đơn`
                        : `${money(o.end_profit ?? 0)} lợi nhuận · ${money(o.gmv ?? 0)} GMV · ${Math.round(o.affected ?? 0).toLocaleString("vi-VN")} đơn bị ảnh hưởng`}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={o.meets ? "green" : "red"}>
                      {o.meets ? "Đạt" : "Không đạt"}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
      {d.verification && (
        <Text size="small" className={d.verification.ok ? "text-ui-tag-green-text" : "text-ui-fg-error"}>
          Kiểm chứng {clock(d.verification.t)}: {d.verification.text}
        </Text>
      )}
    </div>
  )
}

const FlashsreOpsPage = () => {
  const [runs, setRuns] = useState<Run<IncidentDossier>[]>([])
  const [lessons, setLessons] = useState<Run<Lesson>[]>([])
  const [selected, setSelected] = useState("")
  const [promos, setPromos] = useState<{ id: string; code: string; status: string }[]>([])
  const [promoId, setPromoId] = useState("")
  const [check, setCheck] = useState<Preflight | null>(null)

  const load = async () => {
    const [a, l, p] = await Promise.all([
      api<{ agent_runs: Run<IncidentDossier>[] }>("/admin/flashsre/agent-runs?limit=200"),
      api<{ agent_runs: Run<Lesson>[] }>("/admin/flashsre/agent-runs?contract_id=FLASHSRE-LESSONS&limit=50"),
      api<{ promotions: { id: string; code: string; status: string }[] }>("/admin/promotions?limit=200&fields=id,code,status&order=-created_at"),
    ])
    setRuns(a.agent_runs.filter((r) => r.finding_key.startsWith("incident:") && r.dossier?.series))
    setLessons(l.agent_runs.filter((r) => r.status === "lesson"))
    setPromos(p.promotions)
  }
  useEffect(() => {
    load().catch((e) => toast.error(e.message))
  }, [])

  // one row per incident (latest record of each), newest first
  const incidents = useMemo(() => {
    const seen = new Map<string, Run<IncidentDossier>>()
    for (const r of runs) {
      if (!seen.has(r.finding_key)) {
        seen.set(r.finding_key, r)
      }
    }
    return [...seen.values()]
  }, [runs])
  const latestLessons = useMemo(() => {
    const seen = new Map<string, Run<Lesson>>()
    for (const r of lessons) {
      if (!seen.has(r.finding_key)) {
        seen.set(r.finding_key, r)
      }
    }
    return [...seen.values()]
  }, [lessons])
  const current = incidents.find((r) => r.finding_key === selected) ?? incidents[0]

  const runCheck = async (id: string) => {
    setPromoId(id)
    setCheck(await api<Preflight>(`/admin/flashsre/preflight?promotion_id=${id}`))
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <Heading level="h1">FlashSRE Ops</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Benchmark kích hoạt agent, agent điều tra và đề xuất, người có thẩm quyền duyệt, agent kiểm chứng rồi ghi kinh nghiệm để kiểm tra voucher sau.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => load().catch((e) => toast.error(e.message))}>
          Tải lại
        </Button>
      </Container>

      <Section title="Sự cố kinh doanh" hint="Mỗi sự cố do một benchmark vượt ngưỡng mở ra; agent ghi lại số liệu, các bước điều tra và phương án">
        {incidents.length ? (
          <>
            <Select value={current?.finding_key} onValueChange={setSelected}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {incidents.map((r) => (
                  <Select.Item key={r.finding_key} value={r.finding_key}>
                    {r.title} · {timeAgo(r.created_at)} · {STATUS[r.status]?.label ?? r.status}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            {current && (
              <div className="flex items-center gap-x-2">
                <Badge color={STATUS[current.status]?.color ?? "grey"}>{STATUS[current.status]?.label ?? current.status}</Badge>
                <Text size="small" className="text-ui-fg-subtle">
                  {current.contract_id} · lần chạy {current.dossier.run}
                </Text>
              </div>
            )}
            {current && <IncidentView d={current.dossier} />}
          </>
        ) : (
          <Text size="small" className="text-ui-fg-muted">
            Chưa có sự cố. Chạy FlashSRE Ops (incidents/demo/ops/medusa-ops.mjs) để agent theo dõi chiến dịch.
          </Text>
        )}
      </Section>

      <Section title="Kinh nghiệm agent đã học" hint="Ghi sau mỗi sự cố đã kiểm chứng; dùng để kiểm tra voucher mới trước khi phát hành">
        {latestLessons.map(({ dossier: l, created_at }) => (
          <div key={l.id} className="border-ui-border-base flex flex-col gap-y-2 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text weight="plus">{l.title}</Text>
              <Badge size="2xsmall" color="red">
                {l.id}
              </Badge>
            </div>
            <Text size="xsmall" className="text-ui-fg-subtle">
              Học {timeAgo(created_at)} · từ sự cố phát hiện {l.incident?.detected}, khôi phục {l.incident?.recovered ?? "-"} · phương án {l.incident?.fix}
            </Text>
            {l.evidence.map((e) => (
              <Text key={e} size="small">
                · {e}
              </Text>
            ))}
            <div className="flex flex-wrap gap-1">
              {l.guardrails.map((g) => (
                <Badge key={g.id} size="2xsmall" color="blue">
                  {g.text}
                </Badge>
              ))}
            </div>
            <Text size="xsmall" className="text-ui-fg-muted font-mono">
              khớp khi: {l.facts.join(" + ")}
              {l.unless?.length ? ` · trừ khi: ${l.unless.join(", ")}` : ""} · benchmark gắn kèm: {l.benchmarks.join(", ")}
            </Text>
          </div>
        ))}
        {!latestLessons.length && (
          <Text size="small" className="text-ui-fg-muted">
            Chưa có kinh nghiệm nào.
          </Text>
        )}
      </Section>

      <Section title="Kiểm tra voucher trước khi phát hành" hint="Khi tạo promotion, middleware FlashSRE đối chiếu với kinh nghiệm và gắn kết quả vào header x-flashsre-preflight. Chọn một promotion để xem chi tiết.">
        <Select value={promoId} onValueChange={(v) => runCheck(v).catch((e) => toast.error(e.message))}>
          <Select.Trigger>
            <Select.Value placeholder="Chọn promotion" />
          </Select.Trigger>
          <Select.Content>
            {promos.map((p) => (
              <Select.Item key={p.id} value={p.id}>
                {p.code} · {p.status}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        {check && <PreflightView check={check} />}
      </Section>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "FlashSRE Ops",
  icon: Bolt,
})

export default FlashsreOpsPage
