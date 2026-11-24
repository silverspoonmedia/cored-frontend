import { ref, computed } from 'vue'
import i18n from '@/i18n'
import { post, get, setRefreshHandler, setUnauthorizedHandler, markSessionIssued, clearSessionIssued, isSessionSettling } from '@/api/client'
import { clearCsrf, refreshCsrf } from '@/api/csrf'
import type { ApiResponse, AuthPayload, LoginResult, TwoFactorChallengePayload, User } from '@/api/types'

const STORAGE_KEY = 'mw_auth'

type AuthChannelMessage =
  | { type: 'refresh-request'; id: string }
  | { type: 'refresh-response' }
  | { type: 'refresh-done'; ok: boolean; user?: User; expiresAt?: number; remember?: boolean; epoch?: number }
  | { type: 'logout'; epoch?: number }

const LOGOUT_BARRIER_KEY = 'mw_logout_barrier'
const LOGOUT_EVENT_KEY = 'mw_logout_event'

const user = ref<User | null>(null)
const expiresAt = ref<number | null>(null)
const remember = ref(false)
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let sessionEpoch = 0
let logoutBarrier = false
let isLoggingOut = ref(false)
let logoutPromise: Promise<void> | null = null

const isAuthenticated = computed(() => !!user.value)
const loggingOut = computed(() => isLoggingOut.value)
const translated = (key: string): string => i18n.global.t(key)

function clearLeftoverTokenStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

const authChannel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cored-auth') : null

let isRefreshing = false
let pendingRequestId: string | null = null
let shouldYield = false
let waitingResolvers: Array<(ok: boolean) => void> = []
let authRefreshPromise: Promise<boolean> | null = null

function broadcast(msg: AuthChannelMessage): void {
  try {
    authChannel?.postMessage(msg)
  } catch {
    // ignore
  }
}

export function getSessionEpoch(): number {
  return sessionEpoch
}

function setLogoutBarrier(): void {
  logoutBarrier = true
  try { localStorage.setItem(LOGOUT_BARRIER_KEY, '1') } catch { /* storage unavailable */ }
}

function clearLogoutBarrier(): void {
  logoutBarrier = false
  try { localStorage.removeItem(LOGOUT_BARRIER_KEY) } catch { /* storage unavailable */ }
}

function hasLogoutBarrier(): boolean {
  if (logoutBarrier) return true
  try { return localStorage.getItem(LOGOUT_BARRIER_KEY) === '1' } catch { return false }
}

