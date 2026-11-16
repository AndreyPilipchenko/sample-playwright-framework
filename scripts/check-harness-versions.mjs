#!/usr/bin/env node
/**
 * Fails when an installed package version switches a harness feature off.
 *
 *   node scripts/check-harness-versions.mjs [file with the JSON of `pom-harness check --json`]
 *
 * The harness validates exact versions of Playwright and the Allure packages and reports a feature
 * "unavailable" for any other: an update of those (by Dependabot or by hand) silently stops the Allure
 * report or the verification of generated tests, while every other check stays green. This reads the
 * harness's own readiness report, so the pinned versions live in one place: the harness.
 * Ops tooling, outside the POM layer map.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** The features that depend only on installed package versions, so CI can judge them without browsers or secrets. */
const VERSION_BOUND = ['Allure reporting', 'generation verification'];

const report = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : execFileSync('npx', ['--no', 'pom-harness', 'check', '--json'], { encoding: 'utf8', shell: process.platform === 'win32' });
const features = JSON.parse(report).features ?? [];

const problems = [];
for (const name of VERSION_BOUND) {
  const feature = features.find((entry) => entry.name === name);
  if (!feature) problems.push(`The harness check no longer reports "${name}"; update scripts/check-harness-versions.mjs.`);
  else if (feature.status === 'unavailable') problems.push(`Harness feature "${name}" is unavailable: ${feature.detail ?? 'no detail'}.`);
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`::error file=package.json::${problem}`);
  process.exit(1);
}
console.log(`Harness versions hold: ${VERSION_BOUND.join(' and ')} available.`);
