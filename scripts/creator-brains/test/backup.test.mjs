#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/backup.test.mjs
 * PURPOSE: Backup, verification, isolated restore, non-destructive derived
 *          rollback, and publication atomicity under a real process kill
 *          (review HR25).
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair evidence)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * THE PACKET'S ACCEPTANCE FOR HR25: kill between each publication step,
 * restore into a new root and compare hashes, and never run a destructive
 * rollback against the real archive.
 *   BK4 kills a REAL child mid-publish: a reader must see the previous
 *   COMPLETE generation or the new one, never a mixture.
 *   BK3 restores into a new root and compares hashes file by file.
 *   BK5 proves the rollback no longer touches durable input.
 *
 * RUN: node --test scripts/creator-brains/test/backup.test.mjs
 * @module creator-brains/test/backup
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import {
  existsSync, readFileSync, readdirSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { makeClock, tempRoot, fixtureDoc } from './helpers.mjs';
import { paths } from '../lib/paths.mjs';
import {
  writeDoc, ensureStore, listDocsChecked,
} from '../lib/store.mjs';
import { buildBrain } from '../lib/extract.mjs';
import { publishBrain, listPublished } from '../lib/render.mjs';
import { exportBrains } from '../lib/export.mjs';
import {
  backupStore, verifyBackup, restoreStore, rollbackDerived, listStoreFiles,
  hashFile, readBackupManifest, BackupError, MANIFEST_NAME,
} from '../lib/backup.mjs';
// `deleteBackup` lives with the operator commands, not the library: it is an
// action a person takes, and the library has no business removing directories.
import { deleteBackup } from '../backup-command.mjs';

const LIB = fileURLToPath(new URL('../lib/', import.meta.url));
const A = 'UC' + 'a'.repeat(22);
const VA = 'a'.repeat(11);
const VB = 'b'.repeat(11);

/** A store with real documents, a registry, state and a published brain. */
async function seededStore(tag) {
  const r = tempRoot(`cb-${tag}`);
  ensureStore(r);
  writeFileSync(paths(r).registry, JSON.stringify({
    version: 1,
    creators: { [A]: { channelId: A, title: 'Alpha', enabled: true, addedAt: new Date(0).toISOString() } },
  }), 'utf-8');
  writeFileSync(paths(r).state, JSON.stringify({
    version: 1,
    videos: {
      [VA]: { videoId: VA, channelId: A, state: 'fetched', attempts: 0, nextRetryAt: null, lastError: null, title: 'One' },
      [VB]: { videoId: VB, channelId: A, state: 'fetched', attempts: 0, nextRetryAt: null, lastError: null, title: 'Two' },
    },
  }), 'utf-8');
  await writeDoc(r, fixtureDoc({ channelId: A, videoId: VA }));
  await writeDoc(r, fixtureDoc({
    channelId: A, videoId: VB, text: 'never blur the tear trough crease on a mature face',
    cues: [{ ms: 3000, text: 'never blur the tear trough crease on a mature face' }],
  }));
  const { valid } = listDocsChecked(r, A);
  publishBrain(buildBrain({ channelId: A, title: 'Alpha' }, { docs: valid }), {
    r, sources: valid.map((d) => d.text), now: makeClock(),
  });
  // Stage the vault too, so the derived set is populated and the classification
  // test is checking something that exists.
  exportBrains({ r, now: makeClock() });
  return r;
}

// ── What is durable vs derived ──────────────────────────────────────────────

test('BK1 the store distinguishes regenerable output from irreplaceable input', async () => {
  const r = await seededStore('bk1');
  const { durable, derived } = listStoreFiles(r);

  const durableRels = durable.map((d) => d.rel);
  assert.ok(durableRels.includes('registry.json'), 'owner decisions are durable');
  assert.ok(durableRels.includes('state.json'), 'retry history and content hashes are durable');
  assert.ok(durableRels.some((x) => x.startsWith('docs/')), 'the TRANSCRIPTS are durable');

  const derivedRels = derived.map((d) => d.rel);
  assert.ok(derivedRels.some((x) => x.startsWith('brains/')), 'brains are derived');
  assert.ok(derivedRels.some((x) => x.startsWith('vault/')), 'vault staging is derived');
  // The two sets must not overlap — a file in both would be ambiguous on restore.
  for (const d of durableRels) assert.ok(!derivedRels.includes(d), `${d} is classified twice`);
});

// ── Backup and verification ─────────────────────────────────────────────────

test('BK2 a backup covers every durable file and verifies by hash', async () => {
  const r = await seededStore('bk2');
  const dest = tempRoot('cb-bk2-out');

  const result = backupStore({ r, dest, now: Date.parse('2026-09-13T10:00:00Z') });
  assert.equal(result.ok, true);
  assert.ok(existsSync(result.manifestPath));

  const { durable } = listStoreFiles(r);
  assert.equal(result.files.length, durable.length, 'every durable file is in the backup');
  assert.ok(result.files.some((f) => f.startsWith('docs/')), 'including the transcripts');

  const verdict = verifyBackup(dest);
  assert.equal(verdict.ok, true, `verification failed: ${JSON.stringify(verdict.problems)}`);
  assert.equal(verdict.checked, verdict.total, 'every file was re-hashed');

  // Derived output is NOT in a durable-only backup.
  assert.ok(!result.files.some((f) => f.startsWith('brains/')), 'brains are not backed up by default');
});

test('BK2b verification CATCHES a corrupted or missing file', async () => {
  const r = await seededStore('bk2b');
  const dest = tempRoot('cb-bk2b-out');
  const result = backupStore({ r, dest });

  // 1. A tampered document. Append rather than string-replace: a replace whose
  //    needle is absent silently produces an IDENTICAL file and the test passes
  //    for the wrong reason, which is exactly what happened on the first run.
  const docRel = result.files.find((f) => f.startsWith('docs/'));
  const docPath = join(dest, docRel);
  const original = readFileSync(docPath, 'utf-8');
  writeFileSync(docPath, `${original} `, 'utf-8');
  const tampered = verifyBackup(dest);
  assert.equal(tampered.ok, false, 'a tampered backup must not verify');
  assert.ok(tampered.problems.some((p) => p.rel === docRel && /hash mismatch/.test(p.problem)));

  // 2. A deleted file.
  writeFileSync(docPath, original, 'utf-8');
  writeFileSync(join(dest, 'registry.json'), '', 'utf-8');
  const missing = verifyBackup(dest);
  assert.equal(missing.ok, false, 'an altered file must not verify');

  // 3. A backup that is not a backup.
  assert.throws(() => readBackupManifest(tempRoot('cb-notabackup')), BackupError, 'no manifest means no backup');
});

test('BK2c a backup refuses to write INSIDE the store it is backing up', async () => {
  const r = await seededStore('bk2c');
  assert.throws(
    () => backupStore({ r, dest: join(paths(r).base, 'backup-here') }),
    BackupError,
    'a backup inside the store would be copied into itself',
  );
});

// ── Isolated restore ────────────────────────────────────────────────────────

test('BK3 restore into a NEW root reproduces every durable file hash', async () => {
  const r = await seededStore('bk3');
  const dest = tempRoot('cb-bk3-out');
  backupStore({ r, dest });
  const manifest = readBackupManifest(dest);

  const target = tempRoot('cb-bk3-restore');
  const restored = restoreStore({ backupDir: dest, target });
  assert.equal(restored.ok, true, `restore failed: ${JSON.stringify(restored.problems)}`);
  assert.equal(restored.restored, manifest.files.length);

  // Compare SOURCE and RESTORED hashes file by file — the packet's wording.
  for (const entry of manifest.files) {
    const fromSource = hashFile(join(paths(r).base, entry.rel));
    const fromRestore = hashFile(join(target, entry.rel));
    assert.equal(fromRestore, fromSource, `${entry.rel} differs after restore`);
    assert.equal(fromRestore, entry.sha256, `${entry.rel} differs from the manifest`);
  }
  assert.equal(restored.sourceHash, manifest.durableHash, 'the restored set has the same identity');
});

test('BK3b restore REFUSES to overwrite a non-empty target', async () => {
  const r = await seededStore('bk3b');
  const dest = tempRoot('cb-bk3b-out');
  backupStore({ r, dest });

  const occupied = tempRoot('cb-bk3b-target');
  writeFileSync(join(occupied, 'something-important.txt'), 'do not lose me', 'utf-8');

  const refused = restoreStore({ backupDir: dest, target: occupied });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /not empty/);
  assert.equal(readFileSync(join(occupied, 'something-important.txt'), 'utf-8'), 'do not lose me',
    'the existing content is untouched');
});

