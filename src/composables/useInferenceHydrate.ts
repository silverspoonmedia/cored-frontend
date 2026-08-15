import { batch } from '@/api/client'
import { bodyOf } from '@/api/batch'
import type {
  ApiResponse,
  PagedList,
  InferenceProvider,
  AiModelCard,
  AiModelCardDetail,
  InferenceUsageEvent,
  InferenceUsageOverview,
  InferenceUsageEventListPayload,
} from '@/api/types'

/**
 * Batch-hydrate for Inference domain views. Replaces the per-view
 * multi-fetch pattern with a single /api/v1/batch call.
 */

interface InferenceUsageEventsResult {
  overview: InferenceUsageOverview | null
  events: InferenceUsageEventListPayload | null
  modelCards: AiModelCard[] | null
}

interface InferenceProviderShowResult {
  provider: InferenceProvider | null
  modelCards: AiModelCard[] | null
}

interface InferenceModelCardShowResult {
  card: AiModelCardDetail | null
  events: InferenceUsageEventListPayload | null
}

function listData<T>(body: ApiResponse<T[] | PagedList<T>> | null): T[] | null {
  if (!body) return null
  if (Array.isArray(body.data)) return body.data
  if (body.data && typeof body.data === 'object' && 'items' in body.data && Array.isArray((body.data as PagedList<T>).items)) {
    return (body.data as PagedList<T>).items
  }
  return null
}

async function hydrateUsageEvents(params: Record<string, unknown> = {}): Promise<InferenceUsageEventsResult> {
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') query[k] = String(v)
  }

  const [overviewRes, eventsRes, modelCardsRes] = await batch<unknown>([
    { path: 'inference/usage/overview', query },
    { path: 'inference/usage-events', query: { ...query, per_page: query.per_page ?? '20' } },
    { path: 'inference/model-cards' },
  ])

  return {
    overview: bodyOf<InferenceUsageOverview>(overviewRes)?.data ?? null,
    events: bodyOf<InferenceUsageEventListPayload>(eventsRes)?.data ?? null,
    modelCards: listData(bodyOf<AiModelCard[]>(modelCardsRes)),
  }
}

async function hydrateProviderShow(providerId: string): Promise<InferenceProviderShowResult> {
  const [providerRes, modelCardsRes] = await batch<unknown>([
    { path: `inference/providers/${providerId}` },
    { path: 'inference/model-cards' },
  ])

  return {
    provider: bodyOf<InferenceProvider>(providerRes)?.data ?? null,
    modelCards: listData(bodyOf<AiModelCard[]>(modelCardsRes)),
  }
}

async function hydrateModelCardShow(cardId: string): Promise<InferenceModelCardShowResult> {
  const [cardRes, eventsRes] = await batch<unknown>([
    { path: `inference/model-cards/${cardId}` },
    { path: 'inference/usage-events', query: { model_card_id: cardId, per_page: '15' } },
  ])

  return {
    card: bodyOf<AiModelCardDetail>(cardRes)?.data ?? null,
    events: bodyOf<InferenceUsageEventListPayload>(eventsRes)?.data ?? null,
  }
}

export function useInferenceHydrate() {
  return {
    hydrateUsageEvents,
    hydrateProviderShow,
    hydrateModelCardShow,
  }
}
