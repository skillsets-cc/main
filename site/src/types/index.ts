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
    audit_report: string;
  };
  compatibility: {
    claude_code_version: string;
    languages: string[];
    requirements?: string[];
  };
  context_image_url?: string;
  entry_point: string;
  checksum: string;
  files: Record<string, string>;
  mcp_servers?: McpServer[];
  cc_extensions?: CcExtension[];
  runtime_dependencies?: RuntimeDependency[];
  batch_id?: string;
}

export interface CcExtension {
  name: string;
  type: 'native' | 'plugin';
  source?: string;
  cc_reputation: string;
  researched_at: string;
}

export interface RuntimeDependency {
  path: string;
  manager: string;
  packages: string[];
  has_install_scripts?: boolean;
  evaluation: string;
  researched_at: string;
}

export interface McpNestedServer {
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
  servers?: McpNestedServer[];
  mcp_reputation: string;
  researched_at: string;
}

export type SlotStatus = 'available' | 'reserved' | 'submitted';

/**
 * Represents a single ghost entry slot in the reservation system.
 */
export interface GhostSlot {
  batchId: string;
  status: SlotStatus;
  expiresAt?: number;
  skillsetId?: string;
}

/**
 * Complete state of the reservation system, including all slots and user's reservation.
 */
export interface ReservationState {
  slots: Record<string, {
    status: SlotStatus;
    expiresAt?: number;
    skillsetId?: string;
  }>;
  totalGhostSlots: number;
  cohort: number;
  userSlot: string | null;
}
