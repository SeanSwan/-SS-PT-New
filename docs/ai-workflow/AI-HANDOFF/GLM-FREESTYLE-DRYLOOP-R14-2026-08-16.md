# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round14-packet.md
**Tokens:** 31344 in / 19694 out (reasoning: 18800) | total 51038
**Wall:** 348.7s

---

# HOSTILE REVIEW ROUND 14 — GLM

Attacked the round-13 fix directly (ordering, flush gating, double-tap, expiry branch, armed-state transitions — handleStop and handleRequestDiscard are correct: flush lands while `state === 'listening'`, snapshot built from `fragmentsRef` includes it, engine dies in the tick, idempotent on double-tap, no-op-safe from paused/error), then swept every exit path against the remit's claim that **every** user/lifecycle exit from active listening stops the transport synchronously, then re-walked all five files for anything thirteen rounds missed (recorder stop/settle interleavings, coach-capture mirror/latch, session ownership mask and purge receipts, speech restart backoff and flush paths, overlay focus/keyboard/lifecycle, styles cascade).

One claim in that invariant is false.

---

**FINDING [HIGH]: Cancel/Escape exit from active listening still releases the engine via the passive follow effect — the "close" exit the round-13 remit lists as synchronous is not implemented**
/ Evidence: `CoachFreestyleOverlay.tsx:292-295` (`handleClose` = `reset('completed'); onClose();` — no `speechStopRef`), reached while listening via the Cancel button at `:518-522` (rendered whenever `fragments.length === 0 && !isStopped`, which includes fresh `'listening'` after auto-start) and via the Escape fallback at `:312-313` (`else handleClose()` when not stopped and zero fragments); the only stop paths are the passive follow effect `:176-186` and the `!isOpen` effect `:163-165`. Contrast the synchronous exits: `pauseWithFlush` `:136-140`, `handleStop` `:229-239`, `handleRequestDiscard` `:282-285`, account-switch layout effect `:152-156`.
/ Why: Open the overlay, auto-start engages the session, tap Cancel before any words finalize (or press Escape). The click handler returns with `wantListeningRef` still `true` and the recogniser live; the engine is released only when React commits and flushes the passive follow effect — after paint, later on a busy/low-end main thread. This is byte-for-byte the still-hearing window class round 13 closed for Done (same hook, same effect, same timing argument), on the one user exit the round-13 packet claims is already covered ("…Pause, Done, discard-arm, tab-hide/pagehide, account-switch (layout), **close**"): the cloud-backed recogniser keeps receiving gym-floor audio after the user has abandoned the session, and the round-13 invariant is falsified on a trivially reachable control. (`handleDiscard` is safe — the engine was killed synchronously at arm time; `handleStop`'s null-snapshot branches are safe — `speechStopRef` runs before `stop()`; pagehide after a Cancel is caught by the lifecycle listener, so the residual failure is precisely the async window itself, the same bar rounds 5 and 13 adjudicated as findings.)
/ Fix: First line of `handleClose`: `speechStopRef.current();` — placed before `reset('completed')` a trailing interim would flush and then be purged (harmless); placed after, the idle-state guard refuses the append (cleaner). For symmetry with the account-switch precedent, consider also mirroring `:152-156` with a `useLayoutEffect` keyed on `isOpen` so a parent-driven close-while-listening releases before paint rather than in the passive `:163-165` effect.

---

**Count: 1 finding.**

Everything else I could construct either terminates in an existing guard (double-tap Done → `stateRef` null snapshot; 250 ms fade-out keyboard window → both gesture starters' `isOpen` guards; error-with-words Start → unrendered and session-refused; discard-while-paused → `wantListening` already false), is a documented deliberate decision, or sits behind the fenced list. This is the last uncovered sibling of the round-5/13 class — fix it and the invariant as written becomes true on every exit I can reach from this surface.
