<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue'
import RowActions from '@/components/RowActions.vue'
import { useVtualClaims } from '@/composables/vtual/useVtualClaims'
import { useAuth } from '@/stores/auth'
import { useAlert } from '@/composables/useAlert'
import { useEchoResync } from '@/composables/useEcho'
import type { ListParams } from '@/composables/useResource'
import type { QueryRowAction, VtualCreatorClaim } from '@/api/types'
import { confirmQueryMutate, mapQueryRowActions } from '@/utils/mapQueryRowActions'

/**
 * Claims hub — one screen, two audiences.
 *
 * `mine` is the actor's own pending claims (bio token present, owner-only
 * actions). `pending` is the staff moderation queue (claimant identity,
 * accept-anyway). The tab is gated on the same permission the endpoint and the
 * broadcast channel require, so a non-staff user never sees a tab that would
 * only 403.
 */
type ClaimsTab = 'mine' | 'pending'

const { t, locale } = useI18n()
const { hasPermission } = useAuth()
const { success: showSuccess, error: showError } = useAlert()
const claims = useVtualClaims()

const canModerate = computed(() => hasPermission('manage any vtual resource'))
const activeTab = ref<ClaimsTab>('mine')

const items = ref<VtualCreatorClaim[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const currentPage = ref(1)
const perPage = ref(10)
const total = ref(0)

const staffHandlers = { onClaimChanged: () => { void load({ page: 1, per_page: perPage.value }) } }

const columns = computed<DataTableColumn[]>(() => {
  const base: DataTableColumn[] = [
    { key: 'creator', label: t('web.vtual.claims.columns.creator'), sortable: false },
    { key: 'channel', label: t('web.vtual.claims.columns.channel'), sortable: false },
  ]

  if (activeTab.value === 'pending') {
    base.push({ key: 'claimant', label: t('web.vtual.claims.columns.claimant'), sortable: false })
  }

  base.push(
    { key: 'status', label: t('web.vtual.claims.columns.status'), sortable: false, align: 'center' },
    { key: 'created_at', label: t('web.vtual.claims.columns.submitted'), sortable: false },
  )

  return base
})

const emptyTitle = computed(() =>
  activeTab.value === 'pending'
    ? t('web.vtual.claims.datatable.empty_pending')
    : t('web.vtual.claims.datatable.empty_mine'),
)

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function statusVariant(status: string): string {
  switch (status) {
    case 'verified': return 'text-bg-success'
    case 'cancelled': return 'text-bg-secondary'
    case 'expired': return 'text-bg-warning'
    default: return 'text-bg-info'
  }
}

async function load(params?: ListParams): Promise<void> {
  loading.value = true
  loadError.value = null

  try {
    const page = params?.page ?? currentPage.value
    const size = params?.per_page ?? perPage.value
    const isStaffTab = activeTab.value === 'pending'
    const list = isStaffTab
      ? await claims.fetchPending({ page, per_page: size })
      : await claims.fetchMine({ page, per_page: size })

    items.value = list.items
    total.value = list.pagination.total
    currentPage.value = list.pagination.current_page
    perPage.value = list.pagination.per_page

    // Owner rows each get their own progress channel; staff rows ride the
    // queue ping instead (the payload is ids-only, so a ping means refetch).
    if (isStaffTab) {
      claims.releaseOwnerClaimChannels()
    } else {
      claims.syncOwnerClaimChannels(items.value.map((row) => row.id), () => {
        void load({ page: 1, per_page: perPage.value })
      })
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.vtual.claims.errors.load_failed')
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function switchTab(tab: ClaimsTab): void {
  if (tab === 'pending' && !canModerate.value) return
  if (activeTab.value === tab) return
  activeTab.value = tab
  items.value = []
  total.value = 0
  currentPage.value = 1
  void load({ page: 1, per_page: perPage.value })
}

function handlePage(page: number): void {
  void load({ page, per_page: perPage.value })
}

function handlePerPage(count: number): void {
  void load({ page: 1, per_page: count })
}

function claimActions(row: VtualCreatorClaim) {
  return mapQueryRowActions(row.actions ?? [], {
    verify: (action) => { void runAction(row, action) },
    cancel: (action) => { void runAction(row, action) },
    accept_anyway: (action) => { void runAction(row, action) },
  })
}

async function runAction(row: VtualCreatorClaim, action: QueryRowAction): Promise<void> {
  if (action.confirm && !(await confirmQueryMutate(action, t('actions.confirm')))) {
    return
  }

  try {
    await claims.runAction(action.key, row)
    showSuccess(t('web.vtual.claims.action_done'))
    await load({ page: currentPage.value, per_page: perPage.value })
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.vtual.claims.errors.action_failed'))
  }
}

onMounted(() => {
  void load({ page: 1, per_page: perPage.value })
  claims.subscribeStaffRealtime(staffHandlers)
})

onUnmounted(() => {
  claims.unsubscribeStaffRealtime(staffHandlers)
  claims.releaseOwnerClaimChannels()
})

// Socket-outage recovery: events missed during the gap are gone for good.
useEchoResync(() => { void load({ page: 1, per_page: perPage.value }) })
</script>

<template>
  <Card :title="t('web.vtual.claims.list_title')">
    <p class="text-muted small mb-3">{{ t('web.vtual.claims.subtitle') }}</p>

    <ul v-if="canModerate" class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'mine' }" @click="switchTab('mine')">
          {{ t('web.vtual.claims.tabs.mine') }}
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'pending' }" @click="switchTab('pending')">
          {{ t('web.vtual.claims.tabs.pending') }}
        </button>
      </li>
    </ul>

    <DataTable
      :columns="columns"
      :rows="items"
      :loading="loading"
      :error="loadError"
      :searchable="false"
      server
      :total="total"
      :page="currentPage"
      :per-page="perPage"
      empty-icon="bi-person-check"
      :empty-title="emptyTitle"
      @update:page="handlePage"
      @update:per-page="handlePerPage"
      @retry="load({ page: currentPage, per_page: perPage })"
    >
      <template #cell-creator="{ row }: { row: VtualCreatorClaim }">
        <span class="fw-semibold">{{ row.creator?.display_name ?? row.creator_id }}</span>
      </template>

      <template #cell-channel="{ row }: { row: VtualCreatorClaim }">
        <span v-if="row.channel">
          {{ row.channel.display_name }}
          <span class="text-muted small">{{ row.channel.platform?.name }}</span>
        </span>
        <span v-else class="text-muted">-</span>
      </template>

      <template #cell-claimant="{ row }: { row: VtualCreatorClaim }">
        <span v-if="row.user">{{ row.user.name }}</span>
        <span v-else class="text-muted">-</span>
      </template>

      <template #cell-status="{ row }: { row: VtualCreatorClaim }">
        <span class="badge" :class="statusVariant(row.status)">
          {{ t(`web.vtual.claims.status.${row.status}`) }}
        </span>
      </template>

      <template #cell-created_at="{ row }: { row: VtualCreatorClaim }">
        <span class="text-muted small">{{ formatDateTime(row.created_at) }}</span>
      </template>

      <template #actions="{ row }: { row: VtualCreatorClaim }">
        <RowActions :actions="claimActions(row)" />
      </template>
    </DataTable>
  </Card>
</template>
