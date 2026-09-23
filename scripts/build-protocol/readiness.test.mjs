/** Readiness gate negative controls. Uses synthetic artifacts in isolated temporary storage. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { validateReceipt } from './check-readiness.mjs';

const root = mkdtempSync(join(tmpdir(), 'makeer-readiness-'));
const bytes = 'Synthetic requirement, artifact, and test evidence.\n';
writeFileSync(join(root, 'evidence.md'), bytes);
const ref = { path: 'evidence.md', sha256: createHash('sha256').update(bytes).digest('hex') };
const categories = ['baseline', 'requirements', 'blueprint', 'wireframes', 'flowchart',
  'contracts', 'state', 'sequence', 'erd', 'permissions', 'privacy', 'tests',
  'traceability', 'slices', 'operations', 'review', 'preservation'];
function packet() {
  return { schemaVersion: 1, phase: 'plan', ui: false,
    sections: Object.fromEntries(categories.map(id => [id, { status: 'COMPLETE', evidence: [ref] }])),
    requirements: [{ id: 'R01', acceptance: 'Action produces the specified output.', tests: ['T01'] }],
    tests: [{ id: 'T01', requirements: ['R01'], command: 'node test.mjs', status: 'PASS', evidence: [ref] }],
    blockers: [], nextSlice: 'S1',
  };
}
test.after(() => rmSync(root, { recursive: true, force: true }));
test('complete plan passes reference integrity checks', () => {
  assert.deepEqual(validateReceipt(packet(), root), []);
});
test('a missing required category blocks readiness', () => {
  const p = packet(); delete p.sections.traceability;
  assert.ok(validateReceipt(p, root).some(x => x.includes('traceability')));
});
test('core categories cannot be silently waived', () => {
  const p = packet(); p.sections.blueprint = { status: 'N/A', reason: 'small change' };
  assert.ok(validateReceipt(p, root).some(x => x.includes('blueprint')));
});
test('headless wireframes need a reason and UI wireframes cannot be waived', () => {
  const p = packet(); p.sections.wireframes = { status: 'N/A' };
  assert.ok(validateReceipt(p, root).length);
  p.sections.wireframes.reason = 'Headless adapter, no UI.';
  assert.deepEqual(validateReceipt(p, root), []);
  p.ui = true; assert.ok(validateReceipt(p, root).length);
});
test('unrun checks are explicit in a plan and block implementation verification', () => {
  const p = packet(); p.tests[0] = { ...p.tests[0], status: 'NOT RUN', reason: 'Requires S1.', evidence: [] };
  assert.deepEqual(validateReceipt(p, root), []);
  p.phase = 'implementation'; assert.ok(validateReceipt(p, root).length);
});
test('invalid phase, empty requirements, duplicate IDs and orphan tests are rejected', () => {
  for (const mutate of [
    p => p.phase = 'green', p => p.requirements = [],
    p => p.tests.push({ ...p.tests[0] }), p => p.requirements[0].tests = ['missing'],
    p => p.tests[0].requirements = [], p => p.tests[0].status = 'GREEN',
  ]) { const p = packet(); mutate(p); assert.ok(validateReceipt(p, root).length); }
});
test('missing, changed, and escaping evidence paths block readiness', () => {
  for (const evidence of [
    { ...ref, path: 'absent.md' }, { ...ref, sha256: '0'.repeat(64) },
    { ...ref, path: '../outside.md' },
  ]) { const p = packet(); p.sections.baseline.evidence = [evidence]; assert.ok(validateReceipt(p, root).length); }
});
test('open blockers and non-passing implementation tests block verification', () => {
  const p = packet(); p.blockers = ['Unresolved ownership.'];
  assert.ok(validateReceipt(p, root).length);
  p.blockers = []; p.phase = 'implementation'; p.tests[0].status = 'FAIL';
  assert.ok(validateReceipt(p, root).length);
});
