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
 * A report name of the form `<environment>/<job>` (e.g. `local-fixed/api`) gives one section per
 * environment, each counted on its own, and, when the run covers both builds of the shop
 * (src/config/builds.ts), a comparison of the two: the tests the newer build fixes, the tests red on
 * both, and the tests red only on the newer build. A name without a slash gives a single section.
 *
 * Reasons come from the docs, read after the tests have finished; tests never read these docs.
 * On the build with the deliberate defects (and for a name without an environment):
 *   - the "Reasons recorded per test" table in docs/test-cases.md, which replaces the Defect column
 *     for that test, because that column lists what a case relates to, not why it fails today
 *   - the Defect column of docs/test-cases.md, with titles from docs/known-defects.md
 *   - the Case column of docs/bug-reports/README.md
 * On the fixed build: the table under "C. Still red on the fixed build" in docs/app-versions.md.
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

/** What each build is, in the page's words. */
const BUILD_LABELS = { withBugs: 'the build with the deliberate defects', fixed: 'the newer build without them' };

/** The build each environment runs, read from src/config/builds.ts. */
function readEnvironmentBuilds() {
  const file = path.join(projectRoot, 'src/config/builds.ts');
  if (!existsSync(file)) return new Map();
  return new Map([...readFileSync(file, 'utf8').matchAll(/^\s*'?([a-z][\w-]*)'?:\s*'(withBugs|fixed)'/gm)].map((match) => [match[1], match[2]]));
}

/** The case IDs of a table cell: `TC-CAT-3`, `TC-ADM-7, 8, 9` or `TC-NAV-3, TC-CAT-4`. */
function caseIdsInCell(cell) {
  const ids = [];
  let prefix = '';
  for (const part of cell.split(',').map((text) => text.trim())) {
    const full = part.match(/^(TC-[A-Z0-9]+-)\d+[a-z]?$/);
    if (full) {
      prefix = full[1];
      ids.push(part);
    } else if (prefix && /^\d+[a-z]?$/.test(part)) {
      ids.push(prefix + part);
    }
  }
  return ids;
}

/** The observations of docs/app-versions.md, "C. Still red on the fixed build", by case ID. */
function readFixedBuildReasons() {
  const file = path.join(projectRoot, 'docs/app-versions.md');
  if (!existsSync(file)) return new Map();
  const docs = readFileSync(file, 'utf8');
  const start = docs.indexOf('## C.');
  if (start < 0) return new Map();
  const end = docs.indexOf('\n## ', start + 1);
  const notes = new Map();
  for (const [cell, , observation] of tableRows(docs.slice(start, end < 0 ? undefined : end), (first) => first.startsWith('TC-'))) {
    const plain = observation.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replaceAll('`', '');
    for (const id of caseIdsInCell(cell)) notes.set(id, [...(notes.get(id) ?? []), plain]);
  }
  return notes;
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
    const test = tests.get(key) ?? { key, spec, statuses: new Set(), failedIn: new Set() };
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

/** One row per job; with environments (`<environment>/<job>`), the environment gets its own column. */
function jobTable(jobs, testCount, outFolder, withEnvironments) {
  const rows = jobs.map(({ name, environment, job, counts }) => {
    const hasReport = existsSync(path.join(outFolder, name, 'index.html'));
    const label = withEnvironments ? `<td>${escapeHtml(environment ?? '-')}</td><td>${escapeHtml(job)}</td>` : `<td>${escapeHtml(name)}</td>`;
    return `<tr>${label}<td class="num">${counts.total}</td><td class="num">${counts.expected}</td><td class="num">${counts.unexpected}</td>`
      + `<td class="num">${counts.flaky}</td><td class="num">${counts.skipped}</td>`
      + `<td>${hasReport ? `<a href="${encodeURI(name)}/index.html">Allure report</a>` : '-'}</td></tr>`;
  });
  const entries = jobs.reduce((sum, job) => sum + job.counts.total, 0);
  const why = withEnvironments
    ? ' Some tests, such as smoke tests and sign-in setup, run in more than one job; the totals of each version above count each test once.'
    : entries === testCount ? '' : ` The jobs add up to ${entries}, not ${testCount}, because some tests, such as smoke tests and sign-in setup, run in more than one job; the totals above count each test once.`;
  const heading = withEnvironments ? '<th>Environment</th><th>Job</th>' : '<th>Job</th>';
  return `<div class="scroll"><table><thead><tr>${heading}<th class="num">Tests</th><th class="num">Passed</th><th class="num">Failed</th><th class="num">Flaky</th><th class="num">Skipped</th><th>Details</th></tr></thead>`
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

/** The reason for a failure on the fixed build: what docs/app-versions.md records under C. */
function fixedReasonFor(test, fixedNotes) {
  const ids = caseIdsOf(test.spec);
  const notes = ids.flatMap((id) => fixedNotes.get(id) ?? []);
  return { kind: notes.length ? FOUND_REASON : NO_REASON, ids, defects: [], reports: [], notes };
}

/** Counts, areas and failures of one environment's tests, with each failure's recorded reason. */
function summarize(tests, reasonOf) {
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
      failures.push({ test, name, reason: reasonOf(test) });
    } else if (outcome !== 'skipped') {
      area.passed += 1;
    }
    areas.set(name, area);
  }
  const sortedAreas = [...areas.values()].sort((a, b) => b.failed - a.failed || a.name.localeCompare(b.name));
  return { tests, counts, failures, layers: groupByLayer(sortedAreas) };
}

