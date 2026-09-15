# AI Agents — Monolith-Vue-Workers (SPA frontend)

**Role:** Vue 3 + Vite + TypeScript SPA — the **sole browser UI** for the Monolith backend. Deployed to Cloudflare Workers as static assets; the Worker is **not** an API or auth proxy.

## Workspace split

Canonical split lives in sibling `monolith/AGENTS.md`. Open **this repo only** via [Monolith-SPA.code-workspace](Monolith-SPA.code-workspace) for UI work. Use sibling [Monolith-Fullstack.code-workspace](../monolith/Monolith-Fullstack.code-workspace) only when the API↔SPA contract moves.

- **This repo** is the only frontend. **Monolith** is the only backend. **Gateway** is shared CF Workers infra (own `AGENTS.md`).
- Never add API endpoints, business logic, or persistence here.
- Contract-touching changes (API resource shapes, headers, cookie/CSRF, route names in `monolith/config/spa-routes.php`) stay in sync on both sides. Open the contract [vue-workers-spa.md](../monolith/docs/integration/vue-workers-spa.md) **only** then — not on every task.

## Agent protocol

Rules in [core-rules.md](docs/agents/core-rules.md) apply. Open a rule’s **owning doc** only when that rule is in play. Context budget: sibling [monolith/docs/agents/context-budget.md](../monolith/docs/agents/context-budget.md).

1. **Assess before changing.** Read the topic doc from [docs/README.md](docs/README.md). No blind edits.
2. **Update docs with every task.** Keyword `wrap up the docs` = session-wide consolidation (including Monolith integration docs when the contract moved).
3. **Localization.** All supported locales in the same change — patch keys, never `Read` whole locale JSON files. [docs/i18n.md](docs/i18n.md). Run `npm run check:i18n`.
4. **Auth/session.** Never store JWTs in JavaScript. [docs/auth-session.md](docs/auth-session.md).
5. **Worker stays thin.** [docs/worker.md](docs/worker.md).
6. **Dual templates stay separate.** AdminLTE4 vs Valkivid3; vTual landing is FROZEN. [docs/ui-patterns.md](docs/ui-patterns.md).
7. **Route names** sync with `monolith/config/spa-routes.php`. [docs/routes.md](docs/routes.md).

**Doc map:** [docs/README.md](docs/README.md). SPA-local docs first; backend contract only when headers, cookies/CSRF, envelopes, or route names change.
