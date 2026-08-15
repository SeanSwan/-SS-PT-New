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
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '..', '..');

/** Files whose contents define what the gate actually checks. */
const GATE_SOURCES = [
  'scripts/packet-gate.mjs',
  'scripts/packet-gate/checks.mjs',
  'scripts/packet-gate/fences.mjs',
];

export function gateSourceHash(root = DEFAULT_ROOT) {
  const h = createHash('sha256');
  for (const f of GATE_SOURCES) {
    const abs = path.join(root, f);
    h.update(f);
    // split/join rather than a regex: line endings must normalize identically on every checkout,
    // or the hash differs between a CRLF and an LF working tree and R15 refuses for no real reason.
    h.update(existsSync(abs) ? readFileSync(abs, 'utf8').split('\r\n').join('\n') : '<missing>');
  }
  return h.digest('hex');
}
