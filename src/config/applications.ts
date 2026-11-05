// Example skeleton — adapt to your project (ships with the harness package).
import { apiUrl, appUrl } from './targets';

/**
 * All applications under test — one named entry per app; specs and page classes
 * pick what they need for the owning page's route:
 *
 *   readonly url: string = `${applications.app.url}/login`;
 *
 * Addresses come from the browser and API targets of the same name in .harness/targets.json,
 * shared with the harness runtime (see targets.ts for the per-machine override).
 * Credentials are secrets: account identifiers and passwords come only from
 * environment variables — set them in the gitignored .env at the repo root
 * (loaded by dotenv in playwright.config.ts; copy .env.example to .env and
 * fill in the values). Never commit a literal credential here, and never let
 * one surface in a step title, log, or attachment.
 */
export const applications = {
  app: {
    name: 'app',
    url: appUrl('app'),
    /** REST API base URL; API service classes build their `_serviceName` endpoints on it. */
    apiUrl: apiUrl('app'),
    /**
     * Pre-existing accounts, for roles the API cannot create; setup/auth.setup.ts signs each
     * one in once per run. The customer role needs none: the setup registers a disposable
     * customer every run, so no shared customer credential reaches a report.
     */
    accounts: {
      admin: {
        username: process.env.APP_ADMIN_USERNAME ?? '',
        password: process.env.APP_ADMIN_PASSWORD ?? '',
      },
    },
  },
};
