<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import NavTree from '@/components/NavTree.vue'
import { useNavigation } from '@/composables/useNavigation'
import type { NavNode } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const { sidebarTree: sidebarNavigation, loading, load } = useNavigation()

const searchQuery = ref('')

interface FlatNode {
  id: string
  name: string
  route: string | null | undefined
  parentId: string | null
}

function flattenTree(nodes: NavNode[], parentId: string | null = null): FlatNode[] {
  const flat: FlatNode[] = []
  for (const node of nodes) {
    flat.push({ id: node.id, name: node.name, route: node.route, parentId })
    if (node.children.length > 0) {
      flat.push(...flattenTree(node.children, node.id))
    }
  }
  return flat
}

const flatNodes = computed(() => flattenTree(sidebarNavigation.value))

const filteredTree = computed<NavNode[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return sidebarNavigation.value

  const matchIds = new Set<string>()
  for (const node of flatNodes.value) {
    if (node.name.toLowerCase().includes(q)) {
      matchIds.add(node.id)
      let parentId = node.parentId
      while (parentId) {
        matchIds.add(parentId)
        const parent = flatNodes.value.find((n) => n.id === parentId)
        parentId = parent?.parentId ?? null
      }
    }
  }

  function filterNodes(nodes: NavNode[]): NavNode[] {
    return nodes
      .filter((node) => matchIds.has(node.id))
      .map((node) => ({
        ...node,
        children: filterNodes(node.children),
      }))
  }

  return filterNodes(sidebarNavigation.value)
})

const hasResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return true
  return filteredTree.value.length > 0 || hasAnyLeaf(filteredTree.value)
})

function hasAnyLeaf(nodes: NavNode[]): boolean {
  for (const node of nodes) {
    if (node.type === 'c' || node.type === 'p') return true
    if (node.children.length > 0 && hasAnyLeaf(node.children)) return true
  }
  return false
}

function navigateDashboard(): void {
  router.push({ name: 'dashboard.view' })
}

onMounted(() => {
  load()
})
</script>

<template>
  <aside class="app-sidebar bg-body-secondary shadow">
    <div class="sidebar-brand">
      <a href="#" class="brand-link" @click.prevent="navigateDashboard">
        <span class="brand-text fw-light"><strong>Mono</strong>lith</span>
      </a>
    </div>

    <div class="sidebar-wrapper">
      <div class="sidebar-search px-3 pb-2">
        <input
          type="search"
          class="form-control form-control-sm border-0"
          :placeholder="t('web.sidebar.search_placeholder')"
          v-model="searchQuery"
          autocomplete="off"
          spellcheck="false"
          :aria-label="t('web.sidebar.search_label')"
          aria-controls="sidebar-menu-root"
        >
      </div>

      <nav class="mt-2">
        <ul
          v-if="!loading"
          id="sidebar-menu-root"
          class="nav sidebar-menu flex-column"
          role="navigation"
          :aria-label="t('ui.labels.main_navigation')"
          data-accordion="false"
        >
          <NavTree :items="filteredTree" />
        </ul>

        <div v-else class="px-3 py-2 text-muted small">
          <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          {{ t('ui.loading') }}
        </div>
      </nav>

      <div v-if="!loading && !hasResults" class="px-3 py-2 text-muted small">
        {{ t('web.sidebar.search_no_results') }}
      </div>
    </div>
  </aside>
</template>
