<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVtualPublic } from '@/valkivid3/composables/useVtualPublic'
import type { VtualPublicContent, VtualPublicDirectoryPagination } from '@/api/types'
import VkStr1VideoCard from '@/valkivid3/components/str1/VkStr1VideoCard.vue'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'

const { t } = useI18n()
const { fetchContents } = useVtualPublic()

const items = ref<VtualPublicContent[]>([])
const pagination = ref<VtualPublicDirectoryPagination | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const page = ref(1)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const res = await fetchContents(page.value)
    items.value = res.items
    pagination.value = res.pagination
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    items.value = []
    pagination.value = null
  } finally {
    loading.value = false
  }
}

watch(page, () => {
  void load()
})

onMounted(() => {
  void load()
})

function goTo(delta: number): void {
  if (!pagination.value) {
    return
  }
  const next = page.value + delta
  if (next < 1 || next > pagination.value.last_page) {
    return
  }
  page.value = next
}
</script>

<template>
  <section id="contents" class="pb-20 md:pb-24 lg:pb-[130px]">
    <div class="container">
      <h2
        class="mb-10 text-2.5xl font-bold tracking-tighter text-gray-900 before:text-accent before:content-['.'] dark:text-white sm:text-3.5xl md:mb-12 md:text-4xl lg:mb-16 lg:text-[62px] lg:leading-none"
      >
        {{ t('web.vtual.public.contents.heading') }}
      </h2>

      <div v-if="loading" class="mb-7.5 grid grid-cols-12 gap-5 md:gap-6 lg:gap-7.5" aria-hidden="true">
        <div v-for="n in 6" :key="n" class="col-span-full animate-pulse sm:col-span-6 lg:col-span-4">
          <div class="mb-5 aspect-[370/215] w-full bg-gray-200 dark:bg-gray-800"></div>
          <div class="flex gap-x-3">
            <div class="h-12 w-12 shrink-0 self-start rounded-full bg-gray-200 dark:bg-gray-800"></div>
            <div class="min-w-0 flex-1 space-y-2">
              <div class="h-4 w-5/6 bg-gray-200 dark:bg-gray-800"></div>
              <div class="h-3 w-1/3 bg-gray-200 dark:bg-gray-800"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="error" class="py-16 text-center text-danger">
        {{ t('web.vtual.public.contents.error') }}
      </div>

      <p v-else-if="items.length === 0" class="py-16 text-center text-gray-500">
        {{ t('web.vtual.public.contents.empty') }}
      </p>

      <template v-else>
        <div class="mb-7.5 grid grid-cols-12 gap-5 md:gap-6 lg:gap-7.5">
          <VkStr1VideoCard
            v-for="(item, index) in items"
            :key="`${item.type ?? 'content'}:${item.url ?? item.title ?? index}`"
            :item="item"
            show-creator
          />
        </div>

        <div v-if="pagination && pagination.last_page > 1" class="flex items-center justify-center gap-x-4">
          <button
            type="button"
            class="flex aspect-square w-10 items-center justify-center bg-gray-150 text-gray-900 transition-colors hover:bg-accent hover:text-white disabled:opacity-30 dark:bg-gray-800 dark:text-white dark:hover:text-gray-900"
            :disabled="pagination.current_page <= 1"
            :aria-label="t('web.vtual.public.contents.prev')"
            @click="goTo(-1)"
          >
            <svg class="h-2.5 w-1.5 rtl:rotate-180" fill="currentColor">
              <use :href="`${spriteUrl}#arrow-left-pixel-alt`"></use>
            </svg>
          </button>
          <span class="text-sm font-bold text-gray-500">
            {{ pagination.current_page }} / {{ pagination.last_page }}
          </span>
          <button
            type="button"
            class="flex aspect-square w-10 items-center justify-center bg-gray-150 text-gray-900 transition-colors hover:bg-accent hover:text-white disabled:opacity-30 dark:bg-gray-800 dark:text-white dark:hover:text-gray-900"
            :disabled="!pagination.has_more"
            :aria-label="t('web.vtual.public.contents.next')"
            @click="goTo(1)"
          >
            <svg class="h-2.5 w-1.5 rtl:rotate-180" fill="currentColor">
              <use :href="`${spriteUrl}#arrow-right-pixel-alt`"></use>
            </svg>
          </button>
        </div>
      </template>
    </div>
  </section>
</template>
