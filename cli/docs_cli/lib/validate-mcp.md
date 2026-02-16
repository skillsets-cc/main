# validate-mcp.ts

## Purpose
Bidirectional validation of MCP server declarations between content files and skillset.yaml manifest. Ensures every MCP server in content is declared in the manifest (with matching details) and vice versa.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `McpValidationResult` | interface | `{ valid: boolean; errors: string[] }` |
| `validateMcpServers` | function | Run full bidirectional validation |

## Dependencies
- Internal: `lib/errors`
- External: `js-yaml`, `fs`, `path`

## Integration Points
- Used by: `commands/audit`
- Emits/Consumes: None

## Key Logic

### Content Source Discovery
The validator recursively scans all files in `content/` for MCP server declarations:

**Native MCP servers** (scans ALL `.json` files):
- Format: `{ "mcpServers": { "name": { "command": "...", "args": [...] } } }` (camelCase)
- Common locations: `.mcp.json`, `.claude/settings.json`, `.claude/settings.local.json`

**Docker MCP servers** (scans ALL `.yaml` and `.yml` files):
- Format: `mcp_servers: { name: { command: "...", args: [...] } }` (snake_case)
- Common locations: `docker/**/*.yaml`, `docker/**/*.yml`

### Internal Functions
| Function | Purpose |
|----------|---------|
| `collectContentServers` | Recursively scan content/ for MCP declarations |
| `collectManifestServers` | Parse skillset.yaml mcp_servers array |
| `parseNativeServersFromJson` | Extract mcpServers from JSON file |
| `findManifestMatch` | Match content server to manifest entry |
| `validateDockerImage` | Verify Docker image exists in docker/ YAML files |
| `findFilesByExtensions` | Recursively find files by extension (skips node_modules, .git) |
| `arraysEqual` | Compare two string arrays for equality |

### Validation Flow
1. Scan all .json files in content/ for `mcpServers` objects (deduplicate by name+source='native')
2. Scan all .yaml/.yml files in content/ for `mcp_servers` objects (deduplicate by name+source='docker')
3. Parse skillset.yaml `mcp_servers` array
4. If both content and manifest are empty → PASS
5. **Content → Manifest**: Each content server must match a manifest entry
   - Native servers: match by name + (command+args OR url)
   - Docker servers: match by name within manifest's `servers` array
6. **Manifest → Content**: Each manifest server must exist in content
   - Native servers: must find matching name in content
   - Docker servers: validate image exists in docker/ YAML + all inner servers exist in content
7. Return validation result with error list

### Server Types
| Type | Matching Criteria |
|------|-------------------|
| `stdio` | name + command + args (exact match) |
| `http` | name + url (exact match) |
| `docker` | image in any YAML under docker/ + inner servers by name in docker YAML files |

## Data Flow
```
validateMcpServers(dir)
  → collectContentServers()     # .mcp.json, settings.json, settings.local.json, docker/**/*.yaml|yml
  → collectManifestServers()    # skillset.yaml mcp_servers[]
  → content→manifest check      # findManifestMatch() for each content server
  → manifest→content check      # find in contentServers for each manifest server
  → validateDockerImage()       # scans all YAML under docker/ for image
  → { valid, errors }
```

## Integration Points
- Called by: `commands/audit.ts` (check #9)
- Calls: None (standalone validation)

## Error Messages
| Error | Cause |
|-------|-------|
| `MCP server 'X' found in content but not declared in skillset.yaml` | Content has server not in manifest |
| `MCP server 'X' declared in skillset.yaml but not found in content` | Manifest has native server not in content |
| `Docker inner server 'X' declared in manifest but not found in content` | Docker inner server missing from config.yaml |
| `Docker image 'X' not found in any YAML file under docker/` | Image mismatch or no matching YAML file |
| `Docker image 'X' declared but no docker directory found` | No content/docker/ directory |
| `Failed to parse [file]` | Malformed JSON or YAML |

## Testing
- Test file: `tests_lib/validate-mcp.test.ts`
- Key tests: Truth table (4 cases), native servers (7), docker servers (3), mixed native+docker (2), docker edge cases (2), error handling (3), edge cases (4)
