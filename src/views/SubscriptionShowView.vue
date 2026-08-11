<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import { useSubscriptions } from '@/composables/useSubscriptions'
import { useAlert } from '@/composables/useAlert'
import type { Subscription } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { fetchOne } = useSubscriptions()
const { error: showError } = useAlert()

const subscription = ref<Subscription | null>(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    subscription.value = await fetchOne(route.params.id as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Failed to load subscription')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="text-center py-4">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading…</span>
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
        Edit
      </button>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="router.push({ name: 'subscriptions.index.view' })"
      >
        Back to List
      </button>
    </template>

    <dl class="row mb-0">
      <dt class="col-sm-3">Subscriber Name</dt>
      <dd class="col-sm-9">{{ subscription.subscriber_name ?? '—' }}</dd>

      <dt class="col-sm-3">Subscriber Email</dt>
      <dd class="col-sm-9">{{ subscription.subscriber_email ?? '—' }}</dd>

      <dt class="col-sm-3">Subscriber Phone</dt>
      <dd class="col-sm-9">{{ subscription.subscriber_phone ?? '—' }}</dd>

      <dt class="col-sm-3">Plan Name</dt>
      <dd class="col-sm-9">{{ subscription.plan_name ?? '—' }}</dd>

      <dt class="col-sm-3">Plan Description</dt>
      <dd class="col-sm-9">{{ subscription.plan_description ?? '—' }}</dd>

      <dt class="col-sm-3">Billing Cycle</dt>
      <dd class="col-sm-9">{{ subscription.billing_cycle ?? '—' }}</dd>

      <dt class="col-sm-3">Amount</dt>
      <dd class="col-sm-9">{{ subscription.amount_formatted ?? subscription.amount }}</dd>

      <dt class="col-sm-3">Status</dt>
      <dd class="col-sm-9">
        <span class="badge text-bg-light border">{{ subscription.status }}</span>
      </dd>

      <dt class="col-sm-3">Auto Renew</dt>
      <dd class="col-sm-9">{{ subscription.auto_renew ? 'Yes' : 'No' }}</dd>

      <dt class="col-sm-3">Started At</dt>
      <dd class="col-sm-9">{{ subscription.started_at_formatted ?? subscription.started_at ?? '—' }}</dd>

      <dt class="col-sm-3">Expires At</dt>
      <dd class="col-sm-9">{{ subscription.expires_at_formatted ?? subscription.expires_at ?? '—' }}</dd>

      <dt class="col-sm-3">Trial Ends At</dt>
      <dd class="col-sm-9">{{ subscription.trial_ends_at_formatted ?? subscription.trial_ends_at ?? '—' }}</dd>

      <dt class="col-sm-3">Created At</dt>
      <dd class="col-sm-9">{{ subscription.created_at_formatted ?? subscription.created_at ?? '—' }}</dd>
    </dl>
  </Card>
</template>
