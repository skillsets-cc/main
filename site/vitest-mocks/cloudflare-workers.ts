/**
 * Mock for cloudflare:workers module used in Vitest tests and dev mode.
 */

export class DurableObject {
  ctx: any;
  env: any;

  constructor(ctx: any, env: any) {
    this.ctx = ctx;
    this.env = env;
  }
}

export const env = {};
