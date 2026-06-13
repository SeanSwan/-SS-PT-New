/**
 * ISO date-only normalization helpers.
 *
 * Use for route/query/API values that may arrive as YYYY-MM-DD or an ISO
 * timestamp, but need to be reduced to a validated YYYY-MM-DD token without
 * applying local-calendar drift.
 */
export function normalizeIsoDateOnly(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return null;

  const dateOnly = trimmed.slice(0, 10);
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : dateOnly;
}
