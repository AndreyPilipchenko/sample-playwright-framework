import * as fs from 'fs';

/** Reads a paired test-data JSON file from `resources/testData`; type it with `typeof import('<path>.json')`. */
export function loadTestData<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(`./resources/testData/${fileName}`, 'utf8')) as T;
}
