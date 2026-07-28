/**
 * coachActionProposalService.test.mjs
 * ===================================
 * Unit coverage for Swan Coach structured action proposals. The model can
 * prepare drafts, while persistence and final writes remain deterministic.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  COACH_PROPOSAL_STATUS,
  COACH_PROPOSAL_TYPE,
  createCoachActionProposalsFromAiResponse,
} from '../../services/ai/coachActionProposalService.mjs';
import { classifyActionBlock } from '../../services/ai/coachActionProposalClassifier.mjs';

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
        return [{ exists: tableReady ? 'coach_action_proposals' : null }];
      }
      if (sql.includes('INSERT INTO coach_action_proposals')) {
        return [{
          id: options.replacements.id,
          proposal_type: options.replacements.proposalType,
          status: COACH_PROPOSAL_STATUS.PENDING,
          summary_json: JSON.parse(options.replacements.summaryJson),
          created_at: '2026-05-06T12:00:00.000Z',
        }];
      }
      return [];
    },
  };
}

describe('coachActionProposalService', () => {
  beforeEach(() => {
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID = 'VTEST';
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_VTEST = Buffer.alloc(32, 8).toString('base64');
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('turns create_client action blocks into pending onboarding proposals', async () => {
    const db = fakeSequelize();
    const content = [
      'Prepared the onboarding draft.',
      '```json',
      '{"action":"create_client","data":{"firstName":"Marcus","lastName":"Lee","clientSource":"move_fitness","fitnessGoal":"strength"}}',
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'admin' },
      conversation: { id: 71, targetUserId: null },
      sequelizeOverride: db,
    });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      type: COACH_PROPOSAL_TYPE.CLIENT_ONBOARDING,
      status: COACH_PROPOSAL_STATUS.PENDING,
      title: 'Review client onboarding draft',
    });
    const serialized = JSON.stringify(db.calls.map((call) => call.options?.replacements), (_key, value) => (
      Buffer.isBuffer(value) ? '<buffer>' : value
    ));
    expect(serialized).not.toContain('fitnessGoal');
    expect(serialized).toContain('Review client onboarding draft');
  });

  it('turns workout imports and submit events into approval proposals, not frontend writes', async () => {
    const db = fakeSequelize();
    const content = [
      'Workout is ready.',
      '```json',
      '{"action":"import_workout_log","clientId":42,"date":"2026-05-05","exercises":[{"name":"Squat","sets":[{"reps":10,"weight":135}]}]}',
      '```',
      '```json',
      '{"action":"frontend_dispatch","event":"AI_SUBMIT_WORKOUT","payload":{"clientId":42}}',
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: 42 },
      sequelizeOverride: db,
    });

    expect(result.frontendActions).toEqual([]);
    expect(result.proposals.map((proposal) => proposal.type)).toEqual([
      COACH_PROPOSAL_TYPE.WORKOUT_LOG,
      COACH_PROPOSAL_TYPE.FRONTEND_DISPATCH,
    ]);
  });

  it('turns schema-bound Coach proposal objects into pending deterministic approval drafts', async () => {
    const db = fakeSequelize();
    const content = [
      'Structured proposal prepared.',
      '```json',
      JSON.stringify({
        action: 'coach_action_proposal',
        schema_version: '2026-05-07',
        proposal_type: 'workout_log',
        requires_confirmation: false,
        evidence_refs: ['seg_04', 'clip_2_meta'],
        safety_flags: ['duplicate_check_required'],
        payload: {
          clientId: 42,
          date: '2026-05-05',
          exercises: [{ name: 'Split squat', sets: [{ reps: 8, weight: 40 }] }],
        },
      }),
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: 42 },
      sequelizeOverride: db,
    });

    expect(result.frontendActions).toEqual([]);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      type: COACH_PROPOSAL_TYPE.WORKOUT_LOG,
      status: COACH_PROPOSAL_STATUS.PENDING,
      summary: {
        confirmationMode: 'trainer_approval_required',
        evidenceCount: 2,
        safetyFlagCount: 1,
      },
    });
    const serialized = JSON.stringify(db.calls.map((call) => call.options?.replacements), (_key, value) => (
      Buffer.isBuffer(value) ? '<buffer>' : value
    ));
    expect(serialized).not.toContain('Split squat');
    expect(serialized).toContain('trainer_approval_required');
  });

  it('does not coerce malformed proposal client IDs into stored summaries', async () => {
    const db = fakeSequelize();
    const content = [
      'Structured proposals prepared.',
      '```json',
      JSON.stringify({
        action: 'coach_action_proposal',
        schema_version: '2026-05-07',
        proposal_type: 'workout_log',
        payload: {
          clientId: ' 42',
          date: '2026-05-05',
          exercises: [{ name: 'Split squat' }],
        },
      }),
      '```',
      '```json',
      JSON.stringify({
        action: 'coach_action_proposal',
        schema_version: '2026-05-07',
        proposal_type: 'client_data_update',
        payload: {
          updates: [{ field: 'trainingNotes', value: 'Keep current plan.' }],
        },
      }),
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: ' 42' },
      sequelizeOverride: db,
    });

    expect(result.proposals).toHaveLength(2);
    expect(result.proposals[0].summary.clientId).toBeNull();
    expect(result.proposals[1].summary.clientId).toBeNull();
  });

  it('links schema-bound proposal drafts back to the matching Coach intake item', async () => {
    const db = fakeSequelize();
    const intakeId = '77777777-7777-4777-9777-777777777777';
    const content = [
      'Structured proposal prepared.',
      '```json',
      JSON.stringify({
        action: 'coach_action_proposal',
        schema_version: '2026-05-07',
        intake_id: intakeId,
        proposal_type: 'workout_log',
        evidence_refs: ['seg_04'],
        safety_flags: ['trainer_approval_required'],
        payload: {
          clientId: 42,
          date: '2026-05-05',
          exercises: [{ name: 'Step up' }],
        },
      }),
      '```',
    ].join('\n');

    await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: 42 },
      sequelizeOverride: db,
    });

    const updateCall = db.calls.find((call) => call.sql.includes('UPDATE coach_intake_items'));
    expect(updateCall?.options.replacements).toMatchObject({
      intakeId,
      userId: 7,
    });
    expect(updateCall?.options.replacements.latestProposalJson).toContain('workout_log');
    expect(updateCall?.options.replacements.latestProposalJson).not.toContain('Step up');
  });

  it('turns clarification and split-plan objects into pending non-write proposals', async () => {
    const db = fakeSequelize();
    const content = [
      'Clarification and split plan prepared.',
      '```json',
      JSON.stringify({
        action: 'coach_action_proposal',
        schema_version: '2026-05-07',
        proposal_type: 'clarification',
        evidence_refs: ['seg_01'],
        safety_flags: ['needs_client_confirmation'],
        payload: {
          question: 'Which client should this workout be logged under?',
          options: ['client_candidate:C1', 'client_candidate:C2', 'new_client'],
        },
      }),
      '```',
      '```json',
      JSON.stringify({
        action: 'coach_action_proposal',
        schema_version: '2026-05-07',
        proposal_type: 'split_plan',
        evidence_refs: ['clip_1_meta', 'clip_2_meta'],
        safety_flags: ['needs_date_confirmation'],
        payload: {
          splits: [
            { title: 'Morning lower body', date: '2026-05-05', evidenceRefs: ['clip_1_meta'] },
            { title: 'Evening upper body', date: '2026-05-05', evidenceRefs: ['clip_2_meta'] },
          ],
        },
      }),
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: 42 },
      sequelizeOverride: db,
    });

    expect(result.frontendActions).toEqual([]);
    expect(result.proposals.map((proposal) => proposal.type)).toEqual(['clarification', 'split_plan']);
    expect(result.proposals[0].summary.actionRequired).toMatch(/answer/i);
    expect(result.proposals[1].summary.splitCount).toBe(2);
  });

  it('sanitizes split-plan proposal payloads before persistence', () => {
    const classified = classifyActionBlock({
      action: 'coach_action_proposal',
      schema_version: '2026-05-07',
      proposal_type: 'split_plan',
      payload: {
        rawTranscript: 'this must not be stored as part of the split plan',
        splits: [{
          title: 'Morning lower body',
          date: '2026-05-05',
          rawTranscript: 'hidden oversized transcript field',
          evidenceRefs: ['clip_1_meta'],
        }],
      },
    }, { targetUserId: 42 }, {
      proposalTypes: COACH_PROPOSAL_TYPE,
      schemaVersion: '2026-05-06',
    });

    expect(classified?.type).toBe(COACH_PROPOSAL_TYPE.SPLIT_PLAN);
    expect(classified?.payload).not.toHaveProperty('rawTranscript');
    expect(classified?.payload.splits[0]).not.toHaveProperty('rawTranscript');
    expect(classified?.payload.splits[0]).toMatchObject({
      title: 'Morning lower body',
      date: '2026-05-05',
      evidenceRefs: ['clip_1_meta'],
    });
  });

  it('preserves valid scheduled-session ids in workout-log proposals', () => {
    const classified = classifyActionBlock({
      action: 'coach_action_proposal',
      schema_version: '2026-05-07',
      proposal_type: 'workout_log',
      payload: {
        clientId: 42,
        date: '2026-06-07',
        scheduledSessionId: '777',
        exercises: [{ name: 'Squat', sets: 3, reps: 10 }],
      },
    }, { targetUserId: 42 }, {
      proposalTypes: COACH_PROPOSAL_TYPE,
      schemaVersion: '2026-05-06',
    });

    expect(classified?.type).toBe(COACH_PROPOSAL_TYPE.WORKOUT_LOG);
    expect(classified?.payload).toMatchObject({
      clientId: 42,
      scheduledSessionId: '777',
      date: '2026-06-07',
    });
  });

  it('defaults missing workout-log date and scheduled session id from safe route context', () => {
    const classified = classifyActionBlock({
      action: 'coach_action_proposal',
      schema_version: '2026-05-07',
      proposal_type: 'workout_log',
      payload: {
        clientId: 42,
        exercises: [{ name: 'Squat', sets: 3, reps: 10 }],
      },
    }, { targetUserId: 42 }, {
      proposalTypes: COACH_PROPOSAL_TYPE,
      schemaVersion: '2026-05-06',
      routeContext: {
        workoutDate: '2026-06-14',
        scheduledSessionId: '777',
      },
    });

    expect(classified?.type).toBe(COACH_PROPOSAL_TYPE.WORKOUT_LOG);
    expect(classified?.payload).toMatchObject({
      clientId: 42,
      date: '2026-06-14',
      scheduledSessionId: '777',
    });
  });

  it('normalizes workout-log historical sources and defaults them from historical route context', () => {
    const explicit = classifyActionBlock({
      action: 'coach_action_proposal',
      schema_version: '2026-05-07',
      proposal_type: 'workout_log',
      payload: {
        clientId: 42,
        date: '2026-06-07',
        source: 'history import',
        exercises: [{ name: 'Squat', sets: 3, reps: 10 }],
      },
    }, { targetUserId: 42 }, {
      proposalTypes: COACH_PROPOSAL_TYPE,
      schemaVersion: '2026-05-06',
    });

    expect(explicit?.payload).toMatchObject({
      clientId: 42,
      source: 'historical_import',
      date: '2026-06-07',
    });

    const fromRoute = classifyActionBlock({
      action: 'coach_action_proposal',
      schema_version: '2026-05-07',
      proposal_type: 'workout_log',
      payload: {
        clientId: 42,
        exercises: [{ name: 'Step-up', sets: 3, reps: 10 }],
      },
    }, { targetUserId: 42 }, {
      proposalTypes: COACH_PROPOSAL_TYPE,
      schemaVersion: '2026-05-06',
      routeContext: {
        intent: 'historical_import',
        workoutDate: '2026-06-14',
      },
    });

    expect(fromRoute?.payload).toMatchObject({
      clientId: 42,
      date: '2026-06-14',
      source: 'historical_import',
    });
  });

  it('does not create date-less workout-log proposals from malformed route context', () => {
    const classified = classifyActionBlock({
      action: 'import_workout_log',
      clientId: 42,
      exercises: [{ name: 'Squat', sets: 3, reps: 10 }],
    }, { targetUserId: 42 }, {
      proposalTypes: COACH_PROPOSAL_TYPE,
      schemaVersion: '2026-05-06',
      routeContext: {
        workoutDate: 'tomorrow after lunch',
      },
    });

    expect(classified).toBeNull();
  });

  it('rejects malformed scheduled-session ids in workout-log proposals', () => {
    const classified = classifyActionBlock({
      action: 'coach_action_proposal',
      schema_version: '2026-05-07',
      proposal_type: 'workout_log',
      payload: {
        clientId: 42,
        date: '2026-06-07',
        scheduledSessionId: '777junk',
        exercises: [{ name: 'Squat', sets: 3, reps: 10 }],
      },
    }, { targetUserId: 42 }, {
      proposalTypes: COACH_PROPOSAL_TYPE,
      schemaVersion: '2026-05-06',
    });

    expect(classified).toBeNull();
  });

  it('ignores malformed write action blocks instead of creating unusable proposals', async () => {
    const db = fakeSequelize();
    const content = [
      'Bad model output should stay visible as chat text only.',
      '```json',
      '{"action":"import_workout_log","clientId":42,"date":"2026-05-05","exercises":[]}',
      '```',
      '```json',
      '{"action":"update_client_data","updates":[]}',
      '```',
      '```json',
      '{"action":"frontend_dispatch","payload":{"clientId":42}}',
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: 42 },
      sequelizeOverride: db,
    });

    expect(result).toEqual({ proposals: [], frontendActions: [] });
    expect(db.calls.some((call) => call.sql.includes('INSERT INTO coach_action_proposals'))).toBe(false);
  });

  it('keeps nutrition_log meal free-text out of the clear-text summary_json (Rule 8, hostile-review TEST-7)', async () => {
    const db = fakeSequelize();
    const content = [
      'Nutrition draft prepared.',
      '```json',
      JSON.stringify({
        action: 'coach_action_proposal',
        schema_version: '2026-05-07',
        proposal_type: 'nutrition_log',
        evidence_refs: ['seg_04'],
        safety_flags: ['needs_client_confirmation'],
        payload: {
          date: '2026-05-05',
          meals: [
            { mealType: 'lunch', description: 'chicken burrito bowl', calories: 650, protein: 45 },
            { mealType: 'snack', description: 'banana', calories: 105 },
          ],
        },
      }),
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: 42 },
      sequelizeOverride: db,
    });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      type: COACH_PROPOSAL_TYPE.NUTRITION_LOG,
      status: COACH_PROPOSAL_STATUS.PENDING,
      title: 'Review nutrition log draft',
      summary: { mealCount: 2, totalCalories: 755, clientId: 42 },
    });
    const serialized = JSON.stringify(db.calls.map((call) => call.options?.replacements), (_key, value) => (
      Buffer.isBuffer(value) ? '<buffer>' : value
    ));
    // Meal free-text lives only in the ENCRYPTED cipher — never in clear-text summary_json.
    expect(serialized).not.toContain('chicken burrito bowl');
    expect(serialized).not.toContain('banana');
    expect(serialized).toContain('Review nutrition log draft');
  });
});
