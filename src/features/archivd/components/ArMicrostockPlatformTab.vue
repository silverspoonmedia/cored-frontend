<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import TableEmptyRow from '@/components/TableEmptyRow.vue'
import type { InferenceUsageEvent } from '@/api/types'
import type { MicrostockPlatformOverview } from '@/features/microstock/types'

/**
 * Platform admin tab for ArchivdMicrostockUsageView: overview totals,
 * by-source/stage/model breakdown cards, and the paginated events table.
 */
defineProps<{
  loading: boolean
  error: string | null
  overview: MicrostockPlatformOverview | null
  events: InferenceUsageEvent[]
  eventsLoading: boolean
  eventsError: string | null
  eventsHasMore: boolean
}>()

const emit = defineEmits<{
  retryOverview: []
  loadMoreEvents: []
}>()

const { t, locale } = useI18n()

const formatNumber = (value: number): string => new Intl.NumberFormat(locale.value).format(value)
</script>

<template>
  <div>
    <div v-if="loading" class="py-2">
      <SkeletonBlock variant="block" height="6rem" />
    </div>
    <ErrorState
      v-else-if="error"
      :message="error"
      @retry="emit('retryOverview')"
    />

    <template v-else-if="overview">
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.microstock.usage.col_provider_cost') }}</div>
            <div class="fs-5 fw-bold">{{ overview.totals.provider_cost_usd }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.microstock.usage.col_billable') }}</div>
            <div class="fs-5 fw-bold">{{ overview.totals.billable_usd }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.microstock.usage.col_margin') }}</div>
            <div class="fs-5 fw-bold">{{ overview.totals.margin_usd }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.microstock.usage.col_events') }}</div>
            <div class="fs-5 fw-bold">{{ formatNumber(overview.totals.event_count) }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.microstock.usage.col_users') }}</div>
            <div class="fs-5 fw-bold">{{ formatNumber(overview.totals.unique_users) }}</div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="border rounded p-3 text-center">
            <div class="text-muted small">{{ t('web.microstock.usage.col_daily_free_cost') }}</div>
            <div class="fs-5 fw-bold">{{ overview.daily_free.subsidized_provider_cost_usd }}</div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <Card :title="t('web.microstock.usage.by_source')">
            <table class="table table-sm mb-0">
              <tbody>
                <tr v-for="(row, source) in overview.by_billing_source" :key="source">
                  <td class="small">{{ source }}</td>
                  <td class="text-end small">{{ row.event_count }}</td>
                  <td class="text-end small">{{ row.billable_usd }}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
        <div class="col-md-4">
          <Card :title="t('web.microstock.usage.by_stage')">
            <table class="table table-sm mb-0">
              <tbody>
                <tr v-for="row in overview.by_stage" :key="row.stage">
                  <td class="small">{{ row.stage }}</td>
                  <td class="text-end small">{{ row.event_count }}</td>
                  <td class="text-end small">{{ row.billable_usd }}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
        <div class="col-md-4">
          <Card :title="t('web.microstock.usage.by_model')">
            <table class="table table-sm mb-0">
              <tbody>
                <tr v-for="row in overview.by_model" :key="row.resolved_model">
                  <td class="small"><code>{{ row.resolved_model }}</code></td>
                  <td class="text-end small">{{ row.event_count }}</td>
                  <td class="text-end small">{{ formatNumber(row.total_tokens) }}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      <Card :title="t('web.microstock.usage.all_usage_events')">
        <div v-if="eventsLoading" class="py-2">
          <div v-for="i in 5" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
            <SkeletonBlock variant="line" :lines="1" width="50%" class="mb-0" />
            <SkeletonBlock variant="line" :lines="1" width="5rem" class="ms-auto mb-0" />
          </div>
        </div>
        <ErrorState
          v-else-if="eventsError"
          :message="eventsError"
          @retry="emit('loadMoreEvents')"
        />
        <div v-else>
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{{ t('web.microstock.usage.col_date') }}</th>
                  <th>{{ t('web.microstock.usage.col_user') }}</th>
                  <th>{{ t('web.microstock.usage.col_file') }}</th>
                  <th>{{ t('web.microstock.usage.col_stage') }}</th>
                  <th class="text-end">{{ t('web.microstock.usage.col_provider_cost') }}</th>
                  <th class="text-end">{{ t('web.microstock.usage.col_cost') }}</th>
                  <th>{{ t('web.microstock.usage.col_source') }}</th>
                </tr>
              </thead>
              <tbody>
                <TableEmptyRow
                  v-if="events.length === 0"
                  :colspan="7"
                  icon="bi-graph-up"
                  :title="t('web.microstock.usage.no_events')"
                />
                <tr v-for="ev in events" :key="ev.id">
                  <td class="small">{{ ev.created_at ?? '—' }}</td>
                  <td class="small">{{ ev.user?.name ?? '—' }}</td>
                  <td class="small">{{ ev.file_name ?? '—' }}</td>
                  <td class="small">{{ ev.stage ?? '—' }}</td>
                  <td class="text-end small">{{ ev.provider_cost_usd }}</td>
                  <td class="text-end small">{{ ev.billable_usd }}</td>
                  <td class="small">{{ ev.billing_source ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="eventsHasMore" class="text-center mt-3">
            <button class="btn btn-outline-primary btn-sm" @click="emit('loadMoreEvents')">{{ t('web.microstock.usage.load_more') }}</button>
          </div>
        </div>
      </Card>
    </template>
  </div>
</template>
