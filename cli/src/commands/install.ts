import degit from 'degit';
import chalk from 'chalk';
import ora from 'ora';
import { confirm } from '@inquirer/prompts';
import { detectConflicts, backupFiles } from '../lib/filesystem.js';
import { verifyChecksums } from '../lib/checksum.js';
import { fetchSkillsetMetadata } from '../lib/api.js';
import { REGISTRY_REPO, DOWNLOADS_URL } from '../lib/constants.js';
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

export async function install(skillsetId: string, options: InstallOptions): Promise<void> {
  const spinner = ora(`Installing ${skillsetId}...`).start();

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
  spinner.text = 'Fetching skillset metadata...';
  try {
    const metadata = await fetchSkillsetMetadata(skillsetId);
    if (metadata?.mcp_servers && metadata.mcp_servers.length > 0) {
      spinner.stop();

      // Non-interactive check
      if (!process.stdin.isTTY && !options.acceptMcp) {
        console.log(chalk.red('This skillset includes MCP servers. Use --accept-mcp to install in non-interactive environments.'));
        process.exit(1);
        return;
      }

      if (!options.acceptMcp) {
        console.log(formatMcpWarning(metadata.mcp_servers, skillsetId));

        const accepted = await confirm({
          message: 'Install MCP servers?',
          default: false,
        });

        if (!accepted) {
          console.log(chalk.gray('\nInstallation cancelled.'));
          return;
        }
      }

      spinner.start('Downloading skillset...');
    }
  } catch {
    // If metadata fetch fails, continue without MCP check
    // (registry might be down, don't block install)
  }

  // Install using degit (extract content/ subdirectory)
  spinner.text = 'Downloading skillset...';
  const emitter = degit(`${REGISTRY_REPO}/skillsets/${skillsetId}/content`, {
    cache: false,
    force: true,
    verbose: false,
  });

  await emitter.clone(process.cwd());

  // Verify checksums
  spinner.text = 'Verifying checksums...';
  const result = await verifyChecksums(skillsetId, process.cwd());
  if (!result.valid) {
    spinner.fail('Checksum verification failed - files may be corrupted');
    console.log(chalk.red('\nInstallation aborted due to checksum mismatch.'));
    console.log(chalk.yellow('This could indicate:'));
    console.log('  - Network issues during download');
    console.log('  - Corrupted files in the registry');
    console.log('  - Tampering with the downloaded content');
    console.log(chalk.cyan('\nTo retry:'));
    console.log(`  npx skillsets install ${skillsetId} --force`);
    process.exit(1);
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
  console.log('  1. Review CLAUDE.md for usage instructions');
  console.log('  2. Customize .claude/skills/ for your project');
  console.log('  3. Run: claude');
}
