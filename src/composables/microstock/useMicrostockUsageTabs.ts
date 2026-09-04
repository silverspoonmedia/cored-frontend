/**
 * Billing/ledger/usage/platform-tab state for FileHostingMicrostockUsageView.
 *
 * Extracted from the view: paginated loaders with load-more, tab switching,
 * realtime rebinding, and the hydrate-first billing/platform fan-out.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMicrostockBilling } from '@/composables/microstock/useMicrostockBilling'
import { useMicrostockHydrate } from '@/composables/microstock/useMicrostockHydrate'
import { useFileHostingRealtime } from '@/composables/file-hosting/useFileHostingRealtime'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import type {
  MicrostockBillingSummary,
  MicrostockLedgerEntry,
  MicrostockUsageEvent,
  MicrostockPlatformOverview,
  InferenceUsageEvent,
} from '@/api/types'

export function useMicrostockUsageTabs() {
  const { t } = useI18n()
  const { fetchBilling, fetchLedger, fetchUsageEvents, fetchAdminOverview, fetchAdminUsageEvents } =
    useMicrostockBilling()
  const { hydrateUsage, hydratePlatform } = useMicrostockHydrate()
  const { hasPermission } = useAuth()
  const { error: showError } = useAlert()
  const { subscribe, unsubscribe } = useFileHostingRealtime()

  const canViewPlatform = computed(() => hasPermission('view platform billing'))

  const activeTab = ref<'ledger' | 'usage' | 'platform'>('ledger')

  const billing = ref<MicrostockBillingSummary | null>(null)
  const ledger = ref<MicrostockLedgerEntry[]>([])
  const usageEvents = ref<MicrostockUsageEvent[]>([])
  const platformOverview = ref<MicrostockPlatformOverview | null>(null)
  const platformEvents = ref<InferenceUsageEvent[]>([])

  const loading = ref(false)
  const billingError = ref<string | null>(null)
  const ledgerLoading = ref(false)
  const ledgerError = ref<string | null>(null)
  const usageLoading = ref(false)
  const usageError = ref<string | null>(null)
  const platformLoading = ref(false)
  const platformError = ref<string | null>(null)
  const platformEventsLoading = ref(false)
  const platformEventsError = ref<string | null>(null)

  const ledgerHasMore = ref(false)
  const usageHasMore = ref(false)
  const platformEventsHasMore = ref(false)

  const ledgerPage = ref(1)
  const usagePage = ref(1)
  const platformEventsPage = ref(1)

  async function loadBilling(): Promise<void> {
    loading.value = true
    billingError.value = null
    try {
      const batchResult = await hydrateUsage({ per_page: 20 }).catch(() => null)
      if (batchResult?.billing) {
        billing.value = batchResult.billing
        if (batchResult.ledger) {
          ledger.value = batchResult.ledger.items
          ledgerHasMore.value = batchResult.ledger.pagination.has_more
        }
      } else {
        billing.value = await fetchBilling()
      }
    } catch (e) {
      billingError.value = e instanceof Error ? e.message : t('web.microstock.usage.load_failed_billing')
    } finally {
      loading.value = false
    }
  }

  async function loadLedger(reset = true): Promise<void> {
    if (reset) {
      ledgerPage.value = 1
      ledger.value = []
      ledgerLoading.value = true
      ledgerError.value = null
    } else {
      ledgerPage.value++
    }

    try {
      const res = await fetchLedger({ page: ledgerPage.value, per_page: 20 })
      if (reset) {
        ledger.value = res.items
      } else {
        ledger.value.push(...res.items)
      }
      ledgerHasMore.value = res.pagination.has_more
    } catch (e) {
      const message = e instanceof Error ? e.message : t('web.microstock.usage.load_failed_ledger')
      if (reset) {
        ledgerError.value = message
      } else {
        showError(message)
      }
    } finally {
      ledgerLoading.value = false
    }
  }

  async function loadUsage(reset = true): Promise<void> {
    if (reset) {
      usagePage.value = 1
      usageEvents.value = []
      usageLoading.value = true
      usageError.value = null
    } else {
      usagePage.value++
    }

    try {
      const res = await fetchUsageEvents({ page: usagePage.value, per_page: 20 })
      if (reset) {
        usageEvents.value = res.items
      } else {
        usageEvents.value.push(...res.items)
      }
      usageHasMore.value = res.pagination.has_more
    } catch (e) {
      const message = e instanceof Error ? e.message : t('web.microstock.usage.load_failed_usage')
      if (reset) {
        usageError.value = message
      } else {
        showError(message)
      }
    } finally {
      usageLoading.value = false
    }
  }

  async function loadPlatform(): Promise<void> {
    platformLoading.value = true
    platformError.value = null
    try {
      const batchResult = await hydratePlatform({ per_page: 20 }).catch(() => null)
      if (batchResult?.overview) {
        platformOverview.value = batchResult.overview
        if (batchResult.usageEvents) {
          platformEvents.value = batchResult.usageEvents.items
          platformEventsHasMore.value = batchResult.usageEvents.pagination.has_more
        }
      } else {
        platformOverview.value = await fetchAdminOverview()
      }
    } catch (e) {
      platformError.value = e instanceof Error ? e.message : t('web.microstock.usage.load_failed_platform')
    } finally {
      platformLoading.value = false
    }
  }

  async function loadPlatformEvents(reset = true): Promise<void> {
    if (reset) {
      platformEventsPage.value = 1
      platformEvents.value = []
      platformEventsLoading.value = true
      platformEventsError.value = null
    } else {
      platformEventsPage.value++
    }

    try {
      const res = await fetchAdminUsageEvents({ page: platformEventsPage.value, per_page: 20 })
      if (reset) {
        platformEvents.value = res.items
      } else {
        platformEvents.value.push(...res.items)
      }
      platformEventsHasMore.value = res.pagination.has_more
    } catch (e) {
      const message = e instanceof Error ? e.message : t('web.microstock.usage.load_failed_platform_events')
      if (reset) {
        platformEventsError.value = message
      } else {
        showError(message)
      }
    } finally {
      platformEventsLoading.value = false
    }
  }

  const msHandlers = {
    onCollectionAnalysisProgress: () => {
      loadBilling()
      loadLedger(true)
    },
    onAssetMetadataProgress: () => {
      loadBilling()
      loadLedger(true)
    },
    onMicrostockBillingChanged: () => {
      loadBilling()
      loadLedger(true)
    },
  }

  onMounted(async () => {
    await loadBilling()
    if (ledger.value.length === 0 && !ledgerHasMore.value) {
      await loadLedger(true)
    }
    subscribe(msHandlers)
  })

  onUnmounted(() => {
    unsubscribe(msHandlers)
  })

  async function switchTab(tab: 'ledger' | 'usage' | 'platform'): Promise<void> {
    activeTab.value = tab
    if (tab === 'usage' && usageEvents.value.length === 0) {
      await loadUsage(true)
    } else if (tab === 'platform' && canViewPlatform.value && !platformOverview.value) {
      await loadPlatform()
      if (platformEvents.value.length === 0 && !platformEventsHasMore.value) {
        await loadPlatformEvents(true)
      }
    }
  }

  return {
    canViewPlatform,
    activeTab,
    billing,
    ledger,
    usageEvents,
    platformOverview,
    platformEvents,
    loading,
    billingError,
    ledgerLoading,
    ledgerError,
    usageLoading,
    usageError,
    platformLoading,
    platformError,
    platformEventsLoading,
    platformEventsError,
    ledgerHasMore,
    usageHasMore,
    platformEventsHasMore,
    loadBilling,
    loadLedger,
    loadUsage,
    loadPlatform,
    loadPlatformEvents,
    switchTab,
  }
}
