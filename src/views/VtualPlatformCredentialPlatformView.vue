<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useVtual } from '@/composables/useVtual'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { confirmDialog } from '@/lib/swal'
import type { VtualPlatformCredential } from '@/api/types'
import { VTUAL_STATUS_BADGE } from '@/utils/statusBadge'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const vtual = useVtual()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const credentials = ref<VtualPlatformCredential[]>([])
const loading = ref(true)
const actionLoading = ref<Record<string, boolean>>({})
const canManage = computed(() => hasPermission('manage vtual platform credentials'))
const platformId = computed(() => route.params.platformId as string)

async function loadCredentials(): Promise<void> {
  loading.value = true
  try {
    credentials.value = await vtual.fetchCredentials(platformId.value)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.credentials.load_failed'))
  } finally {
    loading.value = false
  }
}

onMounted(loadCredentials)

async function handleDelete(cred: VtualPlatformCredential): Promise<void> {
  if (!(await confirmDialog({ text: t('web.vtual.confirm.delete_credential_body') }))) return
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
  if (!(await confirmDialog({ text: t('web.vtual.confirm.revoke_credential_body') }))) return
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
  const idx = credentials.value.findIndex((c) => c.id === updated.id)
  if (idx >= 0) {
    credentials.value[idx] = updated
  }
}

function setAction(id: string, on: boolean): void {
  actionLoading.value = { ...actionLoading.value, [id]: on }
}
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

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else-if="credentials.length === 0" class="text-muted text-center py-4">
      {{ t('web.vtual.credentials.empty') }}
    </div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>{{ t('web.vtual.credentials.label') }}</th>
            <th>{{ t('web.vtual.credentials.type') }}</th>
            <th class="text-center">{{ t('web.vtual.credentials.status_active') }}</th>
            <th class="text-center">{{ t('web.vtual.credentials.priority') }}</th>
            <th>{{ t('web.vtual.credentials.hint') }}</th>
            <th>{{ t('web.vtual.credentials.verified_at') }}</th>
            <th class="text-end">{{ t('web.vtual.table.label_actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cred in credentials" :key="cred.id">
            <td>{{ cred.label }}</td>
            <td><code>{{ cred.type }}</code></td>
            <td class="text-center">
              <StatusBadge :status="cred.status" :mapping="VTUAL_STATUS_BADGE" fallback="light" />
            </td>
            <td class="text-center">{{ cred.priority ?? '—' }}</td>
            <td class="small text-muted">{{ cred.secret_hint ?? '—' }}</td>
            <td class="small">{{ cred.verified_at_formatted ?? '—' }}</td>
            <td class="text-end">
              <div v-if="canManage" class="btn-group btn-group-sm">
                <button
                  class="btn btn-outline-success"
                  :disabled="actionLoading[cred.id]"
                  @click="handleTest(cred)"
                  :title="t('web.vtual.credentials.test')"
                >
                  <span v-if="actionLoading[cred.id]" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <i v-else class="bi bi-lightning" aria-hidden="true"></i>
                </button>
                <button
                  class="btn btn-outline-warning"
                  :disabled="actionLoading[cred.id]"
                  @click="handleRevoke(cred)"
                  :title="t('web.vtual.credentials.revoke')"
                >
                  <i class="bi bi-shield-x" aria-hidden="true"></i>
                </button>
                <button
                  class="btn btn-outline-primary"
                  @click="router.push({ name: 'vtual.platform-credentials.edit.view', params: { id: cred.id } })"
                  :title="t('web.vtual.admin.credentials.edit_action')"
                >
                  <i class="bi bi-pencil" aria-hidden="true"></i>
                </button>
                <button
                  class="btn btn-outline-danger"
                  :disabled="actionLoading[cred.id]"
                  @click="handleDelete(cred)"
                  :title="t('web.vtual.credentials.delete')"
                >
                  <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
