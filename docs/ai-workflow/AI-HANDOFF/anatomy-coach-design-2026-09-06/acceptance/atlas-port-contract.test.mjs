/** Future direct-port manifest conformance. Real source export fixtures required; no app or GPU proof alone. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
if (!process.env.SPA_UPSTREAM_MANIFEST || !process.env.SPA_PORT_MANIFEST) {
  throw Error('SETUP BLOCKED: provide source and port conformance manifests; missing setup is not behavioral RED.');
}
const source = JSON.parse(readFileSync(process.env.SPA_UPSTREAM_MANIFEST, 'utf8'));
const port = JSON.parse(readFileSync(process.env.SPA_PORT_MANIFEST, 'utf8'));
assert.match(source.sourceCommit, /^[0-9a-f]{40}$/);
assert.ok(Array.isArray(source.parts) && source.parts.length > 2000, 'Use the real full reference inventory.');
const sorted = items => [...items].sort((a,b) => a.id.localeCompare(b.id));
test('T26: exact source revision, source part inventory and geometry retained for initial port', () => {
  assert.equal(port.sourceCommit, source.sourceCommit);
  const stable = items => sorted(items.map(({id,system,geometrySha256})=>({id,system,geometrySha256})));
  for (const part of source.parts) assert.match(part.geometrySha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(stable(port.parts), stable(source.parts));
});
test('T26: concepts, membership and capability set survive adaptation', () => {
  const membership = items => sorted(items.map(({id,partIds})=>({id,partIds:[...partIds].sort()})));
  assert.deepEqual(membership(port.concepts), membership(source.concepts));
  assert.deepEqual([...port.capabilities].sort(), [...source.capabilities].sort());
  assert.deepEqual([...port.systems].sort(), [...source.systems].sort());
});
test('T26: report, recovery and explorer reference the same full catalog', () => {
  assert.equal(port.modes.report.catalogHash, source.catalogHash);
  assert.equal(port.modes.recovery.catalogHash, source.catalogHash);
  assert.equal(port.modes.explore.catalogHash, source.catalogHash);
  assert.equal(port.modes.report.rendererKind, 'ported-human-atlas');
  assert.equal(port.modes.report.fallbackDefault, false);
});
