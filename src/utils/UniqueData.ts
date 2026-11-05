import { randomUUID } from 'node:crypto';

/** A fresh identity for one attempt of one test: every record the test seeds carries it. */
export function newUuid(): string {
  return randomUUID();
}

/** Fills the `{uuid}` placeholder of a paired-JSON template, e.g. "Claw Hammer TC-PO-8 {uuid}". */
export function withUuid(template: string, uuid: string): string {
  return template.replace('{uuid}', uuid);
}

/**
 * The part of a UUID to search for. The product search finds nothing for a full hyphenated
 * UUID, while the first segment (8 hex characters, within the 3-40 character query rule)
 * still identifies exactly one run's records.
 */
export function searchTokenOf(uuid: string): string {
  return uuid.split('-')[0];
}

/** A copy of a paired-JSON user whose `{uuid}` email placeholder is filled, so the account is unique to one attempt. */
export function withUniqueEmail<T extends { email: string }>(user: T, uuid: string): T {
  return { ...user, email: withUuid(user.email, uuid) };
}
