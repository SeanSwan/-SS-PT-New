/**
 * coachIntakeCommandActions.test.mjs
 * ==================================
 * Regression locks for unified Swan Coach intake commands. These commands
 * operate across Coach-created intake drafts plus PLAUD queue items without
 * exposing transcript bodies or client names to AI command result cards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REGISTRY_INDEX_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/commandRegistry/index.mjs'), 'utf8',
);
const DISPATCHER_INDEX_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/commandDispatcher.mjs'), 'utf8',
);
const WORKSPACE_SRC = readFileSync(
  resolve(__dirname, '../../../frontend/src/components/DashBoard/Pages/coach-assistant/CoachIntakeWorkspace.tsx'), 'utf8',
);

vi.mock('../../services/coachIntakeItemService.mjs', () => ({
  listUnifiedCoachIntakeItems: vi.fn(),
}));

import { listUnifiedCoachIntakeItems } from '../../services/coachIntakeItemService.mjs';
import {
  dispatchInspectPlaudAudioPieces,
  dispatchReviewNextCoachIntake,
  dispatchViewCoachIntakeQueue,
  _internal,
} from '../../services/ai/dispatchers/coachIntakeDispatchers.mjs';

describe('Unified Coach intake command registry source contract', () => {
  it('registers unified Coach intake commands and dispatchers', () => {
    expect(REGISTRY_INDEX_SRC).toMatch(/coachIntakeCommands\.mjs/);
    expect(REGISTRY_INDEX_SRC).toMatch(/registerCoachIntake/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/dispatchViewCoachIntakeQueue/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['view_coach_intake_queue',\s*dispatchViewCoachIntakeQueue\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['review_next_coach_intake',\s*dispatchReviewNextCoachIntake\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['inspect_plaud_audio_pieces',\s*dispatchInspectPlaudAudioPieces\]/);
  });

  it('makes the Coach workspace ask the unified intake command, not the PLAUD-only command', () => {
    expect(WORKSPACE_SRC).toMatch(/onCommandPrompt\('review next Coach intake'\)/);
    expect(WORKSPACE_SRC).not.toMatch(/onCommandPrompt\('review next PLAUD intake'\)/);
  });
});

describe('Unified Coach intake dispatcher behavior', () => {
  const sequelizeOverride = { query: vi.fn() };

  beforeEach(() => {
    vi.mocked(listUnifiedCoachIntakeItems).mockReset();
  });

  it('returns a flat unified queue summary without transcripts or client names', async () => {
    vi.mocked(listUnifiedCoachIntakeItems).mockResolvedValue({
      scope: 'actionable',
      limit: 10,
      schemaReady: true,
      summary: {
        total: 3,
        actionable: 3,
        today: 2,
        unprocessed: 1,
        processing: 0,
        readyReview: 1,
        failed: 0,
        needsClient: 1,
      },
      items: [
        {
          id: 'coach:11111111-1111-1111-1111-111111111111',
          entityId: '11111111-1111-1111-1111-111111111111',
          kind: 'coach_intake',
          queueStatus: 'ready_review',
          canReview: true,
          clientName: 'Do Not Return',
          transcript: 'Do Not Return',
          createdAt: '2026-05-05T12:00:00.000Z',
        },
      ],
    });

    const result = await dispatchViewCoachIntakeQueue(
      { scope: 'actionable', limit: 10 },
      { user: { id: 42, role: 'admin' }, options: { sequelize: sequelizeOverride } },
    );

    expect(listUnifiedCoachIntakeItems).toHaveBeenCalledWith({
      userId: 42,
      scope: 'actionable',
      limit: 10,
      sequelizeOverride,
    });
    expect(result).toMatchObject({
      total: 3,
      actionable: 3,
      today: 2,
      unprocessed: 1,
      readyReview: 1,
      needsClient: 1,
      nextKind: 'coach_intake',
      nextCanReview: true,
      queueRoute: '/dashboard/admin/coach-assistant',
      reviewRoute: '/dashboard/admin/coach-assistant?intake=11111111-1111-1111-1111-111111111111',
    });
    expect(JSON.stringify(result)).not.toMatch(/Do Not Return|clientName|transcript/i);
  });

  it('routes reviewable PLAUD merge requests to the PLAUD review workspace', async () => {
    vi.mocked(listUnifiedCoachIntakeItems).mockResolvedValue({
      scope: 'actionable',
      limit: 20,
      schemaReady: true,
      summary: {
        total: 1,
        actionable: 1,
        today: 1,
        unprocessed: 0,
        processing: 0,
        readyReview: 1,
        failed: 0,
        needsClient: 0,
      },
      items: [
        {
          id: 'merge:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          entityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          kind: 'merge_request',
          queueStatus: 'ready_review',
          canReview: true,
          createdAt: '2026-05-05T12:00:00.000Z',
        },
      ],
    });

    const result = await dispatchReviewNextCoachIntake(
      {},
      { user: { id: 7, role: 'trainer' }, options: { sequelize: sequelizeOverride } },
    );

    expect(result).toMatchObject({
      nextKind: 'merge_request',
      nextEntityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      queueRoute: '/dashboard/trainer/coach-assistant',
      reviewRoute: '/dashboard/trainer/plaud?review=next',
    });
  });

  it('does not require PLAUD env flags when the unified queue contains Coach intake items', async () => {
    vi.mocked(listUnifiedCoachIntakeItems).mockResolvedValue({
      scope: 'actionable',
      limit: 10,
      schemaReady: true,
      summary: {
        total: 0,
        actionable: 0,
        today: 0,
        unprocessed: 0,
        processing: 0,
        readyReview: 0,
        failed: 0,
        needsClient: 0,
      },
      items: [],
    });

    await expect(dispatchViewCoachIntakeQueue(
      {},
      { user: { id: 42, role: 'trainer' }, options: { sequelize: sequelizeOverride } },
    )).resolves.toMatchObject({
      queueRoute: '/dashboard/trainer/coach-assistant',
      reviewRoute: null,
    });
  });

  it('rejects client-role unified intake commands', async () => {
    await expect(dispatchViewCoachIntakeQueue(
      {},
      { user: { id: 12, role: 'client' }, options: { sequelize: sequelizeOverride } },
    )).rejects.toThrow(/requires an admin or trainer role/i);
    expect(listUnifiedCoachIntakeItems).not.toHaveBeenCalled();
  });

  it('prioritizes ready review, then oldest recording timeline', () => {
    const next = _internal.pickNextItem([
      {
        id: 'coach:old-note',
        kind: 'coach_intake',
        queueStatus: 'unprocessed',
        createdAt: '2026-05-01T12:00:00.000Z',
      },
      {
        id: 'merge:new-ready',
        kind: 'merge_request',
        queueStatus: 'ready_review',
        canReview: true,
        createdAt: '2026-05-06T12:00:00.000Z',
      },
      {
        id: 'coach:old-ready',
        kind: 'coach_intake',
        queueStatus: 'ready_review',
        canReview: true,
        recordedAt: '2026-05-05T12:00:00.000Z',
        createdAt: '2026-05-07T12:00:00.000Z',
      },
    ]);

    expect(next?.id).toBe('coach:old-ready');
  });

  it('inspects pending audio pieces without returning transcripts, names, or filenames', async () => {
    vi.mocked(listUnifiedCoachIntakeItems).mockResolvedValue({
      scope: 'actionable',
      limit: 20,
      schemaReady: true,
      summary: {
        total: 2,
        actionable: 2,
        today: 2,
        unprocessed: 2,
        processing: 0,
        readyReview: 0,
        failed: 0,
        needsClient: 1,
      },
      items: [
        {
          id: 'merge:ready-review',
          entityId: 'ready-review',
          kind: 'merge_request',
          queueStatus: 'ready_review',
          canReview: true,
          clipCount: 3,
          sourceLabel: 'Merged review',
          createdAt: '2026-05-05T11:00:00.000Z',
        },
        {
          id: 'coach:audio-1',
          entityId: 'audio-1',
          kind: 'coach_intake',
          queueStatus: 'unprocessed',
          canReview: false,
          clientName: 'Do Not Return',
          transcript: 'Do Not Return',
          sourceLabel: 'Audio upload',
          createdAt: '2026-05-05T12:00:00.000Z',
          audioPuzzle: {
            pieceCount: 3,
            bundleCount: 2,
            autoBundleCount: 1,
            needsOrderingReview: true,
            confidence: 'low',
            rawFileNames: ['Marcus private clip.m4a'],
          },
        },
      ],
    });

    const result = await dispatchInspectPlaudAudioPieces(
      {},
      { user: { id: 42, role: 'admin' }, options: { sequelize: sequelizeOverride } },
    );

    expect(result).toMatchObject({
      totalAudioItems: 1,
      needsOrderingReview: 1,
      lowConfidence: 1,
      commandHint: 'Use the Coach workspace to review audio ordering before approving any generated workout draft.',
      items: [
        {
          id: 'coach:audio-1',
          kind: 'coach_intake',
          queueStatus: 'unprocessed',
          audioPieces: 3,
          audioBundles: 2,
          autoAudioBundles: 1,
          audioConfidence: 'low',
          needsOrderingReview: true,
          reviewRoute: '/dashboard/admin/coach-assistant?intake=audio-1',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/Do Not Return|Marcus|private clip|transcript|clientName|rawFileNames/i);
  });
});
