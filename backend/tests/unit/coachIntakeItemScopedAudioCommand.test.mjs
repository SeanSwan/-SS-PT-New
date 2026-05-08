/**
 * coachIntakeItemScopedAudioCommand.test.mjs
 * ==========================================
 * Regression locks for active-intake audio inspection commands. These tests keep
 * Swan Coach focused on the selected intake item instead of summarizing the
 * whole audio queue when Sean asks about one active dossier.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/coachIntakeItemService.mjs', () => ({
  listUnifiedCoachIntakeItems: vi.fn(),
}));

import { listUnifiedCoachIntakeItems } from '../../services/coachIntakeItemService.mjs';
import { dispatchInspectCoachAudioPieces } from '../../services/ai/dispatchers/coachIntakeDispatchers.mjs';
import { executeCommandPipeline } from '../../services/ai/commandExecutor.mjs';
import { initializeRegistry } from '../../services/ai/commandRegistry/index.mjs';

initializeRegistry();

const sequelizeOverride = { query: vi.fn() };

function mockQueue(items) {
  vi.mocked(listUnifiedCoachIntakeItems).mockResolvedValue({
    scope: 'actionable',
    limit: 20,
    schemaReady: true,
    summary: {
      total: items.length,
      actionable: items.length,
      today: items.length,
      unprocessed: items.length,
      processing: 0,
      readyReview: 0,
      failed: 0,
      needsClient: items.length,
    },
    items,
  });
}

function audioItem(id, puzzle = {}) {
  return {
    id: `coach:${id}`,
    entityId: id,
    kind: 'coach_intake',
    queueStatus: 'unprocessed',
    canReview: false,
    sourceLabel: 'Audio upload',
    createdAt: '2026-05-05T12:00:00.000Z',
    audioPuzzle: {
      pieceCount: 3,
      bundleCount: 2,
      autoBundleCount: 1,
      needsOrderingReview: true,
      confidence: 'low',
      ...puzzle,
    },
  };
}

describe('Coach intake item-scoped audio inspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sequelizeOverride.query.mockReset();
  });

  it('inspects pending audio pieces without returning transcripts, names, or filenames', async () => {
    mockQueue([
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
        ...audioItem('audio-1', { rawFileNames: ['Marcus private clip.m4a'] }),
        clientName: 'Do Not Return',
        transcript: 'Do Not Return',
      },
    ]);

    const result = await dispatchInspectCoachAudioPieces(
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

  it('inspects newly uploaded PLAUD clips through the unified Coach command', async () => {
    mockQueue([
      {
        id: 'clip:plaud-clip-1',
        entityId: 'plaud-clip-1',
        kind: 'clip',
        queueStatus: 'unprocessed',
        canReview: false,
        clientName: 'Do Not Return',
        transcript: 'Do Not Return',
        title: 'Marcus private clip.m4a',
        sourceLabel: 'Manual upload',
        createdAt: '2026-05-05T12:00:00.000Z',
        clipCount: 1,
      },
    ]);

    const result = await dispatchInspectCoachAudioPieces(
      {},
      { user: { id: 42, role: 'admin' }, options: { sequelize: sequelizeOverride } },
    );

    expect(result).toMatchObject({
      totalAudioItems: 1,
      needsOrderingReview: 0,
      lowConfidence: 0,
      commandHint: 'Use the Coach workspace to review audio ordering before approving any generated workout draft.',
      items: [
        {
          id: 'clip:plaud-clip-1',
          kind: 'clip',
          queueStatus: 'unprocessed',
          audioPieces: 1,
          audioBundles: 1,
          audioConfidence: 'single',
          needsOrderingReview: false,
          reviewRoute: '/dashboard/admin/coach-assistant?intake=plaud-clip-1',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/Do Not Return|Marcus|private clip|transcript|clientName|title/i);
  });

  it('filters audio inspection to one active intake when intakeId is provided', async () => {
    mockQueue([
      audioItem('audio-1'),
      audioItem('audio-2', {
        pieceCount: 1,
        bundleCount: 1,
        autoBundleCount: 0,
        needsOrderingReview: false,
        confidence: 'single',
      }),
    ]);

    const result = await dispatchInspectCoachAudioPieces(
      { intakeId: 'audio-1' },
      { user: { id: 42, role: 'admin' }, options: { sequelize: sequelizeOverride } },
    );

    expect(result).toMatchObject({
      totalAudioItems: 1,
      needsOrderingReview: 1,
      lowConfidence: 1,
      targetIntakeId: 'audio-1',
      targetMatched: true,
      items: [
        {
          id: 'coach:audio-1',
          audioPieces: 3,
          reviewRoute: '/dashboard/admin/coach-assistant?intake=audio-1',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(/audio-2/);
  });

  it('executes workspace-generated item-scoped inspection without AI classification', async () => {
    mockQueue([audioItem('audio-1')]);

    const ctx = await executeCommandPipeline(
      'inspect Coach intake audio-1 audio pieces',
      { id: 42, role: 'admin', firstName: 'Sean', lastName: 'Swan' },
      { sequelize: sequelizeOverride },
    );

    expect(ctx.error).toBeNull();
    expect(ctx.command?.type).toBe('inspect_coach_audio_pieces');
    expect(ctx.intent?.params).toMatchObject({ intakeId: 'audio-1' });
    expect(ctx.result).toMatchObject({
      totalAudioItems: 1,
      targetIntakeId: 'audio-1',
      targetMatched: true,
    });
  });
});
