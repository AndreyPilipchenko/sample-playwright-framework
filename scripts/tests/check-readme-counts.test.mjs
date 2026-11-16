import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runScript, tempFolder, writeFile } from './helpers.mjs';

const README = [
  '| | |',
  '|---|---|',
  '| **Tests** | 3 across 2 spec files: 2 in the browser, 1 API, plus 1 sign-in setup tests. 1 are `@smoke` and also run on Firefox and WebKit |',
  '| **Automated cases** | [2 test cases](docs/test-cases.md) from the test design |',
  '',
].join('\n');

/** The smallest repository whose README is right, with files replaced or added when given. */
function check(t, changes = {}) {
  const root = tempFolder(t);
  const files = {
    'README.md': README,
    'docs/test-cases.md': '| ID | Title |\n|---|---|\n| TC-A-1 | One |\n| TC-A-2 | Two |\n| TC-A-3 | Three |\n',
    'tests/ui/One.spec.ts': [
      "test('first', { tag: ['@smoke'] }, async () => { await allure.testCaseId('TC-A-1a'); });",
      "test(\"second\", async () => { await allure.testCaseId('TC-A-1b'); });",
      "// test('commented out', async () => {});",
      "test.skip(!ready, 'not a test of its own');",
      '',
    ].join('\n'),
    'tests/api/Two.spec.ts': "test(`third`, async () => { await allure.testCaseId('TC-A-2'); await allure.testCaseId('api-1'); });\n",
    'tests/support.ts': 'export const helper = 1;\n',
    'setup/auth.setup.ts': "setup.beforeAll(() => {});\nsetup('sign in', async () => {});\n",
    ...changes,
  };
  for (const [name, content] of Object.entries(files)) writeFile(root, name, content);
  return runScript('check-readme-counts.mjs', [root]);
}

test('a README that matches the specs passes', (t) => {
  const { status, output } = check(t);
  assert.equal(status, 0, output);
  assert.match(output, /3 tests in 2 spec files, 1 @smoke, 2 automated cases/);
});

const drifts = [
  ['a browser test is added', 'tests/ui/Three.spec.ts', "test('new', async () => {});\n", /README says 3 tests, the specs have 4/],
  ['a spec file is added', 'tests/api/Empty.spec.ts', '\n', /README says 2 spec files, the specs have 3/],
  ['an API test is tagged @smoke', 'tests/api/Two.spec.ts', "test('third', { tag: ['@smoke'] }, async () => {});\n", /README says 1 @smoke tests, the specs have 2/],
  ['another designed case is automated', 'tests/api/Two.spec.ts', "test('third', async () => { await allure.testCaseId('TC-A-2'); await allure.testCaseId('TC-A-3'); });\n", /README says 2 automated cases, the specs have 3/],
  ['a setup test is added', 'setup/admin.setup.ts', "setup('admin', async () => {});\n", /README says 1 setup tests, the specs have 2/],
];
for (const [name, file, content, message] of drifts) {
  test(`fails when ${name}`, (t) => {
    const { status, output } = check(t, { [file]: content });
    assert.equal(status, 1, output);
    assert.match(output, message);
  });
}

test('a case ID outside the test design is not an automated case', (t) => {
  const { output } = check(t, { 'docs/test-cases.md': '| TC-A-1 | One |\n' });
  assert.match(output, /README says 2 automated cases, the specs have 1/);
});

test('a reworded README row is an error, not a pass', (t) => {
  const { status, output } = check(t, { 'README.md': README.replace('in the browser', 'in browsers') });
  assert.equal(status, 1);
  assert.match(output, /no longer read as/);
});
