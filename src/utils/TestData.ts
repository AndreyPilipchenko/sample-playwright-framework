import * as fs from 'fs';
import * as path from 'path';
import { environmentName } from '../config/targets';
import { environmentBuilds } from '../config/builds';

/** Resolved from this file, so a run started outside the repository root finds the data too. */
const TEST_DATA_DIR = path.resolve(__dirname, '../../resources/testData');

/**
 * Reads a paired test-data JSON file from `resources/testData`; type it with `typeof import('<path>.json')`.
 *
 * Where an expected value differs between builds of the application, a build overlay sits next to the
 * file: `<name>.<build>.json` (the build of the run's environment, src/config/builds.ts). Its values
 * replace the base file's, object by object; an array or plain value is replaced whole. Keep an overlay
 * to the values that really differ, each one recorded in docs/app-versions.md.
 */
export function loadTestData<T>(fileName: string): T {
  const base = JSON.parse(fs.readFileSync(path.join(TEST_DATA_DIR, fileName), 'utf8')) as T;
  const build = environmentBuilds[environmentName];
  const overlayFile = path.join(TEST_DATA_DIR, `${fileName.replace(/\.json$/, '')}.${build}.json`);
  if (!build || !fs.existsSync(overlayFile)) return base;
  return mergeOverlay(base, JSON.parse(fs.readFileSync(overlayFile, 'utf8'))) as T;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `overlay` over `base`: nested objects merge key by key, anything else is replaced. */
function mergeOverlay(base: unknown, overlay: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(overlay)) return overlay;
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) merged[key] = mergeOverlay(base[key], value);
  return merged;
}
