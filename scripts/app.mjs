#!/usr/bin/env node
/**
 * Runs the application under test locally in Docker, so the suite can be exercised
 * against a private instance instead of the shared public one.
 *
 *   node scripts/app.mjs up      [--env local|local-fixed] [--no-seed] [--timeout <seconds>]
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
 * application source is cloned: that file plus an `.env` naming the build is all
 * Docker needs. Building from source is the upstream repo's own documented workflow
 * and is not reproduced here.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
/** Gitignored scratch directory holding the compose file and its .env. */
const workDir = path.join(projectRoot, '.app');
const composeFile = 'docker-compose.prod.yml';
/**
 * Local addition to the upstream file. The API's .env points its mail at host `mailcatcher`
 * (SMTP 1025), but the upstream prod compose file defines no such service, so every request that
 * sends mail (creating an invoice, ...) fails with a 500. This sink accepts that mail and drops it
 * in a web inbox on :1080.
 */
const mailComposeFile = 'docker-compose.mail.yml';
const mailCompose = `services:
  mailcatcher:
    image: sj26/mailcatcher
    ports:
      - 1080:1080
`;
/** Compose project name — keeps `down` deterministic and avoids clashing with other stacks. */
const composeProject = 'pst-local';

/**
 * The environments this stack can serve, each with the upstream build it runs. `local` is the
 * with-bugs build, the same one `hosted-with-bugs` serves, so it carries the same intentional
 * defects; `local-fixed` is the build without them. Both use the same ports, so one runs at a time.
 * `SPRINT` is the upstream compose file's own interpolation variable (it selects the image tag),
 * which is why that name appears in the generated .env; nothing outside this script uses it.
 */
const upstreamBuilds = { local: 'sprint5-with-bugs', 'local-fixed': 'sprint5' };
const defaultEnvironment = 'local';
const composeRef = process.env.APP_COMPOSE_REF || 'main';
const composeUrl = `https://raw.githubusercontent.com/testsmith-io/practice-software-testing/${composeRef}/${composeFile}`;

/**
 * Addresses are fixed by the upstream compose file, so they are the same for every local
 * environment; they live in `.harness/targets.json` like every other environment's. `test`
 * selects the running stack's environment through TEST_ENV, the switch src/config/targets.ts reads.
 */
const readHarness = (name) => JSON.parse(readFileSync(path.join(projectRoot, '.harness', name), 'utf8'));
const harnessTargets = readHarness('targets.json');
const localProfile = readHarness('project.json').environments?.[defaultEnvironment];
const appUrl = harnessTargets.browser?.[localProfile?.browserTargets?.[0]]?.origins?.[0];
const apiUrl = harnessTargets.api?.[localProfile?.apiTargets?.[0]]?.baseUrl?.replace(/\/+$/, '');
if (!appUrl || !apiUrl) {
  console.error(`app.mjs: the '${defaultEnvironment}' environment in .harness/project.json needs a browser target and an API target.`);
  process.exit(1);
}
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
const compose = (...args) => ['compose', '-f', composeFile, '-f', mailComposeFile, '--project-name', composeProject, ...args];

/**
 * Writes the compose file and its .env into the work directory.
 * Re-downloads on every `up` so a stale cached file cannot silently pin an old stack.
 */
async function prepareWorkDir(environment) {
  mkdirSync(workDir, { recursive: true });

  const response = await fetch(composeUrl);
  if (!response.ok) {
    fail(`could not download ${composeFile} from ${composeRef} (HTTP ${response.status}).`);
  }
  writeFileSync(path.join(workDir, composeFile), await response.text());
  writeFileSync(path.join(workDir, mailComposeFile), mailCompose);

  // DISABLE_LOGGING is interpolated by the compose file without a default; setting it
  // explicitly keeps compose from warning about an unset variable.
  writeFileSync(path.join(workDir, '.env'), `SPRINT=${upstreamBuilds[environment]}\nDISABLE_LOGGING=false\n`);
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
    if (status === 0) {
      // The cron container runs as root and shares the code volume. If its scheduler logs an error before
      // the tables exist (a fresh volume), it creates storage/logs/laravel.log owned by root, and every API
      // request that logs then fails with a 500. Hand the log directory back to the API's user.
      run('docker', compose('exec', '-T', '-u', 'root', 'laravel-api', 'chown', '-R', 'www-data:www-data', 'storage/logs'));
      return true;
    }
    if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  return false;
}

