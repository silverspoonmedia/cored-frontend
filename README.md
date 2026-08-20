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
- **Valkivid3** (Tailwind v4, scoped entry `src/valkivid3/`) — public vTual at `/vtual` (landing: Swiper hero slider + live-now strip + countdown event + platform stats + directory + `#contents` feed + upcoming-schedule events + claim banner, all fed by one `useVtualPublic().fetchLanding()` call plus the directory/feed components' own fetches) and `/vtual/vtubers/:slug` (guest profile: banner overlay, `VkStr1ProfileSidebar` / `VkStr1DetailsList` / `VkStr1ChannelCard`, featured live + **paginated** video grid with Prev/Next pager — `contents: { items, pagination }`, `fetchProfile(slug, page)`). Components live under `src/valkivid3/{layouts,components,composables,views,assets}`. The CSS entry (`src/valkivid3/assets/css/valkivid3.css`) is imported **only** by `VkStr1Layout.vue` (lazy route chunk), ships **no Tailwind preflight** (a global reset would destroy Bootstrap), and nests `@tailwind utilities` under `.vk3-root` so they compile as `.vk3-root .mb-3` (cannot restyle AdminLTE after the chunk stays loaded). Do not use `@import … important(.vk3-root)` — Tailwind 4.3 emits a fake `@media important(...)` that Vite/lightningcss rejects. `dark:` is a **class** variant (`@custom-variant dark (&:where(.dark, .dark *));`) so the header switcher (`html.dark` + `str1-color-theme`, sun/moon sprite icons in header + mobile menu) actually works — switcher track carries explicit `bg-gray-150 border-gray-500/60 dark:bg-white/10 dark:border-white/50` so the pill stays visible on the always-dark header, icons use `fill-accent stroke-accent` (both utilities compile). Default theme is dark when storage is empty, and an inline `index.html` head script restores `html.dark` before first paint (no light FOUC; inert for `/apps/*` since utilities are `.vk3-root`-scoped). Leaving `/vtual` removes `html.dark` (AdminLTE uses `data-bs-theme` / `lte-theme` — leave it alone). **Scoping caveat:** because `@tailwind utilities` is nested under `.vk3-root`, every utility compiles as a **descendant** selector (`.vk3-root .bg-white`). Utilities placed ON the `.vk3-root` element itself (e.g. `<div class="vk3-root bg-white dark:bg-gray-900">`) never match — `.vk3-root.bg-white` is not `.vk3-root .bg-white`. Page background, root text color, and min-height therefore live in `@layer base` on `.vk3-root` / `.dark .vk3-root`, not as utility classes on the layout div. Put presentation utilities on children, not on `.vk3-root` itself. **Theme palette (light/dark fork):** the str1 skin uses a steel-slate silver identity (not the original Valkivid violet/cyan). Because one accent value cannot serve both backgrounds, every brand var forks per mode in `@layer base`: `--color-primary`/`--color-accent` are `#475569` (slate-600) light / `#94a3b8` (slate-400) dark, `--color-primary-500` (hover) is `#334155` (slate-700) light / `#cbd5e1` (slate-300) dark, and the root body text color forks `#7a809b` (gray-500) light / `#a3a9c1` (gray-DEFAULT) dark. Do NOT collapse these back to a single value — light mode previously reused the dark accent/body gray (`#94a3b8`/`#a3a9c1` on white ≈ 2.3–2.6:1 contrast) which washed out all brand text; the deep-slate light fork keeps WCAG ≥ 7:1 on white. **Button convention:** because accent/primary now fork dark-in-light/bright-in-dark, button LABELS fork the opposite way — `bg-accent` CTAs use `text-white dark:text-gray-900`, and `bg-primary` CTAs/badges/avatars use `text-white dark:text-gray-900`. Hover forks per variant: `bg-primary` CTAs use `hover:bg-primary-500` (the `--color-primary-500` shade, already forked per-mode — slate-700 light / slate-300 dark, always distinct from primary), while `bg-accent` CTAs use `hover:bg-accent-500` via a dedicated `--color-accent-500` token (slate-700 light / **slate-200** dark) — do NOT reuse `hover:bg-primary-500` on accent buttons, because `--color-primary-500` dark == `--color-accent` dark (both slate-300), so dark-mode accent hover would be a no-op. Outline (ring) buttons no longer invert white↔gray-900 on hover (that was a 17.87:1 full invert); they soft-fill `hover:bg-slate-500` light / `dark:hover:bg-slate-400` dark (the banner's always-dark outline uses plain `hover:bg-slate-400`), keeping the base ring + label color. Scoped unlayered wrappers with `!important` live in `valkivid3.css`: `.vk3-root .bg-primary` (Bootstrap ships an unlayered `.bg-primary` blue `#0d6efd` that loads after this chunk and otherwise wins), `.vk3-root .hover:bg-primary-500:hover`, `.vk3-root .hover:bg-accent(-500):hover`, `.vk3-root .hover:bg-slate-400/500:hover` (slate-* are not port `@theme` tokens, so the hex is inlined in the wrapper); plus `.dark .vk3-root .dark\:text-gray-900 { color: var(--color-gray-900) !important }` so the existing unlayered `.text-white` override doesn't keep dark-mode labels white on the bright accent/primary backgrounds. The hero slider mimics the original Valkivid str1 (Swiper **core + `Autoplay`/`EffectFade`/`Navigation`/`Pagination` modules** — not `swiper/bundle` — fade, 3 slides, staggered entrance animations with `vv-slide-played` replay, vertical bar pagination `.vv-hero-swiper-pagination`, width `1320px`); other content width stays `1360px`. **Hero control placement/color:** the str1 controls (pagination `.vv-hero-swiper-pagination` + prev/next nav) hang 64px outside the container via `-right-16` in the original; the port gates that offset to `2xl` (its 1360px breakpoint ≈ container width), so below ~1360px the controls sit inside the container instead of dangling off-canvas on small/medium monitors, while at ≥1360px the viewport is wide enough to hold the 64px overhang without any compensating padding (hero keeps its full width — do NOT add `2xl:px-16` to the wrapper; that shrinks the hero content). The nav arrows + pagination fork color per ACTIVE-SLIDE tone at ≥992px (`lg`, where the nav chip bg goes transparent), not per global mode — because slides 2/3 stay `bg-gray-900` dark in BOTH modes, so a light-mode-only fork would leave a `gray-900` arrow invisible on those dark slides. `VkStr1HeroSlider` resolves the active slide's effective tone into `data-tone` on the hero container (`light` only for slide-1, `dark` otherwise; slides 2/3 are always dark) via Swiper `slideChange`. `valkivid3.css` then forks: arrows default white and only go `gray-900` under `html:not(.dark) .vk3-root [data-tone='light']` (the `html:` prefix is required — a bare `:not(.dark)` matches any non-dark ancestor like body, so it would still match in dark mode); the pagination track goes bright (`white/25`) on dark slides vs darker (`gray-500/35`) on slide-1 light, and the active bullet re-asserts the solid accent on slide-1 light but uses slate-300 on dark slides in light mode (the light accent slate-600 is too dim on `bg-gray-900`). All are unlayered scoped rules with `!important` because an unlayered vendor rule otherwise outranks the selectors (same pattern as the swiper pagination overrides). Below xl the `bg-gray-900` chip keeps the arrow white regardless. The skin also pins `color-scheme` (`.vk3-root { color-scheme: light }` / `.dark .vk3-root { color-scheme: dark }`) so AdminLTE's `data-bs-theme="dark"` on `<html>` doesn't bleed dark scrollbars/controls into Valkivid light mode. Routes opt in via `meta.template: 'valkivid3'`; `App.vue` then sets `body.vk3-page` instead of the AdminLTE classes. Unmatched `/vtual/*` still rewrites to `/apps/vtual/*` (`LEGACY_APP_ROOTS`); only registered children stay public.

