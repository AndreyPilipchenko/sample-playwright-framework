#!/usr/bin/env node
/**
 * Writes a Markdown summary of one Playwright run to the GitHub Actions job summary, so a
 * run's Summary page shows what passed, failed, was flaky or skipped without opening logs or
 * downloading the report artifacts.
 *
 *   node scripts/ci-summary.mjs <heading> [path/to/test-results.json]
 *
 * Reads the JSON reporter's output (playwright.config.ts, default
 * reports/json-report/test-results.json). Appends to $GITHUB_STEP_SUMMARY when it is set and
 * prints to stdout otherwise, so it can be tried locally after any run.
 *
 * It reports, never judges: it always exits 0, and the run-specs action's last step is what
 * fails the job. Ops tooling like scripts/app.mjs, outside the POM layer map.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const [heading = 'Playwright', reportArg] = process.argv.slice(2);
const reportFile = path.resolve(projectRoot, reportArg ?? 'reports/json-report/test-results.json');

/** Longest error excerpt shown per failed test; the full message is in the reports. */
const MAX_ERROR_LENGTH = 300;

/** Strips ANSI colour codes, which the reporter keeps in error messages. */
const ANSI_COLOUR = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const plain = (text) => text.replace(ANSI_COLOUR, '');

/** Makes text safe inside a Markdown table cell. */
const cell = (text) =>
  plain(String(text ?? ''))
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '\\|');

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const formatDuration = (ms) => {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
};

/** Collects every test of the report with the describe titles above it. */
function collectTests(report) {
  const rootDir = report.config?.rootDir ?? projectRoot;
  const tests = [];
  const walk = (suite, titles) => {
    for (const spec of suite.specs ?? []) {
      const file = path.relative(projectRoot, path.resolve(rootDir, spec.file)).split(path.sep).join('/');
      for (const test of spec.tests ?? []) {
        tests.push({
          name: [`[${test.projectName}]`, `${file}:${spec.line}`, ...titles, spec.title].join(' › '),
          status: test.status,
          results: test.results ?? [],
          annotations: test.annotations ?? [],
        });
      }
    }
    // The top-level suites are files; only the describe blocks below them add titles.
    for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
  };
  for (const fileSuite of report.suites ?? []) walk(fileSuite, []);
  return tests;
}

/** Keeps the assertion and its Expected/Received lines; drops the locator, timeout and call log. */
function errorExcerpt(message) {
  const kept = [];
  for (const line of plain(message).split('\n')) {
    if (/^\s*Call log:/.test(line)) break;
    if (/^\s*(Locator|Timeout):/.test(line)) continue;
    kept.push(line);
  }
  return truncate(cell(kept.join(' ')), MAX_ERROR_LENGTH);
}

/** The error of the latest attempt that has one (on CI a test runs again on retry). */
function firstError(test) {
  for (const result of [...test.results].reverse()) {
    const message = result.error?.message ?? result.errors?.[0]?.message;
    if (message) return errorExcerpt(message);
  }
  return '';
}

/** The test.skip() reason; a test with no attempt at all never started (e.g. its setup failed). */
function skipReason(test) {
  const reason = test.annotations.find((annotation) => annotation.type === 'skip')?.description;
  if (reason) return cell(reason);
  return test.results.length === 0 ? 'Did not run (a dependency such as the setup project failed, or the run stopped early)' : '';
}

function summarize() {
  if (!existsSync(reportFile)) {
    return `### ⚠️ ${heading}\n\nNo JSON report at \`${path.relative(projectRoot, reportFile)}\`: the run produced no results. See the step log.\n`;
  }
  const report = JSON.parse(readFileSync(reportFile, 'utf8'));
  const stats = report.stats ?? {};
  const tests = collectTests(report);
  const failed = tests.filter((test) => test.status === 'unexpected');
  const flaky = tests.filter((test) => test.status === 'flaky');
  const skipped = tests.filter((test) => test.status === 'skipped');
  const icon = failed.length > 0 || (report.errors ?? []).length > 0 ? '❌' : flaky.length > 0 ? '⚠️' : '✅';

  const total = (stats.expected ?? 0) + (stats.unexpected ?? 0) + (stats.flaky ?? 0) + (stats.skipped ?? 0);
  const lines = [`### ${icon} ${heading}`, ''];
  // Set by the run-specs action on a filtered manual run.
  if (process.env.CI_SUMMARY_NOTE) lines.push(cell(process.env.CI_SUMMARY_NOTE), '');
  if (total === 0) lines.push('No tests matched this selection.', '');
  lines.push(
    '| Passed | Failed | Flaky | Skipped | Duration |',
    '|---:|---:|---:|---:|---:|',
    `| ${stats.expected ?? 0} | ${stats.unexpected ?? 0} | ${stats.flaky ?? 0} | ${stats.skipped ?? 0} | ${formatDuration(stats.duration ?? 0)} |`,
    '',
  );
  // Errors outside any test (config, global setup, a crashed worker) fail the run too.
  if ((report.errors ?? []).length > 0) {
    lines.push('**Run errors**', '');
    for (const error of report.errors) lines.push(`- ${truncate(cell(error.message), MAX_ERROR_LENGTH)}`);
    lines.push('');
  }
  if (failed.length > 0) {
    lines.push('**Failed**', '', '| Test | Error |', '|---|---|');
    for (const test of failed) lines.push(`| ${cell(test.name)} | ${firstError(test)} |`);
    lines.push('');
  }
  if (flaky.length > 0) {
    lines.push('**Flaky** (failed, then passed on a retry)', '', '| Test | First error |', '|---|---|');
    for (const test of flaky) lines.push(`| ${cell(test.name)} | ${firstError(test)} |`);
    lines.push('');
  }
  if (skipped.length > 0) {
    lines.push(`<details><summary>Skipped (${skipped.length})</summary>`, '', '| Test | Reason |', '|---|---|');
    for (const test of skipped) lines.push(`| ${cell(test.name)} | ${skipReason(test)} |`);
    lines.push('', '</details>', '');
  }
  return `${lines.join('\n')}\n`;
}

let markdown;
try {
  markdown = summarize();
} catch (error) {
  markdown = `### ⚠️ ${heading}\n\nCould not read the JSON report: ${cell(error.message)}\n`;
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
else process.stdout.write(markdown);
