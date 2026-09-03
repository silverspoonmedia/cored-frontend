# AI Agents — Monolith-Vue-Workers (SPA frontend)

**Role:** Vue 3 + Vite + TypeScript SPA — the **sole browser UI** for the Monolith backend. Deployed to Cloudflare Workers as static assets; the Worker is **not** an API or auth proxy. Backend contract lives in the sibling Monolith repo: `monolith/docs/integration/vue-workers-spa.md` (detail) + `monolith/docs/integration/project-overview.md` (summary).

## Workspace split (SPA side)

Canonical definition lives in `monolith/AGENTS.md` — do not restate it. From this repo's perspective:

- **This repo** is the only frontend. All Vue components/views/router/stores, i18n JSON, styling, and the Worker shell live here.
- **Monolith** (sibling `../monolith`) is the only backend. Never add API endpoints, business logic, or persistence here.
- **Gateway** (sibling `../gateway`) is shared CF Workers infrastructure (Vault origin masking, Uploader S3 proxy) — separate project, own `AGENTS.md` + `docs/INDEX.md`.
- Contract-touching changes (API resource shapes, headers, cookie/CSRF, route names in `monolith/config/spa-routes.php`) must stay in sync on both sides and update both integration docs.

## Agent protocol (mandatory)

1. **Assess before changing.** Read the relevant code and docs until the work context is fully understood. No blind edits.
2. **Update docs with every task.** After finishing a task, update the related doc in `docs/` (or the README when the workflow changes) so code and docs never drift.
3. **`wrap up the docs` keyword.** Session-wide consolidation: reconcile ALL implementations from the session against the documentation as a whole, including the Monolith-side integration docs when the contract moved.
4. **Localization is mandatory.** Any user-facing copy change includes **all** supported locales in the same task/PR — see [docs/i18n.md](docs/i18n.md). Run `npm run check:i18n` before review.
5. **Auth/session changes** must respect the session contract in [docs/auth-session.md](docs/auth-session.md) (logout barrier/epoch, BroadcastChannel sync, post-login cookie settle). Never store JWTs in JavaScript.
6. **Worker stays thin.** `server/` is a guard-only stub. Never re-add API proxy paths — see [docs/worker.md](docs/worker.md).
7. **Dual templates stay separate.** AdminLTE4 (Bootstrap 5) and Valkivid3 (Tailwind 4, `.vk3-root`-scoped) never import each other's CSS — see [docs/ui-patterns.md](docs/ui-patterns.md). The vTual landing (`HomeView` + exclusive components) is **FROZEN** — edits require explicit user permission and a diff against the visual baseline in `src/valkivid3/.baseline/`.
8. **Route names are a cross-repo contract.** Symbolic Vue Router names must stay in sync with `monolith/config/spa-routes.php` (consumed by the backend menu system) — see [docs/routes.md](docs/routes.md).

## Read first

**Core rules (mandatory, read every task):** [docs/agents/core-rules.md](docs/agents/core-rules.md).

**Doc map (load topic docs on demand):** [docs/README.md](docs/README.md).

**Backend contract (when touching API/auth/realtime):** `monolith/docs/integration/vue-workers-spa.md`.
