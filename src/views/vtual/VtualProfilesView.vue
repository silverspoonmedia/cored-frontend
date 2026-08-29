<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
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

onMounted(loadProfiles)
</script>

<template>
  <Card :title="t('web.vtual.my_creator_profiles')">
    <div v-if="loading" class="py-2">
      <div v-for="i in 4" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
        <SkeletonBlock variant="avatar" width="2rem" />
        <SkeletonBlock variant="line" :lines="1" width="40%" class="mb-0" />
        <SkeletonBlock variant="line" :lines="1" width="5rem" class="ms-auto mb-0" />
      </div>
    </div>

    <ErrorState v-else-if="loadError" :message="loadError" @retry="loadProfiles" />

    <div v-else-if="profiles.length === 0" class="text-muted text-center py-4">
      {{ t('web.vtual.no_creator_profiles') }}
    </div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>{{ t('web.vtual.creator_col') }}</th>
            <th>{{ t('web.vtual.slug_col') }}</th>
            <th class="text-center">{{ t('web.vtual.channels_col') }}</th>
            <th class="text-end">{{ t('web.vtual.actions_col') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in profiles" :key="p.id">
            <td>
              <div class="d-flex align-items-center gap-2">
                <img
                  v-if="imageUrl(p.avatar_url)"
                  :src="imageUrl(p.avatar_url) ?? undefined"
                  :alt="p.display_name"
                  class="rounded-circle"
                  width="32"
                  height="32"
                />
                <div>
                  <div class="fw-semibold">{{ p.display_name }}</div>
                  <div class="text-muted small">{{ p.bio ?? '' }}</div>
                </div>
              </div>
            </td>
            <td><code>{{ p.slug }}</code></td>
            <td class="text-center">{{ p.channels_count ?? 0 }}</td>
            <td class="text-end">
              <a
                v-if="externalUrl(p.profile_url)"
                :href="externalUrl(p.profile_url) ?? undefined"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-outline-info btn-sm"
              >
                <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
