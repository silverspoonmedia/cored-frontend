<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Card from '@/components/Card.vue'
import { useVtual } from '@/composables/useVtual'
import { useAlert } from '@/composables/useAlert'
import type { VtualVtuberProfile } from '@/api/types'

const route = useRoute()
const vtual = useVtual()
const { error: showError } = useAlert()

const profile = ref<VtualVtuberProfile | null>(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    profile.value = await vtual.fetchVtuberProfile(route.params.slug as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load profile')
  } finally {
    loading.value = false
  }
})

function platformIcon(key: string): string {
  if (key === 'youtube') return 'bi-youtube'
  if (key === 'twitch') return 'bi-twitch'
  if (key === 'kick') return 'bi-play-btn'
  return 'bi-broadcast'
}
</script>

<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading…</span>
    </div>
  </div>

  <div v-else-if="profile" class="row g-3">
    <!-- Sidebar -->
    <div class="col-md-4">
      <Card>
        <div class="text-center">
          <img
            v-if="profile.avatar_url"
            :src="profile.avatar_url"
            class="rounded-circle mb-2"
            style="width: 120px; height: 120px; object-fit: cover;"
          />
          <i v-else class="bi bi-person-circle fs-1"></i>
          <h3 class="h5 mt-2 mb-0">{{ profile.display_name }}</h3>
          <p class="text-muted small">{{ profile.slug }}</p>

          <div v-if="profile.is_claimable" class="mb-2">
            <a
              v-if="profile.claim_process_url"
              :href="profile.claim_process_url"
              class="btn btn-outline-primary btn-sm"
            >
              <i class="bi bi-shield-check me-1"></i> Claim Profile
            </a>
          </div>

          <div v-if="profile.claim_blocked_until" class="alert alert-warning small mb-0">
            Claim blocked until {{ profile.claim_blocked_until_formatted }}
          </div>
        </div>

        <hr v-if="profile.bio" />
        <p v-if="profile.bio" class="small">{{ profile.bio }}</p>

        <hr v-if="profile.channels && profile.channels.length > 0" />
        <div v-if="profile.channels && profile.channels.length > 0">
          <h6 class="small fw-semibold text-muted mb-2">Channels</h6>
          <div v-for="ch in profile.channels" :key="ch.id" class="d-flex align-items-center gap-2 mb-1">
            <i class="bi" :class="platformIcon(ch.platform?.key ?? '')"></i>
            <a v-if="ch.url" :href="ch.url" target="_blank" class="small text-decoration-none">
              {{ ch.display_name ?? ch.handle ?? '—' }}
            </a>
            <span v-else class="small">{{ ch.display_name ?? ch.handle ?? '—' }}</span>
            <small class="text-muted">{{ ch.subscriber_count_formatted ?? '' }}</small>
          </div>
        </div>
      </Card>
    </div>

    <!-- Content panel -->
    <div class="col-md-8">
      <Card title="Content">
        <div v-if="!profile.contents || profile.contents.length === 0" class="text-muted text-center py-4">
          <i class="bi bi-collection fs-2 d-block mb-2"></i>
          No content available.
        </div>
        <div v-else class="row g-3">
          <div v-for="content in profile.contents" :key="content.id" class="col-md-6">
            <div class="card h-100">
              <img
                v-if="content.thumbnail_url"
                :src="content.thumbnail_url"
                class="card-img-top"
                style="object-fit: cover; height: 140px;"
              />
              <div class="card-body">
                <span class="badge text-bg-light mb-1">{{ content.type }}</span>
                <h6 class="card-title small">
                  <a v-if="content.url" :href="content.url" target="_blank" class="text-decoration-none">
                    {{ content.title ?? 'Untitled' }}
                  </a>
                  <span v-else>{{ content.title ?? 'Untitled' }}</span>
                </h6>
                <div class="text-muted small">
                  {{ content.platform?.name ?? '—' }}
                  <span v-if="content.published_at_formatted"> · {{ content.published_at_formatted }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>
