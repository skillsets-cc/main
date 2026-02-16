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
