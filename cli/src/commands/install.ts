import degit from 'degit';
import chalk from 'chalk';
import ora from 'ora';
import { detectConflicts, backupFiles } from '../lib/filesystem.js';
import { verifyChecksums } from '../lib/checksum.js';
import { REGISTRY_REPO, DOWNLOADS_URL } from '../lib/constants.js';

interface InstallOptions {
  force?: boolean;
  backup?: boolean;
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

  // Install using degit (extract content/ subdirectory)
  spinner.text = 'Downloading skillset...';
  const emitter = degit(`${REGISTRY_REPO}/skillsets/${skillsetId}/content`, {
    cache: true,
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
