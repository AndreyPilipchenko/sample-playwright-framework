import type { MySqlConnectionConfig } from '../utils/MySqlActions';
import { databaseTarget } from './targets';

/**
 * All databases available to tests — one named entry per DB; specs pick what they need:
 *
 *   const dbsOrders = new DbsOrders(databases.appDb);   // wires MySqlActions inside
 *
 * Coordinates come from the database target the selected environment lists for the
 * name in .harness/targets.json, shared with the harness runtime (see targets.ts for the
 * environment rule and the per-machine overrides). The application's database is MariaDB,
 * so every target is reached through MySqlActions.
 * Credentials are secrets and come only from environment variables — the variable the
 * target names, set in the gitignored .env (copy .env.example to .env and fill it in).
 * Never commit a literal credential anywhere.
 */
export const databases = {
  /**
   * The application's MariaDB (engine `mysql`). Only the local environments have one
   * (targets `appDb-local` and `appDb-local-fixed`, credentials in APP_DB_LOCAL); the public
   * `hosted-with-bugs` and `hosted` instances expose no database, so DB-backed specs need a local environment.
   */
  appDb: databaseTarget('appDb'),
} satisfies Record<string, MySqlConnectionConfig>;
