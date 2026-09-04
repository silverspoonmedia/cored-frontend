/**
 * Management-edit state/actions for VtualManagementEditView.
 *
 * Extracted from the view: form state, load/save, member + invite management,
 * creator assignments, and realtime subscription. Template binding stays in
 * the view + section components.
 */
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { get } from '@/api/client'
import { useVtualManagements } from '@/composables/vtual/useVtualManagements'
import { useVtualRealtime } from '@/composables/vtual/useVtualRealtime'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import { ApiError } from '@/api/types'
import type { ApiResponse, VtualCreator, VtualManagement, VtualManagementCreatorAssignment, VtualManagementInvite, VtualManagementMember } from '@/api/types'
import { unwrapListPayload } from '@/composables/useResource'

export function useVtualManagementEdit() {
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

  /**
   * Realtime refresh: apply collections + my_role only. Never overwrite form
   * fields while the actor may be typing (dirty guard lives in the form fields
   * themselves staying untouched here).
   */
  function applyManagementRealtime(m: VtualManagement): void {
    creators.value = m.creators ?? []
    members.value = m.members ?? []
    myRole.value = m.my_role ?? null
  }

  let realtimeActive = false
  const refreshingRealtime = ref(false)

  async function refetchRealtime(): Promise<void> {
    if (!isEdit.value || refreshingRealtime.value) return
    refreshingRealtime.value = true
    try {
      const [m, inviteList] = await Promise.all([
        mgmt.fetchOne(managementId.value),
        mgmt.listInvites(managementId.value),
      ])
      applyManagementRealtime(m)
      invites.value = inviteList
    } catch {
      // silent — next push or manual reload recovers
    } finally {
      refreshingRealtime.value = false
    }
  }

  function onManagementUpdated(): void {
    void refetchRealtime()
  }

  function subscribeRealtime(): void {
    if (realtimeActive || !isEdit.value || !managementId.value) return
    const { subscribeManagement } = useVtualRealtime()
    realtimeActive = subscribeManagement(managementId.value, onManagementUpdated)
  }

  function unsubscribeRealtime(): void {
    if (!realtimeActive || !managementId.value) return
    const { unsubscribeManagement } = useVtualRealtime()
    unsubscribeManagement(managementId.value, onManagementUpdated)
    realtimeActive = false
  }

  onUnmounted(() => {
    unsubscribeRealtime()
  })

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
      subscribeRealtime()
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
    if (invite.status === 'accepted' && !window.confirm(t('web.vtual-managements.invites.cancel_accepted_confirm'))) {
      return
    }
    mutatingInviteId.value = invite.id
    try {
      const updated = await mgmt.cancelInvite(managementId.value, invite.id)
      invites.value = invites.value.map((i) => (i.id === invite.id ? updated : i))
      if (updated.status === 'revoked') {
        members.value = members.value.filter((m) => m.user?.email?.toLowerCase() !== invite.email)
      }
      showSuccess(t('api.vtual.management.invite_cancelled'))
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

  return {
    isEdit,
    loading,
    saving,
    errors,
    assignErrors,
    form,
    creators,
    assignableCreators,
    assignCreatorId,
    assigning,
    members,
    invites,
    inviteEmail,
    inviteRole,
    addingMember,
    memberErrors,
    mutatingMemberId,
    mutatingInviteId,
    authUser,
    memberRoleOptions,
    canManageMembers,
    statusOptions,
    fieldError,
    handleSubmit,
    handleAssign,
    handleUnassign,
    handleSendInvite,
    handleCancelInvite,
    handleUpdateMemberRole,
    handleRemoveMember,
    goIndex,
    inviteStatusVariant,
  }
}
