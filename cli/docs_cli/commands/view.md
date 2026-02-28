# view.ts

## Purpose
Fetches and displays a skillset's README from GitHub raw content, allowing users to preview before installing.

## Public API
| Export | Signature | Description |
|--------|-----------|-------------|
| `view` | `(skillsetId: string) => Promise<void>` | Fetch and print skillset README and audit report |

## Dependencies
- **Internal**: `lib/api.ts` (fetchSkillsetMetadata), `lib/constants.ts` (GITHUB_RAW_BASE)
- **External**: `chalk` (formatting), `ora` (spinner)

## Key Logic
1. Verify skillset exists via search index (`fetchSkillsetMetadata`)
2. Construct raw GitHub URLs with encoded path segments for both `content/README.md` and `AUDIT_REPORT.md`
3. Fetch README and audit report in parallel (`Promise.all`)
4. Print with bold header, dim separator, and raw README content
5. If audit report available (HTTP 200), append it with a labeled separator
