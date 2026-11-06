#!/usr/bin/env node
/**
 * Writes one self-contained HTML page that combines the Playwright JSON reports of a run: how many
 * tests passed and failed, by job and by area, and the recorded reason for each failure.
 *
 *   node scripts/quality-dashboard.mjs [--out <file>] <report-name>=<test-results.json> ...
 *
 * Example, after a local run:
 *   node scripts/quality-dashboard.mjs local=reports/json-report/test-results.json
 *
 * Reasons come from the docs, read after the tests have finished; tests never read these docs:
 *   - the "Reasons recorded per test" table in docs/test-cases.md, which replaces the Defect column
 *     for that test, because that column lists what a case relates to, not why it fails today
 *   - the Defect column of docs/test-cases.md, with titles from docs/known-defects.md
 *   - the Case column of docs/bug-reports/README.md
 * IDs match exactly: TC-CBA-4a does not inherit a reason recorded for TC-CBA-4 or TC-CBA-4b.
 * So a reason says what the docs record for that test. It does not prove why this run's attempt
 * failed, and the page says so. A failure with no entry is listed as having no recorded reason.
 *
 * A test that runs in several jobs or browsers counts once in the totals, and as failed if it failed
 * in any. The table of jobs counts each job separately, so it matches that job's GitHub Summary.
 * The page holds titles and counts only, never error text, attachments or environment values, and
 * has no scripts. Links to a report appear when `<out folder>/<report-name>/index.html` exists.
 * Ops tooling like scripts/ci-summary.mjs, outside the POM layer map.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const DEFECT_REASON = 'defect';
const FOUND_REASON = 'found';
const NO_REASON = 'none';

const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repository, GITHUB_RUN_ID: runId, GITHUB_SHA: commit } = process.env;
const repositoryUrl = `${server ?? 'https://github.com'}/${repository ?? 'AndreyPilipchenko/sample-playwright-framework'}`;

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;
const readProjectFile = (file) => readFileSync(path.join(projectRoot, file), 'utf8');

/** The cells of each row of a Markdown table, for rows whose first cell passes `isRow`. */
function tableRows(markdown, isRow) {
  return markdown.split(/\r?\n/)
    .filter((line) => line.startsWith('|'))
    .map((line) => line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()))
    .filter((cells) => isRow(cells[0]));
}

/** The defect IDs in a Defect cell: `2, 27`, `L1` or a range such as `55–59`. */
function defectIds(cell) {
  const expanded = cell.replace(/(\d+)[–-](\d+)/g, (_, from, to) => Array.from({ length: Number(to) - Number(from) + 1 }, (__, step) => Number(from) + step).join(' '));
  return expanded.match(/\bL?\d+\b/g) ?? [];
}

/** Everything the docs record about failures, by case or test ID. */
function readRecordedReasons() {
  const cases = readProjectFile('docs/test-cases.md');
  const defects = new Map(tableRows(readProjectFile('docs/known-defects.md'), (id) => /^L?\d+$/.test(id))
    .map(([id, , title]) => [id, title]));
  const caseRows = new Map(tableRows(cases, (id) => /^TC-[A-Z0-9]+-\d+$/.test(id))
    .filter((cells) => cells.length >= 4) // the reasons table below has two columns
    .map(([id, title, , defect]) => [id, { title, defects: defectIds(defect) }]));

  const reports = new Map();
  for (const [link, , caseCell] of tableRows(readProjectFile('docs/bug-reports/README.md'), (cell) => cell.startsWith('['))) {
    if (caseCell.startsWith('seen in')) continue; // noticed during that test, not why it fails
    const [, title, file] = link.match(/^\[(.+)\]\((.+)\)$/) ?? [];
    for (const id of caseCell.match(/TC-[A-Z0-9]+-\d+[a-z]?|[a-z-]+-api-\d+/g) ?? []) {
      reports.set(id, [...(reports.get(id) ?? []), { title, file }]);
    }
  }

  const section = cases.slice(cases.indexOf('## Reasons recorded per test'));
  const notes = new Map(tableRows(section.slice(0, section.indexOf('\n## ', 1)), (id) => /^(TC-[A-Z0-9]+-\d+[a-z]?|[a-z-]+-api-\d+)$/.test(id))
    .map(([id, reason]) => [id, reason]));
  return { defects, caseRows, reports, notes };
}

