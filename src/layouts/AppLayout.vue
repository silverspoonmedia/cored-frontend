<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppNavbar from '@/components/AppNavbar.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { useNavigation } from '@/composables/useNavigation'
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
const { sidebarTree: tree, load, startRealtime: startNavRealtime, stopRealtime: stopNavRealtime } = useNavigation()
const { hydrateShell } = useShellHydrate()
const { breadcrumbs } = useBreadcrumbs()
const { pageTitle } = usePageTitle()
const { effective: themeEffective } = useTheme()

function syncActiveAncestors(name: string | null): void {
  if (!tree.value.length) return
  openActiveAncestors(tree.value, name)
}

onMounted(() => {
  initSidebar()
  // One batch seeds auth + sidebar/navbar trees + unread count; the
  // individual loaders below (and in AppNavbar) stay as no-op fallbacks for
  // whatever the batch did not seed.
  hydrateShell().then(() => load()).then(() => syncActiveAncestors(route.name as string | null))
  startNavRealtime()
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
              <nav aria-label="breadcrumb">
                <ol class="breadcrumb float-sm-end">
                  <li v-for="(crumb, idx) in breadcrumbs" :key="idx" class="breadcrumb-item" :class="{ active: idx === breadcrumbs.length - 1 }" :aria-current="idx === breadcrumbs.length - 1 ? 'page' : undefined">
                    <router-link v-if="crumb.routeName && idx < breadcrumbs.length - 1" :to="{ name: crumb.routeName }" class="text-decoration-none">{{ crumb.label }}</router-link>
                    <span v-else>{{ crumb.label }}</span>
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
      <div class="float-end d-none d-sm-inline">Monolith</div>
      <strong>{{ t('ui.copyright', { year: new Date().getFullYear() }) }}</strong> {{ t('ui.all_rights_reserved') }}
    </footer>
  </div>
</template>
