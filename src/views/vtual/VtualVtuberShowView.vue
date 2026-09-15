<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useVtual } from '@/composables/vtual/useVtual'
import { useEchoResync } from '@/composables/useEcho'
import { subscribeVtualCreatorSnapshots, unsubscribeVtualCreatorSnapshots } from '@/composables/vtual/useVtualRealtime'
import type { VtualVtuberProfile } from '@/api/types'
import { safeHttpUrl, safeImageUrl } from '@/utils/safeUrl'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const vtual = useVtual()

const profile = ref<VtualVtuberProfile | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const key = typeof route.params.slug === 'string' ? route.params.slug : ''
    profile.value = await vtual.fetchVtuberProfile(key)
    if (profile.value.slug && profile.value.slug !== key) {
      await router.replace({
        name: 'vtual.vtuber.show.view',
        params: { slug: profile.value.slug },
      })
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.vtual-vtuber.show.errors.load_failed')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
})

// Live update: channel snapshots synced elsewhere refresh the public profile.
const snapshotHandler = () => { void load() }
// Socket-outage recovery: re-pull the profile the snapshot handler reloads.
useEchoResync(() => { void load() })
let subscribedCreatorId: string | null = null

watch(profile, (p) => {
  const id = p?.id ? String(p.id) : null
  if (subscribedCreatorId && subscribedCreatorId !== id) {
    unsubscribeVtualCreatorSnapshots(subscribedCreatorId, snapshotHandler)
    subscribedCreatorId = null
  }
  if (id && subscribedCreatorId !== id && subscribeVtualCreatorSnapshots(id, snapshotHandler)) {
    subscribedCreatorId = id
  }
})

onUnmounted(() => {
  if (subscribedCreatorId) {
    unsubscribeVtualCreatorSnapshots(subscribedCreatorId, snapshotHandler)
    subscribedCreatorId = null
  }
})

function platformIcon(key: string): string {
  if (key === 'youtube') return 'bi-youtube'
  if (key === 'twitch') return 'bi-twitch'
  if (key === 'kick') return 'bi-play-btn'
  return 'bi-broadcast'
}

function externalUrl(value: string | null | undefined): string | null {
  return safeHttpUrl(value)
}

function imageUrl(value: string | null | undefined): string | null {
  return safeImageUrl(value)
}
</script>

<template>
  <div v-if="loading" class="row g-3">
    <div class="col-md-4">
      <div class="card">
        <div class="card-body text-center">
          <SkeletonBlock variant="avatar" width="7rem" />
          <SkeletonBlock variant="line" :lines="2" />
        </div>
      </div>
    </div>
    <div class="col-md-8">
      <div class="card">
        <div class="card-body">
          <SkeletonBlock variant="line" :lines="1" width="40%" />
          <SkeletonBlock variant="line" :lines="6" />
        </div>
      </div>
    </div>
  </div>

  <ErrorState v-else-if="loadError" :message="loadError" @retry="load" />

  <div v-else-if="profile" class="row g-3">
    <!-- Sidebar -->
    <div class="col-md-4">
      <Card>
        <div class="text-center">
          <img
            v-if="imageUrl(profile.avatar_url)"
            :src="imageUrl(profile.avatar_url) ?? undefined"
            class="rounded-circle mb-2"
            style="width: 120px; height: 120px; object-fit: cover;"
          />
          <i v-else class="bi bi-person-circle fs-1"></i>
          <h3 class="h5 mt-2 mb-0">{{ profile.display_name }}</h3>
          <p class="text-muted small">{{ profile.slug }}</p>

          <div v-if="profile.is_claimable" class="mb-2">
            <router-link
              :to="{ name: 'vtual.vtuber.claim.view', params: { slug: profile.slug } }"
              class="btn btn-outline-primary btn-sm"
            >
              <i class="bi bi-shield-check me-1"></i> {{ t('web.vtual-vtuber.show.claim_profile') }}
            </router-link>
          </div>

          <div v-if="profile.claim_blocked_until" class="alert alert-warning small mb-0">
            {{ t('web.vtual-vtuber.show.claim_blocked_until', { until: profile.claim_blocked_until_formatted }) }}
          </div>
        </div>

        <hr v-if="profile.bio" />
        <p v-if="profile.bio" class="small">{{ profile.bio }}</p>

        <hr v-if="profile.channels && profile.channels.length > 0" />
        <div v-if="profile.channels && profile.channels.length > 0">
          <h6 class="small fw-semibold text-muted mb-2">{{ t('web.vtual-vtuber.show.channels_title') }}</h6>
          <div v-for="ch in profile.channels" :key="ch.id" class="d-flex align-items-center gap-2 mb-1">
            <i class="bi" :class="platformIcon(ch.platform?.key ?? '')"></i>
            <a v-if="externalUrl(ch.url)" :href="externalUrl(ch.url) ?? undefined" target="_blank" rel="noopener noreferrer" class="small text-decoration-none">
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
      <Card :title="t('web.vtual-vtuber.show.content_title')">
        <div v-if="!profile.contents || profile.contents.length === 0" class="text-muted text-center py-4">
          <i class="bi bi-collection fs-2 d-block mb-2"></i>
          {{ t('web.vtual-vtuber.show.no_content') }}
        </div>
        <div v-else class="row g-3">
          <div v-for="content in profile.contents" :key="content.id" class="col-md-6">
            <div class="card h-100">
              <img
                v-if="imageUrl(content.thumbnail_url)"
                :src="imageUrl(content.thumbnail_url) ?? undefined"
                class="card-img-top"
                style="object-fit: cover; height: 140px;"
              />
              <div class="card-body">
                <span class="badge text-bg-light mb-1">{{ content.type }}</span>
                <h6 class="card-title small">
                  <a v-if="externalUrl(content.url)" :href="externalUrl(content.url) ?? undefined" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
                    {{ content.title ?? t('web.vtual-vtuber.untitled') }}
                  </a>
                  <span v-else>{{ content.title ?? t('web.vtual-vtuber.untitled') }}</span>
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
