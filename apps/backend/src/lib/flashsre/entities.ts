import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type AuditedEntitySpec = {
  prefix: string
  entity: string
  responseKey: string
  fields: string[]
  label: (e: Record<string, any>) => string | null
}

// Admin routes whose writes are audited; each maps to the business entity it changes
export const AUDITED_ENTITIES: AuditedEntitySpec[] = [
  {
    prefix: "/admin/promotions",
    entity: "promotion",
    responseKey: "promotion",
    fields: [
      "id", "code", "status", "is_automatic", "campaign_id",
      "rules.attribute", "rules.operator", "rules.values.value",
      "application_method.type", "application_method.value", "application_method.currency_code",
      "application_method.target_type", "application_method.allocation", "application_method.max_quantity",
      "application_method.target_rules.attribute", "application_method.target_rules.operator",
      "application_method.target_rules.values.value",
    ],
    label: (e) => e.code ?? null,
  },
  {
    prefix: "/admin/campaigns",
    entity: "campaign",
    responseKey: "campaign",
    fields: [
      "id", "name", "campaign_identifier", "starts_at", "ends_at",
      "budget.type", "budget.limit", "budget.used", "budget.currency_code",
    ],
    label: (e) => e.campaign_identifier ?? null,
  },
  {
    prefix: "/admin/price-lists",
    entity: "price_list",
    responseKey: "price_list",
    fields: [
      "id", "title", "status", "type", "starts_at", "ends_at",
      "prices.amount", "prices.currency_code", "prices.price_set_id",
    ],
    label: (e) => e.title ?? null,
  },
  {
    prefix: "/admin/shipping-option-types",
    entity: "shipping_option_type",
    responseKey: "shipping_option_type",
    fields: ["id", "code", "label"],
    label: (e) => e.code ?? null,
  },
  {
    prefix: "/admin/shipping-options",
    entity: "shipping_option",
    responseKey: "shipping_option",
    fields: [
      "id", "name", "price_type", "provider_id", "service_zone_id", "shipping_option_type_id",
      "type.code", "prices.amount", "prices.currency_code",
    ],
    label: (e) => e.name ?? null,
  },
  {
    prefix: "/admin/products",
    entity: "product",
    responseKey: "product",
    fields: [
      "id", "title", "handle", "status", "collection_id", "variants.id", "variants.sku", "variants.title",
      "categories.id", "categories.handle", "tags.id", "tags.value",
    ],
    label: (e) => e.handle ?? null,
  },
  {
    prefix: "/admin/customer-groups",
    entity: "customer_group",
    responseKey: "customer_group",
    fields: ["id", "name"],
    label: (e) => e.name ?? null,
  },
  {
    prefix: "/admin/product-categories",
    entity: "product_category",
    responseKey: "product_category",
    fields: ["id", "name", "handle", "parent_category_id", "products.id"],
    label: (e) => e.handle ?? null,
  },
  {
    prefix: "/admin/collections",
    entity: "product_collection",
    responseKey: "collection",
    fields: ["id", "title", "handle", "products.id"],
    label: (e) => e.handle ?? null,
  },
  {
    prefix: "/admin/product-tags",
    entity: "product_tag",
    responseKey: "product_tag",
    fields: ["id", "value"],
    label: (e) => e.value ?? null,
  },
]

export const AUDITED_ROUTE_MATCHER =
  /^\/admin\/(promotions|campaigns|price-lists|shipping-option-types|shipping-options|products|customer-groups|product-categories|collections|product-tags)(\/|$|\?)/

export function findAuditedSpec(path: string): AuditedEntitySpec | undefined {
  return AUDITED_ENTITIES.find((s) => path === s.prefix || path.startsWith(`${s.prefix}/`))
}

// "/admin/promotions/promo_1/rules/batch" -> "promo_1"; "/admin/promotions" -> null
export function extractEntityId(path: string, prefix: string): string | null {
  const segment = path.slice(prefix.length).split("/").filter(Boolean)[0]
  return segment && segment.includes("_") ? segment : null
}

export function isRootEntityPath(path: string, prefix: string): boolean {
  return path.slice(prefix.length).split("/").filter(Boolean).length <= 1
}

export async function loadEntity(
  container: MedusaContainer,
  spec: AuditedEntitySpec,
  id: string
): Promise<Record<string, any> | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: spec.entity, fields: spec.fields, filters: { id } })
  return (data?.[0] as Record<string, any>) ?? null
}
