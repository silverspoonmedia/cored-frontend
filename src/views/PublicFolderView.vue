<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useFileHosting } from '@/composables/useFileHosting'
import { useAlert } from '@/composables/useAlert'
import type { FhPublicBrowsePayload } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const fh = useFileHosting()
const { error: showError } = useAlert()

const browse = ref<FhPublicBrowsePayload | null>(null)
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    browse.value = await fh.fetchPublicFolder(route.params.id as string)
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.file-hosting.public.folder_not_found'))
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

function openFolder(folderId: string): void {
  router.push({ name: 'public.folder', params: { id: folderId } })
}
</script>

<template>
  <div v-if="loading" class="fh-public is-fh-loading text-center py-5">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">{{ t('web.file-hosting.public.loading') }}</span>
    </div>
  </div>

  <div v-else-if="browse" class="fh-public">
    <div class="fh-public__card card" style="max-width: 800px; width: 100%;">
      <div class="fh-public__card-body card-body p-4">
        <div class="fh-public__label text-muted small mb-2">{{ t('web.file-hosting.public.shared_folder') }}</div>
        <h1 class="h4 mb-3">
          <i class="bi bi-folder-fill text-warning me-1"></i>
          {{ browse.folder.name }}
        </h1>

        <nav v-if="browse.breadcrumb.length > 0" aria-label="breadcrumb" class="mb-3">
          <ol class="breadcrumb breadcrumb-sm mb-0">
            <li class="breadcrumb-item active">{{ browse.folder.name }}</li>
          </ol>
        </nav>

        <div v-if="browse.folders.length === 0 && browse.files.length === 0" class="text-muted text-center py-4">
          <i class="bi bi-folder2-open fs-2 d-block mb-2"></i>
          {{ t('web.file-hosting.public.empty_folder') }}
        </div>

        <div v-else class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <tbody>
              <tr
                v-for="folder in browse.folders"
                :key="folder.id"
                style="cursor: pointer;"
                @click="openFolder(folder.id)"
              >
                <td>
                  <i class="bi bi-folder-fill text-warning me-1"></i>
                  {{ folder.name }}
                </td>
                <td class="text-muted small">{{ t('web.file-hosting.public.folder') }}</td>
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
  </div>
</template>
