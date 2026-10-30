export type DiffEntry = { path: string; before: unknown; after: unknown }

const NOISE_KEYS = new Set(["created_at", "updated_at", "deleted_at"])

// Array elements are keyed by a stable identity when they have one, so a reordered
// rule list does not show up as a change
function elementKey(el: unknown, index: number): string {
  if (el && typeof el === "object") {
    const o = el as Record<string, unknown>
    if (typeof o.attribute === "string") {
      return `[${o.attribute}]`
    }
    if (typeof o.id === "string") {
      return `[${o.id}]`
    }
  }
  return `[${index}]`
}

function flatten(value: unknown, path: string, out: Map<string, unknown>) {
  if (Array.isArray(value)) {
    if (value.every((v) => v === null || typeof v !== "object")) {
      out.set(path, [...value].map(String).sort().join(","))
      return
    }
    value.forEach((el, i) => flatten(el, `${path}${elementKey(el, i)}`, out))
    if (!value.length) {
      out.set(path, "[]")
    }
    return
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (NOISE_KEYS.has(k) || k.startsWith("raw_")) {
        continue
      }
      flatten(v, path ? `${path}.${k}` : k, out)
    }
    return
  }
  out.set(path, value)
}

export function diffEntities(before: unknown, after: unknown): DiffEntry[] {
  const a = new Map<string, unknown>()
  const b = new Map<string, unknown>()
  flatten(before ?? {}, "", a)
  flatten(after ?? {}, "", b)
  const paths = new Set([...a.keys(), ...b.keys()])
  const diff: DiffEntry[] = []
  for (const p of [...paths].sort()) {
    const x = a.get(p)
    const y = b.get(p)
    if (JSON.stringify(x) !== JSON.stringify(y)) {
      diff.push({ path: p, before: x ?? null, after: y ?? null })
    }
  }
  return diff
}
