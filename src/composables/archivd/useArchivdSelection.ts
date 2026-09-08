/**
 * Drive-like selection helpers for Archivd browse.
 * Keys: "file:{uuid}" | "folder:{uuid}".
 */

export function listingKeys(
  folders: Array<{ id: string }> = [],
  files: Array<{ id: string }> = [],
): string[] {
  return [
    ...folders.map((f) => `folder:${f.id}`),
    ...files.map((f) => `file:${f.id}`),
  ]
}

export function rangeKeys(ordered: string[], fromKey: string | null, toKey: string): string[] {
  if (!Array.isArray(ordered) || ordered.length === 0) {
    return toKey ? [toKey] : []
  }
  const toIdx = ordered.indexOf(toKey)
  if (toIdx < 0) {
    return toKey ? [toKey] : []
  }
  const fromIdx = fromKey ? ordered.indexOf(fromKey) : toIdx
  if (fromIdx < 0) {
    return [toKey]
  }
  const start = Math.min(fromIdx, toIdx)
  const end = Math.max(fromIdx, toIdx)

  return ordered.slice(start, end + 1)
}

export function applyBrowseClick(opts: {
  key: string
  event: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }
  selected: Iterable<string>
  anchorKey: string | null
  orderedKeys: string[]
}): { next: Set<string>; anchorKey: string | null } {
  const cur = opts.selected instanceof Set ? opts.selected : new Set(opts.selected || [])
  const shift = !!opts.event?.shiftKey
  const toggle = !!(opts.event?.ctrlKey || opts.event?.metaKey)

  if (shift) {
    const keys = rangeKeys(opts.orderedKeys, opts.anchorKey || opts.key, opts.key)
    return { next: new Set(keys), anchorKey: opts.anchorKey || opts.key }
  }

  if (toggle) {
    const next = new Set(cur)
    if (next.has(opts.key)) {
      next.delete(opts.key)
    } else {
      next.add(opts.key)
    }
    return { next, anchorKey: opts.key }
  }

  return { next: new Set([opts.key]), anchorKey: opts.key }
}

export function idsByEntity(keys: Iterable<string>): { file: string[]; folder: string[] } {
  const out = { file: [] as string[], folder: [] as string[] }
  for (const key of keys) {
    const [type, id] = String(key).split(':')
    if ((type === 'file' || type === 'folder') && id) {
      out[type].push(id)
    }
  }
  return out
}