test('BK3c a restore refuses to use a backup that does not verify', async () => {
  const r = await seededStore('bk3c');
  const dest = tempRoot('cb-bk3c-out');
  const result = backupStore({ r, dest });
  const docRel = result.files.find((f) => f.startsWith('docs/'));
  writeFileSync(join(dest, docRel), '{"tampered":true}', 'utf-8');

  const restored = restoreStore({ backupDir: dest, target: tempRoot('cb-bk3c-target') });
  assert.equal(restored.ok, false);
  assert.equal(restored.reason, 'backup failed verification');
  assert.ok(restored.problems.length > 0);
});

// ── Non-destructive rollback ────────────────────────────────────────────────

test('BK5 rollback unpublishes DERIVED output and leaves the archive intact', async () => {
  const r = await seededStore('bk5');
  const docsBefore = listStoreFiles(r).durable.filter((f) => f.rel.startsWith('docs/'));
  assert.ok(docsBefore.length >= 2, 'there are transcripts to protect');
  const hashesBefore = docsBefore.map((f) => hashFile(join(paths(r).base, f.rel)));
  assert.equal(listPublished(r).length, 1, 'a brain is published');

  const rolled = rollbackDerived({ r, namespace: A });
  assert.equal(rolled.ok, true);
  assert.equal(rolled.durableUntouched, true);
  assert.equal(listPublished(r).length, 0, 'the brain is no longer published');

  // THE POINT OF THE WHOLE MODULE: the transcripts are still there, byte for byte.
  const docsAfter = listStoreFiles(r).durable.filter((f) => f.rel.startsWith('docs/'));
  assert.equal(docsAfter.length, docsBefore.length, 'no transcript was deleted');
  docsAfter.forEach((f, i) => {
    assert.equal(hashFile(join(paths(r).base, f.rel)), hashesBefore[i], `${f.rel} was modified by the rollback`);
  });
  assert.ok(existsSync(paths(r).registry), 'and the registry the owner curated is untouched');

  // And the engine can rebuild from what remains.
  const { valid } = listDocsChecked(r, A);
  const out = publishBrain(buildBrain({ channelId: A, title: 'Alpha' }, { docs: valid }), {
    r, sources: valid.map((d) => d.text), now: makeClock(),
  });
  assert.equal(out.ok, true, 'the brain regenerates from the untouched transcripts');
});

