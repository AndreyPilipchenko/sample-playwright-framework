import * as allure from 'allure-js-commons';
import { MySqlActions, type MySqlConnectionConfig } from '../utils/MySqlActions';
import { expectToBe } from '../utils/Expects';

/**
 * Customer accounts in the application's database. Only the `local` environment has one
 * (`databases.appDb`, credentials in APP_DB_LOCAL); the with-bugs API offers no way to
 * disable an account (its user update drops `enabled`), so the database is the only route.
 */
export class DbsUserAccount {
  readonly disableUserByEmail_query = 'UPDATE users SET enabled = 0 WHERE email = :email';

  private readonly dbActions: MySqlActions;

  constructor(config: MySqlConnectionConfig) {
    this.dbActions = new MySqlActions(config);
  }

  /** Closes the underlying connection pool — call from afterAll. */
  async close(): Promise<void> {
    await this.dbActions.close();
  }

  ///// Actions

  /**
   * Disables the account registered with this email. The row-count check is a setup postcondition guard
   * (service-classes practice 12): if no account changed, the case would pass or fail without testing anything.
   */
  async disableUser(email: string): Promise<void> {
    await allure.step('Disable the customer account in the database', async () => {
      const { rowsAffected } = await this.dbActions.query(this.disableUserByEmail_query, { email });
      expectToBe('the number of disabled accounts', rowsAffected, 1);
    });
  }
}