function isCurrentSession(epoch: number): boolean {
  return epoch === sessionEpoch && !isLoggingOut.value && !hasLogoutBarrier()
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

if (authChannel) {
  authChannel.onmessage = (e: MessageEvent) => {
    const data = e.data as AuthChannelMessage | undefined
    if (!data || typeof data !== 'object') return

    switch (data.type) {
      case 'refresh-request':
        if (isRefreshing) {
          broadcast({ type: 'refresh-response' })
        } else if (pendingRequestId && data.id < pendingRequestId) {
          shouldYield = true
        }
        break

      case 'refresh-response':
        shouldYield = true
        break

      case 'refresh-done':
        if (data.epoch !== undefined && data.epoch !== sessionEpoch) {
          break
        }
        if (data.ok && data.user && data.expiresAt) {
          user.value = data.user
          expiresAt.value = data.expiresAt
          remember.value = data.remember ?? false
          scheduleRefresh()
        }
        waitingResolvers.forEach((resolve) => resolve(data.ok))
        waitingResolvers = []
        break

      case 'logout':
        receiveLogout(data.epoch)
        break
    }
  }
}

function receiveLogout(epoch?: number): void {
  if (epoch !== undefined) {
    sessionEpoch = Math.max(sessionEpoch, epoch)
  }
  setLogoutBarrier()
  clearAuth(true, false)
}

if (typeof window !== 'undefined') {
  window.addEventListener?.('storage', (event) => {
    if (event.key !== LOGOUT_EVENT_KEY || !event.newValue) return
    const epoch = Number(event.newValue)
    receiveLogout(Number.isFinite(epoch) ? epoch : undefined)
  })
}

function applyAuth(payload: AuthPayload): void {
  clearLogoutBarrier()
  user.value = payload.user
  expiresAt.value = Date.now() + payload.expires_in * 1000
  remember.value = payload.remember
  markSessionIssued()
  scheduleRefresh()
}

function clearAuth(preserveLogoutBarrier = false, shouldBroadcast = true): void {
  sessionEpoch += 1
  isLoggingOut.value = false
  if (!preserveLogoutBarrier) {
    clearLogoutBarrier()
  }
  user.value = null
  expiresAt.value = null
  clearCsrf()
  clearSessionIssued()
  remember.value = false
  clearLeftoverTokenStorage()
  waitingResolvers.forEach((resolve) => resolve(false))
  waitingResolvers = []
  shouldYield = false
  pendingRequestId = null
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  void import('@/composables/useShellHydrate').then((m) => m.resetShellHydration())
  void import('@/router').then(async (m) => {
    m.resetRouterHydration()
    await m.revokeCurrentProtectedRoute()
  })
  void import('@/composables/navigation/useNavigation').then((m) => m.resetNavigationState())
  void import('@/composables/notification/useNotifications').then((m) => m.resetNotificationState())
  if (shouldBroadcast) {
    broadcast({ type: 'logout', epoch: sessionEpoch })
    try { localStorage.setItem(LOGOUT_EVENT_KEY, String(sessionEpoch)) } catch { /* storage unavailable */ }
  }
}

function scheduleRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  if (!expiresAt.value || !user.value) return

  const msUntilRefresh = expiresAt.value - Date.now() - 60_000
  if (msUntilRefresh <= 0) return

  refreshTimer = setTimeout(() => {
    refreshSession()
      .then((ok) => {
        if (!ok) clearAuth()
      })
      .catch(() => {
        clearAuth()
      })
  }, msUntilRefresh)
}

async function refreshSession(): Promise<boolean> {
  if (hasLogoutBarrier()) return false
  if (authRefreshPromise) {
    return authRefreshPromise
  }

  authRefreshPromise = doRefresh()
  try {
    return await authRefreshPromise
  } finally {
    authRefreshPromise = null
  }
}

async function doRefresh(): Promise<boolean> {
  const epoch = sessionEpoch
  if (authChannel) {
    pendingRequestId = generateId()
    shouldYield = false
    broadcast({ type: 'refresh-request', id: pendingRequestId })

    await new Promise((resolve) => setTimeout(resolve, 50))

    if (!isCurrentSession(epoch)) {
      pendingRequestId = null
      return false
    }

    if (shouldYield) {
      const result = await new Promise<boolean>((resolve) => {
        waitingResolvers.push(resolve)
        setTimeout(() => resolve(false), 10_000)
      })
      pendingRequestId = null
      return isCurrentSession(epoch) ? result : false
    }

    isRefreshing = true
    try {
      const res = await post<ApiResponse<AuthPayload>>('auth/refresh', {
        remember: remember.value,
      })
      if (!isCurrentSession(epoch)) {
        broadcast({ type: 'refresh-done', ok: false, epoch })
        return false
      }
      if (res.status === 'success' && res.data?.user && typeof res.data.expires_in === 'number') {
        applyAuth(res.data)
        const expiresAtMs = Date.now() + res.data.expires_in * 1000
        broadcast({
          type: 'refresh-done',
          ok: true,
          user: res.data.user,
          expiresAt: expiresAtMs,
          remember: res.data.remember,
          epoch,
        })
        return true
      }
        broadcast({ type: 'refresh-done', ok: false, epoch })
        return false
    } catch {
        broadcast({ type: 'refresh-done', ok: false, epoch })
        return false
    } finally {
      isRefreshing = false
      pendingRequestId = null
    }
  }

  try {
    const res = await post<ApiResponse<AuthPayload>>('auth/refresh', {
      remember: remember.value,
    })
    if (!isCurrentSession(epoch)) {
      return false
    }
    if (res.status === 'success' && res.data?.user && typeof res.data.expires_in === 'number') {
      applyAuth(res.data)
      return true
    }
    return false
  } catch {
    return false
  }
}

