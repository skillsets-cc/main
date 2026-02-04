# Types Architecture

## Overview
TypeScript interface definitions for skillsets, search index, and related data structures. Provides type safety across the site module for skillset metadata, verification, and API responses.

## Directory Structure
```
types/
├── docs_types/
│   └── index.md           # Documentation for type definitions
└── index.ts               # Type exports
```

## Type Definitions

### Skillset
Full skillset manifest matching the `skillset.yaml` schema structure. Used for validation and type checking.

```typescript
interface Skillset {
  schema_version: string;
  name: string;
  version: string;
  description: string;
  author: { handle: string; url: string };
  verification: {
    production_links: Array<{ url: string; label?: string }>;
    production_proof?: string;
    audit_report: string;
  };
  tags: string[];
  compatibility: {
    claude_code_version: string;
    languages: string[];
  };
  status: 'active' | 'deprecated' | 'archived';
  entry_point: string;
}
```

### SearchIndex
Root structure for the build-time generated search index.

```typescript
interface SearchIndex {
  version: string;
  generated_at: string;
  skillsets: SearchIndexEntry[];
}
```

### SearchIndexEntry
Extended skillset entry with additional fields for search, CLI, and verification.

```typescript
interface SearchIndexEntry {
  id: string;                    // @namespace/name
  name: string;
  description: string;
  tags: string[];
  author: { handle: string; url?: string };
  stars: number;                  // Build-time star count
  version: string;
  status: 'active' | 'deprecated' | 'archived';
  verification: { ... };
  compatibility: { ... };
  entry_point: string;
  checksum: string;               // SHA-256 of skillset content
  files: Record<string, string>;  // File path → checksum map
}
```

## Integration Points

### Used By
- **lib/data.ts**: Type-safe search index access
- **pages/*.astro**: Component props and page data
- **components/*.tsx**: React component props
- **API routes**: Request/response type checking

### Type Flow
```
skillset.yaml (source)
  ↓
GitHub Action validates against schema
  ↓
search-index.json generated with SearchIndexEntry[]
  ↓
TypeScript import as SearchIndex type
  ↓
Type-safe access in pages/components
```

## Design Patterns

### Strict Typing
- No `any` types allowed
- Optional fields explicitly marked with `?`
- Status as union type (not string)

### Type Reuse
- `SearchIndexEntry` extends `Skillset` conceptually
- Shared verification and compatibility structures
- DRY principle for nested objects

### Build-Time Safety
- Types match JSON schema validation
- Compile-time checks prevent runtime errors
- IDE autocomplete and type hints

## Key Differences: Skillset vs SearchIndexEntry

| Field | Skillset | SearchIndexEntry | Purpose |
|-------|----------|------------------|---------|
| `id` | ❌ | ✅ | Unique identifier for lookups |
| `stars` | ❌ | ✅ | Display star count in UI/CLI |
| `checksum` | ❌ | ✅ | Verify integrity on install |
| `files` | ❌ | ✅ | Per-file checksums for verification |
| `author.url` | Required | Optional | Author URL may be missing |

## Validation Strategy

### At Build Time
1. GitHub Action validates `skillset.yaml` against JSON Schema
2. Generates `search-index.json` with `SearchIndexEntry` structure
3. TypeScript compiler checks all imports match `SearchIndex` type

### At Runtime
- No runtime validation (trust build-time validation)
- Type guards for status values (active/deprecated/archived)
- API endpoints validate request bodies (but not with these types directly)

## Future Considerations
- Could add Zod/Yup schemas for runtime validation
- Could generate TypeScript types from JSON Schema
- Could add discriminated unions for different skillset types
