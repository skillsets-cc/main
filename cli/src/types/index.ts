// Shared types used in both Skillset (manifest) and SearchIndexEntry (index)

export type SkillsetStatus = 'active' | 'deprecated' | 'archived';

export interface SkillsetVerification {
  production_links: Array<{ url: string; label?: string }>;
  production_proof?: string;
  audit_report: string;
}

export interface SkillsetCompatibility {
  claude_code_version: string;
  languages: string[];
  requirements?: string[];
}

// MCP server types

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

// Runtime dependency types

export interface RuntimeDependency {
  path: string;
  manager: string;
  packages: string[];
  has_install_scripts?: boolean;
  evaluation: string;
  researched_at: string;
}

// Search index types

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
  downloads?: number;
  version: string;
  status: SkillsetStatus;
  verification: SkillsetVerification;
  compatibility: SkillsetCompatibility;
  entry_point: string;
  checksum: string;
  files: Record<string, string>;
  mcp_servers?: McpServer[];
  runtime_dependencies?: RuntimeDependency[];
}

export interface StatsResponse {
  stars: Record<string, number>;
  downloads: Record<string, number>;
}

// Manifest type (parsed from skillset.yaml)

export interface Skillset {
  schema_version: string;
  name: string;
  version: string;
  description: string;
  author: {
    handle: string;
    url: string;
  };
  verification: SkillsetVerification;
  tags: string[];
  compatibility: SkillsetCompatibility;
  status: SkillsetStatus;
  entry_point: string;
  mcp_servers?: McpServer[];
  runtime_dependencies?: RuntimeDependency[];
}