function countTiles({ tests, counts }) {
  return `<div class="tiles">
  <div class="tile"><b>${tests.length}</b><span>tests</span></div>
  <div class="tile"><b>${counts.passed}</b><span>passed${counts.flaky ? `, and ${counts.flaky} flaky` : ''}</span></div>
  <div class="tile"><b>${counts.failed}</b><span>failed</span></div>
  ${counts.skipped ? `<div class="tile"><b>${counts.skipped}</b><span>skipped</span></div>` : ''}
</div>`;
}

/** Why one environment's tests failed, its areas and its failures, under headings of the given level. */
function detailSections({ failures, layers }, build, level) {
  const h = (text, offset = 0) => `<h${level + offset}>${text}</h${level + offset}>`;
  const byKind = (kind) => failures.filter((failure) => failure.reason.kind === kind);
  const unexplained = byKind(NO_REASON);
  const security = failures.filter((failure) => failure.name === 'API: security');
  const apiFailures = failures.filter((failure) => layerOf(failure.name) === 'API').length;
  const reasonTiles = build === 'fixed'
    ? `<div class="tile"><b>${byKind(FOUND_REASON).length}</b><span>with an observation recorded for this build</span></div>`
    : `<div class="tile"><b>${byKind(DEFECT_REASON).length}</b><span>on a defect in the shop's published list</span></div>
  <div class="tile"><b>${byKind(FOUND_REASON).length}</b><span>on a problem found while automating</span></div>`;
  const source = build === 'fixed'
    ? ` For this build the reasons come from <a href="${repositoryUrl}/blob/main/docs/app-versions.md">App versions</a>, "Still red on the fixed build".`
    : '';
  const areaSections = layers.filter((layer) => layer.failed).map((layer) => {
    const sections = layer.areas.filter((area) => area.failed).map((area) => {
      const inArea = failures.filter((failure) => failure.name === area.name);
      return `<details><summary>${escapeHtml(area.name.split(': ').pop())}: ${plural(inArea.length, 'failure')}</summary>${failureTable(inArea)}</details>`;
    });
    return `${h(`${escapeHtml(layer.name)}: ${plural(layer.failed, 'failure')}`, 1)}${sections.join('\n')}`;
  });

  return `${h('Why they failed')}
<div class="tiles">
  ${reasonTiles}
  <div class="tile"><b>${unexplained.length}</b><span>with no recorded reason</span></div>
</div>
<p class="muted">A reason is what the project's documents record for that test. It doesn't prove why this run failed.${source}</p>
${unexplained.length ? `${h('No recorded reason', 1)}${failureTable(unexplained)}` : ''}

${security.length ? `${h('API security failures')}<p class="muted">${security.length} of the ${apiFailures} API failures. All ${apiFailures} are listed under API in All failures below.</p>${failureTable(security)}` : ''}

${h('Tests by area')}
${areaChart(layers)}

${areaSections.length ? `${h(`All failures: ${failures.length}`)}${areaSections.join('\n')}` : ''}`;
}

