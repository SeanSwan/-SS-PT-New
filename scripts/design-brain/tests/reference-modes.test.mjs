/** P/S/D/X governance contract. No provider calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as modes from '../src/reference-modes.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
test('shared modes refuse Inspect and every legacy alias', () => {
  assert.deepEqual(modes.REFERENCE_MODES, ['P', 'S', 'D', 'X']);
  assert.equal(modes.MODE_POLICY.S.status, 'disabled-pending-gates');
  for (const value of ['I', 'H', 'T', 'L']) assert.throws(() => modes.assertCurrentReferenceMode(value), (error) => error.code === 'E_LEGACY_MODE_REFUSED');
});
test('Spec mode ships disabled under the signed activation schema', () => {
  const path = join(ROOT, 'scripts/design-brain/config/spec-mode.json');
  assert.equal(existsSync(path), true);
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { schemaVersion: 'spec-mode/2', enabled: false, termsVersion: '2026-05-16', activationRef: null });
});
test('protocol names the remaining external gates', () => {
  const protocol = read('docs/ai-workflow/design-brain/external-reference-mcp.md');
  assert.match(protocol, /reference-modes\.mjs/);
  assert.match(protocol, /written clarification from Mobbin/i);
  assert.match(protocol, /qualified legal review/i);
  assert.match(protocol, /explicit Sean risk acceptance/i);
});