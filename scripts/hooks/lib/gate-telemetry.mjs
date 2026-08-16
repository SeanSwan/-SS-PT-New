/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-telemetry.mjs
 * PURPOSE: The telemetry channel — the append-only record whose SILENCE the
 *          system defines as a dead gate.
 * AUTHOR: Opus 5 | CREATED: 2026-08-16 (split from gate-common.mjs, Rule 4)
 * REVIEW:  Kimi S3 / HY3 D3 (fail-open must not manufacture silence),
 *          GLM Q4 (the unenforced return contract), GLM Q5 (line tearing).
 * ============================================================================
 *
 * TELEMETRY IS NOT EVIDENCE (GLM Q10e). The file is in-repo and agent-writable:
 * the examinee can append fabricated lines, delete real ones, or truncate the
 * whole channel. It is a forensics and liveness signal. No gate may treat "a
 * telemetry line exists" as proof that a gate ran.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { gateRoot, qaDir, telemetryPath } from './gate-trust.mjs';

/**
 * GLM Q5: `reason` was unbounded. An 8 KB line was written and verified — past
 * the ~4096-byte boundary under which concurrent `appendFileSync` from two
 * agents stays un-torn. A torn line fails JSON.parse, `readJsonl` silently skips
 * it, and the skipped line can be the fail-open record whose absence IS the
 * crash signal. Bounding `reason` is what keeps the channel readable; the
 * `auditJsonl` reader below is what makes damage reportable.
 */
export const MAX_REASON_CHARS = 512;
export const MAX_FIELD_CHARS = 128;
export const MAX_TELEMETRY_LINE_BYTES = 4096;

export function clampReason(value, limit = MAX_REASON_CHARS) {
  const s = String(value ?? '');
  return s.length <= limit ? s : `${s.slice(0, limit)}…[+${s.length - limit}]`;
}

/** Append exactly one telemetry line. Key ORDER is contract. Never throws. */
export function appendTelemetry(entry) {
  try {
    mkdirSync(qaDir(), { recursive: true });
    const build = (reason) => JSON.stringify({
      ts: new Date().toISOString(),
      // The identifier fields are clamped too. Bounding only `reason` still let
      // a pathological gate/boundary/result push the line past the atomic-append
      // budget, which is the same tearing defect one field to the left.
      gate: clampReason(entry?.gate ?? 'unknown', MAX_FIELD_CHARS),
      boundary: clampReason(entry?.boundary ?? 'unknown', MAX_FIELD_CHARS),
      result: clampReason(entry?.result ?? 'unknown', MAX_FIELD_CHARS),
      reason,
      latency_ms: Number.isFinite(Number(entry?.latency_ms)) ? Math.round(Number(entry.latency_ms)) : 0,
    });
    let line = build(clampReason(entry?.reason));
    // Even a clamped reason can overflow if the fixed fields are pathological;
    // shrink until the whole line fits the atomic-append budget.
    for (let limit = MAX_REASON_CHARS; Buffer.byteLength(line) > MAX_TELEMETRY_LINE_BYTES && limit > 0;) {
      limit = Math.floor(limit / 2);
      line = build(clampReason(entry?.reason, limit));
    }
    appendFileSync(telemetryPath(), `${line}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Record a fail-open.
 * @returns {null} when the telemetry line landed — safe to allow.
 * @returns {object} TRUTHY when logging failed — the caller must NOT silently
 *          allow; at a fail-closed boundary this is a block (HY3 D3).
 *
 * GLM Q4 is fair and unfixed here: a return value 24 future call sites must
 * remember to check is S3 deferred, not S3 solved. The sentinel field is now
 * named `block` so a careless reader of the object still reads the instruction,
 * but the real fix is a `runGate()` wrapper that owns telemetry and exit-code
 * mapping at ONE choke point. That belongs to slice 2 and is recorded there.
 */
export function failOpen(name, boundary, reason, latencyMs = 0) {
  const logged = appendTelemetry({ gate: name, boundary, result: 'fail-open', reason, latency_ms: latencyMs });
  if (logged) return null;
  try { process.stderr.write(`GATE-TELEMETRY-FAILURE ${name} ${reason}\n`); } catch { /* last resort */ }
  return { block: true, failOpen: true, telemetrySound: false, gate: name, reason };
}

const channelAnnounced = new Set();

/**
 * Announce something about the disable channel AT MOST ONCE per process.
 * Found while attacking this slice's own fix: a broken disable directory made
 * isDisabled() telemeter on EVERY call, so a gate that checks in a loop floods
 * the crash-signal channel — degrading the very channel the warning protects.
 */
export function announceOnce(key, entry) {
  // Scoped to the gate root, not the process. In production the root is fixed,
  // so this is exactly once per process; retargeting the root (a new test case,
  // or a hook legitimately pointed elsewhere) is a different channel and gets
  // its own announcement rather than inheriting a stale "already told you".
  const scoped = `${gateRoot()}|${key}`;
  if (channelAnnounced.has(scoped)) return;
  channelAnnounced.add(scoped);
  appendTelemetry(entry);
}
