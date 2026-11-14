import { type Locator } from '@playwright/test';
import { ACTION_DEFAULT_MS } from '../config/timeouts';

/**
 * Waits until the input has a value: for a field the page fills in by itself, such as one a lookup completes, so
 * the next step cannot run ahead of it. A synchronisation point, not a check; it times out with the action budget.
 */
export async function waitUntilFilled(field: Locator): Promise<void> {
  const input = await field.elementHandle();
  await field.page().waitForFunction((element) => (element as HTMLInputElement | null)?.value !== '', input, { timeout: ACTION_DEFAULT_MS });
}
