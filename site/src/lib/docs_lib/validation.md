# validation.ts

## Purpose
Input validation for API endpoints. Prevents KV key injection by validating skillset ID format before using it in KV operations.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `isValidSkillsetId` | function | Validate skillset ID format against allowed pattern |

## Dependencies
- **Internal**: None (standalone utility)
- **External**: None

## Integration Points
- **Used by**:
  - `pages/api/star.ts` (validate skillsetId in POST and GET)
  - `pages/api/downloads.ts` (validate skillset in POST)
- **Consumes**: No external services
- **Emits**: No events

## Key Logic

### Pattern: `^@?[\w-]+\/[\w-]+$`
- Optional `@` prefix (for namespaced IDs like `@supercollectible/The_Skillset`)
- Namespace: one or more word characters or hyphens
- Single `/` separator
- Name: one or more word characters or hyphens
- Rejects path traversal (`../`), nested paths (`a/b/c`), spaces, and special characters

## Testing
- Test file: `__tests__/validation.test.ts`
