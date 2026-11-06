import { test as setup } from '@playwright/test';
import { applications } from '../src/config/applications';
import { authStateFile } from '../src/config/auth';
import { LoginPage } from '../src/pages/LoginPage';
import { HeaderPage } from '../src/pages/HeaderPage';
import { ApisUserAccount } from '../src/apis/ApisUserAccount';
import { discardSession, saveSession } from '../src/utils/AuthSession';
import { newUuid, withUniqueEmail } from '../src/utils/UniqueData';
import { loadTestData } from '../src/utils/TestData';

let setupData: typeof import('../resources/testData/AuthSetupJsonFile.json');

/**
 * Setup project: signs each role in once per run and saves its session for the
 * `role` fixture (src/fixtures/test.ts). Runs before the browser projects that depend on it.
 *
 * The customer is a disposable account registered through the API every run (unique email,
 * left behind on purpose), so native report detail never carries a shared customer
 * credential. The admin cannot be created through the API: it signs in with the
 * pre-existing account from .env, and is skipped, not failed, when that is not set.
 *
 * Never retried (`retries: 0` on the setup project): on this target an account locks
 * after ONE failed login (known defect #21), so a retry with bad credentials would
 * lock a shared demo account.
 */
setup.beforeAll(() => {
  setupData = loadTestData('AuthSetupJsonFile.json');
});

setup('authenticate as customer', async ({ page, request }) => {
  const user = withUniqueEmail(setupData.customer.user, newUuid());
  const apisUserAccount = new ApisUserAccount(request);
  const loginPage = new LoginPage(page);
  const headerPage = new HeaderPage(page);

  await apisUserAccount.registerUser(user);
  await loginPage.navigate();
  await loginPage.login(user.email, user.password);
  await headerPage.verifySignedIn();
  await saveSession(page, authStateFile('customer'));
});

setup('authenticate as admin', async ({ page }) => {
  const { username, password } = applications.app.accounts.admin;
  await discardSession(authStateFile('admin'));
  setup.skip(!username || !password, 'Set the admin account credentials in .env to enable admin specs');
  const loginPage = new LoginPage(page);
  const headerPage = new HeaderPage(page);

  await loginPage.navigate();
  await loginPage.login(username, password);
  await headerPage.verifySignedIn();
  await saveSession(page, authStateFile('admin'));
});
