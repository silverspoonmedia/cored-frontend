<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useSubscriptions } from '@/composables/service/useSubscriptions'
import { usePaymentRealtime } from '@/composables/payment-gateway/usePaymentRealtime'
import { useDetailLoader } from '@/composables/useDetailLoader'
import { useBreadcrumbTitle } from '@/composables/useBreadcrumbs'
import { useEchoResync } from '@/composables/useEcho'
import { SUBSCRIPTION_STATUS_BADGE } from '@/utils/statusBadge'

const route = useRoute()
const router = useRouter()
const { fetchOne } = useSubscriptions()
const { t } = useI18n()

const { data: subscription, loading, error: loadError, load } = useDetailLoader(
  () => fetchOne(route.params.id as string),
  { fallbackMessage: t('web.payments.subscriptions.failed_load') },
)

// Trailing breadcrumb crumb: the loaded subscription's number, so the crumb
// reads `Subscriptions / <number>` instead of exposing the uuid route param.
useBreadcrumbTitle(() => subscription.value?.subscription_number ?? null)

// Live update: this subscription row edited/deleted elsewhere reloads it.
const { subscribeSubscriptionList, unsubscribeSubscriptionList } = usePaymentRealtime()
const realtimeHandlers = () => { void load() }

onMounted(() => {
  subscribeSubscriptionList(realtimeHandlers)
})

onUnmounted(() => {
  unsubscribeSubscriptionList(realtimeHandlers)
})

useEchoResync(() => { void load() })
</script>

<template>
  <div v-if="loading" class="card">
    <div class="card-body">
      <SkeletonBlock variant="line" :lines="1" width="35%" />
      <SkeletonBlock variant="line" :lines="6" />
    </div>
  </div>

  <ErrorState v-else-if="loadError" :message="loadError" @retry="load" />

  <Card
    v-else-if="subscription"
    :title="t('web.payments.subscriptions.show_card_title', { number: subscription.subscription_number ?? subscription.id })"
  >
    <template #actions>
      <button
        class="btn btn-primary btn-sm"
        @click="router.push({ name: 'subscriptions.edit.view', params: { id: subscription.id } })"
      >
        {{ t('actions.edit') }}
      </button>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.push({ name: 'subscriptions.index.view' })"
      >
        {{ t('web.payments.subscriptions.back_to_list') }}
      </button>
    </template>

    <dl class="row mb-0">
      <dt class="col-sm-3">{{ t('web.payments.subscriptions.subscriber_name') }}</dt>
      <dd class="col-sm-9">{{ subscription.subscriber_name ?? '—' }}</dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.subscriber_email') }}</dt>
      <dd class="col-sm-9">{{ subscription.subscriber_email ?? '—' }}</dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.subscriber_phone') }}</dt>
      <dd class="col-sm-9">{{ subscription.subscriber_phone ?? '—' }}</dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.plan_name') }}</dt>
      <dd class="col-sm-9">{{ subscription.plan_name ?? '—' }}</dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.plan_description') }}</dt>
      <dd class="col-sm-9">{{ subscription.plan_description ?? '—' }}</dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.billing_cycle') }}</dt>
      <dd class="col-sm-9">{{ subscription.billing_cycle ?? '—' }}</dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.amount') }}</dt>
      <dd class="col-sm-9">{{ subscription.amount_formatted ?? subscription.amount }}</dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.status') }}</dt>
      <dd class="col-sm-9">
        <StatusBadge :status="subscription.status" :mapping="SUBSCRIPTION_STATUS_BADGE" fallback="warning" />
      </dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.auto_renew') }}</dt>
      <dd class="col-sm-9">{{ subscription.auto_renew ? t('web.currencies.yes') : t('web.currencies.no') }}</dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.started_at') }}</dt>
      <dd class="col-sm-9">{{ subscription.started_at_formatted ?? subscription.started_at ?? '—' }}</dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.expires_at') }}</dt>
      <dd class="col-sm-9">{{ subscription.expires_at_formatted ?? subscription.expires_at ?? '—' }}</dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.trial_ends_at') }}</dt>
      <dd class="col-sm-9">{{ subscription.trial_ends_at_formatted ?? subscription.trial_ends_at ?? '—' }}</dd>

      <dt class="col-sm-3">{{ t('web.payments.subscriptions.created_at') }}</dt>
      <dd class="col-sm-9">{{ subscription.created_at_formatted ?? subscription.created_at ?? '—' }}</dd>
    </dl>
  </Card>
</template>
