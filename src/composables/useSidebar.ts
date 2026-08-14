import { ref } from 'vue'
import { OverlayScrollbars } from 'overlayscrollbars'

/**
 * Sidebar collapse state — replaces AdminLTE's data-lte-toggle="sidebar".
 * On desktop: toggles .sidebar-collapse (shrinks sidebar to icons-only or hidden).
 * On mobile: toggles .sidebar-open (slides sidebar in/out).
 */
const collapsed = ref(false)
const mobileOpen = ref(false)

let osInstance: OverlayScrollbars | null = null

function isMobile(): boolean {
  return window.matchMedia('(max-width: 991.98px)').matches
}

function applyBodyClasses(): void {
  const body = document.body
  if (isMobile()) {
    body.classList.remove('sidebar-collapse')
    body.classList.toggle('sidebar-open', mobileOpen.value)
  } else {
    body.classList.remove('sidebar-open')
    body.classList.toggle('sidebar-collapse', collapsed.value)
  }
}

function scrollbarTheme(): 'os-theme-dark' | 'os-theme-light' {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark'
    ? 'os-theme-dark'
    : 'os-theme-light'
}

function initOverlayScrollbars(): void {
  destroyOverlayScrollbars()
  const wrapper = document.querySelector<HTMLElement>('.sidebar-wrapper')
  if (!wrapper || isMobile()) return

  osInstance = OverlayScrollbars(wrapper, {
    scrollbars: {
      theme: scrollbarTheme(),
      autoHide: 'leave',
      clickScroll: true,
    },
  })
}

function syncOverlayScrollbarTheme(): void {
  osInstance?.options({
    scrollbars: { theme: scrollbarTheme() },
  })
}

function destroyOverlayScrollbars(): void {
  osInstance?.destroy()
  osInstance = null
}

export function useSidebar() {
  function toggle(): void {
    if (isMobile()) {
      mobileOpen.value = !mobileOpen.value
    } else {
      collapsed.value = !collapsed.value
    }
    applyBodyClasses()
  }

  function closeMobile(): void {
    if (isMobile() && mobileOpen.value) {
      mobileOpen.value = false
      applyBodyClasses()
    }
  }

  function init(): void {
    applyBodyClasses()
    initOverlayScrollbars()
  }

  return {
    collapsed,
    mobileOpen,
    toggle,
    closeMobile,
    init,
    syncOverlayScrollbarTheme,
    destroyOverlayScrollbars,
  }
}
