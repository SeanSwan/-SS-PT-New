import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync, readdirSync, lstatSync,
} from 'node:fs';
import {
  resolve, relative, isAbsolute, sep, basename,
} from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const digest = bytes =>
  createHash('sha256').update(bytes).digest('hex');

function artifact(ref) {
  assert.ok(ref && isAbsolute(ref.path), 'Absolute artifact path required');
  assert.match(ref.sha256, /^[a-f0-9]{64}$/);
  const bytes = readFileSync(ref.path);
  assert.equal(digest(bytes), ref.sha256, `Artifact changed: ${ref.path}`);
  return bytes;
}

function within(root, path) {
  const rel = relative(resolve(root), resolve(path));
  assert.ok(rel !== '..' && !rel.startsWith(`..${sep}`));
  assert.ok(!isAbsolute(rel), 'Path escapes root');
}

function localFile(root, path) {
  assert.ok(typeof path === 'string' && path.length > 0);
  assert.ok(!isAbsolute(path) && !/[\0\r\n\\:]/.test(path));
  const parts = path.split('/');
  assert.ok(parts.every(p => p && p !== '.' && p !== '..'));
  let current = resolve(root);
  assert.ok(!lstatSync(current).isSymbolicLink());
  for (const part of parts) {
    current = resolve(current, part);
    assert.ok(!lstatSync(current).isSymbolicLink(), 'Link requires resolution');
  }
  within(root, current);
  return current;
}

function listFiles(root, prefix = '') {
  const result = [];
  for (const entry of readdirSync(resolve(root, prefix), {
    withFileTypes: true,
  })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert.ok(!entry.isSymbolicLink(), 'Link requires resolution');
    if (entry.isDirectory()) result.push(...listFiles(root, path));
    else {
      assert.ok(entry.isFile(), 'Special file requires resolution');
      result.push(path);
    }
  }
  return result.sort();
}

