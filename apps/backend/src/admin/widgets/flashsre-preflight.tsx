import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { api } from "../lib/flashsre"
import { Preflight, PreflightView } from "../components/preflight-view"

type WidgetProps = { data: { id: string } }

// On the promotion page: does this promotion repeat a configuration that caused an incident before
const FlashsrePreflightWidget = ({ data }: WidgetProps) => {
  const [check, setCheck] = useState<Preflight | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Preflight>(`/admin/flashsre/preflight?promotion_id=${data.id}`)
      .then(setCheck)
      .catch((e) => setError(e.message))
  }, [data.id])

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">FlashSRE · Kiểm tra theo kinh nghiệm</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Đối chiếu cấu hình voucher này với các sự cố agent đã xử lý
        </Text>
      </div>
      <div className="px-6 py-4">
        {error && (
          <Text size="small" className="text-ui-fg-error">
            {error}
          </Text>
        )}
        {!check && !error && <Text size="small">Đang kiểm tra...</Text>}
        {check && <PreflightView check={check} />}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "promotion.details.after",
})

export default FlashsrePreflightWidget
