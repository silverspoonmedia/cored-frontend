/**
 * Profile-show state/actions for VtualProfileShowView.
 *
 * Extracted from the view so the SFC keeps template + section components only.
 * Owns: creator/channels/claims/links/platforms/discord refs, the hydrate-first
 * loadAll, channel + link + claim mutations, and the creator snapshot realtime
 * subscription. Permission flags stay in the view (auth-store binding).
 */
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { confirmDialog } from '@/lib/swal'
import { useVtual } from '@/composables/vtual/useVtual'
import { useVtualRealtime } from '@/composables/vtual/useVtualRealtime'
import { useConnections } from '@/composables/identity/useConnections'
import { useVtualHydrate } from '@/composables/vtual/useVtualHydrate'
import { useAlert } from '@/composables/useAlert'
import { ApiError, type VtualCreator, type VtualChannel, type VtualChannelClaim, type VtualExternalLink, type VtualPlatform, type ProfileConnections } from '@/api/types'
import { safeDiscordAuthorizeUrl } from '@/utils/safeUrl'
import { providerByKey } from '@/composables/identity/useConnections'

function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch] ?? ch)
}

export function useVtualProfileShow() {
  const route = useRoute()
  const { t } = useI18n()
  const vtual = useVtual()
  const realtime = useVtualRealtime()
  const connections = useConnections()
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
      window.location.assign('/apps/vtual/profiles')
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

  async function openConfirm(title: string, message: string, action: () => void | Promise<void>, confirmText = t('ui.actions.confirm'), confirmClass = 'primary'): Promise<void> {
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

  return {
    // state
    creator,
    channels,
    archivedChannels,
    channelClaims,
    links,
    platforms,
    discordConnected,
    loading,
    loadError,
    metaForm,
    savingMeta,
    mergeDestinationId,
    merging,
    linkForm,
    savingLink,
    editingLinkId,
    channelForm,
    addingChannel,
    channelErrors,
    enabledPlatforms,
    profilePlaceholder,
    profileHelp,
    linkKindOptions,
    refreshingChannels,
    // actions
    fieldError,
    loadAll,
    handleRefreshChannels: refreshChannelsOnly,
    handleSaveMeta,
    handleMerge,
    handleSaveLink,
    editLink,
    resetLinkForm,
    handleDeleteLink,
    handleAddChannel,
    openConfirm,
    handleArchiveChannel,
    handleDeletePendingChannel,
    handleRestoreChannel,
    handlePromoteChannel,
    handleVerifyChannelClaim,
    showDiscordVerify,
    handleVerifyDiscordChannelClaim,
    connectDiscordForChannelClaim,
    handleCancelChannelClaim,
    handleAcceptAnywayChannelClaim,
  }
}
