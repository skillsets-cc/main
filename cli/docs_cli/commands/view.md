# view.ts

## Purpose
Fetches and displays a skillset's README from GitHub raw content, allowing users to preview before installing.

## Public API
| Export | Signature | Description |
|--------|-----------|-------------|
| `view` | `(skillsetId: string) => Promise<void>` | Fetch and print skillset README |

## Dependencies
- **Internal**: `lib/api.ts` (fetchSkillsetMetadata), `lib/constants.ts` (GITHUB_RAW_BASE)
- **External**: `chalk` (formatting), `ora` (spinner)

## Key Logic
1. Verify skillset exists via search index (`fetchSkillsetMetadata`)
2. Construct raw GitHub URL with encoded path segments
3. Fetch README content
4. Print with bold header, dim separator, and raw content