setRefreshHandler(refreshSession)
setUnauthorizedHandler(() => {
  const wasAuth = !!user.value
  // A guest 401 (cold-boot GET auth/me, no session cookie) is not session death.
  // clearAuth() would drop a CSRF nonce and reset hydration flags, which races
  // the first post-login POST /batch against a second minted cookie.
  if (!wasAuth) return
  // Failed refresh in the post-login cookie-settle window is not logout —
  // the JWT was just minted; the cookie is still committing.
  if (isSessionSettling()) return
  clearAuth()
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
})

export function useAuth() {
  return {
    user,
    isAuthenticated,
    login,
    register,
    forgotPassword,
    resetPassword,
    verifyTwoFactor,
    logout,
    fetchMe,
    confirmSession,
    hydrate,
    hydrateShell,
    hasPermission,
    resendVerification,
    switchLocale,
    setUser,
    getSessionEpoch,
    loggingOut,
  }
}

function captchaBody(captcha?: string | null): Record<string, string> {
  if (!captcha) return {}
  return { 'h-captcha-response': captcha }
}

async function login(
  email: string,
  password: string,
  rememberMe: boolean,
  captcha?: string | null,
): Promise<LoginResult> {
  const res = await post<ApiResponse<AuthPayload | TwoFactorChallengePayload>>('auth/login', {
    email,
    password,
    remember_me: rememberMe,
    ...captchaBody(captcha),
  })

  if (res.status === 'success' && res.data) {
    const data = res.data
    if ('two_factor_required' in data && data.two_factor_required === true) {
      return {
        type: 'two_factor_challenge',
        token: data.two_factor_token,
        expiresInSeconds: data.two_factor_token_expires_in,
      }
    }
    applyAuth(data as AuthPayload)
    // Mint CSRF after the JWT Set-Cookie is processed so the nonce shares the
    // same cookie jar as the session. Guest hydrates must not have minted one.
    await refreshCsrf()
    return { type: 'authenticated', user: (data as AuthPayload).user }
  }

  throw new Error(res.message ?? translated('web.auth.login_failed'))
}

async function verifyTwoFactor(
  twoFactorToken: string,
  code: string,
  captcha?: string | null,
): Promise<User> {
  const res = await post<ApiResponse<AuthPayload>>('auth/two-factor/login', {
    two_factor_token: twoFactorToken,
    code,
    ...captchaBody(captcha),
  })

  if (res.status === 'success' && res.data) {
    applyAuth(res.data)
    await refreshCsrf()
    return res.data.user
  }

  throw new Error(res.message ?? translated('web.auth.two_factor_verification_failed'))
}

async function register(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string,
  captcha?: string | null,
): Promise<User> {
  const res = await post<ApiResponse<AuthPayload>>('auth/register', {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
    ...captchaBody(captcha),
  })

  if (res.status === 'success' && res.data) {
    applyAuth(res.data)
    await refreshCsrf()
    return res.data.user
  }

  throw new Error(res.message ?? translated('web.auth.register_failed'))
}

async function forgotPassword(email: string, captcha?: string | null): Promise<void> {
  const res = await post<ApiResponse<null>>('auth/forgot-password', {
    email,
    ...captchaBody(captcha),
  })

  if (res.status !== 'success') {
    throw new Error(res.message ?? translated('web.auth.forgot_password_failed'))
  }
}

async function resetPassword(
  resetToken: string,
  email: string,
  password: string,
  passwordConfirmation: string,
  captcha?: string | null,
): Promise<void> {
  const res = await post<ApiResponse<null>>('auth/reset-password', {
    token: resetToken,
    email,
    password,
    password_confirmation: passwordConfirmation,
    ...captchaBody(captcha),
  })

  if (res.status !== 'success') {
    throw new Error(res.message ?? translated('web.auth.reset_password_failed'))
  }
}

