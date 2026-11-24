# Worker shell (`server/`)

`server/index.ts` is a **guard-only stub** (~35 lines). The Worker used to broker API/auth requests; both now go direct from the browser to the Laravel origin, so `assets.run_worker_first` is empty and the handler is unreachable for normal traffic. Invariants: [.cursor/rules/worker-thin.mdc](../.cursor/rules/worker-thin.mdc).

| Need | Path |
|------|------|
| Deploy topology and CI | [deployment.md](deployment.md) · `deployment.mdc` |
| Static-asset headers | `public/_headers` |
| Security headers on Worker responses | `server/index.ts` |
| Backend perimeter (Tunnel, CORS) | `cored-backend/docs/platform/security.md` |
| Why meta is client-side | [head-meta.md](head-meta.md) |

## The four invariants

1. **Never re-add API proxy paths.** Static assets do not invoke the isolate; proxy paths would re-introduce invocation billing and a second auth surface. The public `X-SPA-Origin` marker is browser metadata and does not invoke or bill the Worker.
2. Stray `/api/*` hits on this origin answer a JSON 404, never the SPA fallback HTML — a misconfigured `VITE_API_BASE_URL` stays debuggable.
3. Worker-generated responses stamp the security header set (CSP `default-src 'none'; frame-ancestors 'none'`, `Permissions-Policy`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options`, HSTS, `X-Frame-Options: DENY`). Static-asset headers live in `public/_headers`.
4. `wrangler.jsonc` `vars` are runtime isolate env and never reach the browser bundle — `VITE_*` belongs in the tracked `.env.<mode>` files.
