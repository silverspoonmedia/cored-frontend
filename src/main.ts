import 'sweetalert2/dist/sweetalert2.min.css'

// Bootstrap 5 JS — only plugins with actual consumers in this SPA:
// Dropdown (data-bs-toggle="dropdown"), Modal (Modal.vue + data-bs-dismiss).
// Includes Popper (needed by Dropdown).
import { Dropdown, Modal } from 'bootstrap'
;(window as any).bootstrap = { Dropdown, Modal }

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { applyHtmlLang, isRtl } from './i18n'
import { initTheme } from '@/composables/useTheme'
import { showErrorDialog } from '@/lib/swal'
import { markChunkLoadFailed } from '@/composables/useChunkLoadError'

// Apply theme before mount to prevent FOUC (matches Monolith's theme-scroll.js).
initTheme()
applyHtmlLang()

// Global CSS splits per direction: the RTL entry resolves Bootstrap/AdminLTE
// to their official RTL dist builds (see src/assets/main-rtl.css imports).
// Await it so the app never mounts unstyled.
if (isRtl()) {
  await import('./assets/main-rtl.css')
} else {
  await import('./assets/main-ltr.css')
}

const app = createApp(App)

app.use(router)
app.use(i18n)

app.config.errorHandler = (err, _instance, info) => {
  console.error('Vue error', err, info)
  void showErrorDialog(i18n.global.t('ui.ajax.unexpected_error'))
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection', event.reason)
  void showErrorDialog(i18n.global.t('ui.ajax.unexpected_error'))
})

router.onError((error, to, from) => {
  console.error('Router navigation failed', { error, to, from })
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  const isChunkLoad =
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  if (isChunkLoad) {
    markChunkLoadFailed()
  } else {
    void showErrorDialog(i18n.global.t('ui.ajax.unexpected_error'))
  }
})

// router.isReady() resolves after the first navigation completes, which
// includes the beforeEach guard that hydrates auth via GET auth/me (cookie).
// This ensures components mount with auth already populated.
app.mount('#app')

router.isReady().catch((error) => {
  console.error('Initial router navigation failed', error)
})
