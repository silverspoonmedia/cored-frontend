<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FormSelect from '@/components/FormSelect.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import type { VtualGrantCapability, VtualManagementCreatorAssignment, VtualManagementCreatorGrant, VtualManagementMember } from '@/api/types'

/**
 * Delegated per-creator capability grants
 * (docs/domains/vtual/reference-capability-grants.md).
 *
 * The model is additive: a grant lets one member touch one named creator on
 * top of what their org role already allows, so this section never removes
 * anyone's existing power — it only hands out extra access. Visible to org
 * Owner/Admin only, the same gate as member management.
 */
const props = defineProps<{
  canManageMembers: boolean
  members: VtualManagementMember[]
  creators: VtualManagementCreatorAssignment[]
  grants: VtualManagementCreatorGrant[]
  mutatingGrantKey: string | null
  mutatingGrantId: string | null
}>()

const emit = defineEmits<{
  grant: [creatorId: string, memberId: string, capability: VtualGrantCapability]
  revoke: [grantId: string]
}>()

const { t } = useI18n()

const grantMemberId = ref('')
const grantCreatorId = ref('')
const grantCapability = ref<VtualGrantCapability>('view')

// Only non-owner members can be granted: an Owner already edits every creator
// in the org, and the backend rejects a self-grant.
const grantableMembers = computed(() =>
  props.members.filter((m) => m.role !== 'owner'),
)

const memberOptions = computed(() =>
  grantableMembers.value.map((m) => ({
    value: m.id,
    label: m.user?.name ?? m.user?.email ?? m.id,
  })),
)

const creatorOptions = computed(() =>
  props.creators.map((a) => ({
    value: a.creator.id,
    label: a.creator.display_name,
  })),
)

const capabilityOptions = computed(() => [
  { value: 'view', label: t('web.vtual-managements.grants.capabilities.view') },
  { value: 'edit', label: t('web.vtual-managements.grants.capabilities.edit') },
])

const canSubmitGrant = computed(() =>
  grantMemberId.value !== '' && grantCreatorId.value !== '' && props.mutatingGrantKey === null,
)

function memberName(memberId: string): string {
  const member = props.members.find((m) => m.id === memberId)
  return member?.user?.name ?? member?.user?.email ?? '—'
}

function submitGrant(): void {
  if (!canSubmitGrant.value) return
  emit('grant', grantCreatorId.value, grantMemberId.value, grantCapability.value)
}
</script>

<template>
  <hr class="my-4">
  <h5 class="mb-2">{{ t('web.vtual-managements.grants.section_title') }}</h5>
  <p class="text-muted small mb-3">{{ t('web.vtual-managements.grants.section_help') }}</p>

  <form
    v-if="canManageMembers && grantableMembers.length > 0 && creators.length > 0"
    class="border rounded p-3 mb-3"
    @submit.prevent="submitGrant"
  >
    <div class="row g-2 align-items-start">
      <div class="col-md-4">
        <FormSelect
          name="grant_member"
          :label="t('web.vtual-managements.grants.member')"
          v-model="grantMemberId"
          :options="memberOptions"
          :placeholder="t('web.vtual-managements.grants.member_placeholder')"
          required
          :disabled="mutatingGrantKey !== null"
        />
      </div>
      <div class="col-md-4">
        <FormSelect
          name="grant_creator"
          :label="t('web.vtual-managements.grants.creator')"
          v-model="grantCreatorId"
          :options="creatorOptions"
          :placeholder="t('web.vtual-managements.grants.creator_placeholder')"
          required
          :disabled="mutatingGrantKey !== null"
        />
      </div>
      <div class="col-md-2">
        <FormSelect
          name="grant_capability"
          :label="t('web.vtual-managements.grants.capability')"
          v-model="grantCapability"
          :options="capabilityOptions"
          required
          :disabled="mutatingGrantKey !== null"
        />
      </div>
      <div class="col-md-2">
        <div class="mb-3">
          <label class="form-label" aria-hidden="true">
            &nbsp;<span class="text-danger invisible">*</span>
          </label>
          <div class="d-grid">
            <SubmitButton
              :loading="mutatingGrantKey !== null"
              :label="t('web.vtual-managements.grants.grant_button')"
            />
          </div>
        </div>
      </div>
    </div>
  </form>

  <div class="table-responsive">
    <table class="table table-sm table-hover align-middle mb-0" :aria-label="t('web.vtual-managements.grants.table_caption')">
      <caption class="visually-hidden">{{ t('web.vtual-managements.grants.table_caption') }}</caption>
      <thead>
        <tr>
          <th>{{ t('web.vtual-managements.grants.columns.member') }}</th>
          <th>{{ t('web.vtual-managements.grants.columns.creator') }}</th>
          <th>{{ t('web.vtual-managements.grants.columns.capability') }}</th>
          <th v-if="canManageMembers" class="text-end">{{ t('ui.labels.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <TableEmptyRow
          v-if="grants.length === 0"
          :colspan="canManageMembers ? 4 : 3"
          icon="bi-shield-lock"
          :title="t('web.vtual-managements.grants.empty')"
        />
        <tr v-for="g in grants" :key="g.id">
          <td>{{ g.member_user_name ?? memberName(g.member_id) }}</td>
          <td>{{ g.creator_display_name ?? '—' }}</td>
          <td>
            <span class="badge" :class="g.capability === 'edit' ? 'text-bg-primary' : 'text-bg-secondary'">
              {{ t('web.vtual-managements.grants.capabilities.' + g.capability) }}
            </span>
          </td>
          <td v-if="canManageMembers" class="text-end">
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              :disabled="mutatingGrantId === g.id"
              @click="emit('revoke', g.id)"
            >
              <i class="bi bi-x-lg me-1"></i>
              {{ t('web.vtual-managements.grants.revoke_button') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
