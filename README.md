# monolith-vue-workers

Leading Vue 3 SPA for the Monolith `/api/v1/*` API. Deployed to Cloudflare Workers: static assets plus a small BFF isolate on `/api/*` that mints an HttpOnly `spa_jwt` cookie and reverse-proxies to Laravel.

Blade in the Monolith repo stays as the in-repo reference. Do not store JWTs in JavaScript. Integration contract: Monolith `docs/integration/vue-workers-spa.md`.

## Architecture

```
Browser (SPA origin)
  → static HTML/JS/CSS (no Worker invocation)
  → same-origin /api/v1/*  → Worker (spa_jwt → Bearer, X-SPA-Origin: 1)
       → MONOLITH_API_ORIGIN /api/v1/*
```

`VITE_API_BASE_URL` must stay **empty**. An absolute API URL bypasses the Worker: hostname leak and no `spa_jwt`.

## Template namespaces

Two CSS systems coexist, kept strictly separate:

- **AdminLTE4** (Bootstrap 5, global `src/assets/main.css`) — the authenticated app shell under `/apps/*` and auth pages. `body` gets `layout-fixed`/`login-page` classes.
- **Valkivid3** (Tailwind v4, scoped entry `src/valkivid3/`) — public vTual at `/vtual` (landing: Swiper hero slider + live-now strip + countdown event + platform stats + directory + `#contents` feed + upcoming-schedule events + claim banner, all fed by one `useVtualPublic().fetchLanding()` call plus the directory/feed components' own fetches) and `/vtual/vtubers/:slug` (guest profile: banner overlay, `VkStr1ProfileSidebar` / `VkStr1DetailsList` / `VkStr1ChannelCard`, featured live + **paginated** video grid with Prev/Next pager — `contents: { items, pagination }`, `fetchProfile(slug, page)`). Components live under `src/valkivid3/{layouts,components,composables,views,assets}`. The CSS entry (`src/valkivid3/assets/css/valkivid3.css`) is imported **only** by `VkStr1Layout.vue` (lazy route chunk), ships **no Tailwind preflight** (a global reset would destroy Bootstrap), and nests `@tailwind utilities` under `.vk3-root` so they compile as `.vk3-root .mb-3` (cannot restyle AdminLTE after the chunk stays loaded). Do not use `@import … important(.vk3-root)` — Tailwind 4.3 emits a fake `@media important(...)` that Vite/lightningcss rejects. `dark:` is a **class** variant (`@custom-variant dark (&:where(.dark, .dark *));`) so the header switcher (`html.dark` + `str1-color-theme`, sun/moon sprite icons in header + mobile menu) actually works — switcher track carries explicit `bg-gray-150 border-gray-500/60 dark:bg-white/10 dark:border-white/50` so the pill stays visible on the always-dark header, icons use `fill-accent stroke-accent` (both utilities compile). Default theme is dark when storage is empty, and an inline `index.html` head script restores `html.dark` before first paint (no light FOUC; inert for `/apps/*` since utilities are `.vk3-root`-scoped). Leaving `/vtual` removes `html.dark` (AdminLTE uses `data-bs-theme` / `lte-theme` — leave it alone). **Scoping caveat:** because `@tailwind utilities` is nested under `.vk3-root`, every utility compiles as a **descendant** selector (`.vk3-root .bg-white`). Utilities placed ON the `.vk3-root` element itself (e.g. `<div class="vk3-root bg-white dark:bg-gray-900">`) never match — `.vk3-root.bg-white` is not `.vk3-root .bg-white`. Page background, root text color, and min-height therefore live in `@layer base` on `.vk3-root` / `.dark .vk3-root`, not as utility classes on the layout div. Put presentation utilities on children, not on `.vk3-root` itself. The hero slider mimics the original Valkivid str1 (Swiper fade, 3 slides, staggered entrance animations with `vv-slide-played` replay, vertical bar pagination `.vv-hero-swiper-pagination`, width `1320px`); other content width stays `1360px`. Routes opt in via `meta.template: 'valkivid3'`; `App.vue` then sets `body.vk3-page` instead of the AdminLTE classes. Unmatched `/vtual/*` still rewrites to `/apps/vtual/*` (`LEGACY_APP_ROOTS`); only registered children stay public.

Never import `valkivid3.css` (or `main.css`) from the other namespace; the two bundles must stay loadable in the same DOM without conflicts.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite + the same Worker BFF locally (`http://localhost:5173`) |
| `npm run type-check` | `vue-tsc --build` |
| `npm run check:i18n` | Locale key/placeholder parity + hardcoded-copy heuristics |
| `npm test` | Vitest (Worker BFF helpers + notification deep-link resolver) |
| `npm run build` | Type-check + production build |
| `npm run build-only` | Vite production build |
| `npm run preview` | Build + `wrangler dev` |
| `npm run deploy` | Build + `wrangler deploy` |

CI (GitHub Actions): `type-check` → `check:i18n` → `test` → `build-only`.

## Setup

```sh
npm install
cp .env.example .env
cp .dev.vars.example .dev.vars
```

Set `MONOLITH_API_ORIGIN` in `.dev.vars` (Worker-only, not bundled). Leave `VITE_API_BASE_URL=""`. Set Monolith `SPA_URL="http://localhost:5173"`.

## Environment

| Var | Where | Bundled? | Notes |
|-----|--------|----------|--------|
| `MONOLITH_API_ORIGIN` | Wrangler `vars` / `.dev.vars` | No | Laravel origin, no `/api/v1`, no trailing slash. Must match Monolith `APP_URL` origin or signed email-verify links fail HMAC. Empty → Worker 503. |
| `VITE_API_BASE_URL` | `.env` | Yes | Must be empty |
| `VITE_HCAPTCHA_SITE_KEY` | `.env` | Yes | Public sitekey; empty = no widget. Pair with Monolith `platform.hcaptcha.enabled` |
| `VITE_PUSHER_*` | `.env` | Yes | Echo; empty key = poll fallback. Mirror Monolith `PUSHER_*` literals |

Discord return is **not** a Vite var. Set Monolith `SPA_URL` to this SPA’s public origin.

## Production checklist

On **Monolith** (`APP_ENV=production`):

1. `SPA_URL` = public Vue-Workers origin (no trailing slash). Empty keeps Blade/API URLs for local Blade dogfood.
2. `APP_URL` origin = Worker `MONOLITH_API_ORIGIN` (signed verify HMAC).
3. hCaptcha: Settings on **and** `VITE_HCAPTCHA_SITE_KEY` set, or both off.
4. File Hosting bucket / Gateway CORS includes the SPA origin and **exposes `ETag`**.
5. Pusher or Sockudo: `PUSHER_*` on Laravel + matching `VITE_PUSHER_*` in the SPA build.

On **Vue-Workers**:

1. `wrangler.jsonc` `vars.MONOLITH_API_ORIGIN` is the production API host.
2. Custom domain on the Worker; `npm run deploy`.
3. `VITE_API_BASE_URL` empty in the build env.
4. Static security headers live in `public/_headers` (CSP, frame deny). Worker JSON responses also stamp `X-Content-Type-Options` / `Referrer-Policy` / `Permissions-Policy`. Do **not** widen `run_worker_first` past `/api/*`.

When `SPA_URL` is set, Laravel mints password-reset, email-verify, public share, and iPaymu hosted return/cancel URLs onto the SPA. Email verify signs the **API** route (HMAC on `APP_URL`); the browser lands on `/verify-email/{id}/{hash}?expires=&signature=` and the SPA GETs the API through the Worker.

Login and register honor `?redirect=` via `src/lib/safeRedirect.ts` (`safeInternalRedirect`): internal paths only (`/` prefix; reject `//`, `\`, `://`, `/http:`). Used by the public vTual claim CTA (`/login?redirect=/apps/vtual/vtubers/{slug}/claim`) so signup from `/vtual` does not dump people on the dashboard.

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
- Text input prompts: `inputDialog({ title, required?, confirmText?, danger? })` from `@/lib/swal` replaces native `prompt()` and resolves the trimmed string or `null` on cancel. `required: true` blocks an empty confirm. Used by the product-activation reject/suspend reason prompts.
- Labels come from `ui.swal.*` / `ui.dialog.*` plus domain keys, in all three locales.
- `.swal2-container` is pinned to `z-index: 1090` (see `src/assets/monolith-overrides.css`) so dialogs always sit above Bootstrap modals (1050/1055) and other fixed layers (1080).
- Modals close any open toast first (`closeActiveToast()` in `src/lib/swal.ts`) — swal2 otherwise strips the toast body class when a modal closes and the toast balloons to full width. Never call raw `Swal.fire` modals outside this helper.
- Never assign `document.body.className = ''`. Swal stores `swal2-toast-shown` on `<body>`; wiping it (e.g. from `App.vue` after a child `onMounted` toast) turns the toast into a full-width banner. Toggle layout classes via `classList` only. CSS also pins toast container size via `.swal2-container:has(.swal2-popup.swal2-toast)`.
- `useAlert().error(...)` returns a Promise: `await showError(...)` before any `window.location.href = ...` redirect (OAuth connect, downloads) so the dialog survives instead of being unloaded with the page.
- Uncaught Vue errors and router failures go through `app.config.errorHandler` / `router.onError()` to the same error dialog (`ui.ajax.unexpected_error`).
