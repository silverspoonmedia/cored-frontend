<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import { get } from '@/api/client'
import { useVtualManagements } from '@/composables/vtual/useVtualManagements'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import { ApiError } from '@/api/types'
import type { ApiResponse, VtualCreator, VtualManagement, VtualManagementCreatorAssignment, VtualManagementInvite, VtualManagementMember } from '@/api/types'
import { unwrapListPayload } from '@/composables/useResource'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const mgmt = useVtualManagements()
const { success: showSuccess, error: showError } = useAlert()

const isEdit = computed(() => typeof route.params.id === 'string' && route.params.id.length > 0)
const managementId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const loading = ref(isEdit.value)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})
const assignErrors = ref<Record<string, string[]>>({})

const form = reactive({
  name: '',
  slug: '',
  description: '',
  logo_url: '',
  status: 'active',
})

const creators = ref<VtualManagementCreatorAssignment[]>([])
const allCreators = ref<VtualCreator[]>([])
const assignCreatorId = ref('')
const assigning = ref(false)

const members = ref<VtualManagementMember[]>([])
const invites = ref<VtualManagementInvite[]>([])
const inviteEmail = ref('')
const inviteRole = ref('staff')
const addingMember = ref(false)
const memberErrors = ref<Record<string, string[]>>({})
const mutatingMemberId = ref<string | null>(null)
const mutatingInviteId = ref<string | null>(null)
const myRole = ref<string | null>(null)
const { user: authUser } = useAuth()

const memberRoleOptions = computed(() => [
  { value: 'admin', label: t('web.vtual-managements.members.roles.admin') },
  { value: 'staff', label: t('web.vtual-managements.members.roles.staff') },
])

const canManageMembers = computed(() => myRole.value === 'owner' || myRole.value === 'admin')

const statusOptions = computed(() => [
  { value: 'active', label: t('web.vtual-managements.status.active') },
  { value: 'archived', label: t('web.vtual-managements.status.archived') },
])

const assignableCreators = computed(() => {
  const assigned = new Set(creators.value.map((a) => a.creator.id))
  return allCreators.value.filter((c) => !assigned.has(c.id))
})

function fieldError(bag: Record<string, string[]>, field: string): string | null {
  const list = bag[field]
  return list && list.length > 0 ? list[0] ?? null : null
}

function applyManagement(m: VtualManagement): void {
  form.name = m.name
  form.slug = m.slug
  form.description = m.description ?? ''
  form.logo_url = m.logo_url ?? ''
  form.status = m.status
  creators.value = m.creators ?? []
  members.value = m.members ?? []
  myRole.value = m.my_role ?? null
}

async function load(): Promise<void> {
  if (!isEdit.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [m, creatorList, inviteList] = await Promise.all([
      mgmt.fetchOne(managementId.value),
      get<ApiResponse<VtualCreator[]>>('vtual/creators', { per_page: 200 }).then(
        (r) => unwrapListPayload<VtualCreator>(r.data).items,
      ),
      mgmt.listInvites(managementId.value),
    ])
    applyManagement(m)
    allCreators.value = creatorList
    invites.value = inviteList
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.load_failed'))
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errors.value = {}

  const payload: Record<string, unknown> = {
    name: form.name,
    description: form.description || null,
    logo_url: form.logo_url || null,
  }
  if (isEdit.value) {
    payload.slug = form.slug
    payload.status = form.status
  } else if (form.slug) {
    payload.slug = form.slug
  }

  try {
    if (isEdit.value) {
      await mgmt.patchOne(managementId.value, payload)
      showSuccess(t('api.vtual.management.updated'))
      return
    }
    const created = await mgmt.create(payload)
    showSuccess(t('api.vtual.management.created'))
    await router.push({ name: 'vtual.managements.edit.view', params: { id: created.id } })
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      errors.value = e.errors ?? {}
      if (Object.keys(errors.value).length === 0) showError(e.message)
    } else if (e instanceof ApiError) {
      showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.save_failed'))
    }
  } finally {
    saving.value = false
  }
}

