# Execution Plan: MCP Security Transparency

## Overview
- **Objective**: Make MCP server presence visible at every stage of the skillset lifecycle (audit, submission, browse, install) by writing structured MCP metadata to `skillset.yaml`, flowing it through the search index pipeline, and validating manifest completeness via the `audit` command.
- **Scope**:
  - Includes: JSON Schema update, validation module (`validate-mcp.ts`), audit integration, CLI install warning with `--accept-mcp`, search index pipeline, site browse/detail MCP display, `init` degit fetch, The_Skillset manifest migration, CI workflow update, CRITERIA.md expansion, SKILL.md update
  - Excludes: Security model page (future), runtime MCP monitoring, MCP server sandboxing
- **Dependencies**:
  - `js-yaml` (already in CLI deps)
  - `degit` (already in CLI deps)
  - `@inquirer/prompts` (already in CLI deps — `confirm` for MCP prompt)
  - No new dependencies required
- **Design Document**: [PROCESS_DOCS/design/mcp-security-transparency.md](../design/mcp-security-transparency.md)

### Technical Clarifications

#### Test Framework
```
CLI:  Vitest (vitest.config.ts, pool: forks, singleFork: true, env: node)
Site: Vitest
Structure: Tests in __tests__/ subdirectories (e.g., cli/src/lib/__tests__/*.test.ts)
Pattern: vi.mock() for module mocks, vi.stubGlobal() for fetch, tmpdir() for filesystem tests
```

#### File Locations
```
CLI source:     cli/src/
CLI tests:      cli/src/**/__tests__/*.test.ts
Site source:    site/src/
Site scripts:   site/scripts/
Schema:         schema/skillset.schema.json
CI:             .github/workflows/
Audit tool:     tools/audit-skill/
The_Skillset:   skillsets/@supercollectible/The_Skillset/
```

---

## Build Agent 1: Schema + Validation Module + Tests

**Scope**: JSON Schema update, `validate-mcp.ts` module, unit tests with fixture directories. This is the foundation — all other agents depend on the schema and validation being correct.

**No file conflicts with other agents.**

### Task 1: Update JSON Schema (`schema/skillset.schema.json`)

- **Description**: Add `mcp_servers` as an optional property to the existing schema with conditional requirements per type.
- **Acceptance Criteria**:
  - [ ] `mcp_servers` added to `properties` object (required by existing `additionalProperties: false`)
  - [ ] Conditional `if`/`then` blocks enforce `command` for stdio, `url` for http, `image` + `servers` for docker
  - [ ] `unevaluatedProperties: false` on item and inner `servers` item schemas
  - [ ] `mcp_reputation` required with `minLength: 20`, `researched_at` required with `format: date`
  - [ ] `maxItems: 20` on `mcp_servers`, `maxItems: 10` on inner `servers`
  - [ ] Schema validates correctly with `ajv --spec=draft2020 -c ajv-formats`
  - [ ] Test: validate a sample skillset.yaml with MCP servers passes
  - [ ] Test: validate a sample skillset.yaml without MCP servers still passes
- **File to Modify**: `schema/skillset.schema.json`
- **Dependencies**: None

**Exact schema addition** — add this as a new property inside the `"properties"` object, after `"entry_point"`:

```json
"mcp_servers": {
  "type": "array",
  "maxItems": 20,
  "items": {
    "type": "object",
    "required": ["name", "type", "mcp_reputation", "researched_at"],
    "properties": {
      "name": { "type": "string" },
      "type": { "enum": ["stdio", "http", "docker"] },
      "command": { "type": "string" },
      "args": {
        "type": "array",
        "items": { "type": "string" }
      },
      "url": { "type": "string", "pattern": "^https?://" },
      "image": { "type": "string" },
      "servers": {
        "type": "array",
        "maxItems": 10,
        "items": {
          "type": "object",
          "required": ["name", "command", "mcp_reputation", "researched_at"],
          "properties": {
            "name": { "type": "string" },
            "command": { "type": "string" },
            "args": {
              "type": "array",
              "items": { "type": "string" }
            },
            "mcp_reputation": { "type": "string", "minLength": 20 },
            "researched_at": { "type": "string", "format": "date" }
          },
          "unevaluatedProperties": false
        }
      },
      "mcp_reputation": { "type": "string", "minLength": 20 },
      "researched_at": { "type": "string", "format": "date" }
    },
    "unevaluatedProperties": false,
    "allOf": [
      {
        "if": { "properties": { "type": { "const": "stdio" } }, "required": ["type"] },
        "then": { "required": ["command"] }
      },
      {
        "if": { "properties": { "type": { "const": "http" } }, "required": ["type"] },
        "then": { "required": ["url"] }
      },
      {
        "if": { "properties": { "type": { "const": "docker" } }, "required": ["type"] },
        "then": { "required": ["image", "servers"] }
      }
    ]
  }
}
```

**Verification command** (run after editing):
```bash
cd /home/nook/Documents/code/skillsets.cc
# Install ajv-cli locally if needed
npx ajv-cli validate -s schema/skillset.schema.json -d /dev/stdin --spec=draft2020 -c ajv-formats <<< '$(yq eval -o=json skillsets/@supercollectible/The_Skillset/skillset.yaml)'
```

### Task 2: Create MCP Validation Module (`cli/src/lib/validate-mcp.ts`)

- **Description**: Single TypeScript module that owns all MCP cross-check logic. Called by `audit` command locally and by CI via the same command.
- **Acceptance Criteria**:
  - [ ] Exports `validateMcpServers(skillsetDir: string): McpValidationResult`
  - [ ] Collects MCP servers from content: `.mcp.json`, `.claude/settings.json`, `.claude/settings.local.json` (key: `mcpServers`)
  - [ ] Collects MCP servers from Docker configs: `content/docker/**/config.yaml` (key: `mcp_servers`)
  - [ ] Collects MCP servers from `skillset.yaml` manifest (`mcp_servers` array)
  - [ ] Bidirectional name check: content→manifest and manifest→content
  - [ ] Content-level matching: compare command+args (stdio), url (http), command+args (Docker inner servers)
  - [ ] Docker image check: each `type: "docker"` entry's image exists in a `docker-compose.yaml` service
  - [ ] All four truth table cases handled correctly (see below)
  - [ ] Parse errors in `.mcp.json` or config files result in validation failure with descriptive error
  - [ ] Returns `{ valid: boolean, errors: string[] }`
- **File to Create**: `cli/src/lib/validate-mcp.ts`
- **Dependencies**: None (uses `fs`, `path`, `js-yaml` — all already available)

**Truth table**:
| Content has MCPs | Manifest declares | Result |
|-----------------|-------------------|--------|
| Yes | Yes, matches | Pass |
| Yes | No | Fail: "MCP server 'X' found in content but not declared in skillset.yaml mcp_servers" |
| No | Yes | Fail: "MCP server 'X' declared in skillset.yaml but not found in content" |
| No | No | Pass |

**Interface and implementation pattern**:

