<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useInferenceProviders } from '@/composables/useInferenceProviders'
import { useAuth } from '@/stores/auth'
import type { InferenceProvider } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { items, loading, fetchList } = useInferenceProviders()
const { hasPermission } = useAuth()
const canManage = computed(() => hasPermission('manage inference catalog'))

const columns: DataTableColumn[] = [
  { key: 'slug', label: t('web.inference.providers.datatable.columns.slug'), sortable: true },
  { key: 'name', label: t('web.inference.providers.datatable.columns.name'), sortable: true },
  { key: 'is_active', label: t('web.inference.providers.datatable.columns.is_active'), sortable: true, align: 'center' },
  { key: 'model_rates_count', label: t('web.inference.providers.datatable.columns.model_rates_count'), sortable: false, align: 'center' },
  { key: 'updated_at', label: t('web.inference.providers.datatable.columns.updated_at'), sortable: true, align: 'end' },
]

onMounted(() => fetchList())

function editProvider(row: InferenceProvider): void {
  router.push({ name: 'inference.providers.edit.view', params: { id: row.id } })
}

function viewProvider(row: InferenceProvider): void {
  router.push({ name: 'inference.providers.show.view', params: { id: row.id } })
}
</script>

<template>
  <Card :title="t('web.inference.providers.list_title')">
    <template #actions>
      <button v-if="canManage" class="btn btn-primary btn-sm" @click="router.push({ name: 'inference.providers.create.view' })">
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.inference.providers.add_button') }}
      </button>
    </template>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :search-placeholder="t('web.inference.providers.search_placeholder')"
      empty-icon="bi-hdd-network"
      :empty-title="t('web.inference.providers.empty_title')"
      @row-click="editProvider"
    >
      <template #cell-slug="{ row }: { row: InferenceProvider }">
        <code>{{ row.slug }}</code>
      </template>

      <template #cell-is_active="{ row }: { row: InferenceProvider }">
        <span class="badge" :class="row.is_active ? 'text-bg-success' : 'text-bg-secondary'">
          {{ row.is_active ? t('web.inference.providers.active') : t('web.inference.providers.inactive') }}
        </span>
      </template>

      <template #cell-model_rates_count="{ row }: { row: InferenceProvider }">
        <span class="text-muted small">{{ row.model_rates_count ?? 0 }}</span>
      </template>

      <template #cell-updated_at="{ row }: { row: InferenceProvider }">
        <span class="text-muted small">{{ row.updated_at_formatted ?? row.updated_at ?? '—' }}</span>
      </template>

      <template #actions="{ row }: { row: InferenceProvider }">
        <button class="btn btn-outline-secondary btn-sm" @click.stop="viewProvider(row)">
          <i class="bi bi-eye" aria-hidden="true"></i>
        </button>
        <button v-if="canManage" class="btn btn-outline-primary btn-sm ms-1" @click.stop="editProvider(row)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
      </template>
    </DataTable>
  </Card>
</template>
