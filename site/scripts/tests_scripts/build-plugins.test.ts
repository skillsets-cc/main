import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { BuildConfig } from '../build-plugins';
import {
  generatePluginJson,
  generateInstallSkillMd,
  discoverSkillsets,
  cleanGeneratedPlugins,
  generateMarketplace,
  buildPlugins,
  getDefaultConfig,
} from '../build-plugins';

describe('build-plugins', () => {
  let tempDir: string;
  let config: BuildConfig;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = mkdtempSync(join(tmpdir(), 'build-plugins-test-'));
    config = {
      rootDir: tempDir,
      skillsetsDir: join(tempDir, 'skillsets'),
      pluginsDir: join(tempDir, 'plugins'),
      marketplaceFile: join(tempDir, '.claude-plugin', 'marketplace.json'),
    };
  });

  afterEach(() => {
    // Clean up temp directory after each test
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('generatePluginJson', () => {
    it('maps fields correctly with full manifest', () => {
      const manifest = {
        name: 'Valence',
        version: '3.0.0',
        description: 'Built for agency.',
        author: {
          handle: '@supercollectible',
          url: 'https://supercollectible.dev',
        },
        tags: ['sdlc', 'multi-agent'],
      };

      const result = generatePluginJson(manifest, '@supercollectible/Valence');

      expect(result.name).toBe('Valence');
      expect(result.version).toBe('3.0.0');
      expect(result.description).toBe('Built for agency.');
      expect(result.author.name).toBe('supercollectible'); // @ stripped
      expect(result.author.url).toBe('https://supercollectible.dev');
      expect(result.keywords).toEqual(['sdlc', 'multi-agent']);
      expect(result.license).toBe('MIT');
    });

    it('omits url when author.url is absent', () => {
      const manifest = {
        name: 'TestSkillset',
        version: '1.0.0',
        description: 'Test description',
        author: {
          handle: '@testuser',
        },
        tags: ['test'],
      };

      const result = generatePluginJson(manifest, '@testuser/TestSkillset');

      expect(result.author).toEqual({ name: 'testuser' });
      expect(result.author.url).toBeUndefined();
    });
  });

  describe('generateInstallSkillMd', () => {
    it('generates 3-task template with install notes reference', () => {
      const manifest = {
        name: 'Valence',
        version: '3.0.0',
        description: 'Built for agency.',
        author: {
          handle: '@supercollectible',
          url: 'https://supercollectible.dev',
        },
        tags: ['sdlc'],
      };

      const result = generateInstallSkillMd(manifest, '@supercollectible/Valence');

      // Check 3-task structure
      expect(result).toContain('### Task 1: Review install notes and install');
      expect(result).toContain('### Task 2: Read QUICKSTART.md');
      expect(result).toContain('### Task 3: Walk through customization');
      expect(result).not.toContain('### Task 4:');

      // Check references
      expect(result).toContain('references/INSTALL_NOTES.md');

      // Check title
      expect(result).toContain('# Install Valence');

      // Check frontmatter description
      expect(result).toContain('description: "Install Valence — Built for agency."');

      // Check CLI command
      expect(result).toContain('npx skillsets@latest install @supercollectible/Valence');

      // Verify markdown structure
      expect(result).toContain('## Phase Tracking');
      expect(result).toContain('## Command Reference');
      expect(result).toContain('## Error Handling');

      // Verify code fences are properly formatted (not escaped)
      expect(result).toMatch(/```\s*npx skillsets@latest install/);

      // No accept flags in install command (flags table in Command Reference always lists them)
      expect(result).not.toContain('@supercollectible/Valence --accept-mcp');
      expect(result).not.toContain('@supercollectible/Valence --accept-deps');
    });

    it('adds accept flags when manifest has MCP servers', () => {
      const manifest = {
        name: 'TestSkillset',
        version: '1.0.0',
        description: 'Test description.',
        author: { handle: '@test' },
        tags: ['test'],
        mcp_servers: [{
          name: 'context7',
          type: 'stdio' as const,
          command: 'npx',
          args: ['-y', '@upstash/context7-mcp'],
          mcp_reputation: 'npm: @upstash/context7-mcp, 50k weekly downloads',
          researched_at: '2026-02-04',
        }],
      };

      const result = generateInstallSkillMd(manifest, '@test/TestSkillset');

      expect(result).toContain('--accept-mcp --accept-deps');
      expect(result).toContain('declares external dependencies');
    });

    it('adds accept flags when manifest has runtime dependencies', () => {
      const manifest = {
        name: 'TestSkillset',
        version: '1.0.0',
        description: 'Test description.',
        author: { handle: '@test' },
        tags: ['test'],
        runtime_dependencies: [{
          path: 'package.json',
          manager: 'npm',
          packages: ['lodash'],
          evaluation: 'Well-known utility library with millions of downloads',
          researched_at: '2026-02-04',
        }],
      };

      const result = generateInstallSkillMd(manifest, '@test/TestSkillset');

      expect(result).toContain('--accept-mcp --accept-deps');
    });

    it('includes plugin note when cc_extensions has plugin type', () => {
      const manifest = {
        name: 'TestSkillset',
        version: '1.0.0',
        description: 'Test description.',
        author: { handle: '@test' },
        tags: ['test'],
        cc_extensions: [{
          name: 'code-simplifier',
          type: 'plugin' as const,
          source: 'registry:code-simplifier',
          cc_reputation: 'Skillsets.cc registry plugin for cleanup',
          researched_at: '2026-02-20',
        }],
      };

      const result = generateInstallSkillMd(manifest, '@test/TestSkillset');

      expect(result).toContain('code-simplifier');
      expect(result).toContain('registry:code-simplifier');
      expect(result).toContain('external Claude Code plugins');
    });

    it('does not include plugin note when cc_extensions are all native', () => {
      const manifest = {
        name: 'TestSkillset',
        version: '1.0.0',
        description: 'Test description.',
        author: { handle: '@test' },
        tags: ['test'],
        cc_extensions: [{
          name: 'security-review',
          type: 'native' as const,
          cc_reputation: 'Claude Code built-in skill, available by default',
          researched_at: '2026-02-20',
        }],
      };

      const result = generateInstallSkillMd(manifest, '@test/TestSkillset');

      expect(result).not.toContain('external Claude Code plugins');
      expect(result).not.toContain('Install them separately');
    });

    it('produces both accept flags and plugin note when combined', () => {
      const manifest = {
        name: 'TestSkillset',
        version: '1.0.0',
        description: 'Test description.',
        author: { handle: '@test' },
        tags: ['test'],
        mcp_servers: [{
          name: 'context7',
          type: 'stdio' as const,
          command: 'npx',
          args: ['-y', '@upstash/context7-mcp'],
          mcp_reputation: 'npm: @upstash/context7-mcp, 50k weekly downloads',
          researched_at: '2026-02-04',
        }],
        cc_extensions: [{
          name: 'code-simplifier',
          type: 'plugin' as const,
          source: 'registry:code-simplifier',
          cc_reputation: 'Skillsets.cc registry plugin for cleanup',
          researched_at: '2026-02-20',
        }],
      };

      const result = generateInstallSkillMd(manifest, '@test/TestSkillset');

      expect(result).toContain('--accept-mcp --accept-deps');
      expect(result).toContain('declares external dependencies');
      expect(result).toContain('external Claude Code plugins');
      expect(result).toContain('code-simplifier');
    });

    it('lists all plugin deps when multiple cc_extensions are plugins', () => {
      const manifest = {
        name: 'TestSkillset',
        version: '1.0.0',
        description: 'Test description.',
        author: { handle: '@test' },
        tags: ['test'],
        cc_extensions: [
          {
            name: 'security-review',
            type: 'native' as const,
            cc_reputation: 'Claude Code built-in skill',
            researched_at: '2026-02-20',
          },
          {
            name: 'code-simplifier',
            type: 'plugin' as const,
            source: 'registry:code-simplifier',
            cc_reputation: 'Skillsets.cc registry plugin for cleanup',
            researched_at: '2026-02-20',
          },
          {
            name: 'doc-gen',
            type: 'plugin' as const,
            source: 'npm:@example/doc-gen',
            cc_reputation: 'npm package with 10k weekly downloads',
            researched_at: '2026-02-20',
          },
        ],
      };

      const result = generateInstallSkillMd(manifest, '@test/TestSkillset');

      // Both plugins listed
      expect(result).toContain('**code-simplifier** (registry:code-simplifier)');
      expect(result).toContain('**doc-gen** (npm:@example/doc-gen)');

      // Native extension not listed as plugin dep
      expect(result).not.toContain('**security-review**');
    });
  });

  describe('discoverSkillsets', () => {
    it('finds all skillsets with valid YAML', () => {
      // Create test skillsets
      mkdirSync(join(config.skillsetsDir, '@ns1', 'Foo'), { recursive: true });
      mkdirSync(join(config.skillsetsDir, '@ns2', 'Bar'), { recursive: true });

      writeFileSync(
        join(config.skillsetsDir, '@ns1', 'Foo', 'skillset.yaml'),
        'name: Foo\nversion: 1.0.0\n'
      );
      writeFileSync(
        join(config.skillsetsDir, '@ns2', 'Bar', 'skillset.yaml'),
        'name: Bar\nversion: 1.0.0\n'
      );

      const result = discoverSkillsets(config);

      expect(result).toEqual(['@ns1/Foo', '@ns2/Bar']);
    });

    it('ignores directories without skillset.yaml', () => {
      // Create dir without YAML
      mkdirSync(join(config.skillsetsDir, '@ns', 'NoYaml'), { recursive: true });

      const result = discoverSkillsets(config);

      expect(result).toEqual([]);
    });

    it('returns empty array when skillsets directory does not exist', () => {
      const result = discoverSkillsets(config);

      expect(result).toEqual([]);
    });
  });

  describe('cleanGeneratedPlugins', () => {
    it('removes stale plugins', () => {
      // Create old and active plugins
      const oldPluginDir = join(config.pluginsDir, '@ns', 'old-plugin', '.claude-plugin');
      const activePluginDir = join(config.pluginsDir, '@ns', 'active', '.claude-plugin');

      mkdirSync(oldPluginDir, { recursive: true });
      mkdirSync(activePluginDir, { recursive: true });

      writeFileSync(join(oldPluginDir, 'plugin.json'), '{}');
      writeFileSync(join(activePluginDir, 'plugin.json'), '{}');

      cleanGeneratedPlugins(config, new Set(['@ns/active']));

      // Old plugin should be deleted
      expect(existsSync(join(config.pluginsDir, '@ns', 'old-plugin'))).toBe(false);

      // Active plugin should still exist
      expect(existsSync(join(config.pluginsDir, '@ns', 'active'))).toBe(true);
    });

    it('preserves static plugins', () => {
      // Create static contribute plugin
      const contributeDir = join(config.pluginsDir, 'contribute', '.claude-plugin');
      mkdirSync(contributeDir, { recursive: true });
      writeFileSync(join(contributeDir, 'plugin.json'), '{}');

      cleanGeneratedPlugins(config, new Set());

      // Static plugin should still exist
      expect(existsSync(join(config.pluginsDir, 'contribute'))).toBe(true);
    });

    it('removes empty namespace directories', () => {
      // Create namespace with only stale plugins
      const stalePluginDir = join(config.pluginsDir, '@stale', 'old', '.claude-plugin');
      mkdirSync(stalePluginDir, { recursive: true });
      writeFileSync(join(stalePluginDir, 'plugin.json'), '{}');

      cleanGeneratedPlugins(config, new Set());

      // Entire namespace should be removed
      expect(existsSync(join(config.pluginsDir, '@stale'))).toBe(false);
    });

    it('handles missing plugins directory gracefully', () => {
      // Should not throw when plugins dir doesn't exist
      expect(() => {
        cleanGeneratedPlugins(config, new Set());
      }).not.toThrow();
    });
  });

  describe('generateMarketplace', () => {
    it('generates correct marketplace structure', () => {
      const plugins = [
        {
          name: 'contribute',
          source: './plugins/contribute',
          description: 'Contribute plugin',
          version: '1.0.0',
          author: { name: 'supercollectible' },
          license: 'MIT',
          keywords: ['contribute'],
          category: 'development',
        },
        {
          name: 'Valence',
          source: './plugins/@supercollectible/Valence',
          description: 'Built for agency.',
          version: '3.0.0',
          author: { name: 'supercollectible' },
          license: 'MIT',
          keywords: ['sdlc'],
          category: 'development',
        },
      ];

      generateMarketplace(config, plugins);

      const marketplaceContent = readFileSync(config.marketplaceFile, 'utf-8');
      const marketplace = JSON.parse(marketplaceContent);

      expect(marketplace.name).toBe('skillsets-cc');
      expect(marketplace.metadata.version).toBe('2.0.0');
      expect(marketplace.metadata.description).toContain('Curated registry');
      expect(marketplace.owner.name).toBe('supercollectible');
      expect(marketplace.owner.email).toBe('hello@supercollectible.dev');
      expect(marketplace.plugins).toHaveLength(2);
      expect(marketplace.plugins[0].name).toBe('contribute');
      expect(marketplace.plugins[1].source).toBe('./plugins/@supercollectible/Valence');

      // Verify trailing newline
      expect(marketplaceContent.endsWith('\n')).toBe(true);
    });
  });

  describe('full integration', () => {
    it('builds complete plugin structure from skillsets', () => {
      // Set up test skillset
      const skillsetDir = join(config.skillsetsDir, '@test', 'Example');
      mkdirSync(skillsetDir, { recursive: true });

      const manifest = `schema_version: "1.0"
name: Example
version: 1.0.0
description: Example skillset for testing
author:
  handle: "@testuser"
  url: "https://example.com"
tags:
  - test
  - example
verification:
  production_links:
    - url: "https://example.com/product"
  audit_report: "./AUDIT_REPORT.md"
status: active
entry_point: "./content/CLAUDE.md"
`;

      writeFileSync(join(skillsetDir, 'skillset.yaml'), manifest);

      // Set up static contribute plugin
      const contributePluginDir = join(config.pluginsDir, 'contribute', '.claude-plugin');
      mkdirSync(contributePluginDir, { recursive: true });
      writeFileSync(
        join(contributePluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'contribute',
          description: 'Contribute plugin',
          version: '1.0.0',
          author: { name: 'supercollectible' },
          license: 'MIT',
          keywords: ['contribute'],
        })
      );

      // Run build
      buildPlugins(config);

      // Verify generated plugin.json
      const generatedPluginPath = join(
        config.pluginsDir,
        '@test',
        'Example',
        '.claude-plugin',
        'plugin.json'
      );
      expect(existsSync(generatedPluginPath)).toBe(true);

      const pluginJson = JSON.parse(readFileSync(generatedPluginPath, 'utf-8'));
      expect(pluginJson.name).toBe('Example');
      expect(pluginJson.version).toBe('1.0.0');
      expect(pluginJson.keywords).toEqual(['test', 'example']);

      // Verify generated SKILL.md
      const skillPath = join(config.pluginsDir, '@test', 'Example', 'skills', 'install', 'SKILL.md');
      expect(existsSync(skillPath)).toBe(true);

      const skillContent = readFileSync(skillPath, 'utf-8');
      expect(skillContent).toContain('# Install Example');
      expect(skillContent).toContain('npx skillsets@latest install @test/Example');
      expect(skillContent).toContain('### Task 1: Review install notes and install');
      expect(skillContent).toContain('references/INSTALL_NOTES.md');

      // Verify marketplace.json
      expect(existsSync(config.marketplaceFile)).toBe(true);

      const marketplace = JSON.parse(readFileSync(config.marketplaceFile, 'utf-8'));
      expect(marketplace.plugins).toHaveLength(2);
      expect(marketplace.plugins[0].name).toBe('contribute');
      expect(marketplace.plugins[1].name).toBe('Example');
    });

    it('copies INSTALL_NOTES.md to skill references', () => {
      // Set up test skillset with content/INSTALL_NOTES.md
      const skillsetDir = join(config.skillsetsDir, '@test', 'Example');
      mkdirSync(join(skillsetDir, 'content'), { recursive: true });

      const manifest = `schema_version: "1.0"
name: Example
version: 1.0.0
description: Example skillset for testing
author:
  handle: "@testuser"
  url: "https://example.com"
tags:
  - test
verification:
  production_links:
    - url: "https://example.com/product"
  audit_report: "./AUDIT_REPORT.md"
status: active
entry_point: "./content/CLAUDE.md"
`;

      writeFileSync(join(skillsetDir, 'skillset.yaml'), manifest);
      writeFileSync(join(skillsetDir, 'content', 'INSTALL_NOTES.md'), '# Example\n\nInstall notes here.');

      // Set up static contribute plugin
      const contributePluginDir = join(config.pluginsDir, 'contribute', '.claude-plugin');
      mkdirSync(contributePluginDir, { recursive: true });
      writeFileSync(
        join(contributePluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'contribute', description: 'Contribute', version: '1.0.0',
          author: { name: 'test' }, license: 'MIT', keywords: ['contribute'],
        })
      );

      buildPlugins(config);

      // Verify INSTALL_NOTES.md was copied
      const referencesPath = join(
        config.pluginsDir, '@test', 'Example', 'skills', 'install', 'references', 'INSTALL_NOTES.md'
      );
      expect(existsSync(referencesPath)).toBe(true);
      const content = readFileSync(referencesPath, 'utf-8');
      expect(content).toContain('# Example');
      expect(content).toContain('Install notes here.');
    });

    it('skips references directory when INSTALL_NOTES.md is missing', () => {
      // Set up test skillset WITHOUT content/INSTALL_NOTES.md
      const skillsetDir = join(config.skillsetsDir, '@test', 'Example');
      mkdirSync(skillsetDir, { recursive: true });

      const manifest = `schema_version: "1.0"
name: Example
version: 1.0.0
description: Example skillset for testing
author:
  handle: "@testuser"
tags:
  - test
verification:
  production_links:
    - url: "https://example.com/product"
  audit_report: "./AUDIT_REPORT.md"
status: active
entry_point: "./content/CLAUDE.md"
`;

      writeFileSync(join(skillsetDir, 'skillset.yaml'), manifest);

      // Set up static contribute plugin
      const contributePluginDir = join(config.pluginsDir, 'contribute', '.claude-plugin');
      mkdirSync(contributePluginDir, { recursive: true });
      writeFileSync(
        join(contributePluginDir, 'plugin.json'),
        JSON.stringify({
          name: 'contribute', description: 'Contribute', version: '1.0.0',
          author: { name: 'test' }, license: 'MIT', keywords: ['contribute'],
        })
      );

      buildPlugins(config);

      // Verify references directory was NOT created
      const referencesPath = join(
        config.pluginsDir, '@test', 'Example', 'skills', 'install', 'references'
      );
      expect(existsSync(referencesPath)).toBe(false);
    });

    it('handles errors gracefully and continues processing other skillsets', () => {
      // Set up one valid and one invalid skillset
      mkdirSync(join(config.skillsetsDir, '@test', 'Valid'), { recursive: true });
      mkdirSync(join(config.skillsetsDir, '@test', 'Invalid'), { recursive: true });

      writeFileSync(
        join(config.skillsetsDir, '@test', 'Valid', 'skillset.yaml'),
        'name: Valid\nversion: 1.0.0\ndescription: Valid\nauthor:\n  handle: "@test"\ntags: []\n'
      );

      // Invalid YAML
      writeFileSync(
        join(config.skillsetsDir, '@test', 'Invalid', 'skillset.yaml'),
        '{ invalid yaml syntax: [[[['
      );

      // Set up contribute plugin
      const contributePluginDir = join(config.pluginsDir, 'contribute', '.claude-plugin');
      mkdirSync(contributePluginDir, { recursive: true });
      writeFileSync(
        join(contributePluginDir, 'plugin.json'),
        JSON.stringify({ name: 'contribute', description: '', version: '1.0.0', author: { name: 'test' } })
      );

      // Should not throw despite invalid YAML
      buildPlugins(config);

      // Valid skillset should still be processed
      expect(
        existsSync(join(config.pluginsDir, '@test', 'Valid', '.claude-plugin', 'plugin.json'))
      ).toBe(true);

      // Invalid skillset should be skipped
      expect(
        existsSync(join(config.pluginsDir, '@test', 'Invalid', '.claude-plugin', 'plugin.json'))
      ).toBe(false);

      // Marketplace should still be generated with valid entries
      const marketplace = JSON.parse(readFileSync(config.marketplaceFile, 'utf-8'));
      expect(marketplace.plugins).toHaveLength(2); // contribute + valid
    });
  });

  describe('getDefaultConfig', () => {
    it('returns config with correct default paths', () => {
      const config = getDefaultConfig();

      expect(config.rootDir).toBeDefined();
      expect(config.skillsetsDir).toContain('skillsets');
      expect(config.pluginsDir).toContain('plugins');
      expect(config.marketplaceFile).toContain('marketplace.json');
    });
  });
});
