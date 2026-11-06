/** What the script tests share: a temporary folder per test, and running a script as CI does. */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const SCRIPTS = path.resolve(import.meta.dirname, '..');

/** A new folder, removed when the test ends. */
export function tempFolder(t) {
  const folder = mkdtempSync(path.join(os.tmpdir(), 'script-test-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  return folder;
}

/** Writes a file, creating its folders, and returns its path. */
export function writeFile(root, file, content) {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

/** A copy of a script under `root`, which it then treats as its project: its docs and tests are read from there. */
export function copyScript(root, name) {
  mkdirSync(path.join(root, 'scripts'), { recursive: true });
  const copy = path.join(root, 'scripts', name);
  copyFileSync(path.join(SCRIPTS, name), copy);
  return copy;
}

/**
 * Runs a script by its name in scripts/, or by the path of a copy. The environment leaves out the
 * machine's credentials and everything GitHub sets, so a test gives the same result on CI.
 */
export function runScript(script, args = [], env = {}) {
  const clean = Object.fromEntries(Object.entries(process.env)
    .filter(([name]) => !name.startsWith('GITHUB_') && !['APP_DB_LOCAL', 'APP_ADMIN_PASSWORD', 'CI_BASELINE_FILE', 'CI_BASELINE_UPDATE'].includes(name)));
  const file = path.isAbsolute(script) ? script : path.join(SCRIPTS, script);
  const { status, stdout, stderr } = spawnSync(process.execPath, [file, ...args], { env: { ...clean, ...env }, encoding: 'utf8' });
  return { status, stdout, output: `${stdout}${stderr}` };
}
