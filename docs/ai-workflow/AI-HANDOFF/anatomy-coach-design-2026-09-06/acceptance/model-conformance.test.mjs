/** Executable future-model contract. Synthetic calibration only; no app implementation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

if (!process.env.SPA_MODEL_MODULE) throw new Error('SETUP BLOCKED: supply reviewed pure SPA_MODEL_MODULE; this is not behavioral RED.');
const { evaluateRecovery } = await import(pathToFileURL(resolve(process.env.SPA_MODEL_MODULE)).href);
assert.equal(typeof evaluateRecovery, 'function', 'Adapter must export evaluateRecovery(input).');
const now = '2026-09-06T12:00:00Z';
const profile = { id: 'SYNTHETIC-ONLY', halfLifeHours: 48, low: 1, high: 3, minimumCoverage: 0.9 };
const set = { sourceKey: 'fixture/session-1/set-1', completedAt: now, status: 'completed',
  modality: 'resistance', setType: 'working', rpe: 10, muscleId: 'fixture-quad', mappingWeight: 1 };
const input = (sets, extra = {}) => ({ asOf: now, sets, calibration: profile, pain: [], ...extra });

test('T11/T13: exact eligible exposure and half-life, no tonnage needed', () => {
  assert.equal(evaluateRecovery(input([set])).muscles[0].exposure, 1);
  const older = { ...set, completedAt: '2026-09-04T12:00:00Z' };
  assert.equal(evaluateRecovery(input([older])).muscles[0].exposure, 0.5);
});
test('T12: duplicate canonical source key contributes once', () => {
  assert.equal(evaluateRecovery(input([set, { ...set }])).muscles[0].exposure, 1);
});
test('T11/T14: absent RPE is unknown, not default effort', () => {
  const result = evaluateRecovery(input([{ ...set, rpe: null }]));
  assert.equal(result.muscles[0].estimate, null);
  assert.ok(result.reasons.includes('missing-rpe'));
});
test('T14: absent calibration does not become a production default', () => {
  const result = evaluateRecovery(input([set], { calibration: null }));
  assert.equal(result.muscles[0].estimate, null);
  assert.ok(result.reasons.includes('calibration-unavailable'));
});
test('T13: future and planned sets are excluded with reasons', () => {
  const result = evaluateRecovery(input([{ ...set, completedAt: '2026-09-07T12:00:00Z' },
    { ...set, sourceKey: 'fixture/planned', status: 'planned' }]));
  assert.equal(result.eligibleSets, 0);
  assert.notEqual(result.status, 'fresh');
});
test('T14: unsupported modalities are not invented resistance equivalents', () => {
  const result = evaluateRecovery(input([{ ...set, modality: 'cardio' }]));
  assert.equal(result.eligibleSets, 0);
  assert.ok(result.reasons.includes('unsupported-modality'));
});
test('T15: pain is independent even after exposure decays', () => {
  const pain = [{ episodeId: 'synthetic-1', regionId: 'left_knee', painLevel: 4, active: true }];
  const result = evaluateRecovery(input([{ ...set, completedAt: '2026-08-01T12:00:00Z' }], { pain }));
  assert.deepEqual(result.pain, pain);
  assert.equal(result.actions?.some(a => a.type === 'resolve-pain' || a.type === 'apply-plan') ?? false, false);
});