async function logout(): Promise<void> {
  if (logoutPromise) return logoutPromise

  sessionEpoch += 1
  setLogoutBarrier()
  isLoggingOut.value = true
  logoutPromise = (async () => {
    try {
      await post<ApiResponse<null>>('auth/logout')
    } catch {
      // Local teardown remains mandatory when server logout fails.
    } finally {
      clearAuth(true)
    }
  })()

  return logoutPromise
}

async function fetchMe(): Promise<User> {
  if (hasLogoutBarrier()) {
    throw new Error(translated('web.auth.fetch_user_failed'))
  }
  const epoch = sessionEpoch
  const res = await get<ApiResponse<User>>('auth/me')

  if (!isCurrentSession(epoch)) {
    throw new Error(translated('web.auth.fetch_user_failed'))
  }

  if (res.status === 'success' && res.data) {
    user.value = res.data
    return res.data
  }

  throw new Error(res.message ?? translated('web.auth.fetch_user_failed'))
}

/**
 * Post-login cookie-settle: GET auth/me once, retry once if the Set-Cookie
 * has not landed. Callers must not navigate until this returns true.
 */
async function confirmSession(): Promise<boolean> {
  const epoch = sessionEpoch
  try {
    await fetchMe()
    return isCurrentSession(epoch)
  } catch {
    if (!isCurrentSession(epoch)) return false
    try {
      await fetchMe()
      return isCurrentSession(epoch)
    } catch {
      return false
    }
  }
}

let hydrated = false

async function hydrate(): Promise<void> {
  if (hasLogoutBarrier()) return
  if (hydrated) return
  hydrated = true
  clearLeftoverTokenStorage()

  const epoch = sessionEpoch
  try {
    const res = await get<ApiResponse<User>>('auth/me')
    if (!isCurrentSession(epoch)) {
      user.value = null
      return
    }
    if (res.status === 'success' && res.data) {
      user.value = res.data
    }
  } catch {
    if (isCurrentSession(epoch)) {
      user.value = null
    }
  }
}

/**
 * Cold-boot: probe the session with GET auth/me (safe method, no CSRF), then
 * fan-in shell widgets via POST /batch only when a session exists. A guest
 * must not POST /batch — that mutation mints a CSRF nonce before the JWT
 * cookie exists and races the first authenticated batch after login.
 */
async function hydrateShell(): Promise<void> {
  if (hasLogoutBarrier()) return
  if (hydrated) return
  hydrated = true
  clearLeftoverTokenStorage()
  const epoch = sessionEpoch

  try {
    const res = await get<ApiResponse<User>>('auth/me')
    if (!isCurrentSession(epoch)) {
      user.value = null
      return
    }
    if (res.status === 'success' && res.data) {
      user.value = res.data
      const { hydrateShell: shellHydrate } = await import('@/composables/useShellHydrate')
      if (isCurrentSession(epoch)) {
        await shellHydrate()
      }
    }
  } catch {
    if (isCurrentSession(epoch)) {
      user.value = null
    }
  }
}

function hasPermission(permission: string): boolean {
  const perms = user.value?.permissions
  return Array.isArray(perms) && perms.includes(permission)
}

/**
 * Seed the in-memory user from a shell-hydrate batch payload. Unlike
 * applyAuth() this does not touch expiresAt/remember or reschedule refresh —
 * the session lifecycle stays owned by login/refresh; this only fills the
 * profile the batch already fetched.
 */
function setUser(u: User | null): void {
  if (isLoggingOut.value) {
    return
  }
  user.value = u
}

async function resendVerification(): Promise<void> {
  const res = await post<ApiResponse<null>>('auth/email/verification-notification')
  if (res.status !== 'success') {
    throw new Error(res.message ?? translated('web.auth.verification_resent_failed'))
  }
}

async function switchLocale(locale: string): Promise<void> {
  const res = await post<ApiResponse<{ locale: string }>>('auth/locale', { locale })
  if (res.status !== 'success') {
    throw new Error(res.message ?? translated('web.auth.locale_update_failed'))
  }
}
