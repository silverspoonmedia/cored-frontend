<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FormInput from '@/components/FormInput.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import { useVtualCreatorInvites } from '@/composables/vtual/useVtualCreatorInvites'
import type { VtualCreatorInvite, VtualCreatorInviteCandidate } from '@/api/types'

/**
 * vTuber-profile invites admin section for VtualManagementEditView:
 * email + mode (existing profile pick / new display name) + invite table.
 * Rendered only in edit mode, only for users who can manage members.
 */
const props = defineProps<{
  managementId: string
  canManageMembers: boolean
  invites: VtualCreatorInvite[]
}>()

const emit = defineEmits<{
  inviteChanged: []
}>()

const { t } = useI18n()
const api = useVtualCreatorInvites()

const email = ref('')
const mode = ref<'existing' | 'new'>('existing')
const creatorId = ref('')
const newDisplayName = ref('')
const candidates = ref<VtualCreatorInviteCandidate[]>([])
const sending = ref(false)
const mutatingId = ref<string | null>(null)
const sendError = ref<string | null>(null)

const modeOptions = [
  { value: 'existing', label: t('web.vtual-managements.creator_invites.mode.existing') },
  { value: 'new', label: t('web.vtual-managements.creator_invites.mode.new') },
]

// Debounced candidate fetch for existing-mode email lookup.
let candidatesTimer: ReturnType<typeof setTimeout> | null = null
watch([email, mode], () => {
  candidates.value = []
  creatorId.value = ''
  if (mode.value !== 'existing' || !email.value.includes('@')) return
  if (candidatesTimer) clearTimeout(candidatesTimer)
  candidatesTimer = setTimeout(() => {
    void loadCandidates()
  }, 350)
})

async function loadCandidates(): Promise<void> {
  try {
    candidates.value = await api.fetchCandidates(props.managementId, email.value.trim())
  } catch {
    candidates.value = []
  }
}

async function sendInvite(): Promise<void> {
  if (sending.value || !email.value.trim()) return
  if (mode.value === 'existing' && !creatorId.value) return
  sending.value = true
  sendError.value = null
  try {
    await api.inviteCreator(props.managementId, {
      email: email.value.trim(),
      mode: mode.value,
      creator_id: mode.value === 'existing' ? creatorId.value : undefined,
      new_display_name: mode.value === 'new' ? newDisplayName.value.trim() : undefined,
    })
    email.value = ''
    creatorId.value = ''
    newDisplayName.value = ''
    candidates.value = []
    emit('inviteChanged')
  } catch (e) {
    sendError.value = e instanceof Error ? e.message : t('web.vtual-managements.creator_invites.errors.send_failed')
  } finally {
    sending.value = false
  }
}

async function cancelInvite(invite: VtualCreatorInvite): Promise<void> {
  if (mutatingId.value) return
  mutatingId.value = invite.id
  try {
    await api.cancelInvite(props.managementId, invite.id)
    emit('inviteChanged')
  } catch (e) {
    sendError.value = e instanceof Error ? e.message : t('web.vtual-managements.creator_invites.errors.cancel_failed')
  } finally {
    mutatingId.value = null
  }
}

function statusVariant(status: string): string {
  switch (status) {
    case 'pending': return 'warning'
    case 'accepted': return 'success'
    case 'declined': return 'secondary'
    case 'cancelled': return 'secondary'
    case 'revoked': return 'danger'
    case 'expired': return 'secondary'
    default: return 'secondary'
  }
}

function targetLabel(invite: VtualCreatorInvite): string {
  if (invite.mode === 'existing') {
    return invite.creator?.name ?? t('web.vtual-managements.creator_invites.target.existing')
  }
  return invite.new_display_name ?? t('web.vtual-managements.creator_invites.target.new')
}
</script>

