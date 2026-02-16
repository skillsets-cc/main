import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { getErrorMessage } from './errors.js';

export interface McpValidationResult {
  valid: boolean;
  errors: string[];
}

interface ContentMcpServer {
  name: string;
  source: 'native' | 'docker';
  command?: string;
  args?: string[];
  url?: string;
}

interface ManifestMcpServer {
  name: string;
  type: 'stdio' | 'http' | 'docker';
  command?: string;
  args?: string[];
  url?: string;
  image?: string;
  servers?: Array<{
    name: string;
    command: string;
    args?: string[];
    mcp_reputation: string;
    researched_at: string;
  }>;
  mcp_reputation: string;
  researched_at: string;
}

/**
 * Validates MCP server declarations between content files and skillset.yaml.
 * Bidirectional: content->manifest and manifest->content.
 */
export function validateMcpServers(skillsetDir: string): McpValidationResult {
  const errors: string[] = [];

  const contentServers = collectContentServers(skillsetDir, errors);
  const manifestServers = collectManifestServers(skillsetDir, errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  if (contentServers.length === 0 && manifestServers.length === 0) {
    return { valid: true, errors: [] };
  }

  // Content -> manifest check
  for (const cs of contentServers) {
    if (!findManifestMatch(cs, manifestServers)) {
      errors.push(`MCP server '${cs.name}' found in content but not declared in skillset.yaml mcp_servers`);
    }
  }

  // Manifest -> content check
  for (const ms of manifestServers) {
    if (ms.type === 'docker') {
      for (const inner of ms.servers || []) {
        const match = contentServers.find(cs =>
          cs.source === 'docker' && cs.name === inner.name
        );
        if (!match) {
          errors.push(`Docker inner server '${inner.name}' declared in manifest but not found in content docker config`);
        }
      }
      validateDockerImage(skillsetDir, ms.image!, errors);
    } else {
      const match = contentServers.find(cs =>
        cs.source === 'native' && cs.name === ms.name
      );
      if (!match) {
        errors.push(`MCP server '${ms.name}' declared in skillset.yaml but not found in content`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parse native MCP servers from a JSON file containing an `mcpServers` key.
 * Deduplicates against existing servers by name.
 */
function parseNativeServersFromJson(
  filePath: string,
  servers: ContentMcpServer[],
  errors: string[]
): void {
  if (!existsSync(filePath)) return;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    if (data.mcpServers && typeof data.mcpServers === 'object') {
      for (const [name, config] of Object.entries(data.mcpServers as Record<string, Record<string, unknown>>)) {
        if (!servers.some(s => s.name === name && s.source === 'native')) {
          servers.push({
            name,
            source: 'native',
            command: config.command as string | undefined,
            args: config.args as string[] | undefined,
            url: config.url as string | undefined,
          });
        }
      }
    }
  } catch (error: unknown) {
    const label = filePath.split('/').slice(-2).join('/');
    errors.push(`Failed to parse ${label}: ${getErrorMessage(error)}`);
  }
}

/**
 * Collect MCP servers from content files (.mcp.json, .claude/settings.json, docker configs)
 */
function collectContentServers(skillsetDir: string, errors: string[]): ContentMcpServer[] {
  const servers: ContentMcpServer[] = [];
  const contentDir = join(skillsetDir, 'content');

  if (!existsSync(contentDir)) {
    return servers;
  }

  // Scan all JSON files under content for mcpServers keys
  for (const jsonPath of findFilesByExtensions(contentDir, ['.json'])) {
    parseNativeServersFromJson(jsonPath, servers, errors);
  }

  // Scan all YAML files under content for mcp_servers keys
  for (const yamlPath of findFilesByExtensions(contentDir, ['.yaml', '.yml'])) {
    try {
      const content = readFileSync(yamlPath, 'utf-8');
      const data = yaml.load(content) as Record<string, unknown>;
      if (data.mcp_servers && typeof data.mcp_servers === 'object') {
        for (const [name, config] of Object.entries(data.mcp_servers as Record<string, Record<string, unknown>>)) {
          if (!servers.some(s => s.name === name && s.source === 'docker')) {
            servers.push({
              name,
              source: 'docker',
              command: config.command as string | undefined,
              args: config.args as string[] | undefined,
            });
          }
        }
      }
    } catch (error: unknown) {
      errors.push(`Failed to parse ${yamlPath}: ${getErrorMessage(error)}`);
    }
  }

  return servers;
}

/**
 * Collect MCP servers from skillset.yaml manifest
 */
function collectManifestServers(skillsetDir: string, errors: string[]): ManifestMcpServer[] {
  const manifestPath = join(skillsetDir, 'skillset.yaml');

  if (!existsSync(manifestPath)) {
    return [];
  }

  try {
    const content = readFileSync(manifestPath, 'utf-8');
    const data = yaml.load(content) as Record<string, unknown>;

    if (!data.mcp_servers || !Array.isArray(data.mcp_servers)) {
      return [];
    }

    return data.mcp_servers as ManifestMcpServer[];
  } catch (error: unknown) {
    errors.push(`Failed to parse skillset.yaml: ${getErrorMessage(error)}`);
    return [];
  }
}

/**
 * Find a matching manifest entry for a content server.
 */
function findManifestMatch(
  contentServer: ContentMcpServer,
  manifestServers: ManifestMcpServer[]
): ManifestMcpServer | undefined {
  return manifestServers.find(ms => {
    if (contentServer.source === 'native') {
      if (ms.name !== contentServer.name || ms.type === 'docker') return false;

      if (ms.type === 'stdio') {
        return ms.command === contentServer.command
          && arraysEqual(ms.args || [], contentServer.args || []);
      }

      if (ms.type === 'http') {
        return ms.url === contentServer.url;
      }

      return false;
    }

    // Docker source: match within servers array
    if (ms.type !== 'docker' || !ms.servers) return false;

    return ms.servers.some(inner =>
      inner.name === contentServer.name
      && inner.command === contentServer.command
      && arraysEqual(inner.args || [], contentServer.args || [])
    );
  });
}

/**
 * Validate that a Docker image exists in any YAML file under docker/
 */
function validateDockerImage(skillsetDir: string, image: string, errors: string[]): void {
  const dockerDir = join(skillsetDir, 'content', 'docker');

  if (!existsSync(dockerDir)) {
    errors.push(`Docker image '${image}' declared but no docker directory found`);
    return;
  }

  const found = findFilesByExtensions(dockerDir, ['.yaml', '.yml']).some(yamlPath => {
    try {
      const content = readFileSync(yamlPath, 'utf-8');
      const data = yaml.load(content) as Record<string, unknown>;

      if (!data.services || typeof data.services !== 'object') return false;

      return Object.values(data.services as Record<string, Record<string, unknown>>)
        .some(service => service.image === image);
    } catch {
      return false;
    }
  });

  if (!found) {
    errors.push(`Docker image '${image}' not found in any YAML file under docker/`);
  }
}

const SKIP_DIRS = new Set(['node_modules', '.git']);

/**
 * Recursively find files matching any of the given extensions, skipping node_modules and .git.
 */
function findFilesByExtensions(dir: string, extensions: string[]): string[] {
  if (!existsSync(dir)) return [];

  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFilesByExtensions(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Compare two string arrays for equality
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}