/** The case IDs a test declares, read from its source because the JSON report does not carry them. */
function caseIdsOf(spec) {
  const file = path.join(projectRoot, 'tests', spec.file);
  if (!existsSync(file)) return [];
  const body = [];
  for (const [index, line] of readFileSync(file, 'utf8').split(/\r?\n/).slice(spec.line - 1).entries()) {
    if (index > 0 && /^\s*test\(/.test(line)) break;
    body.push(line);
  }
  return [...body.join('\n').matchAll(/testCaseId\('([^']+)'\)/g)].map((match) => match[1]);
}

/** One entry per test, with its worst outcome across the given reports. */
function collectTests(reports) {
  const tests = new Map();
  const add = (spec, titles) => {
    const key = [spec.file, ...titles, spec.title].join('\u0000');
    const test = tests.get(key) ?? { spec, statuses: new Set(), failedIn: new Set() };
    for (const run of spec.tests) {
      test.statuses.add(run.status);
      if (run.status === 'unexpected') test.failedIn.add(run.projectName);
    }
    tests.set(key, test);
  };
  const walk = (suite, titles) => {
    for (const spec of suite.specs ?? []) add(spec, titles);
    for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
  };
  for (const report of reports) for (const suite of report.suites ?? []) walk(suite, []);
  return [...tests.values()];
}

/** One job's own counts, by Playwright status, the way its GitHub Summary counts them. */
function jobCounts(report) {
  const counts = { total: 0, expected: 0, unexpected: 0, flaky: 0, skipped: 0 };
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const { status } of spec.tests) {
        counts.total += 1;
        counts[status] += 1;
      }
    }
    (suite.suites ?? []).forEach(walk);
  };
  (report.suites ?? []).forEach(walk);
  return counts;
}

function jobTable(jobs, testCount, outFolder) {
  const rows = jobs.map(({ name, counts }) => {
    const hasReport = existsSync(path.join(outFolder, name, 'index.html'));
    return `<tr><td>${escapeHtml(name)}</td><td class="num">${counts.total}</td><td class="num">${counts.expected}</td><td class="num">${counts.unexpected}</td>`
      + `<td class="num">${counts.flaky}</td><td class="num">${counts.skipped}</td>`
      + `<td>${hasReport ? `<a href="${encodeURI(name)}/index.html">Allure report</a>` : '-'}</td></tr>`;
  });
  const entries = jobs.reduce((sum, job) => sum + job.counts.total, 0);
  const why = entries === testCount ? '' : ` The jobs add up to ${entries}, not ${testCount}, because some tests, such as smoke tests and sign-in setup, run in more than one job; the totals above count each test once.`;
  return `<div class="scroll"><table><thead><tr><th>Job</th><th class="num">Tests</th><th class="num">Passed</th><th class="num">Failed</th><th class="num">Flaky</th><th class="num">Skipped</th><th>Details</th></tr></thead>`
    + `<tbody>${rows.join('')}</tbody></table></div>`
    + `<p class="muted">Each row matches that job's Summary on GitHub and its Allure report.${why} The Allure reports hold each test's steps and screenshots. They are large, so they can take a moment to open.</p>`;
}

function outcomeOf(test) {
  if (test.statuses.has('unexpected')) return 'failed';
  if (test.statuses.has('flaky')) return 'flaky';
  return test.statuses.has('expected') ? 'passed' : 'skipped';
}

/** `api/security/X.spec.ts` becomes `API: security`; a file outside tests/ keeps its folder's name. */
function areaOf(file) {
  const [layer, category] = file.split('/');
  if (layer === 'ui' || layer === 'api') return `${layer === 'ui' ? 'UI' : 'API'}: ${category}`;
  return 'Sign-in setup';
}

/** The part of an area's name before the colon: `API: security` belongs to `API`. */
const layerOf = (areaName) => areaName.split(':')[0];

