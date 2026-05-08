/**
 * plaudStructuredCoachActionPipeline.test.mjs
 * ===========================================
 * Full command-pipeline locks for structured Swan Coach PLAUD actions.
 *
 * These tests prove operator phrases classify, validate, and dispatch into
 * read/proposal/confirmation metadata without writing workout logs or exposing
 * transcript/client-name fields in command results.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/coachIntakeItemService.mjs', () => ({
  listUnifiedCoachIntakeItems: vi.fn(),
}));

import { listUnifiedCoachIntakeItems } from '../../services/coachIntakeItemService.mjs';
import { executeCommandPipeline } from '../../services/ai/commandExecutor.mjs';
import { initializeRegistry } from '../../services/ai/commandRegistry/index.mjs';

initializeRegistry();

const sequelizeOverride = { query: vi.fn() };
const adminUser = { id: 42, role: 'admin', firstName: 'Sean', lastName: 'Swan' };

function mockQueue() {
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
      failed: 0,
      needsClient: 0,
    },
    items: [
      {
        id: 'coach:audio-1',
        entityId: 'audio-1',
        kind: 'coach_intake',
        queueStatus: 'unprocessed',
        canReview: false,
        clientName: 'Do Not Return',
        transcript: 'Do Not Return',
        title: 'Marcus private clip.m4a',
        sourceLabel: 'PLAUD import',
        createdAt: '2026-05-05T12:00:00.000Z',
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

async function runPrompt(message) {
  return executeCommandPipeline(message, adminUser, { sequelize: sequelizeOverride });
}

describe('structured PLAUD command pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sequelizeOverride.query.mockReset();
    mockQueue();
  });

  it.each([
    ['list PLAUD intake items', 'plaud_list_intake_items', 'read_only'],
    ['analyze PLAUD clip set for audio-1', 'plaud_analyze_clip_set', 'read_only'],
    ['propose PLAUD clip order for audio-1', 'plaud_propose_clip_order', 'not_written'],
    ['group PLAUD session candidates for audio-1', 'plaud_group_session_candidates', 'not_written'],
    ['prepare PLAUD merge candidate group for audio-1', 'plaud_merge_candidate_group', 'not_written'],
    ['request confirmation for PLAUD audio-1 audio order', 'plaud_request_confirmation', 'not_written'],
  ])('routes "%s" to %s without unsafe result fields', async (message, commandType, writeStatus) => {
    const ctx = await runPrompt(message);

    expect(ctx.error).toBeNull();
    expect(ctx.command?.type).toBe(commandType);
    expect(ctx.result).toMatchObject({
      actionType: commandType,
      contractVersion: 'plaud-coach-action-v1',
      writeStatus,
    });
    expect(JSON.stringify(ctx.result)).not.toMatch(/Do Not Return|Marcus|private clip|transcript|clientName|title/i);
  });
});
