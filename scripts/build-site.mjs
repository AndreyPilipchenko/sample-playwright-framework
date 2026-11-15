#!/usr/bin/env node
/**
 * Builds the GitHub Pages site from one run's downloaded artifacts: the results dashboard at the
 * root, and each job's Allure report at <environment>/<job>/index.html.
 *
 *   node scripts/build-site.mjs <artifacts folder> <site folder>
 *
 * The artifacts folder holds `allure-report-<environment>-<job>/index.html` and
 * `results-<environment>-<job>/results-slim.json`, as actions/download-artifact writes them, for
 * both nightly environments. A job without results is named on the page rather than failing the
 * build. Ops tooling, outside the POM layer map.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

/** The nightly's environments and jobs (.github/workflows/nightly.yml); its report names are <environment>-<job>. */
const ENVIRONMENTS = ['local', 'local-fixed'];
const JOBS = ['api', 'smoke-chromium', 'smoke-firefox', 'smoke-webkit', 'regression'];
const REPORTS = ENVIRONMENTS.flatMap((environment) => JOBS.map((job) => ({ artifact: `${environment}-${job}`, page: `${environment}/${job}` })));

const [artifacts, site] = process.argv.slice(2);
if (!artifacts || !site) throw new Error('Usage: build-site.mjs <artifacts folder> <site folder>');

mkdirSync(site, { recursive: true });
for (const { artifact, page } of REPORTS) {
  const report = path.join(artifacts, `allure-report-${artifact}`, 'index.html');
  if (!existsSync(report)) continue;
  mkdirSync(path.join(site, page), { recursive: true });
  // The link is for people it is sent to. Crawlers read robots.txt only at a host's root, which a
  // project page doesn't own, so each page asks to stay out of search results itself.
  const html = readFileSync(report, 'utf8');
  const marked = html.replace(/<head[^>]*>/i, (head) => `${head}<meta name="robots" content="noindex">`);
  if (marked === html) throw new Error(`No <head> in ${report}.`);
  writeFileSync(path.join(site, page, 'index.html'), marked);
}

const inputs = REPORTS.map(({ artifact, page }) => `${page}=${path.join(artifacts, `results-${artifact}`, 'results-slim.json')}`);
execFileSync(process.execPath, [path.join(import.meta.dirname, 'quality-dashboard.mjs'), '--out', path.join(site, 'index.html'), ...inputs], { stdio: 'inherit' });
