<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  siteKey?: string
}>()

const emit = defineEmits<{
  verified: [token: string]
  error: [error: Error]
}>()

const widgetContainer = ref<HTMLElement | null>(null)
const widgetId = ref<string | null>(null)
const token = ref('')
const errored = ref(false)

const resolvedSiteKey = props.siteKey ?? import.meta.env.VITE_HCAPTCHA_SITE_KEY ?? ''

let pendingResolve: ((value: string) => void) | null = null
let pendingReject: ((error: Error) => void) | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let pollTimeout: ReturnType<typeof setTimeout> | null = null

function clearPending(): void {
  pendingResolve = null
  pendingReject = null
}

function resolvePending(value: string): void {
  pendingResolve?.(value)
  clearPending()
}

function failPending(error: Error): void {
  pendingReject?.(error)
  clearPending()
}

function renderWidget(): void {
  if (!widgetContainer.value || !resolvedSiteKey || widgetId.value) return
  const hcaptcha = (window as unknown as { hcaptcha?: { render: Function; execute: Function; reset: Function } }).hcaptcha
  if (typeof hcaptcha === 'undefined') return

  widgetId.value = hcaptcha.render(widgetContainer.value, {
    sitekey: resolvedSiteKey,
    size: 'invisible',
    callback: (value: string) => {
      token.value = value
      errored.value = false
      emit('verified', value)
      resolvePending(value)
    },
    'error-callback': () => {
      errored.value = true
      const error = new Error('hCaptcha challenge failed')
      emit('error', error)
      failPending(error)
    },
    'close-callback': () => {
      failPending(new Error('hCaptcha challenge closed'))
    },
    'chalexpired-callback': () => {
      failPending(new Error('hCaptcha challenge expired'))
    },
  }) as string
}

function loadScript(): void {
  if (typeof window === 'undefined') return
  window.onHcaptchaApiLoad = () => {
    renderWidget()
  }
  if (document.querySelector('script[src*="js.hcaptcha.com"]')) {
    renderWidget()
    return
  }
  const script = document.createElement('script')
  script.src = 'https://js.hcaptcha.com/1/api.js?onload=onHcaptchaApiLoad&render=explicit'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

function execute(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (token.value) {
      resolve(token.value)
      return
    }
    const hcaptcha = (window as unknown as { hcaptcha?: { execute: (id: string) => void } }).hcaptcha
    if (!widgetId.value || typeof hcaptcha === 'undefined') {
      reject(new Error('hCaptcha not ready'))
      return
    }
    pendingResolve = resolve
    pendingReject = reject
    try {
      hcaptcha.execute(widgetId.value)
    } catch (e) {
      failPending(e instanceof Error ? e : new Error('hCaptcha execute failed'))
    }
  })
}

function reset(): void {
  token.value = ''
  errored.value = false
  const hcaptcha = (window as unknown as { hcaptcha?: { reset: (id: string) => void } }).hcaptcha
  if (widgetId.value && typeof hcaptcha !== 'undefined') {
    hcaptcha.reset(widgetId.value)
  }
}

defineExpose({ execute, reset, token })

onMounted(() => {
  if (!resolvedSiteKey) return
  loadScript()
  pollTimer = setInterval(() => {
    if (typeof (window as unknown as { hcaptcha?: unknown }).hcaptcha !== 'undefined') {
      if (pollTimer) clearInterval(pollTimer)
      pollTimer = null
      renderWidget()
    }
  }, 200)
  pollTimeout = setTimeout(() => {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  }, 10_000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (pollTimeout) clearTimeout(pollTimeout)
  const hcaptcha = (window as unknown as { hcaptcha?: { reset: (id: string) => void } }).hcaptcha
  if (widgetId.value && typeof hcaptcha !== 'undefined') {
    try {
      hcaptcha.reset(widgetId.value)
    } catch {
      /* noop */
    }
  }
})
</script>

<template>
  <div
    v-if="resolvedSiteKey"
    class="hcaptcha-field"
    data-form-field="h-captcha-response"
  >
    <div ref="widgetContainer" class="visually-hidden"></div>
  </div>
</template>
