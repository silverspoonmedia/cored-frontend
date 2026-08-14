import { onMounted, type Ref } from 'vue'
import type { ListPagination } from '@/api/types'
import type { ListParams } from '@/composables/useResource'

export function useServerDataTable(
  fetchList: (params?: ListParams) => Promise<unknown>,
  pagination: Ref<ListPagination>,
  extra?: () => ListParams,
) {
  function extraParams(): ListParams {
    return extra ? extra() : {}
  }

  function load(overrides: ListParams = {}): Promise<unknown> {
    return fetchList({
      page: pagination.value.current_page || 1,
      per_page: pagination.value.per_page || 10,
      ...extraParams(),
      ...overrides,
    })
  }

  function onPage(page: number): void {
    void load({ page })
  }

  function onPerPage(perPage: number): void {
    void load({ page: 1, per_page: perPage })
  }

  function onSearch(search: string): void {
    void load({ page: 1, search })
  }

  onMounted(() => {
    void load({ page: 1, per_page: 10 })
  })

  return { load, onPage, onPerPage, onSearch }
}
