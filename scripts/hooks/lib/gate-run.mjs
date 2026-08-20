/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-run.mjs
 * PURPOSE: The single choke point every gate runs through — env sanitization,
 *          disable honouring, telemetry, latency, and the fail-open/fail-closed
 *          decision. One enforcement point instead of N remembered obligations.
 * AUTHOR: Opus 5 | CREATED: 2026-08-19 | FIXES: GLM-5.3 Q4
 * ============================================================================
 *
 * WHY THIS EXISTS. GLM's Q4 finding on Slice 1 was that `failOpen()` returning a
 * truthy "do not allow" object is NECESSARY but is not a FIX:
 *
 *   "The fixed bug was one call site inside one function ignoring a return; the
 *    fix moves the same obligation to ~24 call sites that don't exist yet,
 *    enforced by a docblock. Nothing — compiler, lint, test, runtime — detects
 *    the tenth future call site that writes `failOpen(g,b,r); return ALLOW;`."
 *
 * That is correct, and it is the same shape as the defect the whole system was
 * built after: a rule that holds only while everyone remembers it. So the
 * obligation moves here, where it is executed rather than remembered. A gate
 * author writes the CHECK; it cannot write the telemetry-was-silent-so-allow bug,
 * because it never touches telemetry or the exit code at all.
 *
 * THE TWO MODES ARE NOT STYLISTIC.
 *   fail-open   — the gate is an observer. If it breaks, work proceeds. Correct
 *                 for advisory gates: a broken reminder must not halt the repo.
 *   fail-closed — the gate is a boundary (R8-1). If it cannot perform its check,
 *                 it BLOCKS: "a gate that cannot scan cannot allow." Correct when
 *                 the thing being prevented is irreversible — a privacy leak
 *                 cannot be un-leaked, so an unscanned turn is not a safe turn.
 *
 * TELEMETRY FAILURE IS A FAIL-CLOSED BLOCK. Silence is this system's defined
 * crash signal, so a gate that could not write its line has lost the only
 * evidence that it ran. Allowing there manufactures exactly the silence the
 * contract reads as "dead gate" (Kimi S3 / HY3 D3). Observers may proceed;
 * boundaries may not.
 */
import { appendTelemetry, isDisabled } from './gate-common.mjs';
import { sanitizeGateEnv } from './gate-trust.mjs';

export const FAIL_OPEN = 'fail-open';
export const FAIL_CLOSED = 'fail-closed';

/**
 * Run one gate check under the uniform contract.
 *
 * @param {{name:string, boundary:'turn'|'push'|'tool', mode:string,
 *          scannerErrorReason?:(err:Error)=>string, now?:()=>number}} spec
 * @param {() => ({block:boolean, reason?:string})} check
 * @returns {{exitCode:number, payload:object|null, result:string, telemetrySound:boolean}}
 *
 * `payload` is the object the caller writes to stdout (or null for silence).
 * The caller does I/O; this function decides. Keeping the decision pure is what
 * makes every branch below testable without spawning a process.
 */
export function runGate(spec, check) {
  const { name, boundary, mode, scannerErrorReason, now = Date.now } = spec ?? {};
  if (!name || !boundary || (mode !== FAIL_OPEN && mode !== FAIL_CLOSED)) {
    throw new TypeError('runGate requires {name, boundary, mode: fail-open|fail-closed}');
  }
  const started = now();
  const closed = mode === FAIL_CLOSED;

  // The disable marker is honoured by BOTH modes, and is always announced. A
  // silently-disabled boundary is indistinguishable from a satisfied one, which
  // is the defect HY3 D1 named; `listDisabled()`/`disableChannelStatus()` exist
  // so the push gate can refuse while any marker is live.
  if (isDisabled(name)) {
    appendTelemetry({ gate: name, boundary, result: 'fail-open', reason: 'disabled', latency_ms: Math.round(now() - started) });
    return { exitCode: 0, payload: null, result: 'fail-open', telemetrySound: true };
  }

  // Strip trust-relocating env AFTER the disable read, so a disable marker placed
  // by a privileged operator via SWAN_DISABLE_ROOT is still honoured, and BEFORE
  // the check runs, so no check reads adversary-chosen configuration (Slice 1 Q1).
  sanitizeGateEnv();

  let outcome;
  try {
    outcome = check();
  } catch (err) {
    const latency = Math.round(now() - started);
    if (!closed) {
      const logged = appendTelemetry({ gate: name, boundary, result: 'fail-open', reason: `check threw: ${err?.message ?? 'unknown'}`, latency_ms: latency });
      return { exitCode: 0, payload: null, result: 'fail-open', telemetrySound: logged };
    }
    const reason = scannerErrorReason
      ? scannerErrorReason(err)
      : `${name.toUpperCase()}: the check itself errored (fail-closed; a gate that cannot check cannot allow). Error: ${err?.message ?? 'unknown'}.`;
    appendTelemetry({ gate: name, boundary, result: 'error', reason: `check threw: ${err?.message ?? 'unknown'}`, latency_ms: latency });
    return { exitCode: 0, payload: { decision: 'block', reason }, result: 'error', telemetrySound: true };
  }

  const latency = Math.round(now() - started);
  const blocking = Boolean(outcome?.block);
  const logged = appendTelemetry({
    gate: name,
    boundary,
    result: blocking ? 'block' : 'allow',
    reason: blocking ? String(outcome.reason ?? '') : 'clean',
    latency_ms: latency,
  });

  if (blocking) {
    return { exitCode: 0, payload: { decision: 'block', reason: String(outcome.reason ?? '') }, result: 'block', telemetrySound: logged };
  }

  // THE Q4 MECHANISM. An allow whose telemetry did not land is an unobservable
  // allow. An observer may proceed unobserved; a boundary may not.
  if (!logged && closed) {
    try { process.stderr.write(`GATE-TELEMETRY-FAILURE ${name} allow-suppressed\n`); } catch { /* last resort */ }
    return {
      exitCode: 0,
      result: 'block',
      telemetrySound: false,
      payload: {
        decision: 'block',
        reason: `${name.toUpperCase()}: the check passed but its telemetry line could not be written, so this run left no evidence it ran (fail-closed; silence is this system's crash signal). To unblock: node scripts/hooks/${name}.mjs --selftest`,
      },
    };
  }

  return { exitCode: 0, payload: null, result: 'allow', telemetrySound: logged };
}
