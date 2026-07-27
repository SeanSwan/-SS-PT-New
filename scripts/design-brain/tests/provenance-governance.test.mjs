/** Provenance governance after the Opus/Kimi hardening pass. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProbe, validateSourceClass, validateSourceClearance } from '../src/provenance.mjs';
test('Probe is exactly one query and result', () => {
  assert.equal(validateProbe({ queries: 1, results: 1 }), true);
  assert.throws(() => validateProbe({ queries: 2, results: 1 }), (error) => error.code === 'E_PROBE_CAP');
});
test('only explicit non-production source classes enter receipt workflows', () => {
  for (const value of ['owned-synthetic', 'synthetic', 'licensed', 'mobbin']) assert.equal(validateSourceClass(value), true);
  assert.throws(() => validateSourceClass('owned-production'), (error) => error.code === 'E_SOURCE_PRODUCTION_BLOCKED');
});
test('unsigned legacy clearance fails closed', () => {
  const result = validateSourceClearance({ schemaVersion: 'clearance/1', sourceClass: 'mobbin', scope: 'source-corpus' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('schemaVersion must be clearance/2'));
});