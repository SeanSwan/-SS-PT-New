import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { _internal } from '../../controllers/plaud/plaudUploadController.mjs';
import { acceptedFromExisting } from '../../services/plaudUploadIdempotencyService.mjs';

const SRC = readFileSync(resolve(process.cwd(), 'controllers', 'plaud', 'plaudUploadController.mjs'), 'utf8');

describe('plaudUploadController official Plaud source support', () => {
  it('allows only upload-safe sources and accepts official Plaud sync', () => {
    expect(_internal.normalizeClipSource('applaud_local_sync')).toBe('applaud_local_sync');
    expect(_internal.normalizeClipSource('plaud_official_sync')).toBe('plaud_official_sync');
    expect(_internal.normalizeClipSource('applaud_webhook')).toBe('manual_upload');
    expect(_internal.normalizeClipSource('')).toBe('manual_upload');
  });

  it('normalizes official external ids without accepting unsafe values', () => {
    expect(_internal.normalizeClipExternalId(' rec_123-ABC:09 ')).toBe('rec_123-ABC:09');
    expect(_internal.normalizeClipExternalId('')).toBeNull();
    expect(_internal.normalizeClipExternalId('bad/id')).toBeNull();
    expect(_internal.normalizeClipExternalId('x'.repeat(256))).toBeNull();
  });

  it('persists clip_external_id with source-scoped ON CONFLICT idempotency', () => {
    expect(SRC).toMatch(/clip_external_id/);
    expect(SRC).toMatch(/ON CONFLICT \(clip_source, clip_external_id, user_id\)/);
    expect(SRC).toMatch(/WHERE clip_external_id IS NOT NULL/);
    expect(SRC).toMatch(/clipExternalId/);
  });

  it('does not advertise duplicate clips as playable unless the audio endpoint can serve them', () => {
    const file = { originalname: 'recording.m4a', size: 1234, mimetype: 'audio/m4a' };
    const baseRow = {
      clipId: '11111111-2222-3333-4444-555555555555',
      filename: 'recording.m4a',
      size: 1234,
      mimetype: 'audio/m4a',
      durationSec: '12.5',
      recordedAt: null,
      clipSource: 'plaud_official_sync',
      clipExternalId: 'rec_123',
      uploadedAt: '2026-02-10T18:00:00.000Z',
      expiresAt: '2026-02-11T18:00:00.000Z',
    };

    expect(acceptedFromExisting({ ...baseRow, status: 'pending_merge' }, file)).toMatchObject({
      playbackReady: true,
      playbackPath: '/api/plaud/clips/11111111-2222-3333-4444-555555555555/audio',
    });
    expect(acceptedFromExisting({ ...baseRow, status: 'expired' }, file)).toMatchObject({
      playbackReady: false,
      playbackPath: null,
    });
    expect(acceptedFromExisting({ ...baseRow, status: 'deleted' }, file)).toMatchObject({
      playbackReady: false,
      playbackPath: null,
    });
    expect(acceptedFromExisting({ ...baseRow, status: 'pending_merge', r2MirrorStatus: 'failed_terminal' }, file)).toMatchObject({
      playbackReady: false,
      playbackPath: null,
    });
  });

  it('does not count an in-flight official-sync duplicate as an accepted upload', () => {
    expect(SRC).toMatch(/existingBeforeProbe\.status === 'uploading'/);
    expect(SRC).toMatch(/CLIP_INGEST_IN_PROGRESS/);
    expect(SRC).toMatch(/existingAfterConflict\.status === 'uploading'/);
  });
});
