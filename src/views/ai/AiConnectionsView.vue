<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAiConnections } from '@/composables/ai/useAiConnections'
import { useAiConnectionsRealtime } from '@/composables/ai/useAiConnectionsRealtime'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { useListingLiveUpdate } from '@/composables/useListingLiveUpdate'
import { useEchoResync } from '@/composables/useEcho'
import type { AiConnection } from '@/api/types'
import { AI_CONNECTION_STATUS_BADGE } from '@/utils/statusBadge'
import { confirmQueryMutate, findQueryRowAction, mapQueryRowActions, queryRowActionTo } from '@/utils/mapQueryRowActions'

const router = useRouter()
const { t } = useI18n()
const { items, loading, error, fetchList, destroy, test, setDefault } = useAiConnections()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const canManage = computed(() => hasPermission('manage ai connections'))
const actionLoading = ref<Record<string, boolean>>({})

useListingLiveUpdate('ai-connections', fetchList)

const { subscribe, unsubscribe } = useAiConnectionsRealtime()
const realtimeHandlers = { onConnectionChanged: () => { void fetchList() } }

// Socket-outage recovery: mirror the realtime handler.
useEchoResync(() => { void fetchList() })

const columns = computed<DataTableColumn[]>(() => [
  { key: 'label', label: t('web.ai-connections.columns.label'), sortable: true },
  { key: 'slug', label: t('web.ai-connections.columns.slug'), sortable: true },
  { key: 'endpoint', label: t('web.ai-connections.columns.endpoint'), sortable: false },
  { key: 'status', label: t('web.ai-connections.columns.status'), sortable: true, align: 'center' },
  { key: 'is_default', label: t('web.ai-connections.columns.is_default'), sortable: true, align: 'center' },
  { key: 'secret_hint', label: t('web.ai-connections.columns.secret_hint'), sortable: false },
  { key: 'last_used_at', label: t('web.ai-connections.columns.last_used_at'), sortable: true },
])

function editConnection(row: AiConnection): void {
  const to = queryRowActionTo(findQueryRowAction(row.actions, 'edit'))
  if (to) void router.push(to)
}

function setAction(id: string, on: boolean): void {
  actionLoading.value = { ...actionLoading.value, [id]: on }
}

function replaceRow(updated: AiConnection): void {
  items.value = items.value.map((row) => (row.id === updated.id ? updated : row))
}

async function handleTest(row: AiConnection): Promise<void> {
  setAction(row.id, true)
  try {
    const payload = await test(row.id)
    replaceRow(payload.connection)
    showSuccess(payload.test.message)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.ai-connections.test_failed'))
    // The row's last_error_* changed server-side even when the probe failed.
    await fetchList()
  } finally {
    setAction(row.id, false)
  }
}

async function handleDefault(row: AiConnection, action: Parameters<typeof confirmQueryMutate>[0]): Promise<void> {
  if (!(await confirmQueryMutate(action, t('web.ai-connections.make_default')))) return
  setAction(row.id, true)
  try {
    await setDefault(row.id)
    await fetchList()
    showSuccess(t('web.ai-connections.default_updated'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.ai-connections.default_failed'))
  } finally {
    setAction(row.id, false)
  }
}

async function handleDelete(row: AiConnection, action: Parameters<typeof confirmQueryMutate>[0]): Promise<void> {
  if (!(await confirmQueryMutate(action, t('ui.actions.delete')))) return
  setAction(row.id, true)
  try {
    await destroy(row.id)
    items.value = items.value.filter((c) => c.id !== row.id)
    showSuccess(t('api.ai.connection.deleted'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.ai-connections.delete_failed'))
  } finally {
    setAction(row.id, false)
  }
}

function connectionActions(row: AiConnection) {
  return mapQueryRowActions(row.actions, {
    test: () => { void handleTest(row) },
    default: (action) => { void handleDefault(row, action) },
    delete: (action) => { void handleDelete(row, action) },
  }).map((action) => ({ ...action, disabled: actionLoading.value[row.id] === true }))
}

onMounted(() => {
  subscribe(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribe(realtimeHandlers)
})
</script>

<template>
  <Card :title="t('web.ai-connections.list_title')">
    <template #actions>
      <router-link v-if="canManage" class="btn btn-primary btn-sm" :to="{ name: 'ai.connections.create.view' }">
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.ai-connections.add_button') }}
      </router-link>
    </template>

    <p class="text-muted small">{{ t('web.ai-connections.subtitle') }}</p>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :error="error"
      empty-icon="bi-plug"
      :empty-title="t('web.ai-connections.empty_title')"
      @retry="fetchList()"
      @row-click="editConnection"
    >
      <template #cell-slug="{ row }: { row: AiConnection }">
        <code>{{ row.slug }}</code>
      </template>

      <template #cell-endpoint="{ row }: { row: AiConnection }">
        <span class="text-muted small text-break">{{ row.endpoint }}</span>
      </template>

      <template #cell-status="{ row }: { row: AiConnection }">
        <StatusBadge
          :status="row.status"
          :mapping="AI_CONNECTION_STATUS_BADGE"
          :label="t(`web.ai-connections.status_${row.status}`)"
        />
      </template>

      <template #cell-is_default="{ row }: { row: AiConnection }">
        <i v-if="row.is_default" class="bi bi-star-fill text-warning" :title="t('web.ai-connections.default_badge')"></i>
        <span v-else class="text-muted">—</span>
      </template>

      <template #cell-secret_hint="{ row }: { row: AiConnection }">
        <code v-if="row.has_secret">{{ row.secret_hint }}</code>
        <span v-else class="text-muted">—</span>
      </template>

      <template #cell-last_used_at="{ row }: { row: AiConnection }">
        <span class="text-muted small">{{ row.last_used_at_human ?? '—' }}</span>
      </template>

      <template #actions="{ row }: { row: AiConnection }">
        <RowActions :actions="connectionActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
