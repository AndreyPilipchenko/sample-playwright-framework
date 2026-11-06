import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';
import { copyScript, runScript, tempFolder, writeFile } from './helpers.mjs';

/** Fixture documents in the formats the script reads, so editing the real docs can't fail these tests. */
const KNOWN_DEFECTS = `
| ID | Area | Title |
|---|---|---|
| 71 | Users | Fake defect about \`users\` |
| 55 | Cart | Fake first in a range |
| 56 | Cart | Fake middle of a range |
| 57 | Cart | Fake last in a range |
| L1 | Local | Fake local finding |
`;
const TEST_CASES = `
| ID | Title | Pri | Defect | AC |
|---|---|---|---|---|
| TC-A-1 | Listed | P1 | 71 | |
| TC-A-2 | Local | P1 | L1 | |
| TC-A-3 | Range | P1 | 55–57 | |
| TC-A-4 | Overridden | P1 | 71 | |
| TC-A-5 | Reported | P1 | — | |
| TC-A-6 | Only seen | P1 | — | |
| TC-A-7 | Note about a defect | P1 | — | |
| TC-A-8 | Parent of a split case | P1 | 71 | |

## Reasons recorded per test

| Case | Recorded reason |
|---|---|
| TC-A-4 | Fake note that replaces the defect |
| TC-A-7 | Fails on defect 99 for now |
| TC-A-9 | Fake <b>note</b> with markup |

## Later section

| TC-A-10 | Fake note outside the section |
`;
const BUG_REPORTS = `
| Report | Register entry | Case | Status |
|---|---|---|---|
| [Fake report](fake-report.md) | new | TC-A-5 | Open |
| [Fake sighting](fake-sighting.md) | new | seen in TC-A-6 | Open |
`;
const SPEC_FILE = 'api/x/Fake.spec.ts';
const CASE_IDS = ['TC-A-1', 'TC-A-2', 'TC-A-3', 'TC-A-4', 'TC-A-5', 'TC-A-6', 'TC-A-7', 'TC-A-8a', 'TC-A-9', 'TC-A-10', 'TC-A-11'];
/** Each test takes three lines; one test declares no case ID, and must not take the next test's. */
const SPEC_SOURCE = `${[...CASE_IDS.map((id) => `test('${id}', async () => {\n  await allure.testCaseId('${id}');\n});`), "test('no id', async () => {\n});"].join('\n')}\ntest('after', async () => {\n  await allure.testCaseId('TC-A-1');\n});\n`;
const lineOf = (id) => (CASE_IDS.indexOf(id) * 3) + 1;
const NO_ID_LINE = (CASE_IDS.length * 3) + 1;

const spec = (title, status, { project = 'api', line = 1, file = 'api/x/A.spec.ts' } = {}) => ({
  title, file, line, tests: [{ projectName: project, status }],
});
const fileSuite = (specs, suites = []) => ({ title: 'A.spec.ts', specs, suites });
const describe = (title, specs) => ({ title, specs, suites: [] });
const results = (...suites) => JSON.stringify({ stats: { startTime: '2026-11-07T00:00:00.000Z' }, suites });

