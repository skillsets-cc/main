import chalk from 'chalk';

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function handleError(error: unknown): void {
  if (error instanceof Error) {
    console.error(chalk.red(`Error: ${error.message}`));
  } else {
    console.error(chalk.red('Unexpected error:'));
    console.error(error);
  }
  process.exit(1);
}
