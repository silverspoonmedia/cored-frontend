<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import { useSubscriptions } from '@/composables/useSubscriptions'
import { useAlert } from '@/composables/useAlert'
import type { Subscription } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { fetchOne } = useSubscriptions()
const { error: showError } = useAlert()
const { t } = useI18n()

const subscription = ref<Subscription | null>(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    subscription.value = await fetchOne(route.params.id as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.payments.subscriptions.failed_load'))
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">{{ t('ui.loading') }}</span>
    </div>
  </div>

  <Card
    v-else-if="subscription"
    :title="`Subscription #${subscription.subscription_number ?? subscription.id}`"
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
        <span class="badge text-bg-light border">{{ subscription.status }}</span>
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
