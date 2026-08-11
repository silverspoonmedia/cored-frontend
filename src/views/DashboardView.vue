<script setup lang="ts">
import { computed, ref } from 'vue'
import DashboardSessionCard from '@/components/DashboardSessionCard.vue'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'

const { user, hasPermission, resendVerification } = useAuth()
const { success: showSuccess, error: showError } = useAlert()

const canViewUser = computed(() => hasPermission('view user'))
const canViewMenu = computed(() => hasPermission('view menu'))
const resending = ref(false)

const sessionLabels = {
  title: 'Live session',
  hint: 'Refresh fetches your current profile from the server.',
  name: 'Name',
  email: 'Email',
  roles: 'Role',
  noRoles: 'No roles assigned',
  refresh: 'Refresh',
  refreshing: 'Refreshing…',
  refreshedAt: 'Updated',
  loadFailed: 'Failed to load session data.',
}

async function handleResend(): Promise<void> {
  if (resending.value) return
  resending.value = true
  try {
    await resendVerification()
    showSuccess('Verification email sent.')
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to send')
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <div class="row">
    <div class="col-lg-8">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title mb-0">Welcome, {{ user?.name ?? '—' }}</h3>
        </div>
        <div class="card-body">
          <p class="text-muted mb-3">{{ user?.email ?? '—' }}</p>

          <div class="mb-3">
            <strong>Role:</strong>
            <template v-if="user && user.roles.length">
              <span
                v-for="role in user.roles"
                :key="role"
                class="badge text-bg-primary"
              >{{ role }}</span>
            </template>
            <span v-else class="text-muted">No roles assigned</span>
          </div>

          <div class="mb-3">
            <strong>Status:</strong>
            <template v-if="user?.email_verified_at">
              <span class="badge text-bg-success">Verified</span>
            </template>
            <template v-else>
              <span class="badge text-bg-warning">Unverified</span>
              <button
                type="button"
                class="btn btn-sm btn-outline-primary ms-2"
                :disabled="resending"
                @click="handleResend"
              >
                <span v-if="resending" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Resend verification
              </button>
            </template>
          </div>

          <div class="mb-3">
            <strong>Two-Factor:</strong>
            <template v-if="user?.two_factor_enabled">
              <span class="badge text-bg-success">Enabled</span>
            </template>
            <template v-else>
              <span class="badge text-bg-warning">Disabled</span>
              <router-link :to="{ name: 'profile.two-factor.edit.view' }" class="btn btn-sm btn-outline-primary ms-2">
                Set up Two-Factor
              </router-link>
            </template>
          </div>

          <div class="mb-3">
            <strong>Permissions:</strong>
            <template v-if="user && user.permissions.length">
              <span
                v-for="permission in user.permissions"
                :key="permission"
                class="badge text-bg-secondary"
              >{{ permission }}</span>
            </template>
            <span v-else class="text-muted">No permissions assigned</span>
          </div>
        </div>
      </div>
    </div>

    <div class="col-lg-4">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title mb-0">Quick Access</h3>
        </div>
        <div class="card-body">
          <div class="d-grid gap-2">
            <router-link v-if="canViewUser" :to="{ name: 'users.index.view' }" class="btn btn-outline-primary">
              <i class="bi bi-people me-1"></i> Users
            </router-link>
            <router-link v-if="canViewMenu" :to="{ name: 'menus.index.view' }" class="btn btn-outline-primary">
              <i class="bi bi-list-nested me-1"></i> Navigation
            </router-link>
            <router-link :to="{ name: 'profile.password.edit.view' }" class="btn btn-outline-secondary">
              <i class="bi bi-key me-1"></i> Password
            </router-link>
            <router-link :to="{ name: 'profile.two-factor.edit.view' }" class="btn btn-outline-secondary">
              <i class="bi bi-shield-lock me-1"></i> Two-Factor
            </router-link>
          </div>
        </div>
      </div>

      <!-- Vue island equivalent: live session refresh -->
      <div class="mt-3">
        <DashboardSessionCard
          :profile="{
            name: user?.name ?? '—',
            email: user?.email ?? '—',
            roles: user?.roles ?? [],
          }"
          :labels="sessionLabels"
        />
      </div>
    </div>
  </div>
</template>
