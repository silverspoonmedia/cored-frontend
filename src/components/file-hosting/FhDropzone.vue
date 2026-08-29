<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatBytes, formatTransferRate, uploadFile, type UploadRow } from '@/composables/file-hosting/useFhUpload'
import { FH_ITEMS_MIME } from '@/composables/file-hosting/useFhDragMove'
import { useAlert } from '@/composables/useAlert'
import type { HostedFile } from '@/api/types'

const props = withDefaults(defineProps<{
  folderId?: string | null
  userId?: string | null
  workspaceId?: string | null
  collectionLocked?: boolean
  requireFolder?: boolean
  maxFiles?: number
}>(), {
  folderId: null,
  userId: null,
  workspaceId: null,
  collectionLocked: false,
  requireFolder: false,
  maxFiles: 20,
})

const emit = defineEmits<{
  uploaded: [file: HostedFile]
  refresh: []
}>()

const { t } = useI18n()
const { error: showError } = useAlert()

const MAX_CONCURRENT = 2
const rows = ref<UploadRow[]>([])
const batchRunning = ref(false)
const isDragging = ref(false)
const fileInputEl = ref<HTMLInputElement | null>(null)

let rowIdCounter = 0
function nextId(): string {
  rowIdCounter++
  return `row-${Date.now()}-${rowIdCounter}`
}

const canStart = computed(() => {
  return !batchRunning.value && rows.value.some((r) => r.status === 'pending')
})

const pendingCount = computed(() => rows.value.filter((r) => r.status === 'pending').length)

function isFhItemDrag(dt: DataTransfer | null): boolean {
  if (!dt?.types) return false
  return Array.from(dt.types).includes(FH_ITEMS_MIME)
}

function openFilePicker(): void {
  fileInputEl.value?.click()
}

function onFileInputChange(e: Event): void {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    addFiles(input.files)
    input.value = ''
  }
}

function gateAdd(): boolean {
  if (props.requireFolder) {
    showError(t('web.file-hosting.microstock.error_requires_folder'))
    return false
  }
  if (props.collectionLocked) {
    showError(t('web.file-hosting.microstock.error_collection_locked'))
    return false
  }
  return true
}

function addFiles(fileList: FileList): void {
  if (!gateAdd()) return

  const files = Array.from(fileList)
  if (pendingCount.value + files.length > props.maxFiles) {
    trimToMax(files)
  }

  for (const file of files) {
    rows.value.push({
      id: nextId(),
      file,
      name: file.name,
      sizeLabel: formatBytes(file.size),
      status: 'pending',
      percent: 0,
      speed: '',
      error: '',
    })
  }
}

function trimToMax(files: File[]): void {
  const room = props.maxFiles - pendingCount.value
  if (room <= 0) {
    files.length = 0
  } else if (files.length > room) {
    files.length = room
  }
}

function removePending(id: string): void {
  rows.value = rows.value.filter((r) => r.id !== id)
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: t('web.file-hosting.dropzone_status_pending'),
    uploading: t('web.file-hosting.dropzone_status_uploading'),
    completing: t('web.file-hosting.dropzone_status_completing'),
    done: t('web.file-hosting.dropzone_status_done'),
    error: t('web.file-hosting.dropzone_status_error'),
  }
  return labels[status] ?? status
}

function onDragOver(e: DragEvent): void {
  if (isFhItemDrag(e.dataTransfer)) return
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave(e: DragEvent): void {
  if (isFhItemDrag(e.dataTransfer)) return
  e.preventDefault()
  isDragging.value = false
}

function onDrop(e: DragEvent): void {
  if (isFhItemDrag(e.dataTransfer)) return
  e.preventDefault()
  isDragging.value = false
  if (e.dataTransfer?.files?.length) {
    addFiles(e.dataTransfer.files)
  }
}

function onDropzoneKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openFilePicker()
  }
}

