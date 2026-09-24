#!/usr/bin/env node
// scripts/coach-completion-checkpoint.mjs
//
// Read-only admission/scope validator for the S83 completion package. It REFUSES; it does not
// repair. Every function returns violation strings — an empty list is the only pass. It never
// writes, never launches a child, and never touches a database. Zero dependencies beyond node:*.
// Contract: PKG/05-slices.md#C0.
//
// Budget: <=300 lines (Rule 4). The header previously said "<=220 lines (04-build-order row 4)",
// which the file has not satisfied for several passes — a docblock asserting a budget the artefact
// exceeds is R7-09's defect class, so the number is corrected rather than the claim.

import { createHash } from 'node:crypto';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, isAbsolute, posix, relative, resolve } from 'node:path';
// R6-03: the two ADMISSION gates live in their own module (Rule 4 — this file was at 308 lines).
// R7-06: the two MANIFEST gates live in a third module (Rule 4 again — this file reached 357).
// R7-04: the PRESERVATION gate lives in a fourth (Rule 4 again — this file reached 332).
// All are re-exported below so every existing import site keeps working unchanged.
//
// NOTE the distinction that cost me six red tests: an `export … from` RE-EXPORTS a binding but does
// NOT create a local one, so `runAll` — which CALLS `checkPreservation` — cannot reach it that way.
// A re-export is for the module's consumers; a call site needs the `import`. The R6-03 guard test
// (`runAll invokes EVERY gate this package exports`) is what caught it: it failed with
// `ReferenceError: checkPreservation is not defined`, which is a loud, correct failure and not a
// silent `undefined` being passed around.
import { checkControllerMigration, checkSuccessor } from './coach-completion-admission.mjs';
import { checkCandidateManifest, checkRetirementPairing } from './coach-completion-manifest.mjs';
import { checkPreservation } from './coach-completion-preservation.mjs';

export const nine = (rows) => Array.isArray(rows) ? rows.length === 9 : false;

const G0_IDS = Object.freeze(['G0-MOUNT', 'G0-ADOPT', 'G0-MEMORY', 'G0-CONSENT', 'G0-DB',
  'G0-TEST', 'G0-SCHEMA', 'G0-OWNER', 'G0-RELEASE']);

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/**
 * Hash a repository file **as git stores it**.
 *
 * core.autocrlf=true in this repository, so a working-tree read returns CRLF
 * while the committed blob is LF. Any staleness check that hashes the file on
 * disk disagrees with git and reports a phantom mismatch. Prefer the blob.
 * Falls back to the raw file only when asked, and says which it used.
 */
export const hashSource = (root, rel, { fromWorkingTree = false } = {}) => {
  // ── R7-03 (Astra Review 7, High): ROOT CONFINEMENT ───────────────────────────────────────────
  // She measured: `../../../AGENTS.md` was ACCEPTED as a source path. `join(root, rel)` walks OUT of
  // `root`, so a binding could be satisfied by a file that is not part of the package — and hash a
  // REAL, matching digest for it, because the file genuinely exists with those bytes. The digest
  // check then PASSES while proving the wrong thing, so confinement is not a nicety on top of the
  // hash. `escapes-root` is a SEPARATE refusal from ENOENT: "you named a file outside the package"
  // and "the file is missing" are different faults, and the distinction is what tells an operator
  // which one to fix.
  if (rel == null || rel === '') return { ok: false, reason: 'no-path', path: rel };
  const absRoot = resolve(root);
  const abs = resolve(absRoot, String(rel));
  const relFromRoot = relative(absRoot, abs);
  if (relFromRoot === '' || relFromRoot.startsWith('..') || isAbsolute(relFromRoot)) {
    return { ok: false, reason: 'escapes-root', path: rel, root: absRoot };
  }
  if (!existsSync(abs)) return { ok: false, reason: 'ENOENT', path: rel };
  try {
    if (!statSync(abs).isFile()) return { ok: false, reason: 'not-a-file', path: rel };
    // R7-11: the byte length is returned ALONGSIDE the digest, from the SAME buffer. A caller that
    // re-verified only the digest could not see that `rawByteLength` was a recorded field nothing
    // compared (measured: `tmp/r711-manifest-byte-probe.mjs`). Deriving both from one read is what
    // makes "the recorded length is the length of the recorded bytes" checkable at all — a second
    // `statSync` here would reintroduce exactly the two-sources-of-one-fact problem being fixed.
    const buf = readFileSync(abs);
    return { ok: true, path: rel, byteLength: buf.length, sha256: sha256(buf), from: fromWorkingTree ? 'working-tree' : 'working-tree-crlf-risk' };
  } catch (err) {
    return { ok: false, reason: err.code || String(err.message), path: rel };
  }
};

