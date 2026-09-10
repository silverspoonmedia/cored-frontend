<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/Card.vue'
import FormCheckbox from '@/components/FormCheckbox.vue'
import FormInput from '@/components/FormInput.vue'
import FormSelect, { type SelectOption } from '@/components/FormSelect.vue'
import FormTextarea from '@/components/FormTextarea.vue'
import SubmitButton from '@/components/SubmitButton.vue'
import { useSettings } from '@/composables/settings/useSettings'
import { useAlert } from '@/composables/useAlert'
import { useAuth } from '@/stores/auth'
import { useSettingsRealtime } from '@/composables/settings/useSettingsRealtime'
import { useEchoResync } from '@/composables/useEcho'
import type { SettingEntry } from '@/api/types'
import { lookupDotted } from '@/utils/settingsI18n'
import { settingsGroupFromRoute, settingsGroupLabelKey } from '@/utils/settingsGroup'

const route = useRoute()
const { t, tm, rt } = useI18n()
const { fetchGroup, settings, loading, saving, saveGroup, error } = useSettings()
const { success: showSuccess, error: showError } = useAlert()
const { user, hasPermission } = useAuth()

const canManage = computed(() => hasPermission('manage settings'))

const group = computed(() => settingsGroupFromRoute(route))

const groupLabel = computed(() => t(settingsGroupLabelKey(group.value || 'platform')))

const fieldsTree = computed(() => tm('web.settings.fields'))
const hintsTree = computed(() => tm('web.settings.hints'))
const optionsTree = computed(() => tm('web.settings.options'))

function fieldLabel(key: string): string {
  return lookupDotted(fieldsTree.value, key, rt) ?? key
}

function fieldHint(key: string): string | null {
  return lookupDotted(hintsTree.value, key, rt)
}

function fieldMetaHint(key: string, entry: SettingEntry): string {
  const human = fieldHint(key)
  const meta = `${key} · ${t('web.settings.source', { source: entry.source })}`
  return human ? `${human} — ${meta}` : meta
}

function optionLabel(key: string, opt: string): string {
  return lookupDotted(optionsTree.value, `${key}.${opt}`, rt) ?? opt
}

function selectOptions(key: string, opts: string[]): SelectOption[] {
  return opts.map((opt) => ({ value: opt, label: optionLabel(key, opt) }))
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

function setNum(key: string, val: string | number): void {
  form.value[fieldId(key)] = Number(val)
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
      payload[id] = val.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
    } else if (entry.type === 'int') {
      payload[id] = parseInt(String(val), 10)
    } else if (entry.type === 'float') {
      payload[id] = parseFloat(String(val))
    } else if (entry.type === 'bool') {
      payload[id] = val ? 1 : 0
    } else {
      payload[id] = String(val ?? '')
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

useEchoResync(() => { void loadGroup() })
</script>

<template>
  <Card :title="groupLabel">
    <template #actions>
      <router-link class="btn btn-outline-secondary btn-sm" :to="{ name: 'settings.index.view' }">
        <i class="bi bi-arrow-left me-1"></i> {{ t('web.settings.back') }}
      </router-link>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">{{ t('ui.loading') }}</span>
      </div>
    </div>

    <div v-else>
      <div v-if="user && !canManage" class="alert alert-info">
        {{ t('web.settings.read_only') }}
      </div>

      <form v-if="canManage" @submit.prevent="handleSubmit">
        <template v-for="[key, entry] in entries" :key="key">
          <FormCheckbox
            v-if="entry.type === 'bool'"
            :name="fieldId(key)"
            :label="fieldLabel(key)"
            switch
            :model-value="boolVal(key)"
            :hint="fieldMetaHint(key, entry)"
            @update:model-value="setBool(key, $event)"
          />

          <FormTextarea
            v-else-if="entry.type === 'array'"
            :name="fieldId(key)"
            :label="fieldLabel(key)"
            :model-value="strVal(key)"
            :hint="fieldMetaHint(key, entry)"
            :rows="2"
            @update:model-value="setStr(key, $event)"
          />

          <FormSelect
            v-else-if="entry.options && entry.options.length > 0"
            :name="fieldId(key)"
            :label="fieldLabel(key)"
            :model-value="selectVal(key)"
            :options="selectOptions(key, entry.options)"
            :hint="fieldMetaHint(key, entry)"
            @update:model-value="setSelect(key, $event)"
          />

          <FormInput
            v-else-if="entry.type === 'int' || entry.type === 'float'"
            :name="fieldId(key)"
            :label="fieldLabel(key)"
            type="number"
            :step="entry.type === 'float' ? '0.01' : '1'"
            :model-value="numVal(key)"
            :hint="fieldMetaHint(key, entry)"
            @update:model-value="setNum(key, $event)"
          />

          <FormInput
            v-else
            :name="fieldId(key)"
            :label="fieldLabel(key)"
            type="text"
            :model-value="strVal(key)"
            :hint="fieldMetaHint(key, entry)"
            @update:model-value="setStr(key, $event)"
          />
        </template>

        <SubmitButton :label="t('actions.save')" :loading="saving" variant="primary" />
      </form>

      <dl v-else-if="user" class="row mb-0">
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
