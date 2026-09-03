<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { confirmDialog } from '@/lib/swal'
import StatusBadge from '@/components/StatusBadge.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import { useVtual } from '@/composables/vtual/useVtual'
import { useVtualRealtime } from '@/composables/vtual/useVtualRealtime'
import { useConnections, providerByKey } from '@/composables/identity/useConnections'
import { useVtualHydrate } from '@/composables/vtual/useVtualHydrate'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import {
  ApiError,
  type VtualCreator,
  type VtualChannel,
  type VtualChannelClaim,
  type VtualExternalLink,
  type VtualPlatform,
  type ProfileConnections,
} from '@/api/types'
import { VTUAL_STATUS_BADGE, type BadgeColor } from '@/utils/statusBadge'
import { safeDiscordAuthorizeUrl, safeHttpUrl, safeImageUrl } from '@/utils/safeUrl'

const PROFILE_CHANNEL_BADGE: Record<string, BadgeColor> = {
  ...VTUAL_STATUS_BADGE,
  disconnected: 'secondary',
}

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const vtual = useVtual()
const realtime = useVtualRealtime()
const connections = useConnections()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError, info: showInfo } = useAlert()

const creator = ref<VtualCreator | null>(null)
const channels = ref<VtualChannel[]>([])
const archivedChannels = ref<VtualChannel[]>([])
const channelClaims = ref<VtualChannelClaim[]>([])
const links = ref<VtualExternalLink[]>([])
const platforms = ref<VtualPlatform[]>([])
const discordSnapshot = ref<ProfileConnections | null>(null)
const discordConnected = computed(() => providerByKey(discordSnapshot.value, 'discord')?.connected === true)
const loading = ref(true)
const loadError = ref<string | null>(null)

function externalUrl(value: string | null | undefined): string | null {
  return safeHttpUrl(value)
}

function imageUrl(value: string | null | undefined): string | null {
  return safeImageUrl(value)
}

const canMutate = computed(() => hasPermission('edit vtual creator') || creator.value?.my_role === 'owner' || creator.value?.my_role === 'editor')
const canAcceptAnyway = computed(() => hasPermission('manage any vtual resource'))

// Meta form
const metaForm = reactive({
  display_name: '',
  slug: '',
  bio: '',
  avatar_url: '',
})
const savingMeta = ref(false)

// Merge form
const mergeDestinationId = ref('')
const merging = ref(false)

// Link form
const linkForm = reactive({ label: '', url: '', kind: 'social' })
const savingLink = ref(false)
const editingLinkId = ref<string | null>(null)

// Channel add form
const channelForm = reactive({ platform_key: '', profile: '' })
const addingChannel = ref(false)
const channelErrors = ref<Record<string, string[]>>({})

const enabledPlatforms = computed(() => platforms.value.filter((platform) => platform.enabled))

const profilePlaceholder = computed(() => {
  if (channelForm.platform_key === 'twitch') {
    return t('web.vtual.profile_placeholder_twitch')
  }
  return t('web.vtual.profile_placeholder_youtube')
})

const profileHelp = computed(() => {
  if (channelForm.platform_key === 'twitch') {
    return t('web.vtual.profile_help_twitch')
  }
  return t('web.vtual.profile_help_youtube')
})

function defaultPlatformKey(): string {
  return enabledPlatforms.value[0]?.key ?? ''
}

function fieldError(bag: Record<string, string[]>, field: string): string | null {
  const list = bag[field]
  if (list && list.length > 0) {
    return list[0] ?? null
  }
  return null
}

function channelStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: t('web.vtual.profiles.channels.status_pending'),
    active: t('web.vtual.profiles.channels.status_active'),
    disconnected: t('web.vtual.profiles.channels.status_disconnected'),
    archived: t('web.vtual.profiles.channels.status_archived'),
  }
  return map[status] ?? status
}

const channelTableColspan = computed(() => (canMutate.value ? 6 : 5))

// Modals
function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch] ?? ch)
}

const linkKindOptions = computed(() => [
  { value: 'social', label: t('web.vtual.profiles.link_kinds.social') },
  { value: 'donation', label: t('web.vtual.profiles.link_kinds.donation') },
  { value: 'website', label: t('web.vtual.profiles.link_kinds.website') },
  { value: 'other', label: t('web.vtual.profiles.link_kinds.other') },
])

