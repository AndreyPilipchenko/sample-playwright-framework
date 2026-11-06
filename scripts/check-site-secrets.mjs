#!/usr/bin/env node
/**
 * Fails when the site about to be published holds secret-shaped text, so the previous site stays up.
 * Allure stores attachments as base64 inside its HTML, where a plain text search finds nothing, so
 * this checks the decoded content too.
 *
 *   APP_DB_LOCAL='{"user":"...","password":"..."}' APP_ADMIN_PASSWORD='...' node scripts/check-site-secrets.mjs <site folder>
 *
 * It looks for tokens, password hashes, unmasked fields named in src/utils/RedactedKeys.ts, and the
 * values of the two variables above. A test account's password in a page snapshot has no recognisable
 * shape, so only those values are caught there, and text in a screenshot goes unnoticed. It prints
 * what it found and where, never the value. Ops tooling, outside the POM layer map.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';

const REDACTED_NAMES = path.join(import.meta.dirname, '..', 'src', 'utils', 'RedactedKeys.ts');

/** Reads a list from the facades' own file, as text: this CommonJS package can't import TypeScript here. */
function redactedNames(list) {
  const entries = readFileSync(REDACTED_NAMES, 'utf8').match(new RegExp(`${list}\\b[^\\[]*\\[([^\\]]+)\\]`))?.[1];
  const names = [...(entries ?? '').matchAll(/'([^']+)'/g)].map(([, name]) => name);
  if (names.length === 0) throw new Error(`No ${list} in ${REDACTED_NAMES}.`);
  return names;
}

const SECRET_NAMES = [...redactedNames('REDACTED_KEYS'), ...redactedNames('REDACTED_HEADERS'), 'current_password', 'new_password', 'password_confirmation'].join('|');
const SHAPES = {
  'a JWT': /eyJ[\w-]{20,}\.[\w-]{10,}\.[\w-]{10,}/,
  // The digit tells a token from prose such as "Bearer authentication".
  'a Bearer token': /bearer\s+(?!\*)(?=[\w.-]*\d)[\w.-]{12,}/i,
  'a password hash': /\$2[aby]\$\d\d\$[./A-Za-z0-9]{50,}/,
};
const SECRET_FIELDS = [
  new RegExp(`\\\\*"(?:${SECRET_NAMES})\\\\*"\\s*:\\s*\\\\*"([^"\\\\]{3,})`, 'gi'),
  // A query string or form body, not code in Allure's own script such as `token==a.b-9`.
  new RegExp(`(?<=^|[?&\\s"'])(?:${SECRET_NAMES})=([\\w%~.+-]{3,})(?=[&\\s"'<>]|$)`, 'gim'),
];
const MASKED = /^(?:(?:bearer\s+)?\*+|(?:%2A)+|\[.*|REDACTED.*)$/i;
/** Twelve characters of base64 hold eight bytes, the shortest value searched for. */
const BLOB = /[A-Za-z0-9+/=]{12,}/g;
const PNG_START = '�PNG';
const MAX_DECODE_DEPTH = 2;
/** Shorter values match ordinary words, so they can't be searched for. */
const MIN_VALUE_LENGTH = 8;

/** The named values long enough to search for; CI holds the database's as JSON, a local run may have neither. */
function forbiddenValues() {
  let database = {};
  if (process.env.APP_DB_LOCAL) {
    try {
      database = JSON.parse(process.env.APP_DB_LOCAL);
    } catch {
      throw new Error('APP_DB_LOCAL is not valid JSON.'); // the parser's own message would quote the value
    }
  }
  const named = [['the database user', database.user], ['the database password', database.password], ['the admin password', process.env.APP_ADMIN_PASSWORD]];
  return named.filter(([name, value]) => {
    if (!value) return false;
    if (value.length >= MIN_VALUE_LENGTH) return true;
    console.log(`::warning::Not searching for ${name}: it is under ${MIN_VALUE_LENGTH} characters.`);
    return false;
  });
}

const wholeWord = (value) => new RegExp(`(?<![\\w-])${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);

function addProblems(text, forbidden, problems, depth = 0) {
  for (const [name, shape] of Object.entries(SHAPES)) if (shape.test(text)) problems.add(name);
  for (const field of SECRET_FIELDS) {
    for (const [, value] of text.matchAll(field)) if (!MASKED.test(value)) problems.add('an unmasked secret field');
  }
  for (const [name, value] of forbidden) if (wholeWord(value).test(text)) problems.add(name);
  if (depth === MAX_DECODE_DEPTH) return;
  for (const [blob] of text.matchAll(BLOB)) {
    const decoded = Buffer.from(blob, 'base64').toString('utf8');
    if (!decoded.startsWith(PNG_START)) addProblems(decoded, forbidden, problems, depth + 1);
  }
}

function htmlFiles(folder) {
  return readdirSync(folder).flatMap((name) => {
    const file = path.join(folder, name);
    if (statSync(file).isDirectory()) return htmlFiles(file);
    return name.endsWith('.html') ? [file] : [];
  });
}

function main() {
  const [site] = process.argv.slice(2);
  if (!site) throw new Error('Usage: check-site-secrets.mjs <site folder>');
  const forbidden = forbiddenValues();
  const files = htmlFiles(site);
  if (files.length === 0) throw new Error(`No HTML files in ${site}.`);

  let failed = false;
  for (const file of files) {
    const problems = new Set();
    addProblems(readFileSync(file, 'utf8'), forbidden, problems);
    for (const problem of problems) {
      console.error(`::error::${file} contains ${problem}.`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log(`No secrets found in ${files.length} HTML file(s). Screenshots are not checked.`);
}

main();
