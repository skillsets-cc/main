import { describe, it, expect } from 'vitest';
import { jsonResponse, errorResponse, parseJsonBody } from '../responses';

describe('responses', () => {
  describe('jsonResponse', () => {
    it('returns JSON with 200 status by default', () => {
      const res = jsonResponse({ ok: true });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/json');
    });

    it('serializes data as JSON body', async () => {
      const res = jsonResponse({ count: 42, items: ['a', 'b'] });
      const body = await res.json();

      expect(body).toEqual({ count: 42, items: ['a', 'b'] });
    });

    it('accepts custom status', () => {
      const res = jsonResponse({ created: true }, { status: 201 });

      expect(res.status).toBe(201);
    });

    it('accepts custom headers', () => {
      const res = jsonResponse({}, { headers: { 'Cache-Control': 'max-age=60' } });

      expect(res.headers.get('Cache-Control')).toBe('max-age=60');
      expect(res.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('errorResponse', () => {
    it('returns error message with given status', async () => {
      const res = errorResponse('Not found', 404);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({ error: 'Not found' });
    });

    it('merges additional data into response', async () => {
      const res = errorResponse('Rate limited', 429, { retryAfter: 60 });
      const body = await res.json();

      expect(body).toEqual({ error: 'Rate limited', retryAfter: 60 });
    });
  });

  describe('parseJsonBody', () => {
    it('parses valid JSON body', async () => {
      const request = new Request('https://example.com', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await parseJsonBody<{ name: string }>(request);

      expect(result).toEqual({ name: 'test' });
    });

    it('returns 400 error response for invalid JSON', async () => {
      const request = new Request('https://example.com', {
        method: 'POST',
        body: 'not json',
      });

      const result = await parseJsonBody(request);

      expect(result).toBeInstanceOf(Response);
      const res = result as Response;
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid JSON body');
    });
  });
});
