import { batch } from '@/api/client'
import { bodyOfOrThrow } from '@/api/batch'
import type {
  MicrostockBillingSummary,
  MicrostockLedgerEntry,
  MicrostockPlatformOverview,
  MicrostockAssetMetadata,
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
    billing: bodyOfOrThrow<MicrostockBillingSummary>(billingRes)?.data ?? null,
    ledger: bodyOfOrThrow<{ items: MicrostockLedgerEntry[]; pagination: { has_more: boolean } }>(ledgerRes)?.data ?? null,
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
    overview: bodyOfOrThrow<MicrostockPlatformOverview>(overviewRes)?.data ?? null,
    usageEvents: bodyOfOrThrow<InferenceUsageEventListPayload>(eventsRes)?.data ?? null,
  }
}

interface MicrostockReviewAssetResult {
  metadata: MicrostockAssetMetadata | null
  download: { url: string; expires_at: string } | null
}

async function hydrateReviewAsset(
  fileId: string,
  downloadCtx: Record<string, unknown> = {},
): Promise<MicrostockReviewAssetResult> {
  const [metadataRes, downloadRes] = await batch<unknown>([
    { path: `microstock/assets/${fileId}/metadata` },
    { path: `file-hosting/files/${fileId}/download`, query: { preview: 1, ...downloadCtx } },
  ])

  return {
    metadata: bodyOfOrThrow<MicrostockAssetMetadata>(metadataRes)?.data ?? null,
    download: bodyOfOrThrow<{ url: string; expires_at: string }>(downloadRes)?.data ?? null,
  }
}

export function useMicrostockHydrate() {
  return {
    hydrateUsage,
    hydratePlatform,
    hydrateReviewAsset,
  }
}
