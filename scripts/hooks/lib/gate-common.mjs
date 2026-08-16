/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-common.mjs
 * PURPOSE: Shared primitives for the hostile-review gate system — telemetry,
 *          typed JSON I/O, atomic writes, the disable mechanism, and freshness.
 * AUTHOR: Opus 5 | CREATED: 2026-08-12 | REVISED: 2026-08-13, 2026-08-16
 * REVIEW:  Kimi K3 (S3-S9) + HY3 (D1-D4) — both DO-NOT-SHIP on v1.
 *          GLM-5.3 (Q1-Q10) on the shipped v2 — 2 CRITICAL, both confirmed by
 *          executed probe before any code moved. Trust-root and git resolution
 *          moved to gate-trust.mjs; the lock lives in gate-lock.mjs.
 * ============================================================================
 *
 * TRUST BOUNDARY: gate decisions may depend only on hook-written state,
 * tool-written state, and git. Agent-written state is a CLAIM, never evidence.
 * Several primitives violated this while appearing to enforce it; the
 * corrections are marked inline so nobody re-introduces them.
 *
 * TELEMETRY IS THE CRASH SIGNAL. Every gate run appends one line, so silence
 * means a dead gate rather than a satisfied one. v1 broke this at the single
 * place it mattered: `failOpen` discarded `appendTelemetry`'s return value, so a
 * telemetry failure produced a silent allow — manufactured silence, which is the
 * failure the contract claims to detect (Kimi S3 / HY3 D3). `failOpen` now
 * returns a TRUTHY object when logging failed; `block:true` means DO NOT ALLOW.
 *
 * TELEMETRY IS NOT EVIDENCE (GLM Q10e). The file is in-repo and agent-writable:
 * the examinee can append fabricated lines, delete real ones, or truncate the
 * whole channel. It is a forensics and liveness signal. No gate may treat "a
 * telemetry line exists" as proof that a gate ran.
 */
