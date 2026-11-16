/**
 * Reads spec sources as text, for the checks in scripts/: which files there are, and where each
 * `allure.testCaseId(...)` stands. Ops tooling, outside the POM layer map.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';

const CASE_ID = /\btestCaseId\(([^)]*)\)?/g;
/** Single quotes, because scripts/quality-dashboard.mjs reads the IDs the same way. */
const LITERAL = /^\s*'[^']+'\s*$/;

/** Script and TypeScript files under `folder` of `root`, at any depth. A missing folder is an error. */
export function sourceFiles(root, folder, pattern = /\.(?:ts|mts|cts|js|mjs|cjs)$/) {
  const start = path.join(root, folder);
  if (!existsSync(start)) throw new Error(`No ${folder} under ${root}.`);
  return readdirSync(start, { recursive: true })
    .map((name) => path.join(start, name))
    .filter((file) => pattern.test(file) && statSync(file).isFile());
}

/** The lines of a file, numbered from 1. */
export function fileLines(file) {
  return readFileSync(file, 'utf8').split(/\r?\n/).map((text, index) => ({ text, line: index + 1 }));
}

/**
 * Every case-ID call in `files`, in order: `{ file, line, id }`, with `id` undefined when the
 * argument is not one single-quoted string. Commented-out lines are skipped.
 */
export function caseIdUses(files) {
  const uses = [];
  for (const file of files) {
    for (const { text, line } of fileLines(file)) {
      if (text.trimStart().startsWith('//')) continue;
      for (const [, argument] of text.matchAll(CASE_ID)) {
        uses.push({ file, line, id: LITERAL.test(argument) ? argument.trim().slice(1, -1) : undefined });
      }
    }
  }
  return uses;
}
