import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runScript, tempFolder, writeFile } from './helpers.mjs';

/** Runs the check on a harness readiness report with these features. */
function check(t, features) {
  const report = writeFile(tempFolder(t), 'check.json', JSON.stringify({ features }));
  return runScript('check-harness-versions.mjs', [report]);
}

const ready = [
  { name: 'skills (Claude and Codex)', status: 'ready' },
  { name: 'generation verification', status: 'ready' },
  { name: 'Allure reporting', status: 'ready' },
];

test('available features pass', (t) => {
  const { status, output } = check(t, ready);
  assert.equal(status, 0, output);
  assert.match(output, /Harness versions hold/);
});

test('an Allure version the harness does not support fails, with the detail', (t) => {
  const features = ready.map((f) => f.name === 'Allure reporting' ? { ...f, status: 'unavailable', detail: 'allure 3.33.0 (needs 3.19.1)' } : f);
  const { status, output } = check(t, features);
  assert.equal(status, 1);
  assert.match(output, /"Allure reporting" is unavailable: allure 3\.33\.0 \(needs 3\.19\.1\)/);
});

test('a Playwright version the harness does not support fails', (t) => {
  const features = ready.map((f) => f.name === 'generation verification' ? { ...f, status: 'unavailable' } : f);
  assert.equal(check(t, features).status, 1);
});

test('a feature that is only not configured passes', (t) => {
  const features = ready.map((f) => f.name === 'Allure reporting' ? { ...f, status: 'not configured' } : f);
  assert.equal(check(t, features).status, 0);
});

test('a feature the report no longer names is an error, not a pass', (t) => {
  const { status, output } = check(t, ready.filter((f) => f.name !== 'generation verification'));
  assert.equal(status, 1);
  assert.match(output, /no longer reports "generation verification"/);
});
