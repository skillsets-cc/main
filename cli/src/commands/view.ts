import chalk from 'chalk';
import ora from 'ora';
import { fetchSkillsetMetadata } from '../lib/api.js';
import { GITHUB_RAW_BASE } from '../lib/constants.js';

export async function view(skillsetId: string): Promise<void> {
  const spinner = ora('Fetching README...').start();

  const metadata = await fetchSkillsetMetadata(skillsetId);
  if (!metadata) {
    spinner.fail(`Skillset '${skillsetId}' not found`);
    throw new Error(`Skillset '${skillsetId}' not found`);
  }

  const [namespace, name] = skillsetId.split('/');
  const encodedPath = encodeURIComponent(namespace) + '/' + encodeURIComponent(name);
  const url = `${GITHUB_RAW_BASE}/skillsets/${encodedPath}/content/README.md`;
  const response = await fetch(url);

  if (!response.ok) {
    spinner.fail(`Could not fetch README for '${skillsetId}'`);
    throw new Error(`Could not fetch README for '${skillsetId}'`);
  }

  spinner.stop();

  const readme = await response.text();

  console.log();
  console.log(chalk.bold(`  ${skillsetId}`));
  console.log();
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  console.log();
  console.log(readme);
}