/**
 * The tests that ran on both builds, by how their outcome changed from the build with the
 * deliberate defects to the newer one. Skipped tests and tests that ran on one build only are left out.
 */
function comparison(older, newer, reasons) {
  const counterparts = new Map(newer.tests.map((test) => [test.key, test]));
  const groups = { fixed: [], both: [], newerOnly: [] };
  let compared = 0;
  for (const test of older.tests) {
    const counterpart = counterparts.get(test.key);
    const before = outcomeOf(test);
    const after = counterpart && outcomeOf(counterpart);
    if (!after || before === 'skipped' || after === 'skipped') continue;
    compared += 1;
    if (before === 'failed' && after !== 'failed') groups.fixed.push({ test, reason: reasons.older(test) });
    else if (before === 'failed') groups.both.push({ test: counterpart, reason: reasons.newer(counterpart) });
    else if (after === 'failed') groups.newerOnly.push({ test: counterpart, reason: reasons.newer(counterpart) });
  }
  const unexplained = groups.newerOnly.filter(({ reason }) => reason.kind === NO_REASON).length;
  const group = (title, entries, note) => (entries.length
    ? `<details><summary>${title}: ${entries.length}</summary><p class="muted">${note}</p>${failureTable(entries)}</details>`
    : '');
  const olderName = escapeHtml(older.environment);
  const newerName = escapeHtml(newer.environment);
  return `<h2>${olderName} and ${newerName} compared</h2>
<p class="muted">The ${plural(compared, 'test')} that ran on both, by how the outcome changed from ${BUILD_LABELS.withBugs} to ${BUILD_LABELS.fixed}.</p>
<div class="tiles">
  <div class="tile"><b>${groups.fixed.length}</b><span>fixed in the newer build</span></div>
  <div class="tile"><b>${groups.both.length}</b><span>red on both builds</span></div>
  <div class="tile"><b>${groups.newerOnly.length}</b><span>red only on the newer build${unexplained ? `, <strong>${unexplained} with no recorded reason</strong>` : ''}</span></div>
</div>
${group('Fixed in the newer build', groups.fixed, `Failed on ${olderName}, passed on ${newerName}. The reason is the one recorded for the older build.`)}
${group('Red on both builds', groups.both, `The reason is the one recorded for ${newerName}.`)}
${group('Red only on the newer build', groups.newerOnly, `Passed on ${olderName}. One with no recorded reason may be a change of the newer build that the framework has not absorbed yet.`)}`;
}