```typescript
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import yaml from 'js-yaml';

export interface McpValidationResult {
  valid: boolean;
  errors: string[];
}

interface ContentMcpServer {
  name: string;
  source: 'native' | 'docker';
  command?: string;
  args?: string[];
  url?: string;
  /** For docker inner servers, the parent image */
  parentImage?: string;
}

interface ManifestMcpServer {
  name: string;
  type: 'stdio' | 'http' | 'docker';
  command?: string;
  args?: string[];
  url?: string;
  image?: string;
  servers?: Array<{
    name: string;
    command: string;
    args?: string[];
    mcp_reputation: string;
    researched_at: string;
  }>;
  mcp_reputation: string;
  researched_at: string;
}

/**
 * Validates MCP server declarations between content files and skillset.yaml.
 * Bidirectional: content→manifest and manifest→content.
 */
export function validateMcpServers(skillsetDir: string): McpValidationResult {
  const errors: string[] = [];

  // 1. Collect from content
  const contentServers = collectContentServers(skillsetDir, errors);

  // 2. Collect from manifest
  const manifestServers = collectManifestServers(skillsetDir, errors);

  // If we hit parse errors, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 3. No MCPs anywhere = pass
  if (contentServers.length === 0 && manifestServers.length === 0) {
    return { valid: true, errors: [] };
  }

  // 4. Content→manifest check
  for (const cs of contentServers) {
    const match = findManifestMatch(cs, manifestServers);
    if (!match) {
      errors.push(`MCP server '${cs.name}' found in content but not declared in skillset.yaml mcp_servers`);
    }
  }

  // 5. Manifest→content check
  for (const ms of manifestServers) {
    if (ms.type === 'docker') {
      // Check Docker inner servers
      for (const inner of ms.servers || []) {
        const match = contentServers.find(cs =>
          cs.source === 'docker' && cs.name === inner.name
        );
        if (!match) {
          errors.push(`Docker inner server '${inner.name}' declared in manifest but not found in content docker config`);
        }
      }
      // Check Docker image exists in compose
      validateDockerImage(skillsetDir, ms.image!, errors);
    } else {
      const match = contentServers.find(cs =>
        cs.source === 'native' && cs.name === ms.name
      );
      if (!match) {
        errors.push(`MCP server '${ms.name}' declared in skillset.yaml but not found in content`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
```

**Key helper functions to implement**:

1. `collectContentServers(skillsetDir, errors)` — parse:
   - `content/.mcp.json` → `JSON.parse`, read `mcpServers` object, extract name (key), command, args, url
   - `content/.claude/settings.json` → same `mcpServers` key
   - `content/.claude/settings.local.json` → same `mcpServers` key
   - `content/docker/**/config.yaml` → `yaml.load`, read `mcp_servers` object (LiteLLM format: keys are server names, values have `command`, `args`, `transport`)

2. `collectManifestServers(skillsetDir, errors)` — parse `skillset.yaml`, extract `mcp_servers` array

3. `findManifestMatch(contentServer, manifestServers)` — match by name, then verify:
   - For native stdio: command and args must match
   - For native http: url must match
   - For docker inner: name match within the docker entry's `servers` array, then command+args match

4. `validateDockerImage(skillsetDir, image, errors)` — scan for `docker-compose.yaml` or `docker-compose.yml` in `content/docker/`, check if any service uses the specified image

**Important parsing details**:
- `.mcp.json` format: `{ "mcpServers": { "server-name": { "type": "stdio", "command": "npx", "args": [...] } } }`
- LiteLLM `config.yaml` format: `mcp_servers:` is an object with server names as keys, each having `transport`, `command`, `args`
- `skillset.yaml` format: `mcp_servers:` is an array of objects with `name`, `type`, `command`, `args`, etc.

### Task 3: Create Unit Tests for validate-mcp (`cli/src/lib/__tests__/validate-mcp.test.ts`)

- **Description**: Comprehensive unit tests for the MCP validation module using fixture directories.
- **Acceptance Criteria**:
  - [ ] All four truth table cases tested (pass/pass, fail content→manifest, fail manifest→content, pass no-mcp)
  - [ ] Tests for native stdio servers (`.mcp.json` with matching manifest)
  - [ ] Tests for native http servers (URL matching)
  - [ ] Tests for Docker servers with inner servers (config.yaml + docker-compose.yaml)
  - [ ] Tests for mismatched command/args (content has different args than manifest)
  - [ ] Tests for malformed JSON in `.mcp.json` (should return error)
  - [ ] Tests for malformed YAML in `config.yaml` (should return error)
  - [ ] Tests for missing docker-compose.yaml when Docker type declared
  - [ ] Tests for `.claude/settings.json` MCP source
  - [ ] Tests for `.claude/settings.local.json` MCP source
  - [ ] All tests pass with `cd cli && npx vitest run src/lib/__tests__/validate-mcp.test.ts`
- **Files to Create**:
  ```
  cli/src/lib/__tests__/validate-mcp.test.ts
  cli/src/lib/__tests__/fixtures/mcp-native/
  cli/src/lib/__tests__/fixtures/mcp-docker/
  cli/src/lib/__tests__/fixtures/mcp-mismatch/
  cli/src/lib/__tests__/fixtures/mcp-undeclared/
  ```
- **Dependencies**: Task 2 must be complete

**Test pattern** (follow existing `audit.test.ts` pattern — use real tmpdir, not mocks):

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateMcpServers } from '../validate-mcp.js';

