import type { SearchIndexEntry } from '@/types';

export const mockSkillsets: SearchIndexEntry[] = [
  {
    id: '@supercollectible/The_Skillset',
    name: 'The_Skillset',
    description: 'Spec-driven SDLC with adversarial review, quality gates, and multi-model validation.',
    tags: ['sdlc', 'planning', 'multi-agent', 'adversarial-review'],
    author: '@supercollectible',
    stars: 42,
    version: '1.0.0',
    checksum: 'abc123',
    files: {},
  },
  {
    id: '@example/FastAPI_Backend',
    name: 'FastAPI_Backend',
    description: 'Production-ready FastAPI backend with PostgreSQL, Redis, and JWT authentication.',
    tags: ['backend', 'python', 'fastapi', 'database'],
    author: '@example',
    stars: 28,
    version: '2.1.0',
    checksum: 'def456',
    files: {},
  },
  {
    id: '@example/React_Dashboard',
    name: 'React_Dashboard',
    description: 'Modern React dashboard with TypeScript, Tailwind, and Chart.js visualizations.',
    tags: ['frontend', 'react', 'typescript', 'dashboard'],
    author: '@example',
    stars: 35,
    version: '1.5.0',
    checksum: 'ghi789',
    files: {},
  },
];
