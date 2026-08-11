<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Card from '@/components/Card.vue'
import { useVtual } from '@/composables/useVtual'
import { useAlert } from '@/composables/useAlert'
import type { VtualCreator } from '@/api/types'

const { fetchOwned } = useVtual()
const { error: showError } = useAlert()

const profiles = ref<VtualCreator[]>([])
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    profiles.value = await fetchOwned()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load profiles')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <Card title="My Creator Profiles">
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <div v-else-if="profiles.length === 0" class="text-muted text-center py-4">
      No creator profiles found.
    </div>

    <div v-else class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Creator</th>
            <th>Slug</th>
            <th class="text-center">Channels</th>
            <th class="text-end">Actions</th>
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
