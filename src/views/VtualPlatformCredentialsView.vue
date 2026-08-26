<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useVtual } from '@/composables/useVtual'
import { useVtualHydrate } from '@/composables/useVtualHydrate'
import type { VtualPlatform } from '@/api/types'

const router = useRouter()
const { fetchPlatforms, fetchCredentials } = useVtual()
const { hydrateCredentials } = useVtualHydrate()
const { t } = useI18n()

const platforms = ref<VtualPlatform[]>([])
const credentialCounts = ref<Record<string, { active: number; pending: number; total: number }>>({})
const loading = ref(true)
const loadError = ref<string | null>(null)

async function loadPlatforms(): Promise<void> {
  loading.value = true
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

    // Fallback for platforms the batch missed
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
    loading.value = false
  }
}

onMounted(loadPlatforms)
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

    <div v-if="loading" class="py-2">
      <div v-for="i in 4" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
        <SkeletonBlock variant="line" :lines="1" width="30%" class="mb-0" />
        <SkeletonBlock variant="line" :lines="1" width="15%" class="mb-0" />
        <SkeletonBlock variant="line" :lines="1" width="6rem" class="ms-auto mb-0" />
      </div>
    </div>

    <ErrorState v-else-if="loadError" :message="loadError" @retry="loadPlatforms" />

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
