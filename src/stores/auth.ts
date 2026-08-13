import { ref, computed } from 'vue'
import { post, get, setTokenGetter, setRefreshHandler, setUnauthorizedHandler } from '@/api/client'
import type { ApiResponse, AuthPayload, LoginResult, TwoFactorChallengePayload, User } from '@/api/types'

const STORAGE_KEY = 'mw_auth'

interface StoredAuth {
  token: string
  user: User
  expiresAt: number
  remember: boolean
}

type AuthChannelMessage =
  | { type: 'refresh-request'; id: string }
  | { type: 'refresh-response' }
  | { type: 'refresh-done'; token: string | null; user?: User; expiresAt?: number; remember?: boolean }
  | { type: 'logout' }

const token = ref<string | null>(null)
const user = ref<User | null>(null)
const expiresAt = ref<number | null>(null)
const remember = ref(false)
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const isAuthenticated = computed(() => !!token.value)

// B1: Always use localStorage. Remember flag only affects TTL, not storage location.
function storage(): Storage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

function persist(): void {
  if (!token.value || !user.value || !expiresAt.value) return
  const store = storage()
  if (!store) return
  const payload: StoredAuth = {
    token: token.value,
    user: user.value,
    expiresAt: expiresAt.value,
    remember: remember.value,
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota errors
  }
}

function clearStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY) // backward compat: clean up old per-tab sessions
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// --- Cross-tab coordination (B2 + B3 + B4) ---

const authChannel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('monolith-auth') : null

let isRefreshing = false
let pendingRequestId: string | null = null
let shouldYield = false
let waitingResolvers: Array<(token: string | null) => void> = []
let authRefreshPromise: Promise<string | null> | null = null

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
        if (data.token && data.user && data.expiresAt) {
          token.value = data.token
          user.value = data.user
          expiresAt.value = data.expiresAt
          remember.value = data.remember ?? false
          scheduleRefresh()
        }
        waitingResolvers.forEach((resolve) => resolve(data.token ?? null))
        waitingResolvers = []
        break

      case 'logout':
        token.value = null
        user.value = null
        expiresAt.value = null
        remember.value = false
        if (refreshTimer) {
          clearTimeout(refreshTimer)
          refreshTimer = null
        }
        break
    }
  }
}

// B2: storage event listener for cross-tab token sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return

    if (e.newValue === null) {
      token.value = null
      user.value = null
      expiresAt.value = null
      remember.value = false
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
      }
      return
    }

    try {
      const stored = JSON.parse(e.newValue) as StoredAuth
      token.value = stored.token
      user.value = stored.user
      expiresAt.value = stored.expiresAt
      remember.value = stored.remember
      scheduleRefresh()
    } catch {
      // ignore malformed
    }
  })
}

// --- Core auth functions ---

function applyAuth(payload: AuthPayload): void {
  token.value = payload.token
  user.value = payload.user
  expiresAt.value = Date.now() + payload.expires_in * 1000
  remember.value = payload.remember
  persist()
  scheduleRefresh()
}

// B4: clearAuth broadcasts logout so other tabs also clear
function clearAuth(): void {
  token.value = null
  user.value = null
  expiresAt.value = null
  remember.value = false
  clearStorage()
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  broadcast({ type: 'logout' })
}

function scheduleRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  if (!expiresAt.value || !token.value) return

  const msUntilRefresh = expiresAt.value - Date.now() - 60_000
  if (msUntilRefresh <= 0) return

  refreshTimer = setTimeout(() => {
    refreshToken()
      .then((newToken) => {
        if (!newToken) clearAuth()
      })
      .catch(() => {
        clearAuth()
      })
  }, msUntilRefresh)
}

