/**
 * isoDateOnly utility tests
 * =========================
 * Locks strict validation for date-only API inputs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRealIsoDate } from '../../utils/isoDateOnly.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SEGMENTS_CTRL_SRC = readFileSync(
  resolve(__dirname, '../../controllers/plaud/plaudMergeSegmentsController.mjs'),
  'utf8',
);

describe('isRealIsoDate', () => {
  it('accepts real date-only ISO values', () => {
    expect(isRealIsoDate('2026-02-28')).toBe(true);
    expect(isRealIsoDate('2026-12-31')).toBe(true);
  });

  it('rejects normalized or malformed calendar dates', () => {
    expect(isRealIsoDate('2026-02-31')).toBe(false);
    expect(isRealIsoDate('2026-13-01')).toBe(false);
    expect(isRealIsoDate('2026-00-01')).toBe(false);
    expect(isRealIsoDate('2026-01-32')).toBe(false);
    expect(isRealIsoDate('2026-1-02')).toBe(false);
    expect(isRealIsoDate('2026-05-06T00:00:00.000Z')).toBe(false);
  });

  it('is used by the PLAUD segment parser instead of regex-only validation', () => {
    expect(SEGMENTS_CTRL_SRC).toMatch(/isRealIsoDate\(dateOverride\)/);
    expect(SEGMENTS_CTRL_SRC).toMatch(/SEGMENT_REFERENCE_DATE_INVALID/);
    expect(SEGMENTS_CTRL_SRC).not.toMatch(/DATE_OVERRIDE_REGEX/);
  });
});
