import type { RouteLocationNormalizedLoaded } from 'vue-router'

export const SETTINGS_MENU_GROUPS = ['platform', 'archivd', 'microstock', 'vtual'] as const

export type SettingsMenuGroup = (typeof SETTINGS_MENU_GROUPS)[number]

export function isSettingsMenuGroup(value: string): value is SettingsMenuGroup {
  return (SETTINGS_MENU_GROUPS as readonly string[]).includes(value)
}

export function settingsGroupFromRoute(
  route: Pick<RouteLocationNormalizedLoaded, 'name' | 'params'>,
): string {
  const param = route.params.group
  if (typeof param === 'string' && param.length > 0) return param

  const name = String(route.name ?? '')
  const rest = name.replace(/^settings\./, '').replace(/\.view$/, '')
  if (rest && rest !== 'index' && rest !== 'group') return rest

  return ''
}

export function settingsGroupLabelKey(group: string): string {
  return `web.settings.groups.${group.replace(/-/g, '_')}`
}
