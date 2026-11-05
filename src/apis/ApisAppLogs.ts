import { type APIRequestContext } from '@playwright/test';
import * as allure from 'allure-js-commons';
import { ApiActions } from '../utils/ApiActions';
import { applications } from '../config/applications';
import { expectToBeOneOf } from '../utils/Expects';

/** The application log file as a web visitor sees it (`GET /logs/laravel.log`), with no sign-in. */
export class ApisAppLogs {
  readonly apiActions: ApiActions;

  readonly laravelLog_serviceName = `${applications.app.apiUrl}/logs/laravel.log`;

  constructor(request: APIRequestContext) {
    this.apiActions = new ApiActions(request);
  }

  ///// Actions

  async getLaravelLogStatus(): Promise<number> {
    return await allure.step('Get the application log file without signing in', async () => {
      const response = await this.apiActions.get(this.laravelLog_serviceName);
      return response.status();
    });
  }

  ///// Validations

  /** The log file is not served to the public: 401, 403 or 404. */
  async verifyLogFileNotPublic(status: number) {
    await allure.step('Verify the application log file is not served to the public', async () => {
      expectToBeOneOf('the status of the application log file', status, [401, 403, 404]);
    });
  }
}
