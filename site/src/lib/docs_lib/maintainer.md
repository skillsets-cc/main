# maintainer.ts

## Purpose
Provides maintainer authorization logic based on GitHub user IDs. Used to gate privileged operations like configuration updates and manual slot transitions.

## Public API

| Export | Type | Description |
|--------|------|-------------|
| `isMaintainer` | function | Returns true if userId is in the maintainer allowlist |

## Dependencies

- **Internal**: `./auth` (Env type)
- **External**: None

## Integration Points

- **Used by**:
  - `site/src/pages/api/reservations/config.ts` (config update authorization)
  - `site/src/pages/api/reservations/submit.ts` (submit authorization)
- **Emits/Consumes**: N/A

## Key Logic

Simple allowlist check against `MAINTAINER_USER_IDS` environment variable. The variable is a comma-separated list of GitHub numeric user IDs (e.g., `"123,456,789"`). Whitespace is trimmed from each ID during comparison.

No fallback or default maintainer list - if the environment variable is not set, no users are maintainers.
