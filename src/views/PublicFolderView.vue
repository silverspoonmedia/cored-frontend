<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useFileHosting } from '@/composables/useFileHosting'
import { useAlert } from '@/composables/useAlert'
import type { FhPublicBrowsePayload } from '@/api/types'

const route = useRoute()
const fh = useFileHosting()
const { error: showError } = useAlert()

const browse = ref<FhPublicBrowsePayload | null>(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    browse.value = await fh.fetchPublicFolder(route.params.id as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Folder not found or no longer available.')
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

  <div v-else-if="browse" class="card fh-public-card" style="max-width: 800px; width: 100%;">
    <div class="card-body p-4">
      <div class="text-muted small mb-2">Shared Folder</div>
      <h1 class="h4 mb-3">
        <i class="bi bi-folder-fill text-warning me-1"></i>
        {{ browse.folder.name }}
      </h1>

      <!-- Breadcrumb -->
      <nav v-if="browse.breadcrumb.length > 0" aria-label="breadcrumb" class="mb-3">
        <ol class="breadcrumb breadcrumb-sm mb-0">
          <li class="breadcrumb-item active">{{ browse.folder.name }}</li>
        </ol>
      </nav>

      <div v-if="browse.folders.length === 0 && browse.files.length === 0" class="text-muted text-center py-4">
        <i class="bi bi-folder2-open fs-2 d-block mb-2"></i>
        This folder is empty.
      </div>

      <div v-else class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <tbody>
            <tr v-for="folder in browse.folders" :key="folder.id">
              <td>
                <i class="bi bi-folder-fill text-warning me-1"></i>
                {{ folder.name }}
              </td>
              <td class="text-muted small">Folder</td>
              <td class="text-end text-muted small">—</td>
            </tr>
            <tr v-for="file in browse.files" :key="file.id">
              <td>
                <i class="bi me-1" :class="fileIcon(file.mime)"></i>
                {{ file.name }}
              </td>
              <td class="text-muted small">{{ file.mime }}</td>
              <td class="text-end text-muted small">{{ file.size_human }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
