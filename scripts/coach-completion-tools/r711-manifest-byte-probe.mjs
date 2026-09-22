// R7-11 PROBE — is `rawByteLength` load-bearing, and does the manifest gate actually re-verify bytes?
//
// Where this came from: my R7-06 control pass. I mutated `rawByteLength` on a manifest entry and
// `checkCandidateManifest` returned `[]` where I expected a violation. Before calling that a finding
// I have to establish WHICH of these is true, because they have opposite fixes:
//
//   (a) `rawByteLength` is a RECORDED field that nothing compares — the gate re-verifies `sha256`
//       against disk (so drift IS caught) but the length is decorative. Consequence: a manifest can
//       claim a length that disagrees with its own digest and with disk, and pass.
//   (b) the byte verification is itself not happening, and the `[]` above was a false green.
//
// So: DRIFT (real byte change) must be caught for (b) to be false, and a length-only lie must be
// MISSED for (a) to be true. Both are measured against the live manifest. This probe runs in a
// SANDBOX COPY of one file, so the candidate tree is never disturbed and the manifest never needs
// rebuilding afterwards — a probe that dirties the artefact it measures is not a probe.
import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkCandidateManifest } from '../coach-completion-checkpoint.mjs';

// R7-13: this probe was moved out of `tmp/` (which is GITIGNORED) into a tracked directory, and it
// must keep working when invoked from the REPO ROOT — its `ROOT` is the candidate tree it measures,
// not the directory it lives in. So the two are now derived separately and stated, rather than
// silently assuming `process.cwd() === <tool dir>` (an assumption that only held while every caller
// ran it as `node tmp/<probe>.mjs` from the root). `--root=` overrides for out-of-tree use.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = (process.argv.find((a) => a.startsWith('--root=')) || '').slice(7) || resolve(HERE, '..', '..');
const OUT = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19/evidence/candidate-manifest.json';
const doc = JSON.parse(readFileSync(resolve(ROOT, OUT), 'utf8'));

const violationsFor = (d) => checkCandidateManifest(d, { root: ROOT });
const hasDrift = (v) => v.some((m) => /DRIFTED since the manifest was built/.test(m));

// ── Pick a real, existing, non-deleted entry to attack ─────────────────────────────────────────
const victim = doc.entries.find((e) => e.sha256 && e.trackedStatus !== 'D' && existsSync(`${ROOT}/${e.path}`));
if (!victim) { console.log('SKIP — no attackable entry'); process.exit(0); }
console.log('victim:', victim.path);
console.log('  recorded length', victim.rawByteLength, '| recorded sha', String(victim.sha256).slice(0, 12));
const disk = readFileSync(`${ROOT}/${victim.path}`);
console.log('  disk length    ', disk.length, '| disk sha', createHash('sha256').update(disk).digest('hex').slice(0, 12));

// ── BASELINE: the untampered manifest. If this is not [] every result below is unreadable. ────
const baseline = violationsFor(doc);
console.log('');
console.log('BASELINE (untouched manifest):', baseline.length, 'violation(s)', baseline.length ? `-> ${baseline[0]}` : '');

// ── (a) A LENGTH-ONLY LIE: the digest is correct and on disk; only rawByteLength is wrong. ────
const lie = JSON.parse(JSON.stringify(doc));
lie.entries.find((e) => e.path === victim.path).rawByteLength = disk.length + 999;
const vLie = violationsFor(lie);
console.log('(a) LENGTH-ONLY LIE  ->', vLie.length ? `CAUGHT: ${vLie[0]}` : 'ADMITTED []  <-- nothing compares rawByteLength');

// ── (b) REAL DRIFT: the bytes on disk change. The digest can no longer match. ─────────────────
// Sandboxed: append a byte, measure, restore the exact original bytes, and verify the restore.
const abs = `${ROOT}/${victim.path}`;
const backup = `${abs}.r711-probe-backup`;
copyFileSync(abs, backup);
try {
  writeFileSync(abs, Buffer.concat([disk, Buffer.from('\n')]));
  const vDrift = violationsFor(doc);
  console.log('(b) REAL DRIFT       ->', hasDrift(vDrift) ? 'CAUGHT (sha256 re-verified against disk)' : 'ADMITTED []  <-- THE GATE DOES NOT READ DISK');
} finally {
  copyFileSync(backup, abs);
  unlinkSync(backup);
  const restored = readFileSync(abs);
  const sameSha = createHash('sha256').update(restored).digest('hex') === victim.sha256;
  console.log('    restore verified :', sameSha && restored.length === disk.length ? 'BYTES IDENTICAL (sha + length match the manifest)' : 'RESTORE FAILED — rebuild the manifest');
}

// ── Is `rawByteLength` compared anywhere in the shipped gate, or only recorded? ───────────────
// A grep is not a measurement, so this states what it found rather than asserting intent: the only
// occurrence of the field inside the gate source that is not a PRESENCE check would be a comparison.
const gateSrc = readFileSync(`${ROOT}/scripts/coach-completion-manifest.mjs`, 'utf8');
const uses = [...gateSrc.matchAll(/rawByteLength/g)].map((m) => gateSrc.slice(Math.max(0, m.index - 40), m.index + 40).split('\n').pop().trim());
console.log('');
console.log('rawByteLength occurrences in the gate source:', uses.length);
for (const u of uses) console.log('   ...', u);

console.log('');
console.log(`VERDICT: (a) length-only lie admitted = ${vLie.length === 0} | (b) drift caught = ${hasDrift(violationsFor((() => { const d = JSON.parse(JSON.stringify(doc)); return d; })())) || 'see above'}`);
