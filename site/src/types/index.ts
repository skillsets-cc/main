export interface SearchIndex {
  version: string;
  generated_at: string;
  skillsets: SearchIndexEntry[];
}

export interface SearchIndexEntry {
  id: string;
  name: string;
  description: string;
  tags: string[];
  author: {
    handle: string;
    url?: string;
  };
  stars: number;
  version: string;
  status: 'active' | 'deprecated' | 'archived';
  verification: {
    production_links: Array<{ url: string; label?: string }>;
    production_proof?: string;
    audit_report: string;
  };
  compatibility: {
    claude_code_version: string;
    languages: string[];
  };
  context_image_url?: string;
  entry_point: string;
  checksum: string;
  files: Record<string, string>;
  mcp_servers?: McpServer[];
}

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

/**
 * Represents a single ghost entry slot in the reservation system.
 */
export interface GhostSlot {
  slotId: string;
  status: 'available' | 'reserved';
  expiresAt?: number;
}

/**
 * Complete state of the reservation system, including all slots and user's reservation.
 */
export interface ReservationState {
  slots: Record<string, { status: 'available' | 'reserved'; expiresAt?: number }>;
  totalGhostSlots: number;
  userSlot: string | null;
}
