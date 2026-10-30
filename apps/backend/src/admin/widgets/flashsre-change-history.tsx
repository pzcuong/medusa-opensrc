import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { api, ConfigChange, show, teamColor, timeAgo } from "../lib/flashsre"

type WidgetProps = { data: { id: string } }

// Shows on promotion / price list / campaign / product pages which team changed this object and how
const FlashsreChangeHistoryWidget = ({ data }: WidgetProps) => {
  const [changes, setChanges] = useState<ConfigChange[] | null>(null)

  useEffect(() => {
    api<{ config_changes: ConfigChange[] }>(`/admin/flashsre/config-changes?entity_id=${data.id}&limit=10`)
      .then((r) => setChanges(r.config_changes))
      .catch(() => setChanges([]))
  }, [data.id])

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">FlashSRE · Lịch sử thay đổi theo team</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Ai đã sửa đối tượng này, thuộc team nào, sửa trường gì
        </Text>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        {changes === null && <Text size="small">Đang tải...</Text>}
        {changes?.length === 0 && (
          <Text size="small" className="text-ui-fg-muted">
            Chưa có thay đổi nào được ghi nhận
          </Text>
        )}
        {changes?.map((c) => (
          <div key={c.id} className="flex flex-col gap-y-1">
            <Text size="small">
              <Badge size="2xsmall" color={teamColor(c.team)}>
                {c.team ?? "chưa gán team"}
              </Badge>{" "}
              {c.actor_email ?? "-"} · {timeAgo(c.created_at)}
            </Text>
            {(c.diff ?? []).slice(0, 4).map((d) => (
              <Text key={d.path} size="xsmall" className="font-mono break-all text-ui-fg-subtle">
                {d.path}: {show(d.before)} {"->"} {show(d.after)}
              </Text>
            ))}
            {(c.diff?.length ?? 0) > 4 && (
              <Text size="xsmall" className="text-ui-fg-muted">
                ... và {(c.diff?.length ?? 0) - 4} trường khác
              </Text>
            )}
          </div>
        ))}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: ["promotion.details.side", "price_list.details.side", "campaign.details.side", "product.details.side"],
})

export default FlashsreChangeHistoryWidget