describe('validateMcpServers', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `skillsets-mcp-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('truth table', () => {
    it('passes when no MCP servers in content or manifest', () => {
      // Create skillset.yaml without mcp_servers
      writeFileSync(join(testDir, 'skillset.yaml'), 'schema_version: "1.0"\nname: test\n');
      mkdirSync(join(testDir, 'content'), { recursive: true });

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes when content and manifest match', () => {
      // Create .mcp.json in content
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeFileSync(join(testDir, 'content', '.mcp.json'), JSON.stringify({
        mcpServers: {
          context7: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@upstash/context7-mcp']
          }
        }
      }));

      // Create matching skillset.yaml
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: context7
    type: stdio
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads"
    researched_at: "2026-02-04"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('fails when content has MCP but manifest does not', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeFileSync(join(testDir, 'content', '.mcp.json'), JSON.stringify({
        mcpServers: {
          context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] }
        }
      }));
      writeFileSync(join(testDir, 'skillset.yaml'), 'schema_version: "1.0"\nname: test\n');

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('context7');
      expect(result.errors[0]).toContain('not declared');
    });

    it('fails when manifest has MCP but content does not', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: context7
    type: stdio
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads"
    researched_at: "2026-02-04"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('context7');
      expect(result.errors[0]).toContain('not found in content');
    });
  });

  describe('native servers', () => {
    it('validates .claude/settings.json mcpServers', () => {
      // ... test with settings.json source
    });

    it('validates .claude/settings.local.json mcpServers', () => {
      // ... test with settings.local.json source
    });

    it('fails on command mismatch', () => {
      // Content has command: 'npx' but manifest has command: 'node'
    });

    it('fails on args mismatch', () => {
      // Content args differ from manifest args
    });

    it('validates http type with URL matching', () => {
      // .mcp.json has http server with url, manifest matches
    });
  });

  describe('docker servers', () => {
    it('validates Docker config with inner servers', () => {
      // Create docker config.yaml + docker-compose.yaml + matching manifest
    });

    it('fails when Docker image not in docker-compose.yaml', () => {
      // Manifest declares Docker image that doesn't exist in compose
    });

    it('fails when Docker inner server not in config', () => {
      // Manifest declares inner server not present in docker config
    });
  });

  describe('error handling', () => {
    it('returns error for malformed .mcp.json', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeFileSync(join(testDir, 'content', '.mcp.json'), 'not json{{{');
      writeFileSync(join(testDir, 'skillset.yaml'), 'schema_version: "1.0"\nname: test\n');

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('.mcp.json');
    });

    it('returns error for malformed config.yaml', () => {
      // ... similar for YAML parse error
    });
  });
});
```

**Write tests alongside implementation.** The build agent should write `validate-mcp.ts` and `validate-mcp.test.ts` together — implement a function, write its test, run `npx vitest run src/lib/__tests__/validate-mcp.test.ts`, fix any failures, then move to the next function.

**Run command after all tests written**:
```bash
cd /home/nook/Documents/code/skillsets.cc/cli && npx vitest run src/lib/__tests__/validate-mcp.test.ts
```

### Task 4: Add MCP Type Definitions (`cli/src/types/index.ts`)

- **Description**: Add `McpServer` and `McpServerInner` interfaces to CLI types, plus add `mcp_servers` to `SearchIndexEntry` and `Skillset`.
- **Acceptance Criteria**:
  - [ ] `McpServerInner` interface added
  - [ ] `McpServer` interface added
  - [ ] `SearchIndexEntry` gains `mcp_servers?: McpServer[]`
  - [ ] `Skillset` gains `mcp_servers?: McpServer[]`
  - [ ] TypeScript compiles without errors
- **File to Modify**: `cli/src/types/index.ts`
- **Dependencies**: None

**Exact additions**:

```typescript
// Add after the Skillset interface (line 60)

export interface McpServerInner {
  name: string;
  command: string;
  args?: string[];
  mcp_reputation: string;
  researched_at: string;
}

export interface McpServer {
  name: string;
  type: 'stdio' | 'http' | 'docker';
  command?: string;
  args?: string[];
  url?: string;
  image?: string;
  servers?: McpServerInner[];
  mcp_reputation: string;
  researched_at: string;
}
```

And add to `SearchIndexEntry` (after line 31, before the closing `}`):
```typescript
  mcp_servers?: McpServer[];
```

And add to `Skillset` (after line 59, before the closing `}`):
```typescript
  mcp_servers?: McpServer[];
```

### Task 5: Integrate MCP Validation into Audit Command (`cli/src/commands/audit.ts`)

- **Description**: Call `validateMcpServers()` as a new check (check #9) in the audit command, adding the result to the audit report.
- **Acceptance Criteria**:
  - [ ] New `mcpServers` field added to `AuditResults` interface
  - [ ] `validateMcpServers()` called after existing checks
  - [ ] Result included in both the summary table and detailed findings in the audit report
  - [ ] `allPassed` boolean includes MCP validation result
  - [ ] Existing audit tests still pass
  - [ ] New test: audit passes when MCP servers match
  - [ ] New test: audit fails when MCP servers don't match
- **Files to Modify**: `cli/src/commands/audit.ts`
- **File to Modify (tests)**: `cli/src/commands/__tests__/audit.test.ts`
- **Dependencies**: Task 2 (validate-mcp.ts), Task 3 (tests passing)

**Changes to `audit.ts`**:

1. Add import at top:
```typescript
import { validateMcpServers } from '../lib/validate-mcp.js';
```

2. Add to `AuditResults` interface (after line 22):
```typescript
  mcpServers: AuditResult;
```

3. Add to initial results object (after line 352):
```typescript
    mcpServers: { status: 'PASS', details: '' },
```

4. Add check #9 after the version check block (after line 507):
```typescript
  // 9. MCP server validation
  spinner.text = 'Validating MCP servers...';
  const mcpResult = validateMcpServers(cwd);
  if (mcpResult.valid) {
    results.mcpServers = { status: 'PASS', details: 'MCP declarations valid' };
  } else {
    results.mcpServers = {
      status: 'FAIL',
      details: `${mcpResult.errors.length} MCP error(s)`,
      findings: mcpResult.errors.map(e => `- ${e}`).join('\n'),
    };
  }
```

5. Update `allPassed` to include MCP check (in both locations — `generateReport` around line 211-217, and the summary around line 517-523):
```typescript
  results.mcpServers.status === 'PASS' &&
```

6. Add MCP row to the report table in `generateReport` (after the Version Check row):
```typescript
| MCP Servers | ${statusIcon(results.mcpServers.status)} | ${results.mcpServers.details} |
```

7. Add MCP section to detailed findings (after README Link Check section):
```typescript
### 9. MCP Server Validation

${results.mcpServers.findings || 'MCP server declarations are consistent between content and manifest.'}
```

8. Add MCP check to console summary output (after version line):
```typescript
  console.log(`  ${icon(results.mcpServers.status)} MCP Servers: ${results.mcpServers.details}`);
```

**Tests to add to `audit.test.ts`**:

```typescript
  describe('MCP server validation', () => {
    it('passes when no MCP servers present', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      writeFileSync(join(testDir, 'README.md'), '# Test');
      mkdirSync(join(testDir, 'content'));
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('READY FOR SUBMISSION');
      expect(report).toContain('MCP Servers | ✓ PASS');
    });

    it('passes when content MCP matches manifest', async () => {
      const yamlWithMcp = validSkillsetYaml + `
mcp_servers:
  - name: context7
    type: stdio
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads, maintained by Upstash"
    researched_at: "2026-02-04"
`;
      writeFileSync(join(testDir, 'skillset.yaml'), yamlWithMcp);
      writeFileSync(join(testDir, 'README.md'), '# Test');
      mkdirSync(join(testDir, 'content'));
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
      writeFileSync(join(testDir, 'content', '.mcp.json'), JSON.stringify({
        mcpServers: {
          context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] }
        }
      }));

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('READY FOR SUBMISSION');
      expect(report).toContain('MCP Servers | ✓ PASS');
    });

    it('fails when content has MCP but manifest does not', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      writeFileSync(join(testDir, 'README.md'), '# Test');
      mkdirSync(join(testDir, 'content'));
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
      writeFileSync(join(testDir, 'content', '.mcp.json'), JSON.stringify({
        mcpServers: {
          context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] }
        }
      }));

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('NOT READY');
      expect(report).toContain('MCP Servers | ✗ FAIL');
    });
  });
```

---

## Build Agent 2: CLI Install Warning + `--accept-mcp` + Init Degit

**Scope**: Install command MCP warning/prompt, `--accept-mcp` flag, non-interactive exit, init command degit fetch. These are CLI command changes with no file conflicts with Agent 1 or Agent 3.

**Depends on**: Agent 1 Task 4 (types) must be done first so `SearchIndexEntry.mcp_servers` exists. Can run in parallel with Agent 1 Tasks 1-3 if Agent 1 Task 4 is done first.

### Task 1: Add `--accept-mcp` Flag to CLI Entry Point (`cli/src/index.ts`)

- **Description**: Add `--accept-mcp` option to the install command definition.
- **Acceptance Criteria**:
  - [ ] `--accept-mcp` option added to install command
  - [ ] Option passed through to `install()` function
  - [ ] TypeScript compiles
- **File to Modify**: `cli/src/index.ts`
- **Dependencies**: None

**Exact change** — update the install command block (lines 47-59):

```typescript
program
  .command('install')
  .description('Install a skillset to the current directory')
  .argument('<skillsetId>', 'Skillset ID (e.g., @user/skillset-name)')
  .option('-f, --force', 'Overwrite existing files')
  .option('-b, --backup', 'Backup existing files before install')
  .option('--accept-mcp', 'Accept MCP servers without prompting (required for non-interactive environments)')
  .action(async (skillsetId, options) => {
    try {
      await install(skillsetId, options);
    } catch (error) {
      handleError(error);
    }
  });
```

### Task 2: Add MCP Warning to Install Command (`cli/src/commands/install.ts`)

- **Description**: After fetching metadata but BEFORE degit clone, check for MCP servers and display warning with confirmation prompt. `--force` and `--yes` do NOT bypass; only `--accept-mcp` does. Non-interactive environments without `--accept-mcp` exit with error.
- **Acceptance Criteria**:
  - [ ] `InstallOptions` interface gains `acceptMcp?: boolean`
  - [ ] Metadata fetched from search index BEFORE degit clone
  - [ ] If MCP servers present: spinner stopped, inventory printed, GitHub review link shown, `[y/N]` prompt
  - [ ] N response exits cleanly (no files written, no error)
  - [ ] Y response continues installation normally
  - [ ] `--accept-mcp` bypasses prompt entirely
  - [ ] `--force` and `--backup` do NOT bypass MCP prompt
  - [ ] Non-interactive (`!process.stdin.isTTY`) + MCP servers + no `--accept-mcp` → exit code 1 with descriptive message
  - [ ] No MCP servers → no prompt, proceeds normally
  - [ ] Warning format matches design document exactly
  - [ ] Test: install proceeds when no MCP servers
  - [ ] Test: install prompts when MCP servers present
  - [ ] Test: install exits cleanly on N
  - [ ] Test: install proceeds on Y
  - [ ] Test: `--accept-mcp` bypasses prompt
  - [ ] Test: non-TTY exits with error when MCP servers present
- **File to Modify**: `cli/src/commands/install.ts`
- **Dependencies**: Task 1 (index.ts flag), Agent 1 Task 4 (types)

**Updated install.ts pattern**:

```typescript
import degit from 'degit';
import chalk from 'chalk';
import ora from 'ora';
import { confirm } from '@inquirer/prompts';
import { detectConflicts, backupFiles } from '../lib/filesystem.js';
import { verifyChecksums } from '../lib/checksum.js';
import { fetchSkillsetMetadata } from '../lib/api.js';
import { REGISTRY_REPO, DOWNLOADS_URL } from '../lib/constants.js';
import type { McpServer } from '../types/index.js';

interface InstallOptions {
  force?: boolean;
  backup?: boolean;
  acceptMcp?: boolean;
}

function formatMcpWarning(mcpServers: McpServer[], skillsetId: string): string {
  let output = chalk.yellow('\n⚠  This skillset includes MCP servers:\n');

  const nativeServers = mcpServers.filter(s => s.type !== 'docker');
  const dockerServers = mcpServers.filter(s => s.type === 'docker');

  if (nativeServers.length > 0) {
    output += chalk.white('\n  Claude Code managed:\n');
    for (const server of nativeServers) {
      const detail = server.type === 'stdio'
        ? `(${server.command} ${(server.args || []).join(' ')})`
        : `(${server.url})`;
      output += `    ${server.type}: ${server.name} ${detail}\n`;
      output += chalk.gray(`      Reputation: ${server.mcp_reputation} (as of ${server.researched_at})\n`);
    }
  }

  if (dockerServers.length > 0) {
    output += chalk.white('\n  Docker hosted:\n');
    for (const server of dockerServers) {
      output += `    image: ${server.image}\n`;
      output += chalk.gray(`      Reputation: ${server.mcp_reputation} (as of ${server.researched_at})\n`);
      if (server.servers && server.servers.length > 0) {
        output += `      Runs: ${server.servers.map(s => s.name).join(', ')}\n`;
      }
    }
  }

  output += chalk.gray('\n  MCP packages are fetched at runtime and may have changed since audit.\n');
  output += chalk.cyan(`\n  Review before installing:\n    https://github.com/skillsets-cc/main/tree/main/skillsets/${skillsetId}/content\n`);

  return output;
}

export async function install(skillsetId: string, options: InstallOptions): Promise<void> {
  const spinner = ora(`Installing ${skillsetId}...`).start();

  // Check for conflicts
  const conflicts = await detectConflicts(process.cwd());
  if (conflicts.length > 0 && !options.force && !options.backup) {
    spinner.fail('Installation aborted');
    console.log(chalk.yellow('\nExisting files detected:'));
    conflicts.forEach((file) => console.log(`  - ${file}`));
    console.log(chalk.cyan('\nUse one of these flags:'));
    console.log('  --force   Overwrite existing files');
    console.log('  --backup  Backup existing files before install');
    return;
  }

  // Backup if requested
  if (options.backup && conflicts.length > 0) {
    spinner.text = 'Backing up existing files...';
    await backupFiles(conflicts, process.cwd());
  }

  // Fetch metadata and check for MCP servers BEFORE degit
  spinner.text = 'Fetching skillset metadata...';
  try {
    const metadata = await fetchSkillsetMetadata(skillsetId);
    if (metadata?.mcp_servers && metadata.mcp_servers.length > 0) {
      spinner.stop();

      // Non-interactive check
      if (!process.stdin.isTTY && !options.acceptMcp) {
        console.log(chalk.red('This skillset includes MCP servers. Use --accept-mcp to install in non-interactive environments.'));
        process.exit(1);
      }

      if (!options.acceptMcp) {
        console.log(formatMcpWarning(metadata.mcp_servers, skillsetId));

        const accepted = await confirm({
          message: 'Install MCP servers?',
          default: false,
        });

        if (!accepted) {
          console.log(chalk.gray('\nInstallation cancelled.'));
          return;
        }
      }

      spinner.start('Downloading skillset...');
    }
  } catch {
    // If metadata fetch fails, continue without MCP check
    // (registry might be down, don't block install)
  }

  // Install using degit (extract content/ subdirectory)
  spinner.text = 'Downloading skillset...';
  const emitter = degit(`${REGISTRY_REPO}/skillsets/${skillsetId}/content`, {
    cache: false,
    force: true,
    verbose: false,
  });

  await emitter.clone(process.cwd());

  // Verify checksums
  spinner.text = 'Verifying checksums...';
  const result = await verifyChecksums(skillsetId, process.cwd());
  if (!result.valid) {
    spinner.fail('Checksum verification failed - files may be corrupted');
    console.log(chalk.red('\nInstallation aborted due to checksum mismatch.'));
    console.log(chalk.yellow('This could indicate:'));
    console.log('  - Network issues during download');
    console.log('  - Corrupted files in the registry');
    console.log('  - Tampering with the downloaded content');
    console.log(chalk.cyan('\nTo retry:'));
    console.log(`  npx skillsets install ${skillsetId} --force`);
    process.exit(1);
  }

  spinner.succeed(`Successfully installed ${skillsetId}`);

  // Track download (non-blocking, silent fail)
  fetch(DOWNLOADS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillset: skillsetId }),
  }).catch(() => {});

  // Print next steps
  console.log(chalk.green('\n✓ Installation complete!'));
  console.log(chalk.gray('\nNext steps:'));
  console.log('  1. Review CLAUDE.md for usage instructions');
  console.log('  2. Customize .claude/skills/ for your project');
  console.log('  3. Run: claude');
}
```

### Task 3: Update Install Tests (`cli/src/commands/__tests__/install.test.ts`)

- **Description**: Add tests for MCP warning flow: prompt shown, accepted, rejected, `--accept-mcp`, non-TTY.
- **Acceptance Criteria**:
  - [ ] Test: proceeds normally when no MCP servers in metadata
  - [ ] Test: shows warning and prompts when MCP servers present
  - [ ] Test: exits cleanly when user rejects MCP
  - [ ] Test: proceeds when user accepts MCP
  - [ ] Test: `--accept-mcp` bypasses prompt
  - [ ] Test: non-TTY + MCP servers + no `--accept-mcp` exits with code 1
  - [ ] Test: metadata fetch failure doesn't block install
  - [ ] All existing tests still pass
- **File to Modify**: `cli/src/commands/__tests__/install.test.ts`
- **Dependencies**: Task 2

**Test additions** — add these mocks at the top of the file:

```typescript
vi.mock('../../lib/api.js');
vi.mock('@inquirer/prompts');

