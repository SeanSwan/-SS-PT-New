import { describe, expect, it } from 'vitest';

import { getCoachIntakeHealth } from '../../services/coachIntakeHealthService.mjs';

function fakeSequelize({ tableReady = true, healthRow = {} } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('to_regclass')) {
        return [{ items_exists: tableReady ? 'coach_intake_items' : null }];
      }
      return [{
        total: 4,
        actionable: 3,
        today: 1,
        unprocessed: 1,
        processing: 1,
        ready_review: 1,
        failed: 1,
        needs_client: 2,
        stuck_processing: 1,
        oldest_actionable_at: '2026-05-06T12:00:00.000Z',
        oldest_processing_at: '2026-05-06T12:05:00.000Z',
        ...healthRow,
      }];
    },
  };
}

describe('coachIntakeHealthService', () => {
  it('returns PII-safe queue health counts without selecting encrypted payload fields', async () => {
    const db = fakeSequelize();
    const result = await getCoachIntakeHealth({
      userId: 7,
      now: new Date('2026-05-06T13:00:00.000Z'),
      sequelizeOverride: db,
    });

    expect(result).toMatchObject({
      schemaReady: true,
      status: 'degraded',
      counts: {
        total: 4,
        actionable: 3,
        readyReview: 1,
        failed: 1,
        needsClient: 2,
        stuckProcessing: 1,
      },
      nextOperatorAction: {
        key: 'inspect_stuck_processing',
        label: 'Inspect stuck processing intake',
      },
    });
    const aggregateSql = db.calls.at(-1).sql;
    expect(aggregateSql).not.toMatch(/payload_cipher|payload_iv|payload_tag|metadata_json|resolver_json|duplicate_scan_json/i);
  });

  it('fails closed into an unavailable health state when intake tables are absent', async () => {
    const result = await getCoachIntakeHealth({
      userId: 7,
      sequelizeOverride: fakeSequelize({ tableReady: false }),
    });

    expect(result).toMatchObject({
      schemaReady: false,
      status: 'unavailable',
      counts: { total: 0, actionable: 0 },
      nextOperatorAction: { key: 'schema_unavailable' },
    });
  });
});
