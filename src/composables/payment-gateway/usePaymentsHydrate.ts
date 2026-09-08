import { batch } from '@/api/client'
import { bodyOf } from '@/api/batch'
import type {
  PaymentIncomeOverview,
  PaymentIncomeInvoicesPayload,
} from '@/api/types'

/**
 * Batch-hydrate for Payments income views.
 */

interface PaymentsIncomeResult {
  overview: PaymentIncomeOverview | null
  invoices: PaymentIncomeInvoicesPayload | null
}

async function hydrateIncome(params: Record<string, unknown> = {}): Promise<PaymentsIncomeResult> {
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') query[k] = String(v)
  }

  const [overviewRes, invoicesRes] = await batch<unknown>([
    { path: 'payments/income', query },
    { path: 'payments/income/invoices', query: { ...query, per_page: query.per_page ?? '20' } },
  ])

  return {
    overview: bodyOf<PaymentIncomeOverview>(overviewRes)?.data ?? null,
    invoices: bodyOf<PaymentIncomeInvoicesPayload>(invoicesRes)?.data ?? null,
  }
}

export function usePaymentsHydrate() {
  return {
    hydrateIncome,
  }
}
