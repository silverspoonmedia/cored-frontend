<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useVtual } from '@/composables/useVtual'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type {
  VtualCreator,
  VtualChannel,
  VtualChannelClaim,
  VtualExternalLink,
  VtualPlatform,
} from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const vtual = useVtual()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const creator = ref<VtualCreator | null>(null)
const channels = ref<VtualChannel[]>([])
const archivedChannels = ref<VtualChannel[]>([])
const channelClaims = ref<VtualChannelClaim[]>([])
const links = ref<VtualExternalLink[]>([])
const platforms = ref<VtualPlatform[]>([])
const loading = ref(true)

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

// Modals
const confirmState = ref<{ show: boolean; title: string; message: string; confirmText: string; confirmClass: string; action: (() => Promise<void>) | null }>({
  show: false,
  title: '',
  message: '',
  confirmText: '',
  confirmClass: 'primary',
  action: null,
})

const linkKindOptions = computed(() => [
  { value: 'social', label: t('web.vtual.profiles.link_kinds.social') },
  { value: 'donation', label: t('web.vtual.profiles.link_kinds.donation') },
  { value: 'website', label: t('web.vtual.profiles.link_kinds.website') },
  { value: 'other', label: t('web.vtual.profiles.link_kinds.other') },
])

async function loadAll(): Promise<void> {
  loading.value = true
  const id = route.params.id as string
  try {
    const [c, ch, arch, claims, lks, plats] = await Promise.all([
      vtual.fetchCreator(id),
      vtual.fetchChannels(id),
      vtual.fetchArchivedChannels(id),
      vtual.fetchChannelClaims(id),
      vtual.fetchLinks(id),
      vtual.fetchPlatforms(),
    ])
    creator.value = c
    channels.value = ch
    archivedChannels.value = arch
    channelClaims.value = claims
    links.value = lks
    platforms.value = plats
    metaForm.display_name = c.display_name
    metaForm.slug = c.slug
    metaForm.bio = c.bio ?? ''
    metaForm.avatar_url = c.avatar_url ?? ''
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.load_failed'))
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

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
  try {
    const result = await vtual.addChannel(creator.value.id, channelForm.platform_key, channelForm.profile)
    if ('token' in result) {
      channelClaims.value.push(result)
      showSuccess(t('web.vtual.profiles.ajax.channel_claim_started'))
    } else {
      channels.value.push(result)
      showSuccess(t('web.vtual.profiles.ajax.channel_added'))
    }
    channelForm.platform_key = ''
    channelForm.profile = ''
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.channel_add_failed'))
  } finally {
    addingChannel.value = false
  }
}

function openConfirm(title: string, message: string, action: () => Promise<void>, confirmText = t('ui.actions.confirm'), confirmClass = 'primary'): void {
  confirmState.value = { show: true, title, message, confirmText, confirmClass, action }
}

async function executeConfirm(): Promise<void> {
  if (!confirmState.value.action) return
  try {
    await confirmState.value.action()
    confirmState.value.show = false
  } catch {
    confirmState.value.show = false
  }
}

async function handleRefreshChannel(channelId: string): Promise<void> {
  try {
    await vtual.refreshChannel(channelId)
    showSuccess(t('web.vtual.profiles.ajax.refresh_queued'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.profiles.errors.refresh_failed'))
  }
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

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    active: 'text-bg-success',
    pending: 'text-bg-warning',
    archived: 'text-bg-secondary',
    disconnected: 'text-bg-danger',
  }
  return map[status] ?? 'text-bg-light'
}
</script>

<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">{{ t('ui.loading') }}</span>
    </div>
  </div>

  <div v-else-if="creator" class="row g-3">
    <div class="col-lg-8">
      <!-- Meta form -->
      <Card :title="t('web.vtual.profiles.profile_title')">
        <template #actions>
          <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'vtual.profiles.index.view' })">
            <i class="bi bi-arrow-left me-1"></i> {{ t('web.vtual.profiles.page_title') }}
          </button>
          <a v-if="creator.profile_url" :href="creator.profile_url" target="_blank" class="btn btn-outline-primary btn-sm ms-1">
            <i class="bi bi-box-arrow-up-right me-1"></i> {{ t('web.vtual.profiles.view_profile') }}
          </a>
        </template>

        <form @submit.prevent="handleSaveMeta">
          <div class="row g-2">
            <div class="col-md-6">
              <FormInput name="display_name" :label="t('web.vtual.profiles.fields.display_name')" v-model="metaForm.display_name" required />
            </div>
            <div class="col-md-6">
              <FormInput name="slug" :label="t('web.vtual.profiles.fields.slug')" v-model="metaForm.slug" required />
            </div>
            <div class="col-12">
              <FormTextarea name="bio" :label="t('web.vtual.profiles.fields.bio')" v-model="metaForm.bio" :rows="3" />
            </div>
            <div class="col-12">
              <FormInput name="avatar_url" :label="t('web.vtual.profiles.fields.avatar_url')" v-model="metaForm.avatar_url" />
            </div>
          </div>
          <SubmitButton v-if="canMutate" :loading="savingMeta" :label="t('ui.actions.save')" class="mt-2" />
        </form>
      </Card>

      <!-- Merge form -->
      <Card :title="t('web.vtual.profiles.merge_title')" class="mt-3" v-if="canMutate">
        <p class="text-muted small">{{ t('web.vtual.profiles.merge_desc_short') }}</p>
        <form @submit.prevent="handleMerge" class="row g-2 align-items-end">
          <div class="col-md-8">
            <FormInput name="destination_id" :label="t('web.vtual.profiles.fields.destination_id')" v-model="mergeDestinationId" :placeholder="t('web.vtual.profiles.uuid_placeholder')" />
          </div>
          <div class="col-md-4">
            <SubmitButton :loading="merging" :label="t('web.vtual.profiles.merge_button')" variant="danger" />
          </div>
        </form>
      </Card>

      <!-- Links -->
      <Card :title="t('web.vtual.profiles.links_title')" class="mt-3">
        <form v-if="canMutate" @submit.prevent="handleSaveLink" class="row g-2 mb-3 align-items-end">
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
            <SubmitButton :loading="savingLink" :label="editingLinkId ? t('ui.actions.update') : t('ui.actions.add')" />
            <button v-if="editingLinkId" type="button" class="btn btn-outline-secondary btn-sm ms-1" @click="resetLinkForm">{{ t('ui.actions.cancel') }}</button>
          </div>
        </form>

        <div v-if="links.length === 0" class="text-muted small">{{ t('web.vtual.profiles.no_links') }}</div>
        <div v-else class="table-responsive">
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
              <tr v-for="link in links" :key="link.id">
                <td class="small">{{ link.label }}</td>
                <td class="small"><a :href="link.url" target="_blank">{{ link.url }}</a></td>
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
    </div>

    <div class="col-lg-4">
      <!-- Channel claims -->
      <Card :title="t('web.vtual.profiles.channel_claims_title')" v-if="channelClaims.length > 0">
        <div v-for="claim in channelClaims" :key="claim.id" class="border rounded p-2 mb-2">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <span class="badge text-bg-warning">{{ claim.status }}</span>
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
            <button class="btn btn-outline-secondary btn-sm" @click="handleCancelChannelClaim(claim.id)">{{ t('web.vtual.actions.cancel') }}</button>
            <button v-if="canAcceptAnyway" class="btn btn-outline-warning btn-sm" @click="openConfirm(t('web.vtual.confirm.accept_anyway_title'), t('web.vtual.confirm.accept_anyway_body'), () => handleAcceptAnywayChannelClaim(claim.id), t('web.vtual.actions.accept'), 'warning')">{{ t('web.vtual.actions.accept_anyway') }}</button>
          </div>
        </div>
      </Card>

      <!-- Add channel -->
      <Card :title="t('web.vtual.profiles.add_channel_title')" v-if="canMutate && platforms.length > 0">
        <form @submit.prevent="handleAddChannel">
          <FormSelect name="platform_key" :label="t('web.vtual.profiles.fields.platform')" v-model="channelForm.platform_key" :options="platforms.filter(p => p.enabled).map(p => ({ value: p.key, label: p.name }))" required />
          <FormInput name="profile" :label="t('web.vtual.profiles.fields.profile_url')" v-model="channelForm.profile" required />
          <SubmitButton :loading="addingChannel" :label="t('ui.actions.add')" class="mt-2" />
        </form>
      </Card>

      <!-- Active channels -->
      <Card :title="t('web.vtual.profiles.active_channels_title')" class="mt-3">
        <div v-if="channels.length === 0" class="text-muted small">{{ t('web.vtual.profiles.no_active_channels') }}</div>
        <div v-for="ch in channels" :key="ch.id" class="border rounded p-2 mb-2">
          <div class="d-flex align-items-center gap-2">
            <img v-if="ch.avatar_url" :src="ch.avatar_url" class="rounded" style="width: 32px; height: 32px;" />
            <i v-else class="bi bi-person-circle fs-4"></i>
            <div class="flex-grow-1">
              <div class="small fw-semibold">{{ ch.display_name ?? ch.handle ?? '—' }}</div>
              <div class="text-muted small">{{ ch.platform?.name }} · {{ ch.subscriber_count_formatted ?? ch.subscriber_count ?? '—' }}</div>
            </div>
            <span class="badge" :class="statusBadge(ch.status)">{{ ch.status }}</span>
          </div>
          <div v-if="canMutate" class="mt-2 d-flex flex-wrap gap-1">
            <button v-if="ch.visibility === 'private' && ch.discovery_source === 'discord_connection'" class="btn btn-outline-primary btn-sm" @click="handlePromoteChannel(ch.id)">{{ t('web.vtual.actions.promote') }}</button>
            <button class="btn btn-outline-secondary btn-sm" @click="handleRefreshChannel(ch.id)">{{ t('web.vtual.actions.refresh') }}</button>
            <button class="btn btn-outline-danger btn-sm" @click="openConfirm(t('web.vtual.confirm.archive_channel_title'), t('web.vtual.confirm.archive_channel_body'), () => handleArchiveChannel(ch.id), t('web.vtual.actions.archive'), 'warning')">{{ t('web.vtual.actions.archive') }}</button>
          </div>
        </div>
      </Card>

      <!-- Archived channels -->
      <Card :title="t('web.vtual.profiles.archived_channels_title')" class="mt-3" v-if="archivedChannels.length > 0">
        <div v-for="ch in archivedChannels" :key="ch.id" class="border rounded p-2 mb-2">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-person-circle fs-4"></i>
            <div class="flex-grow-1">
              <div class="small">{{ ch.display_name ?? ch.handle ?? '—' }}</div>
              <div class="text-muted small">{{ ch.platform?.name }}</div>
            </div>
            <span class="badge text-bg-secondary">{{ ch.status }}</span>
          </div>
          <button v-if="canMutate" class="btn btn-outline-success btn-sm mt-1" @click="handleRestoreChannel(ch.id)">{{ t('web.vtual.actions.restore') }}</button>
        </div>
      </Card>
    </div>

    <ConfirmModal
      v-model="confirmState.show"
      :title="confirmState.title"
      :confirm-label="confirmState.confirmText"
      :confirm-variant="confirmState.confirmClass"
      @confirm="executeConfirm"
      @cancel="confirmState.show = false; confirmState.action = null"
    >
      <p>{{ confirmState.message }}</p>
    </ConfirmModal>
  </div>
</template>
