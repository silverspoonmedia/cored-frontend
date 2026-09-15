<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import { useVtual } from '@/composables/vtual/useVtual'
import { useVtualHydrate } from '@/composables/vtual/useVtualHydrate'
import { useVtualRealtime } from '@/composables/vtual/useVtualRealtime'
import { useListingLiveUpdate } from '@/composables/useListingLiveUpdate'
import { useEchoResync } from '@/composables/useEcho'
import type { VtualPlatform } from '@/api/types'
import { findQueryRowAction, queryRowActionTo } from '@/utils/mapQueryRowActions'

const router = useRouter()
const { fetchPlatforms, fetchCredentials } = useVtual()
const { hydrateCredentials } = useVtualHydrate()
const { t } = useI18n()
const { subscribe, unsubscribe } = useVtualRealtime()

const platforms = ref<VtualPlatform[]>([])
const credentialCounts = ref<Record<string, { active: number; pending: number; total: number }>>({})
const loading = ref(true)
const loadError = ref<string | null>(null)

async function loadPlatforms(silent = false): Promise<void> {
  if (!silent) loading.value = true
  loadError.value = null
  try {
    platforms.value = await fetchPlatforms()

    const platformIds = platforms.value.map((p) => p.id)
    const batchResult = await hydrateCredentials(platformIds).catch(() => null)

    if (batchResult) {
      platformIds.forEach((id) => {
        const creds = batchResult.credentials[id]
        if (creds !== null && creds !== undefined) {
          credentialCounts.value[id] = {
            total: creds.length,
            active: creds.filter((c) => c.status === 'active').length,
            pending: creds.filter((c) => c.status === 'pending').length,
          }
        }
      })
    }

    const missing = platformIds.filter((id) => !(id in credentialCounts.value))
    if (missing.length > 0) {
      await Promise.all(
        missing.map(async (id) => {
          try {
            const creds = await fetchCredentials(id)
            credentialCounts.value[id] = {
              total: creds.length,
              active: creds.filter((c) => c.status === 'active').length,
              pending: creds.filter((c) => c.status === 'pending').length,
            }
          } catch {
            credentialCounts.value[id] = { active: 0, pending: 0, total: 0 }
          }
        }),
      )
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.vtual.failed_load_platforms')
  } finally {
    if (!silent) loading.value = false
  }
}

useListingLiveUpdate('vtual-platform-credentials-index', () => {
  void loadPlatforms(true)
})

const realtimeHandlers = {
  onCredentialChanged: () => {
    void loadPlatforms(true)
  },
}

// Socket-outage recovery: mirror the realtime handler (silent reload).
useEchoResync(() => { void loadPlatforms(true) })

onMounted(() => {
  void loadPlatforms()
  subscribe(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribe(realtimeHandlers)
})

function managePlatform(row: VtualPlatform): void {
  const to = queryRowActionTo(findQueryRowAction(row.actions, 'manage'))
  if (to) void router.push(to)
}

const columns = computed<DataTableColumn[]>(() => [
  { key: 'name', label: t('web.vtual.platform_col'), sortable: true },
  { key: 'key', label: t('web.vtual.key_col'), sortable: true },
  { key: 'enabled', label: t('web.vtual.enabled_col'), sortable: true, align: 'center' },
  { key: 'active', label: t('web.vtual.active_col'), sortable: false, align: 'center' },
  { key: 'pending', label: t('web.vtual.pending_col'), sortable: false, align: 'center' },
])

</script>

<template>
  <Card :title="t('web.vtual.platform_credentials_title')">
    <template #actions>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.push({ name: 'vtual.platform-credentials.probe.view' })"
      >
        <i class="bi bi-bug me-1"></i> {{ t('web.vtual.probe_button') }}
      </button>
    </template>

    <DataTable
      :columns="columns"
      :rows="platforms"
      :loading="loading"
      :error="loadError"
      empty-icon="bi-broadcast"
      :empty-title="t('web.vtual.no_platforms')"
      @retry="loadPlatforms()"
      @row-click="managePlatform"
    >
      <template #cell-key="{ row }: { row: VtualPlatform }">
        <code>{{ row.key }}</code>
      </template>

      <template #cell-enabled="{ row }: { row: VtualPlatform }">
        <span class="badge" :class="row.enabled ? 'text-bg-success' : 'text-bg-secondary'">
          {{ row.enabled ? t('web.currencies.yes') : t('web.currencies.no') }}
        </span>
      </template>

      <template #cell-active="{ row }: { row: VtualPlatform }">
        {{ credentialCounts[row.id]?.active ?? 0 }}
      </template>

      <template #cell-pending="{ row }: { row: VtualPlatform }">
        {{ credentialCounts[row.id]?.pending ?? 0 }}
      </template>

      <template #actions="{ row }: { row: VtualPlatform }">
        <button
          v-if="findQueryRowAction(row.actions, 'manage')"
          class="btn btn-outline-primary btn-sm"
          @click.stop="managePlatform(row)"
        >
          <i class="bi bi-gear me-1"></i> {{ findQueryRowAction(row.actions, 'manage')?.label }}
        </button>
      </template>
    </DataTable>
  </Card>
</template>
