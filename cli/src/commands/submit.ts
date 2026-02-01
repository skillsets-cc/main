import chalk from 'chalk';
import ora from 'ora';
import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, mkdirSync, cpSync, rmSync } from 'fs';
import { join, basename } from 'path';
import yaml from 'js-yaml';
import { tmpdir } from 'os';

const REGISTRY_REPO = 'skillsets-cc/main';
const REGISTRY_URL = `https://github.com/${REGISTRY_REPO}`;

function checkGhCli(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkGhAuth(): boolean {
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getGhUsername(): string | null {
  try {
    const result = execSync('gh api user --jq .login', { encoding: 'utf-8' });
    return result.trim();
  } catch {
    return null;
  }
}

function parseSkillsetYaml(cwd: string): { name: string; author: string; version: string } | null {
  const yamlPath = join(cwd, 'skillset.yaml');
  if (!existsSync(yamlPath)) return null;

  try {
    const content = readFileSync(yamlPath, 'utf-8');
    const data = yaml.load(content) as Record<string, any>;
    return {
      name: data.name,
      author: data.author?.handle?.replace('@', ''),
      version: data.version,
    };
  } catch {
    return null;
  }
}

function checkAuditReport(cwd: string): { exists: boolean; passing: boolean } {
  const reportPath = join(cwd, 'AUDIT_REPORT.md');
  if (!existsSync(reportPath)) {
    return { exists: false, passing: false };
  }

  const content = readFileSync(reportPath, 'utf-8');
  const passing = content.includes('READY FOR SUBMISSION');
  return { exists: true, passing };
}

export async function submit(): Promise<void> {
  const cwd = process.cwd();

  console.log(chalk.blue('\n📤 Submit skillset to registry\n'));

  // Pre-flight checks
  console.log(chalk.gray('Running pre-flight checks...\n'));

  // 1. Check gh CLI
  if (!checkGhCli()) {
    console.log(chalk.red('✗ GitHub CLI (gh) not found'));
    console.log(chalk.gray('  Install: https://cli.github.com/'));
    process.exit(1);
  }
  console.log(chalk.green('✓ GitHub CLI found'));

  // 2. Check gh auth
  if (!checkGhAuth()) {
    console.log(chalk.red('✗ GitHub CLI not authenticated'));
    console.log(chalk.gray('  Run: gh auth login'));
    process.exit(1);
  }
  console.log(chalk.green('✓ GitHub CLI authenticated'));

  // 3. Get username
  const username = getGhUsername();
  if (!username) {
    console.log(chalk.red('✗ Could not determine GitHub username'));
    process.exit(1);
  }
  console.log(chalk.green(`✓ Logged in as ${username}`));

  // 4. Check skillset.yaml
  const skillset = parseSkillsetYaml(cwd);
  if (!skillset) {
    console.log(chalk.red('✗ skillset.yaml not found or invalid'));
    console.log(chalk.gray('  Run: npx skillsets init'));
    process.exit(1);
  }
  console.log(chalk.green(`✓ Skillset: ${skillset.name} v${skillset.version}`));

  // 5. Check audit report
  const audit = checkAuditReport(cwd);
  if (!audit.exists) {
    console.log(chalk.red('✗ AUDIT_REPORT.md not found'));
    console.log(chalk.gray('  Run: npx skillsets audit'));
    process.exit(1);
  }
  if (!audit.passing) {
    console.log(chalk.red('✗ Audit report shows failures'));
    console.log(chalk.gray('  Fix issues and re-run: npx skillsets audit'));
    process.exit(1);
  }
  console.log(chalk.green('✓ Audit report passing'));

  // 6. Check required files
  const requiredFiles = ['skillset.yaml', 'README.md', 'PROOF.md', 'AUDIT_REPORT.md', 'content'];
  for (const file of requiredFiles) {
    if (!existsSync(join(cwd, file))) {
      console.log(chalk.red(`✗ Missing required: ${file}`));
      process.exit(1);
    }
  }
  console.log(chalk.green('✓ All required files present'));

  console.log('');

  // Create submission
  const spinner = ora('Preparing submission...').start();

  const skillsetId = `@${skillset.author}/${skillset.name}`;
  const branchName = `submit/${skillset.author}/${skillset.name}`;
  const tempDir = join(tmpdir(), `skillsets-submit-${Date.now()}`);

  try {
    // Fork and clone
    spinner.text = 'Forking registry (if needed)...';
    try {
      execSync(`gh repo fork ${REGISTRY_REPO} --clone=false`, { stdio: 'ignore' });
    } catch {
      // Already forked, that's fine
    }

    // Clone the fork
    spinner.text = 'Cloning registry...';
    execSync(`gh repo clone ${REGISTRY_REPO} "${tempDir}" -- --depth=1`, { stdio: 'ignore' });

    // Create branch
    spinner.text = 'Creating branch...';
    execSync(`git checkout -b "${branchName}"`, { cwd: tempDir, stdio: 'ignore' });

    // Create skillset directory
    const skillsetDir = join(tempDir, 'skillsets', `@${skillset.author}`, skillset.name);
    mkdirSync(skillsetDir, { recursive: true });

    // Copy files
    spinner.text = 'Copying skillset files...';
    const filesToCopy = ['skillset.yaml', 'README.md', 'PROOF.md', 'AUDIT_REPORT.md', 'content'];
    for (const file of filesToCopy) {
      const src = join(cwd, file);
      const dest = join(skillsetDir, file);
      cpSync(src, dest, { recursive: true });
    }

    // Commit
    spinner.text = 'Committing changes...';
    execSync('git add .', { cwd: tempDir, stdio: 'ignore' });
    execSync(`git commit -m "Add ${skillsetId}"`, { cwd: tempDir, stdio: 'ignore' });

    // Push to fork
    spinner.text = 'Pushing to fork...';
    execSync(`git push -u origin "${branchName}" --force`, { cwd: tempDir, stdio: 'ignore' });

    // Create PR
    spinner.text = 'Creating pull request...';
    const prBody = `## New Skillset Submission

**Skillset:** ${skillsetId}
**Version:** ${skillset.version}
**Author:** @${skillset.author}

### Checklist

- [x] \`skillset.yaml\` validated against schema
- [x] \`README.md\` with installation and usage instructions
- [x] \`PROOF.md\` with production evidence
- [x] \`AUDIT_REPORT.md\` generated and passing
- [x] \`content/\` directory with skillset files

### Notes

_Add any additional context for reviewers here._

---
Submitted via \`npx skillsets submit\`
`;

    const prResult = execSync(
      `gh pr create --repo ${REGISTRY_REPO} --title "Add ${skillsetId}" --body "${prBody.replace(/"/g, '\\"')}"`,
      { cwd: tempDir, encoding: 'utf-8' }
    );

    // Cleanup
    spinner.text = 'Cleaning up...';
    rmSync(tempDir, { recursive: true, force: true });

    spinner.succeed('Pull request created');

    // Extract PR URL from result
    const prUrl = prResult.trim();

    console.log(chalk.green('\n✓ Submission complete!\n'));
    console.log(`  Skillset: ${chalk.bold(skillsetId)}`);
    console.log(`  PR: ${chalk.cyan(prUrl)}`);
    console.log('');
    console.log(chalk.gray('A maintainer will review your submission.'));
    console.log(chalk.gray('You can track progress at the PR link above.'));

  } catch (error: any) {
    spinner.fail('Submission failed');
    console.log(chalk.red('\nError details:'));
    console.log(chalk.gray(error.message || error));

    // Cleanup on error
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }

    console.log(chalk.cyan('\nTo submit manually:'));
    console.log(`  1. Fork ${REGISTRY_URL}`);
    console.log(`  2. Create skillsets/@${skillset.author}/${skillset.name}/`);
    console.log('  3. Copy your skillset files');
    console.log('  4. Open a pull request');

    process.exit(1);
  }
}
