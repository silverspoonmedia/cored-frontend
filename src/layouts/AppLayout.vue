<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppNavbar from '@/components/AppNavbar.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppAlert from '@/components/AppAlert.vue'
import { useNavigation } from '@/composables/useNavigation'
import { useSidebar } from '@/composables/useSidebar'
import { useTreeview } from '@/composables/useTreeview'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'

defineProps<{
  title?: string
}>()

const route = useRoute()
const { t } = useI18n()
const { init: initSidebar, closeMobile } = useSidebar()
const { openActiveAncestors } = useTreeview()
const { tree, load } = useNavigation()
const { breadcrumbs } = useBreadcrumbs()

function syncActiveAncestors(name: string | null): void {
  if (!tree.value.length) return
  openActiveAncestors(tree.value, name)
}

onMounted(() => {
  initSidebar()
  load().then(() => syncActiveAncestors(route.name as string | null))
})

watch(
  () => route.name,
  (name) => {
    syncActiveAncestors(name as string | null)
    closeMobile()
  },
)

watch(tree, () => syncActiveAncestors(route.name as string | null))
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
              <h3 class="mb-0">{{ title }}</h3>
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
          <AppAlert />
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
