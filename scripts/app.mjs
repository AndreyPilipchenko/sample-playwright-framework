#!/usr/bin/env node
/**
 * Runs the application under test locally in Docker, so the suite can be exercised
 * against a private instance instead of the shared public one.
 *
 *   node scripts/app.mjs up      [--variant <name>] [--no-seed] [--timeout <seconds>]
 *   node scripts/app.mjs down    [--volumes]
 *   node scripts/app.mjs status
 *   node scripts/app.mjs logs    [service] [--follow]
 *   node scripts/app.mjs test    [-- <extra playwright args>]
 *
 * This is ops tooling, not framework code — it sits outside the POM layer map
 * (pom-architecture) deliberately. Written in Node rather than sh/ps1 so one
 * implementation serves Windows developers and the Linux CI runner alike.
 *
 * It uses the upstream project's prebuilt images (`docker-compose.prod.yml`), so no
 * application source is cloned: that file plus an `.env` naming the variant is all
 * Docker needs. Building from source is the upstream repo's own documented workflow
 * and is not reproduced here.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
/** Gitignored scratch directory holding the compose file and its .env. */
const workDir = path.join(projectRoot, '.app');
const composeFile = 'docker-compose.prod.yml';
/** Compose project name — keeps `down` deterministic and avoids clashing with other stacks. */
const composeProject = 'pst-local';

/**
 * Upstream variant to run. `sprint5-with-bugs` matches the deployed target this
 * project is configured against, so the local instance carries the same intentional
 * defects. `SPRINT` is the upstream compose file's own interpolation variable
 * (it selects the image tag), which is why that name appears in the generated .env.
 */
const defaultVariant = 'sprint5-with-bugs';
const composeRef = process.env.APP_COMPOSE_REF || 'main';
const composeUrl = `https://raw.githubusercontent.com/testsmith-io/practice-software-testing/${composeRef}/${composeFile}`;

/** Where the local instance listens once up — these are fixed by the upstream compose file. */
const appUrl = 'http://localhost:4200';
const apiUrl = 'http://localhost:8091';
/** Cheap always-200 endpoint used as the API readiness probe (the API root returns 404). */
const apiProbe = `${apiUrl}/products`;

function fail(message) {
  console.error(`app.mjs: ${message}`);
  process.exit(1);
}

/** Runs a command inheriting stdio; returns its exit status rather than throwing. */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: workDir, ...options });
  if (result.error?.code === 'ENOENT') {
    fail(`'${command}' not found on PATH.`);
  }
  // Any other spawn error must surface too — a silent non-zero exit is undebuggable.
  if (result.error) {
    fail(`could not run '${command}': ${result.error.code ?? result.error.message}`);
  }
  return result.status ?? 1;
}

/** Runs a command capturing stdout, for probing rather than reporting. */
function capture(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', cwd: workDir, ...options });
  return { status: result.status, stdout: result.stdout ?? '', error: result.error };
}

function requireDocker() {
  const version = capture('docker', ['compose', 'version'], { cwd: projectRoot });
  if (version.error?.code === 'ENOENT') {
    fail('Docker is not installed or not on PATH. Install Docker Desktop (or the engine + compose plugin) and retry.');
  }
  if (version.status !== 0) {
    fail('`docker compose` is unavailable. Check that Docker is running and the compose plugin is installed.');
  }
}

/** Compose invocation shared by every subcommand. */
const compose = (...args) => ['compose', '-f', composeFile, '--project-name', composeProject, ...args];

/**
 * Writes the compose file and its .env into the work directory.
 * Re-downloads on every `up` so a stale cached file cannot silently pin an old stack.
 */
async function prepareWorkDir(variant) {
  mkdirSync(workDir, { recursive: true });

  const response = await fetch(composeUrl);
  if (!response.ok) {
    fail(`could not download ${composeFile} from ${composeRef} (HTTP ${response.status}).`);
  }
  writeFileSync(path.join(workDir, composeFile), await response.text());

  // DISABLE_LOGGING is interpolated by the compose file without a default; setting it
  // explicitly keeps compose from warning about an unset variable.
  writeFileSync(path.join(workDir, '.env'), `SPRINT=${variant}\nDISABLE_LOGGING=false\n`);
}

/**
 * Probes a URL. `expectOk` distinguishes two different questions:
 *  - false — did anything answer at all? (the server is up, whatever it replied)
 *  - true  — did it answer successfully? (the application is actually working)
 *
 * Both are needed, and conflating them deadlocks: the API returns 500 on every
 * endpoint until the database is seeded, but seeding requires the API container to
 * be reachable. So `up` waits for reachable, seeds, then waits for healthy.
 */
async function probe(url, expectOk) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return expectOk ? response.ok : true;
  } catch {
    return false;
  }
}

/** Polls a URL until it satisfies the given condition, or the deadline passes. */
async function waitFor(label, url, { expectOk, timeoutSeconds }) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  process.stdout.write(`Waiting for ${label} (up to ${timeoutSeconds}s)`);

  while (Date.now() < deadline) {
    if (await probe(url, expectOk)) {
      process.stdout.write(`\n  ${label} ready\n`);
      return true;
    }
    process.stdout.write('.');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  process.stdout.write('\n');
  return false;
}

/**
 * Resets and seeds the database. Retried because MariaDB accepts connections before
 * it is ready to serve, and the API container may still be warming up.
 */
