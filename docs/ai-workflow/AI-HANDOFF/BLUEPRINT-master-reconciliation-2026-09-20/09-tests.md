**Status: executable source supplied below; not saved or run in this dispatch.**

This suite tests the **real records produced by the manual process**. It does not mock a missing workflow controller and does not certify product behavior.

**File:** `scripts/blueprint-master-evidence.test.mjs`

```js
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
```

**Execution**

Run from the isolated checkout containing the supplied test file. Set the receipt path to the actual revision record.

```powershell
$env:BLUEPRINT_RECEIPT = 'C:\tmp\master-blueprint\evidence\r0001\receipt.json'
node --test --test-name-pattern="^preflight:" scripts/blueprint-master-evidence.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'Blueprint preflight failed' }
```

After behavior evidence, reviews and the final-authority attestation exist:

```powershell
node --test scripts/blueprint-master-evidence.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'Blueprint admission evidence failed' }
```

The receipt path is an example deployment location for the records, not an assertion that the file exists. A missing record or test file is **BLOCKED configuration**, not a valid product regression failure.

**Named cases and what they prove**

| Case | Proves | Does not prove |
|---|---|---|
| `preflight: registry` | Exact lane paths, unique identities, accessible authority references and rejected-document exclusion | That every authority declaration is substantively correct |
| `preflight: source identity and complete manifest` | Commit/tree identity, clean tracked/untracked state and complete tracked-file hashes | Runtime dependency integrity, ignored-file absence or product correctness |
| `preflight: preservation` | Copy inventories and bytes match their recorded source inventory; required attestation exists | Physical device independence or original-inventory completeness without operator verification |
| `admission: required behavior evidence` | Every frozen required test ID has a passing, hash-bound result artifact | That the command was honestly recorded or its test adequately exercises behavior |
| `admission: ordered filed reviews` | Ordered review records and linked archive/terminal/identity artifacts exist and match hashes | Provider identity or review quality merely from metadata |
| `admission: final authority and unresolved findings` | Exact-revision admission record is complete | Deployment or freedom from undiscovered defects |

These limits are checked by the underlying evidence inspection at G5/G6.

**Protocol fault-injection acceptance**

Use disposable copies of the evidence records and isolated fixture checkouts. Never mutate the real frozen revision to demonstrate a test failure.

| ID | Action | Exact test selection | Required result |
|---|---|---|---|
| MT-01 | Change a tracked source byte after producing the fixture manifest | `--test-name-pattern="source identity"` | Nonzero exit, source mismatch |
| MT-02 | Point L2 at its alias as if canonical | `--test-name-pattern="registry"` | Nonzero exit, canonical path mismatch |
| MT-03 | Truncate one copied preservation file | `--test-name-pattern="preservation"` | Nonzero exit, hash mismatch |
| MT-04 | Remove a required lane result | `--test-name-pattern="required behavior"` | Nonzero exit, missing required ID |
| MT-05 | Swap required review records | `--test-name-pattern="ordered filed"` | Nonzero exit, ordering mismatch |
| MT-06 | Bind final admission to a different digest | `--test-name-pattern="final authority"` | Nonzero exit, revision mismatch |
| MT-07 | Restore the unchanged valid fixture | Full command above | Zero exit |

For each selection, use:

```text
node --test <selection> scripts/blueprint-master-evidence.test.mjs
```

Expected fault-injection failures are isolated from the normal passing suite. Import/setup failures do not satisfy MT-01–MT-06.

**Lane behavior-test requirements**

**[UNKNOWN]** The packet does not supply actual executable lane test files or full acceptance criteria. Their names must be recovered from the existing packages and implementation; this master will not fabricate existing paths.

Before M2 admission, each lane must provide a test index containing:

`requirement ID → actual test file → named case → exact command → fixture → observable result → forbidden side effect → real or mocked boundary → evidence artifact`

Minimum scope:

| Lane | Required observable boundaries |
|---|---|
| L1 | Existing homepage/conversion behavior; capability modes and fallback; A independent of B; separate B1/B2 dependency/runtime results |
| L2 | Submission outcome authority; permission denial; confirmation/cancellation; duplicate execution; committed receipts; interruption and unknown-outcome recovery |
| L3 | Provenance, approval filtering, rule versions/conflicts, actual schema/loader behavior and progression/regression events |
| L4 | Corrected S5–S8 contracts and the actual latest archived correctness findings |
| L5 | Existing email delivery/admission contract; its actual retry, duplicate and failure rules; checkpoint evidence |
| L6 | Complete preservation, actual console/asset integration and unresolved round-10 findings |
| L7 | Existing API compatibility; authentication; workout save/history/chart; offline draft interruption and replay under the actual contract |
| L8 | All registered themes; select/persist/restore; keyboard focus; no-animation/WebGL operation; desktop and mobile states |

No broad test may touch the production database merely because it runs locally. Fixtures and destructive test resources must be isolated and identified.
