<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useArchivd } from '@/features/archivd/composables/useArchivd'
import type { HostedFile } from '../types'
import { safeHttpUrl } from '@/utils/safeUrl'

const route = useRoute()
const { t } = useI18n()
const ar = useArchivd()

const file = ref<HostedFile | null>(null)
const downloadUrl = ref<string | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const [fileData, dlData] = await Promise.all([
      ar.fetchPublicFile(route.params.id as string),
      ar.fetchPublicFileDownload(route.params.id as string).catch(() => null),
    ])
    file.value = fileData
    downloadUrl.value = safeHttpUrl(dlData?.url)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : t('web.archivd.public.file_not_found')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function fileIcon(mime: string): string {
  if (mime.startsWith('image/')) return 'bi-file-image'
  if (mime.startsWith('video/')) return 'bi-file-play'
  if (mime.startsWith('audio/')) return 'bi-file-music'
  if (mime.includes('pdf')) return 'bi-file-pdf'
  if (mime.includes('zip') || mime.includes('compressed')) return 'bi-file-zip'
  if (mime.includes('text')) return 'bi-file-text'
  return 'bi-file-earmark'
}
</script>

<template>
  <div v-if="loading" class="ar-public is-ar-loading py-5">
    <div class="card" style="max-width: 600px; width: 100%; margin: 0 auto;">
      <div class="card-body p-4">
        <SkeletonBlock variant="line" :lines="1" width="40%" class="mx-auto" />
        <SkeletonBlock variant="block" height="3rem" />
        <SkeletonBlock variant="line" :lines="2" />
        <SkeletonBlock variant="button" width="8rem" class="mx-auto" />
      </div>
    </div>
  </div>

  <ErrorState v-else-if="loadError" :message="loadError" @retry="load" />

  <div v-else-if="file" class="ar-public">
    <div class="ar-public__card card" style="max-width: 600px; width: 100%;">
      <div class="ar-public__card-body card-body text-center p-4">
        <div class="ar-public__label text-muted small mb-2">{{ t('web.archivd.public.shared_file') }}</div>
        <i class="bi ar-public__file-icon fs-1 mb-3 d-block" :class="fileIcon(file.mime)"></i>
        <h1 class="h4 mb-3 ar-public__file-name">{{ file.name }}</h1>

        <div class="ar-public__meta row g-2 mb-3 text-start">
          <div class="col-6">
            <div class="border rounded p-2">
              <div class="ar-public__meta-label text-muted small">{{ t('web.archivd.public.type') }}</div>
              <div class="ar-public__meta-value small text-truncate">{{ file.mime }}</div>
            </div>
          </div>
          <div class="col-6">
            <div class="border rounded p-2">
              <div class="ar-public__meta-label text-muted small">{{ t('web.archivd.public.size') }}</div>
              <div class="ar-public__meta-value small">{{ file.size_human ?? file.size }}</div>
            </div>
          </div>
        </div>

        <div class="ar-public__actions">
          <a
            v-if="downloadUrl"
            :href="downloadUrl ?? undefined"
            class="btn btn-primary w-100"
          >
            <i class="bi bi-download me-1"></i> {{ t('web.archivd.public.download') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