**vTual public performance/data notes.** `useVtualPublic()` wraps every guest fetch in a module-level stale-while-revalidate `Map` (TTL 60s, mirroring the BFF edge cache) with in-flight dedup, so back/forward navigation renders instantly from cache while revalidating. Directory cards prefetch the profile on hover (`prefetchProfile`) into the same cache the show view reads. Directory, content feed, and the guest profile render `animate-pulse` skeletons (not spinner-only) while loading. Every `<img>` carries `loading="lazy"`/`decoding="async"` (avatars/thumbnails) or `loading="eager"`/`fetchpriority="high"` (profile banner/avatar, above the fold). A failing landing payload surfaces a retry banner instead of silently dropping LiveNow/Stats/Events, and `landing.event` (settings-driven `vtual.landing.event.*`) renders the `VkStr1SectionCountdown` when present. Router `scrollBehavior` handles `#vtubers`/`#contents`/`#events` hash scrolling (`top: 96` offset) so nav anchors work SPA-side; in-page CTAs use `<router-link to="/vtual#…">`, never raw `href="#…"`. Content cards (`VkStr1VideoCard`, used by the feed and the guest profile) lead with the originating channel avatar as a dedicated left column (`w-12` rounded, fallback to an initial disc), with the publish date and creator link stacked in the column beside it. The card is hardened: the truncated title carries a `:title` tooltip showing the full text on hover; the thumbnail uses an aspect-ratio container (`aspect-[370/215]`, `aspect-[77/46]` when featured) with the image as `absolute inset-0 object-cover` so the box stays constant for any source ratio; and a `thumbFailed` ref driven by `@error` reveals a permanent underlay placeholder (no element swap, no reflow) when the thumbnail is broken or `thumbnail_url` is null, reset via `watch` when `thumbnail_url` changes (pagination reuses the component).

**Unified live directory.** `VkStr1VtuberLiveDirectory.vue` merges the directory with live status: it is the self-fetching directory grid (search, pagination, skeleton, hover prefetch) plus a `liveItems` prop fed from `landing.live_now`. Live streams are grouped per `creator.slug` (LiveNow-style) and matched to each card via `is_live` / the slug map — a live card shows a danger-ringed avatar, a LIVE badge, and up to 3 active stream rows (external `<a target="_blank">`, rendered outside the profile `router-link` to avoid nested interactives) with a `+N more` footer. A live card with no matching stream rows falls back to a single `live_now.active` line. The standalone `VkStr1LiveNow.vue` and `VkStr1VtuberDirectory.vue` are kept unchanged as references.

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
