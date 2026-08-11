<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useVtual } from '@/composables/useVtual'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { VtualCreator } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { fetchOrphans } = useVtual()
const { hasPermission } = useAuth()
const { error: showError } = useAlert()

const items = ref<VtualCreator[]>([])
const loading = ref(true)
const canManage = computed(() => hasPermission('manage any vtual resource'))

const columns = computed<DataTableColumn[]>(() => [
  { key: 'display_name', label: t('web.vtual-orphans.datatable.columns.display_name'), sortable: true },
  { key: 'slug', label: t('web.vtual-orphans.datatable.columns.slug'), sortable: true },
  { key: 'channels_count', label: t('web.vtual-orphans.datatable.columns.channels'), sortable: true, align: 'center' },
  { key: 'created_at', label: t('web.vtual-orphans.datatable.columns.created_at'), sortable: true, align: 'end' },
])

onMounted(async () => {
  loading.value = true
  try {
    items.value = await fetchOrphans()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-orphans.errors.load_failed'))
  } finally {
    loading.value = false
  }
})

function editOrphan(row: VtualCreator): void {
  router.push({ name: 'vtual.orphans.edit.view', params: { id: row.id } })
}
</script>

<template>
  <Card :title="t('web.vtual-orphans.list_title')">
    <template #actions>
      <button
        v-if="canManage"
        class="btn btn-primary btn-sm"
        @click="router.push({ name: 'vtual.orphans.create.view' })"
      >
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.vtual-orphans.add_button') }}
      </button>
    </template>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :search-placeholder="t('web.vtual-orphans.datatable.search_placeholder')"
      empty-icon="bi-search"
      :empty-title="t('web.vtual-orphans.datatable.empty')"
      @row-click="editOrphan"
    >
      <template #cell-slug="{ row }: { row: VtualCreator }">
        <code>{{ row.slug }}</code>
      </template>

      <template #cell-channels_count="{ row }: { row: VtualCreator }">
        {{ row.channels_count ?? 0 }}
      </template>

      <template #cell-created_at="{ row }: { row: VtualCreator }">
        <span class="text-muted small">{{ row.created_at_formatted ?? row.created_at ?? '—' }}</span>
      </template>

      <template v-if="canManage" #actions="{ row }: { row: VtualCreator }">
        <button class="btn btn-outline-primary btn-sm" @click.stop="editOrphan(row)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
      </template>
    </DataTable>
  </Card>
</template>
