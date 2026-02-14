# install.ts

## Overview
**Purpose**: Install skillset to current directory using degit with conflict detection, MCP server warnings, and checksum verification

## Dependencies
- External: `degit`, `chalk`, `ora`, `@inquirer/prompts`
- Internal: `lib/filesystem`, `lib/checksum`, `lib/api`, `lib/constants`

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `install` | Download and verify skillset | `skillsetId, InstallOptions` → `void` |
| `formatMcpWarning` | Format MCP server warning display | `McpServer[], skillsetId` → `string` |
| `confirmMcpConsent` | Prompt for MCP server consent | `options, warning, prompt, cleanup?` → `Promise<boolean>` |

### Options
| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `force` | `boolean` | `false` | Overwrite existing files |
| `backup` | `boolean` | `false` | Backup before install |
| `acceptMcp` | `boolean` | `false` | Accept MCP servers without prompting |

## Data Flow
```
install(id) → detectConflicts() → backupFiles() → fetchMetadata() → MCP warning (pre-check) → degit.clone(tempDir) → MCP warning (post-check if metadata failed) → verifyChecksums(tempDir) → copy to cwd
```

## Integration Points
- Called by: `index.ts`
- Calls: `lib/filesystem`, `lib/checksum`, `lib/api`

## Critical Paths
**Primary Flow**: Conflict check → Optional backup → Fetch metadata → MCP warning → degit download → Checksum verify

**MCP Warning Flow**:
- **Pre-check**: Fetches metadata to check for `mcp_servers`
  - If MCP servers present: displays warning with server details (grouped by native/docker), prompts user
  - `--accept-mcp` bypasses prompt (required for non-interactive/CI environments)
  - `--force` and `--backup` do NOT bypass MCP prompt (they handle file conflicts only)
  - Non-TTY without `--accept-mcp`: exits with error
- **Post-check fallback**: If metadata fetch fails, downloads to temp directory first, then checks for `.mcp.json` or `.claude/settings.json`
  - If MCP indicators found: displays generic warning (metadata unavailable), prompts user
  - Cleanup temp directory if user rejects
  - Continues to checksum verification if accepted

**Fallbacks**:
- Conflict: Prompt for --force or --backup
- Checksum fail: Suggest --force reinstall

## Error Handling
- Conflicts: Aborts with helpful flags
- Checksum mismatch: Exit 1 with details
- MCP rejection: Clean exit with "cancelled" message
- Non-TTY + MCP: Exit 1 with --accept-mcp suggestion

## Testing
- Test file: `tests_commands/install.test.ts`
- Key tests: Conflict detection, backup behavior, checksum verification, download tracking, MCP warning/prompt (pre-check), MCP fallback (post-check), --accept-mcp bypass, --force/--backup don't bypass MCP
