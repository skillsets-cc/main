/**
 * JSON response helpers for API routes.
 * Provides consistent response formatting across all endpoints.
 */

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
