<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useFileHosting } from '@/composables/useFileHosting'
import { useAlert } from '@/composables/useAlert'
import type { HostedFile } from '@/api/types'

const route = useRoute()
const fh = useFileHosting()
const { error: showError } = useAlert()

const file = ref<HostedFile | null>(null)
const downloadUrl = ref<string | null>(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    const [fileData, dlData] = await Promise.all([
      fh.fetchPublicFile(route.params.id as string),
      fh.fetchPublicFileDownload(route.params.id as string).catch(() => null),
    ])
    file.value = fileData
    downloadUrl.value = dlData?.url ?? null
  } catch (e) {
    showError(e instanceof Error ? e.message : 'File not found or no longer available.')
  } finally {
    loading.value = false
  }
})

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
  <div v-if="loading" class="text-center py-5">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading…</span>
    </div>
  </div>

  <div v-else-if="file" class="card fh-public-card" style="max-width: 600px; width: 100%;">
    <div class="card-body text-center p-4">
      <div class="text-muted small mb-2">Shared File</div>
      <i class="bi fs-1 mb-3 d-block" :class="fileIcon(file.mime)"></i>
      <h1 class="h4 mb-3">{{ file.name }}</h1>

      <div class="row g-2 mb-3 text-start">
        <div class="col-6">
          <div class="border rounded p-2">
            <div class="text-muted small">Type</div>
            <div class="small text-truncate">{{ file.mime }}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="border rounded p-2">
            <div class="text-muted small">Size</div>
            <div class="small">{{ file.size_human ?? file.size }}</div>
          </div>
        </div>
      </div>

      <a
        v-if="downloadUrl"
        :href="downloadUrl"
        class="btn btn-primary w-100"
      >
        <i class="bi bi-download me-1"></i> Download
      </a>
    </div>
  </div>
</template>
