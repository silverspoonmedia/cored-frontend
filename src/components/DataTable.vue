<script lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import EmptyState from '@/components/EmptyState.vue'

export interface DataTableColumn {
  key: string
  label: string
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
  headerClass?: string
  cellClass?: string
}

type SortDirection = 'asc' | 'desc'

const PER_PAGE_OPTIONS = [10, 25, 50, 100]
const SEARCH_DEBOUNCE_MS = 300
</script>

<script setup lang="ts" generic="T">
const props = withDefaults(defineProps<{
  columns: DataTableColumn[]
  rows: T[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  perPage?: number
  emptyIcon?: string
  emptyTitle?: string
  emptyMessage?: string
  server?: boolean
  total?: number
  page?: number
}>(), {
  loading: false,
  searchable: true,
  perPage: 10,
  emptyIcon: 'bi-inbox',
  emptyMessage: '',
  server: false,
  total: 0,
  page: 1,
})

const { t } = useI18n()

const resolvedSearchPlaceholder = computed(() => props.searchPlaceholder || t('ui.datatable.search_placeholder'))
const resolvedEmptyTitle = computed(() => props.emptyTitle || t('ui.datatable.empty_title'))

const emit = defineEmits<{
  (e: 'row-click', row: T): void
  (e: 'update:page', page: number): void
  (e: 'update:perPage', perPage: number): void
  (e: 'update:search', search: string): void
}>()

const search = ref('')
const sortKey = ref<string | null>(null)
const sortDir = ref<SortDirection>('asc')
const page = ref(props.page)
const perPage = ref(props.perPage)
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.perPage, (v) => { perPage.value = v })
watch(() => props.page, (v) => { page.value = v })

const filtered = computed<T[]>(() => {
  if (props.server) return props.rows
  if (!search.value.trim()) return props.rows
  const q = search.value.toLowerCase().trim()
  return props.rows.filter((row) =>
    props.columns.some((col) => {
      const val = getVal(row, col.key)
      if (val === null || val === undefined) return false
      return String(val).toLowerCase().includes(q)
    }),
  )
})

const sorted = computed<T[]>(() => {
  if (!sortKey.value) return filtered.value
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...filtered.value].sort((a, b) => {
    const av = getVal(a, key)
    const bv = getVal(b, key)
    if (av === bv) return 0
    if (av === null || av === undefined) return 1
    if (bv === null || bv === undefined) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
})

const total = computed(() => props.server ? props.total : filtered.value.length)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

const paged = computed<T[]>(() => {
  if (props.server) return sorted.value
  const start = (page.value - 1) * perPage.value
  return sorted.value.slice(start, start + perPage.value)
})

const from = computed(() => total.value === 0 ? 0 : (page.value - 1) * perPage.value + 1)
const to = computed(() => Math.min(page.value * perPage.value, total.value))

watch([sortKey, sortDir, perPage], () => {
  if (!props.server) page.value = 1
})

watch(search, (value) => {
  if (!props.server) {
    page.value = 1
    return
  }
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    emit('update:search', value)
  }, SEARCH_DEBOUNCE_MS)
})

function toggleSort(col: DataTableColumn): void {
  if (!col.sortable) return
  if (sortKey.value === col.key) {
    if (sortDir.value === 'asc') {
      sortDir.value = 'desc'
    } else {
      sortKey.value = null
    }
  } else {
    sortKey.value = col.key
    sortDir.value = 'asc'
  }
}

function changePage(p: number): void {
  if (p < 1 || p > totalPages.value) return
  if (props.server) {
    emit('update:page', p)
    return
  }
  page.value = p
}

function changePerPage(n: number): void {
  perPage.value = n
  if (props.server) {
    emit('update:perPage', n)
  }
}

const pageNumbers = computed<number[]>(() => {
  const max = totalPages.value
  const cur = page.value
  if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1)
  if (cur <= 4) return [1, 2, 3, 4, 5, 0, max]
  if (cur >= max - 3) return [1, 0, max - 4, max - 3, max - 2, max - 1, max]
  return [1, 0, cur - 1, cur, cur + 1, 0, max]
})

