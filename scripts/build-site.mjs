#!/usr/bin/env node
/**
 * Builds the GitHub Pages site from one run's downloaded artifacts: the results dashboard at the
 * root, and each job's Allure report at <report-name>/index.html.
 *
 *   node scripts/build-site.mjs <artifacts folder> <site folder>
 *
 * The artifacts folder holds `allure-report-<report-name>/index.html` and
 * `results-<report-name>/results-slim.json`, as actions/download-artifact writes them. A job
 * without results is named on the page rather than failing the build. Ops tooling, outside the POM
 * layer map.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

/** The report names of the nightly's jobs (.github/workflows/nightly.yml). */
const REPORT_NAMES = ['local-api', 'local-smoke-chromium', 'local-smoke-firefox', 'local-smoke-webkit', 'local-regression'];

const [artifacts, site] = process.argv.slice(2);
if (!artifacts || !site) throw new Error('Usage: build-site.mjs <artifacts folder> <site folder>');

mkdirSync(site, { recursive: true });
for (const name of REPORT_NAMES) {
  const report = path.join(artifacts, `allure-report-${name}`, 'index.html');
  if (!existsSync(report)) continue;
  mkdirSync(path.join(site, name), { recursive: true });
  // The link is for people it is sent to. Crawlers read robots.txt only at a host's root, which a
  // project page doesn't own, so each page asks to stay out of search results itself.
  const html = readFileSync(report, 'utf8');
  const marked = html.replace(/<head[^>]*>/i, (head) => `${head}<meta name="robots" content="noindex">`);
  if (marked === html) throw new Error(`No <head> in ${report}.`);
  writeFileSync(path.join(site, name, 'index.html'), marked);
}

const inputs = REPORT_NAMES.map((name) => `${name}=${path.join(artifacts, `results-${name}`, 'results-slim.json')}`);
execFileSync(process.execPath, [path.join(import.meta.dirname, 'quality-dashboard.mjs'), '--out', path.join(site, 'index.html'), ...inputs], { stdio: 'inherit' });
