# UI patterns

## Template namespaces

Two CSS systems coexist, kept strictly separate:

- **AdminLTE4** (Bootstrap 5, global `src/assets/main-ltr.css` / `src/assets/main-rtl.css`) — the authenticated app shell under `/apps/*` and auth pages. `body` gets `layout-fixed`/`login-page` classes. Page-level columns: one card at content root (no lone `col-lg-8`/`col-lg-6`); two cards use the same breakpoint (`col-lg-8` + `col-lg-4` default); a missing sibling expands the remaining cell to `col-12`. Nested field grids are not page shell.
- **Valkivid3** (Tailwind v4, scoped entry `src/valkivid3/`) — public vTual at `/vtual` (landing) and `/vtual/vtubers/:slug` (guest profile). Components live under `src/valkivid3/{layouts,components,composables,views,assets}`. The CSS entry (`src/valkivid3/assets/css/valkivid3.css`) is imported **only** by `VkStr1Layout.vue` (lazy route chunk), ships **no Tailwind preflight** (a global reset would destroy Bootstrap), and nests `@tailwind utilities` under `.vk3-root` so they compile as `.vk3-root .mb-3` (cannot restyle AdminLTE after the chunk stays loaded). Do not use `@import … important(.vk3-root)` — Tailwind 4.3 emits a fake `@media important(...)` that Vite/lightningcss rejects.

Never import `valkivid3.css` (or `main-ltr.css`/`main-rtl.css`) from the other namespace; the two bundles must stay loadable in the same DOM without conflicts.

### Valkivid3 mechanics (load-bearing details)

- `dark:` is a **class** variant (`@custom-variant dark (&:where(.dark, .dark *));`) so the header switcher (`html.dark` + `str1-color-theme`) works. Switcher track carries explicit `bg-gray-150 border-gray-500/60 dark:bg-white/10 dark:border-white/50`; icons use `fill-accent stroke-accent`. Default theme is dark when storage is empty; `initTheme()` restores `html.dark` before mount (no light FOUC; inert for `/apps/*` since utilities are `.vk3-root`-scoped). Leaving `/vtual` removes `html.dark` (AdminLTE uses `data-bs-theme` / `lte-theme` — leave it alone).
- **Scoping caveat:** utilities nest as **descendant** selectors (`.vk3-root .bg-white`), so utilities placed ON `.vk3-root` itself never match. Page background, root text color, and min-height live in `@layer base` on `.vk3-root` / `.dark .vk3-root`, not as utility classes on the layout div. Put presentation utilities on children.
- **Theme palette (light/dark fork):** steel-slate silver identity. Every brand var forks per mode in `@layer base`: `--color-primary`/`--color-accent` are `#475569` light / `#94a3b8` dark, `--color-primary-500` (hover) `#334155` light / `#cbd5e1` dark, root body text `#7a809b` light / `#a3a9c1` dark. Do NOT collapse to a single value — the light fork keeps WCAG ≥ 7:1 on white.
- **Button convention:** labels fork opposite to fills — `bg-accent`/`bg-primary` CTAs use `text-white dark:text-gray-900`. Hover forks per variant: `bg-primary` CTAs use `hover:bg-primary-500`; `bg-accent` CTAs use `hover:bg-accent-500` via dedicated `--color-accent-500` (slate-700 light / slate-200 dark) — do NOT reuse `hover:bg-primary-500` on accent buttons (dark `--color-primary-500` == dark `--color-accent`). Outline (ring) buttons soft-fill `hover:bg-slate-500` light / `dark:hover:bg-slate-400` dark (banner always-dark outline uses plain `hover:bg-slate-400`).
- **Unlayered `!important` wrappers in `valkivid3.css`:** `.vk3-root .bg-primary`, `.vk3-root .hover:bg-primary-500:hover`, `.vk3-root .hover:bg-accent(-500):hover`, `.vk3-root .hover:bg-slate-400/500:hover`, plus `.dark .vk3-root .dark\:text-gray-900 { color: var(--color-gray-900) !important }` — Bootstrap ships unlayered utilities that load after this chunk and otherwise win.
- **Hover label fork:** any element filling with `hover:bg-accent`/`hover:bg-primary` forks its label `hover:text-white dark:hover:text-gray-900`. Never bare `hover:text-gray-900` on a dark hover fill. Unlayered wrappers `.vk3-root .hover:text-white:hover` and `.vk3-root .dark:hover:text-gray-900:where(.dark,.dark *):hover` ship because scoped unlayered `text-*` overrides beat layered `hover:`/`dark:hover:` utilities.
- **Bootstrap `.bg-*` is unlayered `!important`:** unlayered `!important` beats ALL layered Tailwind utilities regardless of specificity — any `dark:bg-*` fork on a class with a Bootstrap `!important` counterpart needs an unlayered `!important` wrapper (e.g. `.vk3-root .dark:bg-gray-700:where(.dark,.dark *)`). Non-`!important` names with no counterpart (`bg-gray-150`, `bg-gray-800`) never collide. `bg-danger` intentionally stays unwrapped (readable; brand drift accepted).
- **Hero slider:** Swiper **core + `Autoplay`/`EffectFade`/`Navigation`/`Pagination`** (not `swiper/bundle`), fade, 3 slides, staggered entrance with `vv-slide-played` replay, vertical bar pagination, width `1320px` (other content `1360px`). Str1 controls hang 64px outside the container via `-right-16` gated to `2xl` — below ~1360px controls sit inside the container; do NOT add `2xl:px-16` to the wrapper. Nav arrows + pagination fork color per ACTIVE-SLIDE tone at ≥992px (`data-tone` on the hero container via Swiper `slideChange`), not per global mode — slides 2/3 stay `bg-gray-900` dark in BOTH modes. The `html:` prefix is required on the `:not(.dark)` fork. The skin pins `color-scheme` so AdminLTE's `data-bs-theme="dark"` doesn't bleed dark scrollbars into Valkivid light mode.
- Routes opt in via `meta.template: 'valkivid3'`; `App.vue` sets `body.vk3-page`. Unmatched `/vtual/*` rewrites to `/apps/vtual/*` (`LEGACY_APP_ROOTS`); only registered children stay public.
- **Error-panel pattern:** async fetch failures render a retryable panel (wrapper `bg-gray-150 ring-1 ring-gray-500/20 dark:bg-gray-800 px-6 py-10 text-center`, message `text-gray-600 dark:text-gray-300`, retry `bg-accent … hover:bg-accent-500 text-white dark:text-gray-900` re-invoking the loader), not bare `text-danger` text. i18n key `<scope>.retry`.

