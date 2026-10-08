# Runtime head meta (`useHeadMeta`)

Client-side OG/SEO meta injection for public SPA surfaces, in `src/composables/useHeadMeta.ts`. Invariant: [.cursor/rules/worker-thin.mdc](../.cursor/rules/worker-thin.mdc) (no SSR).

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
| The composable | `src/composables/useHeadMeta.ts` |
| Public views | [ui-patterns.md](ui-patterns.md) · `ui-patterns.mdc` |
| Tests | `tests/headMetaJsonLd.test.ts` (jsdom) |

## Behavior contract

- **Managed tags only:** every injected tag carries `data-monolith-meta="1"`; `clearHeadMeta()` removes only those, never the static `index.html` tags.
- **Tags:** description, robots (`index, follow` — overrides the `noindex` inherited from `PublicLayout`), OG (`title`, `description`, `type`, `site_name`, `url`, `image`), Twitter card/title/description/image, `link[rel=canonical]`, `script[type=application/ld+json]`.
- **Exactly one JSON-LD block per page**, keyed on the same marker: passing `jsonLd` replaces it, passing `null` removes it (a stale `Person` on an unrelated route is worse than no schema).
- **`og:url` / canonical** is `origin + route.path` — never with query params.
- **Upsert, not duplicate**, and every caller must `clearHeadMeta()` in `onUnmounted()`.

## Adding a consumer

Call `setHeadMeta` from the public view's setup, keep the `title`/`description` copy in the locale packs, and `clearHeadMeta()` on unmount. JSON-LD is built as a plain object at the call site — there is no shared builder layer, so a new schema type needs no registry entry.
