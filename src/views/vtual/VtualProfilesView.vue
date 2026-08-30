<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useVtual } from '@/composables/vtual/useVtual'
import type { VtualCreator } from '@/api/types'
import { safeHttpUrl, safeImageUrl } from '@/utils/safeUrl'

const { fetchOwned } = useVtual()
const { t } = useI18n()

const profiles = ref<VtualCreator[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

function externalUrl(value: string | null | undefined): string | null {
  return safeHttpUrl(value)
}

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
        <a
          v-if="externalUrl(row.profile_url)"
          :href="externalUrl(row.profile_url) ?? undefined"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-outline-info btn-sm"
        >
          <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
        </a>
      </template>
    </DataTable>
  </Card>
</template>
