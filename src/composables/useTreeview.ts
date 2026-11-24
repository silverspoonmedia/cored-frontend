import { ref, type Ref } from 'vue'
import type { NavNode } from '@/types'

/**
 * Treeview open/closed state — replaces AdminLTE's data-lte-toggle="treeview".
 * The vendor treeview uses data-accordion="false" which means multiple branches can be
 * open simultaneously (NOT accordion mode). We honour that: toggling one
 * branch does not close its siblings.
 */

// Track open node IDs in a Set for O(1) lookup.
const openNodes: Ref<Set<string>> = ref(new Set())

function collectActiveRouteNames(node: NavNode): string[] {
  const names: string[] = []
  if (node.route && node.route !== '#') names.push(node.route)
  for (const child of node.children) {
    names.push(...collectActiveRouteNames(child))
  }
  return names
}

function findAncestorIds(nodeId: string, tree: NavNode[], ancestors: string[] = []): string[] | null {
  for (const node of tree) {
    if (node.id === nodeId) return ancestors
    if (node.children.length > 0) {
      const found = findAncestorIds(nodeId, node.children, [...ancestors, node.id])
      if (found) return found
    }
  }
  return null
}

export function useTreeview() {
  function isOpen(id: string): boolean {
    return openNodes.value.has(id)
  }

  function toggle(id: string): void {
    const next = new Set(openNodes.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    openNodes.value = next
  }

  function open(id: string): void {
    if (openNodes.value.has(id)) return
    const next = new Set(openNodes.value)
    next.add(id)
    openNodes.value = next
  }

  /**
   * Auto-open ancestor branches of the active route so the active leaf
   * is visible on page load. Mirrors AdminLTE's menu-open-on-active behaviour.
   */
  function openActiveAncestors(tree: NavNode[], activeRouteName: string | null): void {
    if (!activeRouteName) return
    const targetId = findNodeIdByRoute(tree, activeRouteName)
    if (!targetId) return
    const ancestors = findAncestorIds(targetId, tree)
    if (!ancestors) return
    const next = new Set(openNodes.value)
    for (const ancestorId of ancestors) {
      next.add(ancestorId)
    }
    openNodes.value = next
  }

  function reset(): void {
    openNodes.value = new Set()
  }

  return { isOpen, toggle, open, openActiveAncestors, reset }
}

function findNodeIdByRoute(tree: NavNode[], routeName: string): string | null {
  for (const node of tree) {
    if (node.route === routeName) return node.id
    if (node.children.length > 0) {
      const found = findNodeIdByRoute(node.children, routeName)
      if (found) return found
    }
  }
  return null
}
