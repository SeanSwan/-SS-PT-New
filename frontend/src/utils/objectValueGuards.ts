/**
 * Shared defensive value guards for JSON-shaped API and plan payloads.
 *
 * Keeps runtime parsing small and consistent when data can arrive from saved
 * plans, generated plans, or backend JSON columns.
 */

export const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export const toPositiveInteger = (value: unknown, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
