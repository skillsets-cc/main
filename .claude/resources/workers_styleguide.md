# Workers Style Guide
## Cloudflare Workers Development Standards

---

## Worker Pattern

```typescript
export interface Env {
  KV: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route handling
    if (url.pathname === '/login') {
      return handleLogin(request, env);
    }

    if (url.pathname === '/callback') {
      return handleCallback(request, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};

async function handleLogin(request: Request, env: Env): Promise<Response> {
  // Generate CSRF token
  const state = crypto.randomUUID();

  // Store state in KV with 5-minute TTL
  await env.KV.put(`oauth:state:${state}`, '1', { expirationTtl: 300 });

  // Build GitHub OAuth URL
  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'read:user');

  return Response.redirect(authUrl.toString(), 302);
}
```

---

## KV Storage Patterns

### Key Naming Convention

```typescript
// OAuth state tokens
`oauth:state:${uuid}`          // TTL: 5 minutes

// User sessions
`session:${sessionId}`         // TTL: 30 days

// Star counts (per skillset)
`stars:${skillsetId}`          // No expiration

// Download counts (per skillset, incremented by CLI)
`downloads:${skillsetId}`      // No expiration

// User stars (list of skillset IDs per user)
`user:${userId}:stars`         // No expiration, JSON array

// Rate limiting
`ratelimit:${userId}`          // TTL: 60 seconds
```

### Read/Write Pattern

```typescript
// Read with fallback
async function getStarCount(skillsetId: string, env: Env): Promise<number> {
  const value = await env.KV.get(`stars:${skillsetId}`);
  return value ? parseInt(value, 10) : 0;
}

// Write with error handling
async function incrementStars(skillsetId: string, env: Env): Promise<void> {
  const current = await getStarCount(skillsetId, env);
  await env.KV.put(`stars:${skillsetId}`, (current + 1).toString());
}

// Atomic increment pattern (for race conditions)
async function atomicIncrement(key: string, env: Env): Promise<number> {
  let retries = 3;

  while (retries > 0) {
    const current = await env.KV.get(key);
    const newValue = (current ? parseInt(current, 10) : 0) + 1;

    try {
      await env.KV.put(key, newValue.toString());
      return newValue;
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      await sleep(100 * (3 - retries)); // Exponential backoff
    }
  }

  throw new Error('Failed to increment after retries');
}
```

---

## OAuth Flow with PKCE

```typescript
// Step 1: Generate code_verifier and code_challenge
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { verifier, challenge };
}

// Step 2: Initiate OAuth with PKCE
async function handleLogin(request: Request, env: Env): Promise<Response> {
  const state = crypto.randomUUID();
  const { verifier, challenge } = await generatePKCE();

  // Store both state and verifier
  await env.KV.put(`oauth:${state}`, JSON.stringify({ verifier }), {
    expirationTtl: 300
  });

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return Response.redirect(authUrl.toString(), 302);
}

// Step 3: Exchange code with verifier
async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response('Missing parameters', { status: 400 });
  }

  // Verify state and retrieve verifier
  const storedData = await env.KV.get(`oauth:${state}`);
  if (!storedData) {
    return new Response('Invalid state', { status: 400 });
  }

  const { verifier } = JSON.parse(storedData);

  // Exchange code for token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      code_verifier: verifier,
    }),
  });

  const { access_token } = await tokenResponse.json();

  // Get user info
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const user = await userResponse.json();

  // Create session
  const sessionId = crypto.randomUUID();
  await env.KV.put(`session:${sessionId}`, JSON.stringify(user), {
    expirationTtl: 2592000, // 30 days
  });

  // Set httpOnly cookie
  return new Response('Authenticated', {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
    },
  });
}
```

---

## Rate Limiting Pattern

```typescript
interface RateLimitConfig {
  requestsPerMinute: number;
}

async function checkRateLimit(
  userId: string,
  env: Env,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const minute = Math.floor(now / 60);
  const key = `ratelimit:${userId}:${minute}`;

  // Get current count
  const current = await env.KV.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= config.requestsPerMinute) {
    return { allowed: false, remaining: 0 };
  }

  // Increment
  await env.KV.put(key, (count + 1).toString(), { expirationTtl: 60 });

  return {
    allowed: true,
    remaining: config.requestsPerMinute - count - 1,
  };
}

// Usage in handler
async function handleStarRequest(request: Request, env: Env): Promise<Response> {
  const user = await getUserFromCookie(request, env);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const rateLimit = await checkRateLimit(user.id, env, { requestsPerMinute: 10 });
  if (!rateLimit.allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: { 'Retry-After': '60' },
    });
  }

  // Process star...
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    },
  });
}
```

