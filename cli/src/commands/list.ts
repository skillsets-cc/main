import chalk from 'chalk';
import ora from 'ora';
import { fetchSearchIndex } from '../lib/api.js';

interface ListOptions {
  limit?: string;
  sort?: 'name' | 'stars' | 'recent';
  json?: boolean;
}

export async function list(options: ListOptions): Promise<void> {
  const spinner = ora('Fetching skillsets...').start();

  try {
    const index = await fetchSearchIndex();
    spinner.stop();

    let skillsets = [...index.skillsets];

    // Sort
    const sortBy = options.sort || 'name';
    if (sortBy === 'stars') {
      skillsets.sort((a, b) => b.stars - a.stars);
    } else if (sortBy === 'name') {
      skillsets.sort((a, b) => a.name.localeCompare(b.name));
    }
    // 'recent' would require a date field - skip for now

    // Limit
    const limit = parseInt(options.limit || '0', 10);
    if (limit > 0) {
      skillsets = skillsets.slice(0, limit);
    }

    // JSON output
    if (options.json) {
      console.log(JSON.stringify(skillsets, null, 2));
      return;
    }

    // No results
    if (skillsets.length === 0) {
      console.log(chalk.yellow('No skillsets found in the registry.'));
      console.log(chalk.gray('\nBe the first to contribute: npx skillsets init'));
      return;
    }

    // Header
    console.log(chalk.bold(`\n📦 Available Skillsets (${skillsets.length})\n`));

    // Table header
    console.log(
      chalk.gray(
        padEnd('NAME', 30) +
        padEnd('AUTHOR', 20) +
        padEnd('STARS', 8) +
        'DESCRIPTION'
      )
    );
    console.log(chalk.gray('─'.repeat(100)));

    // Rows
    for (const s of skillsets) {
      const name = padEnd(s.name, 30);
      const author = padEnd(s.author.handle, 20);
      const stars = padEnd(`★ ${s.stars}`, 8);
      const desc = truncate(s.description, 40);

      console.log(
        chalk.bold(name) +
        chalk.gray(author) +
        chalk.yellow(stars) +
        desc
      );
    }

    console.log('');
    console.log(chalk.gray(`Install: npx skillsets install <name>`));
    console.log(chalk.gray(`Details: npx skillsets search <name>`));
  } catch (error) {
    spinner.fail('Failed to fetch skillsets');
    throw error;
  }
}

function padEnd(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len - 1) + ' ';
  return str + ' '.repeat(len - str.length);
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 3) + '...';
}
