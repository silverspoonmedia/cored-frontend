<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DashboardSessionCard from '@/components/dashboard/DashboardSessionCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { useAuthSelfRealtime } from '@/composables/identity/useAuthSelfRealtime'
import { useAdminRealtime } from '@/composables/useAdminRealtime'
import { useArchivdRealtime } from '@/composables/archivd/useArchivdRealtime'
import { useEchoResync } from '@/composables/useEcho'

const { user, hasPermission, resendVerification, fetchMe } = useAuth()
const { t } = useI18n()
const { success: showSuccess, error: showError } = useAlert()

const canViewUser = computed(() => hasPermission('view user'))
const canViewMenu = computed(() => hasPermission('view menu'))
const resending = ref(false)

// Live update: session/2FA state changes (any tab) + RBAC role changes +
// personal Archivd quota changes refresh the dashboard summary live.
const { subscribe: subscribeAuthSelf, unsubscribe: unsubscribeAuthSelf } = useAuthSelfRealtime()
const authSelfHandlers = {
  onSecurityStateChanged: () => { void fetchMe() },
  onAuthStateChanged: () => { void fetchMe() },
}

const { subscribe: subscribeAdmin, unsubscribe: unsubscribeAdmin } = useAdminRealtime()
const adminHandlers = {
  onRbacChanged: () => { void fetchMe() },
  onUserListChanged: (e: { user_id: string | null }) => {
    if (e.user_id === user.value?.id) void fetchMe()
  },
}

const { subscribe: subscribeArchivd, unsubscribe: unsubscribeArchivd } = useArchivdRealtime()
const archivdHandlers = { onQuotaChanged: () => { void fetchMe() } }

useEchoResync(() => { void fetchMe() })

onMounted(() => {
  subscribeAuthSelf(authSelfHandlers)
  subscribeAdmin(adminHandlers)
  subscribeArchivd(archivdHandlers)
})

onUnmounted(() => {
  unsubscribeAuthSelf(authSelfHandlers)
  unsubscribeAdmin(adminHandlers)
  unsubscribeArchivd(archivdHandlers)
})

const sessionLabels = computed(() => ({
  title: t('web.dashboard.session_island.title'),
  hint: t('web.dashboard.session_island.hint'),
  name: t('ui.labels.name'),
  email: t('ui.labels.email'),
  roles: t('ui.labels.role'),
  noRoles: t('web.dashboard.no_roles'),
  refresh: t('web.dashboard.session_island.refresh'),
  refreshing: t('web.dashboard.session_island.refreshing'),
  refreshedAt: t('web.dashboard.session_island.refreshed_at'),
  loadFailed: t('web.dashboard.session_island.load_failed'),
}))

async function handleResend(): Promise<void> {
  if (resending.value) return
  resending.value = true
  try {
    await resendVerification()
    showSuccess(t('api.auth.verification_sent'))
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.dashboard.session_island.load_failed'))
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
          <h3 class="card-title mb-0">{{ t('web.dashboard.welcome', { name: user?.name ?? '—' }) }}</h3>
        </div>
        <div class="card-body">
          <p class="text-muted mb-3">{{ user?.email ?? '—' }}</p>

          <div class="mb-3">
            <strong>{{ t('ui.labels.role') }}:</strong>
            <template v-if="user && user.roles.length">
              <span
                v-for="role in user.roles"
                :key="role"
                class="badge text-bg-primary"
              >{{ role }}</span>
            </template>
            <span v-else class="text-muted">{{ t('web.dashboard.no_roles') }}</span>
          </div>

          <div class="mb-3">
            <strong>{{ t('ui.labels.status') }}:</strong>
            <template v-if="user?.email_verified_at">
              <StatusBadge status="verified" :label="t('ui.status.verified')" />
            </template>
            <template v-else>
              <StatusBadge status="unverified" :label="t('ui.status.unverified')" />
              <button
                type="button"
                class="btn btn-sm btn-outline-primary ms-2"
                :disabled="resending"
                @click="handleResend"
              >
                <span v-if="resending" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                {{ t('web.dashboard.resend_verification') }}
              </button>
            </template>
          </div>

          <div class="mb-3">
            <strong>{{ t('menu.two_factor') }}:</strong>
            <template v-if="user?.two_factor_enabled">
              <StatusBadge status="enabled" :label="t('web.auth.two_factor_enabled_short')" />
            </template>
            <template v-else>
              <StatusBadge status="disabled" :label="t('web.auth.two_factor_disabled_short')" />
              <router-link :to="{ name: 'profile.two-factor.edit.view' }" class="btn btn-sm btn-outline-primary ms-2">
                {{ t('web.auth.two_factor_setup_button') }}
              </router-link>
            </template>
          </div>

          <div class="mb-3">
            <strong>{{ t('ui.labels.permissions') }}:</strong>
            <template v-if="user && user.permissions.length">
              <span
                v-for="permission in user.permissions"
                :key="permission"
                class="badge text-bg-secondary"
              >{{ permission }}</span>
            </template>
            <span v-else class="text-muted">{{ t('web.dashboard.no_permissions') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="col-lg-4">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title mb-0">{{ t('web.dashboard.quick_access') }}</h3>
        </div>
        <div class="card-body">
          <div class="d-grid gap-2">
            <router-link v-if="canViewUser" :to="{ name: 'users.index.view' }" class="btn btn-outline-primary">
              <i class="bi bi-people me-1"></i> {{ t('menu.users') }}
            </router-link>
            <router-link v-if="canViewMenu" :to="{ name: 'menus.index.view' }" class="btn btn-outline-primary">
              <i class="bi bi-list-nested me-1"></i> {{ t('menu.navigation') }}
            </router-link>
            <router-link :to="{ name: 'profile.password.edit.view' }" class="btn btn-outline-secondary">
              <i class="bi bi-key me-1"></i> {{ t('menu.password') }}
            </router-link>
            <router-link :to="{ name: 'profile.two-factor.edit.view' }" class="btn btn-outline-secondary">
              <i class="bi bi-shield-lock me-1"></i> {{ t('menu.two_factor') }}
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
