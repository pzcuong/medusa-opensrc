import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShieldCheck } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Label,
  Select,
  StatusBadge,
  Switch,
  Table,
  Tabs,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  api,
  CheckResult,
  CheckRun,
  ConfigChange,
  Contract,
  Finding,
  KIND_COLOR,
  KIND_LABEL,
  Me,
  show,
  TeamEntry,
  TeamUser,
  teamColor,
  timeAgo,
  vnd,
} from "../../lib/flashsre"
import { AgentRunsTab } from "../../components/agent-runs-tab"

const TeamBadge = ({ team }: { team: string | null | undefined }) => (
  <Badge size="2xsmall" color={teamColor(team)}>
    {team ?? "chưa gán team"}
  </Badge>
)

const StatCard = ({ label, value, hint }: { label: string; value: number | string; hint?: string }) => (
  <div className="shadow-elevation-card-rest bg-ui-bg-base rounded-lg px-4 py-3">
    <Text size="small" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Heading level="h2" className="mt-1">
      {value}
    </Heading>
    {hint && (
      <Text size="xsmall" className="text-ui-fg-muted">
        {hint}
      </Text>
    )}
  </div>
)

const DiffList = ({ diff }: { diff: ConfigChange["diff"] }) => (
  <div className="flex flex-col gap-y-1">
    {(diff ?? []).slice(0, 12).map((d) => (
      <Text key={d.path} size="xsmall" className="font-mono break-all">
        <span className="text-ui-fg-subtle">{d.path}</span>: <span className="text-ui-fg-error">{show(d.before)}</span>
        {" -> "}
        <span className="text-ui-fg-interactive">{show(d.after)}</span>
      </Text>
    ))}
    {!diff?.length && (
      <Text size="xsmall" className="text-ui-fg-muted">
        Không có khác biệt trên các trường được theo dõi
      </Text>
    )}
  </div>
)

