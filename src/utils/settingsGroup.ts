/**
 * Settings menu groups are an extension seam, not a core constant.
 *
 * The kernel backend ships the `platform` group; a product domain publishes its
 * own group through its settings contributor. The SPA mirrors that: a feature
 * calls `registerSettingsMenuGroup()` from its `boot()`, and the settings index
 * links to the product's form with the registered icon. Core never names a
 * product group.
 */
import type { RouteLocationNormalizedLoaded } from 'vue-router'

/** Groups the kernel itself renders typed routes for. */
export const CORE_SETTINGS_MENU_GROUPS = ['platform'] as const

const featureGroups = new Map<string, string>()
const icons = new Map<string, string>()

/**
 * Register a product settings group. `icon` is a Bootstrap Icons class used on
 * the settings index card (`bi-images`, …).
 */
export function registerSettingsMenuGroup(group: string, icon: string): void {
  featureGroups.set(group, icon)
  icons.set(group, icon)
}

/** Every settings group that has a typed `settings.<group>.view` route. */
export function settingsMenuGroups(): string[] {
  return [...CORE_SETTINGS_MENU_GROUPS, ...featureGroups.keys()]
}

export function isSettingsMenuGroup(value: string): boolean {
  return (CORE_SETTINGS_MENU_GROUPS as readonly string[]).includes(value) || featureGroups.has(value)
}

/** Icon override for a group; `undefined` means "use the core fallback". */
export function settingsMenuGroupIcon(group: string): string | undefined {
  return icons.get(group)
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
