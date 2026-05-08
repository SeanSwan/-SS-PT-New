/**
 * coachIntakeEventTrailService.test.mjs
 * =====================================
 * Locks the read-only audit trail for Coach intake review panels.
 */
import { describe, expect, it } from 'vitest';

import { listCoachIntakeEvents } from '../../services/coachIntakeEventTrailService.mjs';

const INTAKE_ID = '11111111-1111-4111-8111-111111111111';

function fakeSequelize({ rowExists = true } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('to_regclass')) {
        return [{ items_exists: 'coach_intake_items' }];
      }
      if (sql.includes('FROM coach_intake_items')) {
        return rowExists ? [{ id: INTAKE_ID }] : [];
      }
      if (sql.includes('FROM coach_intake_events')) {
        return [
          {
            id: 'event-1',
            actor_type: 'model',
            event_type: 'proposal_applied',
            event_json: {
              action: 'proposal_status_changed',
              proposalId: '22222222-2222-4222-8222-222222222222',
              proposalType: 'workout_log',
              status: 'APPLIED',
              errorCode: 'Marcus private text',
              rawTranscript: 'Marcus private transcript must not return',
              clientName: 'Marcus',
            },
            created_at: '2026-05-07T10:00:00.000Z',
          },
          {
            id: 'event-2',
            actor_type: 'user',
            event_type: 'confirm_audio_order',
            event_json: {
              action: 'confirm_audio_order',
              pieceCount: 3,
              bundleCount: 2,
              previousNeedsOrderingReview: true,
              fileName: 'Marcus-private-clip.m4a',
            },
            created_at: '2026-05-07T09:58:00.000Z',
          },
        ];
      }
      return [];
    },
  };
}

describe('coach intake event trail service', () => {
  it('returns only ownership-scoped sanitized Coach intake events', async () => {
    const db = fakeSequelize();

    const result = await listCoachIntakeEvents({
      userId: 7,
      intakeId: INTAKE_ID,
      sequelizeOverride: db,
    });

    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      actorType: 'model',
      eventType: 'proposal_applied',
      summary: {
        action: 'proposal_status_changed',
        proposalId: '22222222-2222-4222-8222-222222222222',
        proposalType: 'workout_log',
        status: 'APPLIED',
      },
    });
    expect(result.events[1].summary).toMatchObject({
      action: 'confirm_audio_order',
      pieceCount: 3,
      bundleCount: 2,
      previousNeedsOrderingReview: true,
    });
    expect(result.events[0].summary).not.toHaveProperty('errorCode');
    expect(JSON.stringify(result)).not.toMatch(/Marcus|private transcript|fileName|rawTranscript|clientName/i);
    expect(db.calls.find((call) => call.sql.includes('FROM coach_intake_items')).options.replacements)
      .toMatchObject({ userId: 7, intakeId: INTAKE_ID });
  });

  it('fails closed when the authenticated user does not own the intake item', async () => {
    await expect(listCoachIntakeEvents({
      userId: 7,
      intakeId: INTAKE_ID,
      sequelizeOverride: fakeSequelize({ rowExists: false }),
    })).rejects.toMatchObject({
      name: 'CoachIntakeValidationError',
      code: 'INTAKE_NOT_FOUND',
    });
  });
});
