import degit from 'degit';
import chalk from 'chalk';
import ora from 'ora';
import { confirm } from '@inquirer/prompts';
import { detectConflicts, backupFiles } from '../lib/filesystem.js';
import { verifyChecksums } from '../lib/checksum.js';
import { fetchSkillsetMetadata } from '../lib/api.js';
import { REGISTRY_REPO, DOWNLOADS_URL } from '../lib/constants.js';
import { mkdtemp, rm, cp, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { McpServer } from '../types/index.js';

interface InstallOptions {
  force?: boolean;
  backup?: boolean;
  acceptMcp?: boolean;
}

function formatMcpWarning(mcpServers: McpServer[], skillsetId: string): string {
  let output = chalk.yellow('\n⚠  This skillset includes MCP servers:\n');

  const nativeServers = mcpServers.filter(s => s.type !== 'docker');
  const dockerServers = mcpServers.filter(s => s.type === 'docker');

  if (nativeServers.length > 0) {
    output += chalk.white('\n  Claude Code managed:\n');
    for (const server of nativeServers) {
      const detail = server.type === 'stdio'
        ? `(${server.command} ${(server.args || []).join(' ')})`
        : `(${server.url})`;
      output += `    ${server.type}: ${server.name} ${detail}\n`;
      output += chalk.gray(`      Reputation: ${server.mcp_reputation} (as of ${server.researched_at})\n`);
    }
  }

  if (dockerServers.length > 0) {
    output += chalk.white('\n  Docker hosted:\n');
    for (const server of dockerServers) {
      output += `    image: ${server.image}\n`;
      output += chalk.gray(`      Reputation: ${server.mcp_reputation} (as of ${server.researched_at})\n`);
      if (server.servers && server.servers.length > 0) {
        output += `      Runs: ${server.servers.map(s => s.name).join(', ')}\n`;
      }
    }
  }

  output += chalk.gray('\n  MCP packages are fetched at runtime and may have changed since audit.\n');
  output += chalk.cyan(`\n  Review before installing:\n    https://github.com/skillsets-cc/main/tree/main/skillsets/${skillsetId}/content\n`);

  return output;
}

/**
 * Prompts for MCP server consent. Returns true to proceed, false to abort.
 * Exits the process in non-interactive environments without --accept-mcp.
 */
async function confirmMcpConsent(
  options: InstallOptions,
  warningMessage: string,
  promptMessage: string,
  cleanup?: () => Promise<void>,
): Promise<boolean> {
  if (!process.stdin.isTTY && !options.acceptMcp) {
    await cleanup?.();
    throw new Error('This skillset includes MCP servers. Use --accept-mcp to install in non-interactive environments.');
  }

  if (!options.acceptMcp) {
    console.log(warningMessage);

    const accepted = await confirm({
      message: promptMessage,
      default: false,
    });

    if (!accepted) {
      console.log(chalk.gray('\nInstallation cancelled.'));
      await cleanup?.();
      return false;
    }
  }

  return true;
}

export async function install(skillsetId: string, options: InstallOptions): Promise<void> {
  const spinner = ora(`Installing ${skillsetId}...`).start();

  // Validate skillsetId format
  if (!/^@[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(skillsetId)) {
    spinner.fail('Invalid skillset ID');
    console.log(chalk.red('\nExpected format: @author/name'));
    console.log(chalk.gray('Example: @supercollectible/Valence'));
    return;
  }

  // Check for conflicts
  const conflicts = await detectConflicts(process.cwd());
  if (conflicts.length > 0 && !options.force && !options.backup) {
    spinner.fail('Installation aborted');
    console.log(chalk.yellow('\nExisting files detected:'));
    conflicts.forEach((file) => console.log(`  - ${file}`));
    console.log(chalk.cyan('\nUse one of these flags:'));
    console.log('  --force   Overwrite existing files');
    console.log('  --backup  Backup existing files before install');
    return;
  }

  // Backup if requested
  if (options.backup && conflicts.length > 0) {
    spinner.text = 'Backing up existing files...';
    await backupFiles(conflicts, process.cwd());
  }

  // Fetch metadata and check for MCP servers BEFORE degit
  let metadataFetchFailed = false;
  spinner.text = 'Fetching skillset metadata...';
  const metadata = await fetchSkillsetMetadata(skillsetId).catch(() => {
    metadataFetchFailed = true;
    return undefined;
  });

  if (metadata?.mcp_servers && metadata.mcp_servers.length > 0) {
    spinner.stop();

    const proceed = await confirmMcpConsent(
      options,
      formatMcpWarning(metadata.mcp_servers, skillsetId),
      'Install MCP servers?',
    );
    if (!proceed) return;

    spinner.start('Downloading skillset...');
  }

  // Install to temp directory first (verify before writing to cwd)
  spinner.text = 'Downloading skillset...';
  const tempDir = await mkdtemp(join(tmpdir(), 'skillsets-'));

  try {
    const emitter = degit(`${REGISTRY_REPO}/skillsets/${skillsetId}/content`, {
      cache: false,
      force: true,
      verbose: false,
    });

    await emitter.clone(tempDir);

    // Post-install MCP check: if metadata fetch failed, inspect downloaded content
    if (metadataFetchFailed) {
      const hasMcpJson = existsSync(join(tempDir, '.mcp.json'));
      const hasClaudeSettings = existsSync(join(tempDir, '.claude', 'settings.json'));

      if (hasMcpJson || hasClaudeSettings) {
        spinner.stop();

        const cleanupTemp = () => rm(tempDir, { recursive: true, force: true });
        const warning = chalk.yellow('\n⚠  This skillset may include MCP servers (metadata unavailable for pre-check).')
          + chalk.cyan(`\n\n  Review before installing:\n    https://github.com/skillsets-cc/main/tree/main/skillsets/${skillsetId}/content\n`);

        const proceed = await confirmMcpConsent(options, warning, 'Continue installation?', cleanupTemp);
        if (!proceed) return;

        spinner.start('Verifying checksums...');
      }
    }

    // Verify checksums against temp directory
    spinner.text = 'Verifying checksums...';
    const result = await verifyChecksums(skillsetId, tempDir);
    if (!result.valid) {
      spinner.fail('Checksum verification failed - files may be corrupted');
      console.log(chalk.red('\nInstallation aborted due to checksum mismatch.'));
      console.log(chalk.yellow('This could indicate:'));
      console.log('  - Network issues during download');
      console.log('  - Corrupted files in the registry');
      console.log('  - Tampering with the downloaded content');
      console.log(chalk.cyan('\nTo retry:'));
      console.log(`  npx skillsets install ${skillsetId} --force`);
      await rm(tempDir, { recursive: true, force: true });
      throw new Error('Checksum verification failed - files may be corrupted');
    }

    // Checksums valid — move verified content to cwd
    spinner.text = 'Installing verified content...';
    const entries = await readdir(tempDir, { withFileTypes: true });
    for (const entry of entries) {
      await cp(join(tempDir, entry.name), join(process.cwd(), entry.name), {
        recursive: true,
        force: true,
      });
    }

    await rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }

  spinner.succeed(`Successfully installed ${skillsetId}`);

  // Track download (non-blocking, silent fail)
  fetch(DOWNLOADS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillset: skillsetId }),
  }).catch(() => {});

  // Print next steps
  console.log(chalk.green('\n✓ Installation complete!'));
  console.log(chalk.gray('\nNext steps:'));
  console.log('  1. Ask Opus to verify the skillset matches its claims');
  console.log('  2. Read QUICKSTART.md to customize for your project');
  console.log('  3. Run: claude');
}
