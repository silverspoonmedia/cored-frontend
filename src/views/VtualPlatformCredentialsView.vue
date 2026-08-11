<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import { useVtual } from '@/composables/useVtual'
import { useAlert } from '@/composables/useAlert'
import type { VtualPlatform, VtualPlatformCredential } from '@/api/types'

const router = useRouter()
const { fetchPlatforms, fetchCredentials } = useVtual()
const { error: showError } = useAlert()

const platforms = ref<VtualPlatform[]>([])
const credentialCounts = ref<Record<string, { active: number; pending: number; total: number }>>({})
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    platforms.value = await fetchPlatforms()
    await Promise.all(
      platforms.value.map(async (p) => {
        try {
          const creds = await fetchCredentials(p.id)
          credentialCounts.value[p.id] = {
            total: creds.length,
            active: creds.filter((c) => c.status === 'active').length,
            pending: creds.filter((c) => c.status === 'pending').length,
          }
        } catch {
          credentialCounts.value[p.id] = { active: 0, pending: 0, total: 0 }
        }
      }),
    )
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load platforms')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <Card title="Platform Credentials">
    <template #actions>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.push({ name: 'vtual.platform-credentials.probe.view' })"
      >
        <i class="bi bi-bug me-1"></i> Probe
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <div v-else-if="platforms.length === 0" class="text-muted text-center py-4">
      No platforms found.
    </div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Key</th>
            <th class="text-center">Enabled</th>
            <th class="text-center">Active</th>
            <th class="text-center">Pending</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in platforms" :key="p.id">
            <td>{{ p.name }}</td>
            <td><code>{{ p.key }}</code></td>
            <td class="text-center">
              <span class="badge" :class="p.enabled ? 'text-bg-success' : 'text-bg-secondary'">
                {{ p.enabled ? 'Yes' : 'No' }}
              </span>
            </td>
            <td class="text-center">{{ credentialCounts[p.id]?.active ?? 0 }}</td>
            <td class="text-center">{{ credentialCounts[p.id]?.pending ?? 0 }}</td>
            <td class="text-end">
              <button
                class="btn btn-outline-primary btn-sm"
                @click="router.push({ name: 'vtual.platform-credentials.platform.view', params: { platformId: p.id } })"
              >
                <i class="bi bi-gear me-1"></i> Manage
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
