import './assets/main.css'
import 'sweetalert2/dist/sweetalert2.min.css'

// Bootstrap 5 JS bundle (includes Popper) — enables data-bs-toggle="dropdown"
// and other data-attribute APIs without jQuery.
import * as bootstrap from 'bootstrap'
;(window as any).bootstrap = bootstrap

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { applyHtmlLang } from './i18n'
import { initTheme } from '@/composables/useTheme'
import { showErrorDialog } from '@/lib/swal'

// Apply theme before mount to prevent FOUC (matches Monolith's theme-scroll.js).
initTheme()
applyHtmlLang()

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
  void showErrorDialog(i18n.global.t('ui.ajax.unexpected_error'))
})

// router.isReady() resolves after the first navigation completes, which
// includes the beforeEach guard that hydrates auth via GET auth/me (cookie).
// This ensures components mount with auth already populated.
app.mount('#app')

router.isReady().catch((error) => {
  console.error('Initial router navigation failed', error)
})
