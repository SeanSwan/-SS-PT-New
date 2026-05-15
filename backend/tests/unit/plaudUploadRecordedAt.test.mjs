import { describe, expect, it } from 'vitest';
import { _internal } from '../../controllers/plaud/plaudUploadController.mjs';

describe('plaudUploadController recordedAt normalization', () => {
  it('accepts valid source timestamps and rejects unsafe values', () => {
    expect(_internal.normalizeRecordedAt('2026-05-14T20:31:00.000Z')).toBe('2026-05-14T20:31:00.000Z');
    expect(_internal.normalizeRecordedAt('not-a-date')).toBeNull();
    expect(_internal.normalizeRecordedAt('')).toBeNull();
    expect(_internal.normalizeRecordedAt('2099-01-01T00:00:00.000Z')).toBeNull();
  });

  it('allows only trusted clip source overrides', () => {
    expect(_internal.normalizeClipSource('applaud_local_sync')).toBe('applaud_local_sync');
    expect(_internal.normalizeClipSource('applaud_webhook')).toBe('manual_upload');
    expect(_internal.normalizeClipSource('')).toBe('manual_upload');
  });
});
