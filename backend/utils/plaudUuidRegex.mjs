/**
 * plaudUuidRegex.mjs
 * ===================
 * Canonical UUID validation for PLAUD clipIds and mergeRequestIds.
 *
 * Phase 3 Slice 3.15 (2026-05-04). Codex Pass 2 MEDIUM #2 fix:
 * the prior `/^[0-9a-fA-F-]{36}$/` regex accepted strings like
 * 36 dashes which then crashed PostgreSQL `::uuid` cast.
 *
 * This regex enforces hyphen positions per RFC 4122 8-4-4-4-12.
 * It does NOT enforce the version nibble — we accept any UUID v1-v8
 * shape since UUIDs may originate from external systems / future
 * versions.
 */
export const PLAUD_UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isPlaudUuid(value) {
  return typeof value === 'string' && PLAUD_UUID_REGEX.test(value);
}
