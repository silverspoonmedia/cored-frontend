import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { settingsGroupFromRoute, settingsGroupLabelKey } from '@/utils/settingsGroup'
import {
  appendEntityCrumb,
  buildBreadcrumbChain,
  normalizeEntityLabel,
  paramKeysOf,
  pickParams,
  type BreadcrumbLocation,
  type BreadcrumbParams,
} from '@/utils/breadcrumb'

export interface BreadcrumbItem {
  label: string
  routeName?: string
  params?: BreadcrumbParams
}

/**
 * Entity title published by the active screen — the loaded record's name, never
 * the raw route param. `entityTitleOwner` marks which screen published it, so a
 * view being torn down cannot clear a title the incoming view already set.
 */
const entityTitle = ref<string | null>(null)
const entityTitlePath = ref<string | null>(null)
let entityTitleOwner: symbol | null = null

/**
 * Publish the current screen's record title as the trailing breadcrumb crumb.
 *
 * `source` returns the hydrated record's title (`null`/empty while loading or
 * when the record is missing), so the crumb appears only once a real name is
 * available. The label is re-read whenever the path or the title changes, and a
 * blank result clears the crumb. Call it from the view — see `docs/routes.md`.
 */
export function useBreadcrumbTitle(source: () => string | null | undefined): void {
  const route = useRoute()
  const owner = Symbol('breadcrumb-entity')
  const path = computed(() => route.path)

  function claim(label: string | null): void {
    entityTitleOwner = owner
    entityTitlePath.value = path.value
    entityTitle.value = label
  }

  // One watcher for both triggers: a new path (previous record's name must never
  // survive into the next screen) and a new title (record hydrated, or cleared on
  // load error). Re-reading the source on a path change matters for a view that
  // navigates to itself (canonicalizing its slug with `router.replace`, record
  // already loaded), where a path-only reset would blank the crumb for good.
  watch([path, source], () => claim(normalizeEntityLabel(source())), { immediate: true })

  onUnmounted(() => {
    if (entityTitleOwner !== owner) return

    entityTitleOwner = null
    entityTitlePath.value = null
    entityTitle.value = null
  })
}

/**
 * Breadcrumb items for the current route, root first.
 *
 * Static labels and parents come from `meta.titleKey` / `meta.breadcrumb` on the
 * route records (see `docs/routes.md`); the optional trailing crumb comes from
 * `useBreadcrumbTitle()` in the view.
 */
export function useBreadcrumbs() {
  const route = useRoute()
  const router = useRouter()
  const { t, locale } = useI18n()

  // Params each named route declares, so a parent link receives only what its own
  // path needs — forwarding the child's whole param bag makes vue-router warn
  // (`Discarded invalid param(s)`) on every navigation.
  const routeParamKeys = new Map<string, string[]>()
  for (const record of router.getRoutes()) {
    if (typeof record.name === 'string') routeParamKeys.set(record.name, paramKeysOf(record.path))
  }

  /**
   * Resolve a parent crumb by route name. The resolved location carries the
   * `meta` merged down its own `matched` chain (that is how a `.view` child
   * inherits its family record's `titleKey` / `breadcrumb`), plus that route's
   * params so the crumb stays a working link — `/apps/archivd/files/:id` needs
   * the `id` of the page we came from.
   */
  function resolveParent(name: string, params: BreadcrumbParams): BreadcrumbLocation | null {
    try {
      const resolved = router.resolve({
        name,
        params: pickParams(routeParamKeys.get(name) ?? [], params),
      })

      return {
        name: String(resolved.name ?? name),
        meta: resolved.meta,
        params: resolved.params,
      }
    } catch {
      // Unknown name (route drifted) or a param the current route cannot supply:
      // end the chain instead of throwing while rendering.
      return null
    }
  }

  const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    void locale.value
    const routeName = String(route.name ?? '')
    if (!routeName) return []

    const settingsGroup = settingsGroupFromRoute(route)
    if (settingsGroup && routeName.startsWith('settings.') && routeName !== 'settings.index.view') {
      return [
        { label: t('web.settings.title'), routeName: 'settings.index.view' },
        { label: t(settingsGroupLabelKey(settingsGroup)) },
      ]
    }

    const chain = buildBreadcrumbChain({
      start: { name: routeName, meta: route.meta, params: route.params },
      resolve: resolveParent,
    })

    const entity =
      entityTitle.value !== null && entityTitlePath.value === route.path
        ? { routeName, label: entityTitle.value }
        : null

    return appendEntityCrumb(chain, routeName, entity).map((crumb) => ({
      label: crumb.labelText ?? t(crumb.labelKey ?? ''),
      // The trailing crumb is never a link (AppLayout renders it as text anyway).
      routeName: crumb.routeName.length > 0 ? crumb.routeName : undefined,
      params: crumb.params,
    }))
  })

  return { breadcrumbs }
}
