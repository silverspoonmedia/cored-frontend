/**
 * Unwrap Monolith API envelope `{ data: { results, pagination } }` for Select2.
 *
 * Port of resources/js/select2-lookup.js — used by FormSelect2 processResults.
 */
export interface Select2Result {
  id: string | number
  text: string
  /** Top-level ancestor header label — used to build optgroups. */
  group?: string
  /** Direct parent label (id + type). */
  parent_text?: string | null
  /** Depth of the option in the tree (0 = top level). */
  level?: number
}

/** Select2 grouped result node — either a group container or a leaf option. */
export interface Select2GroupedResult {
  id?: string | number
  text: string
  level?: number
  children?: Select2GroupedResult[]
}

export interface Select2Paginated {
  results: Array<Select2Result | Select2GroupedResult>
  pagination: { more: boolean }
}

export function processLookupResults(data: unknown): Select2Paginated {
  const payload =
    data && typeof data === 'object' && 'data' in data && data.data != null
      ? (data as Record<string, unknown>).data
      : data
  const source = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}

  return {
    results: Array.isArray(source.results) ? (source.results as Array<Select2Result | Select2GroupedResult>) : [],
    pagination:
      source.pagination && typeof source.pagination === 'object'
        ? { more: Boolean((source.pagination as Record<string, unknown>).more) }
        : { more: false },
  }
}

/**
 * Group flat lookup results into Select2 `{ text, children }` nodes.
 *
 * Select2 only renders one level of grouping: top-level items become group
 * headers, deeper items keep their `level` so the component can indent them.
 * Groups are ordered by first appearance; ungrouped items stay top-level.
 */
export function groupFlatResults(results: Select2Result[]): Array<Select2Result | Select2GroupedResult> {
  const groups = new Map<string, Select2GroupedResult>()
  const output: Array<Select2Result | Select2GroupedResult> = []

  for (const result of results) {
    const level = typeof result.level === 'number' ? result.level : 0
    const groupLabel = result.group

    if (level === 0 || groupLabel == null) {
      output.push({ ...result, level })
      continue
    }

    let group = groups.get(groupLabel)
    if (!group) {
      group = { text: groupLabel, children: [] }
      groups.set(groupLabel, group)
      output.push(group)
    }
    group.children!.push({ id: result.id, text: result.text, level })
  }

  return output
}

/**
 * Flatten backend NESTED tree results into Select2 one-level grouping.
 *
 * Select2 only supports one level of `children` (HTML forbids nested
 * `<optgroup>`, and nested `children` beyond one level render broken —
 * unselectable options, scroll jumps). The backend `lookups/menus` payload
 * is a nested tree (one node per root menu, recursive `children`, `level`
 * per node). This converts it: each root becomes a `{ text, children }`
 * group whose first child is the root itself as a selectable leaf
 * (`level: 0`), followed by all descendants flattened recursively with
 * their backend `level` for indentation. Flat nodes without `children`
 * pass through untouched (legacy/compat).
 */
export function flattenTreeForSelect2(
  results: Array<Select2Result | Select2GroupedResult>,
): Array<Select2Result | Select2GroupedResult> {
  const output: Array<Select2Result | Select2GroupedResult> = []

  const pushDescendants = (node: Select2GroupedResult, target: Select2GroupedResult[]): void => {
    for (const child of node.children ?? []) {
      target.push({ id: child.id, text: child.text, level: child.level })
      pushDescendants(child, target)
    }
  }

  for (const node of results) {
    if (!('children' in node) || !Array.isArray(node.children) || node.children.length === 0) {
      // Flat leaf or empty group — pass through as-is.
      output.push(node)
      continue
    }

    const group: Select2GroupedResult = { text: node.text, children: [] }
    // Root itself must stay selectable: emit it as the group's first leaf.
    if (node.id !== undefined) {
      group.children!.push({ id: node.id, text: node.text, level: node.level ?? 0 })
    }
    pushDescendants(node, group.children!)
    output.push(group)
  }

  return output
}
