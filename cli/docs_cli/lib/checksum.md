# checksum.ts

## Overview
**Purpose**: SHA-256 checksum computation and verification against registry

## Dependencies
- External: `crypto`, `fs/promises`, `path`
- Internal: `lib/api`

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `computeFileChecksum` | SHA-256 hash of file | `filePath` → `Promise<string>` |
| `stripChecksumPrefix` | Remove `sha256:` prefix | `checksum` → `string` |
| `verifyChecksums` | Compare local vs registry | `skillsetId, dir` → `Promise<{valid, mismatches}>` |

### Return Types
```typescript
// verifyChecksums return
{
  valid: boolean;
  mismatches: Array<{
    file: string;
    expected: string;
    actual: string; // or 'MISSING'
  }>;
}
```

## Data Flow
```
verifyChecksums() → fetchSkillsetMetadata() → For each file: computeFileChecksum() → Compare
```

## Integration Points
- Called by: `commands/install`
- Calls: `lib/api.fetchSkillsetMetadata()`

## Critical Paths

**Path Handling**: The registry stores paths as `content/CLAUDE.md` but degit extracts the content folder's contents directly to the target directory. Verification strips the `content/` prefix and only verifies `content/*` files (skips root-level files like `PROOF.md`, `skillset.yaml`).

## Error Handling
- Missing file: Reports as `actual: 'MISSING'`
- Skillset not found: Throws error

## Testing
- Test file: `__tests__/checksum.test.ts`
- Key tests: Compute checksum, prefix stripping, mismatch detection
