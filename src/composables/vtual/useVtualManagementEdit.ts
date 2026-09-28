/**
 * Management-edit state/actions for VtualManagementEditView.
 *
 * Extracted from the view: form state, load/save, member + invite management,
 * creator-invite management, and realtime subscription.
 * Template binding stays in the view + section components.
 */
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useVtualManagements } from '@/composables/vtual/useVtualManagements'
import { useVtualRealtime } from '@/composables/vtual/useVtualRealtime'
import { useVtualCreatorInvites } from '@/composables/vtual/useVtualCreatorInvites'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import { ApiError } from '@/api/types'
import type { VtualCreatorInvite, VtualGrantCapability, VtualManagement, VtualManagementCreatorAssignment, VtualManagementCreatorGrant, VtualManagementInvite, VtualManagementMember } from '@/api/types'

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

  const form = reactive({
    name: '',
    slug: '',
    description: '',
    logo_url: '',
    status: 'active',
  })

  const creators = ref<VtualManagementCreatorAssignment[]>([])
  const creatorGrants = ref<VtualManagementCreatorGrant[]>([])

  const members = ref<VtualManagementMember[]>([])
  const invites = ref<VtualManagementInvite[]>([])
  const creatorInvites = ref<VtualCreatorInvite[]>([])
  const creatorInvitesApi = useVtualCreatorInvites()
  const inviteEmail = ref('')
  const inviteRole = ref('staff')
  const addingMember = ref(false)
  const memberErrors = ref<Record<string, string[]>>({})
  const mutatingMemberId = ref<string | null>(null)
  const mutatingInviteId = ref<string | null>(null)
  const mutatingGrantKey = ref<string | null>(null)
  const mutatingGrantId = ref<string | null>(null)
  const myRole = ref<string | null>(null)
  const isOrphanCreate = ref(false)
  const { user: authUser, hasPermission } = useAuth()
  const canCreateOrphan = computed(() => hasPermission('manage any vtual resource'))

  const memberRoleOptions = computed(() => [
    { value: 'admin', label: t('web.vtual-managements.members.roles.admin') },
    { value: 'staff', label: t('web.vtual-managements.members.roles.staff') },
  ])

  const canManageMembers = computed(() => myRole.value === 'owner' || myRole.value === 'admin')

  const statusOptions = computed(() => [
    { value: 'active', label: t('web.vtual-managements.status.active') },
    { value: 'archived', label: t('web.vtual-managements.status.archived') },
  ])


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
    creatorGrants.value = m.creator_grants ?? []
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
    creatorGrants.value = m.creator_grants ?? []
    members.value = m.members ?? []
    myRole.value = m.my_role ?? null
  }

  let realtimeActive = false
  const refreshingRealtime = ref(false)

  async function refetchRealtime(): Promise<void> {
    if (!isEdit.value || refreshingRealtime.value) return
    refreshingRealtime.value = true
    try {
      const [m, inviteList, creatorInviteList] = await Promise.all([
        mgmt.fetchOne(managementId.value),
        mgmt.listInvites(managementId.value),
        creatorInvitesApi.listInvites(managementId.value),
      ])
      applyManagementRealtime(m)
      invites.value = inviteList
      creatorInvites.value = creatorInviteList
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
      const [m, inviteList, creatorInviteList] = await Promise.all([
        mgmt.fetchOne(managementId.value),
        mgmt.listInvites(managementId.value),
        creatorInvitesApi.listInvites(managementId.value),
      ])
      applyManagement(m)
      invites.value = inviteList
      creatorInvites.value = creatorInviteList
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
      const created = isOrphanCreate.value && canCreateOrphan.value
        ? await mgmt.createOrphan(payload)
        : await mgmt.create(payload)
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

  async function handleCreatorInviteChanged(): Promise<void> {
    if (!isEdit.value) return
    try {
      creatorInvites.value = await creatorInvitesApi.listInvites(managementId.value)
    } catch {
      // silent — section shows its own error
    }
  }

  /**
   * Delegated per-creator capability grants (additive on top of the role).
   * Refetch the org payload so `creator_grants` stays authoritative rather
   * than being patched locally.
   */
  async function handleGrantCapability(creatorId: string, memberId: string, capability: VtualGrantCapability): Promise<void> {
    if (!isEdit.value || mutatingGrantKey.value) return
    mutatingGrantKey.value = `${memberId}:${creatorId}`
    try {
      await mgmt.grantCreatorCapability(managementId.value, {
        member_id: memberId,
        creator_id: creatorId,
        capability,
      })
      const m = await mgmt.fetchOne(managementId.value)
      applyManagementRealtime(m)
      showSuccess(t('api.vtual.management.grant_created'))
    } catch (e) {
      showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.grant_save_failed'))
    } finally {
      mutatingGrantKey.value = null
    }
  }

  async function handleRevokeGrant(grantId: string): Promise<void> {
    if (!isEdit.value || mutatingGrantId.value) return
    mutatingGrantId.value = grantId
    try {
      await mgmt.revokeCreatorCapability(managementId.value, grantId)
      creatorGrants.value = creatorGrants.value.filter((g) => g.id !== grantId)
      showSuccess(t('api.vtual.management.grant_revoked'))
    } catch (e) {
      showError(e instanceof Error ? e.message : t('web.vtual-managements.errors.grant_revoke_failed'))
    } finally {
      mutatingGrantId.value = null
    }
  }

  function goIndex(): void {
    void router.push({ name: 'vtual.managements.index.view' })
  }

  watch([isEdit, managementId], () => {
    void load()
  }, { immediate: true })

  return {
    isEdit,
    loading,
    saving,
    errors,
    form,
    isOrphanCreate,
    canCreateOrphan,
    managementId,
    creators,
    members,
    invites,
    creatorInvites,
    inviteEmail,
    inviteRole,
    addingMember,
    memberErrors,
    mutatingMemberId,
    mutatingInviteId,
    creatorGrants,
    mutatingGrantKey,
    mutatingGrantId,
    handleGrantCapability,
    handleRevokeGrant,
    authUser,
    memberRoleOptions,
    canManageMembers,
    statusOptions,
    fieldError,
    handleSubmit,
    handleSendInvite,
    handleCancelInvite,
    handleUpdateMemberRole,
    handleCreatorInviteChanged,
    goIndex,
  }
}
