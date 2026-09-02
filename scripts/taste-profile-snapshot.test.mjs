/**
 * taste-profile-snapshot.test.mjs — regression tests for the taste bridge.
 * Run: node --test scripts/taste-profile-snapshot.test.mjs
 *
 * The fixture direction shape mirrors the REAL compiler output
 * (swan-taste-brain prompter/lib/profile.mjs directions()): id/tier/title/
 * because/srefs/themeWords/evidenceEventIds/note — deliberately NOT the
 * name/codes fields the first version of the bridge invented. The outage
 * test fails against the old behavior (writeOffline overwrote the snapshot).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProfile, renderSnapshot, directionLine, SCHEMA, EVIDENCE_FLOOR } from './taste-profile-snapshot.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const script = path.join(here, 'taste-profile-snapshot.mjs');
const snapshotPath = path.join(root, '.ai-workflow', 'taste-profile.local.md');
const statusPath = path.join(root, '.ai-workflow', 'taste-profile.status.local.md');

const HASH = 'a'.repeat(64);
const realShapeBody = () => ({
  profileId: 'sean', projectId: 'default', grids: 3, judgements: 18,
  directions: [
    { id: 'dir:midjourney-srefs', tier: 'evidence', title: 'Style codes you keep choosing', because: [], srefs: ['1234', '5678'], evidenceEventIds: ['e1', 'e2'] },
    { id: 'dir:prior:quiet-realism', tier: 'prior', title: 'quiet realism', because: [], note: 'from themes.md — not yet backed by your picks', evidenceEventIds: [] },
  ],
  proposedAvoids: ['psychedelic'],
  snapshot: { schemaVersion: SCHEMA, sourceHash: HASH, generatedAt: '2026-09-01T00:00:00Z', tasteSource: 'markdown+evidence', confidence: 'partial' },
});

test('valid real-shape body passes validation', () => {
  assert.equal(validateProfile(realShapeBody()).ok, true);
});

test('wrong schemaVersion is rejected', () => {
  const b = realShapeBody(); b.snapshot.schemaVersion = 'taste-snapshot/2';
  const v = validateProfile(b);
  assert.equal(v.ok, false); assert.match(v.reason, /schemaVersion/);
});

test('bad sourceHash is rejected', () => {
  const b = realShapeBody(); b.snapshot.sourceHash = 'deadbeef';
  const v = validateProfile(b);
  assert.equal(v.ok, false); assert.match(v.reason, /sourceHash/);
});

test('imposter body without snapshot envelope is rejected', () => {
  assert.equal(validateProfile({ hello: 'world' }).ok, false);
  assert.equal(validateProfile({ grids: 3, judgements: 18, directions: [] }).ok, false);
});

test('real direction fields are projected — title/srefs/tier, never "unnamed"', () => {
  const md = renderSnapshot(realShapeBody(), 'T', 'S');
  assert.match(md, /\[EVIDENCE\] Style codes you keep choosing — srefs: 1234, 5678 · evidence events: 2/);
  assert.match(md, /\[PRIOR\] quiet realism.*from themes\.md/);
  assert.match(md, new RegExp(`sourceHash: ${HASH}`));
  assert.doesNotMatch(md, /unnamed|untitled/);
});

test('a direction with no title falls back to id, tier verbatim', () => {
  assert.match(directionLine({ id: 'dir:x', tier: 'evidence' }), /\[EVIDENCE\] dir:x/);
  assert.match(directionLine({}), /\[UNTIERED\] untitled/);
});

test('cold profile below the evidence floor is marked INSUFFICIENT EVIDENCE', () => {
  const b = realShapeBody(); b.grids = 1; b.judgements = 4;
  const md = renderSnapshot(b, 'T', 'S');
  assert.match(md, /INSUFFICIENT EVIDENCE/);
  assert.match(md, new RegExp(`floor: ${EVIDENCE_FLOOR.judgements} judgements / ${EVIDENCE_FLOOR.grids} grids`));
});

test('profile at the floor is NOT marked insufficient', () => {
  const b = realShapeBody(); b.grids = 2; b.judgements = 8;
  assert.doesNotMatch(renderSnapshot(b, 'T', 'S'), /INSUFFICIENT EVIDENCE/);
});

test('OUTAGE PRESERVES LAST-KNOWN-GOOD (old behavior overwrote it — this is the regression)', () => {
  mkdirSync(path.dirname(snapshotPath), { recursive: true });
  const sentinel = `# sentinel last-known-good ${Date.now()}\n`;
  writeFileSync(snapshotPath, sentinel);
  const r = spawnSync(process.execPath, [script], { env: { ...process.env, SWAN_TASTE_API: 'http://127.0.0.1:9' }, encoding: 'utf8', timeout: 20000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OFFLINE/);
  assert.equal(readFileSync(snapshotPath, 'utf8'), sentinel, 'snapshot must be untouched by an outage');
  assert.match(readFileSync(statusPath, 'utf8'), /state: OFFLINE/);
});

/** spawnSync blocks this process's event loop, so mock servers must live in their OWN process. */
async function withMockServer(payloadJson, fn) {
  const srv = spawn(process.execPath, ['-e', `
    const http = require('node:http');
    http.createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(process.env.PAYLOAD); })
      .listen(7398, '127.0.0.1', () => console.log('up'));
  `], { env: { ...process.env, PAYLOAD: payloadJson }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((ok, bad) => { srv.stdout.once('data', ok); srv.once('exit', () => bad(new Error('mock died'))); });
  try { return fn(); } finally { srv.kill(); }
}

test('malformed live response → OFFLINE status, snapshot preserved', async () => {
  const sentinel = `# sentinel ${Date.now()}\n`;
  writeFileSync(snapshotPath, sentinel);
  await withMockServer('{"nope":1}', () => {
    const r = spawnSync(process.execPath, [script], { env: { ...process.env, SWAN_TASTE_API: 'http://127.0.0.1:7398' }, encoding: 'utf8', timeout: 20000 });
    assert.match(r.stdout, /OFFLINE \(not the Taste Brain/);
    assert.equal(readFileSync(snapshotPath, 'utf8'), sentinel);
  });
});

test('valid live response writes the snapshot atomically and an OK status', async () => {
  await withMockServer(JSON.stringify(realShapeBody()), () => {
    const r = spawnSync(process.execPath, [script], { env: { ...process.env, SWAN_TASTE_API: 'http://127.0.0.1:7398' }, encoding: 'utf8', timeout: 20000 });
    assert.match(r.stdout, /OK grids=3 judgements=18 directions=2/);
    assert.match(readFileSync(snapshotPath, 'utf8'), /Style codes you keep choosing/);
    assert.match(readFileSync(statusPath, 'utf8'), /state: OK/);
    assert.equal(existsSync(`${snapshotPath}.tmp-${process.pid}`), false, 'no tmp file left behind');
  });
});

test('non-loopback SWAN_TASTE_API is refused with exit 1', () => {
  const r = spawnSync(process.execPath, [script], { env: { ...process.env, SWAN_TASTE_API: 'http://example.com' }, encoding: 'utf8', timeout: 20000 });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /non-loopback/);
});
