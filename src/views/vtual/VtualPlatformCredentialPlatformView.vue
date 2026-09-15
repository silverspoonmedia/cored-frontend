<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useVtual } from '@/composables/vtual/useVtual'
import { useVtualRealtime, type PlatformCredentialChangedPayload } from '@/composables/vtual/useVtualRealtime'
import { useListingLiveUpdate } from '@/composables/useListingLiveUpdate'
import { useEchoResync } from '@/composables/useEcho'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { VtualPlatformCredential } from '@/api/types'
import { VTUAL_STATUS_BADGE } from '@/utils/statusBadge'
import { confirmQueryMutate, findQueryRowAction, queryRowActionTo } from '@/utils/mapQueryRowActions'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const vtual = useVtual()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const { subscribe, unsubscribe } = useVtualRealtime()

const credentials = ref<VtualPlatformCredential[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const actionLoading = ref<Record<string, boolean>>({})
const canManage = computed(() => hasPermission('manage vtual platform credentials'))
const platformId = computed(() => route.params.platformId as string)

async function loadCredentials(silent = false): Promise<void> {
  if (!silent) loading.value = true
  loadError.value = null
  try {
    credentials.value = await vtual.fetchCredentials(platformId.value)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.vtual.credentials.load_failed')
    showError(loadError.value)
  } finally {
    if (!silent) loading.value = false
  }
}

useListingLiveUpdate('vtual-platform-credentials', () => {
  void loadCredentials(true)
})

const realtimeHandlers = {
  onCredentialChanged: (payload: PlatformCredentialChangedPayload) => {
    if (payload.platform_id === platformId.value) {
      void loadCredentials(true)
    }
  },
}

// Socket-outage recovery: mirror the realtime handler (silent reload).
useEchoResync(() => { void loadCredentials(true) })

onMounted(() => {
  void loadCredentials()
  subscribe(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribe(realtimeHandlers)
})

async function handleDelete(cred: VtualPlatformCredential): Promise<void> {
  const action = findQueryRowAction(cred.actions, 'delete')
  if (!action) return
  if (!(await confirmQueryMutate(action, t('web.vtual.credentials.delete')))) return
  setAction(cred.id, true)
  try {
    await vtual.deleteCredential(cred.id)
    credentials.value = credentials.value.filter((c) => c.id !== cred.id)
    showSuccess(t('web.vtual.credentials.deleted'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.credentials.delete_failed'))
  } finally {
    setAction(cred.id, false)
  }
}

async function handleRevoke(cred: VtualPlatformCredential): Promise<void> {
  const action = findQueryRowAction(cred.actions, 'revoke')
  if (!action) return
  if (!(await confirmQueryMutate(action, t('web.vtual.credentials.revoke')))) return
  setAction(cred.id, true)
  try {
    const updated = await vtual.revokeCredential(cred.id)
    updateCredentialInList(updated)
    showSuccess(t('web.vtual.credentials.revoked'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.credentials.revoke_failed'))
  } finally {
    setAction(cred.id, false)
  }
}

async function handleTest(cred: VtualPlatformCredential): Promise<void> {
  setAction(cred.id, true)
  try {
    const updated = await vtual.testCredential(cred.id)
    updateCredentialInList(updated)
    showSuccess(t('web.vtual.credentials.test_passed'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.credentials.test_failed'))
  } finally {
    setAction(cred.id, false)
  }
}

function updateCredentialInList(updated: VtualPlatformCredential): void {
  credentials.value = credentials.value.map((c) => (c.id === updated.id ? updated : c))
}

function setAction(id: string, on: boolean): void {
  actionLoading.value = { ...actionLoading.value, [id]: on }
}

function editCredential(row: VtualPlatformCredential): void {
  const to = queryRowActionTo(findQueryRowAction(row.actions, 'edit'))
  if (to) void router.push(to)
}

const columns = computed<DataTableColumn[]>(() => [
  { key: 'label', label: t('web.vtual.credentials.label'), sortable: true },
  { key: 'type', label: t('web.vtual.credentials.type'), sortable: true },
  { key: 'status', label: t('web.vtual.credentials.status_active'), sortable: true, align: 'center' },
  { key: 'priority', label: t('web.vtual.credentials.priority'), sortable: true, align: 'center' },
  { key: 'secret_hint', label: t('web.vtual.credentials.hint'), sortable: false },
  { key: 'verified_at', label: t('web.vtual.credentials.verified_at'), sortable: true },
])
</script>

<template>
  <Card :title="t('web.vtual.admin.credentials.platform_title')">
    <template #actions>
      <button
        v-if="canManage"
        class="btn btn-primary btn-sm"
        @click="router.push({ name: 'vtual.platform-credentials.create.view', params: { platformId } })"
      >
        <i class="bi bi-plus-lg me-1"></i> {{ t('web.vtual.credentials.add') }}
      </button>
    </template>

    <DataTable
      :columns="columns"
      :rows="credentials"
      :loading="loading"
      :error="loadError"
      empty-icon="bi-key"
      :empty-title="t('web.vtual.credentials.empty')"
      @retry="loadCredentials()"
    >
      <template #cell-type="{ row }: { row: VtualPlatformCredential }">
        <code>{{ row.type }}</code>
      </template>

      <template #cell-status="{ row }: { row: VtualPlatformCredential }">
        <StatusBadge :status="row.status" :mapping="VTUAL_STATUS_BADGE" fallback="light" />
      </template>

      <template #cell-priority="{ row }: { row: VtualPlatformCredential }">
        {{ row.priority ?? '—' }}
      </template>

      <template #cell-secret_hint="{ row }: { row: VtualPlatformCredential }">
        <span class="small text-muted">{{ row.secret_hint ?? '—' }}</span>
      </template>

      <template #cell-verified_at="{ row }: { row: VtualPlatformCredential }">
        <span class="small">{{ row.verified_at_formatted ?? '—' }}</span>
      </template>

      <template v-if="canManage" #actions="{ row }: { row: VtualPlatformCredential }">
        <div class="btn-group btn-group-sm">
          <button
            v-if="findQueryRowAction(row.actions, 'test')"
            class="btn btn-outline-success"
            :disabled="actionLoading[row.id]"
            @click="handleTest(row)"
            :title="findQueryRowAction(row.actions, 'test')?.label"
          >
            <span v-if="actionLoading[row.id]" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <i v-else class="bi bi-lightning" aria-hidden="true"></i>
          </button>
          <button
            v-if="findQueryRowAction(row.actions, 'revoke')"
            class="btn btn-outline-warning"
            :disabled="actionLoading[row.id]"
            @click="handleRevoke(row)"
            :title="findQueryRowAction(row.actions, 'revoke')?.label"
          >
            <i class="bi bi-shield-x" aria-hidden="true"></i>
          </button>
          <button
            v-if="findQueryRowAction(row.actions, 'edit')"
            class="btn btn-outline-primary"
            @click="editCredential(row)"
            :title="findQueryRowAction(row.actions, 'edit')?.label"
          >
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>
          <button
            v-if="findQueryRowAction(row.actions, 'delete')"
            class="btn btn-outline-danger"
            :disabled="actionLoading[row.id]"
            @click="handleDelete(row)"
            :title="findQueryRowAction(row.actions, 'delete')?.label"
          >
            <i class="bi bi-trash" aria-hidden="true"></i>
          </button>
        </div>
      </template>
    </DataTable>
  </Card>
</template>