const { hydrateProfileShow } = useVtualHydrate()

async function loadAll(): Promise<void> {
  loading.value = true
  loadError.value = null
  const id = route.params.id as string
  try {
    const batchResult = await hydrateProfileShow(id).catch(() => null)

    if (batchResult && batchResult.creator) {
      creator.value = batchResult.creator
      channels.value = batchResult.channels ?? await vtual.fetchChannels(id)
      archivedChannels.value = batchResult.archivedChannels ?? await vtual.fetchArchivedChannels(id)
      channelClaims.value = batchResult.channelClaims ?? await vtual.fetchChannelClaims(id)
      links.value = batchResult.links ?? await vtual.fetchLinks(id)
      platforms.value = batchResult.platforms ?? await vtual.fetchPlatforms()
      discordSnapshot.value = batchResult.connections
    } else {
      const [c, ch, arch, claims, lks, plats, discord] = await Promise.all([
        vtual.fetchCreator(id),
        vtual.fetchChannels(id),
        vtual.fetchArchivedChannels(id),
        vtual.fetchChannelClaims(id),
        vtual.fetchLinks(id),
        vtual.fetchPlatforms(),
        connections.fetchConnections().catch(() => null),
      ])
      creator.value = c
      channels.value = ch
      archivedChannels.value = arch
      channelClaims.value = claims
      links.value = lks
      platforms.value = plats
      discordSnapshot.value = discord
    }

    if (creator.value) {
      metaForm.display_name = creator.value.display_name
      metaForm.slug = creator.value.slug
      metaForm.bio = creator.value.bio ?? ''
      metaForm.avatar_url = creator.value.avatar_url ?? ''
    }

    if (!channelForm.platform_key) {
      channelForm.platform_key = defaultPlatformKey()
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.vtual.profiles.errors.load_failed')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const status = params.get('discord')
  if (status === 'connected') {
    showSuccess(t('web.identity-connections.discord_connected_flash'))
  } else if (status === 'denied') {
    showError(t('web.identity-connections.discord_denied'))
  } else if (status === 'error') {
    showError(t('web.vtual-vtuber.claim_discord_verify_failed'))
  }
  if (status) {
    const url = new URL(window.location.href)
    url.searchParams.delete('discord')
    window.history.replaceState({}, '', url.toString())
  }
  const creatorId = route.params.id as string
  realtime.subscribeCreatorSnapshots(creatorId, onSnapshotUpdated)
  void loadAll()
})

onUnmounted(() => {
  realtime.unsubscribeCreatorSnapshots(route.params.id as string, onSnapshotUpdated)
})

const refreshingChannels = ref(false)

async function refreshChannelsOnly(): Promise<void> {
  const id = route.params.id as string
  refreshingChannels.value = true
  try {
    const [ch, arch] = await Promise.all([
      vtual.fetchChannels(id),
      vtual.fetchArchivedChannels(id),
    ])
    channels.value = ch
    archivedChannels.value = arch
  } catch {
    // keep stale rows; transient fetch failure is non-fatal here
  } finally {
    refreshingChannels.value = false
  }
}

function onSnapshotUpdated(): void {
  showInfo(t('web.vtual.profiles.channels_updated'))
  void refreshChannelsOnly()
}

async function handleRefreshChannels(): Promise<void> {
  await refreshChannelsOnly()
}

async function handleSaveMeta(): Promise<void> {
  if (!creator.value || savingMeta.value) return
  savingMeta.value = true
  try {
    creator.value = await vtual.updateCreator(creator.value.id, {
      display_name: metaForm.display_name,
      slug: metaForm.slug,
      bio: metaForm.bio,
      avatar_url: metaForm.avatar_url,
    })
    showSuccess(t('web.vtual.profiles.ajax.profile_updated'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.update_failed'))
  } finally {
    savingMeta.value = false
  }
}

async function handleMerge(): Promise<void> {
  if (!creator.value || !mergeDestinationId.value || merging.value) return
  merging.value = true
  try {
    await vtual.mergeCreator(creator.value.id, mergeDestinationId.value)
    showSuccess(t('web.vtual.profiles.ajax.creators_merged'))
    router.push({ name: 'vtual.profiles.index.view' })
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.merge_failed'))
  } finally {
    merging.value = false
  }
}

async function handleSaveLink(): Promise<void> {
  if (!creator.value || savingLink.value) return
  savingLink.value = true
  try {
    if (editingLinkId.value) {
      const updated = await vtual.updateLink(editingLinkId.value, {
        label: linkForm.label,
        url: linkForm.url,
        kind: linkForm.kind,
      })
      const idx = links.value.findIndex((l) => l.id === editingLinkId.value)
      if (idx >= 0) links.value[idx] = updated
    } else {
      const created = await vtual.addLink(creator.value.id, {
        label: linkForm.label,
        url: linkForm.url,
        kind: linkForm.kind,
      })
      links.value.push(created)
    }
    showSuccess(t('web.vtual.profiles.ajax.link_saved'))
    linkForm.label = ''
    linkForm.url = ''
    linkForm.kind = 'social'
    editingLinkId.value = null
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.link_save_failed'))
  } finally {
    savingLink.value = false
  }
}

function editLink(link: VtualExternalLink): void {
  editingLinkId.value = link.id
  linkForm.label = link.label
  linkForm.url = link.url
  linkForm.kind = link.kind
}

function resetLinkForm(): void {
  editingLinkId.value = null
  linkForm.label = ''
  linkForm.url = ''
  linkForm.kind = 'social'
}

async function handleDeleteLink(linkId: string): Promise<void> {
  try {
    await vtual.deleteLink(linkId)
    links.value = links.value.filter((l) => l.id !== linkId)
    showSuccess(t('web.vtual.profiles.ajax.link_removed'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.link_delete_failed'))
  }
}

async function handleAddChannel(): Promise<void> {
  if (!creator.value || addingChannel.value) return
  addingChannel.value = true
  channelErrors.value = {}
  try {
    const result = await vtual.addChannel(creator.value.id, channelForm.platform_key, channelForm.profile)
    if ('attempt_count' in result) {
      channelClaims.value.push(result)
      showSuccess(t('web.vtual.profiles.ajax.channel_claim_started'))
    } else {
      channels.value.push(result)
      showSuccess(t('web.vtual.profiles.ajax.channel_added'))
    }
    channelForm.profile = ''
    channelForm.platform_key = defaultPlatformKey()
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      channelErrors.value = e.errors ?? {}
      if (Object.keys(channelErrors.value).length === 0) {
        showError(e.message)
      }
    } else {
      showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.channel_add_failed'))
    }
  } finally {
    addingChannel.value = false
  }
}

async function openConfirm(title: string, message: string, action: () => Promise<void>, confirmText = t('ui.actions.confirm'), confirmClass = 'primary'): Promise<void> {
  const confirmed = await confirmDialog({
    title,
    html: `<p>${escapeHtml(message)}</p>`,
    confirmText,
    danger: confirmClass !== 'primary',
  })
  if (confirmed) await action()
}

async function handleArchiveChannel(channelId: string): Promise<void> {
  try {
    const updated = await vtual.archiveChannel(channelId)
    channels.value = channels.value.filter((c) => c.id !== channelId)
    archivedChannels.value.push(updated)
    showSuccess(t('web.vtual.profiles.ajax.channel_archived'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.archive_failed'))
  }
}

async function handleDeletePendingChannel(channelId: string): Promise<void> {
  try {
    await vtual.deletePendingChannel(channelId)
    channels.value = channels.value.filter((c) => c.id !== channelId)
    showSuccess(t('web.vtual.profiles.ajax.channel_deleted'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.channel_delete_failed'))
  }
}

async function handleRestoreChannel(channelId: string): Promise<void> {
  try {
    const updated = await vtual.restoreChannel(channelId)
    archivedChannels.value = archivedChannels.value.filter((c) => c.id !== channelId)
    channels.value.push(updated)
    showSuccess(t('web.vtual.profiles.ajax.channel_restored'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.restore_failed'))
  }
}

async function handlePromoteChannel(channelId: string): Promise<void> {
  try {
    const updated = await vtual.promoteChannel(channelId)
    const idx = channels.value.findIndex((c) => c.id === channelId)
    if (idx >= 0) channels.value[idx] = updated
    showSuccess(t('web.vtual.profiles.ajax.channel_promoted'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.promote_failed'))
  }
}

async function handleVerifyChannelClaim(claimId: string): Promise<void> {
  try {
    const updated = await vtual.verifyChannelClaim(claimId)
    const idx = channelClaims.value.findIndex((c) => c.id === claimId)
    if (idx >= 0) channelClaims.value[idx] = updated
    if (updated.status === 'verified' && updated.channel_id) {
      channelClaims.value = channelClaims.value.filter((c) => c.id !== claimId)
    }
    showSuccess(t('web.vtual.profiles.ajax.verification_queued'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.verify_failed'))
  }
}

function showDiscordVerify(claim: VtualChannelClaim): boolean {
  const key = claim.platform?.key ?? ''
  return key !== '' && key !== 'kick'
}

async function handleVerifyDiscordChannelClaim(claim: VtualChannelClaim): Promise<void> {
  if (!creator.value) return
  try {
    const updated = await vtual.verifyDiscordChannelClaim(claim.id)
    const idx = channelClaims.value.findIndex((c) => c.id === claim.id)
    if (idx >= 0) channelClaims.value[idx] = updated
    if (updated.status === 'verified') {
      channelClaims.value = channelClaims.value.filter((c) => c.id !== claim.id)
      showSuccess(t('web.vtual-vtuber.claim_discord_verified'))
    } else {
      showError(t('web.vtual-vtuber.claim_discord_verify_failed'))
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.verify_failed'))
  }
}

async function connectDiscordForChannelClaim(claim: VtualChannelClaim): Promise<void> {
  if (!creator.value) return
  try {
    const url = await connections.authorizeUrl({
      intent: 'channel_claim_verify',
      slug: creator.value.slug,
      claim_id: claim.id,
      return_path: `/apps/vtual/profiles/${creator.value.id}`,
    })
    const safeUrl = safeDiscordAuthorizeUrl(url)
    if (!safeUrl) {
      await showError(t('web.identity-connections.authorization_failed'))
      return
    }
    window.location.assign(safeUrl)
  } catch (e) {
    await showError(e instanceof Error ? e.message : t('web.identity-connections.discord_not_configured'))
  }
}

async function handleCancelChannelClaim(claimId: string): Promise<void> {
  try {
    await vtual.cancelChannelClaim(claimId)
    channelClaims.value = channelClaims.value.filter((c) => c.id !== claimId)
    showSuccess(t('web.vtual.profiles.ajax.claim_cancelled'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.cancel_failed'))
  }
}

async function handleAcceptAnywayChannelClaim(claimId: string): Promise<void> {
  try {
    const updated = await vtual.acceptAnywayChannelClaim(claimId)
    if (updated.status === 'verified') {
      channelClaims.value = channelClaims.value.filter((c) => c.id !== claimId)
    }
    showSuccess(t('web.vtual.profiles.ajax.claim_accepted'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.accept_failed'))
  }
}
</script>

<template>
  <div v-if="loading" class="card">
    <div class="card-body">
      <SkeletonBlock variant="line" :lines="1" width="35%" />
      <SkeletonBlock variant="line" :lines="8" />
    </div>
  </div>

  <ErrorState v-else-if="loadError" :message="loadError" @retry="loadAll" />

  <template v-else-if="creator">
    <Card :title="t('web.vtual.profiles.profile_title')">
      <template #actions>
        <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'vtual.profiles.index.view' }">
          <i class="bi bi-arrow-left me-1"></i> {{ t('web.vtual.profiles.page_title') }}
        </router-link>
        <a v-if="externalUrl(creator.profile_url)" :href="externalUrl(creator.profile_url) ?? undefined" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm ms-1">
          <i class="bi bi-box-arrow-up-right me-1"></i> {{ t('web.vtual.profiles.view_profile') }}
        </a>
      </template>

      <form @submit.prevent="handleSaveMeta">
        <FormInput
          name="display_name"
          :label="t('web.vtual.profiles.fields.display_name')"
          v-model="metaForm.display_name"
          required
          :disabled="savingMeta"
        />
        <FormInput
          name="slug"
          :label="t('web.vtual.profiles.fields.slug')"
          v-model="metaForm.slug"
          required
          :disabled="savingMeta"
        />
        <FormTextarea
          name="bio"
          :label="t('web.vtual.profiles.fields.bio')"
          v-model="metaForm.bio"
          :disabled="savingMeta"
          :rows="4"
        />
        <FormInput
          name="avatar_url"
          :label="t('web.vtual.profiles.fields.avatar_url')"
          type="url"
          v-model="metaForm.avatar_url"
          :disabled="savingMeta"
        />
        <SubmitButton v-if="canMutate" :loading="savingMeta" :label="t('ui.actions.save')" />
      </form>
    </Card>

    <Card :title="t('web.vtual.profiles.channels.section_title')" class="mt-3">
      <template #actions>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          :disabled="refreshingChannels"
          @click="handleRefreshChannels"
        >
          <span v-if="refreshingChannels" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          <i v-else class="bi bi-arrow-clockwise me-1"></i>
          {{ t('web.vtual.profiles.refresh') }}
        </button>
      </template>
      <p class="text-muted small mb-3">{{ t('web.vtual.profiles.channels.section_help') }}</p>

      <form
        v-if="canMutate && platforms.length > 0"
        class="border rounded p-3 mb-3"
        @submit.prevent="handleAddChannel"
      >
        <div class="row g-2 align-items-start">
          <div class="col-md-3">
            <FormSelect
              name="platform_key"
              :label="t('web.vtual.profiles.fields.platform')"
              v-model="channelForm.platform_key"
              :options="enabledPlatforms.map((p) => ({ value: p.key, label: p.name }))"
              :error="fieldError(channelErrors, 'platform_key')"
              required
              :disabled="addingChannel"
            />
          </div>
          <div class="col-md-6">
            <FormInput
              name="profile"
              :label="t('web.vtual.profiles.fields.profile_url')"
              v-model="channelForm.profile"
              :error="fieldError(channelErrors, 'profile')"
              :placeholder="profilePlaceholder"
              :disabled="addingChannel"
              required
              :maxlength="512"
            />
          </div>
          <div class="col-md-3">
            <div class="mb-3">
              <label class="form-label" aria-hidden="true">
                &nbsp;<span class="text-danger invisible">*</span>
              </label>
              <div class="d-grid">
                <SubmitButton
                  :loading="addingChannel"
                  :label="t('web.vtual.add_button')"
                />
              </div>
            </div>
          </div>
        </div>
        <p class="form-text mb-0 mt-2">{{ profileHelp }}</p>
      </form>

      <div v-if="channelClaims.length > 0" class="mb-3">
        <h6 class="mb-2">{{ t('web.vtual.profiles.channel_claims_title') }}</h6>
        <div v-for="claim in channelClaims" :key="claim.id" class="border rounded p-2 mb-2">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <StatusBadge :status="claim.status" :mapping="VTUAL_STATUS_BADGE" fallback="light" />
              <code class="small ms-1">{{ claim.handle ?? claim.external_id }}</code>
            </div>
            <small class="text-muted">{{ claim.platform?.name }}</small>
          </div>
          <div v-if="claim.token" class="mt-2">
            <div class="text-muted small">{{ t('web.vtual.profiles.token_label') }}:</div>
            <code class="small d-block p-1 bg-light rounded">{{ claim.token }}</code>
          </div>
          <div class="mt-2 d-flex flex-wrap gap-1" v-if="canMutate">
            <button class="btn btn-primary btn-sm" @click="handleVerifyChannelClaim(claim.id)">{{ t('web.vtual.actions.verify') }}</button>
            <template v-if="showDiscordVerify(claim)">
              <button
                v-if="discordConnected"
                class="btn btn-outline-primary btn-sm"
                @click="handleVerifyDiscordChannelClaim(claim)"
              >{{ t('web.vtual-vtuber.claim_discord_verify_button') }}</button>
              <button
                v-else
                class="btn btn-outline-secondary btn-sm"
                @click="connectDiscordForChannelClaim(claim)"
              >{{ t('web.vtual-vtuber.claim_discord_connect_cta') }}</button>
            </template>
            <button class="btn btn-outline-secondary btn-sm" @click="handleCancelChannelClaim(claim.id)">{{ t('web.vtual.actions.cancel') }}</button>
            <button v-if="canAcceptAnyway" class="btn btn-outline-warning btn-sm" @click="openConfirm(t('web.vtual.confirm.accept_anyway_title'), t('web.vtual.confirm.accept_anyway_body'), () => handleAcceptAnywayChannelClaim(claim.id), t('web.vtual.actions.accept'), 'warning')">{{ t('web.vtual.actions.accept_anyway') }}</button>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table
          class="table table-sm table-hover align-middle mb-0"
          :aria-label="t('web.vtual.profiles.channels.table_caption')"
        >
          <caption class="visually-hidden">{{ t('web.vtual.profiles.channels.table_caption') }}</caption>
          <thead>
            <tr>
              <th>{{ t('web.vtual.profiles.channels.avatar') }}</th>
              <th>{{ t('web.vtual.profiles.channels.platform') }}</th>
              <th>{{ t('web.vtual.profiles.channels.profile_or_id') }}</th>
              <th>{{ t('web.vtual.profiles.channels.handle') }}</th>
              <th>{{ t('web.vtual.profiles.channels.status') }}</th>
              <th v-if="canMutate">{{ t('web.vtual.profiles.channels.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <TableEmptyRow
              v-if="channels.length === 0"
              :colspan="channelTableColspan"
              icon="bi-broadcast-pin"
              :title="t('web.vtual.profiles.channels.empty')"
            />
            <tr v-for="ch in channels" :key="ch.id" :data-channel-id="ch.id">
              <td class="text-nowrap">
                <img
                  v-if="imageUrl(ch.avatar_url)"
                  :src="imageUrl(ch.avatar_url) ?? undefined"
                  :alt="ch.display_name || ch.handle || ''"
                  class="rounded-circle object-fit-cover"
                  width="36"
                  height="36"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
                <span v-else class="text-muted small">—</span>
              </td>
              <td>{{ ch.platform?.name ?? ch.platform?.key ?? '—' }}</td>
              <td>
                <code class="user-select-all">{{ ch.profile_input || ch.external_id || '' }}</code>
              </td>
              <td>{{ ch.handle || '—' }}</td>
              <td>
                <StatusBadge
                  :status="ch.status"
                  :label="channelStatusLabel(ch.status)"
                  :mapping="PROFILE_CHANNEL_BADGE"
                  fallback="secondary"
                />
                <div v-if="ch.resolve_error" class="form-text text-danger">{{ ch.resolve_error }}</div>
              </td>
              <td v-if="canMutate" class="text-nowrap">
                <div class="d-flex flex-wrap gap-1">
                  <button v-if="ch.visibility === 'private' && ch.discovery_source === 'discord_connection'" class="btn btn-outline-primary btn-sm" @click="handlePromoteChannel(ch.id)">{{ t('web.vtual.actions.promote') }}</button>
                  <button v-if="ch.status === 'pending'" class="btn btn-outline-danger btn-sm" @click="openConfirm(t('web.vtual.confirm.delete_pending_channel_title'), t('web.vtual.confirm.delete_pending_channel_body'), () => handleDeletePendingChannel(ch.id), t('web.vtual.actions.delete'), 'warning')">{{ t('web.vtual.actions.delete') }}</button>
                  <button v-else class="btn btn-outline-danger btn-sm" @click="openConfirm(t('web.vtual.confirm.archive_channel_title'), t('web.vtual.confirm.archive_channel_body'), () => handleArchiveChannel(ch.id), t('web.vtual.actions.archive'), 'warning')">{{ t('web.vtual.actions.archive') }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="archivedChannels.length > 0" class="mt-4">
        <h6 class="mb-2">{{ t('web.vtual.profiles.archived_channels_title') }}</h6>
        <div class="table-responsive">
          <table
            class="table table-sm table-hover align-middle mb-0"
            :aria-label="t('web.vtual.profiles.channels.archived_table_caption')"
          >
            <caption class="visually-hidden">{{ t('web.vtual.profiles.channels.archived_table_caption') }}</caption>
            <thead>
              <tr>
                <th>{{ t('web.vtual.profiles.channels.avatar') }}</th>
                <th>{{ t('web.vtual.profiles.channels.platform') }}</th>
                <th>{{ t('web.vtual.profiles.channels.profile_or_id') }}</th>
                <th>{{ t('web.vtual.profiles.channels.handle') }}</th>
                <th>{{ t('web.vtual.profiles.channels.status') }}</th>
                <th v-if="canMutate">{{ t('web.vtual.profiles.channels.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ch in archivedChannels" :key="ch.id" :data-channel-id="ch.id">
                <td class="text-nowrap">
                  <img
                    v-if="imageUrl(ch.avatar_url)"
                    :src="imageUrl(ch.avatar_url) ?? undefined"
                    :alt="ch.display_name || ch.handle || ''"
                    class="rounded-circle object-fit-cover"
                    width="36"
                    height="36"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                  />
                  <span v-else class="text-muted small">—</span>
                </td>
                <td>{{ ch.platform?.name ?? ch.platform?.key ?? '—' }}</td>
                <td>
                  <code class="user-select-all">{{ ch.profile_input || ch.external_id || '' }}</code>
                </td>
                <td>{{ ch.handle || '—' }}</td>
                <td>
                  <StatusBadge
                    :status="ch.status"
                    :label="channelStatusLabel(ch.status)"
                    :mapping="PROFILE_CHANNEL_BADGE"
                    fallback="secondary"
                  />
                </td>
                <td v-if="canMutate">
                  <button class="btn btn-outline-success btn-sm" @click="handleRestoreChannel(ch.id)">{{ t('web.vtual.actions.restore') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>

    <Card :title="t('web.vtual.profiles.links_title')" class="mt-3">
      <form v-if="canMutate" @submit.prevent="handleSaveLink" class="row g-2 mb-3 align-items-start">
        <div class="col-md-3">
          <FormInput name="link_label" :label="t('web.vtual.profiles.fields.link_label')" v-model="linkForm.label" required />
        </div>
        <div class="col-md-4">
          <FormInput name="link_url" :label="t('web.vtual.profiles.fields.link_url')" v-model="linkForm.url" required />
        </div>
        <div class="col-md-3">
          <FormSelect name="link_kind" :label="t('web.vtual.profiles.fields.link_kind')" v-model="linkForm.kind" :options="linkKindOptions" />
        </div>
        <div class="col-md-2">
          <div class="mb-3">
            <label class="form-label" aria-hidden="true">
              &nbsp;<span class="text-danger invisible">*</span>
            </label>
            <div class="d-grid gap-2">
              <SubmitButton :loading="savingLink" :label="editingLinkId ? t('ui.actions.update') : t('ui.actions.add')" />
              <button v-if="editingLinkId" type="button" class="btn btn-outline-secondary" @click="resetLinkForm">{{ t('ui.actions.cancel') }}</button>
            </div>
          </div>
        </div>
      </form>

      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>{{ t('web.vtual.profiles.fields.link_label') }}</th>
              <th>{{ t('web.vtual.profiles.fields.link_url') }}</th>
              <th>{{ t('web.vtual.profiles.fields.link_kind') }}</th>
              <th v-if="canMutate"></th>
            </tr>
          </thead>
          <tbody>
            <TableEmptyRow
              v-if="links.length === 0"
              :colspan="canMutate ? 4 : 3"
              icon="bi-link-45deg"
              :title="t('web.vtual.profiles.no_links')"
            />
            <tr v-for="link in links" :key="link.id">
              <td class="small">{{ link.label }}</td>
              <td class="small">
                <a v-if="externalUrl(link.url)" :href="externalUrl(link.url) ?? undefined" target="_blank" rel="noopener noreferrer">{{ link.url }}</a>
                <span v-else>{{ link.url }}</span>
              </td>
              <td><span class="badge text-bg-light">{{ link.kind }}</span></td>
              <td v-if="canMutate" class="text-end">
                <button class="btn btn-outline-secondary btn-sm" @click="editLink(link)"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-outline-danger btn-sm ms-1" @click="openConfirm(t('web.vtual.confirm.delete_link_title'), t('web.vtual.confirm.delete_link_body'), () => handleDeleteLink(link.id), t('ui.actions.delete'), 'danger')"><i class="bi bi-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <Card :title="t('web.vtual.profiles.merge_title')" class="mt-3" v-if="canMutate">
      <p class="text-muted small">{{ t('web.vtual.profiles.merge_desc_short') }}</p>
      <form @submit.prevent="handleMerge" class="row g-2 align-items-start">
        <div class="col-md-8">
          <FormInput name="destination_id" :label="t('web.vtual.profiles.fields.destination_id')" v-model="mergeDestinationId" :placeholder="t('web.vtual.profiles.uuid_placeholder')" />
        </div>
        <div class="col-md-4">
          <div class="mb-3">
            <label class="form-label" aria-hidden="true">
              &nbsp;<span class="text-danger invisible">*</span>
            </label>
            <div class="d-grid">
              <SubmitButton :loading="merging" :label="t('web.vtual.profiles.merge_button')" variant="danger" />
            </div>
          </div>
        </div>
      </form>
    </Card>
  </template>
</template>
