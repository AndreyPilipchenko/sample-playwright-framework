// Example skeleton — adapt to your project (ships with the harness package).
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import type { DBConnectionConfig } from '../utils/DBActions';

/**
 * Destinations are entered once, in `.harness/targets.json` — the file written when
 * the harness is configured, which its exploration runtime reads too — and the
 * config modules take them from here, so specs, pages and services use the same values:
 *
 *   url: appUrl('app'),              // browser target of "app": its first origin
 *   apiUrl: apiUrl('app'),           // API target of "app": its base URL
 *   appDb: databaseTarget('appDb'),  // database target of "appDb": server, port, database
 *
 * Environments (`.harness/project.json`) decide WHICH target a name resolves to. The run
 * uses TEST_ENV, else the project's `defaultEnvironment`. A name resolves to the target the
 * environment lists under that exact id, or under `<name>-<environment>`
 * (e.g. `app` in environment `local` → target `app-local`).
 *
 * An environment variable named after the name overrides a value on one machine or
 * run, whatever the environment: APP_URL; APP_API_URL; APP_DB_SERVER, APP_DB_PORT, APP_DB_NAME.
 *
 * Credentials are secrets and never live in that file: a database target names the
 * variable that holds its {"user","password"} JSON (connectionRef "env:APP_DB");
 * a database without a target uses DB_USER and DB_PASSWORD. Values come only from
 * process.env — the gitignored .env, loaded by dotenv in playwright.config.ts.
 */
interface HarnessTargets {
  databases?: Record<string, { connectionRef: string; server?: string; port?: number; database?: string; encrypt?: boolean; trustServerCertificate?: boolean }>;
  browser?: Record<string, { origins: string[] }>;
  api?: Record<string, { baseUrl: string; credentialRef?: string }>;
}
interface HarnessEnvironment {
  browserTargets?: string[];
  apiTargets?: string[];
  databaseTargets?: string[];
}
interface HarnessProject {
  defaultEnvironment?: string;
  environments?: Record<string, HarnessEnvironment>;
}

const readHarnessFile = <T>(name: string): T => {
  const file = path.resolve(__dirname, '../../.harness', name);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : ({} as T);
};
const targets = readHarnessFile<HarnessTargets>('targets.json');
const project = readHarnessFile<HarnessProject>('project.json');

/** The environment this run targets: TEST_ENV, else the project's default. */
export const environmentName: string = process.env.TEST_ENV || project.defaultEnvironment || '';
const environment: HarnessEnvironment | undefined = project.environments?.[environmentName];
if (process.env.TEST_ENV && !environment) {
  const known = Object.keys(project.environments ?? {}).join(', ');
  throw new Error(`TEST_ENV="${process.env.TEST_ENV}" is not an environment in .harness/project.json (known: ${known}).`);
}

/** Target `appDb` → `APP_DB`. */
const variablePrefix = (id: string): string => id.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();

/** The id the selected environment lists for `name` in one of its target lists, if any. */
const environmentTargetId = (list: keyof HarnessEnvironment, name: string): string | undefined =>
  environment?.[list]?.find((id) => id === name || id === `${name}-${environmentName}`);

/** Fails fast when neither an override nor the environment supplies an address. */
const required = (value: string | undefined, what: string, override: string): string => {
  if (value) return value;
  throw new Error(`No ${what} in environment "${environmentName}": list one in .harness/project.json or set ${override}.`);
};

/** The application's address: `<NAME>_URL`, else the first origin of the environment's browser target. */
export const appUrl = (name: string): string => {
  const override = `${variablePrefix(name)}_URL`;
  const id = environmentTargetId('browserTargets', name);
  return required(process.env[override] || (id ? targets.browser?.[id]?.origins[0] : undefined), `browser target for "${name}"`, override);
};

/** An API's base URL (no trailing slash): `<NAME>_API_URL`, else the environment's API target `baseUrl`. */
export const apiUrl = (name: string): string => {
  const override = `${variablePrefix(name)}_API_URL`;
  const id = environmentTargetId('apiTargets', name);
  return required(process.env[override] || (id ? targets.api?.[id]?.baseUrl : undefined), `API target for "${name}"`, override).replace(/\/+$/, '');
};

/** A database's coordinates from the environment's target, its credentials from the variable the target names. */
export function databaseTarget(name: string): DBConnectionConfig {
  const id = environmentTargetId('databaseTargets', name);
  const target = id ? targets.databases?.[id] : undefined, prefix = variablePrefix(name);
  const credentials = target ? JSON.parse(process.env[target.connectionRef.slice('env:'.length)] || '{}') : { user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  return {
    name,
    server: process.env[`${prefix}_SERVER`] || target?.server || '',
    port: Number(process.env[`${prefix}_PORT`] || target?.port) || undefined,
    database: process.env[`${prefix}_NAME`] || target?.database || '',
    user: credentials.user ?? '',
    password: credentials.password ?? '',
    encrypt: target?.encrypt,
    trustServerCertificate: target?.trustServerCertificate,
  };
}
