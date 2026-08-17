# monolith-vue-workers

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Localization

Supported locales: `en` (reference/source), `id`, and `ja`. Locale files live in `src/i18n/locales/` and use `vue-i18n` keys.

Every translation change must update all three locale files in one change. Translate contextually, not literally: review surface (button, heading, table, status, toast, validation, error, or explanatory copy), audience, domain glossary, placeholders, plural rules, and Indonesian/Japanese register. Preserve technical identifiers and English machine-contract prompts when they are not user-facing. Split keys when one phrase needs different contexts.

Run localization guards before review:

```sh
npm run check:i18n
```

The checker validates locale key parity, Vue interpolation placeholders, malformed braces, suspicious English duplicates, and suspicious hardcoded user-facing fallback copy. Duplicate warnings need human review; product names, technical terms, codes, and machine-contract strings may remain unchanged.

Use `computed()` or active i18n translators for labels and option arrays that must update after runtime locale switching. Format user-facing numbers and dates with `Intl.NumberFormat` / `Intl.DateTimeFormat` and the active locale. API messages take priority; fallback errors must use locale keys.

`useI18n()` only works inside Vue component `setup()` (or composables called synchronously from setup). Router guards, stores, shell hydration, realtime callbacks, and module-level services must import the shared `src/i18n` instance and call `i18n.global.t(...)`; otherwise initial navigation can fail with `Must be called at the top of a setup function`. `main.ts` reports router errors with `router.onError()` and mounts after `router.isReady()` so protected components render only after initial navigation and auth hydration complete. Generic transport fallbacks are centralized in `src/i18n/fallbacks.ts` and server messages remain preferred.

## Notifications & confirmations

All notifications and confirmations use Sweetalert2 through `src/lib/swal.ts` — never native `alert()`/`confirm()` or ad-hoc Bootstrap alert blocks:

- Notifications: call `useAlert()` (`success`/`error`/`info`). Success/info render as Swal toasts; errors render as a Swal error dialog.
- Confirmations: `confirmDialog({ title, text | html, confirmText, ... })` from `@/lib/swal` resolves `true` on confirm. Do not build `v-model` confirm components. `ConfirmModal.vue` remains only for the file-hosting rename form (an input dialog, not a yes/no confirm).
- Labels come from `ui.swal.*` / `ui.dialog.*` plus domain keys, in all three locales.
- `.swal2-container` is pinned to `z-index: 1090` (see `src/assets/monolith-overrides.css`) so dialogs always sit above Bootstrap modals (1050/1055) and other fixed layers (1080).
- Modals close any open toast first (`closeActiveToast()` in `src/lib/swal.ts`) — swal2 otherwise strips the toast body class when a modal closes and the toast balloons to full width. Never call raw `Swal.fire` modals outside this helper.
- Never assign `document.body.className = ''`. Swal stores `swal2-toast-shown` on `<body>`; wiping it (e.g. from `App.vue` after a child `onMounted` toast) turns the toast into a full-width banner. Toggle layout classes via `classList` only. CSS also pins toast container size via `.swal2-container:has(.swal2-popup.swal2-toast)`.
- `useAlert().error(...)` returns a Promise: `await showError(...)` before any `window.location.href = ...` redirect (OAuth connect, downloads) so the dialog survives instead of being unloaded with the page.

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
