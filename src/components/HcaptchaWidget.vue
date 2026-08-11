<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  siteKey?: string
}>()

const emit = defineEmits<{
  verified: [token: string]
  error: [error: Error]
}>()

const widgetContainer = ref<HTMLElement | null>(null)
const widgetId = ref<string | null>(null)
const token = ref<string>('')
const errored = ref(false)

const resolvedSiteKey = props.siteKey ?? import.meta.env.VITE_HCAPTCHA_SITE_KEY ?? ''

let scriptLoaded = false

function loadScript(): void {
  if (scriptLoaded || typeof window === 'undefined') return
  if (document.querySelector('script[src*="js.hcaptcha.com"]')) {
    scriptLoaded = true
    return
  }
  const script = document.createElement('script')
  script.src = 'https://js.hcaptcha.com/1/api.js?onload=onHcaptchaApiLoad&render=explicit'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
  scriptLoaded = true
}

function renderWidget(): void {
  if (!widgetContainer.value || !resolvedSiteKey) return
  const hcaptcha = (window as any).hcaptcha
  if (typeof hcaptcha === 'undefined') return

  widgetId.value = hcaptcha.render(widgetContainer.value, {
    sitekey: resolvedSiteKey,
    size: 'invisible',
    callback: (t: string) => {
      token.value = t
      errored.value = false
      emit('verified', t)
    },
    'error-callback': () => {
      errored.value = true
      emit('error', new Error('hCaptcha challenge failed'))
    },
  })
}

function execute(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (token.value) {
      resolve(token.value)
      return
    }
    const hcaptcha = (window as any).hcaptcha
    if (!widgetId.value || typeof hcaptcha === 'undefined') {
      reject(new Error('hCaptcha not ready'))
      return
    }
    const handler = {
      resolve: (t: string) => {
        resolve(t)
      },
      reject: (e: Error) => {
        reject(e)
      },
    }
    pendingResolve = handler.resolve
    pendingReject = handler.reject
    hcaptcha.execute(widgetId.value)
  })
}

let pendingResolve: ((t: string) => void) | null = null
let pendingReject: ((e: Error) => void) | null = null

function reset(): void {
  token.value = ''
  errored.value = false
  const hcaptcha = (window as any).hcaptcha
  if (widgetId.value && typeof hcaptcha !== 'undefined') {
    hcaptcha.reset(widgetId.value)
  }
}

defineExpose({ execute, reset, token })

onMounted(() => {
  if (!resolvedSiteKey) return
  loadScript()
  const check = setInterval(() => {
    const hcaptcha = (window as any).hcaptcha
    if (typeof hcaptcha !== 'undefined') {
      clearInterval(check)
      renderWidget()
    }
  }, 200)
  setTimeout(() => clearInterval(check), 10000)
})

onBeforeUnmount(() => {
  const hcaptcha = (window as any).hcaptcha
  if (widgetId.value && typeof hcaptcha !== 'undefined') {
    try { hcaptcha.reset(widgetId.value) } catch { /* noop */ }
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
