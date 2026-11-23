// Payload shapes of the Microstock product domain. Moved out of `src/api/types.ts`
// so a fork that deletes `src/features/microstock` leaves no product type behind.
// Cross-feature shapes (a file carries its microstock metadata) stay here and are
// imported by the Archivd feature, never the other way round.

import type { QueryRowAction } from '@/api/types'

// --- Microstock Usage ---
export interface MicrostockCredential {
  actions?: QueryRowAction[]
  id: string
  marketplace: string
  label: string
  /** pending | verified | failed — set by the upload job, not by the owner. */
  status?: string | null
  last_error?: string | null
  last_used_at?: string | null
  last_verified_at?: string | null
  created_at: string | null
}

export interface MicrostockBillingSummary {
  balance_micro_usd: number
  balance_usd: string
  estimated_per_analysis_micro_usd: number
  estimated_per_analysis_usd: string
  daily_free?: {
    enabled: boolean
    limit: number
    used: number
    remaining: number
    resets_at: string | null
  }
}

export interface MicrostockLedgerEntry {
  id: string
  created_at: string | null
  created_at_formatted: string | null
  description: string
  amount: number
  amount_formatted: string
  balance: number
  balance_formatted: string
}

export interface MicrostockUsageEvent {
  id: string
  created_at: string | null
  created_at_formatted: string | null
  file_name: string | null
  stage: string | null
  resolved_model: string | null
  total_tokens: number
  billable_usd: string
  billing_source: string | null
}

export interface MicrostockPlatformOverview {
  period: { from: string | null; to: string | null }
  totals: {
    event_count: number
    unique_users: number
    total_tokens: number
    provider_cost_micro_usd: number
    provider_cost_usd: string
    billable_micro_usd: number
    billable_usd: string
    margin_micro_usd: number
    margin_usd: string
  }
  by_billing_source: Record<string, {
    event_count: number
    provider_cost_usd: string
    billable_usd: string
  }>
  by_stage: Array<{
    stage: string
    event_count: number
    provider_cost_usd: string
    billable_usd: string
  }>
  by_model: Array<{
    resolved_model: string
    event_count: number
    total_tokens: number
    provider_cost_usd: string
    billable_usd: string
  }>
  credits: {
    outstanding_balance_micro_usd: number
    outstanding_balance_usd: string
    purchase_volume_micro_usd: number
    purchase_volume_usd: string
    debit_volume_micro_usd: number
    debit_volume_usd: string
  }
  daily_free: {
    enabled: boolean
    users_active_today: number
    slots_consumed_today: number
    subsidized_provider_cost_usd: string
  }
}

// --- Collection + asset payloads ---
export interface MicrostockCollectionPayload {
  id: string
  collection_status: string | null
  collection_hint: string | null
  collection_billing_mode: string | null
  collection_locked: boolean
}

export interface MicrostockCollectionStatusPayload {
  status: string
  phase: string | null
  billing_tier: string | null
  hint: string | null
  csv_path: string | null
  total: number
  processed: number
  finalized: number
  failed: number
}

export interface MicrostockCollectionExportPayload {
  path: string
  count: number
}

export interface MicrostockMarketplaceUpload {
  id: string
  marketplace: string
  /** queued | uploading | uploaded | failed */
  status: string | null
  remote_path: string | null
  file_count: number
  byte_count: number
  error: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string | null
}

export interface MicrostockSlotStatus {
  activated: boolean
  used: number
  limit: number
  can_create: boolean
}

export interface MicrostockAssetStages {
  vision: string
  thinking: string
  result: string
}

export interface MicrostockAssetMetadata {
  id: string
  file_id: string
  filename?: string | null
  title: string | null
  keywords: string[]
  description: string | null
  category: string | null
  status: string | null
  stages: MicrostockAssetStages
  error: string | null
  created_at: string | null
  updated_at: string | null
}

