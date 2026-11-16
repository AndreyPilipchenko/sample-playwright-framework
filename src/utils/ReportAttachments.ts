import { test, type TestInfo } from '@playwright/test';

/**
 * The report plumbing the logging facades (ApiActions, MySqlActions) share: serializing a payload
 * without throwing, capping its size, attaching it to the current step, and telling whether a test
 * is running. Redaction is not here: each facade masks its own payloads before they arrive, with the
 * rules of its technology.
 */

/** JSON.stringify that never throws — handles circular references, BigInt, and Buffers. */
export function safeStringify(value: unknown, indent = 0): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === 'bigint') return val.toString();
      if (Buffer.isBuffer(val)) return `<Buffer ${val.length} bytes>`;
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '<circular>';
        seen.add(val);
      }
      return val;
    }, indent) ?? String(value);
  } catch (err) {
    return `<unserializable: ${err instanceof Error ? err.message : String(err)}>`;
  }
}

/** Caps a string at `maxLength`, appending a note with how much was cut. */
export function clip(text: string, maxLength: number): { text: string; truncated: boolean } {
  if (text.length <= maxLength) return { text, truncated: false };
  return {
    text: `${text.slice(0, maxLength)}\n…[truncated ${text.length - maxLength} of ${text.length} chars]`,
    truncated: true,
  };
}

/**
 * Attaches a payload as pretty-printed JSON to the current step (text/plain when truncated).
 * Call it from inside the step body: allure-playwright nests `test.info().attach()` in the step.
 */
export async function attachJson(name: string, payload: unknown, maxLength: number): Promise<void> {
  const { text, truncated } = clip(safeStringify(payload, 2), maxLength);
  await test.info().attach(name, {
    body: text,
    contentType: truncated ? 'text/plain' : 'application/json',
  });
}

/** Returns the active TestInfo, or undefined when not inside a running test (test.info() throws there). */
export function currentTestInfo(): TestInfo | undefined {
  try {
    return test.info();
  } catch {
    return undefined;
  }
}
