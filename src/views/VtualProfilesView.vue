<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useVtual } from '@/composables/useVtual'
import { useAlert } from '@/composables/useAlert'
import type { VtualCreator } from '@/api/types'

const { fetchOwned } = useVtual()
const { error: showError } = useAlert()
const { t } = useI18n()

const profiles = ref<VtualCreator[]>([])
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    profiles.value = await fetchOwned()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.failed_load_profiles'))
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <Card :title="t('web.vtual.my_creator_profiles')">
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

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
                  v-if="p.avatar_url"
                  :src="p.avatar_url"
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
                v-if="p.profile_url"
                :href="p.profile_url"
                target="_blank"
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