async function startBatch(): Promise<void> {
  if (batchRunning.value) return
  batchRunning.value = true

  const pending = rows.value.filter((r) => r.status === 'pending')
  const ctx = {
    folderId: props.folderId,
    userId: props.userId,
    workspaceId: props.workspaceId,
  }

  let anySucceeded = false

  async function worker(row: UploadRow): Promise<void> {
    row.status = 'uploading'
    row.error = ''

    try {
      const result = await uploadFile(
        row.file,
        ctx,
        (p) => {
          row.percent = p.percent
          row.speed = formatTransferRate(p.bytesPerSecond)
        },
        (s) => {
          row.status = s
          if (s === 'completing') row.speed = ''
        },
      )
      row.status = 'done'
      row.percent = 100
      row.speed = ''
      anySucceeded = true
      emit('uploaded', result.file)
      scheduleDismiss(row.id)
    } catch (e) {
      row.status = 'error'
      row.error = e instanceof Error ? e.message : t('web.file-hosting.dropzone_upload_failed')
      row.speed = ''
    }
  }

  await runWithConcurrency(pending, MAX_CONCURRENT, worker)

  batchRunning.value = false
  if (anySucceeded) emit('refresh')
}

async function runWithConcurrency(items: UploadRow[], limit: number, worker: (row: UploadRow) => Promise<void>): Promise<void> {
  const queue = [...items]
  const runners: Promise<void>[] = []

  async function runNext(): Promise<void> {
    const next = queue.shift()
    if (!next) return
    await worker(next)
    await runNext()
  }

  for (let i = 0; i < Math.min(limit, queue.length); i++) {
    runners.push(runNext())
  }
  await Promise.all(runners)
}

const DONE_DISMISS_MS = 5000

function scheduleDismiss(id: string): void {
  setTimeout(() => {
    rows.value = rows.value.filter((r) => r.id !== id)
  }, DONE_DISMISS_MS)
}
</script>

<template>
  <div>
    <div
      class="fh-dropzone"
      data-fh-dropzone
      :class="{ 'is-dragging': isDragging }"
      role="button"
      tabindex="0"
      :aria-label="t('web.file-hosting.dropzone_aria_label')"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="openFilePicker"
      @keydown="onDropzoneKeydown"
    >
      <div class="fh-dropzone__icon">
        <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
      </div>
      <div class="fh-dropzone__text">{{ t('web.file-hosting.upload_here') }}</div>
      <div class="fh-dropzone__hint">{{ t('web.file-hosting.dropzone_max_files', { count: maxFiles }) }}</div>
      <input
        ref="fileInputEl"
        type="file"
        class="d-none"
        multiple
        @change="onFileInputChange"
      />
    </div>

    <div v-if="canStart || batchRunning" class="fh-dropzone__actions">
      <button
        class="btn btn-primary btn-sm"
        type="button"
        :disabled="!canStart"
        @click.stop="startBatch"
      >
        <i class="bi bi-play-fill me-1"></i> {{ t('web.file-hosting.dropzone_start_upload') }}
      </button>
    </div>

    <div v-if="rows.length" class="fh-upload-queue">
      <div
        v-for="row in rows"
        :key="row.id"
        class="fh-upload-row"
      >
        <div class="fh-upload-row__header">
          <span class="fh-upload-row__name">{{ row.name }} <span class="text-muted">({{ row.sizeLabel }})</span></span>
          <span class="fh-upload-row__status" :class="row.status === 'error' ? 'text-danger' : row.status === 'done' ? 'text-success' : ''">
            {{ row.error || statusLabel(row.status) }}
          </span>
          <button
            v-if="row.status === 'pending'"
            class="btn btn-sm btn-outline-danger py-0 px-1"
            type="button"
            @click.stop="removePending(row.id)"
          >
            <i class="bi bi-x"></i>
          </button>
        </div>
        <div v-if="row.status === 'uploading' || row.status === 'completing'" class="progress" style="height: 6px;">
          <div class="progress-bar" :style="{ width: row.percent + '%' }"></div>
        </div>
        <div v-if="row.speed" class="small text-muted mt-1 text-end">{{ row.percent }}% — {{ row.speed }}</div>
      </div>
    </div>
  </div>
</template>
