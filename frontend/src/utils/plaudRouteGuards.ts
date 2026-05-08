/**
 * plaudRouteGuards.ts
 * ===================
 *
 * Shared frontend route guards for PLAUD review deep links. Keep this in sync
 * with backend UUID validation so Coach action cards and the PLAUD workspace
 * fail closed the same way before a merge review route is opened.
 */

const PLAUD_MERGE_REQUEST_ID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isPlaudMergeRequestId(value: unknown): value is string {
  return typeof value === 'string' && PLAUD_MERGE_REQUEST_ID_RE.test(value);
}

export function parsePlaudMergeRequestId(value: unknown): string | null {
  return isPlaudMergeRequestId(value) ? value : null;
}
