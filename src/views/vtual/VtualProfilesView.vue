<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import { useVtual } from '@/composables/vtual/useVtual'
import type { VtualCreator } from '@/api/types'
import { safeImageUrl } from '@/utils/safeUrl'
import { findQueryRowAction, mapQueryRowActions, queryRowActionTo } from '@/utils/mapQueryRowActions'

const { fetchOwned } = useVtual()
const { t } = useI18n()
const router = useRouter()

const profiles = ref<VtualCreator[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

function imageUrl(value: string | null | undefined): string | null {
  return safeImageUrl(value)
}

async function loadProfiles(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    profiles.value = await fetchOwned()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.vtual.failed_load_profiles')
  } finally {
    loading.value = false
  }
}

function editProfile(row: VtualCreator): void {
  const to = queryRowActionTo(findQueryRowAction(row.actions, 'edit'))
  if (to) void router.push(to)
}

function profileActions(row: VtualCreator) {
  return mapQueryRowActions(row.actions)
}

const columns = computed<DataTableColumn[]>(() => [
  { key: 'display_name', label: t('web.vtual.creator_col'), sortable: true },
  { key: 'slug', label: t('web.vtual.slug_col'), sortable: true },
  { key: 'channels_count', label: t('web.vtual.channels_col'), sortable: true, align: 'center' },
])

onMounted(loadProfiles)
</script>

<template>
  <Card :title="t('web.vtual.my_creator_profiles')">
    <DataTable
      :columns="columns"
      :rows="profiles"
      :loading="loading"
      :error="loadError"
      empty-icon="bi-person-badge"
      :empty-title="t('web.vtual.no_creator_profiles')"
      @retry="loadProfiles"
      @row-click="editProfile"
    >
      <template #cell-display_name="{ row }: { row: VtualCreator }">
        <div class="d-flex align-items-center gap-2">
          <img
            v-if="imageUrl(row.avatar_url)"
            :src="imageUrl(row.avatar_url) ?? undefined"
            :alt="row.display_name"
            class="rounded-circle"
            width="32"
            height="32"
          />
          <div>
            <div class="fw-semibold">{{ row.display_name }}</div>
            <div class="text-muted small">{{ row.bio ?? '' }}</div>
          </div>
        </div>
      </template>

      <template #cell-slug="{ row }: { row: VtualCreator }">
        <code>{{ row.slug }}</code>
      </template>

      <template #cell-channels_count="{ row }: { row: VtualCreator }">
        {{ row.channels_count ?? 0 }}
      </template>

      <template #actions="{ row }: { row: VtualCreator }">
        <RowActions :actions="profileActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
