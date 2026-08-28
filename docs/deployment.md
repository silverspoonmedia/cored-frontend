# Deployment — GitHub Actions → Cloudflare Workers

One codebase, two Workers. Pushes to specific branches auto-deploy via GitHub Actions; the same environments can also be deployed manually from any machine with `wrangler` credentials. This guide is the operational reference — the integration contract with the Laravel backend lives in Monolith `docs/integration/vue-workers-spa.md`.

## Deploy map

| Git branch | Vite mode (`--mode`) | Env file baked | Wrangler env (`--env`) | Worker name | Default URL |
|------------|----------------------|----------------|------------------------|-------------|-------------|
| `main` | `production` | `.env.production` | `production` | `monolith-spa-prod` | `https://monolith-spa-prod.<account>.workers.dev` |
| `sandbox` | `sandbox` | `.env.sandbox` | `sandbox` | `monolith-spa-sandbox` | `https://monolith-spa-sandbox.<account>.workers.dev` |

Contract reminders:

- `VITE_*` values are baked into the browser bundle from the tracked mode file (`.env.production` / `.env.sandbox`). During `vite build --mode <env>` the mode file wins over `.env.local` (verified on Vite 8), so CI and local builds are reproducible.
- `wrangler.jsonc` `vars` are runtime isolate env and never reach the browser bundle — never put `VITE_*` there.
- Vite mode and Wrangler env must stay aligned (both `production` or both `sandbox`). The npm scripts and the workflow below enforce the pairing; never mix them by hand.

## One-time prerequisites

### Cloudflare API token

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token**.
2. Use the **Edit Cloudflare Workers** template, or custom permissions:
   - `Account → Workers Scripts → Edit`
   - `Account → Account Settings → Read`
3. Scope it to the account (all zones optional — Workers deploys do not need zone permissions until custom domains are managed via API).

### GitHub secrets/variables

Repo **Settings → Secrets and variables → Actions**:

| Name | Kind | Value |
|------|------|-------|
| `CLOUDFLARE_API_TOKEN` | Secret | Token from above |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Dashboard → Workers & Pages → right rail "Account ID" |

### Branches

- `main` exists and deploys production.
- Create `sandbox` from `main` once (`git checkout -b sandbox main && git push -u origin sandbox`); keep it merge-synchronized afterwards.
- The Workers themselves do not need to exist in advance — the first CI deploy creates `monolith-spa-prod` / `monolith-spa-sandbox` (a local `npm run deploy:<env>` works too).

## Workflow

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main, sandbox]

concurrency:
  group: deploy-${{ github.ref_name }}
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      DEPLOY_ENV: ${{ github.ref_name == 'sandbox' && 'sandbox' || 'production' }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run type-check
      - run: npm run check:i18n
      - run: npm test
      - run: npx vite build --mode ${{ env.DEPLOY_ENV }}
        env:
          CLOUDFLARE_ENV: ${{ env.DEPLOY_ENV }}
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env ${{ env.DEPLOY_ENV }}
```

The YAML above must always match the file. Design decisions:

- Quality gates (`type-check`, `check:i18n`, `test`) re-run inside the deploy job — a deploy never bypasses the CI gate.
- **`CLOUDFLARE_ENV` must be set on the build step.** `@cloudflare/vite-plugin` resolves the Wrangler environment at build time and writes a redirected config (`dist/<name>/wrangler.json`) carrying `targetEnvironment` and the environment's worker `name`. Without `CLOUDFLARE_ENV` the output config falls back to the top-level name (`monolith-spa-prod`) regardless of `--mode`/`--env`, so a sandbox deploy would silently **overwrite the production Worker**. With `CLOUDFLARE_ENV` set, wrangler additionally hard-fails any `deploy --env` that mismatches the built `targetEnvironment`, so a mode/env mixup can no longer deploy at all.
- `cloudflare/wrangler-action@v3` is the official action; it reads `wrangler.jsonc` at the repo root and follows the plugin's redirected config automatically (the `--env` flag must still be passed so wrangler can verify it against the built `targetEnvironment`).
- `concurrency` is per-branch so a production and a sandbox deploy may run in parallel, but two pushes to the same branch queue instead of overwriting each other.
- CI calls `vite build` and `wrangler deploy` as separate steps (not `npm run deploy:*`) so a failure is attributable to exactly one stage in the Actions log.

## Day-to-day flow

1. Work on `feat/*` branches.
2. Merge into `sandbox` → Actions auto-deploys the sandbox Worker.
3. Verify at the sandbox URL: API calls in the network tab target the sandbox API origin, login sets the `__Host-spa_jwt` cookie.
4. Merge `sandbox` into `main` (or PR `feat/*` directly to `main` after sandbox verification) → Actions auto-deploys production.
5. Post-deploy verification (each environment):
   - Network tab: `/api/v1/*` requests go to the correct API origin for that environment.
   - Login works; cookie `__Host-spa_jwt` is set (`SameSite=None; Secure`).
   - Realtime (if enabled) connects with that environment's Pusher credentials.

Rollback: `npx wrangler rollback --env <env>` (picks a previous version), or revert the commit and push again.

## Backend coupling (Monolith)

The backend is deployed manually on the VPS and is out of scope here. Each backend environment must set `SPA_URL` to the matching SPA origin so CORS and SPA-minted URLs (password reset, email verify, iPaymu return) point at the right Worker:

| Monolith environment | `SPA_URL` |
|----------------------|-----------|
| production | `https://monolith-spa-prod.<account>.workers.dev` (or its custom domain) |
| sandbox | `https://monolith-spa-sandbox.<account>.workers.dev` (or its custom domain) |

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Sandbox deploy overwrote production (log shows `Uploaded monolith-spa-prod` on a sandbox run) | `CLOUDFLARE_ENV` missing on the build step — the plugin baked the top-level worker name into the redirected config |
| Deploy fails with `does not match the target environment ... used when building` | `--env` mismatches the `CLOUDFLARE_ENV` used at build — rebuild with the matching `CLOUDFLARE_ENV` (this guard is intentional; never bypass it) |
| Every API call 404s on the SPA origin | `VITE_API_BASE_URL` empty/placeholder in the baked env file, or the build ran without `--mode` |
| Bundle points at the wrong API origin | Build/deploy pairing broken (`--mode` ≠ `--env`), or the wrong branch deployed |
| Actions fails with auth error code 10000 | `CLOUDFLARE_API_TOKEN` missing/expired or lacks `Workers Scripts:Edit` |
| Login works locally but cookie never set on the deployed origin | Monolith `SPA_URL` does not match the SPA origin (CORS/cookie origin mismatch) |
| Realtime silent | `VITE_PUSHER_APP_KEY` empty in that environment's tracked env file |
| Two deploys racing on one branch | Should not happen — `concurrency` queues per branch; check the group key if edited |
