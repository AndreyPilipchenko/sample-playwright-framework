import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';
import { runScript, tempFolder, writeFile } from './helpers.mjs';

const results = JSON.stringify({
  stats: { startTime: '2026-11-07T00:00:00.000Z', duration: 5 },
  errors: [{ message: 'fake run error' }],
  suites: [{
    title: 'A.spec.ts',
    file: 'A.spec.ts',
    specs: [],
    suites: [{
      title: 'Describe',
      suites: [],
      specs: [{
        title: 'A test',
        file: 'api/x/A.spec.ts',
        line: 3,
        id: 'fake-id',
        tests: [{
          projectName: 'api',
          status: 'unexpected',
          annotations: [{ type: 'fake', description: 'fake annotation' }],
          results: [{ error: { message: 'fake error text' }, stdout: [{ text: 'fake log' }], attachments: [{ name: 'fake attachment' }] }],
        }],
      }],
    }],
  }],
});

test('slim results keep only titles, location, browser and outcome', (t) => {
  const root = tempFolder(t);
  const input = writeFile(root, 'in.json', results);
  const output = path.join(root, 'out.json');
  assert.equal(runScript('slim-results.mjs', [input, output]).status, 0);

  const written = readFileSync(output, 'utf8');
  const slim = JSON.parse(written);
  assert.deepEqual(slim.stats, { startTime: '2026-11-07T00:00:00.000Z' });
  assert.deepEqual(slim.suites[0].suites[0], {
    title: 'Describe',
    specs: [{ title: 'A test', file: 'api/x/A.spec.ts', line: 3, tests: [{ projectName: 'api', status: 'unexpected' }] }],
    suites: [],
  });
  assert.doesNotMatch(written, /fake (?:error|log|attachment|annotation|run)/);
});

test('slim results write nothing when there is no report', (t) => {
  const root = tempFolder(t);
  const output = path.join(root, 'out.json');
  assert.equal(runScript('slim-results.mjs', [path.join(root, 'absent.json'), output]).status, 0);
  assert.equal(existsSync(output), false);
});

/** Artifacts as actions/download-artifact writes them, for the given reports. */
function artifacts(root, names, reportHtml = '<html><head><title>Report</title></head></html>') {
  const folder = path.join(root, 'artifacts');
  for (const name of names) {
    writeFile(folder, `allure-report-${name}/index.html`, reportHtml);
    writeFile(folder, `results-${name}/results-slim.json`, results);
  }
  return folder;
}

test('the site holds the dashboard and each report, marked noindex', (t) => {
  const root = tempFolder(t);
  const site = path.join(root, 'site');
  const { status, output } = runScript('build-site.mjs', [artifacts(root, ['local-api', 'local-regression']), site]);
  assert.equal(status, 0, output);

  assert.equal(existsSync(path.join(site, 'robots.txt')), false);
  const report = readFileSync(path.join(site, 'local-api/index.html'), 'utf8');
  assert.match(report, /<head><meta name="robots" content="noindex">/);
  const dashboard = readFileSync(path.join(site, 'index.html'), 'utf8');
  assert.match(dashboard, /href="local-regression\/index\.html"/);
  assert.match(dashboard, /No results from: local-smoke-chromium/);
});

test('a report without a head stops the build rather than going unmarked', (t) => {
  const root = tempFolder(t);
  const { status } = runScript('build-site.mjs', [artifacts(root, ['local-api'], '<html></html>'), path.join(root, 'site')]);
  assert.notEqual(status, 0);
});

test('a run with no results stops the build', (t) => {
  const root = tempFolder(t);
  const { status } = runScript('build-site.mjs', [path.join(root, 'absent'), path.join(root, 'site')]);
  assert.notEqual(status, 0);
});
