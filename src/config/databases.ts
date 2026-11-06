import type { DBConnectionConfig } from '../utils/DBActions';
import type { MySqlConnectionConfig } from '../utils/MySqlActions';
import { databaseTarget } from './targets';

/**
 * All databases available to tests — one named entry per DB; specs pick what they need:
 *
 *   const dbsOrders = new DbsOrders(databases.appDb);   // wires MySqlActions inside
 *
 * Coordinates come from the database target the selected environment lists for the
 * name in .harness/targets.json, shared with the harness runtime (see targets.ts for the
 * environment rule and the per-machine overrides). The facade follows the target's
 * engine: `mysql` → MySqlActions, `sqlserver` → DBActions.
 * Credentials are secrets and come only from environment variables — the variable the
 * target names, set in the gitignored .env (copy .env.example to .env and fill it in).
 * Never commit a literal credential anywhere.
 */
export const databases = {
  /**
   * The application's MariaDB (engine `mysql`). Only the `local` environment has one
   * (target `appDb-local`, credentials in APP_DB_LOCAL); the public `practice` instance
   * exposes no database, so DB-backed specs need TEST_ENV=local.
   */
  appDb: databaseTarget('appDb'),
} satisfies Record<string, DBConnectionConfig | MySqlConnectionConfig>;
