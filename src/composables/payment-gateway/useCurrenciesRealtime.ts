import { getEcho, subscribeWhenEchoReady } from '@/composables/useEcho'

export type CurrencyRealtimeHandlers = {
  onCurrencyChanged?: (payload: { action: string; currency_code: string | null }) => void
}

const handlerSet = new Set<CurrencyRealtimeHandlers>()
let channelActive = false

function ensureChannel(): boolean {
  if (channelActive) return true
  const echo = getEcho()
  if (!echo) return false
  try {
    const ch = echo.private('settings.currencies')
    ch.listen('.service.currency.changed', (e: { action: string; currency_code: string | null }) => {
      for (const h of handlerSet) h.onCurrencyChanged?.(e)
    })
    channelActive = true
    return true
  } catch {
    return false
  }
}

function maybeLeave(): void {
  if (handlerSet.size > 0) return
  if (!channelActive) return
  const echo = getEcho()
  if (echo) {
    try {
      echo.leave('settings.currencies')
    } catch {
      // ignore
    }
  }
  channelActive = false
}

export function subscribeCurrenciesRealtime(handlers: CurrencyRealtimeHandlers): boolean {
  handlerSet.add(handlers)
  subscribeWhenEchoReady(ensureChannel)
  return channelActive
}

export function unsubscribeCurrenciesRealtime(handlers: CurrencyRealtimeHandlers): void {
  handlerSet.delete(handlers)
  maybeLeave()
}

export function useCurrenciesRealtime() {
  return {
    subscribe: subscribeCurrenciesRealtime,
    unsubscribe: unsubscribeCurrenciesRealtime,
  }
}