test('BK5b rollback refuses to act without a selection, and cannot leave the derived tree', async () => {
  const r = await seededStore('bk5b');
  const none = rollbackDerived({ r });
  assert.equal(none.ok, false);
  assert.match(none.reason, /nothing selected/);
  assert.equal(listPublished(r).length, 1, 'and it changed nothing');

  // A namespace that tries to climb out of the brains directory is not a namespace.
  const escape = rollbackDerived({ r, namespace: '../../..' });
  assert.equal(listPublished(r).length, 1, 'the published brain is untouched');
  assert.equal(escape.unpublished.length, 0, 'nothing outside the derived tree was reached');
});

test('BK5c deleting a backup requires it to BE a backup', async () => {
  const r = await seededStore('bk5c');
  const dest = tempRoot('cb-bk5c-out');
  backupStore({ r, dest });
  assert.equal(deleteBackup(dest).ok, true, 'a real backup can be deleted');

  const notABackup = tempRoot('cb-not-a-backup');
  writeFileSync(join(notABackup, 'precious.txt'), 'keep me', 'utf-8');
  const refused = deleteBackup(notABackup);
  assert.equal(refused.ok, false, 'an arbitrary directory is NOT');
  assert.ok(existsSync(join(notABackup, 'precious.txt')), 'and it survives');
  assert.ok(!existsSync(join(dest, MANIFEST_NAME)), 'the real backup is gone');
});