import { mkdirSync, readdirSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { disabledDir, qaDir, sessionAnchorPath, sessionId } from './gate-trust.mjs';
import { readJsonResult } from './gate-io.mjs';
import { announceOnce, appendTelemetry, clampReason } from './gate-telemetry.mjs';

const disabledAnnounced = new Set();

/**
 * Every active disable marker, and whether the channel could be read at all.
 *
 * GLM Q10d (verified): the old `listDisabled` returned `[]` on EACCES/ENOTDIR,
 * so replacing the disable directory with a FILE made every kill switch read as
 * absent. During an incident the operator throws the switch and nothing happens,
 * silently. A channel whose PRESENCE is a control signal must distinguish
 * "empty" from "broken"; broken must make the push gate refuse.
 * @returns {{markers:string[], status:'ok'|'missing'|'broken', code?:string}}
 */
export function disableChannelStatus() {
  try {
    const markers = readdirSync(disabledDir()).filter((f) => !f.startsWith('.')).sort();
    return { markers, status: 'ok' };
  } catch (err) {
    if (err?.code === 'ENOENT') return { markers: [], status: 'missing' };
    return { markers: [], status: 'broken', code: err?.code };
  }
}

/** Marker names only. Prefer `disableChannelStatus()` at any trust boundary. */
export function listDisabled() { return disableChannelStatus().markers; }

/**
 * Is a component disabled? Emits `disabled-honored` telemetry the first time per
 * process (Kimi S5) — v1 honored a kill switch and told nobody.
 *
 * GLM Q7 (two defects, both fixed here):
 *  - Case folding was one-sided. The QUERY was lowercased but the marker on disk
 *    was not, so `disabled/Review-Round-Gate` matched on Windows/macOS (case-
 *    insensitive lookup) and MISSED on Linux — a split brain where the per-gate
 *    check ignores the kill switch while `listDisabled()` still reports it and
 *    the push gate refuses. Matching now goes through the directory listing,
 *    compared case-insensitively, so all platforms agree.
 *  - A malformed name returned `false`, indistinguishable from "no marker". The
 *    blast direction is safe (a caller doing `if (!isDisabled(n)) enforce()`
 *    enforces), so the value is unchanged — but the SILENCE was the real defect,
 *    and a rejection is now telemetered.
 */
export function isDisabled(name) {
  const raw = String(name);
  if (!raw || /[\\/]/.test(raw) || raw.includes('..')) {
    // Dedupe per offending name, so a loop over one bad name announces once but
    // two different bad names are both reported.
    announceOnce(`rejected:${clampReason(raw, 64)}`, { gate: 'disable-check', boundary: 'tool', result: 'name-rejected', reason: `malformed disable name: ${clampReason(raw, 64)}`, latency_ms: 0 });
    return false;
  }
  const key = raw.toLowerCase();
  const { markers, status } = disableChannelStatus();
  if (status === 'broken') {
    announceOnce('broken-channel', { gate: key, boundary: 'tool', result: 'disable-channel-broken', reason: 'disable dir unreadable — kill switch state UNKNOWN', latency_ms: 0 });
    return false; // UNKNOWN, not "enabled" — the push gate must consult status.
  }
  const present = markers.some((m) => m.toLowerCase() === key);
  if (present && !disabledAnnounced.has(key)) {
    disabledAnnounced.add(key);
    appendTelemetry({ gate: key, boundary: 'tool', result: 'disabled-honored', reason: 'disable marker present', latency_ms: 0 });
  }
  return present;
}

/**
 * Stamp the session anchor. **SessionStart hook only** — this is trust-root state.
 *
 * v1 exported `touchSessionStart(when)` with an attacker-controlled timestamp, so
 * `touchSessionStart(new Date(0))` made every artifact ever written "fresh" — a
 * one-line bypass (Kimi S4 / HY3 D2).
 *
 * GLM Q10c (verified): clamping only BACKWARDS left two live primitives — a
 * forward stamp redefined which artifacts look recent, and any call silently
 * overwrote the harness's record of the real session (forensic loss).
 *
 * The first attempt at this fix REFUSED a stamp whose sessionId differed from
 * the anchor's. My own regression test caught that this breaks the normal case:
 * every new session legitimately carries a new id, so the anchor would freeze at
 * the first session forever and the freshness heuristic would anchor to a dead
 * session. Refusing rotation is worse than the defect it fixed. What is actually
 * required is that rotation be RECORDED rather than blocked:
 *   - a future stamp still clamps to now (that was the freshness-redefinition
 *     primitive, and it has no legitimate use);
 *   - the anchor still never moves backwards;
 *   - a rotation preserves the prior record in `previous` and telemeters the
 *     transition, so the harness's session binding survives the overwrite.
 * An agent forging a session id therefore gains a rotation it cannot hide, and
 * moves only `mtimeLooksFresh` — which is HEURISTIC ONLY and may never decide a
 * gate. That is the honest bound of this control.
 */
export function stampSessionStart({ when = new Date(), id, sha } = {}) {
  try {
    mkdirSync(qaDir(), { recursive: true });
    const path = sessionAnchorPath();
    const existing = readJsonResult(path);
    const prior = existing.ok && existing.value && typeof existing.value === 'object' ? existing.value : null;
    const effectiveId = id !== undefined ? id : (sessionId() ?? prior?.sessionId ?? null);
    const rotated = Boolean(prior?.sessionId && effectiveId && prior.sessionId !== effectiveId);
    // Found by this slice's own regression test: a legitimate same-session
    // re-stamp that omitted `sha` used to overwrite the recorded headSha with
    // null — the same forensic loss Q10c is about, delivered by the fix for it.
    // An unspecified field is INHERITED, never nulled.
    const effectiveSha = sha !== undefined ? sha : (prior?.headSha ?? null);
    let existingMs = null;
    try { existingMs = statSync(path).mtimeMs; } catch { existingMs = null; }
    const nowMs = Date.now();
    // Never backwards (S4) and never into the future (Q10c).
    let effectiveMs = when.getTime();
    let clamped = false;
    if (effectiveMs > nowMs) { effectiveMs = nowMs; clamped = true; }
    if (existingMs !== null && effectiveMs < existingMs) { effectiveMs = existingMs; clamped = true; }
    const effective = new Date(effectiveMs);
    const record = { sessionId: effectiveId, headSha: effectiveSha, ts: effective.toISOString() };
    // Rotation keeps ONE generation of history — enough to prove what the anchor
    // said before it moved, without letting the file grow without bound.
    if (rotated) {
      record.previous = { sessionId: prior.sessionId, headSha: prior.headSha ?? null, ts: prior.ts ?? null };
    }
    writeFileSync(path, JSON.stringify(record), 'utf8');
    utimesSync(path, effective, effective);
    if (rotated) {
      appendTelemetry({
        gate: 'session-anchor',
        boundary: 'tool',
        result: 'session-rotated',
        reason: `anchor moved from ${prior.sessionId} to ${effectiveId}`,
        latency_ms: 0,
      });
    }
    return { ok: true, clamped, rotated, ts: effective.toISOString() };
  } catch {
    return { ok: false, clamped: false, rotated: false, ts: null, reason: 'io-error' };
  }
}

/** The anchor's contents, or null when absent/corrupt. */
export function sessionAnchor() {
  const r = readJsonResult(sessionAnchorPath());
  return r.ok ? r.value : null;
}

/** Anchor mtime in epoch ms, or null (UNKNOWN). */
export function sessionStartMs() {
  try { return statSync(sessionAnchorPath()).mtimeMs; } catch { return null; }
}

/**
 * A2 — an artifact NAMES the commit it covers, and that name matches the sha the
 * consumer computed. Nothing more.
 *
 * GLM Q3 (CRITICAL, accepted): the previous docblock claimed "the agent cannot
 * mint a binding for code it did not review, because HEAD is recomputed on the
 * trust side." That is FALSE and the overclaim was the defect — `printf
 * '{"subject_sha":"%s"}' "$(git rev-parse HEAD)" > artifact.json` mints a valid
 * binding in one command, without reviewing anything. What A2 actually buys is
 * narrow and real: an artifact cannot be REPLAYED across commits, so a genuine
 * review of an old HEAD no longer satisfies the gate at a new HEAD. Read the
 * name literally: it checks freshness FOR a sha. It is not evidence of review.
 * Attestation requires the hook holding the pen or a DAG-anchored hash chain —
 * see the gate-trust.mjs footer.
 */
export function isFreshForSha(artifactSubjectSha, currentSha) {
  if (!artifactSubjectSha || !currentSha) return false;
  return String(artifactSubjectSha) === String(currentSha);
}

/**
 * HEURISTIC ONLY — never a gate decision (Kimi's A2 ruling / HY3 D2).
 * mtime is agent-writable via utimesSync, so this fails OPEN against forgery even
 * though it fails closed against absence. Deliberately not named `isFresh…` so no
 * consumer can mistake it for proof.
 */
export function mtimeLooksFresh(path) {
  const start = sessionStartMs();
  if (start === null) return false;
  try { return statSync(path).mtimeMs >= start; } catch { return false; }
}

export {
  DEFAULT_ROOT, gateRoot, headSha, sessionId,
  setGateRoot, setDisableRoot, setGitBinary,
  sanitizeGateEnv, gitSafeEnv, HOSTILE_GIT_ENV, HOSTILE_GATE_ENV,
} from './gate-trust.mjs';
export {
  LOCK_STALE_MS, acquireCounterLock, releaseCounterLock, readLockHolder, stillOwnsLock,
} from './gate-lock.mjs';
export {
  readJsonResult, readJsonUnsafeCollapse, appendJsonl, readJsonl, auditJsonl,
  writeJsonAtomic, fileSha256,
} from './gate-io.mjs';
export {
  qaDir, coordDir, telemetryPath, counterPath, counterLockPath, sessionAnchorPath, disabledDir,
} from './gate-trust.mjs';
export {
  appendTelemetry, failOpen, MAX_REASON_CHARS, MAX_FIELD_CHARS, MAX_TELEMETRY_LINE_BYTES,
} from './gate-telemetry.mjs';