---

## Session Management

```typescript
interface User {
  id: number;
  login: string;
  avatar_url: string;
}

// Get user from cookie
async function getUserFromCookie(request: Request, env: Env): Promise<User | null> {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;

  const sessionMatch = cookie.match(/session=([^;]+)/);
  if (!sessionMatch) return null;

  const sessionId = sessionMatch[1];
  const userData = await env.KV.get(`session:${sessionId}`);
  if (!userData) return null;

  return JSON.parse(userData);
}

// Middleware pattern
async function withAuth(
  request: Request,
  env: Env,
  handler: (request: Request, env: Env, user: User) => Promise<Response>
): Promise<Response> {
  const user = await getUserFromCookie(request, env);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  return handler(request, env, user);
}

// Usage
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/star') {
      return withAuth(request, env, handleStar);
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

---

## Error Handling

```typescript
class WorkerError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'WorkerError';
  }
}

// Error handler wrapper
async function handleRequest(
  handler: () => Promise<Response>
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    console.error('[Worker] Error:', error);

    if (error instanceof WorkerError) {
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        {
          status: error.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response('Internal Server Error', { status: 500 });
  }
}

// Usage
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(async () => {
      // Your logic here
      if (somethingWrong) {
        throw new WorkerError('Invalid request', 400, 'INVALID_REQUEST');
      }

      return new Response('OK');
    });
  }
};
```

---

## CORS Configuration

```typescript
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://skillsets.cc',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

function handleCORS(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle preflight
    const corsResponse = handleCORS(request);
    if (corsResponse) return corsResponse;

    // Process request
    const response = await handleRequest(request, env);

    // Add CORS headers to response
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
};
```

---

## Environment Variables

### wrangler.toml

```toml
name = "skillsets-auth"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
kv_namespaces = [
  { binding = "KV", id = "your-namespace-id" }
]

[env.production.vars]
# Non-secret environment variables
ALLOWED_ORIGIN = "https://skillsets.cc"

# Secrets (set via wrangler secret put)
# GITHUB_CLIENT_ID
# GITHUB_CLIENT_SECRET
# JWT_SECRET
```

### Setting Secrets

```bash
# Set secrets via CLI (not committed to repo)
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

---

## Testing Pattern (Vitest + Miniflare)

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('Auth Worker', () => {
  let worker: UnstableDevWorker;

  beforeEach(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterEach(async () => {
    await worker.stop();
  });

  it('should redirect to GitHub OAuth', async () => {
    const resp = await worker.fetch('/login');
    expect(resp.status).toBe(302);
    expect(resp.headers.get('Location')).toContain('github.com/login/oauth/authorize');
  });

  it('should reject requests without state', async () => {
    const resp = await worker.fetch('/callback?code=abc');
    expect(resp.status).toBe(400);
  });
});

// Mock KV for unit tests
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';

describe('KV operations', () => {
  it('should increment star count', async () => {
    const mockEnv = env as Env;

    await incrementStars('the-skillset', mockEnv);
    const count = await getStarCount('the-skillset', mockEnv);

    expect(count).toBe(1);
  });
});
```

---

## Performance Patterns

### Caching

```typescript
// Cache API responses in KV
async function getCachedGitHubData(userId: string, env: Env): Promise<any> {
  const cacheKey = `cache:github:${userId}`;
  const cached = await env.KV.get(cacheKey, 'json');

  if (cached) return cached;

  // Fetch from GitHub
  const response = await fetch(`https://api.github.com/users/${userId}`);
  const data = await response.json();

  // Cache for 1 hour
  await env.KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 3600 });

  return data;
}
```

### Batching KV Operations

```typescript
// Bad: Sequential writes
for (const item of items) {
  await env.KV.put(`key:${item.id}`, item.value);
}

// Good: Parallel writes
await Promise.all(
  items.map(item => env.KV.put(`key:${item.id}`, item.value))
);
```

---

## Deployment Checklist

- [ ] Secrets set via `wrangler secret put`
- [ ] KV namespace created and bound in `wrangler.toml`
- [ ] CORS headers configured for production domain
- [ ] Rate limiting tested under load
- [ ] Error responses return proper status codes
- [ ] Session cookies marked `HttpOnly; Secure; SameSite=Lax`
- [ ] OAuth CSRF protection implemented
- [ ] Logs include context (user ID, action)
- [ ] No hardcoded secrets in code
