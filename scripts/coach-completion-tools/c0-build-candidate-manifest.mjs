// C0 admission — candidate-manifest.json (build-order step 2, Astra Review 6).
//
// The forged evidence contract: every candidate entry carries
//   { path, rawByteLength, sha256, trackedStatus, ownerSlice }
// hashed from RAW CURRENT BYTES (never git-smudged, never normalized), and the
// manifest NEVER hashes itself (no self-reference — a receipt in its own source
// hash is circular evidence, Astra A2 correction table).
//
// R6-06: exact path assignments replace area-based mapping. The ownerSlice rules
// below are the C→S ruling's active vocabulary (C0–C5). A path matching NO rule
// is REFUSED — an unowned candidate path must stop the freeze, not silently pass.
//
// Run from WORKTREE ROOT: node scripts/coach-completion-tools/c0-build-candidate-manifest.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ownerOf } from './c0-owner-rules.mjs';
import { assertRoot } from './_root.mjs';

const ROOT = assertRoot();
const PKG = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19';
const OUT = join(PKG, 'evidence', 'candidate-manifest.json');
const SELF = 'scripts/coach-completion-tools/c0-build-candidate-manifest.mjs';

const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

// ── The candidate BASELINE revision. ────────────────────────────────────────────────────────────
// R7-06 (Astra Review 7): this was a hardcoded literal while `headAtManifest` two lines below was
// measured live, so the manifest silently recorded a baseline of `53005a6da` against a HEAD of
// `70547685c` and nothing checked it. Measured it: `53005a6da` is the RESCUE commit
// ("rescue(coach): recover the S83 worktree delta that git could not see") on
// `rescue/swan-coach-astra-owned-53005a6da` / `feat/media-api-2026-09-18`, and
// `git merge-base --is-ancestor 53005a6da HEAD` FAILS — it is NOT an ancestor of HEAD.
//
// That is a legitimate baseline (a candidate can be built on a base outside HEAD's history), but it
// is not SELF-EVIDENT, so it must be declared rather than hardcoded. `checkCandidateManifest`
// refuses a manifest whose `baseHead` disagrees with `headAtManifest` unless `baseHeadSource` names
// where the base came from — substantiation, not equality.
const BASE_HEAD = process.env.C0_BASE_HEAD || git('rev-parse', 'HEAD').trim();
const BASE_HEAD_SOURCE = process.env.C0_BASE_HEAD_SOURCE
  || (BASE_HEAD === git('rev-parse', 'HEAD').trim()
    ? 'HEAD at manifest build time (baseHead === headAtManifest)'
    : 'C0_BASE_HEAD environment override');

// ── Ownership: the ONE shared rule set (scripts/coach-completion-tools/c0-owner-rules.mjs). ─────────────
const porcelain = git('status', '--porcelain=v1', '--untracked-files=all').split('\n').filter(Boolean);
// Generated RESULT receipts are excluded from the candidate manifest (Astra A2:
// "Immutable candidate manifests exclude generated result receipts; receipts
// reference them"). They are produced BY the C0 process and reference this manifest.
const GENERATED_RECEIPTS = new Set([
  join(PKG, 'evidence', 'admission.json').replace(/\\/g, '/'),
  join(PKG, 'evidence', 'c0-pass-receipt.json').replace(/\\/g, '/'),
]);
const entries = [];
const refused = [];
for (const line of porcelain) {
  const code = line.slice(0, 2);
  let path = line.slice(3);
  if (path.includes(' -> ')) path = path.split(' -> ')[1];
  path = path.replace(/^"|"$/g, '');
  if (path === OUT.replace(/\\/g, '/')) continue; // no self-reference
  if (GENERATED_RECEIPTS.has(path)) continue;
  const abs = join(ROOT, path);
  const owner = ownerOf(path);
  if (!owner) { refused.push({ path, reason: 'NO ownerSlice rule matched — assign explicitly before freeze' }); continue; }
  if (!existsSync(abs)) {
    // A DELETION is part of the candidate delta: recorded with null bytes, never
    // silently dropped (the D entries here are the emergency repair scripts the
    // remediation replaced with the migration guard suites).
    entries.push({ path, rawByteLength: 0, sha256: null, trackedStatus: code.trim() || code, ownerSlice: owner });
    continue;
  }
  const buf = readFileSync(abs);
  entries.push({
    path,
    rawByteLength: buf.length,
    sha256: sha256(buf),
    trackedStatus: code.trim() || code,
    ownerSlice: owner,
  });
}

if (refused.length) {
  console.error('REFUSED — unowned candidate path(s):');
  for (const r of refused) console.error(`  ${r.path} — ${r.reason}`);
  process.exit(2);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  purpose: 'C0 candidate manifest — raw current-byte identity of every dirty/untracked candidate path (forged evidence contract). Supersedes the byte-count/committed-blob-only claims R6-08 measured as inconsistent; g0/preservation history retained alongside.',
  baseHead: BASE_HEAD,
  baseHeadSource: BASE_HEAD_SOURCE,
  headAtManifest: git('rev-parse', 'HEAD').trim(),
  branch: git('rev-parse', '--abbrev-ref', 'HEAD').trim(),
  hashing: 'sha256 of raw file bytes as read from disk (no git smudge, no line-ending normalization); committed blobs are preserved separately under evidence/preserved-r4-package/',
  counts: {
    total: entries.length,
    byOwner: entries.reduce((m, e) => ((m[e.ownerSlice] = (m[e.ownerSlice] || 0) + 1), m), {}),
    byStatus: entries.reduce((m, e) => ((m[e.trackedStatus] = (m[e.trackedStatus] || 0) + 1), m), {}),
  },
  entries,
};

writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest.counts, null, 2));
console.log(`wrote ${OUT} (${entries.length} entries, self excluded)`);
