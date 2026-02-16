import chalk from 'chalk';
import ora from 'ora';
import { fetchSkillsetMetadata } from '../lib/api.js';
import { GITHUB_RAW_BASE } from '../lib/constants.js';

function fail(spinner: ReturnType<typeof ora>, message: string): never {
  spinner.fail(message);
  throw new Error(message);
}

export async function view(skillsetId: string): Promise<void> {
  const spinner = ora('Fetching skillset details...').start();

  const metadata = await fetchSkillsetMetadata(skillsetId);
  if (!metadata) {
    fail(spinner, `Skillset '${skillsetId}' not found`);
  }

  const [namespace, name] = skillsetId.split('/');
  const encodedPath = encodeURIComponent(namespace) + '/' + encodeURIComponent(name);
  const readmeUrl = `${GITHUB_RAW_BASE}/skillsets/${encodedPath}/content/README.md`;
  const auditUrl = `${GITHUB_RAW_BASE}/skillsets/${encodedPath}/AUDIT_REPORT.md`;

  const [readmeResponse, auditResponse] = await Promise.all([
    fetch(readmeUrl),
    fetch(auditUrl),
  ]);

  if (!readmeResponse.ok) {
    fail(spinner, `Could not fetch README for '${skillsetId}'`);
  }

  spinner.stop();

  const readme = await readmeResponse.text();

  console.log();
  console.log(chalk.bold(`  ${skillsetId}`));
  console.log();
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  console.log();
  console.log(readme);

  if (auditResponse.ok) {
    const audit = await auditResponse.text();
    console.log();
    console.log(chalk.dim('  ' + '─'.repeat(50)));
    console.log(chalk.bold('  Audit Report'));
    console.log(chalk.dim('  ' + '─'.repeat(50)));
    console.log();
    console.log(audit);
  }
}
