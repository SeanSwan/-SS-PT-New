/**
 * coachIntakeReviewActionsService.test.mjs
 * ========================================
 * Locks deterministic review actions for Coach intake items. These actions
 * clear review gates only; they never write client records or workout logs.
 */
import { describe, expect, it, vi } from 'vitest';

import { CoachIntakeValidationError } from '../../services/coachIntakeConstants.mjs';
import { confirmCoachIntakeAudioOrder } from '../../services/coachIntakeReviewActionsService.mjs';

const BASE_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: 7,
  source_type: 'audio_upload',
  source_ref: 'coach:audio_upload:11111111-1111-4111-8111-111111111111',
  status: 'RECEIVED',
  resolved_client_id: null,
  recorded_at_start: '2026-05-06T12:00:00.000Z',
  uploaded_at: '2026-05-06T12:01:00.000Z',
  created_at: '2026-05-06T12:01:00.000Z',
  latest_proposal_id: '22222222-2222-4222-8222-222222222222',
  metadata_json: {
    latestProposal: {
      id: '22222222-2222-4222-8222-222222222222',
      type: 'workout_log',
      status: 'PENDING',
      title: 'Review workout log draft',
    },
    audioPuzzle: {
      pieceCount: 3,
      bundleCount: 2,
      autoBundleCount: 1,
      needsOrderingReview: true,
      confidence: 'low',
      rawFileNames: ['Marcus-private-clip.m4a'],
    },
  },
  error_code: null,
};

function fakeSequelize({ tableReady = true, row = BASE_ROW } = {}) {
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
      if (sql.includes('FOR UPDATE')) {
        return row ? [row] : [];
      }
      if (sql.includes('UPDATE coach_intake_items')) {
        return [{
          ...row,
          metadata_json: {
            ...row.metadata_json,
            audioPuzzle: {
              ...row.metadata_json.audioPuzzle,
              needsOrderingReview: false,
              orderConfirmed: true,
              orderConfirmedAt: options.replacements.confirmedAt,
              orderConfirmedByUserId: 7,
            },
          },
        }];
      }
      if (sql.includes('INSERT INTO coach_intake_events')) {
        return [];
      }
      return [];
    },
  };
}

describe('coach intake review actions', () => {
  it('confirms audio order with safe metadata patches and compact queue facts', async () => {
    const db = fakeSequelize();

    const item = await confirmCoachIntakeAudioOrder({
      userId: 7,
      intakeId: BASE_ROW.id,
      sequelizeOverride: db,
      now: new Date('2026-05-07T10:00:00.000Z'),
    });

    expect(item).toMatchObject({
      kind: 'coach_intake',
      entityId: BASE_ROW.id,
      audioPuzzle: {
        pieceCount: 3,
        bundleCount: 2,
        autoBundleCount: 1,
        needsOrderingReview: false,
        confidence: 'low',
      },
      latestProposalId: '22222222-2222-4222-8222-222222222222',
    });

    const serializedReplacements = JSON.stringify(db.calls.map((call) => call.options?.replacements));
    expect(serializedReplacements).not.toMatch(/Marcus-private-clip/i);
    expect(serializedReplacements).toContain('confirm_audio_order');
  });

  it('rejects attempts to confirm an intake outside the authenticated user scope', async () => {
    await expect(confirmCoachIntakeAudioOrder({
      userId: 7,
      intakeId: BASE_ROW.id,
      sequelizeOverride: fakeSequelize({ row: null }),
    })).rejects.toMatchObject({
      name: 'CoachIntakeValidationError',
      code: 'INTAKE_NOT_FOUND',
    });
  });

  it('rejects malformed intake ids before SQL mutation', async () => {
    const db = fakeSequelize();

    await expect(confirmCoachIntakeAudioOrder({
      userId: 7,
      intakeId: 'bad id',
      sequelizeOverride: db,
    })).rejects.toBeInstanceOf(CoachIntakeValidationError);

    expect(db.calls).toHaveLength(0);
  });

  it('rejects audio-order confirmation for terminal intake states', async () => {
    for (const status of ['APPROVED', 'APPLIED', 'FAILED', 'ARCHIVED']) {
      await expect(confirmCoachIntakeAudioOrder({
        userId: 7,
        intakeId: BASE_ROW.id,
        sequelizeOverride: fakeSequelize({
          row: {
            ...BASE_ROW,
            status,
          },
        }),
      })).rejects.toMatchObject({
        name: 'CoachIntakeValidationError',
        code: 'INTAKE_NOT_ACTIONABLE',
      });
    }
  });
});
