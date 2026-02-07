/**
 * Mock for cloudflare:workers module used in Vitest tests.
 */

export class DurableObject {
  ctx: any;
  env: any;

  constructor(ctx: any, env: any) {
    this.ctx = ctx;
    this.env = env;
  }
}
