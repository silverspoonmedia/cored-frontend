<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import { VTUAL_STATUS_BADGE, type BadgeColor } from '@/utils/statusBadge'
import { safeImageUrl } from '@/utils/safeUrl'
import type { VtualChannel, VtualChannelClaim } from '@/api/types'

/**
 * Channels + claims card for VtualProfileShowView: add-channel form, pending
 * claims panel, active channels table, archived channels table.
 */
const props = defineProps<{
  channels: VtualChannel[]
  archivedChannels: VtualChannel[]
  channelClaims: VtualChannelClaim[]
  platforms: Array<{ key: string; name: string; enabled: boolean }>
  canMutate: boolean
  canAcceptAnyway: boolean
  discordConnected: boolean
  refreshing: boolean
  adding: boolean
  channelForm: { platform_key: string; profile: string }
  channelErrors: Record<string, string[]>
  profilePlaceholder: string
  profileHelp: string
}>()

const emit = defineEmits<{
  addChannel: []
  refresh: []
  verifyClaim: [id: string]
  verifyDiscordClaim: [claim: VtualChannelClaim]
  connectDiscord: [claim: VtualChannelClaim]
  cancelClaim: [id: string]
  acceptAnywayClaim: [id: string]
  promote: [id: string]
  deletePending: [id: string]
  archive: [id: string]
  restore: [id: string]
  confirm: [payload: ConfirmRequest]
}>()

interface ConfirmRequest {
  title: string
  message: string
  action: () => void | Promise<void>
  confirmText: string
  confirmClass: string
}

const { t } = useI18n()

const PROFILE_CHANNEL_BADGE: Record<string, BadgeColor> = {
  ...VTUAL_STATUS_BADGE,
  disconnected: 'secondary',
}

const colspan = computed(() => (props.canMutate ? 6 : 5))

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

function imageUrl(value: string | null | undefined): string | null {
  return safeImageUrl(value)
}

function showDiscordVerify(claim: VtualChannelClaim): boolean {
  const key = claim.platform?.key ?? ''
  return key !== '' && key !== 'kick'
}

function requestConfirm(title: string, message: string, action: () => void | Promise<void>, confirmText: string, confirmClass: string): void {
  emit('confirm', { title, message, action, confirmText, confirmClass })
}
</script>

<template>
  <div>
    <p class="text-muted small mb-3">{{ t('web.vtual.profiles.channels.section_help') }}</p>

    <form
      v-if="canMutate && platforms.length > 0"
      class="border rounded p-3 mb-3"
      @submit.prevent="emit('addChannel')"
    >
      <div class="row g-2 align-items-start">
        <div class="col-md-3">
          <FormSelect
            name="platform_key"
            :label="t('web.vtual.profiles.fields.platform')"
            :model-value="channelForm.platform_key"
            :options="platforms.map((p) => ({ value: p.key, label: p.name }))"
            :error="fieldError(channelErrors, 'platform_key')"
            required
            :disabled="adding"
            @update:model-value="channelForm.platform_key = $event"
          />
        </div>
        <div class="col-md-6">
          <FormInput
            name="profile"
            :label="t('web.vtual.profiles.fields.profile_url')"
            :model-value="channelForm.profile"
            :error="fieldError(channelErrors, 'profile')"
            :placeholder="profilePlaceholder"
            :disabled="adding"
            required
            :maxlength="512"
            @update:model-value="channelForm.profile = $event"
          />
        </div>
        <div class="col-md-3">
          <div class="mb-3">
            <label class="form-label" aria-hidden="true">
              &nbsp;<span class="text-danger invisible">*</span>
            </label>
            <div class="d-grid">
              <SubmitButton :loading="adding" :label="t('web.vtual.add_button')" />
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
          <button class="btn btn-primary btn-sm" @click="emit('verifyClaim', claim.id)">{{ t('web.vtual.actions.verify') }}</button>
          <template v-if="showDiscordVerify(claim)">
            <button
              v-if="discordConnected"
              class="btn btn-outline-primary btn-sm"
              @click="emit('verifyDiscordClaim', claim)"
            >{{ t('web.vtual-vtuber.claim_discord_verify_button') }}</button>
            <button
              v-else
              class="btn btn-outline-secondary btn-sm"
              @click="emit('connectDiscord', claim)"
            >{{ t('web.vtual-vtuber.claim_discord_connect_cta') }}</button>
          </template>
          <button class="btn btn-outline-secondary btn-sm" @click="emit('cancelClaim', claim.id)">{{ t('web.vtual.actions.cancel') }}</button>
          <button
            v-if="canAcceptAnyway"
            class="btn btn-outline-warning btn-sm"
            @click="requestConfirm(t('web.vtual.confirm.accept_anyway_title'), t('web.vtual.confirm.accept_anyway_body'), () => emit('acceptAnywayClaim', claim.id), t('web.vtual.actions.accept'), 'warning')"
          >{{ t('web.vtual.actions.accept_anyway') }}</button>
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
            :colspan="colspan"
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
                <button v-if="ch.visibility === 'private' && ch.discovery_source === 'discord_connection'" class="btn btn-outline-primary btn-sm" @click="emit('promote', ch.id)">{{ t('web.vtual.actions.promote') }}</button>
                <button
                  v-if="ch.status === 'pending'"
                  class="btn btn-outline-danger btn-sm"
                  @click="requestConfirm(t('web.vtual.confirm.delete_pending_channel_title'), t('web.vtual.confirm.delete_pending_channel_body'), () => emit('deletePending', ch.id), t('web.vtual.actions.delete'), 'warning')"
                >{{ t('web.vtual.actions.delete') }}</button>
                <button
                  v-else
                  class="btn btn-outline-danger btn-sm"
                  @click="requestConfirm(t('web.vtual.confirm.archive_channel_title'), t('web.vtual.confirm.archive_channel_body'), () => emit('archive', ch.id), t('web.vtual.actions.archive'), 'warning')"
                >{{ t('web.vtual.actions.archive') }}</button>
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
                <button class="btn btn-outline-success btn-sm" @click="emit('restore', ch.id)">{{ t('web.vtual.actions.restore') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
