<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import VtualManagementMembersSection from '@/components/vtual/VtualManagementMembersSection.vue'
import { useVtualManagementEdit } from '@/composables/vtual/useVtualManagementEdit'

const { t } = useI18n()

const {
  isEdit,
  loading,
  saving,
  errors,
  form,
  statusOptions,
  fieldError,
  handleSubmit,
  goIndex,
  members,
  invites,
  creators,
  assignableCreators,
  assignErrors,
  addingMember,
  memberErrors,
  assigning,
  mutatingMemberId,
  mutatingInviteId,
  authUser,
  memberRoleOptions,
  canManageMembers,
  inviteEmail,
  inviteRole,
  assignCreatorId,
  handleSendInvite,
  handleCancelInvite,
  handleUpdateMemberRole,
  handleRemoveMember,
  handleAssign,
  handleUnassign,
} = useVtualManagementEdit()
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
        <VtualManagementMembersSection
          v-model:invite-email="inviteEmail"
          v-model:invite-role="inviteRole"
          v-model:assign-creator-id="assignCreatorId"
          :auth-user-id="authUser?.id ?? null"
          :can-manage-members="canManageMembers"
          :members="members"
          :invites="invites"
          :creators="creators"
          :assignable-creators="assignableCreators"
          :assign-errors="assignErrors"
          :adding-member="addingMember"
          :member-errors="memberErrors"
          :assigning="assigning"
          :mutating-member-id="mutatingMemberId"
          :mutating-invite-id="mutatingInviteId"
          :member-role-options="memberRoleOptions"
          @send-invite="handleSendInvite"
          @cancel-invite="handleCancelInvite"
          @update-member-role="handleUpdateMemberRole"
          @remove-member="handleRemoveMember"
          @assign="handleAssign"
          @unassign="handleUnassign"
        />
      </div>
    </div>
  </Card>
</template>
