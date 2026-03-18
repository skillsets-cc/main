# downloads/ (directory overview)

The download tracking API is split into two endpoints implementing a nonce-based two-step protocol:

| File | Route | Purpose | Doc |
|------|-------|---------|-----|
| `downloads/start.ts` | `GET/POST /api/downloads/start` | Issue nonce + fetch count | [start.md](./downloads/start.md) |
| `downloads/complete.ts` | `POST /api/downloads/complete` | Consume nonce + increment counter | [complete.md](./downloads/complete.md) |

## Protocol Overview

```
CLI install <skillset>
  │
  ├── GET  /api/downloads/start?skillsetId=  → { count }     (for display)
  ├── POST /api/downloads/start  { skillset } → { nonce }    (rate-gated by IP)
  ├── degit clone (actual install)
  └── POST /api/downloads/complete { skillset, nonce } → { count }  (nonce consumed)
```

The nonce is bound to both the skillset ID and the client IP, preventing replay across IPs or for different skillsets.