import { fetchSkillsetMetadata } from '../../lib/api.js';
import { confirm } from '@inquirer/prompts';
```

And add to `beforeEach`:
```typescript
vi.mocked(fetchSkillsetMetadata).mockResolvedValue(undefined); // Default: no metadata
vi.mocked(confirm).mockResolvedValue(true); // Default: accept
```

**New test cases**:

```typescript
  describe('MCP server warning', () => {
    const metadataWithMcp = {
      id: '@user/test-skillset',
      name: 'test-skillset',
      // ... standard fields
      mcp_servers: [{
        name: 'context7',
        type: 'stdio' as const,
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp'],
        mcp_reputation: 'npm: @upstash/context7-mcp, 50k weekly downloads',
        researched_at: '2026-02-04',
      }],
    };

    it('proceeds without prompt when no MCP servers', async () => {
      vi.mocked(fetchSkillsetMetadata).mockResolvedValue({ ...metadataWithMcp, mcp_servers: undefined });
      await install('@user/test-skillset', {});
      expect(confirm).not.toHaveBeenCalled();
      expect(degit).toHaveBeenCalled();
    });

    it('shows warning and prompts when MCP servers present', async () => {
      vi.mocked(fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      vi.mocked(confirm).mockResolvedValue(true);
      await install('@user/test-skillset', {});
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('MCP servers'));
      expect(confirm).toHaveBeenCalled();
      expect(degit).toHaveBeenCalled();
    });

    it('exits cleanly when user rejects MCP', async () => {
      vi.mocked(fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      vi.mocked(confirm).mockResolvedValue(false);
      await install('@user/test-skillset', {});
      expect(degit).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
    });

    it('bypasses prompt with --accept-mcp', async () => {
      vi.mocked(fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      await install('@user/test-skillset', { acceptMcp: true });
      expect(confirm).not.toHaveBeenCalled();
      expect(degit).toHaveBeenCalled();
    });

    it('exits with error in non-TTY without --accept-mcp', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });

      vi.mocked(fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      await install('@user/test-skillset', {});
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(degit).not.toHaveBeenCalled();

      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
    });

    it('continues when metadata fetch fails', async () => {
      vi.mocked(fetchSkillsetMetadata).mockRejectedValue(new Error('Network error'));
      await install('@user/test-skillset', {});
      expect(degit).toHaveBeenCalled();
    });
  });
