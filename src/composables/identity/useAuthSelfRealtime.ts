import { listenPersonalChannel, subscribeWhenEchoReady, onEchoResync } from '@/composables/useEcho'

/**
 * Personal-channel auth/security live updates (`App.Models.User.{id}`).
 *
 * Backend fires `.auth.state.changed` (login/logout/2FA challenge) and
 * `.auth.security.changed` (password changed, 2FA enabled/disabled) on the
 * same private channel as the notification bell — which is ref-counted in
 * useEcho.ts (listenPersonalChannel), so neither consumer can leave the
 * channel out from under the other. Handlers let self-service views
 * (password, 2FA) react — e.g. refresh `me` so the 2FA badge and session
 * state stay true across tabs.
 *
 * Refetch, not patch: handlers almost always call fetchMe().
 */
export type AuthSelfRealtimeHandlers = {
  onAuthStateChanged?: (payload: { action: string; login_method?: string }) => void
  onSecurityStateChanged?: (payload: { action: string; method?: string }) => void
}

const handlerSet = new Set<AuthSelfRealtimeHandlers>()
let detachChannel: (() => void) | null = null
let unsubscribeResync: (() => void) | null = null

function ensureChannel(): boolean {
  if (detachChannel !== null) return true

  detachChannel = listenPersonalChannel({
    '.auth.state.changed': (raw) => {
      const e = raw as { action: string; login_method?: string }
      for (const h of handlerSet) h.onAuthStateChanged?.(e)
    },
    '.auth.security.changed': (raw) => {
      const e = raw as { action: string; method?: string }
      for (const h of handlerSet) h.onSecurityStateChanged?.(e)
    },
  })

  // Socket outage recovery: re-pull self state once reconnected.
  unsubscribeResync = onEchoResync(() => {
    for (const h of handlerSet) h.onSecurityStateChanged?.({ action: 'resync' })
  })

  return true
}

function maybeLeave(): void {
  if (handlerSet.size > 0) return
  detachChannel?.()
  detachChannel = null
  unsubscribeResync?.()
  unsubscribeResync = null
}

export function subscribeAuthSelfRealtime(handlers: AuthSelfRealtimeHandlers): void {
  handlerSet.add(handlers)
  subscribeWhenEchoReady(ensureChannel)
}

export function unsubscribeAuthSelfRealtime(handlers: AuthSelfRealtimeHandlers): void {
  handlerSet.delete(handlers)
  maybeLeave()
}

export function useAuthSelfRealtime() {
  return {
    subscribe: subscribeAuthSelfRealtime,
    unsubscribe: unsubscribeAuthSelfRealtime,
  }
}
