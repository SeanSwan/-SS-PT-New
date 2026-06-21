/**
 * Gamification mapper runtime guards
 * ==================================
 * Shared primitive guards for gamification DTO mapping. These helpers reject
 * object/array coercion so backend or cache-shape drift cannot leak into UI
 * copy, identifiers, or point values.
 */

export type UnknownRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const safeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed !== '[object Object]' ? trimmed : null;
};

export const safeId = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  return safeText(value);
};

const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

const parseFinitePrimitiveNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const firstNonNegativeNumber = (...values: unknown[]): number => {
  for (const value of values) {
    const parsed = parseFinitePrimitiveNumber(value);
    if (parsed !== null) return Math.max(0, parsed);
  }
  return 0;
};

interface CollectionRowGuardOptions {
  idKeys?: string[];
  recordKeys?: string[];
  numberKeys?: string[];
}

const hasSafeIdField = (record: UnknownRecord, keys: string[] = []): boolean =>
  keys.some((key) => safeId(record[key]) !== null);

const hasRecordField = (record: UnknownRecord, keys: string[] = []): boolean =>
  keys.some((key) => isRecord(record[key]));

const hasFiniteNumberField = (record: UnknownRecord, keys: string[] = []): boolean =>
  keys.some((key) => parseFinitePrimitiveNumber(record[key]) !== null);

const rowMatchesGuard = (
  row: UnknownRecord,
  options?: CollectionRowGuardOptions
): boolean => {
  if (!options) return true;
  return (
    hasSafeIdField(row, options.idKeys)
    || hasRecordField(row, options.recordKeys)
    || hasFiniteNumberField(row, options.numberKeys)
  );
};

export const asGamificationCollection = <T,>(
  data: unknown,
  key: string,
  options?: CollectionRowGuardOptions
): T[] => {
  const record = isRecord(data) ? data : null;
  const payload = record?.success === false ? [] : (record?.[key] ?? data);

  if (!Array.isArray(payload)) return [];

  return payload.filter((item): item is T => (
    isRecord(item)
    && item.success !== false
    && rowMatchesGuard(item, options)
  ));
};
