<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FormInput from '@/components/FormInput.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import type { VtualCreator, VtualManagementCreatorAssignment, VtualManagementInvite, VtualManagementMember } from '@/api/types'

/**
 * Members + invites + creator-assignments admin sections for
 * VtualManagementEditView. Rendered only in edit mode.
 */
defineProps<{
  authUserId?: string | number | null
  canManageMembers: boolean
  members: VtualManagementMember[]
  invites: VtualManagementInvite[]
  creators: VtualManagementCreatorAssignment[]
  assignableCreators: VtualCreator[]
  assignErrors: Record<string, string[]>
  addingMember: boolean
  memberErrors: Record<string, string[]>
  assigning: boolean
  mutatingMemberId: string | null
  mutatingInviteId: string | null
  memberRoleOptions: Array<{ value: string; label: string }>
}>()

const inviteEmail = defineModel<string>('inviteEmail', { required: true })
const inviteRole = defineModel<string>('inviteRole', { required: true })
const assignCreatorId = defineModel<string>('assignCreatorId', { required: true })

const emit = defineEmits<{
  sendInvite: []
  cancelInvite: [invite: VtualManagementInvite]
  updateMemberRole: [member: VtualManagementMember, role: string]
  removeMember: [member: VtualManagementMember]
  assign: []
  unassign: [assignment: VtualManagementCreatorAssignment]
}>()

const { t } = useI18n()

function fieldError(bag: Record<string, string[]>, field: string): string | null {
  const list = bag[field]
  return list && list.length > 0 ? list[0] ?? null : null
}

