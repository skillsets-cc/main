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
- Called by: `commands/install`, `commands/verify`
- Calls: `lib/api.fetchSkillsetMetadata()`

## Error Handling
- Missing file: Reports as `actual: 'MISSING'`
- Skillset not found: Throws error

## Testing
- Test file: `__tests__/checksum.test.ts`
- Key tests: Compute checksum, prefix stripping, mismatch detection
