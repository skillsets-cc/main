/**
 * Custom worker entry point for Astro + Durable Objects.
 *
 * This file is required by @astrojs/cloudflare adapter when using Durable Objects.
 * It exports both the default Astro handler and the DO class as a named export.
 */
import type { SSRManifest } from 'astro';
import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';
import { ReservationCoordinator } from './lib/reservation-do';
import type { Env } from './lib/auth';

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);

  return {
    default: {
      async fetch(request: Request, env: Env, ctx: ExecutionContext) {
        return handle(manifest, app, request, env, ctx);
      },
    } satisfies ExportedHandler<Env>,
    ReservationCoordinator,
  };
}
