<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useInferenceModelCards } from '@/composables/useInferenceModelCards'
import { useAuth } from '@/stores/auth'
import type { AiModelCard } from '@/api/types'

const router = useRouter()
const { t } = useI18n()
const { items, loading, fetchList, destroy } = useInferenceModelCards()
const { hasPermission } = useAuth()
const canManage = computed(() => hasPermission('manage inference catalog'))

const columns: DataTableColumn[] = [
  { key: 'slug', label: t('web.inference.model_cards.datatable.columns.slug'), sortable: true },
  { key: 'display_name', label: t('web.inference.model_cards.datatable.columns.display_name'), sortable: true },
  { key: 'is_active', label: t('web.inference.model_cards.datatable.columns.is_active'), sortable: true, align: 'center' },
  { key: 'needs_rate_classification', label: t('web.inference.model_cards.needs_rate_label'), sortable: false, align: 'center' },
  { key: 'updated_at', label: t('web.inference.model_cards.datatable.columns.updated_at'), sortable: true, align: 'end' },
]

onMounted(() => fetchList())

function showCard(row: AiModelCard): void {
  router.push({ name: 'inference.model-cards.show.view', params: { id: row.id } })
}

function editCard(row: AiModelCard): void {
  router.push({ name: 'inference.model-cards.edit.view', params: { id: row.id } })
}
</script>

<template>
  <Card :title="t('web.inference.model_cards.list_title')">
    <template #actions>
      <button v-if="canManage" class="btn btn-primary btn-sm" @click="router.push({ name: 'inference.model-cards.create.view' })">
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.inference.model_cards.add_button') }}
      </button>
    </template>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :search-placeholder="t('web.inference.model_cards.search_placeholder')"
      empty-icon="bi-cpu"
      :empty-title="t('web.inference.model_cards.empty_title')"
      @row-click="showCard"
    >
      <template #cell-slug="{ row }: { row: AiModelCard }">
        <code>{{ row.slug }}</code>
      </template>

      <template #cell-display_name="{ row }: { row: AiModelCard }">
        {{ row.display_name ?? '—' }}
      </template>

      <template #cell-is_active="{ row }: { row: AiModelCard }">
        <span class="badge" :class="row.is_active ? 'text-bg-success' : 'text-bg-secondary'">
          {{ row.is_active ? t('web.inference.model_cards.active_badge') : t('web.inference.model_cards.inactive_badge') }}
        </span>
      </template>

      <template #cell-needs_rate_classification="{ row }: { row: AiModelCard }">
        <span v-if="row.needs_rate_classification" class="badge text-bg-warning">{{ t('web.inference.model_cards.yes_badge') }}</span>
        <span v-else class="text-muted">—</span>
      </template>

      <template #cell-updated_at="{ row }: { row: AiModelCard }">
        <span class="text-muted small">{{ row.updated_at_formatted ?? row.updated_at ?? '—' }}</span>
      </template>

      <template #actions="{ row }: { row: AiModelCard }">
        <button class="btn btn-outline-info btn-sm" @click.stop="showCard(row)">
          <i class="bi bi-eye" aria-hidden="true"></i>
        </button>
        <button v-if="canManage" class="btn btn-outline-primary btn-sm ms-1" @click.stop="editCard(row)">
          <i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
      </template>
    </DataTable>
  </Card>
</template>