async function handleAssign(): Promise<void> {
  if (!isEdit.value || !assignCreatorId.value || assigning.value) return
  assigning.value = true
  assignErrors.value = {}
  try {
    const updated = await mgmt.assignCreator(managementId.value, assignCreatorId.value)
    creators.value = updated.creators ?? []
    assignCreatorId.value = ''
    showSuccess(t('api.vtual.management.creator_assigned'))
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      assignErrors.value = e.errors ?? {}
      if (Object.keys(assignErrors.value).length === 0) showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.assign_failed'))
    }
  } finally {
    assigning.value = false
  }
}

async function handleUnassign(assignment: VtualManagementCreatorAssignment): Promise<void> {
  try {
    const updated = await mgmt.unassignCreator(managementId.value, assignment.creator.id)
    creators.value = updated.creators ?? []
    showSuccess(t('api.vtual.management.creator_unassigned'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.unassign_failed'))
  }
}

async function handleSendInvite(): Promise<void> {
  if (!isEdit.value || !inviteEmail.value || addingMember.value) return
  addingMember.value = true
  memberErrors.value = {}
  try {
    const invite = await mgmt.inviteMember(managementId.value, {
      email: inviteEmail.value,
      role: inviteRole.value,
    })
    invites.value = [invite, ...invites.value]
    inviteEmail.value = ''
    inviteRole.value = 'staff'
    showSuccess(t('api.vtual.management.invite_sent'))
  } catch (e) {
    if (e instanceof ApiError && e.isValidation) {
      memberErrors.value = e.errors ?? {}
      if (Object.keys(memberErrors.value).length === 0) showError(e.message)
    } else {
      showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.invite_send_failed'))
    }
  } finally {
    addingMember.value = false
  }
}

async function handleCancelInvite(invite: VtualManagementInvite): Promise<void> {
  if (mutatingInviteId.value) return
  if (invite.status === 'accepted' && !window.confirm(t('web.vtual-managements.invites.revoke_confirm'))) {
    return
  }
  mutatingInviteId.value = invite.id
  try {
    const updated = await mgmt.cancelInvite(managementId.value, invite.id)
    invites.value = invites.value.map((i) => (i.id === invite.id ? updated : i))
    if (updated.status === 'revoked') {
      members.value = members.value.filter((m) => m.user?.email?.toLowerCase() !== invite.email)
      showSuccess(t('api.vtual.management.invite_revoked'))
    } else {
      showSuccess(t('api.vtual.management.invite_cancelled'))
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.invite_cancel_failed'))
  } finally {
    mutatingInviteId.value = null
  }
}

async function handleUpdateMemberRole(member: VtualManagementMember, role: string): Promise<void> {
  if (mutatingMemberId.value) return
  mutatingMemberId.value = member.id
  try {
    const updated = await mgmt.updateMember(managementId.value, member.id, { role })
    members.value = members.value.map((m) => (m.id === member.id ? updated : m))
    showSuccess(t('api.vtual.management.member_updated'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.member_update_failed'))
  } finally {
    mutatingMemberId.value = null
  }
}

async function handleRemoveMember(member: VtualManagementMember): Promise<void> {
  if (mutatingMemberId.value) return
  mutatingMemberId.value = member.id
  try {
    await mgmt.removeMember(managementId.value, member.id)
    members.value = members.value.filter((m) => m.id !== member.id)
    showSuccess(t('api.vtual.management.member_removed'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.member_remove_failed'))
  } finally {
    mutatingMemberId.value = null
  }
}

function goIndex(): void {
  void router.push({ name: 'vtual.managements.index.view' })
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

watch([isEdit, managementId], () => {
  void load()
}, { immediate: true })
</script>

<template>
  <Card :title="isEdit ? t('web.vtual-managements.edit_title') : t('web.vtual-managements.create_title')">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="goIndex">
        <i class="bi bi-arrow-left me-1"></i> {{ t('ui.actions.back') }}
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else>
      <form @submit.prevent="handleSubmit">
        <FormInput
          name="name"
          :label="t('web.vtual-managements.form.name')"
          v-model="form.name"
          :error="fieldError(errors, 'name')"
          required
          :disabled="saving"
        />
        <FormInput
          name="slug"
          :label="t('web.vtual-managements.form.slug')"
          v-model="form.slug"
          :error="fieldError(errors, 'slug')"
          :disabled="saving"
          :hint="t('web.vtual-managements.form.slug_hint')"
        />
        <FormTextarea
          name="description"
          :label="t('web.vtual-managements.form.description')"
          v-model="form.description"
          :error="fieldError(errors, 'description')"
          :disabled="saving"
          :rows="4"
        />
        <FormInput
          name="logo_url"
          :label="t('web.vtual-managements.form.logo_url')"
          type="url"
          v-model="form.logo_url"
          :error="fieldError(errors, 'logo_url')"
          :disabled="saving"
        />
        <FormSelect
          v-if="isEdit"
          name="status"
          :label="t('web.vtual-managements.form.status')"
          v-model="form.status"
          :options="statusOptions"
          :error="fieldError(errors, 'status')"
          :disabled="saving"
        />
        <div class="d-flex gap-2">
          <SubmitButton
            :label="isEdit ? t('web.vtual-managements.form.submit_update') : t('web.vtual-managements.form.submit_create')"
            :loading="saving"
            variant="primary"
          />
          <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="goIndex">
            {{ t('ui.actions.cancel') }}
          </button>
        </div>
      </form>

      <div v-if="isEdit">
        <hr class="my-4">
        <h5 class="mb-2">{{ t('web.vtual-managements.members.section_title') }}</h5>
        <p class="text-muted small mb-3">{{ t('web.vtual-managements.members.section_help') }}</p>

        <form v-if="canManageMembers" class="border rounded p-3 mb-3" @submit.prevent="handleSendInvite">
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
                <th v-if="canManageMembers" class="text-end">{{ t('ui.actions') }}</th>
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
                  <template v-else-if="canManageMembers && m.user?.id !== authUser?.id">
                    <select
                      class="form-select form-select-sm w-auto d-inline-block"
                      :value="m.role"
                      :disabled="mutatingMemberId === m.id"
                      @change="handleUpdateMemberRole(m, ($event.target as HTMLSelectElement).value)"
                    >
                      <option v-for="opt in memberRoleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </template>
                  <span v-else class="badge text-bg-secondary">{{ t('web.vtual-managements.members.roles.' + m.role) }}</span>
                </td>
                <td v-if="canManageMembers" class="text-end">
                  <button
                    v-if="m.role !== 'owner' && m.user?.id !== authUser?.id"
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    :disabled="mutatingMemberId === m.id"
                    @click="handleRemoveMember(m)"
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
                <th v-if="canManageMembers" class="text-end">{{ t('ui.actions') }}</th>
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
                    @click="handleCancelInvite(inv)"
                  >
                    <i class="bi bi-x-lg me-1"></i>
                    {{ inv.status === 'accepted' ? t('web.vtual-managements.invites.revoke_button') : t('web.vtual-managements.invites.cancel_button') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr class="my-4">
        <h5 class="mb-2">{{ t('web.vtual-managements.creators.section_title') }}</h5>
        <p class="text-muted small mb-3">{{ t('web.vtual-managements.creators.section_help') }}</p>

        <form class="border rounded p-3 mb-3" @submit.prevent="handleAssign">
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
                <th class="text-end">{{ t('ui.actions') }}</th>
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
                    @click="handleUnassign(a)"
                  >
                    <i class="bi bi-x-lg me-1"></i> {{ t('web.vtual-managements.creators.unassign_button') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Card>
</template>