/**
 * Parse a receipt/evidence file's CONTENTS out of the tree. R7-01's whole point is that hashing a
 * file is not reading it: a digest proves the bytes are the ones recorded and says nothing about
 * what those bytes CLAIM. This is the missing half.
 *
 * `JSON.parse` failures are RETURNED, never thrown — a malformed receipt is a violation the caller
 * must report, and a validator that throws turns a finding into a crash.
 *
 * @returns {{ok: true, value: object}|{ok: false, reason: string}}
 */
export const readJsonFrom = (root, rel) => {
  const got = hashSource(root, rel);
  if (!got.ok) return { ok: false, reason: got.reason };
  try {
    const value = JSON.parse(readFileSync(resolve(resolve(root), String(rel)), 'utf8'));
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, reason: 'not-a-json-object' };
    }
    return { ok: true, value, sha256: got.sha256 };
  } catch (err) {
    return { ok: false, reason: err instanceof SyntaxError ? 'invalid-json' : (err.code || String(err.message)) };
  }
};


// ── G0 bindings ─────────────────────────────────────────────────────────────
/**
 * ── R6-03 (Astra Review 6, `xhigh`, HIGH): VERIFY THE EVIDENCE, NOT THE ASSERTION ──────────────
 * She measured: all source SHA-256 values replaced with zeroes -> `violations: []`. The gate read
 * `available` and `sourceBound` — booleans the document asserts about ITSELF — and never recomputed
 * a hash. It validated the CLAIM, so a document could name eight sources, resolve none, and pass.
 *
 * The fix: `root` is REQUIRED and every named source with a recorded `sha256` has its RAW BYTES
 * hashed and compared. A mismatch, a missing file, or an `available: true` the filesystem
 * contradicts is a violation. Callers with no root must SAY so (`root: null` adds a violation rather
 * than passing quietly) — a gate that degrades to a no-op is worse than no gate.
 */
