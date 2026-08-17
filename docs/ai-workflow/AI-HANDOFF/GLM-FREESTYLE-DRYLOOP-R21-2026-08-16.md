# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round21-packet.md
**Tokens:** 33067 in / 23170 out (reasoning: 21563) | total 56237
**Wall:** 370.5s

---

# HOSTILE REVIEW ROUND 21 — Report

Both round-20 fixes attacked as specified. Kill attempts and traces below, then the re-sweep.

---

## ATTACK 1 — `hasWords = fragments.length > 0 || speech.interim.trim().length > 0` (CoachFreestyleOverlay.tsx:351)

**Kill attempt 1.1 — stale interim makes `hasWords` lie true (Discard offered over nothing / "0 words" confirm).**
Requires interim to survive engine death. Enumerated every teardown caller in useFreestyleSpeech.ts: `stop()` (:338) and `abandon()` (:351) clear interim before teardown; `onend` (:275) and fatal `onerror` (:263) clear it; the unmount effect (:343–346) only runs with want already false from a clearing path. The one unpaired teardown is inside `startEngine()` (:214) — but every entry into `startEngine` (`start()` gated on want=false which implies a prior clear; `onend` restart paths which cleared at :275) arrives with interim empty. The `startEngine` catch (:305–318) doesn't clear, but inherits `''` by the same trace. Invariant holds: interim non-empty ⟺ engine live. **No kill.**

**Kill attempt 1.2 — ownership-mismatch window: A's interim drives B's affordance.**
`hasWords` reads unmasked `speech.interim`, unlike `fragments`. But the account-switch layout effect (:158–162) calls `speechStopRef.current()` in the layout phase — `stop()` clears `interimRef`/`setInterimBoth('')` synchronously, and the layout-effect setState flushes before paint — so the painted frame under trainer B already has interim `''` and `hasWords` false (Cancel). Even if armed, `requestDiscard`'s `ownedNow()` refusal (:380) blocks arming and `appendFragment`'s guard (:448) blocks mis-attribution. Fail-closed both ways. **No kill.**

**Kill attempt 1.3 — confirm-count mismatch: interim words judged but not counted.**
Both arming paths (button :565, Escape :364) route through `handleRequestDiscard` (:304–307), whose `speechStopRef.current()` flushes while the session is still `listening` — words land as fragments before `requestDiscard()` arms/pauses, in the same batch, so the confirm's `wordCount` (:527) includes them. "Keep it" retains them as fragments — strictly better than pre-round-20 Cancel destruction. **No kill.**

**Kill attempt 1.4 — parity gaps.** `trim()` matches `flush()`'s trim (:191); whitespace-only interim yields `hasWords` false and `LivePhrase` renders nothing (`tailWords` of whitespace → `''`, falsey in JSX). Post-arm interim impossible (engine stopped synchronously; queued events hit detached handlers). Paused/error/stopped states have interim `''` by the paths that entered them. **No kill.**

## ATTACK 2 — `abandon()` + `closeSession` (useFreestyleSpeech.ts:348–353; CoachFreestyleOverlay.tsx:321–330)

**Kill attempt 2.1 — a preserving exit routed through the non-flushing `abandon`.**
Closed-set reachability of `closeSession`: `handleClose` (Cancel :570–574, gated `!hasWords`; Close :558–562, gated `isStopped`; Escape fallback :364–365, gated `!isStopped && !hasWords` or `isStopped`) and `handleDiscard` (armed; interim was flushed at ARM). In every reachable state at `abandon()` time, interim is empty or already judged; error-with-words and paused-with-words cannot reach Cancel (hidden by `hasWords`). The one deliberate flush points (Done :254, pauseWithFlush :136–140, discard-arm :305) retain the flushing `stop()`. **No kill.**

**Kill attempt 2.2 — `abandon` leaves the engine or restart loop alive.** Teardown clears the backoff timer (:197–200), detaches handlers before `abort()` (:203–206). The follow effect's subsequent `speechStop()` on the idle transition is a want-false no-op. **No kill.**

**Kill attempt 2.3 — receipt/latch regressions.** `clearError` after `abandon` still fires long after the fail-bridge consumed the error (bridge re-runs on error→null as a no-op, :244–245); `discard()`'s `discardPendingRef` is armed when `closeSession`'s settle runs (single-threaded, no 10s-timer interleave); discard across a mid-flight ownership flip refuses in `discard()` and the switch effect receipts `account-switch` truthfully. **No kill.**

**Kill attempt 2.4 — round-20 bug class surviving on another exit.** Unmount layout cleanup (:183) uses the flushing `speechStop` — but the appended words are destroyed by the session's own unmount purge in the same phase, under a truthful `'unmount'` receipt, with `hadData` identical either way: no window, no misnamed act. Materially inert. **No kill.**

## RE-SWEEP (non-fenced surfaces)

- **Engine-release inventory vs. the freeze-prone doctrine (R13–15):** Done, Pause, discard-arm, account-switch, isOpen-false, unmount — all synchronous. One residual: an interval-driven TTL purge (:505–512) settles `idle` and releases the mic via the passive follow effect. Assessed and **not reported**: interval context is not freeze-prone; interim words in the sub-flush window are dropped fail-closed by the `listening` guard (:459); the recogniser's transport status is unchanged by the purge; and expiry enforcement timing sits inside the fenced S2/S3 snapshot-expiry owner decision.
- **useVoiceRecorder:** second `stop()` during the queued-finalize window hits the else-branch with `stateRef === 'recording'` → no wipe of the pending finalize (:225–236); stale-flight rejection guarded by generation (:201–208); cleanup handler-detach order intact. Clear.
- **useCoachCapture:** latch/mirror/late-arrival interleavings re-traced (start-during-latch, auto-hidden-during-requesting, reset-after-auto-stop) — all settle correctly; transcribe blob-keying and reset-abandon semantics unchanged. Clear.
- **useFreestyleSession:** every `idle` settlement passes through `clearBuffer` (no unreceipted wipes from `start`); pause-clock arithmetic (`settlePause` anchor shift, `elapsedMs` freeze) re-verified; masked-view vs. `stateRef` split (view masked, machine real) correct at every mutator. Clear.
- **Styles:** color-mix fallback ordering (`border-color` override pattern valid independently of `background`); visibility transition + `motionSafe` interaction remains functionally safe (visibility still flips). Clear.

---

## FINDINGS: 0

Both round-20 fixes held under direct attack; the re-sweep produced no unfenced defect. This reviewer's round-21 slot is empty. If the second reviewer is also empty, this is the first of the two consecutive zero rounds required to end the loop.
