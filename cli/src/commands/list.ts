import chalk from 'chalk';
import ora from 'ora';
import { fetchSearchIndex, fetchStats, mergeStats } from '../lib/api.js';

interface ListOptions {
  limit?: string;
  sort?: 'name' | 'stars' | 'downloads' | 'recent';
  json?: boolean;
}

export async function list(options: ListOptions): Promise<void> {
  const spinner = ora('Fetching skillsets...').start();

  try {
    // Fetch index and live stats in parallel
    const [index, stats] = await Promise.all([fetchSearchIndex(), fetchStats()]);
    spinner.stop();

    // Merge live stats into skillsets
    let skillsets = mergeStats(index.skillsets, stats);

    // Sort
    const sortBy = options.sort || 'name';
    switch (sortBy) {
      case 'stars':
        skillsets.sort((a, b) => b.stars - a.stars);
        break;
      case 'downloads':
        skillsets.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
        break;
      case 'name':
      default:
        skillsets.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

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
        padEnd('INSTALLS', 10) +
        'DESCRIPTION'
      )
    );
    console.log(chalk.gray('─'.repeat(110)));

    // Rows
    for (const s of skillsets) {
      const name = padEnd(s.name, 30);
      const author = padEnd(s.author.handle, 20);
      const stars = padEnd(`★ ${s.stars}`, 8);
      const downloads = padEnd(`↓ ${s.downloads ?? 0}`, 10);
      const desc = truncate(s.description, 32);

      console.log(
        chalk.bold(name) +
        chalk.gray(author) +
        chalk.yellow(stars) +
        chalk.gray(downloads) +
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
