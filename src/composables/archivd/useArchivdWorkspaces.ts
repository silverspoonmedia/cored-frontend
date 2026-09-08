/**
 * Workspaces state/actions for ArchivdWorkspacesView.
 *
 * Extracted from the view: workspace list + selected-workspace detail
 * (members/activity) loading with hydrate fallbacks, CRUD actions, and
 * realtime members/activity refresh.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { confirmDialog } from '@/lib/swal'
import { useArchivd } from '@/composables/archivd/useArchivd'
import { useArchivdHydrate } from '@/composables/archivd/useArchivdHydrate'
import { useArchivdRealtime } from '@/composables/archivd/useArchivdRealtime'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { ArWorkspace, ArWorkspaceMember, ArWorkspaceActivity } from '@/api/types'

export function useArchivdWorkspaces() {
  const {
    fetchWorkspaces,
    createWorkspace,
    archiveWorkspace,
    fetchMembers,
    inviteMember,
    acceptInvite,
    updateMemberRole,
    removeMember,
    fetchActivity,
  } = useArchivd()
  const { hasPermission } = useAuth()
  const { success: showSuccess, error: showError } = useAlert()
  const { subscribe: subscribeFh, unsubscribe: unsubscribeFh } = useArchivdRealtime()
  const { hydrateWorkspaceDetail } = useArchivdHydrate()
  const { t } = useI18n()

  const workspaces = ref<ArWorkspace[]>([])
  const loading = ref(true)
  const loadError = ref<string | null>(null)
  const selected = ref<ArWorkspace | null>(null)
  const members = ref<ArWorkspaceMember[]>([])
  const activity = ref<ArWorkspaceActivity[]>([])
  const detailLoading = ref(false)

  const canManage = computed(() => hasPermission('create archivd folder'))

  const roles = ['admin', 'editor', 'viewer']

  // Create modal
  const showCreate = ref(false)
  const createName = ref('')
  const creating = ref(false)

  // Invite form
  const inviteEmail = ref('')
  const inviteRole = ref('viewer')
  const inviting = ref(false)

  // Accept invite
  const inviteToken = ref('')
  const accepting = ref(false)

  // Remove member confirm
  const removeTarget = ref<ArWorkspaceMember | null>(null)

  const wsHandlers = {
    onMembersChanged: () => {
      if (selected.value) {
        fetchMembers(selected.value.id).then((m) => { members.value = m }).catch(() => {})
      }
    },
    onActivityAppended: () => {
      if (selected.value) {
        fetchActivity(selected.value.id, 50).then((a) => { activity.value = a }).catch(() => {})
      }
    },
  }

  onMounted(async () => {
    await loadWorkspaces()
    subscribeFh(wsHandlers)
  })

  onUnmounted(() => {
    unsubscribeFh(wsHandlers)
  })

  async function loadWorkspaces(): Promise<void> {
    loading.value = true
    loadError.value = null
    try {
      const batchResult = await hydrateWorkspaceDetail(null).catch(() => null)
      if (batchResult?.workspaces) {
        workspaces.value = batchResult.workspaces
      } else {
        workspaces.value = await fetchWorkspaces()
      }
      if (workspaces.value.length && !selected.value) {
        const first = workspaces.value[0]
        if (first) await selectWorkspace(first)
      }
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : t('web.archivd.failed_load_workspaces')
    } finally {
      loading.value = false
    }
  }

  async function selectWorkspace(ws: ArWorkspace): Promise<void> {
    selected.value = ws
    detailLoading.value = true
    try {
      const batchResult = await hydrateWorkspaceDetail(ws.id).catch(() => null)
      if (batchResult && batchResult.members !== null && batchResult.activity !== null) {
        members.value = batchResult.members
        activity.value = batchResult.activity
      } else {
        const [m, a] = await Promise.all([
          fetchMembers(ws.id),
          fetchActivity(ws.id, 50),
        ])
        members.value = m
        activity.value = a
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : t('web.archivd.failed_load_workspace_detail'))
      members.value = []
      activity.value = []
    } finally {
      detailLoading.value = false
    }
  }

  async function handleCreate(): Promise<void> {
    if (!createName.value.trim()) return
    creating.value = true
    try {
      const ws = await createWorkspace(createName.value.trim())
      showSuccess(t('web.archivd.workspace_created', { name: ws.name }))
      workspaces.value.push(ws)
      showCreate.value = false
      createName.value = ''
      await selectWorkspace(ws)
    } catch (e) {
      showError(e instanceof Error ? e.message : t('web.archivd.failed_create_workspace'))
    } finally {
      creating.value = false
    }
  }

  async function handleInvite(): Promise<void> {
    if (!selected.value || !inviteEmail.value.trim()) return
    inviting.value = true
    try {
      await inviteMember(selected.value.id, inviteEmail.value.trim(), inviteRole.value)
      showSuccess(t('web.archivd.invitation_sent', { email: inviteEmail.value }))
      inviteEmail.value = ''
      inviteRole.value = 'viewer'
    } catch (e) {
      showError(e instanceof Error ? e.message : t('web.archivd.failed_invite_member'))
    } finally {
      inviting.value = false
    }
  }

  async function handleAcceptInvite(): Promise<void> {
    if (!inviteToken.value.trim()) return
    accepting.value = true
    try {
      await acceptInvite(inviteToken.value.trim())
      showSuccess(t('web.archivd.invitation_accepted'))
      inviteToken.value = ''
      await loadWorkspaces()
    } catch (e) {
      showError(e instanceof Error ? e.message : t('web.archivd.failed_accept_invite'))
    } finally {
      accepting.value = false
    }
  }

  async function handleRoleChange(member: ArWorkspaceMember, role: string): Promise<void> {
    if (!selected.value || member.role === role) return
    try {
      const updated = await updateMemberRole(selected.value.id, member.user_id, role)
      const idx = members.value.findIndex((m) => m.id === member.id)
      if (idx >= 0) members.value[idx] = updated
      showSuccess(t('web.archivd.role_updated'))
    } catch (e) {
      showError(e instanceof Error ? e.message : t('web.archivd.failed_update_role'))
    }
  }

  async function confirmRemoveMember(member: ArWorkspaceMember): Promise<void> {
    removeTarget.value = member
    const confirmed = await confirmDialog({
      title: t('web.archivd.remove_member_title'),
      text: t('web.archivd.remove_member_message', { name: removeTarget.value?.user?.name ?? removeTarget.value?.user_id }),
      confirmText: t('web.archivd.remove_button'),
    })
    if (confirmed) {
      await handleRemoveMember()
    } else {
      removeTarget.value = null
    }
  }

  async function handleRemoveMember(): Promise<void> {
    if (!selected.value || !removeTarget.value) return
    try {
      await removeMember(selected.value.id, removeTarget.value.user_id)
      members.value = members.value.filter((m) => m.id !== removeTarget.value!.id)
      showSuccess(t('web.archivd.member_removed'))
    } catch (e) {
      showError(e instanceof Error ? e.message : t('web.archivd.failed_remove_member'))
    } finally {
      removeTarget.value = null
    }
  }

  async function confirmArchive(): Promise<void> {
    if (!selected.value) return
    const confirmed = await confirmDialog({
      title: t('web.archivd.archive_workspace_title'),
      text: t('web.archivd.archive_workspace_message', { name: selected.value.name }),
      confirmText: t('web.archivd.archive_button'),
    })
    if (confirmed) await handleArchive()
  }

  async function handleArchive(): Promise<void> {
    if (!selected.value) return
    try {
      const ws = await archiveWorkspace(selected.value.id)
      showSuccess(t('web.archivd.workspace_archived', { name: ws.name }))
      await loadWorkspaces()
    } catch (e) {
      showError(e instanceof Error ? e.message : t('web.archivd.failed_archive_workspace'))
    }
  }

  function roleBadgeClass(role: string): string {
    if (role === 'Owner') return 'text-bg-primary'
    if (role === 'admin') return 'text-bg-info'
    if (role === 'editor') return 'text-bg-success'
    return 'text-bg-secondary'
  }

  function roleLabel(role: string | null | undefined): string {
    if (!role) return '—'
    const key = `web.archivd.roles.${role}`
    return t(key) === key ? role : t(key)
  }

  return {
    workspaces,
    loading,
    loadError,
    selected,
    members,
    activity,
    detailLoading,
    canManage,
    roles,
    showCreate,
    createName,
    creating,
    inviteEmail,
    inviteRole,
    inviting,
    inviteToken,
    accepting,
    loadWorkspaces,
    selectWorkspace,
    handleCreate,
    handleInvite,
    handleAcceptInvite,
    handleRoleChange,
    confirmRemoveMember,
    confirmArchive,
    roleBadgeClass,
    roleLabel,
  }
}
