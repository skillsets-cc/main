# Security Review: CLI Source (`cli/src/`)

**Date**: 2026-02-09
**Reviewer**: Opus (manual review, all source files + adversarial second pass)
**Scope**: All 15 TypeScript files in `cli/src/` (commands, lib, types)
**Threat model**: Curated OSS registry — PR-reviewed content, GitHub mono-repo, Cloudflare CDN over HTTPS, OAuth via GitHub

---

## Summary

18 findings total. 6 are actionable for v1, the rest are deferred — either mitigated by the curated registry model (PR review, Cloudflare, GitHub trust boundary) or not worth the code churn.

### v1 Fix List

| # | Finding | Location | Effort |
|---|---------|----------|--------|
| 1 | Missing `skillsetId` validation | `install.ts:109` | One regex |
| 2 | MCP consent bypass on metadata failure | `install.ts:102-105` | Post-install content check |
| 3 | No rollback on checksum failure | `install.ts:115-130` | Extract to temp, verify, move |
| 4 | Checksum hashes UTF-8 decoded content | `checksum.ts:10` | One-line change |
| 5 | Secret scanner misses `.env`, `.sh`, etc. | `audit.ts:132` | Expand extension list |
| 6 | `authorUrl` not validated | `init.ts:207` | Copy `productionUrl` validator |

### Deferred

| Finding | Why deferred |
|---------|-------------|
| YAML template injection (H2) | User authors own local file; server re-validates via schema on PR |
| Symlink following in audit (H4) | Content is PR-reviewed; CI runs in ephemeral containers |
| Unsigned CDN index (M3) | HTTPS + Cloudflare sufficient for v1; signing has same key distribution problem |
| YAML schema parameter (M5) | Lockfile pins js-yaml 4.1.1; `^4.1.0` prevents 3.x |
| One-directional checksums (NEW-3) | Requires GitHub tarball-level tampering; defense-in-depth for v2 |
| Terminal escape injection (NEW-4) | Content is PR-reviewed; attacker needs ANSI escapes past human review |
| Server `batchId` injection (NEW-5) | Own API on own Cloudflare worker; if compromised, YAML injection is least concern |
| Audit scope over-reach (NEW-6) | User reviews own report before submitting |
| Audit-skill no integrity check (NEW-7) | Same repo, same trust root as everything else |
| Prototype pollution (L1) | No exploitable gadgets |
| Download counter manipulation (L2) | Vanity metric; server-side rate limited |
| Force push to fork (L3) | User's own fork, scoped branch name |
| Remaining LOW items | Not worth code churn |

---

## v1 Findings (Fix)

### 1. Missing `skillsetId` Validation — `install.ts:109`

The `skillsetId` CLI argument is interpolated directly into a degit URL with no format validation:

```typescript
const emitter = degit(`${REGISTRY_REPO}/skillsets/${skillsetId}/content`, ...);
```

A crafted input like `../../tools/audit-skill` causes degit to resolve `skillsets-cc/main/skillsets/../../tools/audit-skill/content` — extracting unintended repo content into the user's working directory. Traversal is constrained to within the `skillsets-cc/main` repo (degit resolves owner/repo first), but fetching arbitrary repo subdirectories is still a real risk.

Compare with `submit.ts:52-55` which validates name/author with `^[A-Za-z0-9_-]+$` before any use.

**Fix**: Validate `skillsetId` matches `^@[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$` before use.

---

### 2. MCP Consent Bypass on Metadata Failure — `install.ts:102-105`

```typescript
} catch {
  // If metadata fetch fails, continue without MCP check
  // (registry might be down, don't block install)
}
```

If `fetchSkillsetMetadata` throws (network error, DNS disruption, CDN outage), the entire MCP consent flow is skipped. The comment documents this as intentional, but it's the wrong tradeoff — the MCP consent gate is the primary security control for third-party tool transparency.

**Fix**: After degit extraction, check the downloaded content for `.mcp.json` or `.claude/settings.json`. If MCP declarations are found and consent was never obtained, prompt the user or abort.

---

### 3. No Rollback on Checksum Failure — `install.ts:115-130`

The install flow is write-then-verify with no cleanup:

```
line 115: await emitter.clone(process.cwd())       // files written to disk
line 119: const result = await verifyChecksums(...) // verification AFTER write
line 122: console.log('Installation aborted...')    // message says aborted...
line 129: process.exit(1)                           // ...but files remain on disk
```

When checksums fail, the extracted content persists in the user's working directory. The error message says "Installation aborted" but nothing is rolled back. If a user or script ignores the exit code, they have unverified content including potentially tampered `.claude/` skills or MCP configurations.

