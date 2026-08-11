import { ref, type Ref } from 'vue'
import { put } from '@/api/client'
import type { ApiResponse, ProviderModelRate } from '@/api/types'

export interface RateEntry {
  model_card_id: string
  input_per_million_usd: number
  output_per_million_usd: number
  model_card?: {
    id: string
    slug: string
    display_name: string | null
    is_active: boolean
  } | null
  _isNew?: boolean
  _removed?: boolean
}

export interface ModelCardOption {
  id: string
  slug: string
}

export function useRatePlanAdmin(providerId: Ref<string>) {
  const entries = ref<RateEntry[]>([])
  const modelCards = ref<ModelCardOption[]>([])
  const saving = ref(false)
  const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast(message: string, type: 'success' | 'error' = 'success'): void {
    toast.value = { message, type }
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.value = null
    }, 4000)
  }

  function initRates(rates: ProviderModelRate[]): void {
    entries.value = rates.map((r) => ({
      model_card_id: r.model_card_id,
      input_per_million_usd: r.input_per_million_usd,
      output_per_million_usd: r.output_per_million_usd,
      model_card: r.model_card,
      _isNew: false,
    }))
  }

  function setModelCards(cards: ModelCardOption[]): void {
    modelCards.value = cards
  }

  function addEntry(): void {
    const first = modelCards.value[0]
    if (!first) return
    entries.value.push({
      model_card_id: first.id,
      input_per_million_usd: 0,
      output_per_million_usd: 0,
      _isNew: true,
    })
  }

  function removeEntry(idx: number): void {
    entries.value.splice(idx, 1)
  }

  async function saveRates(): Promise<boolean> {
    if (saving.value) return false
    saving.value = true
    toast.value = null

    try {
      const rates = entries.value.map((e) => ({
        model_card_id: e.model_card_id,
        input_per_million_usd: Number(e.input_per_million_usd) || 0,
        output_per_million_usd: Number(e.output_per_million_usd) || 0,
      }))

      const res = await put<ApiResponse<null>>(
        `inference/providers/${providerId.value}/rates`,
        { rates },
      )

      if (res.status === 'success') {
        showToast(res.message ?? 'Saved', 'success')
        entries.value.forEach((e) => { e._isNew = false })
        return true
      } else {
        showToast(res.message ?? 'Save failed', 'error')
        return false
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error')
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    entries,
    modelCards,
    saving,
    toast,
    initRates,
    setModelCards,
    addEntry,
    removeEntry,
    saveRates,
    showToast,
  }
}
