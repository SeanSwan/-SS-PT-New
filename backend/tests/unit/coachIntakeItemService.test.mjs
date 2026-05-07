import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  CoachIntakeSchemaUnavailableError,
  createCoachTextIntakeItem,
  mapCoachRowToIntakeItem,
  summarizeUnifiedItems,
} from '../../services/coachIntakeItemService.mjs';

const ORIGINAL_ENV = { ...process.env };

function fakeSequelize({ tableReady = true } = {}) {
  const calls = [];
  return {
    calls,
    async transaction(callback) {
      return callback({ fakeTransaction: true });
    },
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('to_regclass')) {
        return [{ items_exists: tableReady ? 'coach_intake_items' : null }];
      }
      if (sql.includes('INSERT INTO coach_intake_items')) {
        return [{
          id: options.replacements.id,
          user_id: options.replacements.userId,
          source_type: options.replacements.sourceType,
          source_ref: options.replacements.sourceRef,
          status: 'RECEIVED',
          resolved_client_id: options.replacements.clientId,
          recorded_at_start: null,
          uploaded_at: '2026-05-06T12:00:00.000Z',
          metadata_json: JSON.parse(options.replacements.metadataJson),
          error_code: null,
          created_at: '2026-05-06T12:00:00.000Z',
        }];
      }
      return [];
    },
  };
}

describe('coachIntakeItemService', () => {
  beforeEach(() => {
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID = 'VTEST';
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_VTEST = Buffer.alloc(32, 7).toString('base64');
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('creates encrypted text intake without sending raw note text into SQL replacements', async () => {
    const db = fakeSequelize();
    const item = await createCoachTextIntakeItem({
      userId: 7,
      clientId: 42,
      text: 'Marcus private onboarding note with goals and workout details.',
      sequelizeOverride: db,
    });

    expect(item).toMatchObject({
      kind: 'coach_intake',
      source: 'chat_narrative',
      queueStatus: 'unprocessed',
      clientId: 42,
      needsClient: false,
    });
    const serialized = JSON.stringify(db.calls.map((call) => call.options?.replacements), (_key, value) => (
      Buffer.isBuffer(value) ? '<buffer>' : value
    ));
    expect(serialized).not.toContain('Marcus private onboarding note');
    expect(serialized).toContain('textSha256');
  });

  it('fails closed when the migration has not created the intake table yet', async () => {
    await expect(createCoachTextIntakeItem({
      userId: 7,
      text: 'Long enough trainer note.',
      sequelizeOverride: fakeSequelize({ tableReady: false }),
    })).rejects.toBeInstanceOf(CoachIntakeSchemaUnavailableError);
  });

  it('summarizes Coach items using the shared queue buckets', () => {
    const items = [
      mapCoachRowToIntakeItem({
        id: '11111111-1111-1111-1111-111111111111',
        source_type: 'chat_narrative',
        status: 'READY_FOR_REVIEW',
        resolved_client_id: null,
        uploaded_at: '2026-05-06T12:00:00.000Z',
        created_at: '2026-05-06T12:00:00.000Z',
        metadata_json: { charCount: 12000, wordCount: 1800 },
      }),
      mapCoachRowToIntakeItem({
        id: '22222222-2222-2222-2222-222222222222',
        source_type: 'typed_note',
        status: 'FAILED',
        resolved_client_id: 9,
        uploaded_at: '2026-05-05T12:00:00.000Z',
        created_at: '2026-05-05T12:00:00.000Z',
        metadata_json: {},
      }),
    ];

    expect(summarizeUnifiedItems(items, { now: new Date('2026-05-06T14:00:00.000Z') }))
      .toMatchObject({ total: 2, actionable: 2, readyReview: 1, failed: 1, needsClient: 1, today: 1 });
  });

  it('maps audio puzzle metadata into compact queue facts', () => {
    const item = mapCoachRowToIntakeItem({
      id: '33333333-3333-3333-3333-333333333333',
      source_type: 'audio_upload',
      status: 'RECEIVED',
      resolved_client_id: null,
      uploaded_at: '2026-05-06T12:00:00.000Z',
      created_at: '2026-05-06T12:00:00.000Z',
      metadata_json: {
        audioPuzzle: {
          pieceCount: 3,
          bundleCount: 2,
          autoBundleCount: 1,
          needsOrderingReview: true,
          confidence: 'low',
          rawFileNames: ['Marcus private clip.m4a'],
        },
      },
    });

    expect(item.audioPuzzle).toMatchObject({
      pieceCount: 3,
      bundleCount: 2,
      autoBundleCount: 1,
      needsOrderingReview: true,
      confidence: 'low',
    });
    expect(JSON.stringify(item.audioPuzzle)).not.toMatch(/Marcus|private clip/i);
  });

  it('gives audio-like intake items a single-piece puzzle fallback', () => {
    const item = mapCoachRowToIntakeItem({
      id: '44444444-4444-4444-4444-444444444444',
      source_type: 'voice_note',
      status: 'RECEIVED',
      resolved_client_id: null,
      uploaded_at: '2026-05-06T12:00:00.000Z',
      created_at: '2026-05-06T12:00:00.000Z',
      metadata_json: {},
    });

    expect(item.audioPuzzle).toMatchObject({
      pieceCount: 1,
      bundleCount: 1,
      autoBundleCount: 0,
      needsOrderingReview: false,
      confidence: 'single',
    });
  });
});
