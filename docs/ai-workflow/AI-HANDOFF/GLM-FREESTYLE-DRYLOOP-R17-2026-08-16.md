# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round17-packet.md
**Tokens:** 32055 in / 20427 out (reasoning: 19163) | total 52482
**Wall:** 391.1s

---

# HOSTILE REVIEW ROUND 17 — Verification & Re-sweep

## Part 1: Round-16 prescription — verified verbatim

**1a. `start()`/`resume()` return the transition.**
- `useFreestyleSession.ts:279–301` — `start(): boolean`; refuses on ownership mismatch (280), non-idle/error states (291), error-with-words (292); returns `true` only after `stateRef.current = 'listening'` commits (298–300).
- `useFreestyleSession.ts:326–338` — `resume(): boolean`; refuses on mismatch (327), expiry via `purgeExpired()` (332), non-paused (333); returns `true` only on a real paused→listening transition.

**1b. BOTH gesture handlers gate `speechStart()` on the boolean.**
- `CoachFreestyleOverlay.tsx:280` — `if (start()) speechStart();`
- `CoachFreestyleOverlay.tsx:289` — `if (resume()) speechStart();`

**Invariant closure check — every path that can start the engine:** exhaustive enumeration of `speechStart`/`speech.start` call sites: (a) handleStart, (b) handleResume, (c) the follow effect (`CoachFreestyleOverlay.tsx:196`), which requires `state === 'listening'` — a state reachable *only* through a `true` return from `start()`/`resume()`. The auto-start effect (`:111`) calls `start()` and ignores the boolean, but if it returned false the state is not `'listening'` and the follow effect cannot fire the engine. No fourth call site exists. The synchronous invariant holds on every gesture path and every effect path.

**1c. `appendFragment` dep array carries `purgeExpired`.**
- `useFreestyleSession.ts:468` — `}, [purgeExpired]);`
- Identity chain verified end-to-end: `ttlMs` prop change → new `effectiveTtlMs` (162–163) → new `isExpired` (264) → new `purgeExpired` (276) → new `appendFragment`; the speech hook re-binds via `onPhraseRef.current = onPhrase` every render (`useFreestyleSpeech.ts:148–149`), so a mid-session ttl tightening reaches the append path with no commit lag. Same chain reaches `resume` (338) and `stop` (366).

Prescription implemented verbatim, no regressions introduced by it.

## Part 2: Re-sweep — candidates attacked and rejected

I went looking for round-17 material in the following places; each candidate died on reachability or on the evidence:

1. **`handleResume` lacks the `speech.supported` gate that `handleStart` has (`:276` vs `:284–290`).** Proven unreachable: a `'paused'` session requires `pause()` from `'listening'`, and on an unsupported browser the first auto-start sets `speech.error` synchronously in the follow effect, which the bridge effect (`:238–239`) immediately fails to `'error'` — and any transition *to* paused with `speech.error` set re-triggers the bridge, whose `fail()` accepts `'paused'`. A paused session therefore implies the engine ran at least once, which implies supported. No engine, no mic, no data path — furniture inconsistency only, unreachable.
2. **Dead `'discarded'` state** (union member at `useFreestyleSession.ts:48`, copy branch at `CoachFreestyleOverlay.tsx:488`) — `discard()` settles to `'idle'` (419). Unreachable code, no behavior.
3. **Render-time `stateRef.current = state` mirror reverting a synchronous ref write** (`useVoiceRecorder.ts:105`, `useFreestyleSession.ts:230`) — requires a torn/discarded committed render with a stale snapshot; no transitions, suspense, or deferred values in this tree; the sync-write-first pattern is the round-6 fix and no concrete failing interleaving exists here.
4. **Stale transcription resolution after `reset()` mutating state for the next capture** (`useCoachCapture.ts:276–278` nulls the guard but the underlying promise persists) — depends on `useGeminiTranscription` internals not in the packet; the reset semantics were litigated in round 4 and upload-abort territory is fenced. Unprovable from evidence; not reported.
5. **Unmount ordering, RECORD pipeline** — recorder's primitive cleanup (registration order) vs `useCoachCapture`'s `stopInternal('auto-unmount')`: the auto-stop copy is set via setState on an unmounting component and never paints, so no false "audio still on this device" promise is ever shown; where the component survives (visibilitychange), the blob genuinely exists.
6. **Freestyle unmount flush ordering** — overlay's layout-phase engine kill (`:177`) flushes while the session is still `'listening'`; the session's passive unmount purge (`useFreestyleSession.ts:526`) runs after and receipts the just-landed fragment as `'unmount'`. Layout-before-passive makes the receipt honest.
7. **Engine restart vs. session gate, backoff timer vs. `stop()`, expiry-during-interim, masked-view leakage into `speech.interim`, focus lifecycle, Escape chain, TTL-at-boundary (`>=`), double-flight getUserMedia, iPadOS UA in `getSupportedMime`** — all traced to existing guards (generation counter, `wantListening` gating, mask consumption at `:424`, teardown clearing `restartTimerRef`, `'audio/mp4'` reachable via the desktop list on Safari).

## Findings

FINDINGS: **0**

Round-16 stands as implemented. This reviewer's round-17 sweep is empty; per the remit, a zero requires both reviewers empty to count.
