# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round7-packet.md
**Tokens:** 29216 in / 15458 out (reasoning: 14121) | total 44674
**Wall:** 263.0s

---

# HOSTILE REVIEW ROUND 7 — ATTACK REPORT

## Part 1: Attacking the round-6 fix directly

The fix routes every transition through `setRecState` (useVoiceRecorder.ts:107-110), which writes `stateRef.current` before the first `await`. I tried to break it five ways:

**Attack 1 — same-tick stop at the recorder level.** `start()` writes `stateRef.current = 'requesting'` synchronously at line 144, before `await getUserMedia` (146). A `stop()` in the same tick reads 'requesting' at line 212 and settles to idle. Grant lands later: flight invalidated at 207, tracks released at 153, state untouched (`flight === flightSeqRef.current` is false at 154). Holds.

**Attack 2 — same-tick stop at the capture level.** `useCoachCapture.start()` (useCoachCapture.ts:199-223) calls `recorderStartRef.current()`, whose first synchronous act is the `setRecState('requesting')`. A `pagehide` in the same tick runs `stopInternal` → recorder `stop()` → same settlement. The mirror effect (131) then returns early on `stopRequestedRef` — no resurrection of `isCapturingRef`. The late-arrival guard (165) never fires because the invalidated flight can never reach 'recording'. Holds.

**Attack 3 — render-time clobber (`stateRef.current = state`, line 105).** A render with stale `state` assigning over a newer synchronous write requires a discarded/replayed concurrent render (transition, Suspense, `useDeferredValue`). This subtree has none; all updates are default-priority event/effect updates where the committed render carries the final batched value. Under StrictMode double-render the assignment is idempotent. Not reachable in this code.

**Attack 4 — un-routed transitions.** I grepped every `setState` of recorder state: all eight transitions (144, 154, 171, 177, 183, 193, 212, 220) route through `setRecState` or pair the ref write manually. None missed.

**Attack 5 — double stop / stop-after-stop.** Second `stop()` after settlement: `stateRef` is 'idle', guard at 212 refuses, 'stopped'+blob survives (211). Stop during onerror-settled 'error': same refusal. Holds.

The fix does what it claims, and its blast radius (three call sites reading `stateRef`: 154, 191, 212) is internally consistent.

## Part 2: Re-sweep — strongest candidates killed, and why

- **Old flight's late `onstop` interleaving a fresh `start()`** (blob/state resurrection across flights, useVoiceRecorder.ts:168-173): requires `onstop` delayed past a user re-tap; `MediaRecorder` dispatches it in the stop task. This is the sub-50ms superseded-recorder transient — **fenced** (GLM R6, on the record).
- **Late-arrival guard (useCoachCapture.ts:164-168) is now nearly dead code** — with the flight invalidation, no reachable path reaches 'recording' with `stopRequestedRef` set. **Fenced** (dead defensive code).
- **Concurrent-render `fragmentsRef`/`stateRef` tearing in useFreestyleSession** (185, 197-198): same argument as Attack 3; no concurrent features present. Not reachable.
- **iOS mime fallback mismatch** (useVoiceRecorder.ts:50, empty-string mime → blob typed `audio/webm` at 169 while the container is mp4): requires an iOS UA where `MediaRecorder` exists but `isTypeSupported('audio/mp4')` is false — old iOS lacks `MediaRecorder` entirely (constructor throw → handled error path at 189-196). Contrived; no concrete failing browser exists.
- **Unreachable `'discarded'` state** (useFreestyleSession.ts:48, StatusLine branch at CoachFreestyleOverlay.tsx431): dead enum value documented as copy-table completeness (A3). No runtime failure.
- **Fresh-recording clobber via the error bridge** (CoachFreestyleOverlay.tsx:200-211): traced handleStart → session 'listening' + engine start in one batched event; committed render has `speech.error` nulled (or set, in which case failing is correct). The `[speech.error, state]` dual-key covers the identical-error-string retry. Holds.
- **Pause accounting through requestDiscard → Keep it → Resume** (useFreestyleSession.ts:302-317, 318-321): `pausedAtRef` set at arm time, `settlePause` folds it at resume; elapsed excludes the decision window correctly. Holds.
- **Stop-from-error elapsed freeze** (useFreestyleSession.ts:278): `stoppedAtRef` set by `fail()` excludes the post-failure wait. Holds.
- **Focus lifecycle on close-vs-disarm** (CoachFreestyleOverlay.tsx:318-329): `isOpenRef` guard correctly defers to the opener-restore cleanup when the whole overlay closes. Holds.
- **Styles cascade**: every `color-mix()` surface carries the plain-fallback-first pattern (styles.ts:45-46, 75-76, 124-127, 205-210, 216-219, 263-265); visibility-hidden closes the a11y tree (57); reduced-motion covers the orb. Holds.
- Remaining near-misses (1Hz tick, mirror-effect freeze interleaving, auto-start gesture, LivePhrase tail, transcribe gate location, AbortController, out-of-packet recorder callers) map one-to-one onto the **fenced list** — not re-reported.

## Verdict

Six rounds stripped this layer to bone, and the round-6 fix is correctly scoped: synchronous-before-await ref writes, all transitions routed, no un-routed stragglers, and no reachable interleaving that defeats it. Every candidate I could construct this round either dies on reachability, duplicates a fence, or requires browser/React behavior this codebase cannot produce.

**Findings: 0**
