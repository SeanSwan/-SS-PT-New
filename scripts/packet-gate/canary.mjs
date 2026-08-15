/**
 * canary.mjs — R15, the gate on the gates.
 * ========================================
 * Default-deny on tooling failure. A broken checker that exits 0 is precisely the "technically
 * green, substantively decorative" disease this whole gate exists to avoid, so a stale, malformed,
 * red, or source-mismatched canary record blocks every send until it is fixed.
 *
 * Split from checks.mjs for the 300-line cap (CLAUDE.md rule 4). Pure: the record is injected.
 *
 * @module packet-gate/canary
 */
import { REFUSALS } from './refusal.mjs';

const finding = (code, detail, remedy) => ({ code, label: REFUSALS[code], detail, remedy });

/**
 * R15 — the gates themselves.
 *
 * Default-deny on tooling failure. A broken checker that exits 0 is precisely the "technically
 * green, substantively decorative" disease this whole gate exists to avoid, so a stale or red
 * canary run blocks every send until it is fixed.
 */
export function checkCanary(selftest, { maxAgeDays = 30, now = Date.now(), sourceHash = null } = {}) {
  if (!selftest) {
    return [finding('R15', 'no canary run on record — gates are presumed broken',
      'run: node scripts/packet-gate/selftest.mjs')];
  }
  // SHAPE VALIDATION FIRST. Without it, `{"ranAt":"<now>"}` passed: `undefined > 0` is false and
  // `undefined !== undefined` is false, so both refusal branches were skipped and R15 went green
  // with ZERO canaries ever run. Gate 0 — the check that exists to prove the other checks run —
  // was the easiest check in the system to fake. Found by Kimi K3 hostile review 2026-08-14.
  const int = (v) => Number.isInteger(v) && v >= 0;
  if (!int(selftest.total) || !int(selftest.green) || !int(selftest.red) || selftest.total === 0) {
    return [finding('R15', `canary record is malformed (total=${selftest.total} green=${selftest.green} red=${selftest.red}) — a record that cannot be read is not a passing record`,
      'run: node scripts/packet-gate/selftest.mjs')];
  }
  // BIND THE RECORD TO THE CODE IT CERTIFIES. A canary run against since-edited checks proves
  // nothing; previously a 30-day-old record blessed arbitrarily rewritten gates.
  // A FALSY sourceHash used to skip both binding checks silently, so a single upstream change
  // (gateSourceHash returning null/'') would turn the record-to-code binding off with no alarm —
  // reintroducing the spoofable canary the binding was added to kill. Fail closed instead.
  if (sourceHash !== null && !sourceHash) {
    return [finding('R15', 'gate source hash could not be computed — the canary record cannot be tied to the code it certifies',
      'run: node scripts/packet-gate/selftest.mjs, and check scripts/packet-gate/source-hash.mjs')];
  }
  if (sourceHash && selftest.sourceHash && selftest.sourceHash !== sourceHash) {
    return [finding('R15', `canary record certifies different gate source (recorded ${String(selftest.sourceHash).slice(0, 12)}…, current ${String(sourceHash).slice(0, 12)}…)`,
      'the checks changed since the canaries ran — re-run: node scripts/packet-gate/selftest.mjs')];
  }
  if (sourceHash && !selftest.sourceHash) {
    return [finding('R15', 'canary record predates source-binding and cannot be tied to the current gate code',
      'run: node scripts/packet-gate/selftest.mjs')];
  }
  if (selftest.red > 0 || selftest.green !== selftest.total) {
    return [finding('R15', `canary suite red: ${selftest.green}/${selftest.total} green, ${selftest.red} red`,
      'fix the failing gate before sending anything. A gate that cannot be made to fail is presumed failed')];
  }
  const ageDays = (now - Date.parse(selftest.ranAt)) / 86_400_000;
  if (!Number.isFinite(ageDays)) {
    return [finding('R15', `canary record has an unparseable ranAt (${selftest.ranAt})`, 'run: node scripts/packet-gate/selftest.mjs')];
  }
  // A FUTURE-dated record made `ageDays > maxAgeDays` false forever, so the canary never expired —
  // anyone able to write the record could suppress R15 permanently with one timestamp (HY3 S3,
  // 2026-08-14). One day of tolerance covers clock skew; beyond that the record is not credible.
  if (ageDays < -1) {
    return [finding('R15', `canary record is dated ${Math.abs(Math.floor(ageDays))} days in the FUTURE (${selftest.ranAt}) — a record that never expires is not a record`,
      'run: node scripts/packet-gate/selftest.mjs')];
  }
  if (ageDays > maxAgeDays) {
    return [finding('R15', `canary run is ${Math.floor(ageDays)} days old (max ${maxAgeDays})`,
      'run: node scripts/packet-gate/selftest.mjs')];
  }
  return [];
}
