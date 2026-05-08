/**
 * plaudStructuredCoachActionContract.test.mjs
 * ===========================================
 * Locks the first structured Swan Coach PLAUD action contract.
 *
 * This slice is read/propose/manual-confirmation metadata only. It must not
 * create final workout-log writes, expose transcript bodies, or return client
 * names through command result cards.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLAUD_STRUCTURED_COMMANDS_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/commandRegistry/plaudStructuredActionCommands.mjs'),
  'utf8',
);
const DISPATCHER_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/commandDispatcher.mjs'),
  'utf8',
);

vi.mock('../../services/coachIntakeItemService.mjs', () => ({
  listUnifiedCoachIntakeItems: vi.fn(),
}));

import { listUnifiedCoachIntakeItems } from '../../services/coachIntakeItemService.mjs';
import {
  dispatchPlaudAnalyzeClipSet,
  dispatchPlaudGroupSessionCandidates,
  dispatchPlaudMergeCandidateGroup,
  dispatchPlaudProposeClipOrder,
  dispatchPlaudRequestConfirmation,
} from '../../services/ai/dispatchers/plaudStructuredActionDispatchers.mjs';

const sequelizeOverride = { query: vi.fn() };
const ctx = {
  user: { id: 42, role: 'trainer' },
  options: { sequelize: sequelizeOverride },
};

function mockAudioQueue() {
  vi.mocked(listUnifiedCoachIntakeItems).mockResolvedValue({
    scope: 'actionable',
    limit: 20,
    schemaReady: true,
    summary: {
      total: 1,
      actionable: 1,
      today: 1,
      unprocessed: 1,
      processing: 0,
      readyReview: 0,
      needsClarification: 0,
      duplicateHold: 0,
      failed: 0,
      needsClient: 0,
      preparedDrafts: 0,
      pendingDrafts: 0,
      applyingDrafts: 0,
      approvedDrafts: 0,
      appliedDrafts: 0,
      rejectedDrafts: 0,
      failedDrafts: 0,
    },
    items: [
      {
        id: 'coach-intake-1',
        entityId: 'coach-intake-1',
        kind: 'coach_intake',
        source: 'plaud_clip',
        queueStatus: 'unprocessed',
        canReview: false,
        needsClient: false,
        clientName: 'Do Not Return',
        transcript: 'Do Not Return',
        audioPuzzle: {
          pieceCount: 3,
          bundleCount: 2,
          autoBundleCount: 1,
          needsOrderingReview: true,
          confidence: 'medium',
        },
      },
    ],
  });
}

describe('structured PLAUD Swan Coach action registry contract', () => {
  it('registers the first read/propose/manual-confirmation PLAUD action names', () => {
    for (const commandType of [
      'plaud_list_intake_items',
      'plaud_analyze_clip_set',
      'plaud_propose_clip_order',
      'plaud_group_session_candidates',
      'plaud_merge_candidate_group',
      'plaud_request_confirmation',
    ]) {
      expect(PLAUD_STRUCTURED_COMMANDS_SRC).toContain(`type: '${commandType}'`);
      expect(DISPATCHER_SRC).toContain(`'${commandType}'`);
    }
  });
});

describe('structured PLAUD Swan Coach action dispatchers', () => {
  beforeEach(() => {
    vi.mocked(listUnifiedCoachIntakeItems).mockReset();
    mockAudioQueue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('analyzes a clip set without returning transcript bodies or client names', async () => {
    const result = await dispatchPlaudAnalyzeClipSet({ intakeId: 'coach-intake-1' }, ctx);

    expect(result).toMatchObject({
      actionType: 'plaud_analyze_clip_set',
      contractVersion: 'plaud-coach-action-v1',
      totalAudioItems: 1,
      targetIntakeId: 'coach-intake-1',
      targetMatched: true,
      writeStatus: 'read_only',
    });
    expect(JSON.stringify(result)).not.toMatch(/Do Not Return|clientName|transcript/i);
  });

  it('proposes clip order as manual-confirmation metadata only', async () => {
    const result = await dispatchPlaudProposeClipOrder({ intakeId: 'coach-intake-1' }, ctx);

    expect(result).toMatchObject({
      actionType: 'plaud_propose_clip_order',
      proposalType: 'clip_order',
      requiresManualConfirmation: true,
      confirmationKind: 'audio_order',
      writeStatus: 'not_written',
      nextWritePath: 'existing_review_flow_only',
      reviewRoute: '/dashboard/trainer/coach-assistant?intake=coach-intake-1',
    });
  });

  it('groups session candidates without invoking merge/write behavior', async () => {
    const result = await dispatchPlaudGroupSessionCandidates({ intakeId: 'coach-intake-1' }, ctx);

    expect(result).toMatchObject({
      actionType: 'plaud_group_session_candidates',
      proposalType: 'session_grouping',
      candidateGroupCount: 2,
      requiresManualConfirmation: true,
      writeStatus: 'not_written',
    });
  });

  it('merge candidate group action returns a confirmation route, not a merge result', async () => {
    const result = await dispatchPlaudMergeCandidateGroup({ intakeId: 'coach-intake-1' }, ctx);

    expect(result).toMatchObject({
      actionType: 'plaud_merge_candidate_group',
      proposalType: 'merge_candidate_group',
      requiresManualConfirmation: true,
      writeStatus: 'not_written',
    });
    expect(JSON.stringify(result)).not.toMatch(/mergeRequestId|workoutLogId|applied/i);
  });

  it('request confirmation normalizes the confirmation type and keeps writes out of the command lane', async () => {
    const result = await dispatchPlaudRequestConfirmation(
      { intakeId: 'coach-intake-1', confirmationType: 'audio_order' },
      ctx,
    );

    expect(result).toMatchObject({
      actionType: 'plaud_request_confirmation',
      confirmationType: 'audio_order',
      requiresManualConfirmation: true,
      writeStatus: 'not_written',
      targetIntakeId: 'coach-intake-1',
      targetMatched: true,
    });
  });
});
