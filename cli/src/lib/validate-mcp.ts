import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

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
  parentImage?: string;
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
 * Bidirectional: content→manifest and manifest→content.
 */
export function validateMcpServers(skillsetDir: string): McpValidationResult {
  const errors: string[] = [];

  // 1. Collect from content
  const contentServers = collectContentServers(skillsetDir, errors);

  // 2. Collect from manifest
  const manifestServers = collectManifestServers(skillsetDir, errors);

  // If we hit parse errors, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 3. No MCPs anywhere = pass
  if (contentServers.length === 0 && manifestServers.length === 0) {
    return { valid: true, errors: [] };
  }

  // 4. Content→manifest check
  for (const cs of contentServers) {
    const match = findManifestMatch(cs, manifestServers);
    if (!match) {
      errors.push(`MCP server '${cs.name}' found in content but not declared in skillset.yaml mcp_servers`);
    }
  }

  // 5. Manifest→content check
  for (const ms of manifestServers) {
    if (ms.type === 'docker') {
      // Check Docker inner servers
      for (const inner of ms.servers || []) {
        const match = contentServers.find(cs =>
          cs.source === 'docker' && cs.name === inner.name
        );
        if (!match) {
          errors.push(`Docker inner server '${inner.name}' declared in manifest but not found in content docker config`);
        }
      }
      // Check Docker image exists in compose
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
      for (const [name, config] of Object.entries(data.mcpServers as Record<string, any>)) {
        if (!servers.some(s => s.name === name && s.source === 'native')) {
          servers.push({
            name,
            source: 'native',
            command: config.command,
            args: config.args,
            url: config.url,
          });
        }
      }
    }
  } catch (error: any) {
    const label = filePath.split('/').slice(-2).join('/');
    errors.push(`Failed to parse ${label}: ${error.message}`);
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

  // Native MCP server sources (order matters for dedup: first found wins)
  const nativeJsonPaths = [
    join(contentDir, '.mcp.json'),
    join(contentDir, '.claude', 'settings.json'),
    join(contentDir, '.claude', 'settings.local.json'),
  ];
  for (const jsonPath of nativeJsonPaths) {
    parseNativeServersFromJson(jsonPath, servers, errors);
  }

  // 4. Check docker/**/*.yaml and docker/**/*.yml for mcp_servers key
  const dockerDir = join(contentDir, 'docker');
  if (existsSync(dockerDir)) {
    const yamlFiles = findYamlFiles(dockerDir);
    for (const yamlPath of yamlFiles) {
      try {
        const content = readFileSync(yamlPath, 'utf-8');
        const data = yaml.load(content) as Record<string, any>;
        if (data.mcp_servers && typeof data.mcp_servers === 'object') {
          for (const [name, config] of Object.entries(data.mcp_servers as Record<string, any>)) {
            // Avoid duplicates across multiple yaml files
            if (!servers.some(s => s.name === name && s.source === 'docker')) {
              servers.push({
                name,
                source: 'docker',
                command: config.command,
                args: config.args,
              });
            }
          }
        }
      } catch (error: any) {
        errors.push(`Failed to parse ${yamlPath}: ${error.message}`);
      }
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
    const data = yaml.load(content) as Record<string, any>;

    if (!data.mcp_servers || !Array.isArray(data.mcp_servers)) {
      return [];
    }

    return data.mcp_servers as ManifestMcpServer[];
  } catch (error: any) {
    errors.push(`Failed to parse skillset.yaml: ${error.message}`);
    return [];
  }
}

/**
 * Find a matching manifest entry for a content server
 */
function findManifestMatch(
  contentServer: ContentMcpServer,
  manifestServers: ManifestMcpServer[]
): ManifestMcpServer | undefined {
  for (const ms of manifestServers) {
    if (contentServer.source === 'native') {
      // Native server: match by name and verify command/url
      if (ms.name !== contentServer.name || ms.type === 'docker') {
        continue;
      }

      // For stdio type, check command and args
      if (ms.type === 'stdio') {
        if (ms.command === contentServer.command) {
          // Check args match (both undefined or same array)
          const msArgs = ms.args || [];
          const csArgs = contentServer.args || [];
          if (arraysEqual(msArgs, csArgs)) {
            return ms;
          }
        }
      }

      // For http type, check url
      if (ms.type === 'http' && ms.url === contentServer.url) {
        return ms;
      }
    } else if (contentServer.source === 'docker') {
      // Docker server: match within servers array
      if (ms.type === 'docker' && ms.servers) {
        for (const inner of ms.servers) {
          if (inner.name === contentServer.name) {
            // Check command and args match
            if (inner.command === contentServer.command) {
              const innerArgs = inner.args || [];
              const csArgs = contentServer.args || [];
              if (arraysEqual(innerArgs, csArgs)) {
                return ms;
              }
            }
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Validate that a Docker image exists in any YAML file under docker/ (compose or otherwise)
 */
function validateDockerImage(skillsetDir: string, image: string, errors: string[]): void {
  const contentDir = join(skillsetDir, 'content');
  const dockerDir = join(contentDir, 'docker');

  if (!existsSync(dockerDir)) {
    errors.push(`Docker image '${image}' declared but no docker directory found`);
    return;
  }

  const yamlFiles = findYamlFiles(dockerDir);
  let found = false;

  for (const yamlPath of yamlFiles) {
    try {
      const content = readFileSync(yamlPath, 'utf-8');
      const data = yaml.load(content) as Record<string, any>;

      // Check if any service uses the specified image
      if (data.services && typeof data.services === 'object') {
        for (const service of Object.values(data.services as Record<string, any>)) {
          if (service.image === image) {
            found = true;
            break;
          }
        }
      }
    } catch {
      // Parse errors for compose files are non-fatal here — already caught in content scanning
    }
    if (found) break;
  }

  if (!found) {
    errors.push(`Docker image '${image}' not found in any YAML file under docker/`);
  }
}

/**
 * Recursively find all YAML files (.yaml, .yml) in a directory
 */
function findYamlFiles(dir: string): string[] {
  const results: string[] = [];

  if (!existsSync(dir)) {
    return results;
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findYamlFiles(fullPath));
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Compare two arrays for equality
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
