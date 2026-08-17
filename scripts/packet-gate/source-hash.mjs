/**
 * source-hash.mjs — a fingerprint of the gate's own logic.
 * ========================================================
 * The canary record must be tied to the code it certified. A suite run against since-edited checks
 * proves nothing, and R15's 30-day window would otherwise let a month-old record bless arbitrarily
 * rewritten gates (Kimi K3 finding S2, 2026-08-14).
 *
 * Lives in its own module, not in packet-gate.mjs, because the selftest needs it: importing the CLI
 * would execute its top-level `process.exit(main())` as an import side-effect. It stays out of
 * checks.mjs because that module is deliberately pure (no I/O) so its gates stay canary-drivable.
 *
 * @module packet-gate/source-hash
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '..', '..');

/**
 * Every file whose contents define what the gate checks — DERIVED, never hand-listed.
 *
 * THE ROUND-5 CRITICAL, and it was self-inflicted by the round-4 fix. This used to be a literal
 * three-entry list: packet-gate.mjs, checks.mjs, fences.mjs. Round 4 split checks.mjs for the
 * 300-line cap, moving R3 into provenance.mjs, R4 into artifact.mjs, both normalizers into
 * normalize.mjs and the arg parser into args.mjs — and the hand-maintained list was not updated.
 *
 * Measured consequence, not theorised: with `checkArtifact` replaced by `return []` — R4 fully
 * neutered — the canary record still certified the gate, R15 stayed silent, `PACKET READY` printed,
 * and the decoy packet produced ZERO findings. The refactor that was meant to satisfy a style rule
 * silently removed R15's coverage from the two most load-bearing checks in the system.
 *
 * A hand-maintained list of "the files that matter" is guaranteed to drift the moment someone splits
 * a file, and splitting files is exactly what the 300-line cap requires. So the list is now derived
 * from the directory: every `.mjs` directly inside scripts/packet-gate/, plus the CLI. A new check
 * file is covered the moment it exists, with nobody remembering anything.
 *
 * Fail-closed: if the directory cannot be read we return '' rather than a hash over a partial set,
 * and checkCanary treats a falsy hash as a refusal. A hash covering fewer files than it should is
 * indistinguishable from a valid one, which is the property that made this bug invisible.
 */
export function gateSourceFiles(root = DEFAULT_ROOT) {
  const entry = 'scripts/packet-gate.mjs';
  const covered = new Set([entry]);

  // (1) THE IMPORT GRAPH, walked transitively from the CLI entry point.
  //
  // ROUND-6 CORRECTION. Round 5 replaced a hand-written three-file list with a scan of ONE
  // directory — and the gate's logic lives in two. `extractAnchors` (context-gateway/src/anchors.mjs)
  // decides anchors.paths/routes/symbols, which decides `aboutCode`, which decides whether R4 runs
  // AT ALL. Neuter it to return empty arrays and: aboutCode false, R4 returns [], R5 has nothing to
  // resolve, the canary record still matches because anchors.mjs was never hashed, R15 silent,
  // PACKET READY. That is round 5's critical exactly, one directory over — the derived list fixed
  // "someone forgot to add a file" and reintroduced it as "someone forgot the derivation's scope."
  // `providers.mjs` is the same story for the cost number a human approves.
  //
  // Walking imports is the only formulation that cannot drift: whatever the gate actually depends
  // on is hashed, wherever it lives, including files that do not exist yet.
  const walk = (rel) => {
    const abs = path.join(root, rel);
    if (!existsSync(abs)) return;
    let src;
    try { src = readFileSync(abs, 'utf8'); } catch { return; }
    // Three import shapes, not one. The first version matched only `from './x'`, missing side-effect
    // imports (`import './x.mjs'` — no `from`), dynamic `import('./x.mjs')`, and `from"./x"` with no
    // whitespace, all legal JS. Nothing in the gate uses those shapes today, so this was latent —
    // but the walker now DEFINES R15's coverage, and the recursive floor only bounds the blast
    // radius for files inside scripts/packet-gate/, which is exactly where anchors.mjs is NOT.
    // (Kimi K3 round 7 F2 / round 8 F4 — round 7 CLAIMED this fix and it never reached the file.)
    for (const m of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.[^'"]+)['"]/g)) {
      const next = path.relative(root, path.resolve(path.dirname(abs), m[1])).replaceAll('\\', '/');
      if (covered.has(next)) continue;
      covered.add(next);
      walk(next);
    }
  };
  walk(entry);

  // (2) A RECURSIVE FLOOR over the gate's own directory, unioned with the graph.
  //
  // The 300-line cap — which caused round 5 — will eventually force a split into a subdirectory, and
  // `readdirSync` is not recursive, so every file in it would have escaped by construction. This
  // also covers a module that exists but is not imported YET, which is precisely the window in which
  // a half-wired check looks green.
  const rel = 'scripts/packet-gate';
  const scan = (dirRel) => {
    let entries;
    try { entries = readdirSync(path.join(root, dirRel), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const child = `${dirRel}/${e.name}`;
      // tests/ is excluded deliberately: tests decide nothing at runtime, and hashing them would
      // invalidate the canary record on every test edit for no safety gain.
      if (e.isDirectory()) { if (e.name !== 'tests' && e.name !== '__tests__') scan(child); continue; }
      if (e.name.endsWith('.mjs')) covered.add(child);
    }
  };
  scan(rel);

  // R6's ENGINE IS NOT JAVASCRIPT. The hygiene verdict comes from `scripts/scan-secrets.sh`, which
  // no import walk and no `.mjs` scan can ever reach — so R6's actual decision logic sat permanently
  // outside the canary binding, and rewriting that script would not change the hash by one bit.
  // That is the round-5 critical's shape (a check the canary does not certify) in the one place the
  // derivation is structurally blind. Named explicitly because it cannot be derived.
  // (GLM-5.3 round 9, F5.)
  covered.add('scripts/scan-secrets.sh');

  return [...covered].sort();
}

export function gateSourceHash(root = DEFAULT_ROOT) {
  let sources;
  try {
    sources = gateSourceFiles(root);
  } catch {
    return ''; // cannot enumerate → cannot certify. checkCanary refuses on a falsy hash.
  }
  const h = createHash('sha256');
  for (const f of sources) {
    const abs = path.join(root, f);
    h.update(f);
    // split/join rather than a regex: line endings must normalize identically on every checkout,
    // or the hash differs between a CRLF and an LF working tree and R15 refuses for no real reason.
    //
    // The per-file READ is inside the try as well. Only the ENUMERATION was guarded, so an
    // unreadable source file (EACCES, a lock, a file replaced by a directory) threw out of
    // gateSourceHash and surfaced as an unexpected-failure stack trace rather than a refusal —
    // fail-noisy rather than fail-open, but the least diagnosable output a gate can produce, and
    // the caller already treats a falsy hash as "cannot certify". (GLM-5.3 round 9, F5.)
    try {
      h.update(existsSync(abs) ? readFileSync(abs, 'utf8').split('\r\n').join('\n') : '<missing>');
    } catch {
      return '';
    }
  }
  return h.digest('hex');
}
