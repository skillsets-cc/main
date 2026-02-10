# skillset.schema.json

## Purpose
JSON Schema definition for `skillset.yaml` manifest validation. Enforces structure, format, and constraints for all skillsets in the registry. Used by CI validation and the CLI audit command.

## Public API

This is a JSON Schema document (not code), so there are no exports. It defines validation rules for the following manifest fields:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `schema_version` | string | Yes | Must be `"1.0"` |
| `batch_id` | string | No | Format: `N.N.NNN` (e.g., `5.10.001`) for ghost entries |
| `name` | string | Yes | Alphanumeric + hyphens/underscores, 1-100 chars |
| `version` | string | Yes | Semver (e.g., `1.0.0`) |
| `description` | string | Yes | 10-200 characters |
| `author` | object | Yes | `handle` (required), `url` (optional) |
| `verification` | object | Yes | `production_links` (1-5), `production_proof` (optional), `audit_report` (required) |
| `tags` | array | Yes | 1-10 unique tags, lowercase, 2-30 chars |
| `compatibility` | object | No | `claude_code_version` (semver range), `languages` (array) |
| `status` | string | No | `"active"` (default), `"deprecated"`, or `"archived"` |
| `entry_point` | string | No | Path to main doc (e.g., `./content/CLAUDE.md`) |
| `mcp_servers` | array | No | 0-20 servers with type-specific validation |

## Dependencies

- **External**: JSON Schema Draft 2020-12
- **Internal**: None (standalone schema)

## Integration Points

- **Used by**:
  - `cli/src/commands/audit.ts` (structural validation via Ajv)
  - `.github/workflows/validate-submission.yml` (PR validation)
  - Build scripts (search index generation)
- **Validates**: `skillset.yaml` files in contributor submissions

## Key Logic

### Author URL Security
Both `author.url` and `verification.production_links[].url` use:
- `"format": "uri"` (basic URI structure)
- `"pattern": "^https?://"` (only http/https protocols allowed)

This prevents `javascript:` URIs and other XSS vectors. The schema enforces this at validation time; the site frontend uses `sanitizeUrl` for runtime defense-in-depth.

### Batch ID Format
Pattern: `^\d{1,3}\.\d{1,3}\.\d{3}$`
- Position: 1-999
- Batch size: 1-999
- Cohort: 001-999 (zero-padded)

Optional field - only present for ghost entries.

### MCP Server Validation
Discriminated union based on `type` field:
- **stdio**: Requires `command` (e.g., `"npx"`), optional `args`
- **http**: Requires `url` (http/https only)
- **docker**: Requires `image` + `servers` array (nested MCP servers)

All types require:
- `mcp_reputation` (min 20 chars, justification for MCP server usage)
- `researched_at` (ISO date, timestamp of manual review)

### Nested Servers (Docker Aggregators)
Docker-compose or multi-server images can have nested `servers` array (max 10):
- Each server has own `name`, `command`, `args`, `mcp_reputation`, `researched_at`
- No nesting beyond this level (flat hierarchy)

### Path Constraints
All path fields (`production_proof`, `audit_report`, `entry_point`) must:
- Start with `./` (relative path, inside skillset directory)
- Prevent path traversal (enforced by build scripts, not schema regex)

### Compatibility Field
- `claude_code_version`: Semver range (e.g., `>=1.0.0`, `>1.2.0`, `=2.0.0`)
- `languages`: Lowercase identifiers (e.g., `typescript`, `python`, `c++`, `any`)

## Versioning
Schema uses `$id: "https://skillsets.cc/schema/skillset.schema.json"` for canonical URI. Version changes require:
1. Update `schema_version` const in schema
2. Update template in `cli/src/commands/init.ts`
3. Update validation in `cli/src/commands/audit.ts`
4. Update CI workflow references
