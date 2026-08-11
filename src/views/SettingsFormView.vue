<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from '@/components/Card.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useSettings } from '@/composables/useSettings'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import type { SettingEntry } from '@/api/types'

const route = useRoute()
const router = useRouter()
const { fetchGroup, settings, loading, saving, saveGroup, error } = useSettings()
const { success: showSuccess, error: showError } = useAlert()
const { hasPermission } = useAuth()

const canManage = computed(() => hasPermission('manage settings'))

const group = computed(() => route.params.group as string)

const entries = computed<Array<[string, SettingEntry]>>(() => {
  return Object.entries(settings.value)
})

const form = ref<Record<string, string | number | boolean>>({})

function fieldId(key: string): string {
  return key.replace(/\./g, '_')
}

function humanLabel(key: string): string {
  return key.split('.').pop()?.replace(/_/g, ' ') ?? key
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
    showSuccess('Settings updated successfully.')
  } else if (error.value) {
    showError(error.value)
  }
}

watch(group, loadGroup)

onMounted(loadGroup)
</script>

<template>
  <Card :title="`${group} Settings`">
    <template #actions>
      <button class="btn btn-outline-secondary btn-sm" @click="router.push({ name: 'settings.index.view' })">
        <i class="bi bi-arrow-left me-1"></i> Back to Settings
      </button>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <div v-else>
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
              {{ humanLabel(key) }}
            </label>
            <div class="text-muted small">
              <code>{{ key }}</code>
              <span class="ms-2">Source: {{ entry.source }}</span>
            </div>
          </div>

          <!-- Array -->
          <div v-else-if="entry.type === 'array'">
            <label class="form-label" :for="fieldId(key)">
              {{ humanLabel(key) }}
            </label>
            <textarea
              :id="fieldId(key)"
              :value="strVal(key)"
              class="form-control"
              rows="2"
              @input="setStr(key, ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
            <div class="text-muted small">
              <code>{{ key }}</code> · Comma-separated values · Source: {{ entry.source }}
            </div>
          </div>

          <!-- Select (options present) -->
          <div v-else-if="entry.options && entry.options.length > 0">
            <label class="form-label" :for="fieldId(key)">
              {{ humanLabel(key) }}
            </label>
            <select
              :id="fieldId(key)"
              :value="selectVal(key)"
              class="form-select"
              @change="setSelect(key, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in entry.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <div class="text-muted small">
              <code>{{ key }}</code> · Source: {{ entry.source }}
            </div>
          </div>

          <!-- Number (int/float) -->
          <div v-else-if="entry.type === 'int' || entry.type === 'float'">
            <label class="form-label" :for="fieldId(key)">
              {{ humanLabel(key) }}
            </label>
            <input
              :id="fieldId(key)"
              :value="numVal(key)"
              type="number"
              :step="entry.type === 'float' ? '0.01' : '1'"
              class="form-control"
              @input="setNum(key, Number(($event.target as HTMLInputElement).value))"
            >
            <div class="text-muted small">
              <code>{{ key }}</code> · Source: {{ entry.source }}
            </div>
          </div>

          <!-- String (default) -->
          <div v-else>
            <label class="form-label" :for="fieldId(key)">
              {{ humanLabel(key) }}
            </label>
            <input
              :id="fieldId(key)"
              :value="strVal(key)"
              type="text"
              class="form-control"
              @input="setStr(key, ($event.target as HTMLInputElement).value)"
            >
            <div class="text-muted small">
              <code>{{ key }}</code> · Source: {{ entry.source }}
            </div>
          </div>
        </div>

        <SubmitButton label="Save" :loading="saving" variant="primary" />
      </form>

      <!-- Read-only -->
      <dl v-else class="row mb-0">
        <template v-for="[key, entry] in entries" :key="key">
          <dt class="col-sm-4">
            {{ humanLabel(key) }}
            <code class="d-block small text-muted">{{ key }}</code>
          </dt>
          <dd class="col-sm-8">
            <template v-if="entry.type === 'bool'">
              {{ asBool(entry.value) ? 'Yes' : 'No' }}
            </template>
            <template v-else-if="entry.type === 'array'">
              {{ asArrayString(entry.value) }}
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
