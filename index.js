#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createInterface } from 'readline';
import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import { program } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import 'dotenv/config';

// ─────────────────────────────────────────────
//  Banner
// ─────────────────────────────────────────────
function printBanner() {
  console.log(chalk.red.bold(`
╔══════════════════════════════════════════════╗
║     🗑️  GitHub Repo Bulk Deleter             ║
║     Delete multiple repos by URL             ║
╚══════════════════════════════════════════════╝
`));
}

// ─────────────────────────────────────────────
//  Parse GitHub URL → { owner, repo }
// ─────────────────────────────────────────────
function parseGitHubUrl(url) {
  try {
    const cleaned = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
    const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
//  Read URLs from file
// ─────────────────────────────────────────────
function readUrlsFromFile(filePath) {
  const abs = resolve(filePath);
  if (!existsSync(abs)) {
    console.error(chalk.red(`❌ File not found: ${abs}`));
    process.exit(1);
  }
  const lines = readFileSync(abs, 'utf-8').split('\n');
  return lines
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

// ─────────────────────────────────────────────
//  Read URLs from stdin (pipe support)
// ─────────────────────────────────────────────
async function readUrlsFromStdin() {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin });
    const lines = [];
    rl.on('line', (line) => {
      const t = line.trim();
      if (t && !t.startsWith('#')) lines.push(t);
    });
    rl.on('close', () => resolve(lines));
  });
}

