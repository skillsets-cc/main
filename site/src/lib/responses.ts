/**
 * JSON response helpers for API routes.
 * Provides consistent response formatting across all endpoints.
 */

import type { Env } from '@/lib/auth';

/**
 * Extract typed Env from Astro locals.
 */
export function getEnv(locals: App.Locals): Env {
  return (locals as { runtime: { env: Env } }).runtime.env;
}

export interface JsonResponseOptions {
  status?: number;
  headers?: Record<string, string>;
}

/**
 * Create a JSON response with proper Content-Type header.
 */
export function jsonResponse<T>(
  data: T,
  options: JsonResponseOptions = {}
): Response {
  const { status = 200, headers = {} } = options;
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create a JSON error response.
 */
export function errorResponse(
  error: string,
  status: number,
  additionalData?: Record<string, unknown>
): Response {
  return jsonResponse({ error, ...additionalData }, { status });
}

/**
 * Parse JSON body from request with error handling.
 * Returns parsed body or 400 error Response.
 */
export async function parseJsonBody<T>(request: Request): Promise<T | Response> {
  try {
    return await request.json() as T;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }
}

/**
 * Create a 403 response for frozen/suspended accounts.
 */
export function frozenResponse(): Response {
  return jsonResponse({
    error: 'Account activity suspended',
    frozen: true,
    message: 'Your account has been suspended due to unusual activity that exceeded our usage limits. This is a protective measure. To restore access, please contact us with your account details.',
    contact: 'security@skillsets.cc',
  }, { status: 403 });
}
