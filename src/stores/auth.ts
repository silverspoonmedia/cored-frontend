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

const token = ref<string | null>(null)
const user = ref<User | null>(null)
const expiresAt = ref<number | null>(null)
const remember = ref(false)
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const isAuthenticated = computed(() => !!token.value)

function storage(): Storage | null {
  try {
    return remember.value ? localStorage : sessionStorage
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
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

function applyAuth(payload: AuthPayload): void {
  token.value = payload.token
  user.value = payload.user
  expiresAt.value = Date.now() + payload.expires_in * 1000
  remember.value = payload.remember
  persist()
  scheduleRefresh()
}

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
    refreshToken().catch(() => {
      clearAuth()
    })
  }, msUntilRefresh)
}

async function refreshToken(): Promise<string | null> {
  if (!token.value) return null

  try {
    const res = await post<ApiResponse<AuthPayload>>('auth/refresh', {})
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
  token: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  const res = await post<ApiResponse<null>>('auth/reset-password', {
    token,
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
    const raw = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY)
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