### FROZEN — vTual landing (`/vtual`)

`VkStr1VtualHomeView.vue` and its exclusive components (`VkStr1HeroSlider`, `VkStr1LiveNow`, `VkStr1PlatformStats`, `VkStr1VtuberDirectory`, `VkStr1VtuberLiveDirectory`, `VkStr1ContentFeed`, `VkStr1SectionEvents`, `VkStr1SectionCountdown`, `VkStr1ChannelBanner`) are **frozen** — declared production-ready by the user. Any plan that edits them requires explicit user permission first, and MUST be diffed against the visual baseline afterward. Baseline: `src/valkivid3/.baseline/` (`home-light.jpg` + `home-dark.jpg` full-page 1440px screenshots, `home-baseline.json` computed styles). Re-capture the baseline only when a frozen-file change is approved and verified.

### vTual public performance/data notes

`useVkNavigation()` fetches the Valkivid3 dynamic navigation tree (`GET navigation/menus?layout=vtual`, 60 s SWR cache, guest-safe via `jwt.optional`); header/mobile-menu/footer render it (flat top-level + dropdown parents, recursive accordion on mobile, leaf list in footer); `hash` anchors ride on `router-link :to` so `scrollBehavior` owns the scroll. `useVtualPublic()` wraps every guest fetch in a module-level SWR `Map` (TTL 60 s) with in-flight dedup; directory cards prefetch the profile on hover (`prefetchProfile`). Directory, feed, and guest profile render `animate-pulse` skeletons. Every `<img>` carries `loading="lazy"`/`decoding="async"` or `loading="eager"`/`fetchpriority="high"` (above the fold). A failing landing payload surfaces a retry banner; `landing.event` (`vtual.landing.event.*` settings) renders `VkStr1SectionCountdown`. The events section (`VkStr1SectionEvents`) is **events-first**: it renders management-submitted `landing.events[]` (title + management host credit + start/end times, `VtualPublicEvent` shape) when present, and falls back to the derived `landing.schedule` streams (i18n fallback copy) only when no events exist. Router `scrollBehavior` handles `#vtubers`/`#contents`/`#events` (`top: 96`); in-page CTAs use `<router-link to="/vtual#…">`, never raw `href="#…"`.

Content cards (`VkStr1VideoCard`) lead with the channel avatar as a dedicated left column (`w-12` rounded, fallback initial disc) with publish date + creator link stacked beside it. Hardened: truncated title `:title` tooltip; aspect-ratio thumbnail container (`aspect-[370/215]`, `aspect-[77/46]` featured) with `absolute inset-0 object-cover`; `thumbFailed` ref on `@error` reveals a permanent underlay placeholder (no element swap/reflow), reset via `watch` on `thumbnail_url`.

