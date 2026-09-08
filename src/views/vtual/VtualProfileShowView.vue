<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import FormInput from '@/components/FormInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import VtualProfileMetaForm from '@/components/vtual/VtualProfileMetaForm.vue'
import VtualProfileChannelsCard from '@/components/vtual/VtualProfileChannelsCard.vue'
import VtualProfileLinksCard from '@/components/vtual/VtualProfileLinksCard.vue'
import { useVtualProfileShow } from '@/composables/vtual/useVtualProfileShow'
import { useAuth } from '@/stores/auth'
import { safeHttpUrl } from '@/utils/safeUrl'

/**
 * VtualProfileShowView — thin shell over useVtualProfileShow composable +
 * per-section components (meta / channels / links / merge).
 */
const { t } = useI18n()
const { hasPermission } = useAuth()

const {
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
  loadAll,
  handleRefreshChannels,
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
  handleVerifyDiscordChannelClaim,
  connectDiscordForChannelClaim,
  handleCancelChannelClaim,
  handleAcceptAnywayChannelClaim,
} = useVtualProfileShow()

const canMutate = computed(() => hasPermission('edit vtual creator') || creator.value?.my_role === 'owner' || creator.value?.my_role === 'editor')
const canAcceptAnyway = computed(() => hasPermission('manage any vtual resource'))

function externalUrl(value: string | null | undefined): string | null {
  return safeHttpUrl(value)
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
        <VtualProfileMetaForm
          :creator="creator"
          :form="metaForm"
          :saving="savingMeta"
          :can-mutate="canMutate"
        />
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

      <VtualProfileChannelsCard
        :channels="channels"
        :archived-channels="archivedChannels"
        :channel-claims="channelClaims"
        :platforms="enabledPlatforms"
        :can-mutate="canMutate"
        :can-accept-anyway="canAcceptAnyway"
        :discord-connected="discordConnected"
        :refreshing="refreshingChannels"
        :adding="addingChannel"
        :channel-form="channelForm"
        :channel-errors="channelErrors"
        :profile-placeholder="profilePlaceholder"
        :profile-help="profileHelp"
        @add-channel="handleAddChannel"
        @verify-claim="handleVerifyChannelClaim"
        @verify-discord-claim="handleVerifyDiscordChannelClaim"
        @connect-discord="connectDiscordForChannelClaim"
        @cancel-claim="handleCancelChannelClaim"
        @accept-anyway-claim="handleAcceptAnywayChannelClaim"
        @promote="handlePromoteChannel"
        @delete-pending="handleDeletePendingChannel"
        @archive="handleArchiveChannel"
        @restore="handleRestoreChannel"
        @confirm="({ title, message, action, confirmText, confirmClass }) => openConfirm(title, message, action, confirmText, confirmClass)"
      />
    </Card>

    <Card :title="t('web.vtual.profiles.links_title')" class="mt-3">
      <VtualProfileLinksCard
        :links="links"
        :can-mutate="canMutate"
        :saving="savingLink"
        :link-form="linkForm"
        :editing="!!editingLinkId"
        :link-kind-options="linkKindOptions"
        @save="handleSaveLink"
        @edit="editLink"
        @reset="resetLinkForm"
        @delete="openConfirm(t('web.vtual.confirm.delete_link_title'), t('web.vtual.confirm.delete_link_body'), () => handleDeleteLink($event), t('ui.actions.delete'), 'danger')"
      />
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