/** The areas under their layer, each layer with its totals, the most failures first. */
function groupByLayer(areas) {
  const layers = new Map();
  for (const area of areas) {
    const name = layerOf(area.name);
    const layer = layers.get(name) ?? { name, passed: 0, failed: 0, areas: [] };
    layer.passed += area.passed;
    layer.failed += area.failed;
    layer.areas.push(area);
    layers.set(name, layer);
  }
  return [...layers.values()].sort((a, b) => b.failed - a.failed || a.name.localeCompare(b.name));
}

/** What the docs record for one failing test. */
function reasonsFor(test, recorded) {
  const ids = caseIdsOf(test.spec);
  const defects = ids.flatMap((id) => (recorded.notes.has(id) ? [] : recorded.caseRows.get(id)?.defects ?? []));
  const reports = ids.flatMap((id) => recorded.reports.get(id) ?? []);
  const notes = ids.flatMap((id) => recorded.notes.get(id) ?? []);
  const onListedDefect = defects.some((id) => !id.startsWith('L')) || notes.some((note) => /\bdefect \d+/i.test(note));
  const kind = onListedDefect ? DEFECT_REASON : defects.length || reports.length || notes.length ? FOUND_REASON : NO_REASON;
  return {
    kind,
    ids,
    defects: [...new Set(defects)].map((id) => ({ id, title: (recorded.defects.get(id) ?? '').replaceAll('`', '') })),
    reports,
    notes,
  };
}

