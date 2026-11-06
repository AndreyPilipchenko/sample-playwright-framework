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
 * With CI_BASELINE_FILE set, the failures are compared with that earlier run's results, so a new
 * failure stands out among those that fail every time: newly failing, fixed since the last run,
 * still failing. The comparison knows nothing about defects, only about the two runs. With
 * CI_BASELINE_UPDATE=true the file is then replaced by this run's results for the next comparison
 * (test names and outcomes only, never error text), and `baseline-updated=true` goes to
 * $GITHUB_OUTPUT. The run-specs action keeps the file between runs in the Actions cache.
 *
 * It reports, never judges: it always exits 0, and the run-specs action's last step is what
 * fails the job. Ops tooling like scripts/app.mjs, outside the POM layer map.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
          // The name without the line number, which moves with any edit above the test.
          key: [`[${test.projectName}]`, file, ...titles, spec.title].join(' › '),
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

/** The earlier run's results, or undefined when there are none or they cannot be read. */
function readBaseline(file) {
  if (!file || !existsSync(file)) return undefined;
  try {
    const baseline = JSON.parse(readFileSync(file, 'utf8'));
    return baseline.outcomes ? baseline : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Saves this run's outcomes for the next comparison. A test that did not run here keeps its earlier
 * outcome, so a stopped run does not make its failures look new next time. A run without any result
 * saves nothing.
 */
function updateBaseline(file, tests, previous) {
  const outcomes = {};
  for (const test of tests) {
    if (test.status === 'unexpected') outcomes[test.key] = 'failed';
    else if (test.status === 'expected' || test.status === 'flaky') outcomes[test.key] = 'passed';
    else if (previous?.outcomes[test.key]) outcomes[test.key] = previous.outcomes[test.key];
  }
  if (!tests.some((test) => test.status !== 'skipped')) return;
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ runId: process.env.GITHUB_RUN_ID, savedAt: new Date().toISOString(), outcomes }));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, 'baseline-updated=true\n');
}

/** Where the compared run can be opened, when this runs on GitHub. */
function baselineLabel(baseline) {
  const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repository } = process.env;
  if (!baseline.runId) return `the results saved on ${baseline.savedAt ?? 'an earlier date'}`;
  // A re-run finds its own first attempt, so a failure new in that attempt reads as still failing.
  if (baseline.runId === process.env.GITHUB_RUN_ID) return 'an earlier attempt of this run, not the previous run';
  return server && repository ? `[run ${baseline.runId}](${server}/${repository}/actions/runs/${baseline.runId})` : `run ${baseline.runId}`;
}

/** The failed tests, split by comparison with the earlier run. */
function failureLines(failed, tests, baseline) {
  const table = (rows) => ['| Test | Error |', '|---|---|', ...rows.map((test) => `| ${cell(test.name)} | ${firstError(test)} |`)];
  const failedBefore = (test) => baseline.outcomes[test.key] === 'failed';
  const newly = failed.filter((test) => !failedBefore(test));
  const still = failed.filter(failedBefore);
  const fixed = tests.filter((test) => test.status === 'expected' && failedBefore(test));

  const lines = [`**${newly.length} newly failing, ${fixed.length} fixed, ${still.length} still failing**, compared with ${baselineLabel(baseline)}.`, ''];
  if (newly.length > 0) {
    lines.push('**Newly failing** (passed last time, or not in that run)', '', ...table(newly), '');
  }
  if (fixed.length > 0) {
    lines.push('**Fixed since the last run**', '', ...fixed.map((test) => `- ${cell(test.name)}`), '');
  }
  if (still.length > 0) {
    lines.push(`<details><summary>Still failing (${still.length})</summary>`, '', ...table(still), '', '</details>', '');
  }
  return lines;
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
  const baselineFile = process.env.CI_BASELINE_FILE && path.resolve(projectRoot, process.env.CI_BASELINE_FILE);
  const baseline = readBaseline(baselineFile);
  if (baseline) {
    lines.push(...failureLines(failed, tests, baseline));
  } else if (baselineFile) {
    lines.push('No earlier results to compare with, so every failure is listed together.', '');
  }
  if (failed.length > 0 && !baseline) {
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
  if (baselineFile && process.env.CI_BASELINE_UPDATE === 'true') updateBaseline(baselineFile, tests, baseline);
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
