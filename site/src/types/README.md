# Types

## Purpose
TypeScript type definitions for skillsets, search index, MCP servers, and ghost entry reservations. Provides compile-time type safety across the entire site module.

## Architecture
```
types/
├── docs_types/
│   ├── ARC_types.md       # Architecture overview (data flow, patterns, integration)
│   └── index.md           # Per-file documentation (public API, key logic)
├── __tests__/
│   └── reservation-types.test.ts
├── index.ts               # All type exports
└── README.md              # This file
```

## Files
| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture overview | [ARC_types.md](./docs_types/ARC_types.md) |
| `index.ts` | All type definitions (SearchIndex, SearchIndexEntry, McpServer, McpServerInner, SlotStatus, GhostSlot, ReservationState) | [Docs](./docs_types/index.md) |
