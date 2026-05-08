import { describe, expect, it } from 'vitest';

import {
  COACH_INTAKE_RETENTION_PURGE_CONFIRM_TOKEN,
  CoachIntakeRetentionPurgeBlockedError,
  purgeCoachIntakeRawArtifacts,
} from '../../services/coachIntakeRetentionPurgeService.mjs';

const APPLIED_ID = '11111111-1111-4111-8111-111111111111';
const FAILED_ID = '22222222-2222-4222-8222-222222222222';
const STALE_REVIEW_ID = '33333333-3333-4333-8333-333333333333';

function retentionRow(overrides = {}) {
  return {
    id: APPLIED_ID,
    status: 'APPLIED',
    source_type: 'chat_narrative',
    has_payload_cipher: true,
    has_payload_iv: true,
    has_payload_tag: true,
    uploaded_at: '2026-05-04T12:00:00.000Z',
    updated_at: '2026-05-04T12:10:00.000Z',
    archived_at: '2026-05-04T12:10:00.000Z',
    created_at: '2026-05-04T12:00:00.000Z',
    ...overrides,
  };
}

function fakeSequelize({ tableReady = true, rows = [], updateRows = [] } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('to_regclass')) {
        return [{ items_exists: tableReady ? 'coach_intake_items' : null }];
      }
      if (/^\s*UPDATE coach_intake_items/i.test(sql)) return updateRows;
      if (/^\s*INSERT INTO coach_intake_events/i.test(sql)) {
        return [{ id: options.replacements.eventId }];
      }
      if (/FROM coach_intake_items/i.test(sql)) return rows;
      return [];
    },
  };
}

describe('coachIntakeRetentionPurgeService', () => {
  it('dry-runs purge candidates while disabled without clearing raw artifact columns', async () => {
    const db = fakeSequelize({ rows: [retentionRow()] });

    const result = await purgeCoachIntakeRawArtifacts({
      userId: 11,
      now: new Date('2026-05-07T13:00:00.000Z'),
      sequelizeOverride: db,
    });

    expect(result).toMatchObject({
      enabled: false,
      dryRun: true,
      schemaReady: true,
      purgeReady: 1,
      purged: 0,
      skippedReason: 'disabled',
    });
    expect(result.candidateIds).toEqual([APPLIED_ID]);
    expect(db.calls.some((call) => /^\s*UPDATE coach_intake_items/i.test(call.sql))).toBe(false);
  });

  it('blocks live purge unless the flag and confirmation token are present', async () => {
    const db = fakeSequelize({ rows: [retentionRow()] });

    await expect(purgeCoachIntakeRawArtifacts({
      userId: 11,
      dryRun: false,
      enabled: false,
      confirmToken: COACH_INTAKE_RETENTION_PURGE_CONFIRM_TOKEN,
      sequelizeOverride: db,
    })).rejects.toMatchObject({
      code: 'COACH_INTAKE_RETENTION_PURGE_DISABLED',
    });

    await expect(purgeCoachIntakeRawArtifacts({
      userId: 11,
      dryRun: false,
      enabled: true,
      confirmToken: 'wrong-token',
      sequelizeOverride: db,
    })).rejects.toBeInstanceOf(CoachIntakeRetentionPurgeBlockedError);

    await expect(purgeCoachIntakeRawArtifacts({
      userId: 11,
      dryRun: false,
      enabled: true,
      confirmToken: 'wrong-token',
      sequelizeOverride: db,
    })).rejects.toMatchObject({
      code: 'COACH_INTAKE_RETENTION_PURGE_CONFIRMATION_REQUIRED',
    });
    expect(db.calls.some((call) => /^\s*UPDATE coach_intake_items/i.test(call.sql))).toBe(false);
  });

  it('clears only raw artifact columns for purge-ready rows when explicitly confirmed', async () => {
    const db = fakeSequelize({
      rows: [
        retentionRow({ id: APPLIED_ID, status: 'APPLIED' }),
        retentionRow({
          id: FAILED_ID,
          status: 'FAILED',
          source_type: 'audio_upload',
          uploaded_at: '2026-04-20T12:00:00.000Z',
          updated_at: '2026-04-20T12:10:00.000Z',
          archived_at: null,
          created_at: '2026-04-20T12:00:00.000Z',
        }),
        retentionRow({
          id: STALE_REVIEW_ID,
          status: 'READY_FOR_REVIEW',
          source_type: 'typed_note',
          uploaded_at: '2026-03-20T12:00:00.000Z',
          updated_at: '2026-03-20T12:10:00.000Z',
          archived_at: null,
          created_at: '2026-03-20T12:00:00.000Z',
        }),
      ],
      updateRows: [{ id: APPLIED_ID }, { id: FAILED_ID }],
    });

    const result = await purgeCoachIntakeRawArtifacts({
      userId: 11,
      now: new Date('2026-05-07T13:00:00.000Z'),
      dryRun: false,
      enabled: true,
      confirmToken: COACH_INTAKE_RETENTION_PURGE_CONFIRM_TOKEN,
      sequelizeOverride: db,
    });

    expect(result).toMatchObject({
      enabled: true,
      dryRun: false,
      purgeReady: 2,
      purged: 2,
      skippedReason: null,
    });
    expect(result.candidateIds).toEqual([APPLIED_ID, FAILED_ID]);

    const updateCall = db.calls.find((call) => /^\s*UPDATE coach_intake_items/i.test(call.sql));
    expect(updateCall.sql).toMatch(/payload_cipher\s*=\s*NULL/i);
    expect(updateCall.sql).toMatch(/payload_iv\s*=\s*NULL/i);
    expect(updateCall.sql).toMatch(/payload_tag\s*=\s*NULL/i);
    expect(updateCall.sql).toMatch(/WHERE user_id = :userId/i);
    expect(updateCall.sql).toMatch(/id IN \(:candidateIds\)/i);
    expect(updateCall.sql).toMatch(/status IN \('APPROVED', 'APPLIED', 'ARCHIVED'\)/i);
    expect(updateCall.sql).toMatch(/status = 'FAILED'/i);
    expect(updateCall.sql).not.toMatch(/\bDELETE\b/i);
    expect(updateCall.options.replacements.appliedCutoff).toBe('2026-05-06T13:00:00.000Z');
    expect(updateCall.options.replacements.failedCutoff).toBe('2026-04-30T13:00:00.000Z');
    expect(updateCall.options.replacements.candidateIds).toEqual([APPLIED_ID, FAILED_ID]);
    expect(updateCall.options.replacements.candidateIds).not.toContain(STALE_REVIEW_ID);

    const eventCalls = db.calls.filter((call) => /^\s*INSERT INTO coach_intake_events/i.test(call.sql));
    expect(eventCalls).toHaveLength(2);
    expect(eventCalls[0].options.replacements.eventJson).toContain('raw_artifact_purged');
  });
});
