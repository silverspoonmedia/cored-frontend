<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ErrorState from '@/components/ErrorState.vue'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import FhIcon from '@/components/file-hosting/FhIcon.vue'
import { useFileHosting } from '@/composables/file-hosting/useFileHosting'
import type { FhPublicBrowsePayload } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const fh = useFileHosting()

const browse = ref<FhPublicBrowsePayload | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)

async function loadFolder(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    browse.value = await fh.fetchPublicFolder(route.params.id as string)
  } catch (e) {
    browse.value = null
    loadError.value = e instanceof Error ? e.message : t('web.file-hosting.public.folder_not_found')
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.id,
  () => {
    void loadFolder()
  },
  { immediate: true },
)

function folderHref(id: string): string {
  return router.resolve({ name: 'public.folder', params: { id } }).href
}

function fileHref(id: string): string {
  return router.resolve({ name: 'public.file', params: { id } }).href
}

function openFolder(folderId: string): void {
  router.push({ name: 'public.folder', params: { id: folderId } })
}

function openFile(fileId: string): void {
  router.push({ name: 'public.file', params: { id: fileId } })
}
</script>

<template>
  <div v-if="loading" class="fh-public is-fh-loading py-5">
    <div class="card" style="max-width: 800px; width: 100%; margin: 0 auto;">
      <div class="card-body p-4">
        <SkeletonBlock variant="line" :lines="1" width="50%" />
        <div v-for="i in 5" :key="i" class="d-flex align-items-center gap-3 py-2 border-bottom">
          <SkeletonBlock variant="avatar" width="1.5rem" />
          <SkeletonBlock variant="line" :lines="1" width="45%" class="mb-0" />
          <SkeletonBlock variant="line" :lines="1" width="5rem" class="ms-auto mb-0" />
        </div>
      </div>
    </div>
  </div>

  <ErrorState v-else-if="loadError" :message="loadError" @retry="loadFolder" />

  <div v-else-if="browse" class="fh-public">
    <div class="fh-public__card card" style="max-width: 800px; width: 100%;">
      <div class="fh-public__card-body card-body p-4">
        <div class="fh-public__label text-muted small mb-2">{{ t('web.file-hosting.public.shared_folder') }}</div>
        <h1 class="h4 mb-3">
          <FhIcon is-folder />
          {{ browse.folder.name }}
        </h1>

        <nav v-if="browse.breadcrumb.length > 0" aria-label="breadcrumb" class="mb-3">
          <ol class="breadcrumb breadcrumb-sm mb-0">
            <li
              v-for="(crumb, i) in browse.breadcrumb"
              :key="crumb.id"
              class="breadcrumb-item"
              :class="{ active: i === browse.breadcrumb.length - 1 }"
            >
              <span v-if="i === browse.breadcrumb.length - 1">{{ crumb.name }}</span>
              <a
                v-else
                :href="folderHref(crumb.id)"
                @click.prevent="openFolder(crumb.id)"
              >{{ crumb.name }}</a>
            </li>
          </ol>
        </nav>

        <div v-if="browse.folders.length === 0 && browse.files.length === 0" class="text-muted text-center py-4">
          <i class="bi bi-folder2-open fs-2 d-block mb-2"></i>
          {{ t('web.file-hosting.public.empty_folder') }}
        </div>

        <div v-else class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0 fh-table">
            <tbody>
              <tr
                v-for="folder in browse.folders"
                :key="folder.id"
                style="cursor: pointer;"
                @click="openFolder(folder.id)"
              >
                <td>
                  <a :href="folderHref(folder.id)" class="text-reset text-decoration-none" @click.prevent="openFolder(folder.id)">
                    <FhIcon is-folder />
                    {{ folder.name }}
                  </a>
                </td>
                <td class="text-muted small">{{ t('web.file-hosting.public.folder') }}</td>
                <td class="text-end text-muted small">—</td>
              </tr>
              <tr
                v-for="file in browse.files"
                :key="file.id"
                style="cursor: pointer;"
                @click="openFile(file.id)"
              >
                <td>
                  <a :href="fileHref(file.id)" class="text-reset text-decoration-none" @click.prevent="openFile(file.id)">
                    <FhIcon :mime="file.mime" />
                    {{ file.name }}
                  </a>
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
