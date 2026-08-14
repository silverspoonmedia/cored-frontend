import { useResource } from '@/composables/useResource'
import type { PaymentGateway } from '@/api/types'

export function usePaymentGateways() {
  const base = useResource<PaymentGateway>('payment-gateways')
  return {
    items: base.items,
    pagination: base.pagination,
    loading: base.loading,
    error: base.error,
    fetchList: base.fetchList,
    fetchOne: base.fetchOne,
    create: base.create,
    update: base.update,
    destroy: base.destroy,
  }
}
