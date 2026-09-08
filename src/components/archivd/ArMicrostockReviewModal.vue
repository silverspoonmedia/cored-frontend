<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { isRtl } from '@/i18n'
import Modal from '@/components/Modal.vue'
import { useMicrostock } from '@/composables/microstock/useMicrostock'
import { useMicrostockHydrate } from '@/composables/microstock/useMicrostockHydrate'
import { useArchivd } from '@/composables/archivd/useArchivd'
import { useArchivdRealtime } from '@/composables/archivd/useArchivdRealtime'
import { useAlert } from '@/composables/useAlert'
import { isTerminalBatchError } from '@/api/batch'
import type { MicrostockAssetMetadata, MicrostockAssetStages } from '@/api/types'
import { safeHttpUrl } from '@/utils/safeUrl'

const open = defineModel<boolean>({ default: false })
const fileId = defineModel<string | null>('fileId', { default: null })

const props = withDefaults(defineProps<{
  fileIds?: string[]
  downloadCtx?: Record<string, unknown>
}>(), {
  fileIds: () => [],
  downloadCtx: () => ({}),
})

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const ms = useMicrostock()
const { hydrateReviewAsset } = useMicrostockHydrate()
const ar = useArchivd()
const { success: showSuccess, error: showError } = useAlert()
const { subscribe, unsubscribe } = useArchivdRealtime()

const loading = ref(false)
const saving = ref(false)
const analyzing = ref(false)
const meta = ref<MicrostockAssetMetadata | null>(null)
const previewUrl = ref<string | null>(null)
const title = ref('')
const keywords = ref<string[]>([])
const keywordDraft = ref('')

const fileIndex = computed(() => {
  if (!fileId.value || !props.fileIds.length) return -1
  return props.fileIds.indexOf(fileId.value)
})

const canPrev = computed(() => fileIndex.value > 0)
const canNext = computed(() => fileIndex.value >= 0 && fileIndex.value < props.fileIds.length - 1)

// Asset prev/next is list movement: under RTL the chevrons swap sides.
const prevIcon = computed(() => (isRtl() ? 'bi-chevron-right' : 'bi-chevron-left'))
const nextIcon = computed(() => (isRtl() ? 'bi-chevron-left' : 'bi-chevron-right'))

const stages = computed<MicrostockAssetStages>(() => meta.value?.stages ?? {
  vision: 'pending',
  thinking: 'pending',
  result: 'pending',
})

function stageIcon(state: string): string {
  if (state === 'ok') return '✓'
  if (state === 'running') return '…'
  if (state === 'failed') return '✗'
  return '—'
}

function stageClass(state: string): string {
  if (state === 'ok') return 'text-success'
  if (state === 'running') return 'text-warning'
  if (state === 'failed') return 'text-danger'
  return 'text-muted'
}

async function loadMeta(): Promise<void> {
  if (!fileId.value) {
    meta.value = null
    previewUrl.value = null
    return
  }
  loading.value = true
  try {
    // Batch metadata + preview download URL; fall back to standalone loaders
    // on transient entry failure (standalone endpoints stay the source of truth).
    // A terminal 401/403/429 entry re-throws so we never re-fire a rejection.
    const id = fileId.value
    const hydrated = await hydrateReviewAsset(id, props.downloadCtx).catch((e) => {
      if (isTerminalBatchError(e)) throw e
      return null
    })
    let loaded = hydrated?.metadata ?? null
    let dl = hydrated?.download ?? null
    if (loaded === null || dl === null) {
      const [fallbackMeta, fallbackDl] = await Promise.all([
        loaded === null ? ms.fetchAssetMetadata(id) : Promise.resolve(loaded),
        dl === null ? ar.fetchFileDownload(id, { preview: 1, ...props.downloadCtx }).catch(() => null) : Promise.resolve(dl),
      ])
      loaded = fallbackMeta
      dl = fallbackDl
    }
    if (loaded === null) {
      throw new Error(t('web.archivd.failed_load_file'))
    }
    meta.value = loaded
    title.value = loaded.title ?? ''
    keywords.value = [...(loaded.keywords ?? [])]
    previewUrl.value = safeHttpUrl(dl?.url)
  } catch (e) {
    meta.value = null
    showError(e instanceof Error ? e.message : t('web.archivd.failed_load_file'))
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, fileId.value] as const,
  ([visible, id]) => {
    if (visible && id) void loadMeta()
  },
)

const progressHandlers = {
  onAssetMetadataProgress: (payload: unknown) => {
    if (!open.value || !fileId.value) return
    const rec = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null
    const id = rec?.file_id ?? rec?.id
    if (id && String(id) !== fileId.value) return
    void loadMeta()
  },
}

onMounted(() => subscribe(progressHandlers))
onUnmounted(() => unsubscribe(progressHandlers))

function addKeyword(): void {
  const parts = keywordDraft.value.split(',').map((p) => p.trim()).filter(Boolean)
  for (const part of parts) {
    if (!keywords.value.includes(part)) keywords.value.push(part)
  }
  keywordDraft.value = ''
}

function removeKeyword(index: number): void {
  keywords.value.splice(index, 1)
}

function go(delta: number): void {
  const next = props.fileIds[fileIndex.value + delta]
  if (next) fileId.value = next
}

