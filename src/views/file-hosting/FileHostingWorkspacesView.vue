<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import Modal from '@/components/Modal.vue'
import { confirmDialog } from '@/lib/swal'
import StatusBadge from '@/components/StatusBadge.vue'
import { useFileHosting } from '@/composables/file-hosting/useFileHosting'
import { useFhHydrate } from '@/composables/file-hosting/useFhHydrate'
import { useFileHostingRealtime } from '@/composables/file-hosting/useFileHostingRealtime'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type { FhWorkspace, FhWorkspaceMember, FhWorkspaceActivity } from '@/api/types'

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
} = useFileHosting()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const { subscribe: subscribeFh, unsubscribe: unsubscribeFh } = useFileHostingRealtime()
const { hydrateWorkspaceDetail } = useFhHydrate()
const { t } = useI18n()

const workspaces = ref<FhWorkspace[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const selected = ref<FhWorkspace | null>(null)
const members = ref<FhWorkspaceMember[]>([])
const activity = ref<FhWorkspaceActivity[]>([])
const detailLoading = ref(false)

const canManage = computed(() => hasPermission('create file hosting folder'))

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
const removeTarget = ref<FhWorkspaceMember | null>(null)

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
    loadError.value = e instanceof Error ? e.message : t('web.file-hosting.failed_load_workspaces')
  } finally {
    loading.value = false
  }
}

async function selectWorkspace(ws: FhWorkspace): Promise<void> {
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
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_load_workspace_detail'))
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
    showSuccess(t('web.file-hosting.workspace_created', { name: ws.name }))
    workspaces.value.push(ws)
    showCreate.value = false
    createName.value = ''
    await selectWorkspace(ws)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_create_workspace'))
  } finally {
    creating.value = false
  }
}

async function handleInvite(): Promise<void> {
  if (!selected.value || !inviteEmail.value.trim()) return
  inviting.value = true
  try {
    await inviteMember(selected.value.id, inviteEmail.value.trim(), inviteRole.value)
    showSuccess(t('web.file-hosting.invitation_sent', { email: inviteEmail.value }))
    inviteEmail.value = ''
    inviteRole.value = 'viewer'
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_invite_member'))
  } finally {
    inviting.value = false
  }
}

async function handleAcceptInvite(): Promise<void> {
  if (!inviteToken.value.trim()) return
  accepting.value = true
  try {
    await acceptInvite(inviteToken.value.trim())
    showSuccess(t('web.file-hosting.invitation_accepted'))
    inviteToken.value = ''
    await loadWorkspaces()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_accept_invite'))
  } finally {
    accepting.value = false
  }
}

