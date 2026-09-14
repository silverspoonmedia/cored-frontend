# Documentation index — Monolith-Vue-Workers

Living docs for the SPA. **Language:** English only. Backend-side contract docs live in the sibling Monolith repo (`monolith/docs/`); this tree covers the SPA side.

## Start here

| Need | Open |
|------|------|
| Agent scope + protocol | Root [AGENTS.md](../AGENTS.md) · [agents/core-rules.md](agents/core-rules.md) · context budget: `monolith/docs/agents/context-budget.md` |
| IDE workspace | [Monolith-SPA.code-workspace](../Monolith-SPA.code-workspace) (this repo) · sibling `Monolith-Fullstack.code-workspace` only when the API contract moves |
| Project layout, `src/` layers, direct-to-API routing | [architecture.md](architecture.md) |
| Auth/session lifecycle (cookie, CSRF, cross-tab) | [auth-session.md](auth-session.md) |
| API client conventions (`src/api/`) | [api-client.md](api-client.md) |
| Runtime OG/SEO meta for public pages | [head-meta.md](head-meta.md) |
| Localization workflow + guards | [i18n.md](i18n.md) |
| UI conventions (templates, states, buttons, Swal) | [ui-patterns.md](ui-patterns.md) |
| Route registry + backend sync contract | [routes.md](routes.md) |
| Testing conventions | [testing.md](testing.md) |
| Worker shell (`server/`) invariants | [worker.md](worker.md) |
| Deploy (envs, CI, rollback, troubleshooting) | [deployment.md](deployment.md) |
| Backend integration contract | `monolith/docs/integration/vue-workers-spa.md` |

## Documents

| Document | Topic |
|----------|-------|
| [architecture.md](architecture.md) | Direct-to-API model, `VITE_API_BASE_URL`, tunnel perimeter, `src/` layer map (what goes in `lib/` vs `utils/` vs `composables/`), type-then-domain rule |
| [auth-session.md](auth-session.md) | `__Host-spa_jwt` cookie, CSRF double-submit, `hydrateShell`, logout barrier/epoch, `BroadcastChannel` sync, post-login cookie settle |
| [api-client.md](api-client.md) | `client.ts` behavior (419 retry, settle window), request headers, URL/query serialization, error normalization, batch hydration |
| [head-meta.md](head-meta.md) | Client-side OG/SEO meta injection for public surfaces (`useHeadMeta`) — never a Worker function |
| [i18n.md](i18n.md) | Seven locales, lazy non-`en` locale chunks, `zh-CN`↔`zh_CN` mapping, RTL reload contract, `check:i18n` + allowlist policy, translation waves |
| [ui-patterns.md](ui-patterns.md) | AdminLTE4 vs Valkivid3 scoping, skeleton→error→empty states, DataTable chain (stable row keys), RowActions contract, component-extraction + async-vendor conventions, Swal-only policy, Select2 control sizing, Select2 hydrate value guards, FROZEN HomeView |
| [routes.md](routes.md) | Route modules, naming contract, sync with `monolith/config/spa-routes.php` |
| [testing.md](testing.md) | Vitest setup, what must be tested, adding tests |
| [worker.md](worker.md) | `server/index.ts` guard-only stub, never-re-add-proxy invariant, security headers |
| [deployment.md](deployment.md) | Branch → mode → Wrangler env map, `CLOUDFLARE_ENV`, secrets, rollback |

## Rules for new documentation

1. **Prefer editing an existing doc** over creating a new file. One concern per file.
2. New topic that fits none of the files above → add one file here + a row in this index, in the same task.
3. Contract changes (API shapes, headers, route names, cookie/CSRF) update **both** this tree and `monolith/docs/integration/vue-workers-spa.md`.
4. Historical one-shot notes do not belong in this tree — write them in the commit message or the Monolith `docs/archive/` when backend-owned.
