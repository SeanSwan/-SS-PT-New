/** SWAN-CHART-V3: isolated behavioral RED suite. No implementation, DB, network or credentials.
 * Run directly with Node; never include these intentional failures in the normal green suite.
 * IDs and expected behavior are frozen in 06-tests-and-traceability.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const sourceRoot = process.argv[2];
if (!sourceRoot) throw new Error('Pass the exact implementation worktree as the first argument.');
const target = pathToFileURL(resolve(sourceRoot, 'backend/services/charts-v3/metricMath.mjs')).href;
async function implementation() {
  if (!existsSync(new URL(target))) throw new Error(`EXPECTED RED: V3 metric implementation absent at ${target}`);
  return import(target); // dependency/syntax errors are unexpected, not disguised as missing feature
}
const start = '2026-08-24T00:00:00Z';
const end = '2026-08-31T00:00:00Z';
const session = (id, at, status = 'completed') => ({ id, at, status });
const period = (value, overrides = {}) => ({ value, complete: true, unit: 'sessions',
  sourceType: 'completed_sessions', metricId: 'workoutFrequency', exerciseKey: null, reps: null,
  period: { startDate: '2026-08-03', endDate: '2026-08-31', tz: 'America/Los_Angeles' }, ...overrides });
const priorPeriod = (value, overrides = {}) => period(value, {
  period: { startDate: '2026-07-06', endDate: '2026-08-03', tz: 'America/Los_Angeles' }, ...overrides,
});

test('M01 counts sessions, including two on one day', async () => {
  const { countCompletedSessions } = await implementation();
  assert.equal(countCompletedSessions([session('a', start), session('b', start)], start, end), 2);
});
test('M02 deduplicates IDs and obeys half-open bounds/status', async () => {
  const { countCompletedSessions } = await implementation();
  assert.equal(countCompletedSessions([
    session('a', start), session('a', start), session('b', end),
    session('c', start, 'planned'), session('d', '2026-08-23T23:59:59Z'),
  ], start, end), 1);
});
test('M03 converts kg to lb before any comparison', async () => {
  const { normalizeBodyWeight } = await implementation();
  const lb = normalizeBodyWeight(100, 'kg', 'lb');
  assert.ok(Math.abs(lb - 220.46226218487757) < 1e-8);
  assert.ok(Math.abs(normalizeBodyWeight(lb, 'lbs', 'kg') - 100) < 1e-8);
});
test('M04 excludes invalid/unknown-unit measurements, not zero-fills', async () => {
  const { normalizeBodyWeight } = await implementation();
  for (const [value, unit] of [[100, null], [100, 'stone'], [NaN, 'kg'], [-1, 'kg'], [null, 'kg'], ['100', 'kg']]) {
    assert.equal(normalizeBodyWeight(value, unit, 'lb'), null);
  }
});
test('M05 attendance with no resolved sessions is unknown', async () => {
  const { attendanceRate } = await implementation();
  assert.equal(attendanceRate({ completed: 0, skipped: 0, cancelled: 0 }), null);
});
test('M06 cancellation belongs in the stated denominator', async () => {
  const { attendanceRate } = await implementation();
  assert.equal(attendanceRate({ completed: 3, skipped: 1, cancelled: 2 }), 50);
});
test('M07 session intensity is not weighted by joined set count', async () => {
  const { meanSessionIntensity } = await implementation();
  assert.equal(meanSessionIntensity([
    { sessionId: 'a', intensity: 2 }, { sessionId: 'a', intensity: 2 },
    { sessionId: 'a', intensity: 2 }, { sessionId: 'b', intensity: 8 },
  ]), 5);
});
test('M08 only compares same basis and equal adjacent complete calendar spans', async () => {
  const { comparePeriods } = await implementation();
  const p=priorPeriod(9).period;
  for (const override of [{ complete: false }, { unit: 'kg' }, { sourceType: 'intensity' },
    { metricId: 'weeklyVolume' }, { exerciseKey: 'bench-press' }, { reps: 5 },
    { period: { ...p, tz: 'UTC' } }, { period: { ...p, startDate: '2026-07-13' } },
    { period: { ...p, startDate: '2026-06-29', endDate: '2026-07-27' } },
  ]) {
    assert.deepEqual(comparePeriods(period(12), priorPeriod(9, override)), { eligible: false, delta: null, percent: null });
  }
  const valid=comparePeriods(period(12),priorPeriod(9));
  assert.equal(valid.eligible,true); assert.equal(valid.delta,3);
  assert.ok(Math.abs(valid.percent-100/3)<1e-8);
});
test('M09 prior zero gives count delta but no fabricated percent', async () => {
  const { comparePeriods } = await implementation();
  assert.deepEqual(comparePeriods(period(3), priorPeriod(0)), { eligible: true, delta: 3, percent: null });
});
test('M10 first/equal observations are not records', async () => {
  const { isVerifiedRecord } = await implementation();
  assert.equal(isVerifiedRecord(135, []), false);
  assert.equal(isVerifiedRecord(135, [135, 130]), false);
  assert.equal(isVerifiedRecord(140, [135, 130]), true);
});
test('M11 estimated strength rejects impossible inputs, never clamps', async () => {
  const { estimateStrength } = await implementation();
  assert.ok(Math.abs(estimateStrength(100, 5) - 100 / (1.0278 - 0.0278 * 5)) < 1e-8);
  assert.equal(estimateStrength(100, 0), null);
  assert.equal(estimateStrength(100, 16), null);
  assert.equal(estimateStrength(2000, 1), null);
});
test('M12 share eligibility is a strict allowlist, never body/notes', async () => {
  const { canShareMetric } = await implementation();
  for (const id of ['weightTrend', 'bodyFatTrend', 'recoverySignal', 'attendanceReliability', 'unknown']) assert.equal(canShareMetric(id), false);
  for (const id of ['workoutFrequency', 'weeklyVolume', 'prTimeline', 'estOneRm']) assert.equal(canShareMetric(id), true);
});
