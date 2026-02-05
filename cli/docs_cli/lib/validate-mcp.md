# validate-mcp.ts

## Overview
**Purpose**: Bidirectional validation of MCP server declarations between content files and skillset.yaml manifest. Ensures every MCP server in content is declared in the manifest (with matching details) and vice versa.

## Dependencies
- External: `js-yaml`, `fs`
- Internal: None

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `validateMcpServers` | Run full bidirectional validation | `skillsetDir` → `McpValidationResult` |
| `collectContentServers` | Discover MCP servers from content files | `skillsetDir, errors` → `ContentMcpServer[]` |
| `collectManifestServers` | Parse MCP servers from skillset.yaml | `skillsetDir, errors` → `ManifestMcpServer[]` |
| `findManifestMatch` | Match a content server to a manifest entry | `contentServer, manifestServers` → `ManifestMcpServer?` |
| `validateDockerImage` | Check Docker image exists in any YAML under docker/ | `skillsetDir, image, errors` → `void` |
| `findYamlFiles` | Recursively find all .yaml/.yml files in directory | `dir` → `string[]` |

### Content Sources (checked in order)
| Source | Format | Key |
|--------|--------|-----|
| `content/.mcp.json` | JSON | `mcpServers` (camelCase) |
| `content/.claude/settings.json` | JSON | `mcpServers` (camelCase) |
| `content/.claude/settings.local.json` | JSON | `mcpServers` (camelCase) |
| `content/docker/**/*.yaml`, `**/*.yml` | YAML | `mcp_servers` (snake_case) |

### Validation Logic
1. Collect servers from all content sources (deduplicate by name+source)
2. Collect servers from `skillset.yaml` `mcp_servers` array
3. If both empty → PASS
4. Content→manifest: each content server must match a manifest entry (by name + command/args or url)
5. Manifest→content: each manifest server must exist in content (native by name, docker inner servers by name)
6. Docker: additionally validates image exists in any YAML file under `docker/`

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
- Test file: `__tests__/validate-mcp.test.ts`
- Key tests: Truth table (4 cases), native servers (7), docker servers (3), mixed native+docker (2), docker edge cases (2), error handling (3), edge cases (4)
