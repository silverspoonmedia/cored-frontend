<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNavigation } from '@/composables/useNavigation'
import type { NavNode } from '@/types'
import { useSidebar } from '@/composables/useSidebar'
import { useTheme } from '@/composables/useTheme'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { useNotifications } from '@/composables/useNotifications'
import { useEcho, onEchoResync } from '@/composables/useEcho'
import { useShellHydrate } from '@/composables/useShellHydrate'
import { csrfToken, ensureCsrf } from '@/api/csrf'
import { triggerAllListingsReload } from '@/composables/useListingReload'
import { setLocale, SUPPORTED_LOCALES, type AppLocale } from '@/i18n'
import { isNavNodeActive } from '@/utils/navActive'
import { resolveNotificationLocation } from '@/utils/notificationTarget'
import type { AppNotification } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const { toggle: toggleSidebar } = useSidebar()
const { mode, setMode } = useTheme()
const { user, logout, switchLocale: switchLocaleApi } = useAuth()
const { success: showSuccess } = useAlert()
const { unreadCount, items: recentNotifications, hasSeededUnread, hasSeededList, fetchUnreadCount, fetchList, markAllRead, markAsRead, startRealtime, stopRealtime } = useNotifications()
const { navbarTree, load: loadNavigation, isTreeLoaded, startRealtime: startNavRealtime } = useNavigation()
const { init: initEcho, disconnect: disconnectEcho, connected: echoConnected } = useEcho()
const { hydrateShell } = useShellHydrate()

const currentLocale = computed<AppLocale>(() => locale.value as AppLocale)
const supportedLocales = SUPPORTED_LOCALES

const notificationCount = computed(() => unreadCount.value)
const bellLoading = ref(false)
let stopResync: (() => void) | null = null

const userName = computed(() => user.value?.name ?? '—')
const userEmail = computed(() => user.value?.email ?? '—')

function resolveHref(nodeRoute: string | null | undefined): string {
  if (!nodeRoute || nodeRoute === '#') return '#'
  return '#'
}

function isActive(node: NavNode): boolean {
  return isNavNodeActive(node, route)
}

function navigate(node: NavNode): void {
  if (!node.route || node.route === '#') return
  if (node.children.length > 0) return
  const target = node.route.endsWith('.view') ? node.route : `${node.route}.view`
  if (router.hasRoute(target)) {
    router.push({ name: target })
  } else if (router.hasRoute(node.route)) {
    router.push({ name: node.route })
  }
}

function switchLocale(locale: AppLocale): void {
  setLocale(locale)
  switchLocaleApi(locale).then(() => {
    showSuccess(t('web.navbar.language_updated'))
  }).catch(() => {
    // locale already switched client-side, API sync is best-effort
  })
}

const loggingOut = computed(() => false)

async function handleLogout(): Promise<void> {
  await logout()
  showSuccess(t('web.navbar.logged_out'))
  router.push({ name: 'login.view' })
}

async function loadBellData(): Promise<void> {
  const tasks: Promise<unknown>[] = [fetchList(5)]
  if (!hasSeededUnread.value) {
    tasks.push(fetchUnreadCount())
  }
  await Promise.all(tasks)
}

async function handleMarkAllRead(): Promise<void> {
  bellLoading.value = true
  try {
    await markAllRead()
    showSuccess(t('web.navbar.all_notifications_marked_read'))
  } catch {
    // silent
  } finally {
    bellLoading.value = false
  }
}

async function handleNotificationClick(n: AppNotification): Promise<void> {
  if (!n.is_read) {
    try {
      await markAsRead(n.id)
    } catch {
      // silent
    }
  }
  const target = resolveNotificationLocation(router, n.action_route, n.action_params)
  await router.push(target ?? { name: 'notifications.index.view' })
}

function notificationTime(n: { created_at_human: string | null; created_at_formatted: string | null; created_at: string | null }): string {
  return n.created_at_human ?? n.created_at_formatted ?? n.created_at ?? '—'
}

