# versions.ts

## Overview
**Purpose**: Semver comparison for skillset version validation

## Dependencies
- External: None
- Internal: None

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `compareVersions` | Compare two semver strings | `(a: string, b: string)` → `-1 \| 0 \| 1` |

## Data Flow
```
compareVersions("1.0.0", "2.0.0") → split(".") → compare parts → -1
```

## Integration Points
- Called by: `commands/audit.ts` (version bump detection), `commands/submit.ts` (update PR title)
- Calls: None

## Key Logic
- Splits both versions on `.` and compares major, minor, patch numerically
- Missing parts treated as 0 (e.g., `"1.0"` equals `"1.0.0"`)
- Returns -1 (a < b), 0 (equal), 1 (a > b)

## Testing
- Test file: `__tests__/versions.test.ts`
