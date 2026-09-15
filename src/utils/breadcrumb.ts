/**
 * Pure breadcrumb resolution — no Vue, no router instance, no fetch.
 *
 * The route tree is the single source of truth: a route family declares
 * `meta.breadcrumb = { parent, labelKey? }` next to its `meta.titleKey`, and the
 * `.view` child inherits both (vue-router merges `meta` down the `matched`
 * chain, which is what the caller hands over here). A route that only needs a
 * parent declares nothing else, and a route with just a `titleKey` still renders
 * one crumb — which is what keeps new routes out of a central registry.
 *
 * The parent lookup is injected, so ordering, label fallback, cycle handling and
 * param filtering are all testable without a router. See `docs/routes.md`.
 */

/**
 * Declared shape of the `meta` keys read here. Deliberately loose (`unknown`) so
 * a `RouteMeta` value passes without a cast.
 */
export interface BreadcrumbMetaSource {
  titleKey?: unknown
  breadcrumb?: unknown
}

/** Normalized breadcrumb metadata (own record, or merged from the route chain). */
export interface BreadcrumbMeta {
  titleKey?: string
  parent?: string
  labelKey?: string
}

/** A location the chain can start from or walk up to. */
export interface BreadcrumbLocation {
  name: string
  meta: BreadcrumbMetaSource
  params: BreadcrumbParams
}

/** Route params, structurally compatible with vue-router's `RouteParamsGeneric`. */
export type BreadcrumbParams = Record<string, string | string[]>

/** One rendered crumb. `labelText` wins over `labelKey` when present. */
export interface BreadcrumbCrumb {
  routeName: string
  labelKey?: string
  labelText?: string
  params?: BreadcrumbParams
}

/** Resolves a parent route name into a location, or null when it cannot. */
export type BreadcrumbResolver = (name: string, params: BreadcrumbParams) => BreadcrumbLocation | null

/** Guard against a `parent` cycle or a pathologically long chain. */
export const BREADCRUMB_MAX_DEPTH = 10

const PARAM_RE = /:([A-Za-z0-9_]+)/g

/** Read the breadcrumb-relevant keys out of a (possibly merged) `meta`. */
export function readBreadcrumbMeta(meta: BreadcrumbMetaSource | undefined): BreadcrumbMeta {
  const out: BreadcrumbMeta = {}

  if (typeof meta?.titleKey === 'string' && meta.titleKey.length > 0) {
    out.titleKey = meta.titleKey
  }

  const breadcrumb = meta?.breadcrumb
  if (breadcrumb && typeof breadcrumb === 'object') {
    const parent = (breadcrumb as { parent?: unknown }).parent
    const labelKey = (breadcrumb as { labelKey?: unknown }).labelKey
    if (typeof parent === 'string' && parent.length > 0) out.parent = parent
    if (typeof labelKey === 'string' && labelKey.length > 0) out.labelKey = labelKey
  }

  return out
}

/**
 * Label for a crumb: an explicit `breadcrumb.labelKey` wins, otherwise the
 * record's `titleKey` is reused. That reuse is what removed the duplicated label
 * entries the old central map carried.
 */
export function breadcrumbLabelKey(meta: BreadcrumbMetaSource | undefined): string | null {
  const read = readBreadcrumbMeta(meta)
  return read.labelKey ?? read.titleKey ?? null
}

/**
 * Normalize a published entity title: trim it and treat blank/non-string values
 * as "nothing to show". Kept here (not in the composable) so the rule that a
 * crumb never renders an empty or whitespace-only label stays unit-tested.
 */
export function normalizeEntityLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const label = value.trim()
  return label.length > 0 ? label : null
}

/** Param names declared in a route path (`/apps/users/:id/edit` -> `['id']`). */
export function paramKeysOf(path: string): string[] {
  const keys: string[] = []
  for (const match of path.matchAll(PARAM_RE)) {
    const key = match[1]
    if (key && !keys.includes(key)) keys.push(key)
  }
  return keys
}

/**
 * Keep only the params a target route declares.
 *
 * Forwarding the child's whole param bag to a param-less parent is harmless but
 * makes vue-router warn (`Discarded invalid param(s)`) on every navigation.
 */
export function pickParams(paramKeys: readonly string[], params: BreadcrumbParams): BreadcrumbParams {
  const picked: BreadcrumbParams = {}
  for (const key of paramKeys) {
    const value = params[key]
    if (value !== undefined) picked[key] = value
  }
  return picked
}

/**
 * Chain a location to its declared ancestors, root first.
 *
 * A crumb is emitted only when it resolves to a label, so a route that declares
 * neither `breadcrumb` nor `titleKey` contributes nothing while its parents still
 * render. A parent the resolver cannot produce (missing param, unknown name) ends
 * the chain instead of throwing. Cycles and runaway chains stop at `maxDepth`.
 */
export function buildBreadcrumbChain(options: {
  start: BreadcrumbLocation
  resolve: BreadcrumbResolver
  maxDepth?: number
}): BreadcrumbCrumb[] {
  const { start, resolve, maxDepth = BREADCRUMB_MAX_DEPTH } = options

  const chain: BreadcrumbCrumb[] = []
  const visited = new Set<string>()
  let current: BreadcrumbLocation | null = start
  let depth = 0

  while (current && depth < maxDepth) {
    if (current.name.length > 0) {
      if (visited.has(current.name)) break
      visited.add(current.name)
    }

    const meta = readBreadcrumbMeta(current.meta)
    const labelKey = meta.labelKey ?? meta.titleKey

    if (labelKey) {
      chain.unshift({ routeName: current.name, labelKey, params: current.params })
    }

    if (!meta.parent) break

    current = resolve(meta.parent, current.params)
    depth += 1
  }

  return chain
}

/**
 * Append the entity title as a trailing, non-link crumb.
 *
 * Only when the title was published for the route being rendered and a static
 * crumb already exists: a lone entity crumb would have no context, and a raw id
 * (record not loaded yet) must never be rendered.
 */
export function appendEntityCrumb(
  crumbs: readonly BreadcrumbCrumb[],
  currentName: string,
  entity: { routeName: string; label: string } | null,
): BreadcrumbCrumb[] {
  const out = [...crumbs]

  if (!entity || entity.routeName !== currentName || out.length === 0) return out

  const label = entity.label.trim()
  if (label.length === 0) return out

  out.push({ routeName: '', labelText: label })
  return out
}