```

### Task 4: Replace Embedded Audit Skill with Degit Fetch in Init (`cli/src/commands/init.ts`)

- **Description**: Replace the embedded `AUDIT_SKILL_MD` and `AUDIT_CRITERIA_MD` string literals with a degit fetch from `tools/audit-skill/`.
- **Acceptance Criteria**:
  - [ ] `AUDIT_SKILL_MD` and `AUDIT_CRITERIA_MD` string constants removed
  - [ ] degit fetches from `skillsets-cc/main/tools/audit-skill` into `.claude/skills/audit-skill/`
  - [ ] Existing init tests still pass
  - [ ] New test: degit called with correct repo path
- **File to Modify**: `cli/src/commands/init.ts`
- **File to Modify (tests)**: `cli/src/commands/__tests__/init.test.ts`
- **Dependencies**: None

**Changes to init.ts**:

1. Remove `AUDIT_SKILL_MD` (lines 87-169) and `AUDIT_CRITERIA_MD` (lines 171-281) constants entirely.

2. Add degit import (already imported in the file via install? No — init.ts doesn't import degit. Add it):
```typescript
import degit from 'degit';
```

3. Replace the audit-skill file writing block (lines 455-459) with:

```typescript
    // Install audit-skill from registry
    spinner.text = 'Fetching audit-skill...';
    const skillDir = join(cwd, '.claude', 'skills', 'audit-skill');
    const emitter = degit('skillsets-cc/main/tools/audit-skill', {
      cache: false,
      force: true,
      verbose: false,
    });
    await emitter.clone(skillDir);
```

**Run all CLI tests after changes**:
```bash
cd /home/nook/Documents/code/skillsets.cc/cli && npx vitest run
```

---

## Build Agent 3: Search Index Pipeline + Site Types

**Scope**: Build index script, site type definitions. No file conflicts with Agent 1 or Agent 2.

**Depends on**: None (can run in parallel with Agent 1 and 2).

### Task 1: Add MCP Types to Site (`site/src/types/index.ts`)

- **Description**: Add `McpServerInner` and `McpServer` interfaces to site types, and add `mcp_servers` to `SearchIndexEntry`.
- **Acceptance Criteria**:
  - [ ] `McpServerInner` interface added
  - [ ] `McpServer` interface added
  - [ ] `SearchIndexEntry` gains `mcp_servers?: McpServer[]`
  - [ ] Types match CLI types exactly (mirrored)
- **File to Modify**: `site/src/types/index.ts`
- **Dependencies**: None

**Exact additions** — append after `SearchIndexEntry` (after line 31):

```typescript
export interface McpServerInner {
  name: string;
  command: string;
  args?: string[];
  mcp_reputation: string;
  researched_at: string;
}

