<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import { useVtual } from '@/composables/useVtual'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { VtualPlatformCredential } from '@/api/types'

const route = useRoute()
const router = useRouter()
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
    showError(e instanceof Error ? e.message : 'Failed to load credentials')
  } finally {
    loading.value = false
  }
}

onMounted(loadCredentials)

async function handleDelete(cred: VtualPlatformCredential): Promise<void> {
  if (!confirm(`Delete credential "${cred.label}"?`)) return
  setAction(cred.id, true)
  try {
    await vtual.deleteCredential(cred.id)
    credentials.value = credentials.value.filter((c) => c.id !== cred.id)
    showSuccess('Credential deleted.')
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to delete')
  } finally {
    setAction(cred.id, false)
  }
}

async function handleRevoke(cred: VtualPlatformCredential): Promise<void> {
  if (!confirm(`Revoke credential "${cred.label}"? Runtime tokens will be cleared.`)) return
  setAction(cred.id, true)
  try {
    const updated = await vtual.revokeCredential(cred.id)
    updateCredentialInList(updated)
    showSuccess('Credential revoked.')
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to revoke')
  } finally {
    setAction(cred.id, false)
  }
}

async function handleTest(cred: VtualPlatformCredential): Promise<void> {
  setAction(cred.id, true)
  try {
    const updated = await vtual.testCredential(cred.id)
    updateCredentialInList(updated)
    showSuccess('Test passed.')
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Test failed')
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

function statusClass(status: string): string {
  const map: Record<string, string> = {
    active: 'text-bg-success',
    pending: 'text-bg-warning',
    revoked: 'text-bg-danger',
  }
  return map[status.toLowerCase()] ?? 'text-bg-secondary'
}
</script>

<template>
  <Card title="Platform Credentials">
    <template #actions>
      <button
        v-if="canManage"
        class="btn btn-primary btn-sm"
        @click="router.push({ name: 'vtual.platform-credentials.create.view', params: { platformId } })"
      >
        <i class="bi bi-plus-lg me-1"></i> Add Credential
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <div v-else-if="credentials.length === 0" class="text-muted text-center py-4">
      No credentials found for this platform.
    </div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Label</th>
            <th>Type</th>
            <th class="text-center">Status</th>
            <th class="text-center">Priority</th>
            <th>Secret Hint</th>
            <th>Verified</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cred in credentials" :key="cred.id">
            <td>{{ cred.label }}</td>
            <td><code>{{ cred.type }}</code></td>
            <td class="text-center">
              <span class="badge" :class="statusClass(cred.status)">{{ cred.status }}</span>
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
                  title="Test"
                >
                  <span v-if="actionLoading[cred.id]" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <i v-else class="bi bi-lightning" aria-hidden="true"></i>
                </button>
                <button
                  class="btn btn-outline-warning"
                  :disabled="actionLoading[cred.id]"
                  @click="handleRevoke(cred)"
                  title="Revoke"
                >
                  <i class="bi bi-shield-x" aria-hidden="true"></i>
                </button>
                <button
                  class="btn btn-outline-primary"
                  @click="router.push({ name: 'vtual.platform-credentials.edit.view', params: { id: cred.id } })"
                  title="Edit"
                >
                  <i class="bi bi-pencil" aria-hidden="true"></i>
                </button>
                <button
                  class="btn btn-outline-danger"
                  :disabled="actionLoading[cred.id]"
                  @click="handleDelete(cred)"
                  title="Delete"
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