onMounted(() => {
  // AppNavbar mounts before AppLayout. Calling hydrateShell() here starts (or
  // joins) the shell batch so fallback GETs do not race POST /batch — a child
  // GET notifications 401 used to POST /auth/refresh and tear down the session.
  void (async () => {
    await hydrateShell()
    if (!hasSeededList.value) {
      fetchList(5)
    }
    if (!hasSeededUnread.value) {
      fetchUnreadCount()
    }
    if (!isTreeLoaded('navbar')) {
      loadNavigation('navbar')
    }
  })()

  // Private-channel auth is POST /broadcasting/auth (cookie + CSRF). Mint a
  // nonce first when missing so the first subscribe does not POST with an empty
  // X-CSRF-Token while __Host-spa_jwt is already set. When login already minted
  // one, keep init synchronous so sibling views that call getEcho() in onMounted
  // still see the singleton. AppLayout may have called startNavRealtime while
  // Echo was still null — call it again after init (useNavigation no-ops if
  // already listening).
  const bootEcho = (): void => {
    const echoStarted = initEcho()
    if (echoStarted) {
      startRealtime()
      startNavRealtime()
    }
  }
  if (csrfToken() !== null) {
    bootEcho()
  } else {
    void ensureCsrf().then(() => bootEcho())
  }

  // Re-pull state after a socket outage: events during the gap are lost, so
  // refresh the bell and every registered listing when the socket recovers.
  stopResync = onEchoResync(() => {
    fetchUnreadCount()
    fetchList(5)
    triggerAllListingsReload()
  })
})

onUnmounted(() => {
  stopResync?.()
  stopResync = null
  stopRealtime()
  disconnectEcho()
})
</script>

