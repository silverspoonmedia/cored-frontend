<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormInput from '@/components/FormInput.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import FormSelect from '@/components/FormSelect.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import VtualManagementMembersSection from '@/components/vtual/VtualManagementMembersSection.vue'
import VtualManagementGrantsSection from '@/components/vtual/VtualManagementGrantsSection.vue'
import VtualManagementCreatorInvitesSection from '@/components/vtual/VtualManagementCreatorInvitesSection.vue'
import { useVtualManagementEdit } from '@/composables/vtual/useVtualManagementEdit'
import { useBreadcrumbTitle } from '@/composables/useBreadcrumbs'

const { t } = useI18n()

const {
  isEdit,
  loading,
  saving,
  errors,
  form,
  statusOptions,
  isOrphanCreate,
  canCreateOrphan,
  fieldError,
  handleSubmit,
  goIndex,
  members,
  invites,
  creatorInvites,
  creators,
  addingMember,
  memberErrors,
  mutatingMemberId,
  mutatingInviteId,
  authUser,
  memberRoleOptions,
  canManageMembers,
  inviteEmail,
  inviteRole,
  handleSendInvite,
  handleCancelInvite,
  handleUpdateMemberRole,
  handleCreatorInviteChanged,
  managementId,
  creatorGrants,
  mutatingGrantKey,
  mutatingGrantId,
  handleGrantCapability,
  handleRevokeGrant,
} = useVtualManagementEdit()

// Trailing breadcrumb crumb: the edited management's name, so the crumb reads
// `Managements / Edit / <name>` instead of exposing the uuid route param. Gated
// on `isEdit` — create holds no record and keeps the static trail.
useBreadcrumbTitle(() => (isEdit.value ? form.name : null))
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
        <FormCheckbox
          v-if="!isEdit && canCreateOrphan"
          name="ownerless"
          :label="t('web.vtual-managements.form.ownerless')"
          :hint="t('web.vtual-managements.form.ownerless_hint')"
          v-model="isOrphanCreate"
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
          :auth-user-id="authUser?.id ?? null"
          :can-manage-members="canManageMembers"
          :members="members"
          :invites="invites"
          :creators="creators"
          :adding-member="addingMember"
          :member-errors="memberErrors"
          :mutating-member-id="mutatingMemberId"
          :mutating-invite-id="mutatingInviteId"
          :member-role-options="memberRoleOptions"
          @send-invite="handleSendInvite"
          @cancel-invite="handleCancelInvite"
          @update-member-role="handleUpdateMemberRole"
        />

        <VtualManagementGrantsSection
          :can-manage-members="canManageMembers"
          :members="members"
          :creators="creators"
          :grants="creatorGrants"
          :mutating-grant-key="mutatingGrantKey"
          :mutating-grant-id="mutatingGrantId"
          @grant="handleGrantCapability"
          @revoke="handleRevokeGrant"
        />

        <hr class="my-4">
        <VtualManagementCreatorInvitesSection
          :management-id="managementId"
          :can-manage-members="canManageMembers"
          :invites="creatorInvites"
          @invite-changed="handleCreatorInviteChanged"
        />
      </div>
    </div>
  </Card>
</template>
