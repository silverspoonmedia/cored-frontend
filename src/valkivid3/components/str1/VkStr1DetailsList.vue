<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { VtualPublicProfile } from '@/api/types'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'

const props = defineProps<{
  profile: VtualPublicProfile
}>()

const { t } = useI18n()

const platformCount = computed(
  () => new Set(props.profile.channels.map((c) => c.platform_key).filter(Boolean)).size,
)

const rows = computed(() => [
  {
    icon: `${spriteUrl}#screen`,
    label: t('web.vtual.public.profile.details.channels'),
    value: String(props.profile.channels.length),
  },
  {
    icon: `${spriteUrl}#grid-3`,
    label: t('web.vtual.public.profile.details.platforms'),
    value: String(platformCount.value),
  },
  {
    icon: `${spriteUrl}#star`,
    label: t('web.vtual.public.profile.details.followers'),
    value: props.profile.total_subscribers_formatted ?? '0',
  },
  {
    icon: `${spriteUrl}#play`,
    label: t('web.vtual.public.profile.details.contents'),
    value: String(props.profile.contents.pagination.total),
  },
  {
    icon: `${spriteUrl}#clock`,
    label: t('web.vtual.public.profile.details.status'),
    value: props.profile.is_live
      ? t('web.vtual.public.profile.live')
      : t('web.vtual.public.profile.details.offline'),
  },
])
</script>

<template>
  <ul class="mt-6 divide-y divide-gray-500/20 border-y border-gray-500/20 text-sm">
    <li v-for="row in rows" :key="row.label" class="flex items-center gap-x-3 py-2.5">
      <svg role="img" class="h-4 w-4 shrink-0 fill-accent">
        <use :href="row.icon"></use>
      </svg>
      <span class="flex-1 font-medium text-gray-500">{{ row.label }}</span>
      <span class="font-bold text-gray-900 dark:text-white">{{ row.value }}</span>
    </li>
  </ul>
</template>
