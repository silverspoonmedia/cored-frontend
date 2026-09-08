/** Literal dotted JSON key first, then nested walk — never stringify objects. */

function coerceLeaf(node: unknown, rt?: (message: string) => string): string | null {
  if (typeof node === 'string' && node.length > 0) {
    return node
  }

  if (node == null || typeof rt !== 'function') {
    return null
  }

  try {
    const text = rt(node as string)
    return typeof text === 'string' && text.length > 0 ? text : null
  } catch {
    return null
  }
}

export function lookupDotted(
  tree: unknown,
  key: string,
  rt?: (message: string) => string,
): string | null {
  if (!tree || typeof tree !== 'object' || Array.isArray(tree)) {
    return null
  }

  const record = tree as Record<string, unknown>
  if (key in record) {
    const fromDirect = coerceLeaf(record[key], rt)
    if (fromDirect) {
      return fromDirect
    }
  }

  let node: unknown = tree
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && !Array.isArray(node) && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part]
    } else {
      return null
    }
  }

  return coerceLeaf(node, rt)
}