**Unified live directory.** `VkStr1VtuberLiveDirectory.vue` merges the directory with live status: self-fetching directory grid (search, pagination, skeleton, hover prefetch) + `liveItems` prop fed from `landing.live_now`. Live streams group per `creator.slug` and match cards via `is_live`/slug map — a live card shows danger-ringed avatar, LIVE badge, up to 3 active stream rows (external `<a target="_blank">` outside the profile `router-link`) with `+N more` footer. A live card with no matching stream rows falls back to one `live_now.active` line. Standalone `VkStr1LiveNow.vue` / `VkStr1VtuberDirectory.vue` are kept unchanged as references.

## Component extraction & heavy-vendor async loading

Large admin views stay maintainable by splitting along two axes (pattern used by `ArchivdView`, `VtualProfileShowView`, `ArchivdMicrostockUsageView`, `ArchivdWorkspacesView`, `VtualManagementEditView`):

- **Composable per concern** (`src/composables/{domain}/use<Thing>.ts`): owns fetch/load-all, filters, selection, pagination, realtime subscriptions, and action handlers. The view keeps only wiring (route params, guards) and layout. Realtime handlers must live in the composable or be forwarded to it — extracted sections never subscribe directly.
- **Section components** (`src/components/{domain}/<Thing><Section|Card|Tab>.vue`): own one template region (a card, tab, table group) with typed props + emits; two-way form fields use `defineModel`. Keep domain i18n keys, `TableEmptyRow`/`ErrorState` usage, and Swal-only notifications inside the section. The parent view passes state from the composable; no prop drilling through intermediate shells.

Views with heavy vendor widgets (`FormSelect2` → jQuery + select2) must import them via `defineAsyncComponent(() => import(...))` (see `UserEditView`, `MenuEditView`) so the vendor chunk loads only when the widget's view is visited — never eager-import a jQuery-dependent component from a shared entry path.

## Loading & error states

Every data-loading view renders three explicit states, in priority order: **skeleton** while loading → **error with retry** on failure → **empty/data** otherwise. No view goes blank on fetch failure.

Shared primitives (Bootstrap 5 classes only — never Tailwind in the AdminLTE namespace):

- `src/components/SkeletonBlock.vue` — placeholder block. Props: `variant` (`line|block|avatar|button`), `width`, `height`, `lines`. Compose into a layout-shaped skeleton per view.
- `src/components/ErrorState.vue` — props: `icon` (default `bi-exclamation-triangle`), `title`, `message`, `retryLabel`; emits `retry` (button always renders; wire `@retry` to the loader). i18n keys: `ui.error_state.{title,message,retry}` in all seven locales.
- `src/components/EmptyState.vue` — icon + title (+ optional message). Default icon `bi-inbox`; tabular lists pass a domain-relatable icon.
- `src/components/TableEmptyRow.vue` — one `<tr>`/colspan `<td>` wrapping `EmptyState` for custom `<table>` bodies that cannot use `DataTable.vue`; keep `<thead>` visible.
- `src/composables/useDetailLoader.ts` — detail/show views: input `loader: () => Promise<T>`, returns `{ data, loading, error, load }`; auto-loads on mount; `load()` is the retry handler.

`DataTable.vue` extends the same priority inside its body: `loading` skeleton rows → `error` prop branch (renders `ErrorState` in a full-colspan cell + emits `retry`) → 0 rows `EmptyState` → rows. List views pass `:error` from `useResource.error` (or a local `loadError` ref), `@retry="fetchList()"`, and a domain `empty-icon`. Row keys: pass a stable `row-key` (field name or function) when rows lack an `id`; the default resolver reads `id` before falling back to index — never rely on index keys for mutable lists.

View migration patterns:

- **List views** (~20): pass the composable's `error` ref and `@retry` to `DataTable`. Exception: `MenusView` uses inline `SkeletonBlock`/`ErrorState` + raw `<table>` + `TableEmptyRow` (no `DataTable.vue`) so the `h`/`p`/`c` menu hierarchy renders uncut — DataTable's client paging would split parents/children. Load-more event/ledger tables and inline-edit nested tables also use `TableEmptyRow`.
- **Detail/show views** (~15): `useDetailLoader` + template `v-if="loading"` skeleton → `v-else-if="loadError"` ErrorState `@retry="load"` → `v-else-if="data"` content. `showError` is no longer the primary failure surface — the in-page ErrorState is.
- **Hydrate-first views** (`ArchivdView`, `VtualProfileShowView`, `ServiceShowView`, `ServicePurchaseShowView`, `InferenceModelCardShowView`): keep the batch→fallback chain; the final loader failure sets a `loadError` ref the template ErrorState reads. `showError` remains for action failures (create/delete/checkout), not initial load.
- **Public views** (`PublicFileView`, `PublicFolderView`): same pattern, no `useAlert`/SweetAlert (public layout has no Swal chrome) — `ErrorState` is the only failure surface.