function page({ inputs, outFolder }) {
  const builds = readEnvironmentBuilds();
  const multi = inputs.some((input) => input.environment);
  const environments = [...new Set(inputs.map((input) => input.environment))].map((environment) => {
    const reports = inputs.filter((input) => input.environment === environment && input.report).map((input) => input.report);
    return { environment, build: builds.get(environment), tests: collectTests(reports) };
  });

  const recorded = readRecordedReasons();
  const fixedNotes = environments.some((env) => env.build === 'fixed') ? readFixedBuildReasons() : new Map();
  const reasonOf = (build) => (build === 'fixed' ? (test) => fixedReasonFor(test, fixedNotes) : (test) => reasonsFor(test, recorded));
  for (const env of environments) Object.assign(env, summarize(env.tests, reasonOf(env.build)));

  const testCount = new Set(environments.flatMap((env) => env.tests.map((test) => test.key))).size;
  const jobs = inputs.filter((input) => input.report).map((input) => ({ ...input, counts: jobCounts(input.report) }));
  const started = inputs.map((input) => input.report?.stats?.startTime).filter(Boolean).sort()[0];
  const missing = inputs.filter((input) => !input.report).map((input) => input.name);
  const source = [
    started ? `Run started ${escapeHtml(started.slice(0, 16).replace('T', ' '))} UTC` : '',
    runId ? `<a href="${repositoryUrl}/actions/runs/${escapeHtml(runId)}">workflow run</a>` : '',
    commit ? `commit <a href="${repositoryUrl}/commit/${escapeHtml(commit)}">${escapeHtml(commit.slice(0, 7))}</a>` : '',
  ].filter(Boolean).join(' · ');
  const describe = (env) => `${escapeHtml(env.environment)}${env.build ? `: ${BUILD_LABELS[env.build]}` : ''}`;
  const older = environments.find((env) => env.build === 'withBugs' && env.tests.length);
  const newer = environments.find((env) => env.build === 'fixed' && env.tests.length);

  const body = multi
    ? `<p>A real product changes between releases. The newer build of the shop fixes the deliberate defects, but it also moves
routes, renames fields and changes its API; the framework absorbs those changes, so the same tests run on both
(<a href="${repositoryUrl}/blob/main/docs/app-versions.md">App versions</a>).</p>
<div class="versions">
${environments.map((env) => `<section><h2>${describe(env)}</h2>${countTiles(env)}</section>`).join('\n')}
</div>
${older && newer ? comparison(older, newer, { older: reasonOf(older.build), newer: reasonOf(newer.build) }) : ''}

<h2>Results by job</h2>
${jobTable(jobs, testCount, outFolder, multi)}

${environments.map((env) => `<section class="environment"><h2>On ${describe(env)}</h2>${detailSections(env, env.build, 3)}</section>`).join('\n')}`
    : `${countTiles(environments[0])}

<h2>Results by job</h2>
${jobTable(jobs, testCount, outFolder, multi)}

${detailSections(environments[0], undefined, 2)}`;

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
  h3 { font-size: 1rem; margin: 1.75rem 0 .5rem; }
  p { margin: .5rem 0; }
  a { color: var(--link); }
  .muted { color: var(--secondary); font-size: .9rem; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(10.5rem, 1fr)); gap: .75rem; margin: 1.25rem 0; }
  .tile { background: var(--tile); border-radius: 8px; padding: .75rem 1rem; }
  .tile b { display: block; font-size: 1.9rem; line-height: 1.2; font-variant-numeric: tabular-nums; }
  .tile span { color: var(--secondary); font-size: .9rem; }
  .versions { display: grid; grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr)); gap: 0 1.5rem; }
  .versions .tiles { grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr)); margin: .5rem 0; }
  .environment { border-top: 2px solid var(--rule); margin-top: 2.5rem; }
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
  @media (max-width: 40rem) { .row { grid-template-columns: 1fr; gap: .1rem; padding: .5rem 0; } td.id { white-space: normal; } .versions { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<h1>Test results</h1>
<p class="muted">${source || 'Local run'}</p>
<p>These tests run against <a href="https://github.com/testsmith-io/practice-software-testing">Toolshop</a>, a demo shop with built-in bugs, so failures are expected. They stay visible to show how the framework reports them. <a href="${repositoryUrl}">About this project</a></p>
${missing.length ? `<p><strong>No results from: ${missing.map(escapeHtml).join(', ')}.</strong> The counts below leave those out.</p>` : ''}

${body}
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
    const slash = name.indexOf('/');
    const [environment, job] = slash > 0 ? [name.slice(0, slash), name.slice(slash + 1)] : [undefined, name];
    return { name, environment, job, report: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined };
  });
  if (!inputs.some((input) => input.report)) throw new Error('None of the given reports exist, so there is nothing to show.');

  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, page({ inputs, outFolder: path.dirname(out) }));
  const environments = [...new Set(inputs.map((input) => input.environment).filter(Boolean))];
  console.log(`Wrote ${path.relative(process.cwd(), out)}${environments.length ? ` for ${environments.join(', ')}` : ''}.`);
}

main();
