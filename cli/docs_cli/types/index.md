# types/index.ts

## Overview
**Purpose**: TypeScript interfaces for search index and skillset manifest

## Dependencies
- External: None
- Internal: None

## Key Components

### Interfaces

#### SearchIndex
CDN index structure returned by `search-index.json`:
```typescript
interface SearchIndex {
  version: string;
  generated_at: string;
  skillsets: SearchIndexEntry[];
}
```

#### SearchIndexEntry
Individual skillset in search index:
```typescript
interface SearchIndexEntry {
  id: string;                    // @author/name
  name: string;
  description: string;
  tags: string[];
  author: { handle: string; url?: string };
  stars: number;
  downloads?: number;            // Populated from live stats
  version: string;
  status: 'active' | 'deprecated' | 'archived';
  verification: { production_links, production_proof?, audit_report };
  compatibility: { claude_code_version, languages };
  entry_point: string;
  checksum: string;
  files: Record<string, string>; // path -> sha256
  mcp_servers?: McpServer[];     // MCP server declarations
}
```

#### StatsResponse
Live stats from API:
```typescript
interface StatsResponse {
  stars: Record<string, number>;      // skillsetId -> count
  downloads: Record<string, number>;  // skillsetId -> count
}
```

#### Skillset
Local skillset.yaml manifest structure:
```typescript
interface Skillset {
  schema_version: string;
  name: string;
  version: string;
  description: string;
  author: { handle: string; url: string };
  verification: { production_links, production_proof?, audit_report };
  tags: string[];
  compatibility: { claude_code_version, languages };
  status: 'active' | 'deprecated' | 'archived';
  entry_point: string;
  mcp_servers?: McpServer[];
}
```

#### McpServer
MCP server declaration in manifest:
```typescript
interface McpServerInner {
  name: string;
  command: string;
  args?: string[];
  mcp_reputation: string;
  researched_at: string;
}

interface McpServer {
  name: string;
  type: 'stdio' | 'http' | 'docker';
  command?: string;     // stdio
  args?: string[];      // stdio
  url?: string;         // http
  image?: string;       // docker
  servers?: McpServerInner[]; // docker inner servers
  mcp_reputation: string;
  researched_at: string;
}
```

## Integration Points
- Used by: All modules for type safety

## Notes
- `SearchIndexEntry` vs `Skillset`: Index entry includes `id`, `stars`, `files` (computed at build time)
- Status values: `active` (default), `deprecated` (not recommended), `archived` (hidden)
