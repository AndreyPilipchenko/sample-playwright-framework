#!/usr/bin/env node
/**
 * Copies a Playwright JSON report, keeping only what scripts/quality-dashboard.mjs reads: when the
 * run started and each test's titles, location, browser and outcome. The artifacts of this public
 * repository must not carry the rest of the report: error text, request and response logs, attachments.
 *
 *   node scripts/slim-results.mjs <test-results.json> <output.json>
 *
 * A selection with no specs writes no report; that is not an error here. Ops tooling, outside the
 * POM layer map.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: slim-results.mjs <test-results.json> <output.json>');

const slimSuite = (suite) => ({
  title: suite.title,
  specs: (suite.specs ?? []).map(({ title, file, line, tests }) => ({
    title,
    file,
    line,
    tests: tests.map(({ projectName, status }) => ({ projectName, status })),
  })),
  suites: (suite.suites ?? []).map(slimSuite),
});

if (existsSync(input)) {
  const report = JSON.parse(readFileSync(input, 'utf8'));
  writeFileSync(output, JSON.stringify({ stats: { startTime: report.stats?.startTime }, suites: (report.suites ?? []).map(slimSuite) }));
}
