import { describe, expect, it } from 'vitest';

import {
  COACH_INTAKE_RETENTION_POLICY,
  getCoachIntakeRetentionReport,
} from '../../services/coachIntakeRetentionPolicyService.mjs';

function fakeSequelize({ tableReady = true, rows = [] } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('to_regclass')) {
        return [{ items_exists: tableReady ? 'coach_intake_items' : null }];
      }
      return rows;
    },
  };
}

describe('coachIntakeRetentionPolicyService', () => {
  it('classifies raw intake artifact retention without selecting encrypted payload bodies', async () => {
    const db = fakeSequelize({
      rows: [
        {
          id: 'applied-old',
          status: 'APPLIED',
          source_type: 'chat_narrative',
          has_payload_cipher: true,
          has_payload_iv: true,
          has_payload_tag: true,
          uploaded_at: '2026-05-04T12:00:00.000Z',
          updated_at: '2026-05-04T12:10:00.000Z',
          archived_at: '2026-05-04T12:10:00.000Z',
          created_at: '2026-05-04T12:00:00.000Z',
        },
        {
          id: 'failed-old',
          status: 'FAILED',
          source_type: 'audio_upload',
          has_payload_cipher: true,
          has_payload_iv: true,
          has_payload_tag: true,
          uploaded_at: '2026-04-20T12:00:00.000Z',
          updated_at: '2026-04-20T12:10:00.000Z',
          archived_at: null,
          created_at: '2026-04-20T12:00:00.000Z',
        },
        {
          id: 'ready-stale',
          status: 'READY_FOR_REVIEW',
          source_type: 'typed_note',
          has_payload_cipher: true,
          has_payload_iv: true,
          has_payload_tag: true,
          uploaded_at: '2026-03-20T12:00:00.000Z',
          updated_at: '2026-03-20T12:10:00.000Z',
          archived_at: null,
          created_at: '2026-03-20T12:00:00.000Z',
        },
        {
          id: 'applied-fresh',
          status: 'APPLIED',
          source_type: 'voice_note',
          has_payload_cipher: true,
          has_payload_iv: true,
          has_payload_tag: true,
          uploaded_at: '2026-05-07T00:00:00.000Z',
          updated_at: '2026-05-07T00:10:00.000Z',
          archived_at: '2026-05-07T00:10:00.000Z',
          created_at: '2026-05-07T00:00:00.000Z',
        },
      ],
    });

    const report = await getCoachIntakeRetentionReport({
      userId: 11,
      now: new Date('2026-05-07T13:00:00.000Z'),
      sequelizeOverride: db,
    });

    expect(report).toMatchObject({
      schemaReady: true,
      status: 'attention',
      policy: COACH_INTAKE_RETENTION_POLICY,
      summary: {
        totalWithRawArtifacts: 4,
        purgeReady: 2,
        reviewRequired: 1,
        retained: 1,
      },
    });
    expect(report.items.map((item) => [item.id, item.classification])).toEqual([
      ['applied-old', 'purge_ready'],
      ['failed-old', 'purge_ready'],
      ['ready-stale', 'review_required'],
      ['applied-fresh', 'retained'],
    ]);

    const retentionSql = db.calls.at(-1).sql;
    expect(retentionSql).toMatch(/payload_cipher IS NOT NULL AS has_payload_cipher/i);
    expect(retentionSql).toMatch(/payload_iv IS NOT NULL AS has_payload_iv/i);
    expect(retentionSql).toMatch(/payload_tag IS NOT NULL AS has_payload_tag/i);

    const sqlWithoutPresenceChecks = retentionSql
      .replace(/payload_cipher IS NOT NULL( AS has_payload_cipher)?/gi, '')
      .replace(/payload_iv IS NOT NULL( AS has_payload_iv)?/gi, '')
      .replace(/payload_tag IS NOT NULL( AS has_payload_tag)?/gi, '');
    expect(sqlWithoutPresenceChecks).not.toMatch(/payload_cipher|payload_iv|payload_tag/i);
  });

  it('fails closed without querying data when user id is invalid', async () => {
    const db = fakeSequelize();

    const report = await getCoachIntakeRetentionReport({
      userId: null,
      sequelizeOverride: db,
    });

    expect(report).toMatchObject({
      schemaReady: false,
      status: 'unavailable',
      summary: {
        totalWithRawArtifacts: 0,
        purgeReady: 0,
      },
      nextOperatorAction: { key: 'auth_required' },
    });
    expect(db.calls).toHaveLength(0);
  });

  it('fails closed when the Coach intake table is absent', async () => {
    const db = fakeSequelize({ tableReady: false });

    const report = await getCoachIntakeRetentionReport({
      userId: 11,
      sequelizeOverride: db,
    });

    expect(report).toMatchObject({
      schemaReady: false,
      status: 'unavailable',
      summary: {
        totalWithRawArtifacts: 0,
        reviewRequired: 0,
      },
      nextOperatorAction: { key: 'schema_unavailable' },
    });
    expect(db.calls).toHaveLength(1);
  });
});
