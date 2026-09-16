<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlogMedia } from '@/composables/blog/useBlogMedia'
import type { BlogMedia } from '@/api/types'

const props = defineProps<{
  /** BlogMedia id — the value persisted on the post (`featured_media_id`). */
  modelValue: string | null
  /** Loaded media object (URL source) when editing an existing post. */
  media?: BlogMedia | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const { t } = useI18n()
const { upload, uploading } = useBlogMedia()

/** URL from the most recent in-session upload (props.media lags behind). */
const uploadedUrl = ref<string | null>(null)

const previewUrl = computed(() => uploadedUrl.value ?? props.media?.url ?? null)

const busy = computed(() => props.disabled || uploading.value)

const fileInput = ref<HTMLInputElement | null>(null)

function pick(): void {
  if (!busy.value) fileInput.value?.click()
}

function remove(): void {
  uploadedUrl.value = null
  emit('update:modelValue', null)
}

async function onFilePicked(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const media = await upload(file)
  uploadedUrl.value = media.url
  emit('update:modelValue', media.id)
}
</script>

<template>
  <div>
    <div v-if="previewUrl" class="d-flex align-items-start gap-3">
      <img :src="previewUrl" :alt="t('web.blog.featured.alt')" class="border rounded" style="max-width: 240px; max-height: 160px; object-fit: cover" />
      <div class="d-flex flex-column gap-2">
        <button type="button" class="btn btn-outline-danger btn-sm" :disabled="busy" @click="remove">
          <i class="bi bi-trash me-1"></i> {{ t('web.blog.featured.remove') }}
        </button>
        <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="busy" @click="pick">
          <i class="bi bi-arrow-repeat me-1"></i> {{ t('web.blog.featured.replace') }}
        </button>
      </div>
    </div>
    <button v-else type="button" class="btn btn-outline-secondary" :disabled="busy" @click="pick">
      <i class="bi me-1" :class="uploading ? 'bi-hourglass-split' : 'bi-image'"></i>
      {{ uploading ? t('web.blog.featured.uploading') : t('web.blog.featured.pick') }}
    </button>
    <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="d-none" @change="onFilePicked" />
  </div>
</template>