<template>
  <nav class="app-header navbar navbar-expand bg-body">
    <div class="container-fluid">
      <ul class="navbar-nav">
        <li class="nav-item">
          <a
            class="nav-link"
            href="#"
            role="button"
            :aria-label="t('web.navbar.toggle_sidebar')"
            aria-expanded="false"
            @click.prevent="toggleSidebar()"
          >
            <i class="bi bi-list" aria-hidden="true"></i>
          </a>
        </li>
        <!-- Navbar tree: Home link -->
        <li v-for="item in navbarTree" :key="item.id" class="nav-item">
          <a
            class="nav-link"
            :href="resolveHref(item.route)"
            @click.prevent="navigate(item)"
          >
            <i :class="item.icon || 'bi bi-circle'" aria-hidden="true"></i>
            <span class="d-none d-md-inline ms-1">{{ item.name }}</span>
          </a>
        </li>
      </ul>

      <ul class="navbar-nav ms-auto">
        <!-- Realtime connection indicator: visible only while the socket is down
             (Echo auto-reconnect in progress). Hidden when connected. -->
        <li v-if="!echoConnected" class="nav-item d-flex align-items-center" :title="t('web.navbar.reconnecting')">
          <span class="nav-link py-0">
            <span class="spinner-border spinner-border-sm text-warning align-middle" role="status" aria-hidden="true"></span>
            <span class="visually-hidden">{{ t('web.navbar.reconnecting') }}</span>
          </span>
        </li>
        <!-- Color mode toggle -->
        <li class="nav-item dropdown">
          <a
            class="nav-link"
            href="#"
            id="bd-theme"
            :aria-label="t('web.navbar.toggle_theme')"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i class="bi bi-sun-fill" :class="{ 'd-none': mode !== 'light' }" aria-hidden="true"></i>
            <i class="bi bi-moon-fill" :class="{ 'd-none': mode !== 'dark' }" aria-hidden="true"></i>
            <i class="bi bi-circle-half" :class="{ 'd-none': mode !== 'auto' }" aria-hidden="true"></i>
          </a>
          <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="bd-theme" style="--bs-dropdown-min-width: 8rem">
            <li>
              <button
                type="button"
                class="dropdown-item d-flex align-items-center"
                :class="{ active: mode === 'light' }"
                :aria-pressed="mode === 'light'"
                @click="setMode('light')"
              >
                <i class="bi bi-sun-fill me-2"></i> {{ t('web.navbar.theme_light') }}
                <i class="bi bi-check-lg ms-auto" :class="{ 'd-none': mode !== 'light' }"></i>
              </button>
            </li>
            <li>
              <button
                type="button"
                class="dropdown-item d-flex align-items-center"
                :class="{ active: mode === 'dark' }"
                :aria-pressed="mode === 'dark'"
                @click="setMode('dark')"
              >
                <i class="bi bi-moon-fill me-2"></i> {{ t('web.navbar.theme_dark') }}
                <i class="bi bi-check-lg ms-auto" :class="{ 'd-none': mode !== 'dark' }"></i>
              </button>
            </li>
            <li>
              <button
                type="button"
                class="dropdown-item d-flex align-items-center"
                :class="{ active: mode === 'auto' }"
                :aria-pressed="mode === 'auto'"
                @click="setMode('auto')"
              >
                <i class="bi bi-circle-half me-2"></i> {{ t('web.navbar.theme_auto') }}
                <i class="bi bi-check-lg ms-auto" :class="{ 'd-none': mode !== 'auto' }"></i>
              </button>
            </li>
          </ul>
        </li>

        <!-- Locale switcher -->
        <li class="nav-item dropdown">
          <a
            class="nav-link"
            href="#"
            data-bs-toggle="dropdown"
            :aria-label="t('ui.labels.language')"
            aria-expanded="false"
          >
            <i class="bi bi-translate" aria-hidden="true"></i>
            <span class="d-none d-md-inline ms-1 text-uppercase">{{ currentLocale }}</span>
          </a>
          <ul class="dropdown-menu dropdown-menu-end">
            <li v-for="locale in supportedLocales" :key="locale">
              <a
                class="dropdown-item"
                :class="{ active: currentLocale === locale }"
                href="#"
                @click.prevent="switchLocale(locale)"
              >
                {{ locale.toUpperCase() }}
              </a>
            </li>
          </ul>
        </li>

        <!-- Notifications bell -->
        <li class="nav-item dropdown" id="notification-bell">
          <a
            class="nav-link"
            href="#"
            data-bs-toggle="dropdown"
            :aria-label="t('web.notifications.bell_label')"
            aria-expanded="false"
          >
            <i class="bi bi-bell-fill" aria-hidden="true"></i>
            <span v-if="notificationCount > 0" class="navbar-badge badge text-bg-danger">{{ notificationCount }}</span>
          </a>
          <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end">
            <span class="dropdown-item dropdown-header d-flex justify-content-between align-items-center">
              <span>{{ t('web.navbar.unread_count', { count: notificationCount }) }}</span>
              <button
                v-if="notificationCount > 0"
                class="btn btn-link btn-sm p-0 text-decoration-none"
                type="button"
                :disabled="bellLoading"
                @click="handleMarkAllRead"
              >
                {{ t('web.navbar.mark_all_read') }}
              </button>
            </span>
            <div class="dropdown-divider"></div>
            <div>
              <a
                v-for="n in recentNotifications.slice(0, 5)"
                :key="n.id"
                href="#"
                class="dropdown-item"
                :class="{ 'fw-semibold': !n.is_read }"
                @click.prevent="handleNotificationClick(n)"
              >
                <i :class="n.icon || 'bi bi-bell'" class="me-2" aria-hidden="true"></i>
                <span class="small">{{ n.message }}</span>
                <span class="d-block text-muted fs-7">{{ notificationTime(n) }}</span>
              </a>
              <span v-if="recentNotifications.length === 0" class="dropdown-item text-secondary fs-7">{{ t('web.navbar.no_new_notifications') }}</span>
            </div>
            <div class="dropdown-divider"></div>
            <router-link :to="{ name: 'notifications.index.view' }" class="dropdown-item dropdown-footer">{{ t('web.navbar.view_all') }}</router-link>
          </div>
        </li>

        <!-- User menu -->
        <li class="nav-item dropdown user-menu">
          <a
            href="#"
            class="nav-link dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            :aria-label="t('ui.labels.user_menu')"
          >
            <i class="bi bi-person-circle fs-5" aria-hidden="true"></i>
            <span class="d-none d-md-inline ms-1">{{ userName }}</span>
          </a>
          <ul class="dropdown-menu dropdown-menu-lg dropdown-menu-end">
            <li class="user-header text-bg-primary">
              <i class="bi bi-person-circle" style="font-size: 3.5rem;"></i>
              <p>
                {{ userName }}
                <small>{{ userEmail }}</small>
              </p>
            </li>
            <li class="px-3 py-2">
              <div class="d-grid gap-2">
                <router-link :to="{ name: 'profile.password.edit.view' }" class="btn btn-outline-secondary btn-sm text-start">
                  <i class="bi bi-key me-1"></i> {{ t('web.navbar.password') }}
                </router-link>
                <router-link :to="{ name: 'profile.two-factor.edit.view' }" class="btn btn-outline-secondary btn-sm text-start">
                  <i class="bi bi-shield-lock me-1"></i> {{ t('web.navbar.two_factor') }}
                </router-link>
                <router-link :to="{ name: 'profile.connections.view' }" class="btn btn-outline-secondary btn-sm text-start">
                  <i class="bi bi-link-45deg me-1"></i> {{ t('web.navbar.connected_accounts') }}
                </router-link>
              </div>
            </li>
            <li class="user-footer">
              <div class="float-end">
                <button
                  class="btn btn-outline-danger btn-sm"
                  type="button"
                  :disabled="loggingOut"
                  @click="handleLogout"
                >
                  <i class="bi bi-box-arrow-right" aria-hidden="true"></i> {{ t('web.navbar.logout') }}
                </button>
              </div>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </nav>
</template>
