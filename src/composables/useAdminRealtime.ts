import { createRealtimeChannel, type RealtimeEvent } from '@/composables/echo/realtimeChannel'

export type AdminRealtimeHandlers = {
  onProductActivationChanged?: (payload: { product_key: string; action: string; user_id: string | null }) => void
  onDomainVisibilityChanged?: (payload: { product_key: string; visibility: string }) => void
  onRbacChanged?: (payload: { action: string; role_id: string | null; user_id: string | null }) => void
  onUserListChanged?: (payload: { action: string; user_id: string | null }) => void
  onRoleListChanged?: (payload: { action: string; role_id: string | null }) => void
}

// One event per admin channel, one ref-counted channel per entry. The previous
// hand-rolled version tracked its joins in a module-level Set that had to be
// cleared on the last unsubscribe; the registry derives that from ref-counts.
const EVENTS_BY_CHANNEL: Record<string, RealtimeEvent<AdminRealtimeHandlers>> = {
  'product-activations': {
    event: '.product.activation.changed',
    handle: (handlers, payload: { product_key: string; action: string; user_id: string | null }) => {
      for (const h of handlers) h.onProductActivationChanged?.(payload)
    },
  },
  'domain-access': {
    event: '.domain.visibility.changed',
    handle: (handlers, payload: { product_key: string; visibility: string }) => {
      for (const h of handlers) h.onDomainVisibilityChanged?.(payload)
    },
  },
  rbac: {
    event: '.rbac.role.permission.changed',
    handle: (handlers, payload: { action: string; role_id: string | null; user_id: string | null }) => {
      for (const h of handlers) h.onRbacChanged?.(payload)
    },
  },
  'rbac.users': {
    event: '.rbac.user.list.changed',
    handle: (handlers, payload: { action: string; user_id: string | null }) => {
      for (const h of handlers) h.onUserListChanged?.(payload)
    },
  },
  'rbac.roles': {
    event: '.rbac.role.list.changed',
    handle: (handlers, payload: { action: string; role_id: string | null }) => {
      for (const h of handlers) h.onRoleListChanged?.(payload)
    },
  },
}

const channels = Object.entries(EVENTS_BY_CHANNEL).map(([name, event]) =>
  createRealtimeChannel<AdminRealtimeHandlers>({ channel: name, events: [event] }),
)

export function subscribeAdminRealtime(handlers: AdminRealtimeHandlers): void {
  for (const channel of channels) channel.subscribe(handlers)
}

export function unsubscribeAdminRealtime(handlers: AdminRealtimeHandlers): void {
  for (const channel of channels) channel.unsubscribe(handlers)
}

export function useAdminRealtime() {
  return {
    subscribe: subscribeAdminRealtime,
    unsubscribe: unsubscribeAdminRealtime,
  }
}
