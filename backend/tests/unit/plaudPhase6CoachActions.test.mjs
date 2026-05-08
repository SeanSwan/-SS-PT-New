/**
 * plaudPhase6CoachActions.test.mjs
 * =================================
 * Regression locks for Swan Coach read-only PLAUD command actions. These tests
 * keep PLAUD connected to the command lane without exposing transcripts or
 * client names in AI command result cards.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

vi.mock('../../services/plaudIntakeQueueService.mjs', () => ({
  listPlaudIntakeItems: vi.fn(),
}));

import { listPlaudIntakeItems } from '../../services/plaudIntakeQueueService.mjs';
import {
  dispatchInspectPlaudAudioPieces,
  dispatchReviewNextPlaudIntake,
  dispatchViewPlaudIntakeQueue,
} from '../../services/ai/dispatchers/plaudDispatchers.mjs';

describe('Phase 6 — PLAUD Swan Coach registry source contract', () => {
  it('registers a PLAUD command registry file in the global registry index', () => {
    expect(REGISTRY_INDEX_SRC).toMatch(/plaudCommands\.mjs/);
    expect(REGISTRY_INDEX_SRC).toMatch(/registerPlaud/);
  });

  it('registers PLAUD queue dispatchers in commandDispatcher.mjs', () => {
    expect(DISPATCHER_INDEX_SRC).toMatch(/dispatchViewPlaudIntakeQueue/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['view_plaud_intake_queue',\s*dispatchViewPlaudIntakeQueue\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['review_next_plaud_intake',\s*dispatchReviewNextPlaudIntake\]/);
    expect(DISPATCHER_INDEX_SRC).toMatch(/\['inspect_plaud_audio_pieces',\s*dispatchInspectPlaudAudioPieces\]/);
  });
});

describe('Phase 6 — PLAUD Swan Coach dispatcher behavior', () => {
  const OLD_ENV = process.env.PLAUD_MERGE_ENABLED;
  const sequelizeOverride = { query: vi.fn() };

  beforeEach(() => {
    process.env.PLAUD_MERGE_ENABLED = 'true';
    vi.mocked(listPlaudIntakeItems).mockReset();
  });

  afterEach(() => {
    if (OLD_ENV === undefined) {
      delete process.env.PLAUD_MERGE_ENABLED;
    } else {
      process.env.PLAUD_MERGE_ENABLED = OLD_ENV;
    }
  });

  it('returns a flat queue summary without transcripts or client names', async () => {
    vi.mocked(listPlaudIntakeItems).mockResolvedValue({
      scope: 'ready_review',
      limit: 10,
      summary: {
        total: 4,
        actionable: 3,
        today: 2,
        unprocessed: 1,
        processing: 0,
        readyReview: 2,
        failed: 0,
        needsClient: 1,
      },
      items: [
        {
          id: 'merge:11111111-1111-1111-1111-111111111111',
          entityId: '11111111-1111-1111-1111-111111111111',
          kind: 'merge_request',
          queueStatus: 'ready_review',
          canReview: true,
          clientName: 'Do Not Return',
          transcript: 'Do Not Return',
        },
      ],
    });

    const result = await dispatchViewPlaudIntakeQueue(
      { scope: 'ready_review', limit: 10 },
      { user: { id: 42, role: 'trainer' }, options: { sequelize: sequelizeOverride } },
    );

    expect(listPlaudIntakeItems).toHaveBeenCalledWith({
      userId: 42,
      scope: 'ready_review',
      limit: 10,
      sequelizeOverride,
    });
    expect(result).toMatchObject({
      total: 4,
      actionable: 3,
      today: 2,
      unprocessed: 1,
      processing: 0,
      readyReview: 2,
      failed: 0,
      needsClient: 1,
      nextIntakeId: 'merge:11111111-1111-1111-1111-111111111111',
      nextKind: 'merge_request',
      nextQueueStatus: 'ready_review',
      queueRoute: '/dashboard/trainer/plaud',
      reviewRoute: '/dashboard/trainer/plaud?mergeRequestId=11111111-1111-1111-1111-111111111111',
    });
    expect(JSON.stringify(result)).not.toMatch(/Do Not Return|transcript/i);
  });

  it('returns the role-dashboard PLAUD route for admins', async () => {
    vi.mocked(listPlaudIntakeItems).mockResolvedValue({
      scope: 'actionable',
      limit: 10,
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

    const result = await dispatchViewPlaudIntakeQueue(
      {},
      { user: { id: 7, role: 'admin' }, options: { sequelize: sequelizeOverride } },
    );

    expect(result.queueRoute).toBe('/dashboard/admin/plaud');
  });

  it('review-next prioritizes ready review items over unprocessed clips', async () => {
    vi.mocked(listPlaudIntakeItems).mockResolvedValue({
      scope: 'actionable',
      limit: 20,
      summary: {
        total: 2,
        actionable: 2,
        today: 2,
        unprocessed: 1,
        processing: 0,
        readyReview: 1,
        failed: 0,
        needsClient: 0,
      },
      items: [
        {
          id: 'clip:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          entityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          kind: 'clip',
          queueStatus: 'unprocessed',
          canReview: false,
        },
        {
          id: 'merge:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          entityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          kind: 'merge_request',
          queueStatus: 'ready_review',
          canReview: true,
        },
      ],
    });

    const result = await dispatchReviewNextPlaudIntake(
      {},
      { user: { id: 42, role: 'trainer' }, options: { sequelize: sequelizeOverride } },
    );

    expect(result).toMatchObject({
      nextIntakeId: 'merge:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      nextKind: 'merge_request',
      nextQueueStatus: 'ready_review',
      nextCanReview: true,
      queueRoute: '/dashboard/trainer/plaud',
      reviewRoute: '/dashboard/trainer/plaud?mergeRequestId=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    });
  });

  it('does not build direct merge review links from malformed entity ids', async () => {
    vi.mocked(listPlaudIntakeItems).mockResolvedValue({
      scope: 'actionable',
      limit: 20,
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
          id: 'merge:malformed-entity',
          entityId: '../trainer/coach-assistant',
          kind: 'merge_request',
          queueStatus: 'ready_review',
          canReview: true,
        },
      ],
    });

    const result = await dispatchReviewNextPlaudIntake(
      {},
      { user: { id: 42, role: 'trainer' }, options: { sequelize: sequelizeOverride } },
    );

    expect(result).toMatchObject({
      nextEntityId: null,
      queueRoute: '/dashboard/trainer/plaud',
      reviewRoute: '/dashboard/trainer/plaud?review=next',
    });
  });

  it('rejects client-role PLAUD queue commands', async () => {
    await expect(dispatchViewPlaudIntakeQueue(
      {},
      { user: { id: 12, role: 'client' }, options: { sequelize: sequelizeOverride } },
    )).rejects.toThrow(/requires an admin or trainer role/i);
    expect(listPlaudIntakeItems).not.toHaveBeenCalled();
  });

  it('fails closed when PLAUD merge is disabled', async () => {
    process.env.PLAUD_MERGE_ENABLED = 'false';

    await expect(dispatchViewPlaudIntakeQueue(
      {},
      { user: { id: 42, role: 'trainer' }, options: { sequelize: sequelizeOverride } },
    )).rejects.toThrow(/PLAUD merge feature is not enabled/i);
    expect(listPlaudIntakeItems).not.toHaveBeenCalled();
  });

  it('summarizes pending audio pieces in chronological order without PII fields', async () => {
    vi.mocked(listPlaudIntakeItems).mockResolvedValue({
      scope: 'unprocessed',
      limit: 20,
      summary: {
        total: 3,
        actionable: 3,
        today: 3,
        unprocessed: 3,
        processing: 0,
        readyReview: 0,
        failed: 0,
        needsClient: 0,
      },
      items: [
        {
          id: 'clip:cccccccc-cccc-cccc-cccc-cccccccccccc',
          entityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          kind: 'clip',
          source: 'manual_upload',
          sourceLabel: 'Manual upload',
          queueStatus: 'unprocessed',
          canReview: false,
          createdAt: '2026-05-05T12:55:00.000Z',
          durationSec: 65,
          sizeBytes: 3000,
          clientName: 'Do Not Return',
          title: 'Do Not Return',
          transcript: 'Do Not Return',
        },
        {
          id: 'clip:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          entityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          kind: 'clip',
          source: 'applaud_webhook',
          sourceLabel: 'Applaud',
          queueStatus: 'unprocessed',
          canReview: false,
          createdAt: '2026-05-05T12:00:00.000Z',
          durationSec: 45,
          sizeBytes: 1000,
        },
        {
          id: 'clip:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          entityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          kind: 'clip',
          source: 'manual_upload',
          sourceLabel: 'Manual upload',
          queueStatus: 'unprocessed',
          canReview: false,
          createdAt: '2026-05-05T12:06:00.000Z',
          durationSec: 30,
          sizeBytes: 2000,
        },
      ],
    });

    const result = await dispatchInspectPlaudAudioPieces(
      { gapThresholdMinutes: 30 },
      { user: { id: 42, role: 'trainer' }, options: { sequelize: sequelizeOverride } },
    );

    expect(listPlaudIntakeItems).toHaveBeenCalledWith({
      userId: 42,
      scope: 'unprocessed',
      limit: 20,
      sequelizeOverride,
    });
    expect(result).toMatchObject({
      pieceCount: 3,
      totalAudioItems: 3,
      needsOrderingReview: 1,
      lowConfidence: 1,
      suggestedGroupCount: 2,
      largeGapCount: 1,
      largestGapMinutes: 49,
      gapThresholdMinutes: 30,
      timelineTimeSource: 'uploaded_at',
      timelineConfidence: 'best_available',
      recordedAtAvailableCount: 0,
      orderedPieceIds: [
        'clip:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'clip:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'clip:cccccccc-cccc-cccc-cccc-cccccccccccc',
      ].join(' > '),
      targetRoute: '/dashboard/trainer/plaud?pieces=pending',
      items: [
        {
          id: 'plaud:pending-pieces',
          kind: 'clip_bundle',
          queueStatus: 'unprocessed',
          audioPieces: 3,
          audioBundles: 2,
          audioConfidence: 'medium',
          needsOrderingReview: true,
          reviewRoute: '/dashboard/trainer/plaud?pieces=pending',
        },
      ],
    });
    expect(result.commandHint).toMatch(/upload\/ingest timestamps/i);
    expect(result.pieceTimeline).toMatch(/1\. applaud_webhook uploaded_at=.*45s/);
    expect(result.pieceTimeline).toMatch(/gap 49m/);
    expect(JSON.stringify(result)).not.toMatch(/Do Not Return|clientName|transcript/i);
  });
});
