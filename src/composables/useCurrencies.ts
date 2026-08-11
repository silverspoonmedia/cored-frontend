import { ref } from 'vue'
import { get, put } from '@/api/client'
import { useAlert } from '@/composables/useAlert'
import type { ApiResponse, Currency } from '@/api/types'

const currencies = ref<Currency[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const updating = ref<Set<string>>(new Set())
let loaded = false
let fetchPromise: Promise<void> | null = null

async function load(force = false): Promise<void> {
  if ((loaded || fetchPromise) && !force) return fetchPromise ?? Promise.resolve()

  loading.value = true
  error.value = null

  fetchPromise = (async () => {
    try {
      const res = await get<ApiResponse<Currency[]>>('currencies')
      if (res.status === 'success' && Array.isArray(res.data)) {
        currencies.value = res.data
        loaded = true
      } else {
        error.value = res.message ?? 'Failed to load currencies'
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load currencies'
    } finally {
      loading.value = false
      fetchPromise = null
    }
  })()

  return fetchPromise
}

async function refetch(): Promise<void> {
  loaded = false
  fetchPromise = null
  return load()
}

function setUpdating(code: string, on: boolean): void {
  const next = new Set(updating.value)
  if (on) next.add(code)
  else next.delete(code)
  updating.value = next
}

async function toggleActive(code: string, currentActive: boolean): Promise<void> {
  const { error: showError, success: showSuccess } = useAlert()
  setUpdating(code, true)
  try {
    const res = await put<ApiResponse<Currency>>(`currencies/${code}`, {
      is_active: !currentActive,
    })
    if (res.status === 'success' && res.data) {
      const updated = res.data
      const idx = currencies.value.findIndex((c) => c.code === updated.code)
      if (idx !== -1) {
        const next = [...currencies.value]
        next[idx] = updated
        currencies.value = next
      }
      showSuccess(`Currency ${updated.is_active ? 'activated' : 'deactivated'}.`)
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to update currency')
  } finally {
    setUpdating(code, false)
  }
}

async function setSettlement(code: string): Promise<void> {
  const { error: showError, success: showSuccess } = useAlert()
  setUpdating(code, true)
  try {
    const res = await put<ApiResponse<Currency>>(`currencies/${code}`, {
      is_settlement: true,
    })
    if (res.status === 'success' && res.data) {
      const updated = res.data
      currencies.value = currencies.value.map((c) => ({
        ...c,
        is_settlement: c.code === updated.code ? true : false,
      }))
      showSuccess(`${updated.code} set as settlement currency.`)
    }
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to set settlement currency')
  } finally {
    setUpdating(code, false)
  }
}

export function useCurrencies() {
  return {
    currencies,
    loading,
    error,
    updating,
    load,
    refetch,
    toggleActive,
    setSettlement,
  }
}