function reasonCell(reason) {
  const parts = [
    ...reason.defects.map(({ id, title }) => `Defect ${escapeHtml(id)}${title ? `: ${escapeHtml(title)}` : ''}`),
    ...reason.reports.map(({ title, file }) => `<a href="${repositoryUrl}/blob/main/docs/bug-reports/${encodeURI(file)}">${escapeHtml(title.replaceAll('`', ''))}</a>`),
    ...reason.notes.map(escapeHtml),
  ];
  return parts.length ? parts.join('<br>') : '<strong>No recorded reason</strong>';
}

function failureTable(tests) {
  const rows = tests.map(({ test, reason }) => `<tr><td>${escapeHtml(test.spec.title)}</td>`
    + `<td class="id">${escapeHtml(reason.ids.join(', ') || '-')}</td><td>${reasonCell(reason)}</td></tr>`);
  return `<table><thead><tr><th>Test</th><th>Case</th><th>Recorded reason</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function areaChart(layers) {
  const areas = layers.flatMap((layer) => layer.areas);
  const widest = Math.max(...areas.map((area) => area.passed + area.failed));
  const areaRow = (area) => {
    const label = `${area.passed} passed, ${area.failed} failed`;
    const segment = (kind, count) => (count ? `<span class="bar ${kind}" style="width:${(count / widest) * 100}%" title="${escapeHtml(area.name)}: ${count} ${kind}"></span>` : '');
    const shortName = area.name.split(': ').pop();
    return `<div class="row" role="row"><span class="name" role="cell">${escapeHtml(shortName)}</span>`
      + `<span class="track" role="img" aria-label="${escapeHtml(label)}">${segment('passed', area.passed)}${segment('failed', area.failed)}</span>`
      + `<span class="counts" role="cell">${label}</span></div>`;
  };
  const rows = layers.flatMap((layer) => {
    const heading = `<div class="layer" role="row"><span role="cell">${escapeHtml(layer.name)}</span><span role="cell">${layer.passed} passed, ${layer.failed} failed</span></div>`;
    const isOwnArea = layer.areas.length === 1 && layer.areas[0].name === layer.name;
    return isOwnArea ? [heading] : [heading, ...layer.areas.map(areaRow)];
  });
  return `<div class="legend"><span><i class="key passed"></i>Passed</span><span><i class="key failed"></i>Failed</span></div><div role="table" aria-label="Tests by area">${rows.join('')}</div>`;
}

function page({ tests, inputs, outFolder }) {
  const recorded = readRecordedReasons();
  const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
  const areas = new Map();
  const failures = [];
  for (const test of tests) {
    const outcome = outcomeOf(test);
    counts[outcome] += 1;
    const name = areaOf(test.spec.file);
    const area = areas.get(name) ?? { name, passed: 0, failed: 0 };
    if (outcome === 'failed') {
      area.failed += 1;
      failures.push({ test, name, reason: reasonsFor(test, recorded) });
    } else if (outcome !== 'skipped') {
      area.passed += 1;
    }
    areas.set(name, area);
  }
  const byKind = (kind) => failures.filter((failure) => failure.reason.kind === kind);
  const security = failures.filter((failure) => failure.name === 'API: security');
  const unexplained = byKind(NO_REASON);
  const sortedAreas = [...areas.values()].sort((a, b) => b.failed - a.failed || a.name.localeCompare(b.name));
  const layers = groupByLayer(sortedAreas);
  const apiFailures = failures.filter((failure) => layerOf(failure.name) === 'API').length;
  const jobs = inputs.filter((input) => input.report).map((input) => ({ name: input.name, counts: jobCounts(input.report) }));

  const started = inputs.map((input) => input.report?.stats?.startTime).filter(Boolean).sort()[0];
  const missing = inputs.filter((input) => !input.report).map((input) => input.name);
  const source = [
    started ? `Run started ${escapeHtml(started.slice(0, 16).replace('T', ' '))} UTC` : '',
    runId ? `<a href="${repositoryUrl}/actions/runs/${escapeHtml(runId)}">workflow run</a>` : '',
    commit ? `commit <a href="${repositoryUrl}/commit/${escapeHtml(commit)}">${escapeHtml(commit.slice(0, 7))}</a>` : '',
  ].filter(Boolean).join(' · ');

  const areaSections = layers.filter((layer) => layer.failed).map((layer) => {
    const sections = layer.areas.filter((area) => area.failed).map((area) => {
      const inArea = failures.filter((failure) => failure.name === area.name);
      return `<details><summary>${escapeHtml(area.name.split(': ').pop())}: ${plural(inArea.length, 'failure')}</summary>${failureTable(inArea)}</details>`;
    });
    return `<h3>${escapeHtml(layer.name)}: ${plural(layer.failed, 'failure')}</h3>${sections.join('\n')}`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Test results: sample-playwright-framework</title>
<style>
  :root { color-scheme: light dark; --surface: #fcfcfb; --tile: #f0efec; --primary: #0b0b0b; --secondary: #52514e; --rule: #e0dfd8; --link: #256abf; --passed: #2a78d6; --failed: #eb6834; }
  @media (prefers-color-scheme: dark) { :root { --surface: #1a1a19; --tile: #2a2a28; --primary: #f0efec; --secondary: #c3c2b7; --rule: #383835; --link: #86b6ef; --passed: #3987e5; --failed: #d95926; } }
  * { box-sizing: border-box; }
  body { margin: 0 auto; max-width: 62rem; padding: 2rem 1.25rem 4rem; background: var(--surface); color: var(--primary); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
  h2 { font-size: 1.15rem; margin: 2.25rem 0 .5rem; }
  p { margin: .5rem 0; }
  a { color: var(--link); }
  .muted { color: var(--secondary); font-size: .9rem; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr)); gap: .75rem; margin: 1.25rem 0; }
  .tile { background: var(--tile); border-radius: 8px; padding: .75rem 1rem; }
  .tile b { display: block; font-size: 1.9rem; line-height: 1.2; font-variant-numeric: tabular-nums; }
  .tile span { color: var(--secondary); font-size: .9rem; }
  .legend { display: flex; gap: 1.25rem; margin: .5rem 0; color: var(--secondary); font-size: .9rem; }
  .key { display: inline-block; width: .75rem; height: .75rem; border-radius: 3px; margin-right: .4rem; vertical-align: -1px; }
  .row { display: grid; grid-template-columns: 9.5rem 1fr 10.5rem; gap: .75rem; align-items: center; padding: .25rem 0; }
  .name, .counts { font-size: .9rem; }
  .counts { color: var(--secondary); font-variant-numeric: tabular-nums; }
  .track { display: flex; gap: 2px; height: .9rem; }
  .bar { display: block; min-width: 3px; }
  .bar:first-child { border-radius: 4px 0 0 4px; }
  .bar:last-child { border-radius: 0 4px 4px 0; }
  .bar:only-child { border-radius: 4px; }
  .passed { background: var(--passed); }
  .failed { background: var(--failed); }
  table { width: 100%; border-collapse: collapse; font-size: .9rem; margin: .5rem 0 1rem; }
  th, td { text-align: left; vertical-align: top; padding: .45rem .75rem .45rem 0; border-bottom: 1px solid var(--rule); }
  th { color: var(--secondary); font-weight: 600; }
  td.id { white-space: nowrap; color: var(--secondary); }
  .scroll { overflow-x: auto; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .layer { display: flex; justify-content: space-between; gap: .75rem; font-weight: 600; font-size: .95rem; margin-top: 1rem; padding-bottom: .25rem; border-bottom: 1px solid var(--rule); }
  details { border-bottom: 1px solid var(--rule); padding: .5rem 0; }
  summary { cursor: pointer; }
  @media (max-width: 40rem) { .row { grid-template-columns: 1fr; gap: .1rem; padding: .5rem 0; } td.id { white-space: normal; } }
</style>
</head>
<body>
<h1>Test results</h1>
<p class="muted">${source || 'Local run'}</p>
<p>These tests run against <a href="https://github.com/testsmith-io/practice-software-testing">Toolshop</a>, a demo shop with built-in bugs, so failures are expected. They stay visible to show how the framework reports them. <a href="${repositoryUrl}">About this project</a></p>
${missing.length ? `<p><strong>No results from: ${missing.map(escapeHtml).join(', ')}.</strong> The counts below leave those out.</p>` : ''}

<div class="tiles">
  <div class="tile"><b>${tests.length}</b><span>tests</span></div>
  <div class="tile"><b>${counts.passed}</b><span>passed${counts.flaky ? `, and ${counts.flaky} flaky` : ''}</span></div>
  <div class="tile"><b>${counts.failed}</b><span>failed</span></div>
  ${counts.skipped ? `<div class="tile"><b>${counts.skipped}</b><span>skipped</span></div>` : ''}
</div>

<h2>Results by job</h2>
${jobTable(jobs, tests.length, outFolder)}

<h2>Why they failed</h2>
<div class="tiles">
  <div class="tile"><b>${byKind(DEFECT_REASON).length}</b><span>on a defect in the shop's published list</span></div>
  <div class="tile"><b>${byKind(FOUND_REASON).length}</b><span>on a problem found while automating</span></div>
  <div class="tile"><b>${unexplained.length}</b><span>with no recorded reason</span></div>
</div>
<p class="muted">A reason is what the project's documents record for that test. It doesn't prove why this run failed.</p>
${unexplained.length ? `<h3>No recorded reason</h3>${failureTable(unexplained)}` : ''}

${security.length ? `<h2>API security failures</h2><p class="muted">${security.length} of the ${apiFailures} API failures. All ${apiFailures} are listed under API in All failures below.</p>${failureTable(security)}` : ''}

<h2>Tests by area</h2>
${areaChart(layers)}

${areaSections.length ? `<h2>All failures: ${failures.length}</h2>${areaSections.join('\n')}` : ''}
</body>
</html>
`;
}

function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const out = path.resolve(outIndex >= 0 ? args.splice(outIndex, 2)[1] : 'reports/quality-dashboard/index.html');
  const inputs = args.map((arg) => {
    const [name, file] = arg.split(/=(.*)/s);
    if (!file) throw new Error(`Expected <report-name>=<file>, got '${arg}'.`);
    return { name, report: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined };
  });
  if (!inputs.some((input) => input.report)) throw new Error('None of the given reports exist, so there is nothing to show.');

  const tests = collectTests(inputs.flatMap((input) => (input.report ? [input.report] : [])));
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, page({ tests, inputs, outFolder: path.dirname(out) }));
  console.log(`Wrote ${path.relative(process.cwd(), out)}: ${plural(tests.length, 'test')}.`);
}

main();
