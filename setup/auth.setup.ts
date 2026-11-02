import { test as setup } from '@playwright/test';
import { applications } from '../src/config/applications';
import { authStateFile, roles } from '../src/config/auth';
import { LoginPage } from '../src/pages/LoginPage';
import { HeaderPage } from '../src/pages/HeaderPage';
import { saveSession } from '../src/utils/AuthSession';

/**
 * Setup project: signs each role in once per run and saves its session for the
 * `role` fixture (src/fixtures/test.ts). Runs before the browser projects that depend on it.
 *
 * Never retried (`retries: 0` on the setup project): on this target an account locks
 * after ONE failed login (known defect #21), so a retry with bad credentials would
 * lock a shared demo account.
 * A role whose credentials are not set in .env is skipped, not failed, so anonymous
 * specs still run.
 */
for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const { username, password } = applications.app.accounts[role];
    setup.skip(!username || !password, `Set the ${role} account credentials in .env to enable ${role} specs`);

    const loginPage = new LoginPage(page);
    const headerPage = new HeaderPage(page);

    await loginPage.navigate();
    await loginPage.login(username, password);
    await headerPage.verifySignedIn();
    await saveSession(page, authStateFile(role));
  });
}
