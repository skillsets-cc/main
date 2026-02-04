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
  downloads?: number; // Populated from live stats
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
  entry_point: string;
  checksum: string;
  files: Record<string, string>; // file path -> SHA-256
}

export interface StatsResponse {
  stars: Record<string, number>;
  downloads: Record<string, number>;
}

export interface Skillset {
  schema_version: string;
  name: string;
  version: string;
  description: string;
  author: {
    handle: string;
    url: string;
  };
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