function git(...args) {
  const result = spawnSync('git', ['-C', snapshot.git.root, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function unique(values) {
  assert.equal(new Set(values).size, values.length, 'Duplicate values');
}

const receiptPath = process.env.BLUEPRINT_RECEIPT;
assert.ok(receiptPath && isAbsolute(receiptPath),
  'Set BLUEPRINT_RECEIPT to an absolute local receipt path');
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
const snapshot = JSON.parse(artifact(receipt.snapshot).toString('utf8'));
const snapshotHash = receipt.snapshot.sha256;
const root = snapshot.git.root;

const base = 'docs/ai-workflow/AI-HANDOFF/';
const master = `${base}BLUEPRINT-master-reconciliation-2026-09-20`;
const directories = [
  'BLUEPRINT-cinematic-frontend-2026-09-19',
  'BLUEPRINT-coach-cc-ai-harness-2026-09-20',
  'BLUEPRINT-cortex-phase1-knowledge-spine-2026-07-14',
  'BLUEPRINT-social-bridge-completion-2026-09-19',
  'BLUEPRINT-speed-to-lead-email-2026-07-16',
  'BLUEPRINT-swan-brain-console-v3-merge-2026-09-18',
  'BLUEPRINT-swan-native-mobile-2026-07-13',
  'BLUEPRINT-theme-lens-2026-09-20',
];

test('preflight: registry', () => {
  const registry = JSON.parse(readFileSync(
    localFile(root, snapshot.registryPath), 'utf8'));
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.masterPackagePath, master);
  assert.equal(registry.lanes.length, 8);
  unique(registry.lanes.map(lane => lane.id));
  const allPaths = [master];

  directories.forEach((directory, index) => {
    const lane = registry.lanes.find(l => l.id === `L${index + 1}`);
    assert.ok(lane);
    assert.equal(lane.canonicalPackagePath, `${base}${directory}`);
    localFile(root, lane.canonicalPackagePath);
    assert.ok(lane.authorities.length > 0);
    unique(lane.authorities.map(a => a.precedence));
    lane.authorities.forEach(a => {
      assert.ok(a.scope && Number.isInteger(a.precedence));
      localFile(root, a.path);
    });
    lane.documents.forEach(d => {
      localFile(root, d.path);
      assert.ok(['ACTIVE', 'HISTORICAL', 'REJECTED'].includes(d.status));
      assert.ok(d.permittedUse);
      if (d.supersededBy) localFile(root, d.supersededBy);
      if (d.status === 'REJECTED') {
        assert.ok(!lane.authorities.some(a => a.path === d.path));
      }
    });
    allPaths.push(lane.canonicalPackagePath, ...lane.aliases);
  });
  unique(allPaths.map(path => path.toLowerCase()));
});

test('preflight: source identity and complete manifest', () => {
  assert.equal(snapshot.schemaVersion, 1);
  assert.ok(snapshot.taskId && snapshot.revision);
  assert.match(snapshot.git.commit, /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
  assert.match(snapshot.git.tree, /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
  assert.equal(git('rev-parse', 'HEAD').trim(), snapshot.git.commit);
  assert.equal(git('rev-parse', 'HEAD^{tree}').trim(), snapshot.git.tree);
  assert.equal(git('status', '--porcelain=v1',
    '--untracked-files=all').trim(), '');

  const tracked = git('ls-files', '--stage', '-z')
    .split('\0').filter(Boolean).map(row => {
      const split = row.indexOf('\t');
      const [mode, , stage] = row.slice(0, split).split(' ');
      assert.equal(stage, '0', 'Unmerged index entry');
      assert.ok(['100644', '100755'].includes(mode),
        'Submodule or link requires explicit resolution');
      return { path: row.slice(split + 1), mode };
    }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

  unique(snapshot.files.map(file => file.path));
  assert.deepEqual(snapshot.files.map(({ path, mode }) => ({ path, mode })),
    tracked);
  snapshot.files.forEach(file => {
    const path = localFile(root, file.path);
    assert.ok(lstatSync(path).isFile());
    assert.equal(digest(readFileSync(path)), file.sha256, file.path);
  });
});

test('preflight: preservation', () => {
  assert.ok(snapshot.preservation.length > 0);
  unique(snapshot.preservation.map(p => p.sourceId));
  snapshot.preservation.forEach(record => {
    const inventory = JSON.parse(artifact(record.inventory).toString('utf8'));
    artifact(record.storageAttestation);
    assert.ok(inventory.length > 0);
    unique(inventory.map(file => file.path));
    assert.ok(record.copies.length >= 2);
    unique(record.copies.map(copy => copy.storageId));
    // Distinct LABELS are not distinct COPIES (hostile review round 2, R2-07). Two entries may carry
    // different storageIds and the same resolved root; both then enumerate and hash ONE directory and
    // this check counts a single copy twice, which is exactly the overclaim it exists to prevent.
    // Reject duplicate resolved roots BEFORE trusting the labels. Case-folded for the same reason the
    // path-collision check under 'preflight: registry' case-folds: two roots differing only in case
    // are one directory on this platform.
    unique(record.copies.map(copy => resolve(copy.root).toLowerCase()));
    const expected = inventory.map(file => file.path).sort();

    record.copies.forEach(copy => {
      assert.ok(isAbsolute(copy.root) && copy.storageId);
      assert.deepEqual(listFiles(copy.root), expected);
      inventory.forEach(file => {
        assert.equal(digest(readFileSync(localFile(copy.root, file.path))),
          file.sha256, file.path);
      });
    });
  });
});

test('admission: required behavior evidence', () => {
  assert.ok(snapshot.requiredTestIds.length > 0);
  unique(snapshot.requiredTestIds);
  unique(receipt.tests.map(result => result.id));
  snapshot.requiredTestIds.forEach(id => {
    const result = receipt.tests.find(item => item.id === id);
    assert.ok(result, `Missing required test: ${id}`);
    assert.ok(result.command);
    assert.equal(result.snapshotSha256, snapshotHash);
    assert.equal(result.outcome, 'PASS');
    assert.equal(result.exitCode, 0);
    artifact(result.output);
  });
});

test('admission: ordered filed reviews', () => {
  const policy = snapshot.reviewPolicy;
  assert.ok(policy.policyId && policy.authorityRefs.length > 0);
  assert.ok(policy.orderedSeats.length > 0);
  assert.equal(policy.finalAuthority, policy.orderedSeats.at(-1));
  artifact(policy.budgetRecord);
  assert.deepEqual(receipt.reviews.map(r => r.seat), policy.orderedSeats);

  receipt.reviews.forEach(review => {
    assert.equal(review.decision, 'APPROVE');
    assert.equal(review.snapshotSha256, snapshotHash);
    within('Z:/HostileReviews', review.archive.path);
    assert.equal(basename(review.archive.path), `${review.reviewId}.md`);
    const body = artifact(review.archive).toString('utf8');
    assert.ok(body.includes(`Snapshot-SHA256: ${snapshotHash}`));
    artifact(review.terminalEvidence);
    artifact(review.identityEvidence);
  });
});

test('admission: final authority and unresolved findings', () => {
  assert.deepEqual(receipt.unresolvedFindings, []);
  assert.ok(receipt.admission);
  assert.equal(receipt.admission.decision, 'ADMIT');
  assert.equal(receipt.admission.by, snapshot.reviewPolicy.finalAuthority);
  assert.equal(receipt.admission.snapshotSha256, snapshotHash);
  artifact(receipt.admission.attestation);
});