<template>
  <div>
    <h5 class="mb-2">{{ t('web.vtual-managements.creator_invites.section_title') }}</h5>
    <p class="text-muted small mb-3">{{ t('web.vtual-managements.creator_invites.section_help') }}</p>

    <form v-if="canManageMembers" class="border rounded p-3 mb-3" @submit.prevent="sendInvite">
      <div class="row g-2 align-items-start">
        <div class="col-md-4">
          <FormInput
            name="creator_invite_email"
            type="email"
            :label="t('web.vtual-managements.invites.email')"
            v-model="email"
            :placeholder="t('web.vtual-managements.invites.email_placeholder')"
            required
            :disabled="sending"
          />
        </div>
        <div class="col-md-4">
          <label class="form-label">{{ t('web.vtual-managements.creator_invites.mode.label') }} <span class="text-danger">*</span></label>
          <div class="btn-group w-100" role="group">
            <button
              v-for="opt in modeOptions"
              :key="opt.value"
              type="button"
              class="btn btn-sm"
              :class="mode === opt.value ? 'btn-primary' : 'btn-outline-secondary'"
              :disabled="sending"
              @click="mode = opt.value as 'existing' | 'new'"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="col-md-4">
          <template v-if="mode === 'existing'">
            <label class="form-label">{{ t('web.vtual-managements.creator_invites.profile') }} <span class="text-danger">*</span></label>
            <select v-model="creatorId" class="form-select form-select-sm" :disabled="sending || candidates.length === 0" required>
              <option value="" disabled>
                {{ candidates.length === 0 ? t('web.vtual-managements.creator_invites.no_candidates') : t('web.vtual-managements.creator_invites.profile_placeholder') }}
              </option>
              <option v-for="c in candidates" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </template>
          <template v-else>
            <FormInput
              name="creator_invite_display_name"
              :label="t('web.vtual-managements.creator_invites.new_display_name')"
              v-model="newDisplayName"
              required
              :disabled="sending"
            />
          </template>
        </div>
      </div>
      <div class="d-flex justify-content-end align-items-center mt-3 gap-2">
        <span v-if="sendError" class="text-danger small">{{ sendError }}</span>
        <SubmitButton :loading="sending" :label="t('web.vtual-managements.creator_invites.send_button')" />
      </div>
    </form>

    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle mb-0" :aria-label="t('web.vtual-managements.creator_invites.table_caption')">
        <caption class="visually-hidden">{{ t('web.vtual-managements.creator_invites.table_caption') }}</caption>
        <thead>
          <tr>
            <th>{{ t('web.vtual-managements.invites.columns.email') }}</th>
            <th>{{ t('web.vtual-managements.creator_invites.columns.target') }}</th>
            <th>{{ t('web.vtual-managements.invites.columns.status') }}</th>
            <th>{{ t('web.vtual-managements.invites.columns.expires_at') }}</th>
            <th v-if="canManageMembers" class="text-end">{{ t('ui.labels.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <TableEmptyRow
            v-if="invites.length === 0"
            :colspan="canManageMembers ? 5 : 4"
            icon="bi-person-plus"
            :title="t('web.vtual-managements.creator_invites.empty')"
          />
          <tr v-for="inv in invites" :key="inv.id">
            <td>{{ inv.email }}</td>
            <td>
              <span class="badge text-bg-info me-1">{{ t('web.vtual-managements.creator_invites.mode.' + inv.mode) }}</span>
              {{ targetLabel(inv) }}
            </td>
            <td><span class="badge" :class="'text-bg-' + statusVariant(inv.status)">{{ t('web.vtual-managements.invites.statuses.' + inv.status) }}</span></td>
            <td><span class="text-muted small">{{ inv.expires_at_formatted ?? inv.expires_at ?? '-' }}</span></td>
            <td v-if="canManageMembers" class="text-end">
              <button
                v-if="inv.status === 'pending'"
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="mutatingId === inv.id"
                @click="cancelInvite(inv)"
              >
                <i class="bi bi-x-lg me-1"></i>
                {{ t('web.vtual-managements.invites.cancel_button') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
