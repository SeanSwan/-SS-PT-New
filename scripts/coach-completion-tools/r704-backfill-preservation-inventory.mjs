// scripts/coach-completion-tools/r704-backfill-preservation-inventory.mjs
//
// R7-04 (Astra Review 7, MED): "preservation accepted 29 artefacts with 0/0 verification."
//
// The receipt carried `method.verified: "29/29 preserved artifacts byte-identical to base blobs"` and
// NOTHING to verify it against — no artefact list at all. `checkPreservation` passed it by testing
// the FORMAT of that string (`/(\d+)\/(\d+)/` with the two numbers equal). A receipt whose claim
// cannot be contradicted by any measurement is not evidence, it is a sentence; this is the same
// defect class as R7-02 (a verdict resting on a string nobody parses).
//
// This script BACKFILLS the enumeration the fix requires, so the receipt describes what it actually
// holds. It writes the inventory from the snapshot on disk keyed by the FILE NAMES, and deliberately
// records NO `blobSha` for most entries — see below.
//
// ── WHY THE BLOB DIGESTS ARE NULL, AND WHY THAT IS THE HONEST ANSWER ────────────────────────────
// The obvious "fix" is to record `blobSha` per entry as the receipt's method implies (it says the
// bytes came from `git cat-file blob <base>:<path>`). That would be FABRICATION: as of 2026-09-22 the
// base commit's `docs` subtree is MISSING from the object store (`r7-12-preservation-provenance-
// unreachable.md`), so `git show 53005a6da:<path>` cannot resolve and no blob digest can be produced
// for comparison. A null `blobSha` plus an explicit reason is checkable and true; an invented digest
// would be exactly the "reporting more confidence than it has" failure this review keeps finding.
//
// What CAN be verified, and is: the snapshot's files EXIST, are real files, and hash to the digests
// recorded here. That is what `checkPreservation` now enforces. It is weaker than byte-identity with
// the base blob — and it is labelled as weaker, with a machine-readable `null` for the part that is
// gone, rather than a `29/29` that reads as if both halves were proven.
//
// Run from WORKTREE ROOT: node scripts/coach-completion-tools/r704-backfill-preservation-inventory.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { assertRoot } from './_root.mjs';

const ROOT = assertRoot();
const PKG = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19';
const RECEIPT = join(PKG, 'evidence/preservation.json');
const SNAP_REL = 'evidence/preserved-r4-package';
const SNAP_ABS = join(PKG, SNAP_REL);
const BASE = '53005a6da965f5ca9e9c8d5ead86c6e19e081095';

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });

// Walk the snapshot. Files only: a directory is not an artefact, and counting one would inflate
// `artifactCount` — the number this whole fix exists to make meaningful.
const walk = (dir, rel = '') => readdirSync(dir).flatMap((name) => {
  const abs = join(dir, name), r = rel ? `${rel}/${name}` : name;
  return statSync(abs).isDirectory() ? walk(abs, r) : [r];
});

const files = walk(SNAP_ABS).sort();
// ── PATH CONVENTION: WORKTREE-RELATIVE, MATCHING EVERY SIBLING RECEIPT ──────────────────────────
// My first pass emitted `evidence/preserved-r4-package/…` — relative to the PACKAGE — and the
// hardened gate refused all 29 with `does not resolve (ENOENT)`. That was my error, not the gate's,
// and it is worth recording why: `hashSource(root, rel)` resolves `rel` against the WORKTREE, and
// `source-bindings.json` — the sibling receipt `hashSource` already verifies — proves the convention
// with rows like `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx`, i.e. FULL
// worktree-relative paths, not package-relative ones. A receipt is read by a gate holding only the
// root, so a path that is not meaningful from the root is not an address at all.
const artifacts = files.map((rel) => {
  const buf = readFileSync(join(SNAP_ABS, rel));
  return { path: `${PKG}/${SNAP_REL}/${rel}`, rawByteLength: buf.length, sha256: sha256(buf), blobSha: null };
});

// ── Is a base blob recoverable AT ALL? Measured, not assumed. ───────────────────────────────────
// The verification below is only meaningful if it is honest about WHICH half it performed, so the
// script probes the object store and records the outcome rather than describing the intent.
let baseReadable = false;
try { git('ls-tree', '-r', '--name-only', BASE, PKG); baseReadable = true; } catch { baseReadable = false; }
const baseErr = baseReadable ? null : 'ls-tree of the base row FAILED (see r7-12: the base commit\'s subtree is not in the object store)';

const doc = JSON.parse(readFileSync(RECEIPT, 'utf8'));
const emptyFiles = artifacts.filter((a) => a.rawByteLength === 0);

doc.artifacts = artifacts;
doc.artifactCount = artifacts.length;
doc.verification = {
  method: 'sha256 of each snapshot file on disk, compared against the digest recorded in this receipt (working-tree bytes; core.autocrlf=true in this repository, which is why the original snapshot was extracted from blobs rather than via `git archive | tar -x`)',
  scope: 'snapshot files exist, are regular files, and hash to the digests recorded here',
  outOfScope: baseReadable
    ? 'byte-identity against the base commit blobs'
    : 'byte-identity against the base commit blobs CANNOT be performed: the base row is unreadable',
  filesChecked: artifacts.length,
  filesHashed: artifacts.length,
  emptyFiles: emptyFiles.length,
  baseBlobsReadable: baseReadable,
  baseProbeError: baseErr,
};
// The prose claim is REPLACED, not deleted. Keeping a `29/29` here while `baseBlobsReadable` is false
// is precisely the over-claiming this fix removes; the historical statement is preserved below so no
// information is lost.
doc.claimSuperseded = {
  was: doc.method?.verified,
  why: 'the string asserted a comparison against base blobs that can no longer be performed (r7-12); it is retained as history and replaced by the measurable `verification` block',
};
doc.note = `${doc.note || ''} R7-04: this receipt now ENUMERATES its artefacts (${artifacts.length}) and records digests that a gate verifies against disk. `.trim();

writeFileSync(RECEIPT, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`enumerated ${artifacts.length} artefacts (${artifacts.reduce((s, a) => s + a.rawByteLength, 0)} bytes), empty: ${emptyFiles.length}`);
console.log(`base blobs readable: ${baseReadable}${baseErr ? ` — ${baseErr}` : ''}`);
console.log(`wrote ${RECEIPT}`);