/** Builds the page from `{ job: results }` in a project of its own, and returns its HTML and text. */
function build(t, jobs, { reports = [] } = {}) {
  const root = tempFolder(t);
  const script = copyScript(root, 'quality-dashboard.mjs');
  writeFile(root, 'docs/known-defects.md', KNOWN_DEFECTS);
  writeFile(root, 'docs/test-cases.md', TEST_CASES);
  writeFile(root, 'docs/bug-reports/README.md', BUG_REPORTS);
  writeFile(root, `tests/${SPEC_FILE}`, SPEC_SOURCE);
  const inputs = Object.entries(jobs).map(([job, content], index) => `${job}=${content === undefined ? path.join(root, 'absent.json') : writeFile(root, `input-${index}.json`, content)}`);
  for (const report of reports) writeFile(root, `site/${report}/index.html`, '<html></html>');
  const out = path.join(root, 'site/index.html');
  const { status, output } = runScript(script, ['--out', out, ...inputs]);
  assert.equal(status, 0, output);
  const html = readFileSync(out, 'utf8');
  const withoutStyle = html.replace(/<style.*?<\/style>/s, '');
  return { html, text: withoutStyle.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') };
}

/** The page for one failing test that declares this case ID. */
const failing = (t, id) => build(t, { one: results(fileSuite([spec('Fake test', 'unexpected', { file: SPEC_FILE, line: lineOf(id) })])) });
const reasonCounts = (text) => text.match(/(\d+) on a defect.*?(\d+) on a problem found.*?(\d+) with no recorded/).slice(1).map(Number);
const tileCounts = (text) => text.match(/(\d+) tests? (\d+) passed.*? (\d+) failed/).slice(1).map(Number);
const jobRow = (html, job) => [...html.match(new RegExp(`<tr><td>${job}</td>(.*?)</tr>`))[1].matchAll(/class="num">(\d+)/g)].map((match) => Number(match[1]));

test('the same title in two describe blocks is two tests', (t) => {
  const { text } = build(t, { one: results(fileSuite([], [
    describe('Signed in', [spec('Opens the page', 'expected')]),
    describe('Signed out', [spec('Opens the page', 'unexpected', { line: 9 })]),
  ])) });
  assert.deepEqual(tileCounts(text), [2, 1, 1]);
});

test('a test in several jobs counts once, and as failed if it failed in any', (t) => {
  const { text } = build(t, {
    one: results(fileSuite([spec('Shared', 'expected', { project: 'chromium' })])),
    two: results(fileSuite([spec('Shared', 'unexpected', { project: 'firefox' })])),
  });
  assert.deepEqual(tileCounts(text), [1, 0, 1]);
  assert.match(text, /The jobs add up to 2, not 1/);
});

test('flaky counts apart from failed, and skipped gets its own tile', (t) => {
  const { text } = build(t, { one: results(fileSuite([
    spec('Flaky', 'flaky'), spec('Skipped', 'skipped'), spec('Passed', 'expected'), spec('Failed', 'unexpected'),
  ])) });
  assert.deepEqual(tileCounts(text), [4, 1, 1]);
  assert.match(text, /passed, and 1 flaky/);
  assert.match(text, /1 skipped/);
});

test('each job row counts that job on its own, each number in its own column', (t) => {
  const { html } = build(t, { one: results(fileSuite([
    spec('E1', 'expected'), spec('E2', 'expected'), spec('E3', 'expected'), spec('E4', 'expected'),
    spec('U1', 'unexpected'), spec('U2', 'unexpected'), spec('U3', 'unexpected'),
    spec('F1', 'flaky'), spec('F2', 'flaky'),
    spec('S1', 'skipped'),
  ])) });
  assert.deepEqual(jobRow(html, 'one'), [10, 4, 3, 2, 1]);
  assert.match(html, /<th class="num">Tests<\/th><th class="num">Passed<\/th><th class="num">Failed<\/th><th class="num">Flaky<\/th><th class="num">Skipped<\/th>/);
});

test('one job needs no explanation of the totals', (t) => {
  const { text } = build(t, { one: results(fileSuite([spec('Passed', 'expected')])) });
  assert.doesNotMatch(text, /add up/);
});

test('areas add up under their layer, in both sections', (t) => {
  const { text } = build(t, { one: results(fileSuite([
    spec('A', 'unexpected', { file: 'api/security/A.spec.ts' }),
    spec('B', 'unexpected', { file: 'api/security/B.spec.ts' }),
    spec('C', 'unexpected', { file: 'api/accounts/C.spec.ts' }),
    spec('D', 'expected', { file: 'api/accounts/D.spec.ts' }),
    spec('E', 'unexpected', { project: 'chromium', file: 'ui/cart/E.spec.ts' }),
  ])) });
  assert.match(text, /API 1 passed, 3 failed/);
  assert.match(text, /UI 0 passed, 1 failed/);
  assert.match(text, /All failures: 4/);
  assert.match(text, /API: 3 failures security: 2 failures/);
  assert.match(text, /2 of the 3 API failures/);
});

test('a file outside ui and api counts as sign-in setup', (t) => {
  const { text } = build(t, { one: results(fileSuite([spec('Sign in', 'expected', { project: 'setup', file: '../setup/auth.setup.ts' })])) });
  assert.match(text, /Sign-in setup 1 passed, 0 failed/);
});

test('results written before suite titles were kept still work', (t) => {
  const { text } = build(t, { one: results({ specs: [spec('Old', 'expected')], suites: [] }) });
  assert.deepEqual(tileCounts(text), [1, 1, 0]);
});

test('a job with no results is named and has no row', (t) => {
  const { html, text } = build(t, { one: results(fileSuite([spec('Passed', 'expected')])), gone: undefined });
  assert.match(text, /No results from: gone/);
  assert.doesNotMatch(html, /<td>gone<\/td>/);
});

test('links a report only when it exists', (t) => {
  const { html } = build(t, {
    one: results(fileSuite([spec('A', 'expected')])),
    two: results(fileSuite([spec('B', 'expected')])),
  }, { reports: ['one'] });
  assert.match(html, /href="one\/index\.html"/);
  assert.doesNotMatch(html, /href="two\/index\.html"/);
});

test('a defect in the Defect column is a listed defect, with its title', (t) => {
  const { text } = failing(t, 'TC-A-1');
  assert.deepEqual(reasonCounts(text), [1, 0, 0]);
  assert.match(text, /TC-A-1 Defect 71: Fake defect about users/);
});

test('a local finding is found while automating, not a listed defect', (t) => {
  const { text } = failing(t, 'TC-A-2');
  assert.deepEqual(reasonCounts(text), [0, 1, 0]);
  assert.match(text, /Defect L1: Fake local finding/);
});

test('a range in the Defect column gives each defect', (t) => {
  const { text } = failing(t, 'TC-A-3');
  assert.match(text, /Defect 55: Fake first in a range/);
  assert.match(text, /Defect 56: Fake middle of a range/);
  assert.match(text, /Defect 57: Fake last in a range/);
});

test('a recorded note replaces the Defect column for that test', (t) => {
  const { text } = failing(t, 'TC-A-4');
  assert.match(text, /Fake note that replaces the defect/);
  assert.doesNotMatch(text, /Defect 71/);
  assert.deepEqual(reasonCounts(text), [0, 1, 0]);
});

test('a note naming a defect counts as a listed defect', (t) => {
  assert.deepEqual(reasonCounts(failing(t, 'TC-A-7').text), [1, 0, 0]);
});

test('a bug report is a reason, with its link', (t) => {
  const { html, text } = failing(t, 'TC-A-5');
  assert.deepEqual(reasonCounts(text), [0, 1, 0]);
  assert.match(html, /<a href="[^"]*\/blob\/main\/docs\/bug-reports\/fake-report\.md">Fake report<\/a>/);
});

test('a report only seen during a test is not its reason', (t) => {
  const { text } = failing(t, 'TC-A-6');
  assert.deepEqual(reasonCounts(text), [0, 0, 1]);
  assert.doesNotMatch(text, /Fake sighting/);
});

test('a split case does not inherit the reason of its parent', (t) => {
  assert.deepEqual(reasonCounts(failing(t, 'TC-A-8a').text), [0, 0, 1]);
});

test('a note outside its section is not read', (t) => {
  assert.deepEqual(reasonCounts(failing(t, 'TC-A-10').text), [0, 0, 1]);
});

test('a failure with no entry in the docs says so', (t) => {
  const { text } = failing(t, 'TC-A-11');
  assert.deepEqual(reasonCounts(text), [0, 0, 1]);
  assert.match(text, /No recorded reason/);
});

test('a test with no case ID does not take the next test\'s', (t) => {
  const { text } = build(t, { one: results(fileSuite([spec('No ID', 'unexpected', { file: SPEC_FILE, line: NO_ID_LINE })])) });
  assert.deepEqual(reasonCounts(text), [0, 0, 1]);
});

test('titles, job names and notes cannot add markup to the page', (t) => {
  const title = build(t, { one: results(fileSuite([spec('<img src=x onerror=alert(1)>', 'unexpected')])) });
  assert.doesNotMatch(title.html, /<img/);
  const job = build(t, { '<img src>': results(fileSuite([spec('Passed', 'expected')])) });
  assert.doesNotMatch(job.html, /<img/);
  const note = failing(t, 'TC-A-9');
  assert.doesNotMatch(note.html, /<b>note/);
  assert.match(note.text, /note/);
});

test('the page asks search engines to stay away and cannot run scripts', (t) => {
  const { html } = build(t, { one: results(fileSuite([spec('Passed', 'expected')])) });
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"/);
  assert.doesNotMatch(html, /<script/);
});

test('no results at all is an error rather than an empty page', (t) => {
  const root = tempFolder(t);
  const { status, output } = runScript('quality-dashboard.mjs', ['--out', path.join(root, 'index.html'), `one=${path.join(root, 'absent.json')}`]);
  assert.notEqual(status, 0);
  assert.match(output, /nothing to show/);
});