export interface McpServer {
  name: string;
  type: 'stdio' | 'http' | 'docker';
  command?: string;
  args?: string[];
  url?: string;
  image?: string;
  servers?: McpServerInner[];
  mcp_reputation: string;
  researched_at: string;
}
```

And add to `SearchIndexEntry` (after `files: Record<string, string>;` on line 30):
```typescript
  mcp_servers?: McpServer[];
```

### Task 2: Update Build Index Script (`site/scripts/build-index.ts`)

- **Description**: Add `mcp_servers` to both local interfaces and pass through to search index entries.
- **Acceptance Criteria**:
  - [ ] `SkillsetYaml` interface gains `mcp_servers?` field (with inline type or imported)
  - [ ] `SearchIndexEntry` interface gains `mcp_servers?` field
  - [ ] `buildSkillsetEntry()` passes `manifest.mcp_servers` through to the entry
  - [ ] Build still produces valid `search-index.json`
  - [ ] Test: build with MCP manifest produces index with `mcp_servers` field
  - [ ] Test: build without MCP manifest produces index without `mcp_servers` field
- **File to Modify**: `site/scripts/build-index.ts`
- **Dependencies**: None

**Exact changes**:

1. Add to `SkillsetYaml` interface (after line 44, before closing `}`):
```typescript
  mcp_servers?: Array<{
    name: string;
    type: 'stdio' | 'http' | 'docker';
    command?: string;
    args?: string[];
    url?: string;
    image?: string;
    servers?: Array<{
      name: string;
      command: string;
      args?: string[];
      mcp_reputation: string;
      researched_at: string;
    }>;
    mcp_reputation: string;
    researched_at: string;
  }>;
```

2. Add to local `SearchIndexEntry` interface (after line 70, before closing `}`):
```typescript
  mcp_servers?: SkillsetYaml['mcp_servers'];
```

3. Add to `buildSkillsetEntry` return object (after `files,` on line 238):
```typescript
    mcp_servers: manifest.mcp_servers,
