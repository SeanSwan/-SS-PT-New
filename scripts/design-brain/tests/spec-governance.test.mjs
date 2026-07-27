/** Focused SDIR v2 invariants outside the full hardening suite. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as contract from '../src/spec-contract.mjs';
import * as budget from '../src/spec-budget.mjs';
import * as emitter from '../src/emit-vault.mjs';
const SPEC = (over = {}) => ({ specId: 'SDIR-budget-base', taskId: 'TASK-budget', swanSurface: '/surface/base', createdAt: '2026-07-26T07:00:00.000Z', ...over });
test('spec caps remain one/task, three/day, forty/quarter, and two/surface/30d', () => {
  const now = new Date('2026-07-26T07:00:00.000Z');
  assert.throws(() => budget.assertSpecCaps(SPEC(), [SPEC({ specId: 'SDIR-other' })], now), /task/i);
  const daily = [1, 2, 3].map((n) => SPEC({ specId: `SDIR-day-${n}`, taskId: `TASK-day-${n}`, swanSurface: `/surface/${n}`, createdAt: `2026-07-26T0${n}:00:00.000Z` }));
  assert.throws(() => budget.assertSpecCaps(SPEC(), daily, now), /3 per day/i);
  const surface = [1, 2].map((n) => SPEC({ specId: `SDIR-surface-${n}`, taskId: `TASK-surface-${n}`, createdAt: `2026-07-${20 + n}T07:00:00.000Z` }));
  assert.throws(() => budget.assertSpecCaps(SPEC(), surface, now), /2 per surface/i);
  const quarter = Array.from({ length: 40 }, (_, n) => SPEC({ specId: `SDIR-q-${n}`, taskId: `TASK-q-${n}`, swanSurface: `/surface/${n}`, createdAt: `2026-${n < 31 ? '07' : '08'}-${String((n % 31) + 1).padStart(2, '0')}T07:00:00.000Z` }));
  assert.throws(() => budget.assertSpecCaps(SPEC(), quarter, now), /40 per quarter/i);
});
test('disabled and unsigned Spec configurations fail closed', () => {
  assert.throws(() => contract.assertSpecModeEnabled({ schemaVersion: 'spec-mode/2', enabled: false }), (error) => error.code === 'E_SPEC_MODE_DISABLED');
  assert.throws(() => contract.assertSpecModeEnabled({ schemaVersion: 'spec-mode/2', enabled: true }), (error) => error.code === 'E_SPEC_ACTIVATION_REQUIRED');
});
test('experimental specs have no durable vault emitter', () => assert.equal(emitter.emitSpecsCollection, undefined));