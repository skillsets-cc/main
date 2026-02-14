import chalk from 'chalk';
import ora from 'ora';
import { fetchSkillsetMetadata } from '../lib/api.js';
import { GITHUB_RAW_BASE } from '../lib/constants.js';

function fail(spinner: ReturnType<typeof ora>, message: string): never {
  spinner.fail(message);
  throw new Error(message);
}

export async function view(skillsetId: string): Promise<void> {
  const spinner = ora('Fetching README...').start();

  const metadata = await fetchSkillsetMetadata(skillsetId);
  if (!metadata) {
    fail(spinner, `Skillset '${skillsetId}' not found`);
  }

  const [namespace, name] = skillsetId.split('/');
  const encodedPath = encodeURIComponent(namespace) + '/' + encodeURIComponent(name);
  const url = `${GITHUB_RAW_BASE}/skillsets/${encodedPath}/content/README.md`;
  const response = await fetch(url);

  if (!response.ok) {
    fail(spinner, `Could not fetch README for '${skillsetId}'`);
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