// B3: Coordinated refresh via BroadcastChannel — only one tab refreshes; others wait
async function refreshToken(): Promise<string | null> {
  if (!token.value) return null

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

async function doRefresh(): Promise<string | null> {
  if (authChannel) {
    pendingRequestId = generateId()
    shouldYield = false
    broadcast({ type: 'refresh-request', id: pendingRequestId })

    await new Promise((resolve) => setTimeout(resolve, 50))

    if (shouldYield) {
      const result = await new Promise<string | null>((resolve) => {
        waitingResolvers.push(resolve)
        setTimeout(() => resolve(null), 10_000)
      })
      pendingRequestId = null
      return result
    }

    isRefreshing = true
    try {
      const res = await post<ApiResponse<AuthPayload>>('auth/refresh', {
        remember: remember.value,
      })
      if (res.status === 'success' && res.data) {
        applyAuth(res.data)
        const expiresAtMs = Date.now() + res.data.expires_in * 1000
        broadcast({
          type: 'refresh-done',
          token: res.data.token,
          user: res.data.user,
          expiresAt: expiresAtMs,
          remember: res.data.remember,
        })
        return res.data.token
      }
      broadcast({ type: 'refresh-done', token: null })
      return null
    } catch {
      broadcast({ type: 'refresh-done', token: null })
      return null
    } finally {
      isRefreshing = false
      pendingRequestId = null
    }
  }

  try {
    const res = await post<ApiResponse<AuthPayload>>('auth/refresh', {
      remember: remember.value,
    })
    if (res.status === 'success' && res.data) {
      applyAuth(res.data)
      return res.data.token
    }
    return null
  } catch {
    return null
  }
}

// Wire auth state into the API client's interceptors.
setTokenGetter(() => token.value)
setRefreshHandler(refreshToken)
setUnauthorizedHandler(() => {
  clearAuth()
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
})

export function useAuth() {
  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    forgotPassword,
    resetPassword,
    verifyTwoFactor,
    logout,
    fetchMe,
    hydrate,
    hasPermission,
    resendVerification,
    switchLocale,
  }
}

async function login(email: string, password: string, rememberMe: boolean): Promise<LoginResult> {
  const res = await post<ApiResponse<AuthPayload | TwoFactorChallengePayload>>('auth/login', {
    email,
    password,
    remember_me: rememberMe,
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

  throw new Error(res.message ?? 'Login failed')
}

async function verifyTwoFactor(twoFactorToken: string, code: string): Promise<User> {
  const res = await post<ApiResponse<AuthPayload>>('auth/two-factor/login', {
    two_factor_token: twoFactorToken,
    code,
  })

  if (res.status === 'success' && res.data) {
    applyAuth(res.data)
    return res.data.user
  }

  throw new Error(res.message ?? 'Two-factor verification failed')
}

async function register(name: string, email: string, password: string, passwordConfirmation: string): Promise<User> {
  const res = await post<ApiResponse<AuthPayload>>('auth/register', {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  })

  if (res.status === 'success' && res.data) {
    applyAuth(res.data)
    return res.data.user
  }

  throw new Error(res.message ?? 'Registration failed')
}

async function forgotPassword(email: string): Promise<void> {
  const res = await post<ApiResponse<null>>('auth/forgot-password', { email })

  if (res.status !== 'success') {
    throw new Error(res.message ?? 'Failed to send reset link')
  }
}

async function resetPassword(
  resetToken: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  const res = await post<ApiResponse<null>>('auth/reset-password', {
    token: resetToken,
    email,
    password,
    password_confirmation: passwordConfirmation,
  })

  if (res.status !== 'success') {
    throw new Error(res.message ?? 'Failed to reset password')
  }
}

async function logout(): Promise<void> {
  try {
    await post<ApiResponse<null>>('auth/logout')
  } catch {
    // Even if logout API fails, clear local state.
  }
  clearAuth()
}

async function fetchMe(): Promise<User> {
  const res = await get<ApiResponse<User>>('auth/me')

  if (res.status === 'success' && res.data) {
    user.value = res.data
    persist()
    return res.data
  }

  throw new Error(res.message ?? 'Failed to fetch user')
}

let hydrated = false

async function hydrate(): Promise<void> {
  if (hydrated) return
  hydrated = true

  let stored: StoredAuth | null = null

  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
    if (raw) stored = JSON.parse(raw) as StoredAuth
  } catch {
    stored = null
  }

  if (!stored) return

  const now = Date.now()
  if (stored.expiresAt <= now) {
    token.value = stored.token
    remember.value = stored.remember
    const newToken = await refreshToken()
    if (!newToken) {
      clearAuth()
    }
    return
  }

  token.value = stored.token
  user.value = stored.user
  expiresAt.value = stored.expiresAt
  remember.value = stored.remember
  scheduleRefresh()
}

function hasPermission(permission: string): boolean {
  if (!user.value) return false
  return user.value.permissions.includes(permission)
}

async function resendVerification(): Promise<void> {
  const res = await post<ApiResponse<null>>('auth/email/verification-notification')
  if (res.status !== 'success') {
    throw new Error(res.message ?? 'Failed to send verification email')
  }
}

async function switchLocale(locale: string): Promise<void> {
  const res = await post<ApiResponse<{ locale: string }>>('auth/locale', { locale })
  if (res.status !== 'success') {
    throw new Error(res.message ?? 'Failed to update locale')
  }
}
