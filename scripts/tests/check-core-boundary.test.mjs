import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runScript, tempFolder, writeFile } from './helpers.mjs';

const CORE_FILE = 'src/utils/Sample.ts';
const SPEC_FILE = 'tests/Sample.spec.ts';
const SETTINGS_FILE = 'src/config/sample.ts';

/** The smallest repository the check accepts, with one more line in one file when given. */
function check(t, file, line) {
  const root = tempFolder(t);
  const files = {
    [CORE_FILE]: 'export const sample = 1;\n',
    'src/fixtures/test.ts': 'export const fixture = 1;\n',
    [SETTINGS_FILE]: 'export const setting = 1;\n',
    [SPEC_FILE]: "await allure.testCaseId('case-1');\n",
    'setup/auth.setup.ts': "await allure.testCaseId('case-2');\n",
  };
  if (file) files[file] = `${files[file] ?? ''}${line}\n`;
  for (const [name, content] of Object.entries(files)) writeFile(root, name, content);
  return runScript('check-core-boundary.mjs', [root]);
}

test('a clean repository passes', (t) => {
  const { status, output } = check(t);
  assert.equal(status, 0);
  assert.match(output, /2 case IDs, no duplicates/);
});

const violations = [
  ['core imports a page', CORE_FILE, "import { LoginPage } from '../pages/LoginPage';"],
  ['core type-imports a service', 'src/fixtures/test.ts', "import type { X } from '../apis/ApisUserAccount';"],
  ['core dynamically imports a helper', CORE_FILE, "void import('../helpers/Flows');"],
  ['core requires test data', CORE_FILE, "require('../../resources/testData/File.json');"],
  ['core re-exports a database service', CORE_FILE, "export { X } from '../dbs/DbsUserAccount';"],
  ['settings import a page', SETTINGS_FILE, "import { LoginPage } from '../pages/LoginPage';"],
  ['core names the app in a comment', CORE_FILE, '// used by the Toolshop login'],
  ['core names an app word', CORE_FILE, "const route = '/invoices';"],
  ['core holds a session key of the app', CORE_FILE, "const key = 'GEO_LOCATION';"],
  ['a compound name: CheckoutPage', CORE_FILE, 'class CheckoutPage {}'],
  ['a compound name: product-card', CORE_FILE, "const card = 'product-card';"],
  ['a compound name: cartId', CORE_FILE, 'const cartId = 1;'],
  ['core names a case ID', CORE_FILE, '// see TC-PO-8'],
  ['a duplicate case ID', SPEC_FILE, "await allure.testCaseId('case-1');"],
  ['a case ID shared with setup', SPEC_FILE, "await allure.testCaseId('case-2');"],
  ['two equal case IDs on one line', SPEC_FILE, "await allure.testCaseId('new'); await allure.testCaseId('new');"],
  ['a case ID that is not a literal', SPEC_FILE, 'await allure.testCaseId(someId);'],
  ['a double-quoted case ID', SPEC_FILE, 'await allure.testCaseId("new");'],
  ['nested core imports a page', 'src/utils/deep/Nested.ts', "import { LoginPage } from '../../pages/LoginPage';"],
  ['nested core names the app', 'src/utils/deep/Nested.ts', '// used by the Toolshop login'],
  ['nested settings import a page', 'src/config/deep/nested.ts', "import { LoginPage } from '../../pages/LoginPage';"],
  ['a nested spec repeats a case ID', 'tests/ui/deep/Nested.spec.ts', "await allure.testCaseId('case-1');"],
];
for (const [name, file, line] of violations) {
  test(`fails when ${name}`, (t) => {
    assert.equal(check(t, file, line).status, 1);
  });
}

const allowed = [
  ['a commented-out duplicate', SPEC_FILE, "// await allure.testCaseId('case-1');"],
  ['core importing core', CORE_FILE, "import { fixture } from '../fixtures/test';"],
  ['a generic header name', CORE_FILE, "const header = 'x-auth-token';"],
  ['a word that only contains an app word', CORE_FILE, '// not for production, and a cartesian join'],
  ['settings naming the app', SETTINGS_FILE, "const note = 'Toolshop checkout';"],
];
for (const [name, file, line] of allowed) {
  test(`allows ${name}`, (t) => {
    assert.equal(check(t, file, line).status, 0);
  });
}

test('a missing folder is an error, not a pass', (t) => {
  const root = tempFolder(t);
  writeFile(root, CORE_FILE, 'export const sample = 1;\n');
  assert.notEqual(runScript('check-core-boundary.mjs', [root]).status, 0);
});

test('a report points at the file and line', (t) => {
  const { output } = check(t, CORE_FILE, "const route = '/invoices';");
  assert.match(output, /::error file=src\/utils\/Sample\.ts,line=2::/);
});
