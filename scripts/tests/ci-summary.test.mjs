import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';
import { runScript, tempFolder, writeFile } from './helpers.mjs';

const result = (message) => ({ error: { message } });
const run = (title, status, { results = [], annotations = [] } = {}) => ({
  title, file: 'api/x/A.spec.ts', line: 1, tests: [{ projectName: 'api', status, results, annotations }],
});
function report(...specs) {
  const stats = { expected: 0, unexpected: 0, flaky: 0, skipped: 0, duration: 65_000 };
  for (const spec of specs) stats[spec.tests[0].status] += 1;
  return JSON.stringify({ stats, suites: [{ title: 'A.spec.ts', specs, suites: [] }] });
}

/** Summarizes one report, with a baseline file shared across the runs of one test. */
function summarize(t, root, content, env = {}) {
  const file = writeFile(root, 'report.json', content);
  const { status, stdout } = runScript('ci-summary.mjs', ['Fake job', file], env);
  assert.equal(status, 0);
  return stdout;
}

test('shows the counts of the run', (t) => {
  const summary = summarize(t, tempFolder(t), report(
    run('E1', 'expected'), run('E2', 'expected'), run('E3', 'expected'), run('E4', 'expected'),
    run('U1', 'unexpected'), run('U2', 'unexpected'), run('U3', 'unexpected'),
    run('F1', 'flaky'), run('F2', 'flaky'),
    run('S1', 'skipped'),
  ));
  assert.match(summary, /### ❌ Fake job/);
  assert.match(summary, /\| 4 \| 3 \| 2 \| 1 \| 1m 5s \|/);
});

test('a clean run gets a green heading', (t) => {
  assert.match(summarize(t, tempFolder(t), report(run('E', 'expected'))), /### ✅ Fake job/);
});

test('without a baseline every failure is listed together', (t) => {
  const root = tempFolder(t);
  const summary = summarize(t, root, report(run('U', 'unexpected', { results: [result('Fake error')] })), { CI_BASELINE_FILE: path.join(root, 'absent.json') });
  assert.match(summary, /No earlier results to compare with/);
  assert.match(summary, /\*\*Failed\*\*/);
  assert.match(summary, /Fake error/);
});

test('sorts failures into newly failing, fixed and still failing', (t) => {
  const root = tempFolder(t);
  const env = { CI_BASELINE_FILE: path.join(root, 'baseline.json'), CI_BASELINE_UPDATE: 'true' };
  summarize(t, root, report(run('Stays red', 'unexpected'), run('Turns green', 'unexpected'), run('Turns red', 'expected')), env);
  const summary = summarize(t, root, report(run('Stays red', 'unexpected'), run('Turns green', 'expected'), run('Turns red', 'unexpected'), run('Brand new', 'unexpected')), env);

  assert.match(summary, /\*\*2 newly failing, 1 fixed, 1 still failing\*\*/);
  const [, newly] = summary.match(/\*\*Newly failing\*\*(.*?)\*\*Fixed/s);
  assert.match(newly, /Turns red/);
  assert.match(newly, /Brand new/);
  assert.doesNotMatch(newly, /Stays red/);
  const [, fixed] = summary.match(/\*\*Fixed since the last run\*\*(.*?)<details>/s);
  assert.match(fixed, /Turns green/);
  assert.match(summary.slice(summary.indexOf('<details>')), /Still failing \(1\).*Stays red/s);
});

test('a test that did not run keeps its earlier outcome, so a stopped run hides nothing', (t) => {
  const root = tempFolder(t);
  const env = { CI_BASELINE_FILE: path.join(root, 'baseline.json'), CI_BASELINE_UPDATE: 'true' };
  summarize(t, root, report(run('Red', 'unexpected'), run('Other', 'expected')), env);
  summarize(t, root, report(run('Red', 'skipped'), run('Other', 'expected')), env);
  assert.match(summarize(t, root, report(run('Red', 'unexpected'), run('Other', 'expected')), env), /0 newly failing, 0 fixed, 1 still failing/);
});

test('a filtered run compares but does not replace the baseline', (t) => {
  const root = tempFolder(t);
  const baseline = path.join(root, 'baseline.json');
  summarize(t, root, report(run('Red', 'unexpected')), { CI_BASELINE_FILE: baseline, CI_BASELINE_UPDATE: 'true' });
  const saved = readFileSync(baseline, 'utf8');
  summarize(t, root, report(run('Red', 'expected')), { CI_BASELINE_FILE: baseline, CI_BASELINE_UPDATE: 'false' });
  assert.equal(readFileSync(baseline, 'utf8'), saved);
});

test('a run with nothing but skipped tests saves no baseline', (t) => {
  const root = tempFolder(t);
  const baseline = path.join(root, 'baseline.json');
  summarize(t, root, report(run('S', 'skipped')), { CI_BASELINE_FILE: baseline, CI_BASELINE_UPDATE: 'true' });
  assert.equal(existsSync(baseline), false);
});

test('the baseline holds names and outcomes, never error text', (t) => {
  const root = tempFolder(t);
  const baseline = path.join(root, 'baseline.json');
  const output = path.join(root, 'output.txt');
  summarize(t, root, report(run('Red', 'unexpected', { results: [result('Fake error text')] })), { CI_BASELINE_FILE: baseline, CI_BASELINE_UPDATE: 'true', GITHUB_OUTPUT: output });
  assert.doesNotMatch(readFileSync(baseline, 'utf8'), /Fake error text/);
  assert.match(readFileSync(output, 'utf8'), /baseline-updated=true/);
});

test('a re-run says it compares with its own first attempt', (t) => {
  const root = tempFolder(t);
  const env = { CI_BASELINE_FILE: path.join(root, 'baseline.json'), CI_BASELINE_UPDATE: 'true', GITHUB_RUN_ID: '123' };
  summarize(t, root, report(run('Red', 'unexpected')), env);
  assert.match(summarize(t, root, report(run('Red', 'unexpected')), env), /an earlier attempt of this run/);
});

test('an unreadable baseline is treated as no baseline', (t) => {
  const root = tempFolder(t);
  const baseline = writeFile(root, 'baseline.json', 'not json');
  assert.match(summarize(t, root, report(run('E', 'expected')), { CI_BASELINE_FILE: baseline }), /No earlier results/);
});

test('errors keep the assertion and drop the call log, colours and table breaks', (t) => {
  const colour = String.fromCharCode(27);
  const message = `Expected ${colour}[31m1${colour}[39m | got 2\nCall log:\n  fake call log`;
  const summary = summarize(t, tempFolder(t), report(run('Red | test', 'unexpected', { results: [result(message)] })));
  assert.match(summary, /Expected 1 \\\| got 2/);
  assert.match(summary, /Red \\\| test/);
  assert.doesNotMatch(summary, /fake call log/);
  assert.equal(summary.includes(colour), false);
});

test('the error shown is that of the latest attempt', (t) => {
  const summary = summarize(t, tempFolder(t), report(run('Red', 'unexpected', { results: [result('First attempt'), result('Second attempt')] })));
  assert.match(summary, /Second attempt/);
  assert.doesNotMatch(summary, /First attempt/);
});

test('flaky tests and the reasons for skipped tests are listed', (t) => {
  const summary = summarize(t, tempFolder(t), report(
    run('Flaky one', 'flaky', { results: [result('Fake first error'), {}] }),
    run('Skipped one', 'skipped', { annotations: [{ type: 'skip', description: 'Fake skip reason' }] }),
    run('Never started', 'skipped'),
  ));
  assert.match(summary, /### ⚠️ Fake job/);
  assert.match(summary, /Flaky one.*Fake first error/);
  assert.match(summary, /Skipped one.*Fake skip reason/);
  assert.match(summary, /Never started.*Did not run/);
});

test('a missing or unreadable report is reported, and never fails the job', (t) => {
  const root = tempFolder(t);
  const missing = runScript('ci-summary.mjs', ['Fake job', path.join(root, 'absent.json')]);
  assert.equal(missing.status, 0);
  assert.match(missing.stdout, /No JSON report/);
  const unreadable = runScript('ci-summary.mjs', ['Fake job', writeFile(root, 'bad.json', 'not json')]);
  assert.equal(unreadable.status, 0);
  assert.match(unreadable.stdout, /Could not read the JSON report/);
});

test('writes to the job summary when GitHub provides one', (t) => {
  const root = tempFolder(t);
  const summaryFile = path.join(root, 'summary.md');
  const { stdout } = runScript('ci-summary.mjs', ['Fake job', writeFile(root, 'report.json', report(run('E', 'expected')))], { GITHUB_STEP_SUMMARY: summaryFile });
  assert.equal(stdout, '');
  assert.match(readFileSync(summaryFile, 'utf8'), /Fake job/);
});
