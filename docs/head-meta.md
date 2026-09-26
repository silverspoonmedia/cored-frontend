# Runtime head meta (`useHeadMeta`)

Client-side OG/SEO meta injection for the public SPA surfaces, in `src/composables/useHeadMeta.ts`. Invariants: [.cursor/rules/valkivid3.mdc](../.cursor/rules/valkivid3.mdc) (JSON-LD + presentation), [.cursor/rules/worker-thin.mdc](../.cursor/rules/worker-thin.mdc) (no SSR).

**Never add a Worker/Pages Function, middleware SSR, HTML rewriter, or `server/` route for meta injection.** Every Worker invocation bills a request; social crawlers execute JavaScript, so runtime `document.head` injection is the maximum coverage available while `assets.run_worker_first` stays empty.

```ts
import { setHeadMeta, clearHeadMeta } from '@/composables/useHeadMeta'

setHeadMeta({
  title: 'Page title',
  description: 'Max ~160 chars.',
  image: 'https://…/banner.jpg',            // omit → twitter:card = summary
  url: window.location.origin + route.path,  // canonical + og:url, no query
  type: 'website',                           // website | profile | article
  jsonLd: { '@context': 'https://schema.org', '@type': 'Person', name: '…' },
})

clearHeadMeta() // on unmount / route leave
```

| Need | Path |
|------|------|
| JSON-LD builders | `src/utils/vtualJsonLd.ts` (pure functions) |
| Public views | [ui-patterns.md](ui-patterns.md) · `valkivid3.mdc` |
| Meta copy keys | [i18n.md](i18n.md) — `web.vtual.public.meta.*` in all seven locales |
| Tests | `tests/headMetaJsonLd.test.ts` (jsdom), `tests/vtualJsonLd.test.ts` |

## Behavior contract

- **Managed tags only:** every injected tag carries `data-monolith-meta="1"`; `clearHeadMeta()` removes only those, never the static `index.html` tags.
- **Tags:** description, robots (`index, follow` — overrides the `noindex` inherited from `PublicLayout`), OG (`title`, `description`, `type`, `site_name`, `url`, `image`), Twitter card/title/description/image, `link[rel=canonical]`, `script[type=application/ld+json]`.
- **Exactly one JSON-LD block per page**, keyed on the same marker: passing `jsonLd` replaces it, passing `null` removes it (a stale `Person` on an unrelated route is worse than no schema).
- **`og:url` / canonical** is `origin + route.path` — never with query params.
- **Upsert, not duplicate**, and every caller must `clearHeadMeta()` in `onUnmounted()`.

## Consumers

| View | Meta |
|------|------|
| `VkStr1VtualHomeView` (`/vtual`) | title + landing description, `website`, no image, no JSON-LD |
| `VkStr1VtuberShowView` (`/vtual/vtubers/{slug}`) | `display_name` + truncated bio (fallback key), avatar ?? banner, `profile`, JSON-LD `Person` + `ItemList` of the rendered page of `VideoObject`s |
| `VkStr1ManagementShowView` (`/vtual/managements/{slug}`) | name + truncated description (fallback key), logo, `profile`, JSON-LD `Organization` + `member` roster |
