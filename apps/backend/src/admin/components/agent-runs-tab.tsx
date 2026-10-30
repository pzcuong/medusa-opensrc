import { Badge, Container, Drawer, Heading, Label, Select, Table, Text } from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { api, teamColor, timeAgo } from "../lib/flashsre"

type Test = {
  id: string
  summary: string
  resolves_target: boolean
  preserves: boolean
  fully_clean: boolean
  new_keys: string[]
  patches: Record<string, unknown>[]
}

export type AgentRun = {
  id: string
  created_at: string
  contract_id: string
  title: string
  verdict: string
  confidence: number
  status: string
  llm: string
  dossier: {
    debate: { analyst: string; engineer: string; judge: { verdict: string; reason?: string; guarded?: boolean } }
    tests: Test[]
    chosen_fix: { summary: string; patches: Record<string, unknown>[]; caused_by: string[]; fully_clean: boolean } | null
    authority: string
    approvers: string[]
    consequences?: string[]
    affected_contracts?: string[]
    evidence: {
      contract_changes?: { contract_id: string; from: number; to: number }[]
      changes: { id: string; at: string; team: string | null; actor_email: string | null; method: string; entity: string; diff: { path: string; before: unknown; after: unknown }[] }[]
    }
  }
}

export const VERDICT: Record<string, { label: string; color: "orange" | "red" | "blue" | "purple" | "grey" }> = {
  BUSINESS_MISCONFIG: { label: "Lỗi cấu hình nghiệp vụ", color: "orange" },
  CROSS_TEAM_CONTRADICTION: { label: "Mâu thuẫn liên team", color: "red" },
  CONTRACT_CONFLICT: { label: "Mâu thuẫn contract", color: "blue" },
  CONTRACT_GAP: { label: "Contract chưa quy định", color: "blue" },
  UNATTRIBUTED_CHANGE: { label: "Đổi ngoài luồng, không rõ ai", color: "purple" },
  ENGINE_OR_BACKEND: { label: "Engine / backend", color: "purple" },
  NO_ISSUE: { label: "Không có lỗi", color: "grey" },
}

const AUTHORITY: Record<string, string> = {
  AUTO_ELIGIBLE: "Đủ điều kiện tự động",
  NEEDS_APPROVAL: "Cần phê duyệt",
  ESCALATE: "Chuyển người phụ trách",
}

const yes = (b: boolean) => (b ? "có" : "không")
const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v))