Combined with finding #2 (MCP consent bypass), an attacker who can serve a modified tarball gets content on disk even when verification fails, and MCP consent may have been skipped.

**Fix**: Extract to a temp directory first. Verify checksums against the temp copy. Move to cwd only on success. Delete temp on failure.

---

### 4. Checksum Hashes UTF-8 Decoded Content — `checksum.ts:10`

```typescript
const content = await fs.readFile(filePath, 'utf-8');
return crypto.createHash('sha256').update(content).digest('hex');
```

Reading as UTF-8 before hashing is lossy for non-UTF-8 content. Invalid byte sequences become replacement characters (`U+FFFD`), changing the hash. If the registry computes checksums on raw bytes, verification silently fails for binary files. If both sides use UTF-8, different raw bytes that normalize identically through UTF-8 produce the same hash.

**Fix**: `fs.readFile(filePath)` without encoding argument. Returns a Buffer, hashes raw bytes.

---

### 5. Secret Scanner Misses Common File Types — `audit.ts:132`

The scanner allowlist at line 132:
```typescript
if (!['.md', '.txt', '.json', '.yaml', '.yml', '.js', '.ts', '.py'].includes(ext)) continue;
```

The `TEXT_EXTENSIONS` set at line 42 (used by `isBinaryFile`) already recognizes `.sh`, `.bash`, `.toml`, `.conf`, `.env.example` — but the secret scanner's own list is narrower. Key omissions:

- **`.env`** — the single most common location for hardcoded secrets
- **`.sh`, `.bash`** — shell scripts with embedded tokens (already in `TEXT_EXTENSIONS`)
- **`.toml`, `.conf`** — config files (already in `TEXT_EXTENSIONS`)
- **No-extension files** — `Dockerfile`, `Makefile`, etc.

**Fix**: Expand the scanner list, or invert to scan all non-binary files (reuse `TEXT_EXTENSIONS` + `isBinaryFile`).

---

### 6. `authorUrl` Not Validated — `init.ts:207-210`

`productionUrl` (line 214) validates with `new URL()`. `authorUrl` accepts any string:

```typescript
const authorUrl = await input({
  message: 'Author URL (GitHub profile or website):',
  default: `https://github.com/${authorHandle.slice(1)}`,
  // no validate callback
});
```

This value is written into `skillset.yaml` and eventually rendered on the website. Server-side `sanitizeUrl` with protocol allowlist exists, but client-side validation is the first line of defense.

**Fix**: Add `validate` callback with `new URL()`, same as `productionUrl`.

---

## Deferred Findings (Full Detail)

### H2. YAML Template Injection — `init.ts:283-290`

User input is string-replaced into a YAML template without escaping. The `description` validator (line 188) checks length only, and `authorUrl` (line 207) has no validator. A description containing `"` breaks the double-quoted YAML scalar.

**Why deferred**: The user is authoring their own `skillset.yaml`. They could edit it directly. The PR submission pipeline re-validates via JSON Schema. The blast radius is the user's own local file.

---

### H4. Symlink Following in Audit — `audit.ts:61-82`

`getAllFiles()` uses `readdirSync({withFileTypes: true})` + `statSync`. Symlinks to files fall into the else branch and are followed by `statSync` and `readFileSync`. Symlinks to directories are NOT followed (`Dirent.isDirectory()` returns false for symlinks).

The audit report at line 295 includes file paths and pattern names for matches, not literal file content. Information disclosure is limited to confirming that files matching secret patterns exist at symlink targets.

**Why deferred**: Content is PR-reviewed. A symlink in a submission would be visible to reviewers. CI runs in ephemeral containers with no sensitive host files.

---

### M3. Unsigned CDN Search Index — `api.ts:13-31`

`fetchSearchIndex()` trusts the CDN response without signature verification. The index is the root of trust for checksums, MCP metadata, and version checks.

**Why deferred**: HTTPS provides transport integrity. Cloudflare CDN provides a trust boundary. Index signing requires build pipeline changes and has the same key distribution problem (where does the CLI get the public key?). Appropriate for v2 when the registry is larger.

---

### M5. YAML Schema Parameter — Multiple Files

`yaml.load()` called without explicit schema in `audit.ts:165`, `submit.ts:47`, `filesystem.ts:79`, `validate-mcp.ts:156/191/274`. Safe in js-yaml 4.x (defaults to `DEFAULT_SCHEMA`), dangerous in 3.x (`DEFAULT_FULL_SCHEMA` enables `!!js/function`).

