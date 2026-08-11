<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useVtual } from '@/composables/useVtual'
import { useAlert } from '@/composables/useAlert'
import type { VtualPlatform, VtualPlatformCredential } from '@/api/types'

const router = useRouter()
const { fetchPlatforms, fetchCredentials } = useVtual()
const { error: showError } = useAlert()
const { t } = useI18n()

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
    showError(e instanceof Error ? e.message : t('web.vtual.failed_load_platforms'))
  } finally {
    loading.value = false
  }
})
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

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else-if="platforms.length === 0" class="text-muted text-center py-4">
      {{ t('web.vtual.no_platforms') }}
    </div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>{{ t('web.vtual.platform_col') }}</th>
            <th>{{ t('web.vtual.key_col') }}</th>
            <th class="text-center">{{ t('web.vtual.enabled_col') }}</th>
            <th class="text-center">{{ t('web.vtual.active_col') }}</th>
            <th class="text-center">{{ t('web.vtual.pending_col') }}</th>
            <th class="text-end">{{ t('web.vtual.actions_col') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in platforms" :key="p.id">
            <td>{{ p.name }}</td>
            <td><code>{{ p.key }}</code></td>
            <td class="text-center">
              <span class="badge" :class="p.enabled ? 'text-bg-success' : 'text-bg-secondary'">
                {{ p.enabled ? t('web.currencies.yes') : t('web.currencies.no') }}
              </span>
            </td>
            <td class="text-center">{{ credentialCounts[p.id]?.active ?? 0 }}</td>
            <td class="text-center">{{ credentialCounts[p.id]?.pending ?? 0 }}</td>
            <td class="text-end">
              <button
                class="btn btn-outline-primary btn-sm"
                @click="router.push({ name: 'vtual.platform-credentials.platform.view', params: { platformId: p.id } })"
              >
                <i class="bi bi-gear me-1"></i> {{ t('web.vtual.manage_button') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