async function save(): Promise<void> {
  if (!fileId.value || saving.value) return
  const trimmed = title.value.trim()
  if (!trimmed || keywords.value.length === 0) return
  saving.value = true
  try {
    meta.value = await ms.updateAssetMetadata(fileId.value, trimmed, keywords.value)
    title.value = meta.value.title ?? trimmed
    keywords.value = [...(meta.value.keywords ?? [])]
    showSuccess(t('web.archivd.microstock.panel_saved'))
    emit('saved')
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.operation_failed'))
  } finally {
    saving.value = false
  }
}

async function reanalyze(): Promise<void> {
  if (!fileId.value || analyzing.value) return
  analyzing.value = true
  try {
    meta.value = await ms.analyzeAsset(fileId.value)
    showSuccess(t('web.archivd.microstock.panel_queued'))
    emit('saved')
  } catch (e) {
    showError(e instanceof Error ? e.message : t('web.archivd.operation_failed'))
  } finally {
    analyzing.value = false
  }
}
</script>

<template>
  <Modal
    v-model="open"
    :title="t('web.archivd.microstock.panel_title')"
    size="xl"
    scrollable
  >
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else class="row g-3">
      <div class="col-md-5">
        <div class="ar-ms-preview border rounded bg-body-tertiary d-flex align-items-center justify-content-center overflow-hidden" style="min-height: 240px;">
          <img
            v-if="previewUrl"
            :src="previewUrl"
            :alt="meta?.filename ?? ''"
            class="img-fluid"
            style="max-height: 360px; object-fit: contain;"
          />
          <span v-else class="text-muted small">{{ t('web.archivd.microstock.no_metadata') }}</span>
        </div>
        <div v-if="fileIds.length > 1" class="d-flex justify-content-between mt-2">
          <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="!canPrev" @click="go(-1)">
            <i class="bi" :class="prevIcon"></i>
          </button>
          <span class="small text-muted align-self-center">{{ fileIndex + 1 }} / {{ fileIds.length }}</span>
          <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="!canNext" @click="go(1)">
            <i class="bi" :class="nextIcon"></i>
          </button>
        </div>
      </div>
      <div class="col-md-7">
        <div class="mb-3" :aria-label="t('web.archivd.microstock.stage_strip_label')">
          <span class="ar-ms-stage-item me-3" :class="stageClass(stages.vision)">
            <span class="ar-ms-stage-dot">{{ stageIcon(stages.vision) }}</span>
            <span class="ar-ms-stage-label">{{ t('web.archivd.microstock.stage_vision_label') }}</span>
          </span>
          <span class="ar-ms-stage-sep text-muted me-3">→</span>
          <span class="ar-ms-stage-item me-3" :class="stageClass(stages.thinking)">
            <span class="ar-ms-stage-dot">{{ stageIcon(stages.thinking) }}</span>
            <span class="ar-ms-stage-label">{{ t('web.archivd.microstock.stage_thinking_label') }}</span>
          </span>
          <span class="ar-ms-stage-sep text-muted me-3">→</span>
          <span class="ar-ms-stage-item" :class="stageClass(stages.result)">
            <span class="ar-ms-stage-dot">{{ stageIcon(stages.result) }}</span>
            <span class="ar-ms-stage-label">{{ t('web.archivd.microstock.stage_result_label') }}</span>
          </span>
        </div>

        <div v-if="meta?.error" class="alert alert-danger py-2 small">
          <strong>{{ t('web.archivd.microstock.panel_error_label') }}:</strong> {{ meta.error }}
        </div>

        <div class="mb-3">
          <label class="form-label" for="ar-ms-title">{{ t('web.archivd.microstock.panel_title_label') }}</label>
          <input id="ar-ms-title" v-model="title" type="text" class="form-control" maxlength="255" />
        </div>

        <div class="mb-3">
          <label class="form-label">{{ t('web.archivd.microstock.panel_keywords_label') }}</label>
          <div class="d-flex flex-wrap gap-1 mb-2">
            <span v-for="(kw, i) in keywords" :key="kw + i" class="badge text-bg-light ar-ms-kw">
              {{ kw }}
              <button type="button" class="btn-close btn-close-sm ms-1" :aria-label="t('actions.close')" @click="removeKeyword(i)"></button>
            </span>
          </div>
          <input
            v-model="keywordDraft"
            type="text"
            class="form-control form-control-sm"
            :placeholder="t('web.archivd.microstock.panel_keyword_placeholder')"
            @keydown.enter.prevent="addKeyword"
          />
          <button
            v-if="keywords.length"
            type="button"
            class="btn btn-link btn-sm px-0 mt-1"
            @click="keywords = []"
          >
            {{ t('web.archivd.microstock.panel_keyword_clear') }}
          </button>
        </div>

        <details v-if="meta" class="small text-muted">
          <summary>{{ t('web.archivd.microstock.panel_ai_details') }}</summary>
          <p class="mb-1 mt-2"><strong>{{ t('web.archivd.microstock.panel_description_label') }}:</strong> {{ meta.description ?? '—' }}</p>
          <p class="mb-0"><strong>{{ t('web.archivd.microstock.panel_category_label') }}:</strong> {{ meta.category ?? '—' }}</p>
        </details>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-outline-secondary" :disabled="analyzing" @click="reanalyze">
        <span v-if="analyzing" class="spinner-border spinner-border-sm me-1"></span>
        {{ t('web.archivd.microstock.panel_reanalyze') }}
      </button>
      <button type="button" class="btn btn-primary" :disabled="saving || !title.trim() || !keywords.length" @click="save">
        <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
        {{ t('web.archivd.microstock.panel_save') }}
      </button>
    </template>
  </Modal>
</template>
