/**
 * consoleRedaction.mjs — route direct `console.*` output through the shared redaction rules.
 * ==========================================================================================
 * WHY A WRAPPER INSTEAD OF EDITING THE CALL SITES (SWA-71, 2026-07-28):
 * Both loggers redact, but **543 direct `console.*` calls in runtime code bypassed them** — 240 in
 * routes, 189 in controllers, 108 in services, 6 in middleware — and 454 of those log an error
 * object, a request, or a user. `console.error(err)` on a Postgres failure writes the connection
 * password to stdout, which on Render means straight into the log stream.
 *
 * Editing 454 call sites during a launch is the wrong shape: enormous churn, enormous review
 * surface, and every one of them a chance to break a working path. One wrapper at the entry point
 * covers all of them — including `scripts/` and `seeders/` — and matches how this problem was
 * already solved twice tonight: fix the chokepoint, not the callers.
 *
 * ── SAFETY PROPERTIES, each one deliberate ──────────────────────────────────────────────────
 *
 * 1. NEVER THROWS. If redaction fails for any reason the ORIGINAL arguments are printed. Losing a
 *    log line is worse than printing an unredacted one, and an observability wrapper that can
 *    throw into its caller is the exact defect class this effort exists to remove.
 *
 * 2. RECURSION-GUARDED. If anything inside the redaction path itself calls `console.*`, the guard
 *    routes it to the untouched original instead of re-entering — otherwise a single bad log would
 *    become an infinite loop and take the process down.
 *
 * 3. IDEMPOTENT. Installing twice is a no-op. Double-wrapping would double the work per call and
 *    make the original unrecoverable.
 *
 * 4. KILL SWITCH. `SWAN_CONSOLE_REDACTION=off` disables it without a deploy. This ships on launch
 *    night; it must be reversible by an env var, not a code change.
 *
 * 5. FORMAT SPECIFIERS PRESERVED. Only the VALUES are redacted; `%s`/`%d` positions and argument
 *    count are untouched, so `console.log('user %s', name)` still formats correctly.
 *
 * 6. OBJECT SHAPE PRESERVED. Objects stay objects (values redacted in place) rather than being
 *    stringified, so `console.log(obj)` still renders as an inspectable object in the log stream.
 *
 * @module utils/consoleRedaction
 */
import { redactLogValue } from './redactionRules.mjs';

const WRAPPED_METHODS = ['log', 'error', 'warn', 'info', 'debug', 'trace'];

/** Set while a wrapped method is executing, so nested console calls cannot re-enter. */
let inRedaction = false;

/** Originals, captured once at install so the wrapper can always fall back and uninstall cleanly. */
let originals = null;

/**
 * Wrap the console methods so their arguments pass through the shared log-redaction rules.
 * Safe to call more than once. Returns whether the wrapper is now active.
 *
 * @returns {boolean} true if console is wrapped, false if disabled or already installed
 */
export function installConsoleRedaction() {
  if (String(process.env.SWAN_CONSOLE_REDACTION || '').toLowerCase() === 'off') return false;
  if (originals) return false; // already installed — idempotent

  originals = {};
  for (const method of WRAPPED_METHODS) {
    if (typeof console[method] !== 'function') continue;
    const original = console[method].bind(console);
    originals[method] = console[method];

    console[method] = (...args) => {
      // Re-entrancy: something inside redaction logged. Use the untouched original.
      if (inRedaction) return original(...args);

      inRedaction = true;
      try {
        const safe = args.map((a) => redactLogValue(a));
        return original(...safe);
      } catch {
        // Fail OPEN on the log line itself: printing something beats printing nothing.
        return original(...args);
      } finally {
        inRedaction = false;
      }
    };
  }
  return true;
}

/**
 * Restore the original console methods. Exists for tests — a test that needs to assert on raw
 * console output should be able to get back to a clean console rather than working around the
 * wrapper.
 */
export function uninstallConsoleRedaction() {
  if (!originals) return false;
  for (const [method, fn] of Object.entries(originals)) console[method] = fn;
  originals = null;
  return true;
}

/** @returns {boolean} whether the wrapper is currently installed. */
export function isConsoleRedactionInstalled() {
  return originals !== null;
}