// ─────────────────────────────────────────────
//  Delete a single repo
// ─────────────────────────────────────────────
async function deleteRepo(octokit, owner, repo) {
  await octokit.repos.delete({ owner, repo });
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────
async function main() {
  printBanner();

  program
    .name('delete-repos')
    .description('Delete multiple GitHub repositories by URL')
    .option('-t, --token <token>', 'GitHub Personal Access Token (or set GITHUB_TOKEN env)')
    .option('-f, --file <path>', 'Path to file containing repo URLs (one per line)')
    .option('-u, --urls <urls...>', 'Repo URLs to delete (space-separated)')
    .option('-y, --yes', 'Skip confirmation prompt', false)
    .option('--dry-run', 'List repos that would be deleted without actually deleting', false)
    .parse(process.argv);

  const opts = program.opts();

  // ── Token ────────────────────────────────
  const token = opts.token || process.env.GITHUB_TOKEN;
  if (!token) {
    console.error(chalk.red('❌ GitHub token is required.'));
    console.error(chalk.yellow('   Set GITHUB_TOKEN env variable or use --token <token>'));
    console.error(chalk.yellow('   Create token at: https://github.com/settings/tokens'));
    console.error(chalk.yellow('   Required scope: delete_repo'));
    process.exit(1);
  }

  // ── Collect URLs ─────────────────────────
  let rawUrls = [];

  if (opts.urls && opts.urls.length > 0) {
    rawUrls = opts.urls;
  } else if (opts.file) {
    rawUrls = readUrlsFromFile(opts.file);
  } else if (!process.stdin.isTTY) {
    rawUrls = await readUrlsFromStdin();
  } else {
    console.error(chalk.red('❌ No URLs provided.'));
    console.error(chalk.yellow('   Use --file <path>, --urls <url...>, or pipe URLs via stdin'));
    console.error(chalk.yellow('\n   Examples:'));
    console.error(chalk.dim('     node index.js --urls https://github.com/user/repo1 https://github.com/user/repo2'));
    console.error(chalk.dim('     node index.js --file repos.txt'));
    console.error(chalk.dim('     cat repos.txt | node index.js'));
    process.exit(1);
  }

  // ── Parse URLs ───────────────────────────
  const valid = [];
  const invalid = [];

  for (const url of rawUrls) {
    const parsed = parseGitHubUrl(url);
    if (parsed) {
      valid.push({ url, ...parsed });
    } else {
      invalid.push(url);
    }
  }

  if (invalid.length > 0) {
    console.log(chalk.yellow(`\n⚠️  Skipping ${invalid.length} invalid URL(s):`));
    invalid.forEach((u) => console.log(chalk.dim(`   - ${u}`)));
  }

  if (valid.length === 0) {
    console.error(chalk.red('\n❌ No valid GitHub URLs found.'));
    process.exit(1);
  }

  // ── Preview ──────────────────────────────
  console.log(chalk.cyan(`\n📋 Repos to delete (${valid.length}):\n`));
  valid.forEach(({ owner, repo, url }, i) => {
    console.log(
      chalk.white(`  ${String(i + 1).padStart(2, ' ')}. `) +
      chalk.red.bold(`${owner}/${repo}`) +
      chalk.dim(`  (${url})`)
    );
  });

  if (opts.dryRun) {
    console.log(chalk.green('\n✅ Dry run complete. No repos were deleted.'));
    process.exit(0);
  }

  // ── Confirm ──────────────────────────────
  if (!opts.yes) {
    console.log('');
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red.bold(
          `⚠️  This will PERMANENTLY delete ${valid.length} repo(s). This CANNOT be undone. Continue?`
        ),
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\n🚫 Aborted. No repos were deleted.'));
      process.exit(0);
    }

    // Double confirm
    const { confirmText } = await inquirer.prompt([
      {
        type: 'input',
        name: 'confirmText',
        message: chalk.yellow(`Type "DELETE" to confirm deletion of ${valid.length} repo(s):`),
      },
    ]);

    if (confirmText !== 'DELETE') {
      console.log(chalk.yellow('\n🚫 Confirmation failed. No repos were deleted.'));
      process.exit(0);
    }
  }

  // ── Authenticate ─────────────────────────
  const octokit = new Octokit({ auth: token });

  // Verify token
  const authSpinner = ora('Verifying GitHub token...').start();
  try {
    const { data: user } = await octokit.users.getAuthenticated();
    authSpinner.succeed(chalk.green(`Authenticated as: ${chalk.bold(user.login)}`));
  } catch {
    authSpinner.fail(chalk.red('Invalid or expired GitHub token.'));
    process.exit(1);
  }

  // ── Delete ───────────────────────────────
  console.log('');
  const results = { success: [], failed: [] };

  for (let i = 0; i < valid.length; i++) {
    const { owner, repo } = valid[i];
    const label = chalk.red.bold(`${owner}/${repo}`);
    const prefix = chalk.dim(`[${i + 1}/${valid.length}]`);
    const spinner = ora(`${prefix} Deleting ${label}...`).start();

    try {
      await deleteRepo(octokit, owner, repo);
      spinner.succeed(`${prefix} Deleted ${label}`);
      results.success.push(`${owner}/${repo}`);
    } catch (err) {
      const status = err?.status;
      let reason = err?.message || 'Unknown error';

      if (status === 403) reason = 'Permission denied (missing delete_repo scope?)';
      else if (status === 404) reason = 'Repo not found (already deleted or wrong name)';
      else if (status === 401) reason = 'Unauthorized (invalid token)';

      spinner.fail(`${prefix} Failed ${label} — ${chalk.dim(reason)}`);
      results.failed.push({ name: `${owner}/${repo}`, reason });
    }

    // Small delay to respect rate limits
    if (i < valid.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // ── Summary ──────────────────────────────
  console.log(chalk.cyan('\n─────────────────────────────────────'));
  console.log(chalk.bold('📊 Summary'));
  console.log(chalk.cyan('─────────────────────────────────────'));
  console.log(chalk.green(`  ✅ Deleted:  ${results.success.length}`));
  console.log(chalk.red(`  ❌ Failed:   ${results.failed.length}`));

  if (results.failed.length > 0) {
    console.log(chalk.yellow('\n  Failed repos:'));
    results.failed.forEach(({ name, reason }) => {
      console.log(chalk.dim(`    - ${name}: ${reason}`));
    });
  }

  console.log(chalk.cyan('─────────────────────────────────────\n'));
}

main().catch((err) => {
  console.error(chalk.red('\n💥 Unexpected error:'), err.message);
  process.exit(1);
});
