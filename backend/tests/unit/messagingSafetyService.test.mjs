import { describe, expect, it } from 'vitest';

import {
  normalizeMessageSearchQuery,
  normalizeReportPayload,
  normalizeMuteUntil,
} from '../../services/messagingSafetyService.mjs';

describe('messagingSafetyService normalization', () => {
  it('normalizes server-side message search queries with conservative limits', () => {
    expect(normalizeMessageSearchQuery({ q: '  client   pain update ', limit: '250' })).toEqual({
      error: null,
      query: 'client pain update',
      limit: 100,
    });

    expect(normalizeMessageSearchQuery({ q: 'a' }).error).toBe('Search query must be at least 2 characters.');
    expect(normalizeMessageSearchQuery({ q: '  ' }).error).toBe('Search query must be at least 2 characters.');
  });

  it('normalizes moderation reports and mute horizons safely', () => {
    expect(normalizeReportPayload({ reason: ' HARASSMENT ', details: '  repeated spam  ' })).toEqual({
      error: null,
      reason: 'harassment',
      details: 'repeated spam',
    });

    expect(normalizeReportPayload({ reason: 'unknown' }).error).toBe('Unsupported report reason.');
    expect(normalizeMuteUntil('not-a-date')).toBeNull();
    expect(normalizeMuteUntil('2999-01-01T00:00:00.000Z')?.toISOString()).toBe('2999-01-01T00:00:00.000Z');
  });
});