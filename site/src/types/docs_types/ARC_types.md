# Types Architecture

## Overview
TypeScript interface definitions for skillsets, search index, MCP servers, and ghost entry reservations. Provides type safety across the site module for skillset metadata, verification, search functionality, and reservation system.

## Directory Structure
```
types/
├── docs_types/
│   ├── ARC_types.md       # This file - architecture overview
│   └── index.md           # Per-file documentation for index.ts
├── __tests__/
│   └── reservation-types.test.ts
└── index.ts               # All type exports
```

## Components

| Component | Purpose | Key Exports |
|-----------|---------|-------------|
| `index.ts` | All type definitions | SearchIndex, SearchIndexEntry, McpServer, McpNestedServer, SlotStatus, GhostSlot, ReservationState |

## Data Flow

```
skillset.yaml (source)
  ↓
GitHub Action validates against JSON schema
  ↓
search-index.json generated with SearchIndexEntry[]
  ↓
Build-time import as SearchIndex type
  ↓
Type-safe access in pages/components/lib
  ↓
Runtime: KV stores reservation state as ReservationState
```

## Type Categories

### 1. Search Index Types
- **SearchIndex**: Root structure (version, generated_at, skillsets array)
- **SearchIndexEntry**: Full skillset metadata with checksums and verification

### 2. MCP Server Types
- **McpServer**: Top-level MCP server config (discriminated by type: stdio/http/docker)
- **McpNestedServer**: Nested server config for aggregator images (docker-compose)

### 3. Reservation System Types
- **SlotStatus**: Union type for slot states ('available' | 'reserved' | 'submitted')
- **GhostSlot**: Single reservation slot state with SlotStatus enum
- **ReservationState**: Complete system snapshot (all slots + user's current reservation)

## Integration Points

### Consumed By
- **lib/data.ts**: Imports SearchIndex for type-safe index access
- **pages/*.astro**: Component props (SearchIndexEntry)
- **components/*.tsx**: React props (SearchIndexEntry, GhostSlot, ReservationState)
- **pages/api/reservations*.ts**: Reservation API request/response types

### Type Flow

```
Types Module (site/src/types)
  ├── Used by lib/data.ts → getSearchIndex() returns SearchIndex
  ├── Used by pages/index.astro → props: { skillsets: SearchIndexEntry[] }
  ├── Used by pages/skillset/[namespace]/[name].astro → props: { skillset: SearchIndexEntry }
  ├── Used by components/SkillsetGrid.tsx → props: { skillsets: SearchIndexEntry[] }
  ├── Used by components/GhostCard.tsx → props: { slot: GhostSlot }
  └── Used by api/reservations.ts → returns ReservationState
```

## Design Patterns

### Strict Typing
- No `any` types allowed
- Optional fields explicitly marked with `?`
- Status as union type literals (`'active' | 'deprecated' | 'archived'`)
- Slot status as union type literals (`'available' | 'reserved' | 'submitted'`)

### Type Reuse
- Shared verification and compatibility structures
- DRY principle for nested objects (author, verification, compatibility)
- SlotStatus type reused in GhostSlot and ReservationState

### Discriminated Unions
- `McpServer.type` discriminates between stdio/http/docker configurations
- Each type has type-specific required fields (command/args vs url vs image)

### Build-Time Safety
- Types match JSON schema validation (validated by GitHub Actions)
- Compile-time checks prevent runtime errors
- IDE autocomplete and type hints for all skillset access

## Key Type Structures

### SearchIndexEntry Structure
Contains all skillset metadata for search, display, and installation:
- **Identity**: `id`, `name`, `version`, `description`, `status`
- **Discovery**: `tags[]`, `author` object
- **Verification**: `verification` object (production_links, audit_report)
- **Compatibility**: `compatibility` object (claude_code_version, languages)
- **Installation**: `entry_point`, `checksum`, `files` record
- **Metrics**: `stars` count (hydrated from KV at build time)
- **MCP**: Optional `mcp_servers[]` array
- **Ghost Entries**: Optional `batch_id` field (format: `{position}.{batchSize}.{cohort}`)
- **Context**: Optional `context_image_url` for visual context

### Verification Structure
```typescript
verification: {
  production_links: Array<{ url: string; label?: string }>;
  production_proof?: string;        // Optional path to PROOF.md
  audit_report: string;              // Required path to AUDIT_REPORT.md
}
```

### MCP Server Structure
```typescript
// stdio type
{ type: 'stdio', command: 'npx', args: ['-y', '@pkg'], ... }

// http type
{ type: 'http', url: 'https://...', ... }

// docker type (with optional nested servers)
{ type: 'docker', image: 'user/image', servers?: McpNestedServer[], ... }
```

### Reservation State Structure
```typescript
ReservationState: {
  slots: Record<string, {            // batchId → slot state
    status: 'available' | 'reserved' | 'submitted';
    expiresAt?: number;              // Timestamp (reserved only)
    skillsetId?: string;             // Present if submitted
  }>;
  totalGhostSlots: number;           // Config value
  cohort: number;                    // Current cohort number
  userSlot: string | null;           // User's current reservation (batchId or null)
}
```

## Validation Strategy

### At Build Time
1. GitHub Action validates `skillset.yaml` against `schema/skillset.schema.json`
2. Generates `search-index.json` with `SearchIndexEntry[]` structure
3. TypeScript compiler checks all imports match types defined here
4. Compile fails if any type mismatch detected

### At Runtime
- **No runtime validation of search index** (trust build-time validation)
- **Reservation API validates slot state transitions** (available → reserved → submitted)
- **KV stores validated reservation state** (ReservationState type)
- Type guards for enum values where needed (status, slot status)

## Ghost Entry System

Ghost entries reserve slots in the registry for verified contributors:
- Each ghost entry has a unique `batchId` (e.g., `1.100.001`)
- Slots tracked in KV with `ReservationState` structure
- Users reserve slots via `/api/reservations/reserve`
- Reserved slots have 24-hour TTL before expiring to `available`
- Submitted slots become permanent (skillset published)
- `batch_id` field format: `{position}.{batchSize}.{cohort}` (e.g., `1.100.1`)

## Future Considerations
- Could add Zod/Yup schemas for runtime validation
- Could generate TypeScript types from JSON Schema automatically
- Could add discriminated unions for different skillset categories
- Could add branded types for batchId/skillsetId (prevent string confusion)
