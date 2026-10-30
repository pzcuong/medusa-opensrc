import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FLASHSRE_MODULE } from "../../../../modules/flashsre"
import FlashsreModuleService from "../../../../modules/flashsre/service"
import type { GetMetricsType } from "../validators"

type Row = Record<string, any>

const esc = (v: unknown) => String(v ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")

class Gauge {
  private values = new Map<string, number>()
  constructor(public name: string, public help: string) {}
  inc(labels: Record<string, unknown>, by = 1) {
    const key = Object.entries(labels).map(([k, v]) => `${k}="${esc(v)}"`).join(",")
    this.values.set(key, (this.values.get(key) ?? 0) + by)
  }
  render() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`]
    for (const [k, v] of this.values) {
      lines.push(`${this.name}{${k}} ${v}`)
    }
    return lines.join("\n")
  }
}

// Business metrics over a sliding window, in Prometheus text format, for alerting and FlashSRE
export async function GET(req: AuthenticatedMedusaRequest<unknown, GetMetricsType>, res: MedusaResponse) {
  const windowHours = req.validatedQuery.window_hours ?? 24
  const since = new Date(Date.now() - windowHours * 3600e3)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const flashsre: FlashsreModuleService = req.scope.resolve(FLASHSRE_MODULE)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id", "currency_code", "total", "items.adjustments.code", "items.adjustments.amount",
      "shipping_methods.shipping_option_id", "shipping_methods.amount",
      "shipping_methods.adjustments.code", "shipping_methods.adjustments.amount",
    ],
    filters: { created_at: { $gte: since } },
  })
  const { data: options } = await query.graph({ entity: "shipping_option", fields: ["id", "type.code"] })
  const providerOf = new Map<string, string>(options.map((o: Row) => [o.id, o.type?.code ?? "unknown"]))
  const changes = await flashsre.listConfigChanges({ created_at: { $gte: since } }, { take: 5000 })

  const ordersTotal = new Gauge("flashsre_orders_total", "Orders placed in the window")
  const promoOrders = new Gauge("flashsre_promo_orders_total", "Orders carrying at least one adjustment of the code")
  const promoAmount = new Gauge("flashsre_promo_discount_amount", "Item discount amount by code")
  const shipOrders = new Gauge("flashsre_shipping_orders_total", "Orders by provider and whether shipping got subsidised")
  const shipSubsidy = new Gauge("flashsre_shipping_subsidy_amount", "Shipping subsidy amount by provider")
  const configChanges = new Gauge("flashsre_config_changes_total", "Admin configuration changes by team and entity")

  for (const o of orders as Row[]) {
    const currency = o.currency_code
    ordersTotal.inc({ currency })
    const codes = new Map<string, number>()
    for (const item of o.items ?? []) {
      for (const a of item.adjustments ?? []) {
        codes.set(a.code, (codes.get(a.code) ?? 0) + Number(a.amount))
      }
    }
    for (const [code, amount] of codes) {
      promoOrders.inc({ code, currency })
      promoAmount.inc({ code, currency }, amount)
    }
    for (const sm of o.shipping_methods ?? []) {
      const provider = providerOf.get(sm.shipping_option_id) ?? "unknown"
      const subsidy = (sm.adjustments ?? []).reduce((s: number, a: Row) => s + Number(a.amount), 0)
      shipOrders.inc({ provider, currency, freeship: subsidy > 0 ? "true" : "false" })
      shipSubsidy.inc({ provider, currency }, subsidy)
    }
  }
  for (const c of changes) {
    configChanges.inc({ team: c.team ?? "unassigned", entity_type: c.entity_type })
  }

  res.setHeader("Content-Type", "text/plain; version=0.0.4")
  res.send(
    [ordersTotal, promoOrders, promoAmount, shipOrders, shipSubsidy, configChanges].map((g) => g.render()).join("\n\n") +
      `\n\n# window_hours ${windowHours}\n`
  )
}
