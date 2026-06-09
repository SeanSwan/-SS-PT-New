/**
 * AdminSessionsDeepLink.logic.ts
 * =============================
 * Owns query-string parsing for activation-queue handoffs into the canonical
 * admin sessions surface. The sessions page owns dialog state; this helper only
 * accepts a strict positive integer clientId so malformed links cannot prefill
 * a session creation payload.
 */

const POSITIVE_INTEGER_ID = /^[1-9]\d*$/;

export function getAdminSessionsClientIdFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  const clientId = params.get('clientId')?.trim() || '';

  return POSITIVE_INTEGER_ID.test(clientId) ? clientId : '';
}
