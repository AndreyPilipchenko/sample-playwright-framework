#!/usr/bin/env node
/**
 * Keeps the numbers in the README's "At a glance" table true to the specs.
 *
 *   node scripts/check-readme-counts.mjs [repository root]
 *
 * It counts, from the source text:
 *   - tests: `test('...'` calls in tests/ui (browser) and tests/api (API), `setup('...'` calls in setup/;
 *   - spec files: `*.spec.ts` under tests/;
 *   - `@smoke`: test calls whose own line carries the tag (a tag on a describe block goes unnoticed);
 *   - automated cases: case IDs used in specs whose ID, without a split letter (TC-CBA-4a), is a row of
 *     docs/test-cases.md.
 * It fails when a README number differs, or when the README rows can no longer be read.
 * Ops tooling, outside the POM layer map.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { caseIdUses, fileLines, sourceFiles } from './spec-scan.mjs';

const root = path.resolve(process.argv[2] ?? '.');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

/** Calls of `name('title'` that are not commented out; returns their lines. */
function calls(files, name) {
  const call = new RegExp(`\\b${name}\\(\\s*['"\`]`);
  return files.flatMap(fileLines).filter(({ text }) => !text.trimStart().startsWith('//') && call.test(text));
}

const browserTests = calls(sourceFiles(root, 'tests/ui'), 'test');
const apiTests = calls(sourceFiles(root, 'tests/api'), 'test');
const setupTests = calls(sourceFiles(root, 'setup'), 'setup');
const designed = new Set([...read('docs/test-cases.md').matchAll(/^\|\s*(TC-[A-Z]+-\d+)\s*\|/gm)].map(([, id]) => id));
const automatedCases = new Set(caseIdUses(sourceFiles(root, 'tests'))
  .map(({ id }) => id?.replace(/(\d)[a-z]$/, '$1'))
  .filter((id) => designed.has(id)));

const actual = {
  tests: browserTests.length + apiTests.length,
  'spec files': sourceFiles(root, 'tests', /\.spec\.ts$/).length,
  'browser tests': browserTests.length,
  'API tests': apiTests.length,
  'setup tests': setupTests.length,
  '@smoke tests': [...browserTests, ...apiTests].filter(({ text }) => text.includes('@smoke')).length,
  'automated cases': automatedCases.size,
};

const README_ROWS = {
  tests: /^\| \*\*Tests\*\* \| (\d+) across (\d+) spec files: (\d+) in the browser, (\d+) API, plus (\d+) sign-in setup tests\. (\d+) are `@smoke`/m,
  cases: /^\| \*\*Automated cases\*\* \| \[(\d+) test cases\]/m,
};
const readme = read('README.md');
const testsRow = readme.match(README_ROWS.tests);
const casesRow = readme.match(README_ROWS.cases);
if (!testsRow || !casesRow) {
  console.error(`::error file=README.md::The "At a glance" rows for ${testsRow ? 'automated cases' : 'tests'} no longer read as scripts/check-readme-counts.mjs expects; update one or the other.`);
  process.exit(1);
}
const stated = {
  tests: testsRow[1],
  'spec files': testsRow[2],
  'browser tests': testsRow[3],
  'API tests': testsRow[4],
  'setup tests': testsRow[5],
  '@smoke tests': testsRow[6],
  'automated cases': casesRow[1],
};

const wrong = Object.keys(actual).filter((what) => Number(stated[what]) !== actual[what]);
for (const what of wrong) {
  console.error(`::error file=README.md::README says ${stated[what]} ${what}, the specs have ${actual[what]}.`);
}
if (wrong.length > 0) process.exit(1);
console.log(`README counts match: ${actual.tests} tests in ${actual['spec files']} spec files, ${actual['@smoke tests']} @smoke, ${actual['automated cases']} automated cases.`);
