import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  CoachIntakeSchemaUnavailableError,
  createCoachTextIntakeItem,
  listUnifiedCoachIntakeItems,
  mapCoachRowToIntakeItem,
  summarizeUnifiedItems,
} from '../../services/coachIntakeItemService.mjs';

const ORIGINAL_ENV = { ...process.env };

function fakeSequelize({ tableReady = true, listRows = [] } = {}) {
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
      if (sql.includes('FROM coach_intake_items')) return listRows;
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

  it('keeps clarification and duplicate holds out of the generic unprocessed bucket', () => {
    const items = [
      mapCoachRowToIntakeItem({
        id: '12121212-1212-4121-9121-121212121212',
        source_type: 'chat_narrative',
        status: 'NEEDS_CLARIFICATION',
        resolved_client_id: 7,
        uploaded_at: '2026-05-06T12:00:00.000Z',
        created_at: '2026-05-06T12:00:00.000Z',
        metadata_json: {},
      }),
      mapCoachRowToIntakeItem({
        id: '34343434-3434-4343-9434-343434343434',
        source_type: 'typed_note',
        status: 'DUPLICATE_HOLD',
        resolved_client_id: 8,
        uploaded_at: '2026-05-06T12:05:00.000Z',
        created_at: '2026-05-06T12:05:00.000Z',
        metadata_json: {},
      }),
    ];

    expect(items.map((item) => item.queueStatus)).toEqual(['needs_clarification', 'duplicate_hold']);
    expect(summarizeUnifiedItems(items)).toMatchObject({
      actionable: 2,
      unprocessed: 0,
      needsClarification: 1,
      duplicateHold: 1,
    });
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

  it('maps latest proposal metadata without exposing encrypted proposal contents', () => {
    const item = mapCoachRowToIntakeItem({
      id: '55555555-5555-4555-9555-555555555555',
      source_type: 'chat_narrative',
      status: 'READY_FOR_REVIEW',
      resolved_client_id: null,
      latest_proposal_id: '66666666-6666-4666-9666-666666666666',
      uploaded_at: '2026-05-06T12:00:00.000Z',
      created_at: '2026-05-06T12:00:00.000Z',
      metadata_json: {
        latestProposal: {
          id: '66666666-6666-4666-9666-666666666666',
          type: 'workout_log',
          status: 'PENDING',
          title: 'Review workout log draft',
          createdAt: '2026-05-06T12:05:00.000Z',
          rawTranscript: 'private raw transcript must not surface',
        },
      },
    });

    expect(item.latestProposalId).toBe('66666666-6666-4666-9666-666666666666');
    expect(item.latestProposal).toMatchObject({ type: 'workout_log', status: 'PENDING' });
    expect(JSON.stringify(item.latestProposal)).not.toMatch(/private raw transcript/i);
  });

  it('summarizes prepared draft status counts without exposing proposal contents', () => {
    const pendingItem = mapCoachRowToIntakeItem({
      id: '99999999-9999-4999-9999-999999999999',
      source_type: 'chat_narrative',
      status: 'READY_FOR_REVIEW',
      resolved_client_id: 12,
      latest_proposal_id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
      uploaded_at: '2026-05-06T12:00:00.000Z',
      created_at: '2026-05-06T12:00:00.000Z',
      metadata_json: {
        latestProposal: {
          id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa',
          type: 'workout_log',
          status: 'PENDING',
          title: 'Review private transcript details',
          rawTranscript: 'private transcript body',
        },
      },
    });
    const appliedItem = mapCoachRowToIntakeItem({
      id: 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb',
      source_type: 'typed_note',
      status: 'APPLIED',
      resolved_client_id: 12,
      latest_proposal_id: 'cccccccc-cccc-4ccc-9ccc-cccccccccccc',
      uploaded_at: '2026-05-06T12:05:00.000Z',
      created_at: '2026-05-06T12:05:00.000Z',
      metadata_json: {
        latestProposal: {
          id: 'cccccccc-cccc-4ccc-9ccc-cccccccccccc',
          type: 'workout_log',
          status: 'APPLIED',
        },
      },
    });

    const summary = summarizeUnifiedItems([pendingItem, appliedItem]);

    expect(summary).toMatchObject({
      preparedDrafts: 2,
      pendingDrafts: 1,
      appliedDrafts: 1,
      rejectedDrafts: 0,
      failedDrafts: 0,
    });
    expect(JSON.stringify(summary)).not.toMatch(/private transcript|Review private/i);
  });

  it('selects resolver and duplicate scan JSON for PII-safe hold summaries', async () => {
    const db = fakeSequelize({
      listRows: [{
        id: 'dddddddd-dddd-4ddd-9ddd-dddddddddddd',
        user_id: 7,
        source_type: 'chat_narrative',
        source_ref: 'coach:chat_narrative:dddd',
        status: 'DUPLICATE_HOLD',
        resolved_client_id: 42,
        recorded_at_start: null,
        uploaded_at: '2026-05-06T12:00:00.000Z',
        metadata_json: {},
        resolver_json: {},
        duplicate_scan_json: { duplicateCount: 2, topScore: 0.88 },
        latest_proposal_id: null,
        error_code: null,
        created_at: '2026-05-06T12:00:00.000Z',
      }],
    });

    const result = await listUnifiedCoachIntakeItems({
      userId: 7,
      scope: 'duplicate_hold',
      limit: 5,
      sequelizeOverride: db,
    });

    const selectSql = db.calls.find((call) => call.sql.includes('FROM coach_intake_items'))?.sql || '';
    expect(selectSql).toMatch(/resolver_json/);
    expect(selectSql).toMatch(/duplicate_scan_json/);
    expect(result.items[0].holdReason).toMatchObject({
      label: 'Possible duplicate workout',
      duplicateCount: 2,
      confidenceBand: 'high',
    });
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

  it('keeps unified summary totals independent from the active queue scope', async () => {
    process.env.PLAUD_MERGE_ENABLED = 'false';
    const db = fakeSequelize({
      listRows: [
        {
          id: '77777777-7777-4777-9777-777777777777',
          source_type: 'chat_narrative',
          status: 'RECEIVED',
          resolved_client_id: null,
          uploaded_at: '2026-05-06T12:00:00.000Z',
          created_at: '2026-05-06T12:00:00.000Z',
          metadata_json: {},
        },
        {
          id: '88888888-8888-4888-9888-888888888888',
          source_type: 'typed_note',
          status: 'READY_FOR_REVIEW',
          resolved_client_id: 42,
          uploaded_at: '2026-05-06T12:05:00.000Z',
          created_at: '2026-05-06T12:05:00.000Z',
          metadata_json: {},
        },
      ],
    });

    const result = await listUnifiedCoachIntakeItems({
      userId: 7,
      scope: 'needs_client',
      limit: 10,
      sequelizeOverride: db,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].needsClient).toBe(true);
    expect(result.summary).toMatchObject({ total: 2, actionable: 2, needsClient: 1, readyReview: 1 });
  });
});
