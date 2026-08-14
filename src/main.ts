import './assets/main.css'

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

// Apply theme before mount to prevent FOUC (matches Monolith's theme-scroll.js).
initTheme()
applyHtmlLang()

const app = createApp(App)

app.use(router)
app.use(i18n)

// router.isReady() resolves after the first navigation completes, which
// includes the beforeEach guard that hydrates auth via GET auth/me (cookie).
// This ensures components mount with auth already populated.
router.isReady().then(() => {
  app.mount('#app')
})
