import { describe, expect, it, vi } from 'vitest';

// clientIntelligenceService imports the model registry and database at module
// scope; stub them so this stays a pure-logic test of the dedupe helper.
vi.mock('../models/index.mjs', () => new Proxy({}, {
  get: (_target, prop) => {
    // NEVER return a function for 'then': vitest awaits the mock factory's
    // result, and a Proxy that yields a function for 'then' is a thenable
    // whose callback is never invoked — the worker awaits forever and the
    // whole suite hangs at collection (observed 2026-07-02, deterministic).
    if (prop === 'then' || prop === Symbol.toStringTag) return undefined;
    return prop === 'Op' ? {} : vi.fn(() => ({}));
  },
}));
vi.mock('../database.mjs', () => ({ default: { query: vi.fn() } }));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { dedupeVariationHistoryRows } = await import('../services/clientIntelligenceService.mjs');

const row = (sessionDate, templateCategory, sessionType = 'build') => ({
  sessionDate,
  templateCategory,
  sessionType,
});

describe('dedupeVariationHistoryRows', () => {
  it('collapses same-category same-day rows to the newest and returns chronological order', () => {
    const rows = [
      row('2026-07-01T18:00:00.000Z', 'legs', 'switch'), // newest — kept
      row('2026-07-01T10:00:00.000Z', 'legs', 'build'),  // same day/category — dropped
      row('2026-06-29T10:00:00.000Z', 'legs', 'build'),
      row('2026-06-27T10:00:00.000Z', 'legs', 'build'),
    ];

    const deduped = dedupeVariationHistoryRows(rows);

    expect(deduped).toHaveLength(3);
    expect(deduped.map((r) => r.sessionType)).toEqual(['build', 'build', 'switch']);
  });

  it('keeps different categories on the same day separate', () => {
    const rows = [
      row('2026-07-01T18:00:00.000Z', 'legs'),
      row('2026-07-01T10:00:00.000Z', 'chest'),
    ];

    expect(dedupeVariationHistoryRows(rows)).toHaveLength(2);
  });

  it('keeps rows with unparseable dates instead of dropping history', () => {
    const rows = [
      row('not-a-date', 'legs'),
      row('also-bad', 'legs'),
    ];

    expect(dedupeVariationHistoryRows(rows)).toHaveLength(2);
  });
});