function inviteStatusVariant(status: string): string {
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
</script>

<template>
  <div>
    <hr class="my-4">
    <h5 class="mb-2">{{ t('web.vtual-managements.members.section_title') }}</h5>
    <p class="text-muted small mb-3">{{ t('web.vtual-managements.members.section_help') }}</p>

    <form v-if="canManageMembers" class="border rounded p-3 mb-3" @submit.prevent="emit('sendInvite')">
      <div class="row g-2 align-items-start">
        <div class="col-md-6">
          <FormInput
            name="invite_email"
            type="email"
            :label="t('web.vtual-managements.invites.email')"
            v-model="inviteEmail"
            :error="fieldError(memberErrors, 'email')"
            :placeholder="t('web.vtual-managements.invites.email_placeholder')"
            required
            :disabled="addingMember"
          />
        </div>
        <div class="col-md-3">
          <FormSelect
            name="invite_role"
            :label="t('web.vtual-managements.invites.role')"
            v-model="inviteRole"
            :options="memberRoleOptions"
            :error="fieldError(memberErrors, 'role')"
            required
            :disabled="addingMember"
          />
        </div>
        <div class="col-md-3">
          <div class="mb-3">
            <label class="form-label" aria-hidden="true">
              &nbsp;<span class="text-danger invisible">*</span>
            </label>
            <div class="d-grid">
              <SubmitButton
                :loading="addingMember"
                :label="t('web.vtual-managements.invites.send_button')"
              />
            </div>
          </div>
        </div>
      </div>
    </form>

    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle mb-0" :aria-label="t('web.vtual-managements.members.table_caption')">
        <caption class="visually-hidden">{{ t('web.vtual-managements.members.table_caption') }}</caption>
        <thead>
          <tr>
            <th>{{ t('web.vtual-managements.members.columns.user') }}</th>
            <th>{{ t('web.vtual-managements.members.columns.role') }}</th>
            <th v-if="canManageMembers" class="text-end">{{ t('ui.labels.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <TableEmptyRow
            v-if="members.length === 0"
            :colspan="canManageMembers ? 3 : 2"
            icon="bi-person-badge"
            :title="t('web.vtual-managements.members.empty')"
          />
          <tr v-for="m in members" :key="m.id">
            <td>
              <div>{{ m.user?.name ?? '-' }}</div>
              <div class="text-muted small">{{ m.user?.email ?? '' }}</div>
            </td>
            <td>
              <span v-if="m.role === 'owner'" class="badge text-bg-primary">{{ t('web.vtual-managements.members.roles.owner') }}</span>
              <template v-else-if="canManageMembers && m.user?.id !== authUserId">
                <select
                  class="form-select form-select-sm w-auto d-inline-block"
                  :value="m.role"
                  :disabled="mutatingMemberId === m.id"
                  @change="emit('updateMemberRole', m, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="opt in memberRoleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </template>
              <span v-else class="badge text-bg-secondary">{{ t('web.vtual-managements.members.roles.' + m.role) }}</span>
            </td>
            <td v-if="canManageMembers" class="text-end">
              <button
                v-if="m.role !== 'owner' && m.user?.id !== authUserId"
                type="button"
                class="btn btn-outline-danger btn-sm"
                :disabled="mutatingMemberId === m.id"
                @click="emit('removeMember', m)"
              >
                <i class="bi bi-x-lg me-1"></i> {{ t('web.vtual-managements.members.remove_button') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h5 class="mt-4 mb-2">{{ t('web.vtual-managements.invites.section_title') }}</h5>
    <p class="text-muted small mb-3">{{ t('web.vtual-managements.invites.section_help') }}</p>

    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle mb-0" :aria-label="t('web.vtual-managements.invites.table_caption')">
        <caption class="visually-hidden">{{ t('web.vtual-managements.invites.table_caption') }}</caption>
        <thead>
          <tr>
            <th>{{ t('web.vtual-managements.invites.columns.email') }}</th>
            <th>{{ t('web.vtual-managements.invites.columns.role') }}</th>
            <th>{{ t('web.vtual-managements.invites.columns.status') }}</th>
            <th>{{ t('web.vtual-managements.invites.columns.expires_at') }}</th>
            <th v-if="canManageMembers" class="text-end">{{ t('ui.labels.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <TableEmptyRow
            v-if="invites.length === 0"
            :colspan="canManageMembers ? 5 : 4"
            icon="bi-envelope-paper"
            :title="t('web.vtual-managements.invites.empty')"
          />
          <tr v-for="inv in invites" :key="inv.id">
            <td>{{ inv.email }}</td>
            <td><span class="badge text-bg-secondary">{{ t('web.vtual-managements.members.roles.' + inv.role) }}</span></td>
            <td><span class="badge" :class="'text-bg-' + inviteStatusVariant(inv.status)">{{ t('web.vtual-managements.invites.statuses.' + inv.status) }}</span></td>
            <td><span class="text-muted small">{{ inv.expires_at_formatted ?? inv.expires_at ?? '-' }}</span></td>
            <td v-if="canManageMembers" class="text-end">
              <button
                v-if="inv.status === 'pending' || inv.status === 'accepted'"
                type="button"
                class="btn btn-sm"
                :class="inv.status === 'accepted' ? 'btn-outline-danger' : 'btn-outline-secondary'"
                :disabled="mutatingInviteId === inv.id"
                @click="emit('cancelInvite', inv)"
              >
                <i class="bi bi-x-lg me-1"></i>
                {{ t('web.vtual-managements.invites.cancel_button') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <hr class="my-4">
    <h5 class="mb-2">{{ t('web.vtual-managements.creators.section_title') }}</h5>
    <p class="text-muted small mb-3">{{ t('web.vtual-managements.creators.section_help') }}</p>

    <form class="border rounded p-3 mb-3" @submit.prevent="emit('assign')">
      <div class="row g-2 align-items-end">
        <div class="col-md-9">
          <FormSelect
            name="creator_id"
            :label="t('web.vtual-managements.creators.creator')"
            v-model="assignCreatorId"
            :options="assignableCreators.map((c) => ({ value: c.id, label: c.display_name }))"
            :error="fieldError(assignErrors, 'creator_id')"
            required
            :disabled="assigning"
          />
        </div>
        <div class="col-md-3">
          <div class="mb-3">
            <label class="form-label" aria-hidden="true">
              &nbsp;<span class="text-danger invisible">*</span>
            </label>
            <div class="d-grid">
              <SubmitButton
                :loading="assigning"
                :label="t('web.vtual-managements.creators.assign_button')"
              />
            </div>
          </div>
        </div>
      </div>
    </form>

    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle mb-0" :aria-label="t('web.vtual-managements.creators.table_caption')">
        <caption class="visually-hidden">{{ t('web.vtual-managements.creators.table_caption') }}</caption>
        <thead>
          <tr>
            <th>{{ t('web.vtual-managements.creators.columns.creator') }}</th>
            <th>{{ t('web.vtual-managements.creators.columns.joined_at') }}</th>
            <th class="text-end">{{ t('ui.labels.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <TableEmptyRow
            v-if="creators.length === 0"
            :colspan="3"
            icon="bi-people"
            :title="t('web.vtual-managements.creators.empty')"
          />
          <tr v-for="a in creators" :key="a.assignment_id">
            <td>{{ a.creator.display_name }}</td>
            <td><span class="text-muted small">{{ a.joined_at_formatted ?? a.joined_at ?? '-' }}</span></td>
            <td class="text-end">
              <button
                type="button"
                class="btn btn-outline-danger btn-sm"
                @click="emit('unassign', a)"
              >
                <i class="bi bi-x-lg me-1"></i> {{ t('web.vtual-managements.creators.unassign_button') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
