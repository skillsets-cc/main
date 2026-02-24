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
    it('expands placeholders correctly', () => {
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

      // Check title
      expect(result).toContain('# Install Valence');

      // Check frontmatter description
      expect(result).toContain('description: "Install Valence — Built for agency."');

      // Check CLI command
      expect(result).toContain('npx skillsets@latest install @supercollectible/Valence');

      // Check activeForm
      expect(result).toContain('**activeForm**: Installing Valence');

      // Check task subject
      expect(result).toContain('**subject**: Install Valence from registry');

      // Verify markdown structure
      expect(result).toContain('## Phase Tracking');
      expect(result).toContain('## Command Reference');
      expect(result).toContain('## Error Handling');

      // Verify code fences are properly formatted (not escaped)
      expect(result).toMatch(/```\s*npx skillsets@latest install/);
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

      // Verify marketplace.json
      expect(existsSync(config.marketplaceFile)).toBe(true);

      const marketplace = JSON.parse(readFileSync(config.marketplaceFile, 'utf-8'));
      expect(marketplace.plugins).toHaveLength(2);
      expect(marketplace.plugins[0].name).toBe('contribute');
      expect(marketplace.plugins[1].name).toBe('Example');
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
