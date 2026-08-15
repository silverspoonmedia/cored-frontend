import { batch } from '@/api/client'
import { bodyOf } from '@/api/batch'
import type {
  Service,
  ServiceOptions,
  ServicePurchase,
} from '@/api/types'

/**
 * Batch-hydrate for Service domain views.
 */

interface ServiceShowResult {
  service: Service | null
  options: ServiceOptions | null
}

interface ServicePurchaseShowResult {
  purchase: ServicePurchase | null
  options: ServiceOptions | null
}

async function hydrateServiceShow(serviceId: string): Promise<ServiceShowResult> {
  const [serviceRes, optionsRes] = await batch<unknown>([
    { path: `services/${serviceId}` },
    { path: 'services/options' },
  ])

  return {
    service: bodyOf<Service>(serviceRes)?.data ?? null,
    options: bodyOf<ServiceOptions>(optionsRes)?.data ?? null,
  }
}

async function hydratePurchaseShow(purchaseId: string): Promise<ServicePurchaseShowResult> {
  const [purchaseRes, optionsRes] = await batch<unknown>([
    { path: `service-purchases/${purchaseId}` },
    { path: 'services/options' },
  ])

  return {
    purchase: bodyOf<ServicePurchase>(purchaseRes)?.data ?? null,
    options: bodyOf<ServiceOptions>(optionsRes)?.data ?? null,
  }
}

export function useServicesHydrate() {
  return {
    hydrateServiceShow,
    hydratePurchaseShow,
  }
}
