import { getEcho } from '@/composables/useEcho'

export type AdminRealtimeHandlers = {
  onProductActivationChanged?: (payload: { product_key: string; action: string; user_id: string | null }) => void
  onDomainVisibilityChanged?: (payload: { product_key: string; visibility: string }) => void
  onRbacChanged?: (payload: { action: string; role_id: string | null; user_id: string | null }) => void
}

const handlerSet = new Set<AdminRealtimeHandlers>()
const activeChannels = new Set<string>()

function ensureChannels(): void {
  const echo = getEcho()
  if (!echo) return

  const wanted = ['product-activations', 'domain-access', 'rbac']

  for (const channel of wanted) {
    if (activeChannels.has(channel)) continue
    try {
      const ch = echo.private(channel)
      if (channel === 'product-activations') {
        ch.listen('.product.activation.changed', (e: { product_key: string; action: string; user_id: string | null }) => {
          for (const h of handlerSet) h.onProductActivationChanged?.(e)
        })
      } else if (channel === 'domain-access') {
        ch.listen('.domain.visibility.changed', (e: { product_key: string; visibility: string }) => {
          for (const h of handlerSet) h.onDomainVisibilityChanged?.(e)
        })
      } else if (channel === 'rbac') {
        ch.listen('.rbac.role.permission.changed', (e: { action: string; role_id: string | null; user_id: string | null }) => {
          for (const h of handlerSet) h.onRbacChanged?.(e)
        })
      }
      activeChannels.add(channel)
    } catch {
      // ignore
    }
  }
}

function maybeLeave(): void {
  if (handlerSet.size > 0) return
  const echo = getEcho()
  if (!echo) return
  for (const channel of activeChannels) {
    try {
      echo.leave(channel)
    } catch {
      // ignore
    }
  }
  activeChannels.clear()
}

export function subscribeAdminRealtime(handlers: AdminRealtimeHandlers): void {
  handlerSet.add(handlers)
  ensureChannels()
}

export function unsubscribeAdminRealtime(handlers: AdminRealtimeHandlers): void {
  handlerSet.delete(handlers)
  maybeLeave()
}

export function useAdminRealtime() {
  return {
    subscribe: subscribeAdminRealtime,
    unsubscribe: unsubscribeAdminRealtime,
  }
}