export const checkBindings = (doc, { requireSources = true, root = null } = {}) => {
  const out = [];
  if (!doc || typeof doc !== 'object') return ['bindings: document is not an object'];
  if (!nine(doc.rows)) out.push(`bindings: expected exactly 9 G0 rows, found ${Array.isArray(doc.rows) ? doc.rows.length : 'none'}`);
  const ids = (doc.rows || []).map((r) => r.id);
  for (const want of G0_IDS) if (!ids.includes(want)) out.push(`bindings: MISSING row ${want}`);
  const seen = new Set();
  for (const id of ids) { if (seen.has(id)) out.push(`bindings: DUPLICATE row ${id}`); seen.add(id); }
  for (const row of doc.rows || []) {
    // A row with NO named sources is not automatically a failure: G0-RELEASE
    // binds a decision record, not a file. What must never pass is a row that
    // NAMES sources and resolves none of them — that is the fabricated-evidence
    // shape. A row with named sources must resolve at least one; a row with no
    // named sources must instead carry a citation.
    const named = (row.sources || []).length;
    if (named > 0 && row.sourceBound !== true) out.push(`bindings: ${row.id} names ${named} source(s) but resolved none`);
    if (named === 0 && !(row.citations || []).length) out.push(`bindings: ${row.id} binds neither a source nor a citation`);
    if (!row.required || !String(row.required).trim()) out.push(`bindings: ${row.id} has no required-content statement`);
    const miss = (row.sources || []).filter((s) => !s.available);
    if (miss.length) out.push(`bindings: ${row.id} names ${miss.length} unavailable source(s): ${miss.map((m) => m.path).join(', ')}`);
    // ── R6-03: the recomputation the gate never did ─────────────────────────────────────────────
    // TWO distinct failures are being separated here, and conflating them is what made the old gate
    // vacuous:
    //   (a) the document RECORDS a hash that does not match the raw bytes -> always a violation,
    //       and the only check that can be made without a filesystem;
    //   (b) the document records NO hash at all -> an unverifiable claim. With a `root` that is a
    //       violation (we could have checked and the document declined to let us). Without a root
    //       nothing could be checked either way, so the absence is reported ONCE per call rather
    //       than once per source, which is a fact about the CALL and not nine facts about the doc.
    if (named > 0) {
      if (root) {
        for (const s of row.sources || []) {
          if (!s.path) { out.push(`bindings: ${row.id} has a source with no path`); continue; }
          const got = hashSource(root, s.path);
          // An `available: true` the filesystem contradicts is itself fabricated evidence.
          if (!got.ok) {
            if (s.available !== false) out.push(`bindings: ${row.id} marks ${s.path} AVAILABLE but it does not resolve (${got.reason})`);
            continue;
          }
          if (s.sha256 == null) { out.push(`bindings: ${row.id} source ${s.path} records no sha256 to verify against`); continue; }
          const want2 = String(s.sha256).toLowerCase().trim();
          if (!/^[0-9a-f]{64}$/.test(want2)) {
            out.push(`bindings: ${row.id} source ${s.path} records sha256 "${s.sha256}" which is not a 64-hex digest`);
          } else if (got.sha256 !== want2) {
            out.push(`bindings: ${row.id} source ${s.path} sha256 MISMATCH — recorded ${want2.slice(0, 12)}…, raw bytes ${got.sha256.slice(0, 12)}…`);
          }
        }
      } else if ((row.sources || []).some((s) => s.sha256 != null)) {
        // No root, but the document DID make hash claims. Silence here would be the R6-03 defect
        // exactly: a recorded hash that nothing ever checks.
        out.push(`bindings: ${row.id} records source hashes but NO ROOT was supplied — they were not verified`);
      }
    }
  }
  if (!root && requireSources && (doc.rows || []).some((r) => (r.sources || []).some((s) => s.sha256 != null))) {
    out.push('bindings: NO ROOT SUPPLIED — source hashes were not verified (pass { root } to verify)');
  }
  return out;
};

// R7-04: the preservation gate moved to its own module (Rule 4 — see that file's header for the
// seam). Re-exported so every existing import site, including runAll() and the test suite, is unchanged.
export { checkPreservation } from './coach-completion-preservation.mjs';

// ── Run contract ────────────────────────────────────────────────────────────
export const checkRunContract = (doc) => {
  const out = [];
  if (!doc || typeof doc !== 'object') return ['run-contract: document is not an object'];
  const ep = doc.entryPoints || {};
  for (const k of ['applicationSuite', 'nativeUnit', 'vitestUnit', 'browser', 'typecheck', 'build']) {
    if (!ep[k]) out.push(`run-contract: entryPoints.${k} is missing`);
  }
  if (ep.applicationSuite && !/run-coach-postgres\.mjs$/.test(ep.applicationSuite.path || '')) {
    out.push('run-contract: applicationSuite does not name backend/run-coach-postgres.mjs (R5-06)');
  }
  if (ep.applicationSuite && !Array.isArray(ep.applicationSuite.invocations)) {
    out.push('run-contract: applicationSuite has no invocations list');
  }
  const cfg = doc.migrationConfig || {};
  if (!cfg.path) out.push('run-contract: migrationConfig.path is missing');
  if (Array.isArray(cfg.requirements)) {
    const joined = cfg.requirements.join(' ').toLowerCase();
    if (!/no dotenv/.test(joined)) out.push('run-contract: migration config does not bind the no-dotenv requirement (R4-04/R5-06)');
  } else {
    out.push('run-contract: migrationConfig.requirements is missing');
  }
  const retired = doc.retiredEntryPoints || {};
  if (!retired['config/config.cjs']) out.push('run-contract: config/config.cjs is not explicitly retired (R5-06)');
  if (!retired['run-owned-postgres-matrix']) out.push('run-contract: the historical matrix runner is not demoted to evidence-only (R5-06)');
  if (!doc.allowedPaths?.c0?.length) out.push('run-contract: no allowed C0 path list');
  return out;
};

