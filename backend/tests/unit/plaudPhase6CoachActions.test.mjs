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
      queueRoute: '/dashboard/training/plaud',
    });
    expect(JSON.stringify(result)).not.toMatch(/Do Not Return|transcript/i);
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
      queueRoute: '/dashboard/training/plaud',
    });
  });

  it('fails closed when PLAUD merge is disabled', async () => {
    process.env.PLAUD_MERGE_ENABLED = 'false';

    await expect(dispatchViewPlaudIntakeQueue(
      {},
      { user: { id: 42, role: 'trainer' }, options: { sequelize: sequelizeOverride } },
    )).rejects.toThrow(/PLAUD merge feature is not enabled/i);
    expect(listPlaudIntakeItems).not.toHaveBeenCalled();
  });
});
