# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round6-packet.md
**Tokens:** 29073 in / 19490 out (reasoning: 17607) | total 48563
**Wall:** 337.1s

---

# HOSTILE REVIEW ROUND 6 — Swan Coach freestyle capture layer

## Verdict up front

**Zero findings.** Both round-5 fixes hold under direct attack, and a full re-audit of all five files turned up no new reachable failure. The traces that follow are the evidence — every candidate I generated is shown with the reason it fails the reachability bar, so the zero is on the record rather than asserted.

---

## Attack 1: Round-5 fix #1 — cleanup() detaches handlers (useVoiceRecorder.ts:116–121)

**Attack trace:** Reset during live 'recording'. `cleanup()` clears the timer, stops stream tracks (which asynchronously queues the recorder's final `dataavailable`/`stop`), *then* detaches handlers, *then* nulls refs. I checked the ordering claim: track-stop events are queued as tasks per spec, so they cannot run before the detach completes synchronously in the same call. When they do fire, all three handlers (`ondataavailable`, `onstop`, `onerror`) are null — no blob resurrection, no state flip. This is the exact round-5 failure and it is closed.

**Second angle:** double `cleanup()` (reset → then a would-be late `onerror`) — second call sees null refs, no-ops. A second `reset()` after `stop()`→`onstop`→`cleanup()`: handlers already detached and refs null; the "stray stop must not wipe 'stopped'" case is guarded by the `stateRef === 'requesting'` check at line 200. Holds.

**Third angle:** does cleanup stop a *foreign* recorder's stream? `cleanup()` is only called from `onstop`/`onerror` (self), the catch (no recorder built on the failing flight), and `reset`. In `reset` during 'recording', `streamRef` belongs to the recorder being discarded — correct target. Holds.

## Attack 2: Round-5 fix #2 — synchronous pauseWithFlush (CoachFreestyleOverlay.tsx:136–140)

**Attack trace A (the freeze scenario the fix targets):** `visibilitychange`→hidden fires natively. `pauseWithFlush` runs flush (→ `onPhrase` → `appendFragment`, session still 'listening' at that instant — the words land), `speech.stop()` (flush no-ops on already-cleared interim, `wantListening=false` synchronously, `teardown()` aborts the engine and clears any pending backoff timer), then `pause()` — all inside the native handler, zero React effect flushes required. The engine cannot be resurrected by a later `onend` because `wantListeningRef` is false *and* handlers are detached *and* the backoff timer is cleared. The round-5 hole (restart-after-freeze) is closed at every layer.

**Attack trace B (stale refs in native handlers):** `speechFlushRef`/`speechStopRef`/`pauseRef` are render-assigned, but all three wrapped callbacks are identity-stable for the session's lifetime (`flush` deps `[setInterimBoth]`; `stop` deps `[teardown, flush, setInterimBoth]`, all stable; `pause` deps `[]`). A native event firing between commits cannot observe a behaviorally different callback. Holds.

**Attack trace C (wrong-state invocation):** `pauseWithFlush` from hidden-while-paused / hidden-while-stopped / hidden-while-armed: `pause()` no-ops on non-'listening', `speech.stop()` no-ops on a dead engine, `flush()` no-ops on empty interim. No `InvalidStateError` path (nothing calls `rec.start()`/`speechStart` from these paths). Holds.

## Attack 3: Round-5 fix #3 — per-flight generation (useVoiceRecorder.ts:94, 126, 135, 179, 195, 206)

**Attack trace A (the round-5 hole itself):** start(flight 1) → stop-during-requesting (seq→2, latch set, settles idle) → start again (flight 3, latch cleared) → grant #1 lands: `flight !== flightSeqRef` → tracks stopped, and the `flight === flightSeqRef` state-touch guard is false → capture 2's 'requesting' is not clobbered. Grant #2 lands: builds normally. The overwritten-ref/stream-orphan failure is unreachable.

**Attack trace B (rejection clobber):** flight 1 rejected after flight 2 began: catch sees `flight !== flightSeqRef` → no error state, no cleanup → flight 2 untouched. Holds.

**Attack trace C (grant-order inversion):** two concurrent grants, newer resolves first and records; older arrives: flight mismatch → its tracks stopped, no state write. Holds.

**Attack trace D (latch + generation independence):** `stop()`/`reset()` always increment the sequence *and* set the latch; only `start()` clears either. The dead `setState('idle')` at line 142 is unreachable (cancelRequested-true with flight-current cannot be constructed), but dead code that cannot fire is not a finding.

---

## Candidates examined and excluded (the reachability bar)

1. **Stale `onstop` from a superseded recorder** (stop during 'recording' → immediate restart → old `onstop` commits 'stopped'+blob over the new flight's 'requesting'). The generation check exists only at grant arrival; a built recorder's `onstop` runs unconditionally. **Excluded:** requires start #2 to execute before the old recorder's `stop` event fires — a sub-~50ms double-action window; self-heals when grant #2 lands (flight matches, state returns to 'recording'); no mic strand, no data loss, and no in-packet consumer can act on the transient 'ready'. Same class as the fenced jsdom-unprovable interleaving, and below the concrete-failure bar.

2. **`useCoachCapture.start`'s catch (line 219) is dead** — `useVoiceRecorder.start` never rejects (internal catch swallows all failures). **Excluded:** no failure scenario; error surfacing works through state, and `isCapturingRef` is corrected by the mirror effect on the 'error' commit.

3. **Direct double-`start()` on `useVoiceRecorder`** (recorder #1 left recording while flight 2 requests; interleaved chunks; catch-path cleanup killing recorder #1). **Excluded:** the only in-packet caller is `useCoachCapture.start`, which guards `isCapturingRef` synchronously. Reachability requires an out-of-packet unguarded caller.

4. **`handleClose`/Escape during 'listening'** doesn't stop the engine synchronously (relies on the follow effect). **Excluded:** these are click paths — effects are guaranteed to run; the round-5 fix was scoped to freeze-capable native events, which all route through `pauseWithFlush`. Finals arriving in the commit window are not lost (they were already flushed as interim; the 'stopped' append guard prevents duplication).

5. **iPadOS 13+ desktop-UA** misses the iOS branch of `getSupportedMime` — falls through the desktop candidates to `audio/mp4`, which Safari supports. No wrong MIME is selected. **Excluded.**

6. **250ms post-close window where overlay buttons remain technically focusable** (visibility transition delayed) — every handler carries an `isOpen` guard; focus is restored to the opener synchronously at close. **Excluded:** no reachable action.

7. **Error-copy regex mapping transcription errors containing "denied"** to mic-permission copy — depends on `useGeminiTranscription` message strings, not in this packet. **Excluded:** unverifiable, speculative.

8. **1Hz tick continues re-rendering in 'stopped'/'error'** — frozen readouts, wasted renders only. Fenced-class (1Hz tick). **Excluded.**

Additionally re-verified with no regression: auto-start once-per-open vs TTL purge cycle (CoachFreestyleOverlay.tsx:106–113); follow-effect error gate vs retry-with-identical-error (168–170, 200–211); discard arming interrupts capture and the 10s auto-disarm focus restore (312–330); account-switch purge stamps and speech release (useFreestyleSession.ts:401–410 + follow effect); unmount paths release mic in both pipelines; `transcribe` in-flight keyed by blob identity with reset-safe `finally` (useCoachCapture.ts:246–256).

---

## FINDINGS

None.

**Count: 0.**

Round-5 condition met: both fixes verified against direct attack, no further reachable failure found. This is the first of the two consecutive zero rounds the loop requires.
