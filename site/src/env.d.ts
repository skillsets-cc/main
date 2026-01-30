/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare runtime environment bindings.
 * These are configured in wrangler.toml and injected at runtime.
 */
export interface CloudflareEnv {
  // KV Namespaces
  STARS: KVNamespace;
  AUTH: KVNamespace;

  // Secrets (set via wrangler secret put or dashboard)
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;

  // Environment variables (set in wrangler.toml [vars])
  CALLBACK_URL: string;
  SITE_URL: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<CloudflareEnv>;

declare namespace App {
  interface Locals extends Runtime {}
}