const alignClass = (col: DataTableColumn): string => {
  if (col.align === 'center') return 'text-center'
  if (col.align === 'end') return 'text-end'
  return ''
}

function getVal(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}
</script>

<template>
  <div class="data-table-wrapper">
    <!-- Toolbar -->
    <div v-if="searchable || $slots.toolbar" class="d-flex flex-wrap gap-2 align-items-center mb-3">
      <div v-if="searchable" class="input-group input-group-sm" style="max-width: 280px;">
        <span class="input-group-text bg-transparent">
          <i class="bi bi-search" aria-hidden="true"></i>
        </span>
        <input
          v-model="search"
          type="text"
          class="form-control"
          :placeholder="resolvedSearchPlaceholder"
          :disabled="loading"
        >
        <button v-if="search" class="btn btn-outline-secondary" type="button" @click="search = ''">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>
      <div v-if="$slots.toolbar" class="ms-auto d-flex gap-2">
        <slot name="toolbar" />
      </div>
    </div>

    <!-- Table -->
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[col.headerClass, alignClass(col), col.sortable ? 'cursor-pointer user-select-none' : '']"
              @click="toggleSort(col)"
            >
              <span class="d-inline-flex align-items-center gap-1">
                {{ col.label }}
                <template v-if="col.sortable">
                  <i v-if="sortKey === col.key && sortDir === 'asc'" class="bi bi-caret-up-fill small" aria-hidden="true"></i>
                  <i v-else-if="sortKey === col.key && sortDir === 'desc'" class="bi bi-caret-down-fill small" aria-hidden="true"></i>
                  <i v-else class="bi bi-arrow-down-up small text-muted" aria-hidden="true"></i>
                </template>
              </span>
            </th>
            <th v-if="$slots.actions" class="text-end" style="width: 1%;">{{ t('ui.labels.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="i in 5" :key="`skel-${i}`">
              <td v-for="col in columns" :key="col.key">
                <span class="placeholder col-8"></span>
              </td>
              <td v-if="$slots.actions"><span class="placeholder col-4"></span></td>
            </tr>
          </template>
          <!-- Empty -->
          <tr v-else-if="paged.length === 0">
            <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="p-0">
              <EmptyState :icon="emptyIcon" :title="resolvedEmptyTitle" :message="emptyMessage" />
            </td>
          </tr>
          <!-- Rows -->
          <template v-else>
            <tr
              v-for="(row, index) in paged"
              :key="index"
              @click="$emit('row-click', row)"
            >
              <td v-for="col in columns" :key="col.key" :class="[col.cellClass, alignClass(col)]">
                <slot :name="`cell-${col.key}`" :row="row" :value="getVal(row, col.key)">
                  {{ getVal(row, col.key) }}
                </slot>
              </td>
              <td v-if="$slots.actions" class="text-end text-nowrap">
                <slot name="actions" :row="row" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div v-if="!loading && total > 0" class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
      <div class="text-muted small">
        {{ t('ui.datatable.info', { from, to, total }) }}
      </div>
      <div class="d-flex align-items-center gap-2">
        <select :value="perPage" class="form-select form-select-sm" style="width: auto;" @change="changePerPage(Number(($event.target as HTMLSelectElement).value))">
          <option v-for="opt in PER_PAGE_OPTIONS" :key="opt" :value="opt">{{ t('ui.datatable.per_page', { n: opt }) }}</option>
        </select>
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: page === 1 }">
              <a class="page-link" href="#" @click.prevent="changePage(page - 1)">
                <i class="bi bi-chevron-left" aria-hidden="true"></i>
              </a>
            </li>
            <li
              v-for="(p, i) in pageNumbers"
              :key="i"
              class="page-item"
              :class="{ active: p === page, disabled: p === 0 }"
            >
              <a v-if="p === 0" class="page-link" href="#" @click.prevent>…</a>
              <a v-else class="page-link" href="#" @click.prevent="changePage(p)">{{ p }}</a>
            </li>
            <li class="page-item" :class="{ disabled: page === totalPages }">
              <a class="page-link" href="#" @click.prevent="changePage(page + 1)">
                <i class="bi bi-chevron-right" aria-hidden="true"></i>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
</template>
