# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round15-packet.md
**Tokens:** 31566 in / 17223 out (reasoning: 15764) | total 48789
**Wall:** 319.9s

---

# HOSTILE REVIEW ROUND 15 — Report

Method: each invariant member attacked with the strongest interleaving I could construct against it, plus a full re-sweep of both recorder-layer files and the styles surface. No finding survived tracing. The work is shown so the zero is auditable, not asserted.

---

## Member-by-member attack results

**1. Pause — `pauseWithFlush` :136-146.** Attacked: (a) pagehide → flush lands words via `appendFragment` while `stateRef` is still `'listening'` ✓ words captured, then sync `teardown`, then pause; (b) pause arriving while the engine sits in the backoff-restart gap — `teardown` clears `restartTimerRef` (:182-185), so no zombie restart fires after the pause ✓; (c) double-flush (explicit `flush()` + `speech.stop()`'s internal flush :320) — second pass sees `interimRef` already cleared, no-op ✓; (d) `onend` firing mid-pause — handlers detached before any interleaving point ✓. Holds.

**2. Done — `handleStop` :239-241.** Attacked: Done while paused (engine already down, interim already flushed at pause-time, `stop()` legal from `'paused'` :340) ✓; Done during a backoff gap (timer cleared via teardown ✓); double-tap Done (second `session.stop()` returns `null` from `'stopped'`, no duplicate `onStopped`) ✓; Done in `'error'`-with-words (engine dead by definition of the only `fail()` callers, `stop()` legal from `'error'`, snapshot built from refs includes the fatal-error flush) ✓. Holds.

**3. Discard-arm — `handleRequestDiscard` :285-288.** Attacked: Escape-arm while listening — `speech.stop()` flushes *before* `requestDiscard()` arms, so the mid-flight phrase is judged with the rest and counted in "N words will be deleted" ✓; arm while paused (engine already down) ✓; pagehide while armed (all three sub-calls no-op) ✓; armed session cannot return to `'listening'` without a gesture (confirm UI replaces Resume; disarm leaves `'paused'`) ✓. Holds.

**4. Cancel/close — `handleClose` :295-305.** Attacked: Cancel with zero committed fragments but non-empty interim — the sync stop flushes while still `'listening'`, words land, then `reset('completed')` receipts the purge — nothing silently dropped ✓; Close-after-Done (engine down, snapshot already handed off, buffer purge receipted `'completed'`) ✓; Escape routing in every state (armed→cancel, words→arm, else close) ✓; ownership-mismatch Escape — `reset` refuses via `ownedNow()`, the account-switch effect remains sole purge path, receipt cannot lie ✓. Holds.

**5. Tab-hide/pagehide — :198-209.** Attacked: listeners live for the component's whole mounted life, including while `isOpen` false — `pause()` no-ops off `'listening'`, `speech.stop()` no-ops off `wantListening` ✓; `visibilitychange`→visible does not auto-resume ✓; bfcache return leaves a paused session with Resume as the gesture ✓; handlers registered once (`pauseWithFlush` stable, empty deps) ✓. Holds.

**6. Account-switch — layout :152-156.** Attacked: simultaneous parent-close + switch in one commit — the account layout (declared first) stops speech, the parent-close layout sees masked `'idle'` and no-ops, engine stopped exactly once ✓; mismatch-window Resume/append/stop — all refuse via `ownerRef`/`ownedNow`, interim render gated on masked `isListening` (:411) ✓. Holds.

**7. Parent-close — layout :163-168.** Attacked: the `setState`-inside-layout-effect re-render — safe under either passive-flush ordering because the follow effect's else-branch (`isOpen` false) *also* stops the engine; the layout stop is the guarantee, the follow stop is defense-in-depth ✓; close-while-paused/error/stopped (engine already down by each member above) ✓; close-then-reopen (auto-start gated on `'idle'`; session is `'paused'` → no re-engagement, Resume is the gesture) ✓; mount-with-`isOpen`-false (no-op) ✓. Holds.

**Completeness of the member list** — every exit from `'listening'` enumerated: `pause` (three callers, all sync), `stop` (one caller, sync), `fail` (engine already dead whenever reachable — the bridge fires only on `speech.error`, which is set only by fatal/start-failure paths that kill the engine first), `discard` (unreachable un-armed; arming is sync), `reset` (one caller, sync), account-switch (layout, sync), unmount (speech hook's own teardown, round-11 floor). No eighth member exists.

## Candidates considered and rejected (so the zero is honest)

- **TTL purge while `'listening'` releases the engine via the passive follow effect, not synchronously.** Traced: interval-driven, no freeze window can intervene (the synchronicity rationale is pagehide/navigation freezes, which don't apply mid-tick), 24h-listening precondition pathological, and the follow effect is the documented design for hook-internal transitions (:171-176). Not a defect.
- **`A→B→A` account flicker within one commit batch.** Requires a transient account prop that never renders; mask plus purge-effect idempotence cover the realistic window. Too speculative to stand.
- **Backoff gap up to 15s shows "Listening" over a down engine.** Surfaced by design: Reconnects counter (:439-444), quiet counter, and the documented restart doctrine. Design property, not a bug.
- **`useCoachCapture` unmount cleanup setStates on an unmounting component.** No-op in React 18, no warning, no behavior. Not a finding.
- **Zero-byte blob → `'ready'`** in the RECORD pipeline (stop inside the first 250ms timeslice). Minor UX edge, no lifecycle/PII consequence, pre-existing surface. Below the bar at round 15.

Both recorder-layer files (`useVoiceRecorder`, `useCoachCapture`) re-swept against rounds 4/5/6/11/12 fixes — supersede path, flight generation, latch, stale-flight rejection guard, unmount floor, transcribe flight-keying all hold under the interleavings I could construct. Styles surface: visibility-gated focusability, focus trap scoping, fallback-first `color-mix` cascade — hold.

---

**FINDINGS: 0**
