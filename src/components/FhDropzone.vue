<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatBytes, formatTransferRate, uploadFile, type UploadRow } from '@/composables/useFhUpload'
import type { HostedFile } from '@/api/types'

const props = withDefaults(defineProps<{
  folderId?: string | null
  userId?: string | null
  workspaceId?: string | null
  collectionLocked?: boolean
  maxFiles?: number
}>(), {
  folderId: null,
  userId: null,
  workspaceId: null,
  collectionLocked: false,
  maxFiles: 20,
})

const emit = defineEmits<{
  uploaded: [file: HostedFile]
  refresh: []
}>()

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

function addFiles(fileList: FileList): void {
  const files = Array.from(fileList)
  if (props.collectionLocked) return

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
    pending: 'Pending',
    uploading: 'Uploading…',
    completing: 'Completing…',
    done: 'Done',
    error: 'Failed',
  }
  return labels[status] ?? status
}

function onDragOver(e: DragEvent): void {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave(e: DragEvent): void {
  e.preventDefault()
  isDragging.value = false
}

function onDrop(e: DragEvent): void {
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
      row.error = e instanceof Error ? e.message : 'Upload failed'
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
  <div class="fh-dropzone mb-3">
    <div
      class="border rounded p-3 text-center cursor-pointer"
      :class="{ 'border-primary bg-primary-subtle': isDragging, 'border-secondary': !isDragging }"
      role="button"
      tabindex="0"
      aria-label="Upload files"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="openFilePicker"
      @keydown="onDropzoneKeydown"
    >
      <i class="bi bi-cloud-arrow-up fs-2 d-block"></i>
      <span class="fw-semibold">Drop files here or click to browse</span>
      <div class="small text-muted mt-1">Max {{ maxFiles }} files per batch</div>
    </div>

    <input
      ref="fileInputEl"
      type="file"
      class="d-none"
      multiple
      @change="onFileInputChange"
    />

    <div v-if="canStart || batchRunning" class="d-flex justify-content-end mt-2">
      <button
        class="btn btn-primary btn-sm"
        type="button"
        :disabled="!canStart"
        @click.stop="startBatch"
      >
        <i class="bi bi-play-fill me-1"></i> Start Upload
      </button>
    </div>

    <div v-if="rows.length" class="mt-2">
      <div
        v-for="row in rows"
        :key="row.id"
        class="border rounded p-2 mb-1"
      >
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-file-earmark text-muted"></i>
          <span class="flex-grow-1 text-truncate">{{ row.name }}</span>
          <span class="text-muted small">({{ row.sizeLabel }})</span>
          <span class="small" :class="row.status === 'error' ? 'text-danger' : row.status === 'done' ? 'text-success' : 'text-muted'">
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
        <div v-if="row.status === 'uploading' || row.status === 'completing'" class="progress mt-1" style="height: 6px;">
          <div
            class="progress-bar"
            :style="{ width: row.percent + '%' }"
          ></div>
        </div>
        <div v-if="row.speed" class="small text-muted mt-1 text-end">{{ row.percent }}% — {{ row.speed }}</div>
      </div>
    </div>
  </div>
</template>