```

**Verification**:
```bash
cd /home/nook/Documents/code/skillsets.cc/site && npm run build:index
# Check output:
cat public/search-index.json | python3 -m json.tool | head -100
```

---

## Build Agent 4: Site UI (Browse Badge + Detail Page MCP Section)

**Scope**: SkillsetGrid MCP badge, detail page MCP server list. No file conflicts with other agents.

**Depends on**: Agent 3 Task 1 (site types must have `mcp_servers`). Can otherwise run in parallel.

### Task 1: Add MCP Indicator Badge to Browse Grid (`site/src/components/SkillsetGrid.tsx`)

- **Description**: Show a small "MCP" badge next to skillsets that include MCP servers on the browse page.
- **Acceptance Criteria**:
  - [ ] Badge appears only when `skillset.mcp_servers` exists and has length > 0
  - [ ] Badge uses existing design language (font-mono, text-xs, border)
  - [ ] Badge text: "MCP" with a subtle indicator color (orange-500 text or border)
  - [ ] Badge positioned in the metadata line (next to stars and tags)
  - [ ] No badge shown for skillsets without MCP servers
- **File to Modify**: `site/src/components/SkillsetGrid.tsx`
- **Dependencies**: Agent 3 Task 1

**Exact change** — in the metadata div (around line 75), add after the StarIcon span:

```tsx
{skillset.mcp_servers && skillset.mcp_servers.length > 0 && (
  <span className="text-xs font-mono text-orange-500 border border-orange-300 px-1 rounded-none" title={`${skillset.mcp_servers.length} MCP server(s)`}>
    MCP
  </span>
)}
```

Also update the `SearchIndexEntry` import to ensure `mcp_servers` is available — the type should already be updated from Agent 3 Task 1.

### Task 2: Add MCP Server List to Detail Page (`site/src/pages/skillset/[namespace]/[name].astro`)

- **Description**: Display MCP server details on the skillset detail page, showing server types, commands/URLs, reputation, and research dates.
- **Acceptance Criteria**:
  - [ ] MCP section only rendered when `skillset.mcp_servers` exists and has length > 0
  - [ ] Section positioned between ProofGallery and README sections
  - [ ] Shows each server: name, type, command/URL, reputation, researched_at
  - [ ] Docker servers show inner servers list
  - [ ] Styling matches existing detail page sections (font-mono, border, uppercase headers)
  - [ ] Links to security information ("MCP packages are fetched at runtime...")
- **File to Modify**: `site/src/pages/skillset/[namespace]/[name].astro`
- **Dependencies**: Agent 3 Task 1

**Exact addition** — insert after the ProofGallery section (after line 119), before the README section:

```astro
{skillset.mcp_servers && skillset.mcp_servers.length > 0 && (
  <section class="border border-orange-300 bg-orange-50/30 p-6 rounded-none">
    <h2 class="text-sm font-bold font-mono mb-4 text-text-ink uppercase tracking-wider border-b border-border-ink pb-2 inline-block">
      MCP Servers
    </h2>
    <div class="space-y-4">
      {skillset.mcp_servers.filter(s => s.type !== 'docker').length > 0 && (
        <div>
          <h3 class="text-xs font-bold font-mono text-text-tertiary uppercase tracking-wider mb-2">Claude Code Managed</h3>
          {skillset.mcp_servers.filter(s => s.type !== 'docker').map(server => (
            <div class="mb-3 pl-4 border-l-2 border-orange-300">
              <div class="font-mono text-sm">
                <span class="text-orange-500">{server.type}</span>: {server.name}
                {server.command && <span class="text-text-tertiary"> ({server.command} {(server.args || []).join(' ')})</span>}
                {server.url && <span class="text-text-tertiary"> ({server.url})</span>}
              </div>
              <div class="text-xs text-text-tertiary mt-1">
                Reputation: {server.mcp_reputation} <span class="italic">(as of {server.researched_at})</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {skillset.mcp_servers.filter(s => s.type === 'docker').length > 0 && (
        <div>
          <h3 class="text-xs font-bold font-mono text-text-tertiary uppercase tracking-wider mb-2">Docker Hosted</h3>
          {skillset.mcp_servers.filter(s => s.type === 'docker').map(server => (
            <div class="mb-3 pl-4 border-l-2 border-orange-300">
              <div class="font-mono text-sm">
                image: <span class="text-text-ink">{server.image}</span>
              </div>
              <div class="text-xs text-text-tertiary mt-1">
                Reputation: {server.mcp_reputation} <span class="italic">(as of {server.researched_at})</span>
              </div>
              {server.servers && server.servers.length > 0 && (
                <div class="text-xs text-text-tertiary mt-1">
                  Runs: {server.servers.map(s => s.name).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    <p class="text-xs text-text-tertiary mt-4 italic">
      MCP packages are fetched at runtime and may have changed since audit.
    </p>
  </section>
)}
```

---

## Build Agent 5: Manifest Migration + CI + Audit Tooling

**Scope**: The_Skillset manifest migration, CI workflow update, CRITERIA.md expansion, SKILL.md update, sync-to-prod comment. No file conflicts with other agents.

**Depends on**: Agent 1 Task 1 (schema must accept `mcp_servers` for validation to pass).

### Task 1: Migrate The_Skillset Manifest (`skillsets/@supercollectible/The_Skillset/skillset.yaml`)

- **Description**: Add `mcp_servers` field with the Docker-hosted LiteLLM proxy and its inner servers (context7, filesystem).
- **Acceptance Criteria**:
  - [ ] `mcp_servers` array added to skillset.yaml
  - [ ] Docker entry for `litellm-proxy` with image `ghcr.io/berriai/litellm:main-latest`
  - [ ] Inner servers: `context7` and `filesystem` with command, args, reputation, researched_at
  - [ ] Validates against updated schema
  - [ ] `mcp_reputation` fields are >= 20 characters
  - [ ] `researched_at` dates use ISO date format (YYYY-MM-DD)
- **File to Modify**: `skillsets/@supercollectible/The_Skillset/skillset.yaml`
- **Dependencies**: Agent 1 Task 1

**Exact addition** — append before the closing of the file, after `entry_point`:

```yaml

# MCP Servers
mcp_servers:
  - name: "litellm-proxy"
    type: "docker"
    image: "ghcr.io/berriai/litellm:main-latest"
    mcp_reputation: "ghcr: berriai/litellm, widely used LLM proxy, active maintenance, 20k+ GitHub stars"
    researched_at: "2026-02-05"
    servers:
      - name: "context7"
        command: "npx"
        args: ["-y", "@upstash/context7-mcp"]
        mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads, maintained by Upstash"
        researched_at: "2026-02-05"
      - name: "filesystem"
        command: "npx"
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/project:ro"]
        mcp_reputation: "npm: @modelcontextprotocol/server-filesystem, official Anthropic MCP server"
        researched_at: "2026-02-05"
```

### Task 2: Update CI Workflow (`.github/workflows/validate-submission.yml`)

- **Description**: Replace ad-hoc bash validation with `npx skillsets audit --dir` call. The `--dir` option doesn't exist yet in the CLI, so for now CI should `cd` into each changed dir and run `npx skillsets audit`. Also keep existing bash checks as they cover author verification which audit doesn't handle.
- **Acceptance Criteria**:
  - [ ] `npx skillsets audit` added as an additional validation step (does NOT replace author verification)
  - [ ] New step runs after "Verify content structure" step
  - [ ] Step installs CLI dependencies and runs audit
  - [ ] Audit failure causes CI to fail
  - [ ] Existing steps preserved (schema validation, required files, content structure, secrets, author verification remain — they provide defense in depth)
- **File to Modify**: `.github/workflows/validate-submission.yml`
- **Dependencies**: Agent 1 Tasks 2, 5 (validate-mcp module + audit integration must be merged first for this to work in CI; for now, add the step — it will work once published)

**New step** — add after the "Verify content structure" step:

```yaml
      - name: Setup Node.js for CLI
        if: steps.changed.outputs.dirs != ''
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run skillsets audit
        if: steps.changed.outputs.dirs != ''
        run: |
          EXIT_CODE=0
          for dir in ${{ steps.changed.outputs.dirs }}; do
            echo "=========================================="
            echo "Running audit on $dir"
            echo "=========================================="

            cd "$dir"
            npx skillsets@latest audit || EXIT_CODE=1
            cd "$GITHUB_WORKSPACE"
          done

          exit $EXIT_CODE
```

### Task 3: Expand CRITERIA.md MCP Section (`tools/audit-skill/CRITERIA.md`)

- **Description**: Replace the minimal MCP section with comprehensive evaluation criteria covering per-server evaluation, Docker-specific evaluation, reputation research, and runtime caveats.
- **Acceptance Criteria**:
  - [ ] Per-server evaluation criteria: purpose justification, transport risk, package reputation via WebSearch/WebFetch, version pinning, least privilege, alternative analysis
  - [ ] Docker-specific: container image reputation, inner server listing, port exposure, volume mounts
  - [ ] Runtime caveat: researched_at captures when lookup was performed, not ongoing validity
  - [ ] Convention note about `content/docker/**/config.yaml` scanning
  - [ ] SSE deprecation note
- **File to Modify**: `tools/audit-skill/CRITERIA.md`
- **Dependencies**: None

**Replace the existing MCP section (lines 115-144)** with the expanded version from the design document. Keep all other sections intact. The new MCP section should be:

```markdown
## MCP Servers (`.mcp.json`, `.claude/settings.json`, Docker configs)

### Configuration Sources

| Source | Path | Key |
|--------|------|-----|
| Claude Code native | `content/.mcp.json` | `mcpServers` |
| Claude Code settings | `content/.claude/settings.json` | `mcpServers` |
| Claude Code local settings | `content/.claude/settings.local.json` | `mcpServers` |
| Docker-hosted | `content/docker/**/config.yaml` | `mcp_servers` |

### Per-Server Evaluation

For each MCP server found, evaluate:

1. **Purpose justification**: Does the README explain why this server is needed?
2. **Transport risk assessment**:
   - `stdio` = local execution (lower risk but runs arbitrary code)
   - `http` = remote data transmission via Streamable HTTP (data leaves the machine)
   - SSE transport is deprecated (MCP spec 2025-03-26); flag if found
3. **Package reputation** (use WebSearch + WebFetch — mandatory):
   - npm/PyPI: download counts, last publish date, maintainer identity
   - GitHub: stars, open issues, last commit date
   - Container images: registry, publisher, pull counts
4. **Version pinning**: Flag unpinned `npx -y` as a warning; recommend pinned versions (e.g., `@upstash/context7-mcp@1.0.0`)
5. **Least privilege**: read-only vs read-write access, scoped paths vs broad access
6. **Alternative analysis**: Could a local tool or built-in capability replace a remote MCP server?

### Docker-Specific Evaluation

For each Docker-hosted MCP setup:

1. **Container image reputation** (same web lookup as packages)
2. **Inner MCP servers**: What servers run inside the container? List each with same per-server evaluation
3. **Port exposure**: What ports are exposed? Are they necessary?
4. **Volume mounts**: What directories are mounted? Are they read-only where possible?
5. **README documentation**: Must document the Docker setup and what it runs

**Convention note:** CI scans `content/docker/**/config.yaml` for the `mcp_servers` key. This is currently based on LiteLLM's config format (the only Docker MCP provider in the registry). Contributors using other Docker MCP providers must declare their servers in the same `mcp_servers` key structure, or document an alternative config path for CI scanning.

### Environment Variables

- `${VAR}` = expand from environment
- `${VAR:-default}` = expand with fallback
- Sensitive values MUST reference env vars, not hardcoded values

### Red Flags

- Hardcoded secrets (use `${VAR}` instead)
- Missing `type` field
- `stdio` servers without clear command path
- Unnecessary remote servers for local tasks
- Unpinned package versions in production
- Overly broad filesystem access (e.g., `/` instead of scoped path)

### Runtime Caveat (must include in audit report)

MCP packages are fetched at runtime and may have changed since audit. `researched_at` captures when the lookup was performed, not ongoing validity.
```

### Task 4: Update SKILL.md with WebSearch/WebFetch (`tools/audit-skill/SKILL.md`)

- **Description**: Add `WebSearch, WebFetch` to the `allowed-tools` frontmatter field (currently `Read, Glob, Grep, Edit`). This is mandatory for MCP reputation research.
- **Acceptance Criteria**:
  - [ ] `allowed-tools` updated to: `Read, Glob, Grep, Edit, WebSearch, WebFetch`
  - [ ] No other changes to the file
- **File to Modify**: `tools/audit-skill/SKILL.md`
- **Dependencies**: None

**Exact change** — line 5 of `tools/audit-skill/SKILL.md`:

From:
```
allowed-tools: Read, Glob, Grep, Edit
```

To:
```
allowed-tools: Read, Glob, Grep, Edit, WebSearch, WebFetch
```

### Task 5: Add Sync-to-Prod Preservation Comment (`.github/workflows/sync-to-prod.yml`)

- **Description**: Add a comment in the "Remove dev-only files" step documenting that `tools/` must be preserved for degit distribution.
- **Acceptance Criteria**:
  - [ ] Comment added to the rm block explaining `tools/` preservation
  - [ ] No functional changes to the workflow
- **File to Modify**: `.github/workflows/sync-to-prod.yml`
- **Dependencies**: None

**Exact change** — add comment after line 25 in the "Remove dev-only files" step:

```yaml
      - name: Remove dev-only files
        run: |
          rm -rf .claude/
          rm -f CLAUDE.md
          rm -rf docker/
          rm -rf PROCESS_DOCS/
          rm -f .github/workflows/sync-to-prod.yml
          # DO NOT remove tools/ — tools/audit-skill/ is fetched by CLI `init` via degit

          echo "Removed dev-only files"
```

---

## Testing Strategy

### Unit Tests (Agent 1 + Agent 2)
- **`cli/src/lib/__tests__/validate-mcp.test.ts`**: ~15 test cases covering all truth table scenarios, native/docker/http types, error handling
- **`cli/src/commands/__tests__/audit.test.ts`**: ~3 new test cases for MCP integration
- **`cli/src/commands/__tests__/install.test.ts`**: ~7 new test cases for MCP warning flow

### Integration Tests (manual verification)
- Schema validation: `npx ajv validate` against test manifests
- Build index: `npm run build:index` produces valid JSON with `mcp_servers`
- CLI flow: `npx skillsets install @supercollectible/The_Skillset` shows MCP warning

### Run Command (validates everything)
```bash
cd /home/nook/Documents/code/skillsets.cc/cli && npx vitest run
```

---

## Dependency Graph

```
Agent 1 Task 1 (Schema) ─────────────────────────► Agent 5 Task 1 (The_Skillset manifest)
Agent 1 Task 2 (validate-mcp.ts) ─► Agent 1 Task 3 (tests)
Agent 1 Task 4 (CLI types) ──────► Agent 2 Task 2 (install.ts)
Agent 1 Task 5 (audit integration) ◄── Agent 1 Task 2
Agent 1 Task 5 (audit integration) ◄── Agent 1 Task 3

Agent 2 Task 1 (index.ts flag) ──► Agent 2 Task 2 (install.ts)
Agent 2 Task 2 (install.ts) ─────► Agent 2 Task 3 (install tests)
Agent 2 Task 4 (init degit) ───── independent

Agent 3 Task 1 (site types) ─────► Agent 4 Tasks 1-2 (site UI)
Agent 3 Task 2 (build-index) ──── independent

Agent 5 Tasks 2-5 ──────────────── mostly independent
```

**Parallel execution**: Agents 1, 3, and 5 can start simultaneously. Agent 2 starts after Agent 1 Task 4. Agent 4 starts after Agent 3 Task 1.

---

## Success Criteria

### Functional
- [ ] `npx skillsets audit` validates MCP server declarations bidirectionally
- [ ] `npx skillsets install` shows MCP warning before downloading
- [ ] `--accept-mcp` bypasses the prompt; `--force`/`--yes` do not
- [ ] Non-TTY without `--accept-mcp` exits with error code 1
- [ ] Schema validates manifests with and without `mcp_servers`
- [ ] Search index includes `mcp_servers` for skillsets that declare them
- [ ] Browse page shows MCP badge
- [ ] Detail page shows MCP server list
- [ ] `npx skillsets init` fetches audit-skill via degit
- [ ] The_Skillset passes audit with new MCP declarations

### Non-Functional
- [ ] All existing tests pass (no regressions)
- [ ] All new tests pass
- [ ] `cd cli && npx vitest run` exits 0
- [ ] TypeScript compiles without errors (`cd cli && npx tsc --noEmit`)
- [ ] Schema validates with `ajv --spec=draft2020 -c ajv-formats`

### Implementation Notes

**Gotchas**:
1. `.mcp.json` uses `mcpServers` (camelCase), but `skillset.yaml` and Docker `config.yaml` use `mcp_servers` (snake_case). The validation module must handle both conventions.
2. LiteLLM `config.yaml` `mcp_servers` uses an **object** keyed by server name, not an array. `skillset.yaml` `mcp_servers` uses an **array** with `name` field. The validation module must normalize both.
3. `unevaluatedProperties` requires Draft 2020-12. The schema's `$schema` is already set to `https://json-schema.org/draft/2020-12/schema` and CI runs `--spec=draft2020`. Verify this works locally.
4. The `confirm` import from `@inquirer/prompts` is already available in the CLI (used by `init.ts`). No new dependency needed.
5. The existing `install.test.ts` mocks degit with `vi.mock('degit')` — the new MCP tests must also mock `fetchSkillsetMetadata` and `confirm`.
6. `process.stdin.isTTY` is `undefined` when not a TTY (not `false`). The check should be `!process.stdin.isTTY`, which catches both `undefined` and `false`.
7. When running tests, the `audit.test.ts` uses `process.chdir()` into tmpdir. After Agent 1 Task 5 adds `validateMcpServers()` to audit, the test fixtures must include a `content/` directory for the MCP validation to work correctly (it does — existing tests already create `content/`).

**Helpful commands**:
```bash
# Run all CLI tests
cd /home/nook/Documents/code/skillsets.cc/cli && npx vitest run

# Run specific test file
cd /home/nook/Documents/code/skillsets.cc/cli && npx vitest run src/lib/__tests__/validate-mcp.test.ts

# TypeScript check
cd /home/nook/Documents/code/skillsets.cc/cli && npx tsc --noEmit

# Schema validation
cd /home/nook/Documents/code/skillsets.cc && npx ajv-cli validate -s schema/skillset.schema.json -d <(yq eval -o=json skillsets/@supercollectible/The_Skillset/skillset.yaml) --spec=draft2020 -c ajv-formats

# Build search index
cd /home/nook/Documents/code/skillsets.cc/site && npm run build:index
```
