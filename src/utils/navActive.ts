import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { NavNode } from '@/types'
import { settingsGroupFromRoute } from '@/utils/settingsGroup'

export function isNavNodeActive(node: NavNode, route: RouteLocationNormalizedLoaded): boolean {
  if (node.route && node.route !== '#') {
    if (route.name === node.route || route.name === `${node.route}.view`) return true

    if (node.route.startsWith('settings.')) {
      const wanted = node.route.replace(/^settings\./, '').replace(/\.view$/, '')
      if (wanted && wanted !== 'index' && settingsGroupFromRoute(route) === wanted) {
        return true
      }
    }
  }

  return node.children.some((child) => isNavNodeActive(child, route))
}
