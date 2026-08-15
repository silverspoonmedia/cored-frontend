<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useSettings } from '@/composables/useSettings'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import { useSettingsRealtime } from '@/composables/useSettingsRealtime'
import type { SettingEntry } from '@/api/types'
import { settingsGroupFromRoute, settingsGroupLabelKey } from '@/utils/settingsGroup'

const route = useRoute()
const router = useRouter()
const { t, tm } = useI18n()
const { fetchGroup, settings, loading, saving, saveGroup, error } = useSettings()
const { success: showSuccess, error: showError } = useAlert()
const { hasPermission } = useAuth()

const canManage = computed(() => hasPermission('manage settings'))

const group = computed(() => settingsGroupFromRoute(route))

const groupLabel = computed(() => t(settingsGroupLabelKey(group.value || 'platform')))

const fieldLabels = computed<Record<string, string>>(() => {
  const obj = tm('web.settings.fields') as Record<string, string>
  return obj ?? {}
})

const hints = computed<Record<string, string>>(() => {
  const obj = tm('web.settings.hints') as Record<string, string>
  return obj ?? {}
})

const optionLabels = computed<Record<string, Record<string, string>>>(() => {
  const obj = tm('web.settings.options') as Record<string, Record<string, string>>
  return obj ?? {}
})

function fieldLabel(key: string): string {
  return fieldLabels.value[key] ?? key
}

function fieldHint(key: string): string | null {
  const h = hints.value[key]
  return h && h.length > 0 ? h : null
}

function optionLabel(key: string, opt: string): string {
  const parts = key.split('.')
  let node: unknown = optionLabels.value
  for (const part of parts) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part]
    } else {
      return opt
    }
  }
  if (node && typeof node === 'object' && opt in (node as Record<string, string>)) {
    return (node as Record<string, string>)[opt] ?? opt
  }
  return opt
}

const entries = computed<Array<[string, SettingEntry]>>(() => {
  return Object.entries(settings.value)
})

const form = ref<Record<string, string | number | boolean>>({})

function fieldId(key: string): string {
  return key.replace(/\./g, '_')
}

function asBool(val: unknown): boolean {
  return val === true || val === 1 || val === '1' || val === 'true'
}

function asArrayString(val: unknown): string {
  if (Array.isArray(val)) return val.join(', ')
  return String(val ?? '')
}

function syncForm(): void {
  const next: Record<string, string | number | boolean> = {}
  for (const [key, entry] of entries.value) {
    if (entry.type === 'bool') {
      next[fieldId(key)] = asBool(entry.value)
    } else if (entry.type === 'array') {
      next[fieldId(key)] = asArrayString(entry.value)
    } else if (entry.type === 'int' || entry.type === 'float') {
      next[fieldId(key)] = Number(entry.value)
    } else {
      next[fieldId(key)] = String(entry.value ?? '')
    }
  }
  form.value = next
}

function strVal(key: string): string {
  return String(form.value[fieldId(key)] ?? '')
}

function setStr(key: string, val: string): void {
  form.value[fieldId(key)] = val
}

function numVal(key: string): number {
  return Number(form.value[fieldId(key)] ?? 0)
}

function setNum(key: string, val: number): void {
  form.value[fieldId(key)] = val
}

function boolVal(key: string): boolean {
  return Boolean(form.value[fieldId(key)])
}

function setBool(key: string, val: boolean): void {
  form.value[fieldId(key)] = val
}

function selectVal(key: string): string {
  return String(form.value[fieldId(key)] ?? '')
}

function setSelect(key: string, val: string): void {
  form.value[fieldId(key)] = val
}

async function loadGroup(): Promise<void> {
  await fetchGroup(group.value)
  syncForm()
}

async function handleSubmit(): Promise<void> {
  const payload: Record<string, unknown> = {}
  for (const [key, entry] of entries.value) {
    const id = fieldId(key)
    const val = form.value[id]
    if (entry.type === 'array' && typeof val === 'string') {
      payload[key] = val.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
    } else if (entry.type === 'int') {
      payload[key] = parseInt(String(val), 10)
    } else if (entry.type === 'float') {
      payload[key] = parseFloat(String(val))
    } else if (entry.type === 'bool') {
      payload[key] = val ? 1 : 0
    } else {
      payload[key] = String(val ?? '')
    }
  }

  const ok = await saveGroup(group.value, payload)
  if (ok) {
    showSuccess(t('web.settings.updated'))
  } else if (error.value) {
    showError(error.value)
  }
}

watch(group, loadGroup)

const { subscribe, unsubscribe } = useSettingsRealtime()
const realtimeHandlers = {
  onGroupChanged: (payload: { group: string; action: string }) => {
    if (payload.group === group.value && payload.action === 'updated') {
      void fetchGroup(group.value).then(syncForm)
    }
  },
}

onMounted(() => {
  loadGroup()
  subscribe(group.value, realtimeHandlers)
})

