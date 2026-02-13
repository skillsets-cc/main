# scripts/build-index.ts

## Overview
**Purpose**: Generates `public/search-index.json` by scanning the `skillsets/` registry directory — parses manifests, computes SHA-256 checksums, and optionally fetches live star counts from Cloudflare KV.

## Dependencies
- External: `yaml` (YAML parsing), `crypto` (SHA-256), `fs`/`path` (filesystem)
- Services: Cloudflare KV API (optional, for star counts)

## Key Functions

| Function | Purpose | Inputs / Output |
|----------|---------|-----------------|
| `buildIndex` | Main entry — orchestrates discovery, star fetch, entry building, and file write | `void` → writes `search-index.json` |
| `discoverSkillsets` | Scans `skillsets/@ns/name/` for directories with `skillset.yaml` | `void` → `string[]` (IDs like `@ns/name`) |
| `buildSkillsetEntry` | Parses manifest + computes checksums for one skillset | `(id, manifest, dir, stars)` → `SearchIndexEntry` |
| `computeSkillsetChecksum` | SHA-256 hash of all files in a skillset directory | `(dir)` → `{ checksum, files }` |
| `computeSha256` | Single-file SHA-256 | `(content)` → hex string |
| `fetchStarCounts` | Reads star counts from Cloudflare KV API | `void` → `Record<string, number>` |
| `createCloudflareKVClient` | Cloudflare KV REST API client | `(accountId, token, nsId)` → `{ listKeys, getValue }` |

## Data Flow
```
skillsets/@ns/name/skillset.yaml
  ↓
discoverSkillsets() → list of skillset IDs
  ↓
For each: parse YAML → buildSkillsetEntry() → checksums + metadata
  ↓
fetchStarCounts() → merge KV star counts (0 if no credentials)
  ↓
Write public/search-index.json
```

## Configuration
| Env Var | Required | Purpose |
|---------|----------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | No | Cloudflare account (for star counts) |
| `CLOUDFLARE_API_TOKEN` | No | API token with KV read access |
| `KV_NAMESPACE_ID` | No | DATA KV namespace ID |

Without credentials, all star counts default to 0.

## Integration Points
- **package.json**: `npm run build:index` runs this script via `tsx`
- **GitHub Actions**: `sync-to-prod.yml` runs this before Astro build
- **public/search-index.json**: Output consumed by site (build-time import) and CLI (CDN fetch)
- **schema/skillset.schema.json**: Manifest structure this script parses
