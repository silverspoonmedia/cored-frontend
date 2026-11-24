<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppNavbar from '@/components/AppNavbar.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { useNavigation } from '@/composables/navigation/useNavigation'
import { useShellHydrate } from '@/composables/useShellHydrate'
import { useSidebar } from '@/composables/useSidebar'
import { useTreeview } from '@/composables/useTreeview'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import { usePageTitle } from '@/composables/usePageTitle'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const { t } = useI18n()
const { init: initSidebar, closeMobile, syncOverlayScrollbarTheme, destroyOverlayScrollbars } = useSidebar()
const { openActiveAncestors } = useTreeview()
const { sidebarTree: tree, load, isTreeLoaded, startRealtime: startNavRealtime, stopRealtime: stopNavRealtime } = useNavigation()
const { hydrateShell, isShellFallbackBlocked } = useShellHydrate()
const { breadcrumbs } = useBreadcrumbs()
const { pageTitle } = usePageTitle()
const { effective: themeEffective } = useTheme()

function syncActiveAncestors(name: string | null): void {
  if (!tree.value.length) return
  openActiveAncestors(tree.value, name)
}

onMounted(() => {
  initSidebar()
  // Join the shell batch (Navbar starts it). Fallback GET sidebar only when
  // the batch did not seed and the sub-entry was not a terminal 401/403/429.
  // Echo subscribe waits until after hydrate so POST /broadcasting/auth does
  // not race the batch cookie write (DevTools would label that as CORS).
  void (async () => {
    await hydrateShell()
    if (!isTreeLoaded('sidebar') && !isShellFallbackBlocked('sidebar')) {
      await load()
    }
    syncActiveAncestors(route.name as string | null)
    startNavRealtime()
  })()
})

onUnmounted(() => {
  destroyOverlayScrollbars()
  stopNavRealtime()
})

watch(
  () => route.name,
  (name) => {
    syncActiveAncestors(name as string | null)
    closeMobile()
  },
)

watch(tree, () => syncActiveAncestors(route.name as string | null))
watch(themeEffective, () => syncOverlayScrollbarTheme())
</script>

<template>
  <div class="app-wrapper">
    <AppNavbar />
    <AppSidebar />

    <main class="app-main" id="main-content">
      <div class="app-content-header">
        <div class="container-fluid">
          <div class="row align-items-center">
            <div class="col-sm-6">
              <h3 class="mb-0">{{ pageTitle }}</h3>
            </div>
            <div class="col-sm-6">
              <nav v-if="breadcrumbs.length" aria-label="breadcrumb">
                <ol class="breadcrumb float-sm-end">
                  <li v-for="(crumb, idx) in breadcrumbs" :key="idx" class="breadcrumb-item" :class="{ active: idx === breadcrumbs.length - 1 }" :aria-current="idx === breadcrumbs.length - 1 ? 'page' : undefined">
                    <router-link v-if="crumb.routeName && idx < breadcrumbs.length - 1" :to="{ name: crumb.routeName, params: crumb.params }" class="text-decoration-none">{{ crumb.label }}</router-link>
                    <span v-else :title="crumb.label">{{ crumb.label }}</span>
                  </li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div class="app-content">
        <div class="container-fluid">
          <router-view />
        </div>
      </div>
    </main>

    <footer class="app-footer">
      <div class="float-end d-none d-sm-inline">Cored</div>
      <strong>{{ t('ui.copyright', { year: new Date().getFullYear() }) }}</strong> {{ t('ui.all_rights_reserved') }}
    </footer>
  </div>
</template>
