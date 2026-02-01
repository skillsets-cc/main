# skillsets.cc Site

Astro 5 SSR site deployed to Cloudflare Workers.

## Development

```bash
npm install
npm run dev          # Local dev server at localhost:4321
```

## Build & Deploy

```bash
npm run build        # Build to ./dist/
npx wrangler deploy  # Deploy to Cloudflare Workers
```

## Architecture

- **Framework**: Astro 5 with `output: 'server'`
- **Styling**: Tailwind CSS
- **Hosting**: Cloudflare Workers (not Pages)
- **Auth**: GitHub OAuth
- **Storage**: Cloudflare KV (stars, auth state)

## Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Static | Landing page |
| `/browse` | Static | Skillset index |
| `/about` | Static | About page |
| `/contribute` | Static | Contribution guide |
| `/skillset/[ns]/[name]` | SSR | Individual skillset page |
| `/callback` | SSR | OAuth callback |

## Configuration

See `wrangler.toml` for Workers config and [DEPLOYMENT.md](../DEPLOYMENT.md) for full documentation.
