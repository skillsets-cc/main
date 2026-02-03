import type { SearchIndexEntry } from '@/types';

export const mockSkillsets: SearchIndexEntry[] = [
  {
    id: 'supercollectible/The_Skillset',
    name: 'The Skillset',
    description: 'Spec-driven SDLC with adversarial review and quality gates',
    tags: ['sdlc', 'planning', 'multi-agent'],
    author: { handle: '@supercollectible', url: 'https://github.com/supercollectible' },
    stars: 42,
    version: '1.0.0',
    status: 'active',
    verification: {
      production_links: [{ url: 'https://example.com', label: 'Demo' }],
      audit_report: './AUDIT_REPORT.md',
    },
    compatibility: {
      claude_code_version: '>=1.0.0',
      languages: ['any'],
    },
    entry_point: './content/CLAUDE.md',
    checksum: 'abc123',
    files: { 'CLAUDE.md': 'def456' },
  },
  {
    id: 'testuser/code-review',
    name: 'Code Review Assistant',
    description: 'Automated code review with best practices checking',
    tags: ['code-review', 'quality'],
    author: { handle: '@testuser' },
    stars: 15,
    version: '0.5.0',
    status: 'active',
    verification: {
      production_links: [{ url: 'https://test.com' }],
      audit_report: './AUDIT_REPORT.md',
    },
    compatibility: {
      claude_code_version: '>=1.0.0',
      languages: ['typescript', 'javascript'],
    },
    entry_point: './content/CLAUDE.md',
    checksum: 'xyz789',
    files: { 'CLAUDE.md': 'uvw123' },
  },
  {
    id: 'devuser/testing-framework',
    name: 'Testing Framework',
    description: 'Comprehensive testing utilities and patterns',
    tags: ['testing', 'quality'],
    author: { handle: '@devuser' },
    stars: 8,
    version: '2.0.0',
    status: 'deprecated',
    verification: {
      production_links: [{ url: 'https://dev.example.com' }],
      audit_report: './AUDIT_REPORT.md',
    },
    compatibility: {
      claude_code_version: '>=0.9.0',
      languages: ['python'],
    },
    entry_point: './content/CLAUDE.md',
    checksum: 'mno456',
    files: { 'CLAUDE.md': 'pqr789' },
  },
];
