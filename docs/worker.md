# Worker shell (`server/`)

`server/index.ts` is a **guard-only stub** (~35 lines). History: the Worker used to broker API/auth requests; both now go direct from the browser to the Laravel API origin, so `assets.run_worker_first` is empty and the handler is effectively unreachable for normal traffic.

## Invariants

1. **Never re-add API proxy paths to the Worker.** Static assets do not invoke the isolate; adding proxy paths would re-introduce invocation billing and a second auth surface. The public `X-SPA-Origin` marker is browser metadata; it does not invoke or bill the Worker.
2. Stray `/api/*` hits on this origin get a JSON 404 (`{ status: 'error', message: 'Not found.' }`), never the SPA fallback HTML — keeps debugging honest when `VITE_API_BASE_URL` is misconfigured.
3. Worker-generated responses stamp the security header set (`Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Permissions-Policy`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options`, HSTS, `X-Frame-Options: DENY`). Static-asset headers live separately in `public/_headers` (CSP, frame deny, HSTS).
4. `wrangler.jsonc` `vars` are runtime isolate env and **never reach the browser bundle** — `VITE_*` belongs in the tracked `.env.<mode>` files (see [deployment.md](deployment.md)).

## Related

- [architecture.md](architecture.md) — direct-to-API model
- [deployment.md](deployment.md) — env pairing, `CLOUDFLARE_ENV`
