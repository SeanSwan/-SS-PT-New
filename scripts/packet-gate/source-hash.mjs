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
  const rel = 'scripts/packet-gate';
  const dir = path.join(root, rel);
  // `tests/` is a directory and has no .mjs at this level, so it is excluded by construction —
  // deliberately: the tests do not decide anything at runtime, and hashing them would make every
  // test edit invalidate the canary record for no safety gain.
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort().map((f) => `${rel}/${f}`);
  return ['scripts/packet-gate.mjs', ...files];
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
    h.update(existsSync(abs) ? readFileSync(abs, 'utf8').split('\r\n').join('\n') : '<missing>');
  }
  return h.digest('hex');
}
