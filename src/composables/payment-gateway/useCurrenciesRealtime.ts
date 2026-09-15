import { createRealtimeChannel } from '@/composables/echo/realtimeChannel'

export type CurrencyRealtimeHandlers = {
  onCurrencyChanged?: (payload: { action: string; currency_code: string | null }) => void
}

const channel = createRealtimeChannel<CurrencyRealtimeHandlers>({
  channel: 'settings.currencies',
  events: [
    {
      event: '.service.currency.changed',
      handle: (handlers, payload: { action: string; currency_code: string | null }) => {
        for (const h of handlers) h.onCurrencyChanged?.(payload)
      },
    },
  ],
})

export function subscribeCurrenciesRealtime(handlers: CurrencyRealtimeHandlers): boolean {
  return channel.subscribe(handlers)
}

export function unsubscribeCurrenciesRealtime(handlers: CurrencyRealtimeHandlers): void {
  channel.unsubscribe(handlers)
}

export function useCurrenciesRealtime() {
  return {
    subscribe: subscribeCurrenciesRealtime,
    unsubscribe: unsubscribeCurrenciesRealtime,
  }
}