// Agent investigations: verdict after the three-role debate, the sandbox-tested fix and who must approve it
export const AgentRunsTab = () => {
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [filter, setFilter] = useState("all")
  const [open, setOpen] = useState<AgentRun | null>(null)

  useEffect(() => {
    // incident and lesson records from FlashSRE Ops have their own page; this tab shows contract debates only
    api<{ agent_runs: AgentRun[] }>("/admin/flashsre/agent-runs?limit=200").then((r) => setRuns(r.agent_runs.filter((x) => x.dossier?.debate))).catch(() => setRuns([]))
  }, [])

  const visible = useMemo(() => runs.filter((r) => filter === "all" || r.verdict === filter), [runs, filter])
  const counts = useMemo(() => runs.reduce<Record<string, number>>((m, r) => ({ ...m, [r.verdict]: (m[r.verdict] ?? 0) + 1 }), {}), [runs])

  return (
    <div className="flex flex-col gap-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {Object.entries(VERDICT).map(([k, v]) => (
          <div key={k} className="shadow-elevation-card-rest bg-ui-bg-base rounded-lg px-4 py-3">
            <Badge size="2xsmall" color={v.color}>{v.label}</Badge>
            <Heading level="h2" className="mt-1">{counts[k] ?? 0}</Heading>
          </div>
        ))}
      </div>
      <Container className="p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">Hồ sơ điều tra của agent</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Phát hiện, tranh luận Business Analyst / Platform Engineer / Judge, kiểm chứng bản sửa trong sandbox
            </Text>
          </div>
          <div className="w-64">
            <Select value={filter} onValueChange={setFilter}>
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                <Select.Item value="all">Mọi phán quyết</Select.Item>
                {Object.entries(VERDICT).map(([k, v]) => (
                  <Select.Item key={k} value={k}>{v.label}</Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Phán quyết</Table.HeaderCell>
              <Table.HeaderCell>Sự cố</Table.HeaderCell>
              <Table.HeaderCell>Đề xuất (đã chạy sandbox)</Table.HeaderCell>
              <Table.HeaderCell>Quyền</Table.HeaderCell>
              <Table.HeaderCell>Lúc</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {visible.map((r) => (
              <Table.Row key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
                <Table.Cell>
                  <Badge size="2xsmall" color={VERDICT[r.verdict]?.color ?? "grey"}>{VERDICT[r.verdict]?.label ?? r.verdict}</Badge>
                </Table.Cell>
                <Table.Cell className="max-w-[380px] whitespace-normal py-2">
                  <Text size="small">{r.title}</Text>
                  <Text size="xsmall" className="text-ui-fg-muted">{r.contract_id}</Text>
                </Table.Cell>
                <Table.Cell className="max-w-[320px] whitespace-normal">
                  <Text size="xsmall">{r.dossier.chosen_fix?.summary ?? "Không có, chuyển người phụ trách"}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="xsmall">{AUTHORITY[r.dossier.authority] ?? r.dossier.authority}</Text>
                  <div className="flex flex-wrap gap-1">
                    {r.dossier.approvers.map((t) => (
                      <Badge key={t} size="2xsmall" color={teamColor(t)}>{t}</Badge>
                    ))}
                  </div>
                </Table.Cell>
                <Table.Cell>{timeAgo(r.created_at)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {!visible.length && <Text className="text-ui-fg-muted px-6 py-4">Chưa có hồ sơ nào.</Text>}
      </Container>

      <Drawer open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{open?.title}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
            {open && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={VERDICT[open.verdict]?.color ?? "grey"}>{VERDICT[open.verdict]?.label ?? open.verdict}</Badge>
                  <Text size="small">
                    tin cậy {open.confidence} · {(open.dossier.affected_contracts?.length ?? 0) > 1 ? `ảnh hưởng ${open.dossier.affected_contracts!.join(", ")}` : open.contract_id} · {open.llm}
                  </Text>
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label>Business Analyst (buộc tội: lỗi cấu hình nghiệp vụ)</Label>
                  <Text size="small">{open.dossier.debate.analyst}</Text>
                  <Label>Platform Engineer (phản biện: engine/BE, đúng contract, contract mơ hồ)</Label>
                  <Text size="small">{open.dossier.debate.engineer}</Text>
                  <Label>Judge</Label>
                  <Text size="small">
                    {open.dossier.debate.judge?.reason ?? ""}
                    {open.dossier.debate.judge?.guarded ? " (phán quyết LLM bị chặn vì chưa qua phép thử nhân quả)" : ""}
                  </Text>
                </div>
                <div>
                  <Label>Phép thử trong sandbox</Label>
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Phương án</Table.HeaderCell>
                        <Table.HeaderCell>Hết lỗi</Table.HeaderCell>
                        <Table.HeaderCell>Giữ ưu đãi hợp lệ</Table.HeaderCell>
                        <Table.HeaderCell>Sạch hoàn toàn</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {open.dossier.tests.map((t) => (
                        <Table.Row key={t.id}>
                          <Table.Cell className="max-w-[300px] whitespace-normal"><Text size="xsmall">{t.summary}</Text></Table.Cell>
                          <Table.Cell>{yes(t.resolves_target)}</Table.Cell>
                          <Table.Cell>{yes(t.preserves)}</Table.Cell>
                          <Table.Cell>{yes(t.fully_clean)}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
                <div>
                  <Label>Đề xuất</Label>
                  <Text size="small">{open.dossier.chosen_fix?.summary ?? "Không có phương án đạt, chuyển người phụ trách"}</Text>
                  {open.dossier.chosen_fix && (
                    <pre className="bg-ui-bg-subtle mt-1 rounded p-2 text-xs whitespace-pre-wrap">{JSON.stringify(open.dossier.chosen_fix.patches, null, 2)}</pre>
                  )}
                  <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                    {AUTHORITY[open.dossier.authority] ?? open.dossier.authority} · duyệt: {open.dossier.approvers.join(", ") || "-"}
                  </Text>
                </div>
                {!!open.dossier.evidence.contract_changes?.length && (
                  <div>
                    <Label>Contract đã đổi kể từ mốc</Label>
                    {open.dossier.evidence.contract_changes.map((c) => (
                      <Text key={c.contract_id} size="xsmall">{c.contract_id}: v{c.from} {"->"} v{c.to}</Text>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-y-2">
                  <Label>Bằng chứng: thay đổi cấu hình kể từ mốc</Label>
                  {open.dossier.evidence.changes.map((c) => (
                    <div key={c.id} className="border-ui-border-base rounded border p-2">
                      <Text size="xsmall">
                        <Badge size="2xsmall" color={teamColor(c.team)}>{c.team ?? "chưa gán team"}</Badge> {c.actor_email} · {c.method} {c.entity}
                      </Text>
                      {c.diff.slice(0, 5).map((d) => (
                        <Text key={d.path} size="xsmall" className="font-mono break-all text-ui-fg-subtle">
                          {d.path}: {show(d.before)} {"->"} {show(d.after)}
                        </Text>
                      ))}
                    </div>
                  ))}
                  {!open.dossier.evidence.changes.length && <Text size="xsmall" className="text-ui-fg-muted">Không có thay đổi cấu hình nào</Text>}
                </div>
              </>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    </div>
  )
}