**Why deferred**: `package.json` specifies `"^4.1.0"`. `package-lock.json` pins `4.1.1`. The semver range prevents 3.x installation. A downgrade requires an explicit action.

---

### NEW-3. One-Directional Checksum Verification — `checksum.ts:37-41`

`verifyChecksums` iterates over `metadata.files` (from the index) and checks each listed file. It does NOT detect extra files on disk not in the index. A compromised tarball could inject additional files (e.g., `.claude/settings.json` with MCP servers) that bypass verification entirely.

**Why deferred**: Requires GitHub tarball-level tampering. The content comes from a PR-reviewed mono-repo. Defense-in-depth for v2.

---

### NEW-4. Terminal Escape Injection via CDN Data — `search.ts:46-50`, `list.ts:72-85`

CDN index fields (`name`, `description`, `author.handle`) are rendered to the terminal without sanitizing ANSI escape sequences. Terminal escapes can clear the screen, set the title, or in some emulators write to the clipboard.

**Why deferred**: Index content is curated via PR review. An attacker would need to get ANSI escapes past human review into the registry.

---

### NEW-5. Server `batchId` Injected into YAML — `init.ts:141-284`

The `batchId` from the reservation API (`res.json() as { batchId: string | null }`) is interpolated into the YAML template without validation. Same injection class as H2, but server-controlled.

**Why deferred**: The API is the project's own Cloudflare worker. If the API is compromised, YAML injection in a local init file is the least concern.

---

### NEW-6. Audit Scans Entire CWD — `audit.ts:431, 469`

`getAllFiles(cwd)` and `scanForSecrets(cwd)` scan the full working directory, not just submission content. The generated `AUDIT_REPORT.md` includes a file inventory and secret matches from unrelated project files.

**Why deferred**: The user reviews their own report before submitting via `npx skillsets submit`. Non-submission files in the report would be visible and removable.

---

### NEW-7. Audit Skill Downloaded Without Integrity — `init.ts:310-316`

`init` downloads `audit-skill` via degit with no checksum. The skill runs with full Claude Code agent capabilities.

**Why deferred**: The skill comes from `skillsets-cc/main/tools/audit-skill` — the same repo that hosts everything else. If that repo is compromised, integrity checks on this one file don't help.

---

### L1. Prototype Pollution Surface

`JSON.parse()` and `yaml.load()` results iterated via `Object.entries()` without `__proto__` sanitization. No exploitable gadgets in current code.

---

### L2. Download Counter Manipulation — `install.ts:135-139`

Fire-and-forget POST, no client dedup. Server-side rate limited (30/hr per IP).

---

### L3. Force Push to Fork — `submit.ts:219`

`--force` on `submit/{author}/{name}` branch. User's own fork, scoped branch name.

---

### NEW-8. Inconsistent `execSync` vs `spawnSync` — `submit.ts:183, 190`

`gh` commands use `execSync` with template literals while git commands use array-based `spawnSync`. Interpolated values are constants (`REGISTRY_REPO`) and safe values (`tmpdir() + Date.now()`), so no current risk. Noted for code hygiene.

---

### NEW-9. Predictable Temp Directory — `submit.ts:177`

`Date.now()` is predictable. `mkdtempSync` would be safer. Requires local attacker with timing.

---

### NEW-10. `cpSync` Preserves Symlinks into PR — `submit.ts:206`

`cpSync({recursive: true})` defaults to `dereference: false`. Symlinks in `content/` are preserved, leaking target paths (not content) into the public PR.

---

### NEW-11. No Network Timeouts — Multiple Files

All `fetch()` calls lack timeouts. A slow server hangs the CLI indefinitely.

---

## Positive Findings

| Location | Practice |
|----------|----------|
| `submit.ts:52-55` | Strict regex validation on name/author/version before shell use |
| `submit.ts:194-219` | Array-based `spawnSync` for all git operations (no shell injection) |
| `install.ts:80-84` | Non-TTY guard blocks auto-accept of MCP servers |
| `init.ts:139` | `encodeURIComponent()` on API query parameter |
| `audit.ts:51-59` | Secret pattern scanning for AWS, GitHub, OpenAI key formats |
| `constants.ts` | All URLs hardcoded as HTTPS constants |
| `install.ts:117-130` | SHA-256 checksum verification post-download |
| `audit.ts:73` | `.git` excluded from directory traversal |
| `init.ts:176,200` | Strict regex on `name` and `authorHandle` in init flow |
| `audit.ts:144` | Regex `lastIndex` properly reset in secret scanner loop |