onUnmounted(() => {
  unsubscribe(realtimeHandlers)
})
</script>

<template>
  <Card :title="groupLabel">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'settings.index.view' })">
        <i class="bi bi-arrow-left me-1"></i> {{ t('web.settings.back') }}
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else>
      <div v-if="!canManage" class="alert alert-info">
        {{ t('web.settings.read_only') }}
      </div>

      <form v-if="canManage" @submit.prevent="handleSubmit">
        <div v-for="[key, entry] in entries" :key="key" class="mb-3">
          <!-- Boolean -->
          <div v-if="entry.type === 'bool'" class="form-check form-switch">
            <input
              :id="fieldId(key)"
              :checked="boolVal(key)"
              class="form-check-input"
              type="checkbox"
              role="switch"
              @change="setBool(key, ($event.target as HTMLInputElement).checked)"
            >
            <label class="form-check-label" :for="fieldId(key)">
              {{ fieldLabel(key) }}
            </label>
            <div v-if="fieldHint(key)" class="form-text">{{ fieldHint(key) }}</div>
            <div class="text-muted small">
              <code>{{ key }}</code>
              <span class="ms-2">{{ t('web.settings.source', { source: entry.source }) }}</span>
            </div>
          </div>

          <!-- Array -->
          <div v-else-if="entry.type === 'array'">
            <label class="form-label" :for="fieldId(key)">
              {{ fieldLabel(key) }}
            </label>
            <textarea
              :id="fieldId(key)"
              :value="strVal(key)"
              class="form-control"
              rows="2"
              @input="setStr(key, ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
            <div v-if="fieldHint(key)" class="form-text">{{ fieldHint(key) }}</div>
            <div class="text-muted small">
              <code>{{ key }}</code> · {{ t('web.settings.source', { source: entry.source }) }}
            </div>
          </div>

          <!-- Select (options present) -->
          <div v-else-if="entry.options && entry.options.length > 0">
            <label class="form-label" :for="fieldId(key)">
              {{ fieldLabel(key) }}
            </label>
            <select
              :id="fieldId(key)"
              :value="selectVal(key)"
              class="form-select"
              @change="setSelect(key, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in entry.options" :key="opt" :value="opt">{{ optionLabel(key, opt) }}</option>
            </select>
            <div v-if="fieldHint(key)" class="form-text">{{ fieldHint(key) }}</div>
            <div class="text-muted small">
              <code>{{ key }}</code> · {{ t('web.settings.source', { source: entry.source }) }}
            </div>
          </div>

          <!-- Number (int/float) -->
          <div v-else-if="entry.type === 'int' || entry.type === 'float'">
            <label class="form-label" :for="fieldId(key)">
              {{ fieldLabel(key) }}
            </label>
            <input
              :id="fieldId(key)"
              :value="numVal(key)"
              type="number"
              :step="entry.type === 'float' ? '0.01' : '1'"
              class="form-control"
              @input="setNum(key, Number(($event.target as HTMLInputElement).value))"
            >
            <div v-if="fieldHint(key)" class="form-text">{{ fieldHint(key) }}</div>
            <div class="text-muted small">
              <code>{{ key }}</code> · {{ t('web.settings.source', { source: entry.source }) }}
            </div>
          </div>

          <!-- String (default) -->
          <div v-else>
            <label class="form-label" :for="fieldId(key)">
              {{ fieldLabel(key) }}
            </label>
            <input
              :id="fieldId(key)"
              :value="strVal(key)"
              type="text"
              class="form-control"
              @input="setStr(key, ($event.target as HTMLInputElement).value)"
            >
            <div v-if="fieldHint(key)" class="form-text">{{ fieldHint(key) }}</div>
            <div class="text-muted small">
              <code>{{ key }}</code> · {{ t('web.settings.source', { source: entry.source }) }}
            </div>
          </div>
        </div>

        <SubmitButton :label="t('actions.save')" :loading="saving" variant="primary" />
      </form>

      <!-- Read-only -->
      <dl v-else class="row mb-0">
        <template v-for="[key, entry] in entries" :key="key">
          <dt class="col-sm-4">
            {{ fieldLabel(key) }}
            <code class="d-block small text-muted">{{ key }}</code>
            <div v-if="fieldHint(key)" class="form-text">{{ fieldHint(key) }}</div>
          </dt>
          <dd class="col-sm-8">
            <template v-if="entry.type === 'bool'">
              {{ asBool(entry.value) ? t('ui.yes') : t('ui.no') }}
            </template>
            <template v-else-if="entry.type === 'array'">
              {{ asArrayString(entry.value) }}
            </template>
            <template v-else-if="entry.options && entry.options.length > 0">
              {{ optionLabel(key, String(entry.value ?? '')) }}
            </template>
            <template v-else>
              {{ entry.value }}
            </template>
            <span class="text-muted small ms-2">({{ entry.source }})</span>
          </dd>
        </template>
      </dl>
    </div>
  </Card>
</template>
