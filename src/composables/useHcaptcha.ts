import { computed, ref } from 'vue'

export interface HcaptchaExpose {
  execute: () => Promise<string>
  reset: () => void
  token: { value: string }
}

export function useHcaptcha() {
  const widget = ref<HcaptchaExpose | null>(null)
  const enabled = computed(() => Boolean(import.meta.env.VITE_HCAPTCHA_SITE_KEY))

  async function captchaToken(): Promise<string | undefined> {
    if (!enabled.value) return undefined
    if (!widget.value) {
      throw new Error('hCaptcha not ready')
    }
    return widget.value.execute()
  }

  function resetCaptcha(): void {
    widget.value?.reset()
  }

  return { widget, enabled, captchaToken, resetCaptcha }
}
