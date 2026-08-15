import { batch } from '@/api/client'
import { bodyOf } from '@/api/batch'
import type {
  MicrostockBillingSummary,
  MicrostockLedgerEntry,
  MicrostockUsageEvent,
  MicrostockPlatformOverview,
  InferenceUsageEventListPayload,
} from '@/api/types'

/**
 * Batch-hydrate for Microstock billing views. Replaces the sequential
 * billing → ledger → usage-events chain with one /api/v1/batch call.
 */

interface MicrostockUsageResult {
  billing: MicrostockBillingSummary | null
  ledger: { items: MicrostockLedgerEntry[]; pagination: { has_more: boolean } } | null
}

interface MicrostockUsageEventsResult {
  usageEvents: { items: MicrostockUsageEvent[]; pagination: { has_more: boolean } } | null
}

interface MicrostockPlatformResult {
  overview: MicrostockPlatformOverview | null
  usageEvents: InferenceUsageEventListPayload | null
}

async function hydrateUsage(params: { page?: number; per_page?: number } = {}): Promise<MicrostockUsageResult> {
  const query: Record<string, string> = {}
  if (params.page) query.page = String(params.page)
  if (params.per_page) query.per_page = String(params.per_page)

  const [billingRes, ledgerRes] = await batch<unknown>([
    { path: 'microstock/billing' },
    { path: 'microstock/billing/ledger', query },
  ])

  return {
    billing: bodyOf<MicrostockBillingSummary>(billingRes)?.data ?? null,
    ledger: bodyOf<{ items: MicrostockLedgerEntry[]; pagination: { has_more: boolean } }>(ledgerRes)?.data ?? null,
  }
}

async function hydrateUsageEvents(params: { page?: number; per_page?: number } = {}): Promise<MicrostockUsageEventsResult> {
  const query: Record<string, string> = {}
  if (params.page) query.page = String(params.page)
  if (params.per_page) query.per_page = String(params.per_page)

  const [usageRes] = await batch<unknown>([
    { path: 'microstock/billing/usage-events', query },
  ])

  return {
    usageEvents: bodyOf<{ items: MicrostockUsageEvent[]; pagination: { has_more: boolean } }>(usageRes)?.data ?? null,
  }
}

async function hydratePlatform(params: { page?: number; per_page?: number } = {}): Promise<MicrostockPlatformResult> {
  const query: Record<string, string> = {}
  if (params.page) query.page = String(params.page)
  if (params.per_page) query.per_page = String(params.per_page)

  const [overviewRes, eventsRes] = await batch<unknown>([
    { path: 'admin/microstock/billing/overview' },
    { path: 'admin/microstock/billing/usage-events', query },
  ])

  return {
    overview: bodyOf<MicrostockPlatformOverview>(overviewRes)?.data ?? null,
    usageEvents: bodyOf<InferenceUsageEventListPayload>(eventsRes)?.data ?? null,
  }
}

export function useMicrostockHydrate() {
  return {
    hydrateUsage,
    hydrateUsageEvents,
    hydratePlatform,
  }
}
