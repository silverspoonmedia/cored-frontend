<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import Modal from '@/components/Modal.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import { useArchivdWorkspaces } from '@/features/archivd/composables/useArchivdWorkspaces'

/**
 * Workspaces view — thin shell over useArchivdWorkspaces composable. Template keeps
 * the list/detail two-column layout, invite form, members table, and activity feed.
 */
const { t } = useI18n()

const {
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
} = useArchivdWorkspaces()
</script>

<template>
  <div class="ar-manager ar-admin-page">
    <header class="ar-admin-page__intro">
      <h1 class="h4 mb-1">{{ t('web.archivd.workspaces_title') }}</h1>
      <p class="text-muted small mb-0">{{ t('web.archivd.collab.subtitle') }}</p>
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
      <Card :title="t('web.archivd.workspaces_title')">
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
          {{ t('web.archivd.workspaces_empty') }}
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
              <span class="badge" :class="roleBadgeClass(ws.my_role ?? '')">{{ roleLabel(ws.my_role) }}</span>
              <span v-if="ws.is_owner" class="badge text-bg-warning">{{ t('web.archivd.owner') }}</span>
            </div>
          </button>
        </div>
      </Card>

      <Card :title="t('web.archivd.accept_invitation')" class="mt-3">
        <div class="input-group">
          <input
            v-model="inviteToken"
            type="text"
            class="form-control"
            :placeholder="t('web.archivd.invite_token_placeholder')"
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
        {{ t('web.archivd.select_workspace_hint') }}
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
            <dt class="col-sm-3">{{ t('web.archivd.owner') }}</dt>
            <dd class="col-sm-9">{{ selected.owner?.name ?? '—' }} <span class="text-muted">&lt;{{ selected.owner?.email ?? '—' }}&gt;</span></dd>

            <dt class="col-sm-3">{{ t('web.archivd.my_role') }}</dt>
            <dd class="col-sm-9"><span class="badge" :class="roleBadgeClass(selected.my_role ?? '')">{{ roleLabel(selected.my_role) }}</span></dd>

            <dt class="col-sm-3">{{ t('web.archivd.created') }}</dt>
            <dd class="col-sm-9">{{ selected.created_at_formatted ?? selected.created_at ?? '—' }}</dd>
          </dl>
        </Card>

        <!-- Members -->
        <Card :title="t('web.archivd.members_title')" class="mt-3">
          <div v-if="detailLoading" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary"></div>
          </div>
          <template v-else>
            <!-- Invite form -->
            <div v-if="selected.is_owner && canManage" class="row g-2 mb-3 align-items-end">
              <div class="col">
                <label class="form-label small">{{ t('web.archivd.email_label') }}</label>
                <input v-model="inviteEmail" type="email" class="form-control form-control-sm" placeholder="user@example.com" />
              </div>
              <div class="col-auto">
                <label class="form-label small">{{ t('web.archivd.role_label') }}</label>
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
                  {{ t('web.archivd.invite_button') }}
                </button>
              </div>
            </div>

            <div class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{{ t('web.archivd.member_name_col') }}</th>
                    <th>{{ t('web.archivd.member_email_col') }}</th>
                    <th>{{ t('web.archivd.member_role_col') }}</th>
                    <th>{{ t('web.archivd.member_joined_col') }}</th>
                    <th v-if="selected.is_owner && canManage" class="text-end">{{ t('actions.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <TableEmptyRow
                    v-if="!members.length"
                    :colspan="selected.is_owner && canManage ? 5 : 4"
                    icon="bi-people"
                    :title="t('web.archivd.no_active_members')"
                  />
                  <tr v-for="m in members" :key="m.id">
                    <td>{{ m.user?.name ?? m.user_id }}</td>
                    <td class="text-muted small">{{ m.user?.email ?? '—' }}</td>
                    <td>
                      <span class="badge" :class="roleBadgeClass(m.role)">{{ roleLabel(m.role) }}</span>
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
                        <option v-for="r in roles" :key="r" :value="r">{{ roleLabel(r) }}</option>
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
        <Card :title="t('web.archivd.recent_activity')" class="mt-3">
          <div v-if="detailLoading" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary"></div>
          </div>
          <div v-else-if="!activity.length" class="text-muted text-center py-3">
            {{ t('web.archivd.no_activity_recorded') }}
          </div>
          <ul v-else class="list-unstyled mb-0">
            <li v-for="a in activity" :key="a.id" class="d-flex gap-2 mb-2">
              <i class="bi bi-circle-fill text-primary small mt-1"></i>
              <div>
                <div>
                  <strong>{{ a.causer?.name ?? t('web.archivd.system') }}</strong>
                  <span class="text-muted"> — {{ a.event ?? a.description ?? t('web.archivd.activity') }}</span>
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
  <Modal v-model="showCreate" :title="t('web.archivd.create_workspace_title')">
    <div class="mb-3">
      <label class="form-label">{{ t('web.archivd.workspace_name_label') }}</label>
      <input
        v-model="createName"
        type="text"
        class="form-control"
        maxlength="255"
        :placeholder="t('web.archivd.workspace_name_placeholder')"
        @keyup.enter="handleCreate"
      />
    </div>
    <template #footer>
      <button type="button" class="btn btn-outline-secondary" @click="showCreate = false">{{ t('web.archivd.cancel') }}</button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="creating || !createName.trim()"
        @click="handleCreate"
      >
        <span v-if="creating" class="spinner-border spinner-border-sm me-1"></span>
        {{ t('web.archivd.create') }}
      </button>
    </template>
  </Modal>
  </div>
</template>
