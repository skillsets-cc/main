import chalk from 'chalk';
import ora from 'ora';
import { verifyChecksums } from '../lib/checksum.js';
import { detectSkillset } from '../lib/filesystem.js';

interface VerifyOptions {
  dir?: string;
}

export async function verify(options: VerifyOptions): Promise<void> {
  const dir = options.dir || process.cwd();
  const spinner = ora('Detecting skillset...').start();

  // Detect which skillset is installed
  const skillsetId = await detectSkillset(dir);
  if (!skillsetId) {
    spinner.fail('No skillset.yaml found in directory');
    throw new Error('No skillset.yaml found in directory');
  }

  spinner.text = `Verifying ${skillsetId}...`;

  // Verify checksums
  const result = await verifyChecksums(skillsetId, dir);

  if (result.valid) {
    spinner.succeed('All checksums match!');
    return;
  }

  spinner.fail('Checksum verification failed');
  console.log(chalk.yellow('\nMismatched files:'));
  result.mismatches.forEach(({ file, expected, actual }) => {
    console.log(`  ${chalk.red('✗')} ${file}`);
    console.log(`    Expected: ${expected}`);
    console.log(`    Actual:   ${actual}`);
  });

  console.log(chalk.cyan('\nTo fix:'));
  console.log(`  npx skillsets install ${skillsetId} --force`);
  throw new Error('Checksum verification failed');
}