const FindingDrawer = ({ finding, onClose }: { finding: Finding | null; onClose: () => void }) => (
  <Drawer open={!!finding} onOpenChange={(o) => !o && onClose()}>
    <Drawer.Content>
      <Drawer.Header>
        <Drawer.Title>
          {finding?.id} · {finding?.invariant}
        </Drawer.Title>
      </Drawer.Header>
      <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
        {finding && (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge color={KIND_COLOR[finding.kind]}>{KIND_LABEL[finding.kind]}</Badge>
              <Badge color={finding.severity === "high" ? "red" : "orange"}>mức {finding.severity}</Badge>
            </div>
            <Text weight="plus">{finding.title}</Text>
            <div>
              <Label>Team chịu trách nhiệm sửa</Label>
              <Text>{finding.fix_owner}</Text>
            </div>
            <div className="flex flex-col gap-y-1">
              <Label>Team liên quan</Label>
              <div className="flex flex-wrap gap-1">
                {finding.teams_involved.map((t) => (
                  <TeamBadge key={t} team={t} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contract yêu cầu</Label>
                <pre className="bg-ui-bg-subtle mt-1 rounded p-2 text-xs whitespace-pre-wrap">{JSON.stringify(finding.expected, null, 2)}</pre>
              </div>
              <div>
                <Label>Đang chạy thực tế</Label>
                <pre className="bg-ui-bg-subtle mt-1 rounded p-2 text-xs whitespace-pre-wrap">{JSON.stringify(finding.actual, null, 2)}</pre>
              </div>
            </div>
            <div className="flex flex-col gap-y-1">
              <Label>Đối tượng cấu hình</Label>
              {finding.entities.map((e) => (
                <Text key={`${e.type}-${e.id}`} size="small">
                  {e.type} <b>{e.label}</b> · chủ sở hữu: <TeamBadge team={e.owner_team} />
                </Text>
              ))}
            </div>
            <div className="flex flex-col gap-y-3">
              <Label>Thay đổi gần nhất trên các đối tượng này</Label>
              {finding.recent_changes.map((c) => (
                <div key={c.id} className="border-ui-border-base rounded border p-2">
                  <Text size="small">
                    <TeamBadge team={c.team} /> {c.actor_email} · {timeAgo(c.at)}
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-subtle font-mono">
                    {c.method} {c.route}
                  </Text>
                  <DiffList diff={c.diff} />
                </div>
              ))}
              {!finding.recent_changes.length && (
                <Text size="small" className="text-ui-fg-muted">
                  Chưa có thay đổi nào được ghi nhận
                </Text>
              )}
            </div>
          </>
        )}
      </Drawer.Body>
    </Drawer.Content>
  </Drawer>
)

const FlashsrePage = () => {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [contractId, setContractId] = useState<string>("")
  const [runs, setRuns] = useState<CheckRun[]>([])
  const [check, setCheck] = useState<CheckResult | null>(null)
  const [changes, setChanges] = useState<ConfigChange[]>([])
  const [teams, setTeams] = useState<TeamEntry[]>([])
  const [users, setUsers] = useState<TeamUser[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [mineOnly, setMineOnly] = useState(false)
  const [teamFilter, setTeamFilter] = useState("all")
  const [running, setRunning] = useState(false)
  const [openFinding, setOpenFinding] = useState<Finding | null>(null)
  const [openChange, setOpenChange] = useState<ConfigChange | null>(null)

  const loadAll = useCallback(async (cid: string) => {
    const [r, c, t] = await Promise.all([
      api<{ check_runs: CheckRun[] }>(`/admin/flashsre/check-runs?contract_id=${encodeURIComponent(cid)}&limit=30`),
      api<{ config_changes: ConfigChange[] }>("/admin/flashsre/config-changes?limit=200"),
      api<{ teams: TeamEntry[]; users: TeamUser[]; me: Me | null }>("/admin/flashsre/teams"),
    ])
    setRuns(r.check_runs)
    setCheck(r.check_runs[0]?.result ?? null)
    setChanges(c.config_changes)
    setTeams(t.teams)
    setUsers(t.users)
    setMe(t.me)
  }, [])

  useEffect(() => {
    api<{ contracts: Contract[] }>("/admin/flashsre/contracts")
      .then(({ contracts }) => {
        setContracts(contracts)
        if (contracts[0]) {
          setContractId(contracts[0].contract_id)
        }
      })
      .catch((e) => toast.error(e.message))
  }, [])

  useEffect(() => {
    if (contractId) {
      loadAll(contractId).catch((e) => toast.error(e.message))
    }
  }, [contractId, loadAll])

  const runCheck = async () => {
    setRunning(true)
    try {
      const { check } = await api<{ check: CheckResult }>(`/admin/flashsre/contracts/${contractId}/check`, { method: "POST" })
      toast.success(`Kiểm tra xong: ${check.summary.total} phát hiện`)
      await loadAll(contractId)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  const assignTeam = async (userId: string, team: string) => {
    try {
      await api("/admin/flashsre/teams/assign", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, team: team === "none" ? null : team }),
      })
      toast.success("Đã cập nhật team")
      await loadAll(contractId)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const myTeam = me?.team ?? null
  const findings = useMemo(() => {
    const all = check?.findings ?? []
    return mineOnly && myTeam
      ? all.filter((f) => f.teams_involved.includes(myTeam) || f.fix_owner.includes(myTeam))
      : all
  }, [check, mineOnly, myTeam])
  const visibleChanges = useMemo(
    () => changes.filter((c) => (teamFilter === "all" ? true : (c.team ?? "none") === teamFilter)),
    [changes, teamFilter]
  )
  const contract = contracts.find((c) => c.contract_id === contractId)
  const maxRun = Math.max(1, ...runs.map((r) => r.total))
  const byKind = check?.summary.by_kind ?? {}

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <Heading level="h1">FlashSRE · Trung tâm vận hành campaign</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Đối chiếu cấu hình của nhiều team với contract đã duyệt. Tự kiểm tra mỗi 5 phút.
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {me && (
            <Text size="small">
              {me.email} · <TeamBadge team={me.team ?? (me.is_platform_admin ? "platform admin" : null)} />
            </Text>
          )}
          <div className="w-64">
            <Select value={contractId} onValueChange={setContractId}>
              <Select.Trigger>
                <Select.Value placeholder="Chọn contract" />
              </Select.Trigger>
              <Select.Content>
                {contracts.map((c) => (
                  <Select.Item key={c.id} value={c.contract_id}>
                    {c.contract_id} v{c.version}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <Button size="small" onClick={runCheck} isLoading={running} disabled={!contractId}>
            Kiểm tra ngay
          </Button>
        </div>
      </Container>

      {!contracts.length && (
        <Container className="px-6 py-4">
          <Text>Chưa có contract nào. Đẩy contract qua POST /admin/flashsre/contracts.</Text>
        </Container>
      )}

      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Trigger value="overview">Tổng quan</Tabs.Trigger>
          <Tabs.Trigger value="findings">Phát hiện ({check?.summary.total ?? 0})</Tabs.Trigger>
          <Tabs.Trigger value="simulation">Mô phỏng giỏ hàng</Tabs.Trigger>
          <Tabs.Trigger value="changes">Nhật ký thay đổi</Tabs.Trigger>
          <Tabs.Trigger value="agent">Agent</Tabs.Trigger>
          <Tabs.Trigger value="teams">Team & tài khoản</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="mt-3 flex flex-col gap-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label="Tổng phát hiện" value={check?.summary.total ?? "-"} hint={check ? `kiểm tra ${timeAgo(check.checked_at)}` : undefined} />
            <StatCard label={KIND_LABEL.CROSS_TEAM_CONFLICT} value={byKind.CROSS_TEAM_CONFLICT ?? 0} hint="cần nhiều team cùng xử lý" />
            <StatCard label={KIND_LABEL.CONFIG_DRIFT} value={byKind.CONFIG_DRIFT ?? 0} hint="một team sửa lại cấu hình" />
            <StatCard label={KIND_LABEL.ENGINE_GAP} value={byKind.ENGINE_GAP ?? 0} hint="cần kỹ thuật, không sửa bằng config" />
            <StatCard label={KIND_LABEL.MISSING_CONFIG} value={byKind.MISSING_CONFIG ?? 0} />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Container className="px-6 py-4">
              <Heading level="h2">Việc theo team</Heading>
              <div className="mt-3 flex flex-col gap-y-2">
                {teams.map((t) => {
                  const toFix = (check?.findings ?? []).filter((f) => f.fix_owner.includes(t.key)).length
                  const involved = (check?.findings ?? []).filter((f) => f.teams_involved.includes(t.key)).length
                  return (
                    <div key={t.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamBadge team={t.key} />
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {t.description}
                        </Text>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge color={toFix ? "red" : "green"}>{toFix} cần sửa</StatusBadge>
                        <StatusBadge color={involved ? "orange" : "grey"}>{involved} liên quan</StatusBadge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Container>
            <Container className="px-6 py-4">
              <Heading level="h2">Lịch sử kiểm tra</Heading>
              <div className="mt-3 flex h-24 items-end gap-1">
                {[...runs].reverse().map((r) => (
                  <div
                    key={r.id}
                    title={`${new Date(r.created_at).toLocaleString("vi-VN")} · ${r.trigger} · ${r.total} phát hiện`}
                    className={r.total ? "bg-ui-tag-red-icon w-3 rounded-t" : "bg-ui-tag-green-icon w-3 rounded-t"}
                    style={{ height: `${Math.max(6, (r.total / maxRun) * 96)}px` }}
                  />
                ))}
              </div>
              <Text size="xsmall" className="text-ui-fg-muted mt-2">
                {runs.length} lần gần nhất · {contract ? `${contract.contract_id} v${contract.version}` : ""}
              </Text>
              <div className="mt-3 flex flex-col gap-y-1">
                {changes.slice(0, 5).map((c) => (
                  <Text key={c.id} size="xsmall">
                    <TeamBadge team={c.team} /> {c.actor_email} đổi {c.entity_type} <b>{c.entity_label}</b> · {timeAgo(c.created_at)}
                  </Text>
                ))}
              </div>
            </Container>
          </div>
        </Tabs.Content>

        <Tabs.Content value="findings" className="mt-3">
          <Container className="p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">Phát hiện từ lần kiểm tra gần nhất</Heading>
              {myTeam && (
                <div className="flex items-center gap-2">
                  <Switch id="mine" checked={mineOnly} onCheckedChange={setMineOnly} />
                  <Label htmlFor="mine">Chỉ việc của team {myTeam}</Label>
                </div>
              )}
            </div>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Loại</Table.HeaderCell>
                  <Table.HeaderCell>Phát hiện</Table.HeaderCell>
                  <Table.HeaderCell>Sửa bởi</Table.HeaderCell>
                  <Table.HeaderCell>Team liên quan</Table.HeaderCell>
                  <Table.HeaderCell>Thay đổi gần nhất</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {findings.map((f) => (
                  <Table.Row key={f.id} className="cursor-pointer" onClick={() => setOpenFinding(f)}>
                    <Table.Cell>
                      <Badge size="2xsmall" color={KIND_COLOR[f.kind]}>
                        {KIND_LABEL[f.kind]}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="max-w-[420px] whitespace-normal py-2">{f.title}</Table.Cell>
                    <Table.Cell>{f.fix_owner}</Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-wrap gap-1">
                        {f.teams_involved.map((t) => (
                          <TeamBadge key={t} team={t} />
                        ))}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {f.recent_changes[0] ? (
                        <Text size="xsmall">
                          <TeamBadge team={f.recent_changes[0].team} /> {timeAgo(f.recent_changes[0].at)}
                        </Text>
                      ) : (
                        "-"
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            {!findings.length && (
              <Text className="text-ui-fg-muted px-6 py-4">Không có phát hiện nào.</Text>
            )}
          </Container>
        </Tabs.Content>

        <Tabs.Content value="simulation" className="mt-3">
          <Container className="p-0">
            <div className="px-6 py-4">
              <Heading level="h2">Giỏ hàng SKU chủ lực chạy qua engine khuyến mãi thật</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Mỗi dòng là một SKU kết hợp một provider, dùng đủ các voucher trong contract. Không tạo cart thật.
              </Text>
            </div>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>SKU</Table.HeaderCell>
                  <Table.HeaderCell>Provider</Table.HeaderCell>
                  <Table.HeaderCell>Đơn giá</Table.HeaderCell>
                  <Table.HeaderCell>Voucher áp dụng</Table.HeaderCell>
                  <Table.HeaderCell>Phí ship / hỗ trợ</Table.HeaderCell>
                  <Table.HeaderCell>Khách trả</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {(check?.simulation ?? []).map((s) => (
                  <Table.Row key={`${s.sku}-${s.provider}`}>
                    <Table.Cell>{s.sku}</Table.Cell>
                    <Table.Cell>{s.provider_name}</Table.Cell>
                    <Table.Cell>{vnd(s.unit_price)}</Table.Cell>
                    <Table.Cell className="whitespace-normal">
                      {Object.entries(s.item_discounts).map(([code, amount]) => (
                        <div key={code}>
                          <Text size="xsmall">
                            {code} -{vnd(amount)}
                          </Text>
                        </div>
                      ))}
                      {!Object.keys(s.item_discounts).length && (
                        <Text size="xsmall" className="text-ui-fg-error">
                          không có voucher nào áp được
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {vnd(s.shipping_fee)} / <span className={s.shipping_support ? "" : "text-ui-fg-error"}>{vnd(s.shipping_support)}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <Text weight="plus">{vnd(s.customer_pays)}</Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Container>
        </Tabs.Content>

        <Tabs.Content value="changes" className="mt-3">
          <Container className="p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">Ai đã đổi gì</Heading>
              <div className="w-56">
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="all">Mọi team</Select.Item>
                    <Select.Item value="none">Chưa gán team</Select.Item>
                    {teams.map((t) => (
                      <Select.Item key={t.key} value={t.key}>
                        {t.key}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            </div>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Thời điểm</Table.HeaderCell>
                  <Table.HeaderCell>Team</Table.HeaderCell>
                  <Table.HeaderCell>Người sửa</Table.HeaderCell>
                  <Table.HeaderCell>Đối tượng</Table.HeaderCell>
                  <Table.HeaderCell>Thay đổi</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {visibleChanges.map((c) => (
                  <Table.Row key={c.id} className="cursor-pointer" onClick={() => setOpenChange(c)}>
                    <Table.Cell>{timeAgo(c.created_at)}</Table.Cell>
                    <Table.Cell>
                      <TeamBadge team={c.team} />
                    </Table.Cell>
                    <Table.Cell>{c.actor_email ?? "-"}</Table.Cell>
                    <Table.Cell>
                      {c.entity_type} <b>{c.entity_label}</b>
                    </Table.Cell>
                    <Table.Cell className="max-w-[360px] whitespace-normal">
                      <Text size="xsmall" className="font-mono">
                        {c.method === "DELETE" && !c.after ? "đã xóa" : `${c.diff?.length ?? 0} trường thay đổi`}
                        {c.diff?.[0] ? ` · ${c.diff[0].path}: ${show(c.diff[0].before)} -> ${show(c.diff[0].after)}` : ""}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Container>
          <Drawer open={!!openChange} onOpenChange={(o) => !o && setOpenChange(null)}>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>
                  {openChange?.entity_type} {openChange?.entity_label}
                </Drawer.Title>
              </Drawer.Header>
              <Drawer.Body className="flex flex-col gap-y-3 overflow-y-auto">
                {openChange && (
                  <>
                    <Text size="small">
                      <TeamBadge team={openChange.team} /> {openChange.actor_email} ·{" "}
                      {new Date(openChange.created_at).toLocaleString("vi-VN")}
                    </Text>
                    <Text size="xsmall" className="font-mono text-ui-fg-subtle">
                      {openChange.method} {openChange.route}
                    </Text>
                    <DiffList diff={openChange.diff} />
                  </>
                )}
              </Drawer.Body>
            </Drawer.Content>
          </Drawer>
        </Tabs.Content>

        <Tabs.Content value="agent" className="mt-3">
          <AgentRunsTab />
        </Tabs.Content>

        <Tabs.Content value="teams" className="mt-3 flex flex-col gap-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {teams.map((t) => (
              <Container key={t.key} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <TeamBadge team={t.key} />
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {t.members.length} thành viên
                  </Text>
                </div>
                <Text size="small" className="text-ui-fg-subtle mt-2">
                  {t.description}
                </Text>
                {t.members.map((m) => (
                  <Text key={m.id} size="xsmall" className="mt-1">
                    {m.email}
                  </Text>
                ))}
              </Container>
            ))}
          </div>
          <Container className="p-0">
            <div className="px-6 py-4">
              <Heading level="h2">Tài khoản</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {me?.is_platform_admin
                  ? "Bạn là platform admin: có thể gán người vào team."
                  : "Chỉ platform admin (không thuộc team nghiệp vụ) mới đổi được team."}
              </Text>
            </div>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Email</Table.HeaderCell>
                  <Table.HeaderCell>Team</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {users.map((u) => (
                  <Table.Row key={u.id}>
                    <Table.Cell>{u.email}</Table.Cell>
                    <Table.Cell>
                      {me?.is_platform_admin ? (
                        <div className="w-56">
                          <Select value={u.team ?? "none"} onValueChange={(v) => assignTeam(u.id, v)}>
                            <Select.Trigger>
                              <Select.Value />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="none">Platform admin (không team)</Select.Item>
                              {teams.map((t) => (
                                <Select.Item key={t.key} value={t.key}>
                                  {t.key}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select>
                        </div>
                      ) : (
                        <TeamBadge team={u.team} />
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Container>
        </Tabs.Content>
      </Tabs>

      <FindingDrawer finding={openFinding} onClose={() => setOpenFinding(null)} />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "FlashSRE",
  icon: ShieldCheck,
})

export default FlashsrePage
