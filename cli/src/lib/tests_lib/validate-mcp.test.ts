import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateMcpServers } from '../validate-mcp.js';

describe('validateMcpServers', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'skillsets-mcp-test-'));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function writeMcpJson(servers: Record<string, unknown>) {
    writeFileSync(join(testDir, 'content', '.mcp.json'), JSON.stringify({ mcpServers: servers }));
  }

  describe('truth table', () => {
    it('passes when no MCP servers in content or manifest', () => {
      // Create skillset.yaml without mcp_servers
      writeFileSync(join(testDir, 'skillset.yaml'), 'schema_version: "1.0"\nname: test\n');
      mkdirSync(join(testDir, 'content'), { recursive: true });

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('passes when content and manifest match (stdio)', () => {
      // Create .mcp.json in content
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeMcpJson({
        context7: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@upstash/context7-mcp'],
        },
      });

      // Create matching skillset.yaml
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: context7
    type: stdio
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads"
    researched_at: "2026-02-04"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when content has MCP but manifest does not', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeMcpJson({
        context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
      });
      writeFileSync(join(testDir, 'skillset.yaml'), 'schema_version: "1.0"\nname: test\n');

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('context7');
      expect(result.errors[0]).toContain('not declared');
    });

    it('fails when manifest has MCP but content does not', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: context7
    type: stdio
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads"
    researched_at: "2026-02-04"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('context7');
      expect(result.errors[0]).toContain('not found in content');
    });
  });

  describe('native servers', () => {
    it('validates .claude/settings.json mcpServers', () => {
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(join(testDir, 'content', '.claude', 'settings.json'), JSON.stringify({
        mcpServers: {
          filesystem: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp']
          }
        }
      }));

      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: filesystem
    type: stdio
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    mcp_reputation: "npm: @modelcontextprotocol/server-filesystem, official Anthropic MCP server"
    researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('validates .claude/settings.local.json mcpServers', () => {
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(join(testDir, 'content', '.claude', 'settings.local.json'), JSON.stringify({
        mcpServers: {
          database: {
            type: 'stdio',
            command: 'node',
            args: ['server.js']
          }
        }
      }));

      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: database
    type: stdio
    command: node
    args: ["server.js"]
    mcp_reputation: "Custom database MCP server"
    researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('fails on command mismatch', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeMcpJson({
        context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
      });

      // Manifest has different command
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: context7
    type: stdio
    command: node
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp"
    researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('context7');
      expect(result.errors[0]).toContain('not declared');
    });

    it('fails on args mismatch', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeMcpJson({
        context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
      });

      // Manifest has different args
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: context7
    type: stdio
    command: npx
    args: ["-y", "@upstash/context7-mcp", "--verbose"]
    mcp_reputation: "npm: @upstash/context7-mcp"
    researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('context7');
    });

    it('validates http type with URL matching', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeMcpJson({
        'remote-api': { type: 'http', url: 'https://api.example.com/mcp' },
      });

      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: remote-api
    type: http
    url: "https://api.example.com/mcp"
    mcp_reputation: "Remote MCP API endpoint"
    researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('fails on http URL mismatch', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeMcpJson({
        'remote-api': { type: 'http', url: 'https://api.example.com/mcp' },
      });

      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: remote-api
    type: http
    url: "https://api.different.com/mcp"
    mcp_reputation: "Remote MCP API endpoint"
    researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('remote-api');
    });

    it('collects from multiple content sources simultaneously', () => {
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });

      // Server in .mcp.json
      writeMcpJson({
        context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
      });

      // Different server in .claude/settings.json
      writeFileSync(join(testDir, 'content', '.claude', 'settings.json'), JSON.stringify({
        mcpServers: {
          filesystem: { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'] }
        }
      }));

      // Manifest must declare both
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: context7
    type: stdio
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads"
    researched_at: "2026-02-05"
  - name: filesystem
    type: stdio
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    mcp_reputation: "npm: @modelcontextprotocol/server-filesystem, official"
    researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('deduplicates servers present in both .mcp.json and settings.json', () => {
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });

      // Same server in both files
      const serverConfig = { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] };
      writeMcpJson({ context7: serverConfig });
      writeFileSync(join(testDir, 'content', '.claude', 'settings.json'), JSON.stringify({
        mcpServers: { context7: serverConfig }
      }));

      // Only one manifest entry needed
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: context7
    type: stdio
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads"
    researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('docker servers', () => {
    it('validates Docker config with inner servers', () => {
      mkdirSync(join(testDir, 'content', 'docker'), { recursive: true });

      // Create docker-compose.yaml
      writeFileSync(join(testDir, 'content', 'docker', 'docker-compose.yaml'), `
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "4000:4000"
`);

      // Create config.yaml with mcp_servers
      writeFileSync(join(testDir, 'content', 'docker', 'config.yaml'), `
model_list:
  - model_name: claude-3-5-sonnet-20241022
mcp_servers:
  context7:
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/project:ro"]
`);

      // Create matching skillset.yaml
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: litellm-proxy
    type: docker
    image: "ghcr.io/berriai/litellm:main-latest"
    mcp_reputation: "ghcr: berriai/litellm, widely used LLM proxy"
    researched_at: "2026-02-05"
    servers:
      - name: context7
        command: npx
        args: ["-y", "@upstash/context7-mcp"]
        mcp_reputation: "npm: @upstash/context7-mcp"
        researched_at: "2026-02-05"
      - name: filesystem
        command: npx
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/project:ro"]
        mcp_reputation: "npm: @modelcontextprotocol/server-filesystem"
        researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('fails when Docker image not in docker-compose.yaml', () => {
      mkdirSync(join(testDir, 'content', 'docker'), { recursive: true });

      // Create docker-compose.yaml with different image
      writeFileSync(join(testDir, 'content', 'docker', 'docker-compose.yaml'), `
services:
  litellm:
    image: ghcr.io/berriai/litellm:stable
`);

      writeFileSync(join(testDir, 'content', 'docker', 'config.yaml'), `
mcp_servers:
  context7:
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
`);

      // Manifest declares wrong image
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: litellm-proxy
    type: docker
    image: "ghcr.io/berriai/litellm:main-latest"
    mcp_reputation: "ghcr: berriai/litellm"
    researched_at: "2026-02-05"
    servers:
      - name: context7
        command: npx
        args: ["-y", "@upstash/context7-mcp"]
        mcp_reputation: "npm: @upstash/context7-mcp"
        researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not found in any YAML file under docker/'))).toBe(true);
    });

    it('fails when Docker inner server not in config', () => {
      mkdirSync(join(testDir, 'content', 'docker'), { recursive: true });

      writeFileSync(join(testDir, 'content', 'docker', 'docker-compose.yaml'), `
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
`);

      // Config only has context7
      writeFileSync(join(testDir, 'content', 'docker', 'config.yaml'), `
mcp_servers:
  context7:
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
`);

      // Manifest declares filesystem which doesn't exist
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: litellm-proxy
    type: docker
    image: "ghcr.io/berriai/litellm:main-latest"
    mcp_reputation: "ghcr: berriai/litellm"
    researched_at: "2026-02-05"
    servers:
      - name: filesystem
        command: npx
        args: ["-y", "@modelcontextprotocol/server-filesystem"]
        mcp_reputation: "npm: @modelcontextprotocol/server-filesystem"
        researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('filesystem') && e.includes('not found in content'))).toBe(true);
    });
  });

  describe('mixed native + docker', () => {
    it('validates skillset with both native and docker servers', () => {
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      mkdirSync(join(testDir, 'content', 'docker'), { recursive: true });

      // Native server in .mcp.json
      writeMcpJson({
        context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
      });

      // Docker servers in config.yaml
      writeFileSync(join(testDir, 'content', 'docker', 'docker-compose.yaml'), `
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
`);
      writeFileSync(join(testDir, 'content', 'docker', 'config.yaml'), `
mcp_servers:
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/project:ro"]
`);

      // Manifest declares both native and docker
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: context7
    type: stdio
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads"
    researched_at: "2026-02-05"
  - name: litellm-proxy
    type: docker
    image: "ghcr.io/berriai/litellm:main-latest"
    mcp_reputation: "ghcr: berriai/litellm, widely used LLM proxy"
    researched_at: "2026-02-05"
    servers:
      - name: filesystem
        command: npx
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/project:ro"]
        mcp_reputation: "npm: @modelcontextprotocol/server-filesystem"
        researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('fails when native matches but docker inner server mismatches', () => {
      mkdirSync(join(testDir, 'content', 'docker'), { recursive: true });

      writeMcpJson({
        context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
      });

      writeFileSync(join(testDir, 'content', 'docker', 'docker-compose.yaml'), `
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
`);
      writeFileSync(join(testDir, 'content', 'docker', 'config.yaml'), `
mcp_servers:
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/project:ro"]
`);

      // Manifest declares a docker inner server that doesn't exist in config
      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: context7
    type: stdio
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads"
    researched_at: "2026-02-05"
  - name: litellm-proxy
    type: docker
    image: "ghcr.io/berriai/litellm:main-latest"
    mcp_reputation: "ghcr: berriai/litellm"
    researched_at: "2026-02-05"
    servers:
      - name: nonexistent
        command: npx
        args: ["-y", "some-package"]
        mcp_reputation: "test"
        researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('nonexistent'))).toBe(true);
    });
  });

  describe('docker edge cases', () => {
    it('finds docker-compose.yml (alternative extension)', () => {
      mkdirSync(join(testDir, 'content', 'docker'), { recursive: true });

      writeFileSync(join(testDir, 'content', 'docker', 'docker-compose.yml'), `
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
`);
      writeFileSync(join(testDir, 'content', 'docker', 'config.yaml'), `
mcp_servers:
  context7:
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
`);

      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: litellm-proxy
    type: docker
    image: "ghcr.io/berriai/litellm:main-latest"
    mcp_reputation: "ghcr: berriai/litellm"
    researched_at: "2026-02-05"
    servers:
      - name: context7
        command: npx
        args: ["-y", "@upstash/context7-mcp"]
        mcp_reputation: "npm: @upstash/context7-mcp"
        researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('scans non-standard YAML filenames in docker/', () => {
      mkdirSync(join(testDir, 'content', 'docker', 'litellm'), { recursive: true });

      writeFileSync(join(testDir, 'content', 'docker', 'litellm', 'litellm_config.yml'), `
mcp_servers:
  context7:
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
`);
      writeFileSync(join(testDir, 'content', 'docker', 'compose.yml'), `
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
`);

      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: litellm-proxy
    type: docker
    image: "ghcr.io/berriai/litellm:main-latest"
    mcp_reputation: "ghcr: berriai/litellm, widely used"
    researched_at: "2026-02-05"
    servers:
      - name: context7
        command: npx
        args: ["-y", "@upstash/context7-mcp"]
        mcp_reputation: "npm: @upstash/context7-mcp"
        researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('fails when docker directory does not exist', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });

      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: litellm-proxy
    type: docker
    image: "ghcr.io/berriai/litellm:main-latest"
    mcp_reputation: "ghcr: berriai/litellm"
    researched_at: "2026-02-05"
    servers:
      - name: context7
        command: npx
        args: ["-y", "@upstash/context7-mcp"]
        mcp_reputation: "npm: @upstash/context7-mcp"
        researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('no docker directory'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('returns error for malformed .mcp.json', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeFileSync(join(testDir, 'content', '.mcp.json'), 'not json{{{');
      writeFileSync(join(testDir, 'skillset.yaml'), 'schema_version: "1.0"\nname: test\n');

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('.mcp.json');
    });

    it('returns error for malformed config.yaml', () => {
      mkdirSync(join(testDir, 'content', 'docker'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'docker', 'config.yaml'), 'invalid: yaml: [[[');
      writeFileSync(join(testDir, 'skillset.yaml'), 'schema_version: "1.0"\nname: test\n');

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('config.yaml');
    });

    it('returns error for malformed skillset.yaml', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeMcpJson({
        context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
      });
      writeFileSync(join(testDir, 'skillset.yaml'), 'invalid: : yaml: [[[');

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('skillset.yaml');
    });
  });

  describe('generic scanning', () => {
    it('finds mcpServers in non-standard JSON paths', () => {
      mkdirSync(join(testDir, 'content', 'config'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'config', 'external-agents.json'), JSON.stringify({
        mcpServers: {
          context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] }
        }
      }));

      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: context7
    type: stdio
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp"
    researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('finds mcp_servers in YAML files outside docker/', () => {
      mkdirSync(join(testDir, 'content', 'infra'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'infra', 'mcp-config.yaml'), `
mcp_servers:
  context7:
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
`);

      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: litellm-proxy
    type: docker
    image: "ghcr.io/berriai/litellm:main-latest"
    mcp_reputation: "ghcr: berriai/litellm"
    researched_at: "2026-02-05"
    servers:
      - name: context7
        command: npx
        args: ["-y", "@upstash/context7-mcp"]
        mcp_reputation: "npm: @upstash/context7-mcp"
        researched_at: "2026-02-05"
`);

      // Even without docker/ the YAML scanner should find mcp_servers in content/infra/
      const result = validateMcpServers(testDir);
      // The content server is found as 'docker' source but manifest declares docker inner server
      expect(result.errors.every(e => !e.includes('context7'))).toBe(true);
    });

    it('skips node_modules when scanning JSON', () => {
      mkdirSync(join(testDir, 'content', 'node_modules', 'some-pkg'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'node_modules', 'some-pkg', 'mcp.json'), JSON.stringify({
        mcpServers: {
          internal: { type: 'stdio', command: 'node', args: ['server.js'] }
        }
      }));
      writeFileSync(join(testDir, 'skillset.yaml'), 'schema_version: "1.0"\nname: test\n');
      mkdirSync(join(testDir, 'content'), { recursive: true });

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles missing content directory', () => {
      writeFileSync(join(testDir, 'skillset.yaml'), 'schema_version: "1.0"\nname: test\n');

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('handles missing skillset.yaml', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('handles empty mcpServers object', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeMcpJson({});
      writeFileSync(join(testDir, 'skillset.yaml'), 'schema_version: "1.0"\nname: test\n');

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });

    it('handles servers with no args', () => {
      mkdirSync(join(testDir, 'content'), { recursive: true });
      writeMcpJson({
        simple: { type: 'stdio', command: 'node' },
      });

      writeFileSync(join(testDir, 'skillset.yaml'), `
schema_version: "1.0"
name: test
mcp_servers:
  - name: simple
    type: stdio
    command: node
    mcp_reputation: "Simple node-based MCP server"
    researched_at: "2026-02-05"
`);

      const result = validateMcpServers(testDir);
      expect(result.valid).toBe(true);
    });
  });
});
