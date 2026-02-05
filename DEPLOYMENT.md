# Deployment & CI/CD Guide

## Architecture Overview

skillsets.cc runs on **Cloudflare Workers** (not Pages). This enables SSR for dynamic routes while serving static assets from the same worker.

```
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare Workers                     │
│                                                         │
│  skillsets-site (Worker)                                │
│  ├── Static assets (/, /browse, /about, /contribute)    │
│  ├── SSR routes (/skillset/[ns]/[name])                 │
│  └── API routes (/callback, /api/*)                     │
│                                                         │
│  Bindings:                                              │
│  ├── ASSETS (static files from dist/)                   │
│  ├── DATA (KV namespace)                                │
│  └── AUTH (KV namespace)                                │
└─────────────────────────────────────────────────────────┘
```

### Why Workers over Pages?

Pages had issues recognizing `_worker.js` for SSR routes (returned `[object Object]`). Workers with `[assets]` binding is Cloudflare's recommended approach for Astro SSR.

---

## Repository Structure

```
skillsets-cc-dev (private)     skillsets-cc/main (public)
        │                              │
        │  sync-to-prod workflow       │
        ├─────────────────────────────►│
        │  (strips dev-only files)     │
        │                              │
        ▼                              │
   wrangler deploy ◄───────────────────┘
        │
        ▼
   Cloudflare Workers
```

- **skillsets-cc-dev**: Development repo with CLAUDE.md, .claude/, docker/, etc.
- **skillsets-cc/main**: Production repo (public), receives sanitized pushes
- Deployment happens from the workflow, not from the production repo

---

## CI/CD Workflow

### Trigger

Manual dispatch only (`.github/workflows/sync-to-prod.yml`):
- Go to Actions → "Sync to Production" → "Run workflow"

### Steps

1. **Checkout** dev repo
2. **Remove dev-only files**: `.claude/`, `CLAUDE.md`, `docker/`, `PROCESS_DOCS/` (preserves `tools/` — fetched by CLI `init` via degit)
3. **Push to production** repo (skillsets-cc/main) via deploy key
4. **Build** the Astro site (`npm run build` in site/)
5. **Deploy** to Cloudflare Workers (`npx wrangler deploy`)

### Required Secrets (GitHub Actions)

| Secret | Purpose |
|--------|---------|
| `DEPLOY_KEY` | SSH key for pushing to skillsets-cc/main |
| `CLOUDFLARE_API_TOKEN` | Wrangler authentication |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |

---

## Cloudflare Configuration

### wrangler.toml

```toml
name = "skillsets-site"
main = "dist/_worker.js/index.js"      # SSR entry point
compatibility_date = "2026-01-30"
compatibility_flags = ["nodejs_compat"]
workers_dev = true                      # Enable *.workers.dev subdomain
preview_urls = true                     # Enable preview deployments

[assets]
binding = "ASSETS"                      # Static asset binding
directory = "./dist"                    # Build output

[[kv_namespaces]]
binding = "DATA"
id = "179bfbf61185432cb84f2958a5ea1d6c"
preview_id = "b2203e22919b4caf84e2120bdc7029ab"

[[kv_namespaces]]
binding = "AUTH"
id = "4f1aacbb6d1748a29dfebd7ad919e68e"
preview_id = "7eb56e18367d4fe6aa1aa594866365ae"

[vars]
CALLBACK_URL = "https://skillsets.cc/callback"
SITE_URL = "https://skillsets.cc"
```

### Worker Secrets

Set via wrangler CLI (not in wrangler.toml):

```bash
cd site
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
```

| Secret | Source |
|--------|--------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App (skillsets-cc org) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App |
| `JWT_SECRET` | Self-generated: `openssl rand -base64 32` |

### KV Namespaces

Created via:
```bash
npx wrangler kv:namespace create DATA
npx wrangler kv:namespace create AUTH
```

- **DATA**: Stores star counts, download counts, and rate limits per skillset
- **AUTH**: Stores OAuth state tokens (short TTL)

---

## Domain Configuration

### Custom Domain

In Cloudflare Dashboard:
1. **Workers & Pages** → **skillsets-site** (Worker)
2. **Settings** → **Domains & Routes** → **Add**
3. Add `skillsets.cc` as custom domain

Cloudflare handles DNS automatically for domains in the same account.

### Available URLs

| URL | Purpose |
|-----|---------|
| `https://skillsets.cc` | Production (custom domain) |
| `https://skillsets-site.skillsets-cc.workers.dev` | Worker default URL |
| `https://*-skillsets-site.skillsets-cc.workers.dev` | Preview deployments |

---

## Manual Deployment

If CI/CD fails or for testing:

```bash
cd site
npm ci
npm run build
npx wrangler deploy
```

Requires `CLOUDFLARE_API_TOKEN` environment variable or wrangler login.

### Local Development

```bash
cd site
npm run dev              # Astro dev server (no KV)
npx wrangler dev         # Full worker emulation with KV
```

---

## API Token Permissions

The `CLOUDFLARE_API_TOKEN` needs these permissions:

| Scope | Resource | Permission |
|-------|----------|------------|
| Account | Workers KV Storage | Edit |
| Account | Workers Scripts | Edit |
| Account | Cloudflare Pages | Edit |
| Zone | Workers Routes | Edit |

Create at: https://dash.cloudflare.com/profile/api-tokens

---

## Troubleshooting

### "kv bindings require kv write perms"

API token missing KV permissions. Create new token with "Workers KV Storage → Edit".

### SSR returns `[object Object]`

Using Pages mode instead of Workers. Ensure wrangler.toml has:
```toml
main = "dist/_worker.js/index.js"
[assets]
directory = "./dist"
```
NOT `pages_build_output_dir`.

### "script API" warning on deploy

```
You are about to publish a Workers Service that was last updated via the script API.
```

Safe to ignore. Happens when switching between dashboard edits and wrangler deploys.

### OAuth not working

1. Check secrets are set: `npx wrangler secret list`
2. Verify callback URL matches GitHub OAuth App settings
3. Check AUTH KV namespace is bound correctly

### Static assets 404

Ensure `public/.assetsignore` contains:
```
_worker.js
_routes.json
```

This prevents the SSR entry point from being served as a static asset.

---

## GitHub OAuth App

Location: https://github.com/organizations/skillsets-cc/settings/applications

Settings:
- **Homepage URL**: `https://skillsets.cc`
- **Callback URL**: `https://skillsets.cc/callback`

If credentials are lost, generate new client secret and update worker secrets.
