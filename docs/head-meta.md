# Runtime head meta (`useHeadMeta`)

Client-side OG/SEO meta injection for public SPA surfaces. Lives in `src/composables/useHeadMeta.ts`.

## Why client-side only

The SPA ships as static assets behind a **guard-only Worker** ([worker.md](worker.md) invariant 1). Every Worker/Pages Function invocation bills a request — meta tags for crawlers do not justify that cost. Social crawlers execute JavaScript, so runtime `document.head` injection is the maximum coverage available without turning the Worker into SSR.

**Hard rule:** never add a Cloudflare Worker/Pages Function, middleware SSR, HTML rewriter, or new `server/` route for meta injection. `assets.run_worker_first` stays empty; `server/index.ts` stays guard-only. All tags live in the static bundle (zero function invocation).

## API

```ts
import { setHeadMeta, clearHeadMeta } from '@/composables/useHeadMeta'

setHeadMeta({
  title: 'Page title',
  description: 'Max ~160 chars.',
  image: 'https://…/banner.jpg',   // optional; omit → twitter:card = summary
  url: window.location.origin + route.path, // canonical + og:url, no query
  type: 'website',                  // website | profile | article
})

// On unmount / route leave:
clearHeadMeta()
```

## Behavior contract

- **Managed tags only.** Every injected tag carries `data-monolith-meta="1"`; `clearHeadMeta()` removes only those, never the static meta from `index.html`.
- **Tags managed:** `meta[name=description]`, `meta[name=robots]` (`index, follow` — overrides the `noindex` inherited from `PublicLayout.vue`), `meta[property=og:title|og:description|og:type|og:site_name|og:url|og:image]`, `meta[name=twitter:card|twitter:title|twitter:description|twitter:image]`, `link[rel=canonical]`.
- **`og:url` / canonical:** `window.location.origin + route.path` — never include `?page` or other query params.
- **Upsert, not duplicate:** repeated `setHeadMeta()` calls reuse the existing marked elements.
- **Cleanup:** every view that calls `setHeadMeta()` must call `clearHeadMeta()` in `onUnmounted()` (same pattern as `PublicLayout.vue`'s robots handling).

## Current consumers

| View | Meta |
|------|------|
| `VkStr1VtualHomeView` (`/vtual`) | `web.vtual.public.title` + `web.vtual.public.meta.landing_description`, type `website`, no image |
| `VkStr1VtuberShowView` (`/vtual/vtubers/{slug}`) | `display_name` + bio (truncated ~160 chars, fallback `web.vtual.public.meta.profile_description_fallback`), avatar ?? banner image, type `profile`, set inside the existing `watch(profile)` |
| `VkStr1ManagementShowView` (`/vtual/managements/{slug}`) | `name` + description (truncated ~160 chars, fallback `web.vtual.public.meta.management_description_fallback`), logo image, type `profile` |

Meta copy keys live under `web.vtual.public.meta.*` in all seven locales — see [i18n.md](i18n.md).
