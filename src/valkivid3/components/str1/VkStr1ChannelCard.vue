<script setup lang="ts">
import { computed } from 'vue'
import type { VtualPublicChannel } from '@/api/types'
import socialIconsUrl from '@/valkivid3/assets/img/social-icons.svg'
import spriteUrl from '@/valkivid3/assets/img/sprite.svg'
import { safeHttpUrl, safeImageUrl } from '@/utils/safeUrl'

const props = defineProps<{
  channel: VtualPublicChannel
}>()

const label = computed(
  () =>
    props.channel.display_name
    ?? (props.channel.handle ? `@${props.channel.handle}` : null)
    ?? props.channel.platform_name
    ?? props.channel.platform_key
    ?? '',
)

const platformIcon = computed(() => {
  const key = props.channel.platform_key
  if (key === 'youtube') return `${socialIconsUrl}#youtube`
  if (key === 'twitch') return `${socialIconsUrl}#twitch`
  if (key === 'discord') return `${socialIconsUrl}#discord`
  return `${spriteUrl}#plus`
})

const externalUrl = computed(() => safeHttpUrl(props.channel.url))
const imageUrl = computed(() => safeImageUrl(props.channel.avatar_url))
</script>

<template>
  <component
    :is="externalUrl ? 'a' : 'span'"
    :href="externalUrl ?? undefined"
    :target="externalUrl ? '_blank' : undefined"
    :rel="externalUrl ? 'noopener noreferrer' : undefined"
    class="flex items-center gap-x-3 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition-colors dark:bg-gray-700 dark:text-white"
    :class="externalUrl ? 'hover:bg-accent hover:text-white dark:hover:bg-accent dark:hover:text-gray-900' : ''"
  >
    <img
      v-if="imageUrl"
      :src="imageUrl ?? undefined"
      :alt="label"
      class="h-8 w-8 rounded-full object-cover"
      width="32"
      height="32"
      loading="lazy"
      decoding="async"
    />
    <svg v-else class="h-4 w-4" fill="currentColor">
      <use :href="platformIcon"></use>
    </svg>
    <span class="min-w-0 flex-1 truncate">{{ label }}</span>
    <span v-if="channel.subscriber_count_formatted" class="shrink-0 text-xs font-medium text-gray-500">
      {{ channel.subscriber_count_formatted }}
    </span>
  </component>
</template>