async function seedDatabase() {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    console.log(`Seeding the database (attempt ${attempt}/5)...`);
    const status = run('docker', compose('exec', '-T', 'laravel-api', 'php', 'artisan', 'migrate:fresh', '--seed'));
    if (status === 0) return true;
    if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  return false;
}

async function commandUp(args) {
  requireDocker();

  const variant = valueOf(args, '--variant') || process.env.APP_VARIANT || defaultVariant;
  const timeoutSeconds = Number(valueOf(args, '--timeout') || process.env.APP_TIMEOUT || 600);
  const seed = !args.includes('--no-seed');

  console.log(`Starting the application under test (variant: ${variant}, compose ref: ${composeRef})`);
  await prepareWorkDir(variant);

  // --pull missing fetches the prebuilt images on first run and reuses them afterwards.
  if (run('docker', compose('up', '--pull', 'missing', '-d')) !== 0) {
    fail('`docker compose up` failed. Run `node scripts/app.mjs logs` to inspect the containers.');
  }

  const giveUp = (what) => {
    console.error(`\n${what} within ${timeoutSeconds}s.`);
    console.error('Inspect the containers with: node scripts/app.mjs logs');
    process.exit(1);
  };

  // The Angular dev server compiles on first start, so this is the slow wait.
  if (!(await waitFor(`UI   (${appUrl})`, appUrl, { expectOk: true, timeoutSeconds }))) {
    giveUp('The UI did not come up');
  }
  // Only reachability here — every API endpoint 500s until the database is seeded.
  if (!(await waitFor(`API  (${apiUrl})`, apiProbe, { expectOk: false, timeoutSeconds }))) {
    giveUp('The API did not become reachable');
  }

  if (seed) {
    if (!(await seedDatabase())) {
      fail('database seeding failed; the application is up but its data is not initialised.');
    }
    // Now that data exists, confirm the API actually serves it.
    if (!(await waitFor('API  data', apiProbe, { expectOk: true, timeoutSeconds: 120 }))) {
      fail(`seeding reported success but ${apiProbe} is still not returning 2xx.`);
    }
  }

  console.log('\nApplication is ready.');
  console.log(`  Point the suite at it with:  node scripts/app.mjs test`);
  console.log(`  or set APP_URL=${appUrl} for any Playwright invocation.`);
}

function commandDown(args) {
  requireDocker();
  if (!existsSync(path.join(workDir, composeFile))) {
    console.log('Nothing to stop — no compose file in .app/ (the stack was never started here).');
    return;
  }
  const extra = args.includes('--volumes') ? ['--volumes'] : [];
  process.exit(run('docker', compose('down', ...extra)));
}

async function commandStatus() {
  requireDocker();
  const uiReady = await probe(appUrl, true);
  const apiReady = await probe(apiProbe, true);
  console.log(`UI   ${uiReady ? 'ready' : 'not responding'}  ${appUrl}`);
  console.log(`API  ${apiReady ? 'ready' : 'not responding'}  ${apiUrl}`);

  if (existsSync(path.join(workDir, composeFile))) {
    run('docker', compose('ps'));
  }
  process.exit(uiReady && apiReady ? 0 : 1);
}

function commandLogs(args) {
  requireDocker();
  if (!existsSync(path.join(workDir, composeFile))) {
    fail('no compose file in .app/ — start the stack with `node scripts/app.mjs up` first.');
  }
  const service = args.find((arg) => !arg.startsWith('--'));
  const follow = args.includes('--follow') ? ['--follow'] : ['--tail', '200'];
  process.exit(run('docker', compose('logs', ...follow, ...(service ? [service] : []))));
}

/**
 * Runs the Playwright suite against the local instance by overriding the browser
 * target's address. `src/config/targets.ts` resolves APP_URL ahead of the committed
 * target in .harness/targets.json, so no configuration file is edited.
 */
function commandTest(args) {
  const passThrough = args[0] === '--' ? args.slice(1) : args;

  // Invoke Playwright's CLI entry point with this same Node binary rather than going
  // through `npx`. On Windows `npx` is a .cmd shim, and since the fix for
  // CVE-2024-27980 Node refuses to spawn .cmd/.bat without `shell: true` (EINVAL).
  // Resolving the CLI module sidesteps both the shim and the need for a shell.
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');

  process.exit(
    run(process.execPath, [cli, 'test', ...passThrough], {
      cwd: projectRoot,
      env: { ...process.env, APP_URL: appUrl },
    }),
  );
}

/** Reads `--flag value` from an argument list. */
function valueOf(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case 'up':
    await commandUp(args);
    break;
  case 'down':
    commandDown(args);
    break;
  case 'status':
    await commandStatus();
    break;
  case 'logs':
    commandLogs(args);
    break;
  case 'test':
    commandTest(args);
    break;
  default:
    console.error(`Usage: node scripts/app.mjs <up|down|status|logs|test> [options]

  up      [--variant <name>] [--no-seed] [--timeout <seconds>]   start and seed the stack
  down    [--volumes]                                            stop it (--volumes also drops data)
  status                                                         report readiness and container state
  logs    [service] [--follow]                                   show container logs
  test    [-- <playwright args>]                                 run the suite against the local instance
`);
    process.exit(command ? 1 : 0);
}