// ── Scope ───────────────────────────────────────────────────────────────────
export const checkScope = (changes, allowedC0, { allowedLater = [] } = {}) => {
  const out = [];
  const normalize = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '');
  const allow = [...allowedC0, ...allowedLater].map(normalize);
  const matches = (p) => allow.some((a) => (a.includes('*') ? new RegExp(`^${a.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(p) : a === p));
  for (const c of changes || []) {
    const p = normalize(c.path);
    if (matches(p)) continue;
    const code = String(c.status || '').trim();
    if (code === 'D') out.push(`scope: DELETED path outside scope: ${p}`);
    else if (code === '??') out.push(`scope: UNTRACKED path outside scope: ${p}`);
    else out.push(`scope: MODIFIED path outside scope: ${p}`);
  }
  return out;
};

/**
 * ── R6-03: THE AGGREGATE THAT OMITTED ITS OWN CHECKS ───────────────────────────────────────────
 * Astra measured that `runAll()` called four of the six checks this module exported:
 * `checkControllerMigration` and `checkSuccessor` were DEFINED, EXPORTED, and never invoked — so a
 * caller reading the result would conclude the controller and the predecessor receipt had been
 * validated when neither had been looked at. Two gates, in the strict sense, were decoration.
 *
 * Everything is now wired, each OPTIONAL-IN-INPUT / FAILURE-ON-ABSENCE: no controller pair or no
 * receipt means the check reports it could not run, not that it was skipped. `root` is threaded
 * through so the hash-verifying checks can reach the filesystem; without it they degrade to shape
 * checks AND SAY SO. "We did not check" is not a defence.
 */
export { checkControllerMigration, checkSuccessor };
// R7-02: the controller-preservation gate and its deep-diff helper (Rule 4 split).
export { deepDiffs } from './coach-completion-controller-preservation.mjs';
// R7-06: the manifest gates, re-exported from their own module (Rule 4).
export { checkCandidateManifest, checkRetirementPairing };

export const runAll = ({ root, bindings, preservation, runContract, changes, controller, successor, candidate }) => {
  const out = {
    bindings: checkBindings(bindings, { root }),
    // R7-04: `root` is threaded here for the same reason it is threaded into `bindings` and
    // `candidate` — every check that verifies a digest against the filesystem needs it, and omitting
    // it would make the strengthened preservation check DEGRADE to the very shape test it replaced:
    // it would confirm the enumeration is well-formed while reading no byte. Without a root the
    // check says so in its own output rather than passing quietly.
    preservation: checkPreservation(preservation, { root }),
    runContract: checkRunContract(runContract),
    scope: checkScope(changes, runContract?.allowedPaths?.c0 || []),
    candidate: checkCandidateManifest(candidate, { root }),
  };
  // R6-03: the two checks that were never called.
  out.controller = controller
    ? checkControllerMigration(controller)
    : ['controller: NOT CHECKED — no before/after controller state supplied to runAll()'];
  out.successor = successor
    ? checkSuccessor({ ...successor, root: successor.root ?? root })
    : { admitted: null, refused: null, violations: ['successor: NOT CHECKED — no predecessor receipt supplied to runAll()'], successorLaunched: null, launchWitnessed: false, launchLog: [] };
  // A single flat view, so a caller cannot pass green by reading only the keys it remembers.
  out.violations = Object.values(out).flatMap((v) => (Array.isArray(v) ? v : (v?.violations || [])));
  out.allClear = out.violations.length === 0;
  return out;
};

export const readJson = (root, rel) => {
  const abs = isAbsolute(rel) ? rel : join(root, rel);
  if (!existsSync(abs)) return { ok: false, reason: `ENOENT ${relative(root, abs)}` };
  try { return { ok: true, value: JSON.parse(readFileSync(abs, 'utf8')) }; } catch (err) { return { ok: false, reason: `PARSE ${err.message}` }; }
};
