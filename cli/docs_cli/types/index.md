# types/index.ts

## Purpose
Shared TypeScript type definitions used across all CLI commands and lib modules. Covers the skillset manifest (`Skillset`), the CDN search index (`SearchIndex`, `SearchIndexEntry`), MCP server declarations, CC extension declarations, runtime dependency declarations, and live API stats.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `SkillsetStatus` | type | `'active' \| 'deprecated' \| 'archived'` |
| `SkillsetVerification` | interface | Production links and audit report path |
| `SkillsetCompatibility` | interface | Claude Code version range + supported languages |
| `McpNestedServer` | interface | Inner server inside a docker-type MCP declaration |
| `McpServer` | interface | MCP server declaration (stdio, http, or docker) |
| `CcExtension` | interface | Claude Code extension declaration (native or plugin) |
| `RuntimeDependency` | interface | Runtime package dependency with evaluation metadata |
| `SearchIndex` | interface | Top-level CDN index (`search-index.json`) |
| `SearchIndexEntry` | interface | One skillset row in the search index |
| `StatsResponse` | interface | Live stars/downloads counts from `/api/stats/counts` |
| `Skillset` | interface | Parsed `skillset.yaml` manifest |

## Dependencies
- Internal: None
- External: None (type declarations only)

## Integration Points
- Used by: All CLI commands and lib modules for type safety

## Key Logic

### `SearchIndexEntry` vs `Skillset`
Both describe a skillset but differ in purpose:
- `Skillset` — parsed from the local `skillset.yaml` file; no computed fields
- `SearchIndexEntry` — built at CI time; adds `id`, `stars`, `checksum`, `files` (path → sha256 map), and optional `downloads`

### `McpServer` type discriminants
| `type` | Relevant fields |
|--------|----------------|
| `stdio` | `command`, `args` |
| `http` | `url` |
| `docker` | `image`, `servers` (nested `McpNestedServer[]`) |

### `CcExtension` type
| `type` | Description |
|--------|-------------|
| `native` | Built into Claude Code |
| `plugin` | Loaded from `source` path/URL |
