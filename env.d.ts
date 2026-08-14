/// <reference types="vite/client" />

declare module 'bootstrap'
declare module 'select2'

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_PUSHER_APP_KEY: string
  readonly VITE_PUSHER_APP_CLUSTER: string
  readonly VITE_PUSHER_HOST: string
  readonly VITE_PUSHER_PORT: string
  readonly VITE_PUSHER_SCHEME: string
  readonly VITE_HCAPTCHA_SITE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Select2AjaxSettings {
  url?: string
  dataType?: string
  delay?: number
  headers?: Record<string, string>
  beforeSend?: (xhr: JQuery.jqXHR) => void
  data?: (params: { term?: string; page?: number }) => Record<string, unknown>
  processResults?: (data: unknown) => {
    results: Array<{ id: string | number; text: string }>
    pagination: { more: boolean }
  }
}

interface Select2Options {
  theme?: string
  width?: string
  allowClear?: boolean
  placeholder?: string
  minimumInputLength?: number
  ajax?: Select2AjaxSettings
}

interface JQuery {
  select2(options?: Select2Options): JQuery
  select2(method: 'destroy' | 'open' | 'close'): JQuery
  select2(method: 'data'): unknown
  select2(method: 'val'): unknown
}

interface Window {
  jQuery: typeof jQuery
  $: typeof $
  onHcaptchaApiLoad?: () => void
}
