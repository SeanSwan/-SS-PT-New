/**
 * Phase 6 Slice B — unified PLAUD intake queue locks.
 * ===================================================
 * Protects the read-model slice that lets the PLAUD workspace show manual
 * clips, Applaud webhook clips, and merge-review rows as one queue without
 * exposing transcript bodies or adding a migration.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  mapClipRowToIntakeItem,
  mapMergeRowToIntakeItem,
  summarizeIntakeItems,
  listPlaudIntakeItems,
} from '../../services/plaudIntakeQueueService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTES_SRC = readFileSync(
  resolve(__dirname, '../../routes/plaud/plaudIntakeRoutes.mjs'), 'utf8',
);
const CONTROLLER_SRC = readFileSync(
  resolve(__dirname, '../../controllers/plaud/plaudIntakeController.mjs'), 'utf8',
);
const SERVICE_SRC = readFileSync(
  resolve(__dirname, '../../services/plaudIntakeQueueService.mjs'), 'utf8',
);
const CORE_ROUTES = readFileSync(
  resolve(__dirname, '../../core/routes.mjs'), 'utf8',
);

describe('Phase 6 Slice B — PLAUD intake route contract', () => {
  it('mounts GET /api/plaud/intake behind feature flag, auth, and role middleware', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(plaudFeatureFlag\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(protect\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(authorize\(\['admin',\s*'trainer'\]\)\)/);
    expect(ROUTES_SRC).toMatch(/router\.get\(['"]\/['"],\s*listPlaudIntakeHandler\)/);
    expect(CORE_ROUTES).toMatch(/app\.use\(\s*['"]\/api\/plaud\/intake['"]\s*,\s*plaudIntakeRoutes\s*\)/);
  });

  it('returns list-safe metadata only and never decrypts transcript payloads', () => {
    expect(CONTROLLER_SRC).toMatch(/listPlaudIntakeItems/);
    expect(SERVICE_SRC).toMatch(/payload_cipher\s+IS\s+NOT\s+NULL\s+AS\s+has_cipher/);
    expect(SERVICE_SRC).not.toMatch(/decryptPayload/);
    expect(SERVICE_SRC).not.toMatch(/payload\.transcript/);
    expect(SERVICE_SRC).not.toMatch(/parsedWorkout/);
  });

  it('uses QueryTypes.SELECT for every raw query to avoid Sequelize tuple confusion', () => {
    const queryCount = (SERVICE_SRC.match(/sequelizeToUse\.query\(/g) || []).length;
    const selectCount = (SERVICE_SRC.match(/type:\s*QueryTypes\.SELECT/g) || []).length;
    expect(queryCount).toBeGreaterThan(0);
    expect(selectCount).toBe(queryCount);
  });
});

describe('Phase 6 Slice B — PLAUD intake mapping', () => {
  it('maps Applaud pending clips to unprocessed intake items', () => {
    const item = mapClipRowToIntakeItem({
      clip_id: '11111111-1111-1111-1111-111111111111',
      filename_original: 'session.mp3',
      mimetype: 'audio/mpeg',
      size_bytes: 1234,
      duration_sec: '61.5',
      status: 'pending_merge',
      r2_mirror_status: 'mirrored',
      uploaded_at: '2026-05-05T20:00:00.000Z',
      expires_at: '2026-05-06T20:00:00.000Z',
      client_id: 42,
      client_first_name: 'Test',
      client_last_name: 'Client',
      clip_source: 'applaud_webhook',
    });

    expect(item).toMatchObject({
      id: 'clip:11111111-1111-1111-1111-111111111111',
      kind: 'clip',
      source: 'applaud_webhook',
      sourceLabel: 'Applaud',
      queueStatus: 'unprocessed',
      clientId: 42,
      clientName: 'Test Client',
      canReview: false,
    });
  });

  it('maps completed merge rows with cipher to ready-review items', () => {
    const item = mapMergeRowToIntakeItem({
      merge_request_id: '22222222-2222-2222-2222-222222222222',
      status: 'completed',
      client_id: 7,
      client_first_name: 'Ready',
      client_last_name: 'Review',
      clip_ids: ['a', 'b', 'c'],
      parsed_exercise_count: 8,
      boundary_warning: null,
      error_code: null,
      has_cipher: true,
      cipher_purged: false,
      created_at: '2026-05-05T21:00:00.000Z',
      completed_at: '2026-05-05T21:01:00.000Z',
      expires_at: '2026-05-06T21:00:00.000Z',
    });

    expect(item).toMatchObject({
      id: 'merge:22222222-2222-2222-2222-222222222222',
      kind: 'merge_request',
      source: 'plaud_merge',
      queueStatus: 'ready_review',
      clientName: 'Ready Review',
      clipCount: 3,
      parsedExerciseCount: 8,
      canReview: true,
    });
  });

  it('summarizes queue blockers without treating archived rows as actionable', () => {
    const summary = summarizeIntakeItems([
      { queueStatus: 'unprocessed', needsClient: false },
      { queueStatus: 'ready_review', needsClient: false },
      { queueStatus: 'failed', needsClient: false },
      { queueStatus: 'archived', needsClient: false },
      { queueStatus: 'processing', needsClient: true },
    ]);

    expect(summary).toMatchObject({
      total: 5,
      actionable: 4,
      unprocessed: 1,
      readyReview: 1,
      failed: 1,
      processing: 1,
      needsClient: 1,
    });
  });

  it('defaults the returned queue to actionable items, not archived history', async () => {
    const sequelizeOverride = {
      query: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            merge_request_id: '55555555-5555-5555-5555-555555555555',
            status: 'approved',
            client_id: 1,
            client_first_name: 'Done',
            client_last_name: 'Client',
            clip_ids: ['a', 'b'],
            parsed_exercise_count: 4,
            has_cipher: false,
            cipher_purged: true,
            created_at: '2026-05-05T20:00:00.000Z',
            completed_at: '2026-05-05T20:01:00.000Z',
            expires_at: '2026-05-06T20:00:00.000Z',
          },
          {
            merge_request_id: '66666666-6666-6666-6666-666666666666',
            status: 'completed',
            client_id: 2,
            client_first_name: 'Ready',
            client_last_name: 'Client',
            clip_ids: ['a', 'b'],
            parsed_exercise_count: 5,
            has_cipher: true,
            cipher_purged: false,
            created_at: '2026-05-05T21:00:00.000Z',
            completed_at: '2026-05-05T21:01:00.000Z',
            expires_at: '2026-05-06T21:00:00.000Z',
          },
        ]),
    };

    const result = await listPlaudIntakeItems({ userId: 9, sequelizeOverride });

    expect(result.scope).toBe('actionable');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].entityId).toBe('66666666-6666-6666-6666-666666666666');
    expect(result.summary).toMatchObject({ total: 2, actionable: 1 });
    expect(sequelizeOverride.query).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        replacements: expect.objectContaining({
          mergeStatuses: expect.not.arrayContaining(['approved', 'discarded']),
        }),
      }),
    );
  });
});