async function commandUp(args) {
  requireDocker();

  const environment = valueOf(args, '--env') || defaultEnvironment;
  if (!Object.hasOwn(upstreamBuilds, environment)) {
    fail(`--env must be one of ${Object.keys(upstreamBuilds).join(', ')} (got "${environment}").`);
  }
  const timeoutSeconds = Number(valueOf(args, '--timeout') || process.env.APP_TIMEOUT || 600);
  const seed = !args.includes('--no-seed');

  console.log(`Starting the application under test (environment: ${environment}, compose ref: ${composeRef})`);
  // The API's code lives in a named volume (laravel-app-code) that Docker fills from the image only
  // while the volume is empty. A stack last started for the other environment would keep serving that
  // build's API under the new image, so switching environments removes the volumes (code and data) first.
  const previous = existsSync(path.join(workDir, '.env')) ? environmentOfEnvFile() : undefined;
  if (previous && previous !== environment && existsSync(path.join(workDir, composeFile))) {
    console.log(`Removing the ${previous} stack and its volumes before starting ${environment}.`);
    if (run('docker', compose('down', '--volumes')) !== 0) fail('`docker compose down --volumes` failed.');
  }
  await prepareWorkDir(environment);

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
  console.log(`  or set TEST_ENV=${environment} for any Playwright invocation.`);
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
  if (existsSync(path.join(workDir, '.env'))) console.log(`Env  ${runningEnvironment()}`);
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
 * Runs the Playwright suite against the local instance by selecting the `local`
 * harness environment: `src/config/targets.ts` then resolves every browser and API
 * address from that environment's targets, so no configuration file is edited.
 */
function commandTest(args) {
  const passThrough = args[0] === '--' ? args.slice(1) : args;
  // A TEST_ENV that is not a local stack (a public site) needs no stack: it runs as given.
  // Otherwise the suite targets the running stack, and a different local TEST_ENV is a mistake.
  const requested = process.env.TEST_ENV;
  const environment = requested && !Object.hasOwn(upstreamBuilds, requested) ? requested : runningEnvironment();
  if (requested && requested !== environment) {
    fail(`TEST_ENV=${requested}, but the running stack is ${environment}. Unset TEST_ENV or start the other stack.`);
  }

  // Invoke Playwright's CLI entry point with this same Node binary rather than going
  // through `npx`. On Windows `npx` is a .cmd shim, and since the fix for
  // CVE-2024-27980 Node refuses to spawn .cmd/.bat without `shell: true` (EINVAL).
  // Resolving the CLI module sidesteps both the shim and the need for a shell.
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');

  process.exit(
    run(process.execPath, [cli, 'test', ...passThrough], {
      cwd: projectRoot,
      env: { ...process.env, TEST_ENV: environment },
    }),
  );
}

/** The environment of the stack last started with `up`, read back from the build named in .app/.env. */
function runningEnvironment() {
  if (!existsSync(path.join(workDir, '.env'))) fail('no stack has been started here; run `node scripts/app.mjs up` first.');
  const environment = environmentOfEnvFile();
  if (!environment) fail(`.app/.env names a build no environment uses; run \`node scripts/app.mjs up\` again.`);
  return environment;
}

/** The environment whose build .app/.env names, or undefined when it names none. */
function environmentOfEnvFile() {
  const build = readFileSync(path.join(workDir, '.env'), 'utf8').match(/^SPRINT=(.*)$/m)?.[1]?.trim();
  return Object.keys(upstreamBuilds).find((name) => upstreamBuilds[name] === build);
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

  up      [--env local|local-fixed] [--no-seed] [--timeout <s>]  start and seed the stack
  down    [--volumes]                                            stop it (--volumes also drops data)
  status                                                         report readiness and container state
  logs    [service] [--follow]                                   show container logs
  test    [-- <playwright args>]                                 run the suite against the local instance
`);
    process.exit(command ? 1 : 0);
}