Router chunk-load failures (`router.onError` in `main.ts`) detect the dynamic-import error and flip a global `chunkLoadFailed` flag (`src/composables/useChunkLoadError.ts`); `App.vue` then renders a full-page `ErrorState` with a reload button instead of a blank document.

The valkivid3 public template (`/vtual`) keeps its own retry-panel pattern — the two styling systems stay separate.

## Navigation buttons vs action buttons

Any button whose only effect is SPA navigation (`router.push(...)`) is a `<router-link :to="...">` so the browser reveals the destination URL on hover. Real actions (delete, save, export, probe, restore) and `router.back()` stay `<button>`.

- `RowActions.vue`: each `RowAction` is in-app nav (`to: RouteLocationRaw` → `<router-link>`), external URL (`href` + optional `target` → `<a>`), or action (`onClick` → `<button>`). All three use `@click.stop` so clicks don't bubble to `DataTable` row-click. Keys, destinations, RBAC visibility, and mutate confirm copy come from Monolith query-mode `row.actions[]`. Map with `src/utils/mapQueryRowActions.ts` — do not invent keys in the view. Put every row control in the mapped `actions` array — no sibling buttons next to `RowActions`. Lists that already use labeled chrome stay labeled and still read `row.actions`.
- Standalone create/back/cancel buttons use `<router-link>` with Bootstrap button classes. A disabled nav (e.g. cancel while saving) uses `<router-link>` + `class="disabled"` + `aria-disabled="true"` + `tabindex="-1"` (native `:disabled` only works on `<button>`).

## Notifications & confirmations

All notifications and confirmations use Sweetalert2 through `src/lib/swal.ts` — never native `alert()`/`confirm()` or ad-hoc Bootstrap alert blocks:

- Notifications: `useAlert()` (`success`/`error`/`info`). Success/info render as Swal toasts; errors as a Swal error dialog.
- Confirmations: `confirmDialog({ title, text | html, confirmText, ... })` from `@/lib/swal` resolves `true` on confirm. Do not build `v-model` confirm components. `ConfirmModal.vue` remains only for the archivd rename form (an input dialog, not a yes/no confirm).
- Text input prompts: `inputDialog({ title, required?, confirmText?, danger? })` replaces native `prompt()` and resolves the trimmed string or `null` on cancel. `required: true` blocks an empty confirm. Used by the product-activation reject/suspend reason prompts.
- Labels come from `ui.swal.*` / `ui.dialog.*` plus domain keys, in all seven locales.
- `.swal2-container` is pinned to `z-index: 1090` (`src/assets/monolith-overrides.css`) so dialogs sit above Bootstrap modals (1050/1055) and other fixed layers (1080).
- Modals close any open toast first (`closeActiveToast()` in `src/lib/swal.ts`) — swal2 otherwise strips the toast body class when a modal closes and the toast balloons to full width. Never call raw `Swal.fire` modals outside this helper.
- Never assign `document.body.className = ''`. Swal stores `swal2-toast-shown` on `<body>`; wiping it turns the toast into a full-width banner. Toggle layout classes via `classList` only. CSS also pins toast container size via `.swal2-container:has(.swal2-popup.swal2-toast)`.
- `useAlert().error(...)` returns a Promise: `await showError(...)` before any `window.location.href = ...` redirect (OAuth connect, downloads) so the dialog survives instead of being unloaded with the page.
- Uncaught Vue errors and router failures go through `app.config.errorHandler` / `router.onError()` to the same error dialog (`ui.ajax.unexpected_error`).

## Safe URLs & redirects

Login/register honor `?redirect=` via `src/lib/safeRedirect.ts` (`safeInternalRedirect`): internal paths only (`/` prefix; reject `//`, `\`, `://`, `/http:`). External API-provided URLs pass through `src/utils/safeUrl.ts`: production navigation/download/payment HTTP URLs require HTTPS, local dev may use HTTP, credentials and unsafe schemes rejected, images allow only HTTP(S) or base64 raster data, payment links allow known wallet schemes, OTP links only `otpauth://hotp|totp`, Discord OAuth navigation pinned to `discord.com/api/oauth2/authorize`. Presigned upload PUT URLs also reject unsafe schemes and embedded credentials before `XMLHttpRequest` opens.
