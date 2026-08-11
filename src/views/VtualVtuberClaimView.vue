<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import { useVtual } from '@/composables/useVtual'
import { useAlert } from '@/composables/useAlert'
import type { VtualVtuberProfile, VtualCreatorClaim } from '@/api/types'

const route = useRoute()
const router = useRouter()
const vtual = useVtual()
const { success: showSuccess, error: showError } = useAlert()

const profile = ref<VtualVtuberProfile | null>(null)
const activeClaim = ref<VtualCreatorClaim | null>(null)
const loading = ref(true)
const actionLoading = ref(false)
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)

const hasActiveClaim = computed(() => activeClaim.value?.status === 'pending')
const isBlocked = computed(() => {
  if (hasActiveClaim.value) return false
  return !!profile.value?.claim_blocked_until
})
const showChannelsSection = computed(() => !hasActiveClaim.value && !isBlocked.value)

onMounted(async () => {
  loading.value = true
  try {
    const slug = route.params.slug as string
    profile.value = await vtual.fetchVtuberProfile(slug)

    // Check for existing active claim
    const myClaims = await vtual.fetchMyClaims()
    const existing = myClaims.find((c) => c.creator_id === profile.value?.id && c.status === 'pending')
    if (existing) {
      activeClaim.value = existing
      startPolling()
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load')
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  stopPolling()
})

function startPolling(): void {
  stopPolling()
  pollTimer.value = setInterval(async () => {
    if (!activeClaim.value) return
    try {
      const updated = await vtual.fetchClaim(activeClaim.value.id)
      if (updated.status !== activeClaim.value.status) {
        activeClaim.value = updated
        if (updated.status === 'verified') {
          showSuccess('Claim verified! You now own this profile.')
          stopPolling()
        } else if (updated.status === 'cancelled' || updated.status === 'expired') {
          stopPolling()
        }
      } else {
        activeClaim.value = updated
      }
    } catch {
      // non-critical
    }
  }, 5000)
}

function stopPolling(): void {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

async function handleStartClaim(channelId: string): Promise<void> {
  if (!profile.value || actionLoading.value) return
  actionLoading.value = true
  try {
    activeClaim.value = await vtual.startClaim(profile.value.id, channelId)
    showSuccess('Claim started. Paste the token in your channel description.')
    startPolling()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to start claim')
  } finally {
    actionLoading.value = false
  }
}

async function handleVerify(): Promise<void> {
  if (!activeClaim.value || actionLoading.value) return
  actionLoading.value = true
  try {
    activeClaim.value = await vtual.verifyClaim(activeClaim.value.id)
    showSuccess('Verification queued. Checking your channel bio…')
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Verify failed')
  } finally {
    actionLoading.value = false
  }
}

async function handleVerifyDiscord(): Promise<void> {
  if (!activeClaim.value || actionLoading.value) return
  actionLoading.value = true
  try {
    const result = await vtual.verifyDiscordClaim(activeClaim.value.id)
    activeClaim.value = result
    if (result.status === 'verified') {
      showSuccess('Verified via Discord!')
      stopPolling()
    } else {
      showError('Discord connection does not match this creator.')
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Discord verify failed')
  } finally {
    actionLoading.value = false
  }
}

const monolithWebUrl = import.meta.env.VITE_MONOLITH_WEB_URL ?? ''
const discordConnectUrl = computed(() => {
  if (!monolithWebUrl || !activeClaim.value || !profile.value) return ''
  const params = new URLSearchParams({
    intent: 'claim_verify',
    slug: profile.value.slug,
    claim_id: activeClaim.value.id,
  })
  return `${monolithWebUrl}/auth/discord/redirect?${params.toString()}`
})

async function handleCancel(): Promise<void> {
  if (!activeClaim.value || actionLoading.value) return
  actionLoading.value = true
  try {
    await vtual.cancelClaim(activeClaim.value.id)
    activeClaim.value = null
    showSuccess('Claim cancelled.')
    stopPolling()
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to cancel')
  } finally {
    actionLoading.value = false
  }
}

async function handleAcceptAnyway(): Promise<void> {
  if (!activeClaim.value || actionLoading.value) return
  if (!confirm('Accept this claim without verification?')) return
  actionLoading.value = true
  try {
    const result = await vtual.acceptAnywayClaim(activeClaim.value.id)
    activeClaim.value = result
    if (result.status === 'verified') {
      showSuccess('Claim accepted!')
      stopPolling()
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to accept')
  } finally {
    actionLoading.value = false
  }
}

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

  <div v-else-if="profile">
    <Card :title="`Claim: ${profile.display_name}`">
      <template #actions>
        <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'vtual.vtuber.show.view', params: { slug: profile.slug } })">
          <i class="bi bi-arrow-left me-1"></i> Back to Profile
        </button>
      </template>

      <!-- Blocked -->
      <div v-if="isBlocked" class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-1"></i>
        You are blocked from claiming this profile until
        <strong>{{ profile.claim_blocked_until_formatted }}</strong>.
      </div>

      <!-- Active claim -->
      <div v-else-if="hasActiveClaim && activeClaim" class="row g-3">
        <div class="col-md-8">
          <Card title="Active Claim">
            <div class="mb-3">
              <span class="badge text-bg-warning">{{ activeClaim.status }}</span>
              <span v-if="activeClaim.verify_queue_status" class="badge text-bg-info ms-1">
                Queue: {{ activeClaim.verify_queue_status }}
              </span>
            </div>

            <!-- Proof channel -->
            <div v-if="activeClaim.channel" class="mb-3">
              <div class="text-muted small">Proof Channel</div>
              <div class="d-flex align-items-center gap-2">
                <i class="bi" :class="platformIcon(activeClaim.channel.platform?.key ?? '')"></i>
                <a v-if="activeClaim.channel.url" :href="activeClaim.channel.url" target="_blank">
                  {{ activeClaim.channel.display_name ?? activeClaim.channel.handle ?? '—' }}
                </a>
                <span v-else>{{ activeClaim.channel.display_name ?? activeClaim.channel.handle ?? '—' }}</span>
              </div>
            </div>

            <!-- Token -->
            <div class="mb-3">
              <div class="text-muted small">Token</div>
              <div class="alert alert-info small mb-1">
                Paste this token in your channel description/bio, then click Verify.
              </div>
              <code class="d-block p-2 bg-light rounded user-select-all">{{ activeClaim.token }}</code>
            </div>

            <!-- Attempts -->
            <div class="mb-3" v-if="activeClaim.attempt_count > 0">
              <span class="text-muted small">
                Attempts: {{ activeClaim.attempt_count }} / {{ activeClaim.max_attempts }}
                ({{ activeClaim.attempts_remaining }} remaining)
              </span>
            </div>

            <!-- Actions -->
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-primary" :disabled="actionLoading || !activeClaim.can_verify" @click="handleVerify">
                <span v-if="actionLoading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Verify
              </button>
              <button class="btn btn-outline-danger" :disabled="actionLoading" @click="handleCancel">Cancel</button>
              <button class="btn btn-outline-warning" :disabled="actionLoading" @click="handleAcceptAnyway">Accept Anyway</button>
              <button class="btn btn-outline-secondary" :disabled="actionLoading" @click="handleVerifyDiscord">Verify with Discord</button>
            </div>

            <!-- Discord connect hint -->
            <div v-if="discordConnectUrl" class="mt-2 small text-muted">
              No Discord connected?
              <a :href="discordConnectUrl" target="_blank" class="text-decoration-none">
                <i class="bi bi-discord me-1"></i>Connect Discord first
              </a>
              , then return here and click Verify with Discord.
            </div>
          </Card>
        </div>

        <div class="col-md-4">
          <Card title="Steps">
            <ol class="small mb-0 ps-3">
              <li>Paste the token above in your channel description/bio.</li>
              <li>Wait for the change to be public.</li>
              <li>Click <strong>Verify</strong>.</li>
              <li>We check your channel bio for the token.</li>
              <li>If found, you become the owner of this profile.</li>
            </ol>
          </Card>
        </div>
      </div>

      <!-- Pre-claim: channel list -->
      <div v-else-if="showChannelsSection">
        <p class="text-muted">Select a channel to prove ownership of this profile.</p>
        <div v-if="!profile.channels || profile.channels.length === 0" class="text-muted text-center py-3">
          No channels available for verification.
        </div>
        <div v-else class="row g-2">
          <div v-for="ch in profile.channels" :key="ch.id" class="col-md-6">
            <div class="card h-100">
              <div class="card-body d-flex align-items-center gap-2">
                <i class="bi fs-3" :class="platformIcon(ch.platform?.key ?? '')"></i>
                <div class="flex-grow-1">
                  <div class="small fw-semibold">{{ ch.display_name ?? ch.handle ?? '—' }}</div>
                  <div class="text-muted small">{{ ch.platform?.name }}</div>
                </div>
                <button class="btn btn-primary btn-sm" :disabled="actionLoading" @click="handleStartClaim(ch.id)">
                  Claim
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>