async function handleRoleChange(member: FhWorkspaceMember, role: string): Promise<void> {
  if (!selected.value || member.role === role) return
  try {
    const updated = await updateMemberRole(selected.value.id, member.user_id, role)
    const idx = members.value.findIndex((m) => m.id === member.id)
    if (idx >= 0) members.value[idx] = updated
    showSuccess(t('web.file-hosting.role_updated'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_update_role'))
  }
}

async function confirmRemoveMember(member: FhWorkspaceMember): Promise<void> {
  removeTarget.value = member
  const confirmed = await confirmDialog({
    title: t('web.file-hosting.remove_member_title'),
    text: t('web.file-hosting.remove_member_message', { name: removeTarget.value?.user?.name ?? removeTarget.value?.user_id }),
    confirmText: t('web.file-hosting.remove_button'),
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
    showSuccess(t('web.file-hosting.member_removed'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_remove_member'))
  } finally {
    removeTarget.value = null
  }
}

async function confirmArchive(): Promise<void> {
  if (!selected.value) return
  const confirmed = await confirmDialog({
    title: t('web.file-hosting.archive_workspace_title'),
    text: t('web.file-hosting.archive_workspace_message', { name: selected.value.name }),
    confirmText: t('web.file-hosting.archive_button'),
  })
  if (confirmed) await handleArchive()
}

async function handleArchive(): Promise<void> {
  if (!selected.value) return
  try {
    const ws = await archiveWorkspace(selected.value.id)
    showSuccess(t('web.file-hosting.workspace_archived', { name: ws.name }))
    await loadWorkspaces()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.failed_archive_workspace'))
  }
}

function roleBadgeClass(role: string): string {
  if (role === 'Owner') return 'text-bg-primary'
  if (role === 'admin') return 'text-bg-info'
  if (role === 'editor') return 'text-bg-success'
  return 'text-bg-secondary'
}
</script>

<template>
  <div class="fh-manager fh-admin-page">
    <header class="fh-admin-page__intro">
      <h1 class="h4 mb-1">{{ t('web.file-hosting.workspaces_title') }}</h1>
      <p class="text-muted small mb-0">{{ t('web.file-hosting.collab.subtitle') }}</p>
    </header>

    <div v-if="loading" class="row g-3">
      <div class="col-lg-4">
        <div class="card">
          <div class="card-body">
            <div v-for="i in 4" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
              <SkeletonBlock variant="line" :lines="1" width="55%" class="mb-0" />
              <SkeletonBlock variant="line" :lines="1" width="4rem" class="ms-auto mb-0" />
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-8">
        <div class="card">
          <div class="card-body">
            <SkeletonBlock variant="line" :lines="1" width="35%" />
            <SkeletonBlock variant="line" :lines="4" />
          </div>
        </div>
      </div>
    </div>

    <ErrorState v-else-if="loadError" :message="loadError" @retry="loadWorkspaces" />

  <div v-else class="row g-3">
    <!-- Workspace list -->
    <div class="col-lg-4">
      <Card :title="t('web.file-hosting.workspaces_title')">
        <template #actions>
          <button
            v-if="canManage"
            class="btn btn-primary btn-sm"
            @click="showCreate = true"
          >
            <i class="bi bi-plus-lg me-1"></i> {{ t('actions.new') }}
          </button>
        </template>

        <div v-if="!workspaces.length" class="text-muted text-center py-3">
          {{ t('web.file-hosting.workspaces_empty') }}
        </div>
        <div v-else class="list-group list-group-flush">
          <button
            v-for="ws in workspaces"
            :key="ws.id"
            type="button"
            class="list-group-item list-group-item-action"
            :class="{ active: selected?.id === ws.id }"
            @click="selectWorkspace(ws)"
          >
            <div class="d-flex w-100 justify-content-between align-items-center">
              <span class="fw-semibold">{{ ws.name }}</span>
              <StatusBadge :status="ws.status" />
            </div>
            <div class="small d-flex gap-2 mt-1">
              <span class="badge text-bg-light">{{ ws.kind }}</span>
              <span class="badge" :class="roleBadgeClass(ws.my_role ?? '')">{{ ws.my_role ?? '—' }}</span>
              <span v-if="ws.is_owner" class="badge text-bg-warning">{{ t('web.file-hosting.owner') }}</span>
            </div>
          </button>
        </div>
      </Card>

      <Card :title="t('web.file-hosting.accept_invitation')" class="mt-3">
        <div class="input-group">
          <input
            v-model="inviteToken"
            type="text"
            class="form-control"
            :placeholder="t('web.file-hosting.invite_token_placeholder')"
            maxlength="64"
          />
          <button
            class="btn btn-outline-primary"
            type="button"
            :disabled="accepting || !inviteToken.trim()"
            @click="handleAcceptInvite"
          >
            <span v-if="accepting" class="spinner-border spinner-border-sm"></span>
            {{ t('actions.accept') }}
          </button>
        </div>
      </Card>
    </div>

    <!-- Workspace detail -->
    <div class="col-lg-8">
      <div v-if="!selected" class="text-muted text-center py-5">
        {{ t('web.file-hosting.select_workspace_hint') }}
      </div>

      <template v-else>
        <Card>
          <template #actions>
            <button
              v-if="selected.is_owner && canManage"
              class="btn btn-outline-danger btn-sm"
              @click="confirmArchive"
            >
              <i class="bi bi-archive me-1"></i> {{ t('actions.archive') }}
            </button>
          </template>

          <div class="d-flex align-items-center gap-2 mb-3">
            <h3 class="card-title mb-0">{{ selected.name }}</h3>
            <span class="badge text-bg-light">{{ selected.kind }}</span>
            <StatusBadge :status="selected.status" />
          </div>

          <dl class="row mb-0 small">
            <dt class="col-sm-3">{{ t('web.file-hosting.owner') }}</dt>
            <dd class="col-sm-9">{{ selected.owner?.name ?? '—' }} <span class="text-muted">&lt;{{ selected.owner?.email ?? '—' }}&gt;</span></dd>

            <dt class="col-sm-3">{{ t('web.file-hosting.my_role') }}</dt>
            <dd class="col-sm-9"><span class="badge" :class="roleBadgeClass(selected.my_role ?? '')">{{ selected.my_role ?? '—' }}</span></dd>

            <dt class="col-sm-3">{{ t('web.file-hosting.created') }}</dt>
            <dd class="col-sm-9">{{ selected.created_at_formatted ?? selected.created_at ?? '—' }}</dd>
          </dl>
        </Card>

        <!-- Members -->
        <Card :title="t('web.file-hosting.members_title')" class="mt-3">
          <div v-if="detailLoading" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary"></div>
          </div>
          <template v-else>
            <!-- Invite form -->
            <div v-if="selected.is_owner && canManage" class="row g-2 mb-3 align-items-end">
              <div class="col">
                <label class="form-label small">{{ t('web.file-hosting.email_label') }}</label>
                <input v-model="inviteEmail" type="email" class="form-control form-control-sm" placeholder="user@example.com" />
              </div>
              <div class="col-auto">
                <label class="form-label small">{{ t('web.file-hosting.role_label') }}</label>
                <select v-model="inviteRole" class="form-select form-select-sm">
                  <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                </select>
              </div>
              <div class="col-auto">
                <button
                  class="btn btn-primary btn-sm"
                  type="button"
                  :disabled="inviting || !inviteEmail.trim()"
                  @click="handleInvite"
                >
                  <span v-if="inviting" class="spinner-border spinner-border-sm me-1"></span>
                  {{ t('web.file-hosting.invite_button') }}
                </button>
              </div>
            </div>

            <div v-if="!members.length" class="text-muted text-center py-3">
              {{ t('web.file-hosting.no_active_members') }}
            </div>
            <div v-else class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{{ t('web.file-hosting.member_name_col') }}</th>
                    <th>{{ t('web.file-hosting.member_email_col') }}</th>
                    <th>{{ t('web.file-hosting.member_role_col') }}</th>
                    <th>{{ t('web.file-hosting.member_joined_col') }}</th>
                    <th v-if="selected.is_owner && canManage" class="text-end">{{ t('actions.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in members" :key="m.id">
                    <td>{{ m.user?.name ?? m.user_id }}</td>
                    <td class="text-muted small">{{ m.user?.email ?? '—' }}</td>
                    <td>
                      <span class="badge" :class="roleBadgeClass(m.role)">{{ m.role }}</span>
                    </td>
                    <td class="text-muted small">{{ m.joined_at_formatted ?? m.joined_at ?? '—' }}</td>
                    <td v-if="selected.is_owner && canManage" class="text-end text-nowrap">
                      <select
                        v-if="m.role !== 'Owner'"
                        class="form-select form-select-sm d-inline-block"
                        style="width: auto;"
                        :value="m.role"
                        @change="handleRoleChange(m, ($event.target as HTMLSelectElement).value)"
                      >
                        <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                      </select>
                      <button
                        v-if="m.role !== 'Owner'"
                        class="btn btn-outline-danger btn-sm ms-1"
                        @click="confirmRemoveMember(m)"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </Card>

        <!-- Activity feed -->
        <Card :title="t('web.file-hosting.recent_activity')" class="mt-3">
          <div v-if="detailLoading" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary"></div>
          </div>
          <div v-else-if="!activity.length" class="text-muted text-center py-3">
            {{ t('web.file-hosting.no_activity_recorded') }}
          </div>
          <ul v-else class="list-unstyled mb-0">
            <li v-for="a in activity" :key="a.id" class="d-flex gap-2 mb-2">
              <i class="bi bi-circle-fill text-primary small mt-1"></i>
              <div>
                <div>
                  <strong>{{ a.causer?.name ?? t('web.file-hosting.system') }}</strong>
                  <span class="text-muted"> — {{ a.event ?? a.description ?? t('web.file-hosting.activity') }}</span>
                </div>
                <div v-if="a.description" class="small text-muted">{{ a.description }}</div>
                <div class="small text-muted">{{ a.created_at ?? '—' }}</div>
              </div>
            </li>
          </ul>
        </Card>
      </template>
    </div>
  </div>

  <!-- Create workspace modal -->
  <Modal v-model="showCreate" :title="t('web.file-hosting.create_workspace_title')">
    <div class="mb-3">
      <label class="form-label">{{ t('web.file-hosting.workspace_name_label') }}</label>
      <input
        v-model="createName"
        type="text"
        class="form-control"
        maxlength="255"
        :placeholder="t('web.file-hosting.workspace_name_placeholder')"
        @keyup.enter="handleCreate"
      />
    </div>
    <template #footer>
      <button type="button" class="btn btn-outline-secondary" @click="showCreate = false">{{ t('web.file-hosting.cancel') }}</button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="creating || !createName.trim()"
        @click="handleCreate"
      >
        <span v-if="creating" class="spinner-border spinner-border-sm me-1"></span>
        {{ t('web.file-hosting.create') }}
      </button>
    </template>
  </Modal>
  </div>
</template>
