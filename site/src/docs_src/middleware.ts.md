# middleware.ts

## Overview
**Purpose**: Astro middleware that injects security headers (including a comprehensive Content-Security-Policy) into every HTTP response.

## Dependencies
- External: `astro:middleware` (`defineMiddleware`)
- Internal: None (standalone middleware)
- Services: None

## Key Components

### Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| `SECURITY_HEADERS` | `Record<string, string>` | Map of security headers applied to all responses |

### Security Headers Applied
| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `SAMEORIGIN` | Prevents clickjacking (legacy, backed by CSP frame-ancestors) |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unused browser features |
| `Content-Security-Policy` | 9 directives (see below) | Defense-in-depth against XSS and data exfiltration |

### CSP Directives
| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Blocks all unlisted resource types from external origins |
| `script-src` | `'self' 'unsafe-inline'` | Blocks external script loading; `unsafe-inline` required by Astro 5 (no nonce support) |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Allows Google Fonts CSS + Astro inline styles |
| `font-src` | `'self' https://fonts.gstatic.com` | Allows Google Fonts font files |
| `img-src` | `'self' https: data:` | Allows HTTPS images + data URIs (avatars, inline images) |
| `connect-src` | `'self'` | Blocks fetch/XHR to external origins (prevents data exfiltration) |
| `frame-ancestors` | `'self'` | Prevents embedding in third-party frames |
| `base-uri` | `'self'` | Prevents base tag hijacking |
| `form-action` | `'self' https://github.com` | Allows form submission to self and GitHub OAuth |

## Data Flow
```
Incoming HTTP request
  ↓
Astro route handler produces Response
  ↓
Middleware clones into mutable Response (Workers redirect responses are immutable)
  ↓
Security headers injected
  ↓
Response returned to client
```

## Integration Points
- Called by: Astro framework (runs on every request)
- Calls: None
- Events: None

## Critical Paths
**Primary Flow**: Every HTTP response passes through this middleware. A misconfigured CSP can break page rendering (styles, fonts, scripts).

**Immutable Response Handling**: `Response.redirect()` in Cloudflare Workers returns an immutable Response. The middleware clones it via `new Response(response.body, response)` before setting headers.

## Testing
- Test file: `site/src/lib/tests_lib/middleware.test.ts`
- Key test cases: Verifies all 9 CSP directives present, security headers applied to normal and redirect responses

## Technical Debt
- [ ] Upgrade `script-src` from `'unsafe-inline'` to nonce-based when Astro adds native CSP nonce support (tracks SEC-005 postmortem)
