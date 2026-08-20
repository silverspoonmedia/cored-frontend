import { ref, computed } from 'vue'
import i18n from '@/i18n'
import { post, get, setRefreshHandler, setUnauthorizedHandler } from '@/api/client'
import { clearCsrf } from '@/api/csrf'
import type { ApiResponse, AuthPayload, LoginResult, TwoFactorChallengePayload, User } from '@/api/types'

const STORAGE_KEY = 'mw_auth'

type AuthChannelMessage =
  | { type: 'refresh-request'; id: string }
  | { type: 'refresh-response' }
  | { type: 'refresh-done'; ok: boolean; user?: User; expiresAt?: number; remember?: boolean }
  | { type: 'logout' }

const user = ref<User | null>(null)
const expiresAt = ref<number | null>(null)
const remember = ref(false)
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const isAuthenticated = computed(() => !!user.value)
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
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('monolith-auth') : null

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
        user.value = null
        expiresAt.value = null
        remember.value = false
        if (refreshTimer) {
          clearTimeout(refreshTimer)
          refreshTimer = null
        }
        // Session nonce died with the session; drop it here too (the tab that
        // initiated logout already cleared + broadcast its own clear).
        clearCsrf()
        break
    }
  }
}

function applyAuth(payload: AuthPayload): void {
  user.value = payload.user
  expiresAt.value = Date.now() + payload.expires_in * 1000
  remember.value = payload.remember
  scheduleRefresh()
}

function clearAuth(): void {
  user.value = null
  expiresAt.value = null
  clearCsrf()
  remember.value = false
  clearLeftoverTokenStorage()
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  // Reset shell/router hydration so the next login re-bootstraps from a clean
  // state. Dynamic imports avoid a circular dep (router imports this store).
  void import('@/composables/useShellHydrate').then((m) => m.resetShellHydration())
  void import('@/router').then((m) => m.resetRouterHydration())
  broadcast({ type: 'logout' })
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
  if (authChannel) {
    pendingRequestId = generateId()
    shouldYield = false
    broadcast({ type: 'refresh-request', id: pendingRequestId })

    await new Promise((resolve) => setTimeout(resolve, 50))

    if (shouldYield) {
      const result = await new Promise<boolean>((resolve) => {
        waitingResolvers.push(resolve)
        setTimeout(() => resolve(false), 10_000)
      })
      pendingRequestId = null
      return result
    }

    isRefreshing = true
    try {
      const res = await post<ApiResponse<AuthPayload>>('auth/refresh', {
        remember: remember.value,
      })
      if (res.status === 'success' && res.data?.user && typeof res.data.expires_in === 'number') {
        applyAuth(res.data)
        const expiresAtMs = Date.now() + res.data.expires_in * 1000
        broadcast({
          type: 'refresh-done',
          ok: true,
          user: res.data.user,
          expiresAt: expiresAtMs,
          remember: res.data.remember,
        })
        return true
      }
      broadcast({ type: 'refresh-done', ok: false })
      return false
    } catch {
      broadcast({ type: 'refresh-done', ok: false })
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
  clearAuth()
  if (wasAuth && typeof window !== 'undefined' && window.location.pathname !== '/login') {
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
    hydrate,
    hydrateShell,
    hasPermission,
    resendVerification,
    switchLocale,
    setUser,
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
  try {
    await post<ApiResponse<null>>('auth/logout')
  } catch {
    // Cookie expire is Worker-side; still clear local state.
  }
  clearAuth()
}

async function fetchMe(): Promise<User> {
  const res = await get<ApiResponse<User>>('auth/me')

  if (res.status === 'success' && res.data) {
    user.value = res.data
    return res.data
  }

  throw new Error(res.message ?? translated('web.auth.fetch_user_failed'))
}

let hydrated = false

async function hydrate(): Promise<void> {
  if (hydrated) return
  hydrated = true
  clearLeftoverTokenStorage()

  try {
    const res = await get<ApiResponse<User>>('auth/me')
    if (res.status === 'success' && res.data) {
      user.value = res.data
    }
  } catch {
    user.value = null
  }
}

/**
 * Cold-boot hydrate via the shell batch — one Worker invocation covers
 * auth/me + nav trees + notification bell. Falls back to the legacy
 * single-fetch hydrate when the batch itself fails.
 */
async function hydrateShell(): Promise<void> {
  if (hydrated) return
  const { hydrateShell: shellHydrate } = await import('@/composables/useShellHydrate')
  await shellHydrate()
  hydrated = true
  clearLeftoverTokenStorage()
}

function hasPermission(permission: string): boolean {
  if (!user.value) return false
  return user.value.permissions.includes(permission)
}

/**
 * Seed the in-memory user from a shell-hydrate batch payload. Unlike
 * applyAuth() this does not touch expiresAt/remember or reschedule refresh —
 * the session lifecycle stays owned by login/refresh; this only fills the
 * profile the batch already fetched.
 */
function setUser(u: User | null): void {
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
