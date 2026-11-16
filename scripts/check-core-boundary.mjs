#!/usr/bin/env node
/**
 * Keeps the reusable core free of the app under test, and one case ID on one test.
 *
 *   node scripts/check-core-boundary.mjs [repository root]
 *
 * It fails when src/utils or src/fixtures name something from APP_TERMS, including in comments, or
 * when they or src/config import a Toolshop layer. It also fails when two tests share a case ID,
 * because Allure then merges them and hides a result. It reads text, so one literal ID inside a loop
 * goes unnoticed. See docs/adapting-to-your-app.md. Ops tooling, outside the POM layer map.
 */
import * as path from 'node:path';
import { caseIdUses, fileLines, sourceFiles as filesUnder } from './spec-scan.mjs';

const root = path.resolve(process.argv[2] ?? '.');
const CORE = ['src/utils', 'src/fixtures'];
const SETTINGS = ['src/config'];
const APP_LAYERS = ['src/pages', 'src/apis', 'src/dbs', 'src/helpers', 'tests', 'setup', 'resources/testData'];
const SPEC_FOLDERS = ['tests', 'setup'];
/** What only the app under test would name. Replace these when adapting the framework to another app. */
const APP_TERMS = /(?<![a-z0-9])(?:tool ?shop|testsmith|practicesoftwaretesting|with-bugs|ngb-toast|data-test|(?<!-)auth-token|RETRIEVE_GEOLOCATION|GEO_LOCATION|products?|invoices?|carts?|checkout|customers?|brands?|TC-[a-z]+-\d+)(?![a-z0-9])/i;
const IMPORT = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)['"](\.[^'"]+)['"]/;

const relative = (file) => path.relative(root, file).split(path.sep).join('/');
const sourceFiles = (folder) => filesUnder(root, folder);

const problems = [];
const report = (file, line, message) => problems.push(`::error file=${relative(file)},line=${line}::${message}`);

for (const file of [...CORE, ...SETTINGS].flatMap(sourceFiles)) {
  for (const { text, line } of fileLines(file)) {
    const target = text.match(IMPORT)?.[1];
    if (!target) continue;
    const resolved = relative(path.resolve(path.dirname(file), target));
    const layer = APP_LAYERS.find((folder) => resolved === folder || resolved.startsWith(`${folder}/`));
    if (layer) report(file, line, `Core and settings can't import the app layer ${layer}.`);
  }
}

for (const file of CORE.flatMap(sourceFiles)) {
  for (const { text, line } of fileLines(file)) {
    const wordParts = text.replace(/([a-z\d])([A-Z])/g, '$1 $2'); // so CheckoutPage and cartId match too
    const term = wordParts.match(APP_TERMS)?.[0];
    if (term) report(file, line, `Core names "${term}", which belongs to the app under test. Move it to src/config or reword it.`);
  }
}

const firstUse = new Map();
for (const { file, line, id } of caseIdUses(SPEC_FOLDERS.flatMap(sourceFiles))) {
  if (id === undefined) {
    report(file, line, 'A case ID must be one single-quoted string on one line, so this check can read it.');
    continue;
  }
  const first = firstUse.get(id);
  if (first) report(file, line, `Case ID ${id} is already used at ${first}.`);
  else firstUse.set(id, `${relative(file)}:${line}`);
}

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
console.log(`Core boundary holds; ${firstUse.size} case IDs, no duplicates.`);
