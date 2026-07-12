/**
 * ring-weekly-source — regression tests
 * =====================================
 * The Apex dashboard's Ascension Rings (weekly workouts + weekly volume)
 * were deliberately NOT built against fake data — the real weekly aggregates
 * did not exist. This endpoint is that source of truth.
 *
 * Contract locks:
 *  1. Real snake_case tables only (workout_sessions / workout_logs) — the
 *     Phase 14 drift class.
 *  2. Ships the RAW session timestamp (ws.date AS ts), never a server-rendered
 *     calendar-day or week label — Sean's 2026-07-12 ruling: day/week bucketing
 *     happens client-side in the USER'S local time (a Sunday 22:00 PT workout
 *     belongs to the user's Sunday, not UTC Monday).
 *  3. LEFT JOIN workout_logs so a completed session with no set logs still
 *     counts toward the workouts ring (volume 0, not dropped).
 *  4. Standard chart-endpoint error contract (400 invalid user, 500 shape).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getWeeklyRingSourceChart } from '../../controllers/chartDataController.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const makeReqRes = ({ sql = [], rows = [] } = {}) => {
  const querySpy = vi.fn(async (s) => {
    sql.push(s);
    return [rows];
  });
  const fakeSequelize = { query: querySpy };
  const req = {
    params: { userId: '42' },
    app: { get: vi.fn((k) => (k === 'sequelize' ? fakeSequelize : undefined)) },
  };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return { req, res, querySpy, sql };
};

describe('getWeeklyRingSourceChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries only the real snake_case tables', async () => {
    const { req, res, sql } = makeReqRes();
    await getWeeklyRingSourceChart(req, res);

    const executedSql = sql[0];
    expect(executedSql).toMatch(/FROM\s+workout_sessions/i);
    expect(executedSql).toMatch(/LEFT\s+JOIN\s+workout_logs/i);
    expect(executedSql).not.toMatch(/"WorkoutSessions"|"WorkoutLogs"|"Sets"|"Exercises"/);
  });

  it('ships the raw session timestamp so the client buckets the user-LOCAL week', async () => {
    const { req, res, sql } = makeReqRes({
      rows: [{ ts: '2026-07-06T05:00:00.000Z', duration_minutes: 45, volume: 12500, sets: 18 }],
    });
    await getWeeklyRingSourceChart(req, res);

    const executedSql = sql[0];
    expect(executedSql).toMatch(/ws\.date\s+AS\s+ts/i);
    // No server-side calendar rendering or week truncation — tz truth lock.
    expect(executedSql).not.toMatch(/TO_CHAR/i);
    expect(executedSql).not.toMatch(/DATE_TRUNC/i);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        windowDays: 28,
        sessions: [{ ts: '2026-07-06T05:00:00.000Z', durationMinutes: 45, volume: 12500, sets: 18 }],
      },
    });
  });

  it('counts completed sessions with zero set logs (volume 0, not dropped)', async () => {
    const { req, res, sql } = makeReqRes({
      rows: [{ ts: '2026-07-08T18:00:00.000Z', duration_minutes: 30, volume: 0, sets: 0 }],
    });
    await getWeeklyRingSourceChart(req, res);

    // The SQL must not require a matching workout_logs row.
    expect(sql[0]).toMatch(/LEFT\s+JOIN\s+workout_logs/i);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.sessions).toHaveLength(1);
    expect(payload.data.sessions[0].volume).toBe(0);
  });

  it('scopes to the user and to completed sessions inside the window', async () => {
    const { req, res, sql, querySpy } = makeReqRes();
    await getWeeklyRingSourceChart(req, res);

    expect(sql[0]).toMatch(/ws\."userId"\s*=\s*:userId/);
    expect(sql[0]).toMatch(/ws\.status\s*=\s*'completed'/);
    expect(sql[0]).toMatch(/INTERVAL\s+'28 days'/i);
    expect(querySpy.mock.calls[0][1]).toEqual(
      expect.objectContaining({ replacements: { userId: 42 } }),
    );
  });

  it('returns 200 with an empty sessions array when there is no history', async () => {
    const { req, res } = makeReqRes();
    await getWeeklyRingSourceChart(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { windowDays: 28, sessions: [] },
    });
  });

  it('rejects invalid userId with 400', async () => {
    const { req, res, querySpy } = makeReqRes();
    req.params.userId = 'not-a-number';
    req.user = undefined;

    await getWeeklyRingSourceChart(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('returns the standard sanitized 500 on database failure', async () => {
    const querySpy = vi.fn(async () => { throw new Error('database unavailable'); });
    const req = {
      params: { userId: '42' },
      app: { get: vi.fn((k) => (k === 'sequelize' ? { query: querySpy } : undefined)) },
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    await getWeeklyRingSourceChart(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'internal_error' }),
    );
  });
});

describe('ring-weekly-source route mounts', () => {
  const clientRoutesSource = readFileSync(
    resolve(__dirname, '../../routes/clientAnalyticsRoutes.mjs'), 'utf8');
  const adminRoutesSource = readFileSync(
    resolve(__dirname, '../../routes/analyticsRoutes.mjs'), 'utf8');

  it('mounts on the client analytics router behind the same tier gate as chart-weekly-volume', () => {
    expect(clientRoutesSource).toContain(
      "router.get('/ring-weekly-source', requireTeaserAnalytics, getWeeklyRingSourceChart)");
  });

  it('mounts on the admin/trainer analytics router behind tier + ownership gates', () => {
    expect(adminRoutesSource).toContain(
      "router.get('/:userId/ring-weekly-source',");
    expect(adminRoutesSource).toMatch(
      /ring-weekly-source',\s*requireTier\('pro', 'charts\.full'\), requireOwnershipOrTrainer, getWeeklyRingSourceChart\)/);
  });
});
