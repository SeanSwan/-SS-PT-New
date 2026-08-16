# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round3-packet.md
**Tokens:** 24802 in / 18630 out (reasoning: 17508) | total 43432
**Wall:** 281.0s

---

# HOSTILE REVIEW ROUND 3 — Verdict

I attacked all five round-2 fixes hard, plus a full re-read of both hooks, the overlay, and the styles. Four of the five fixes hold under attack. One does not — the retry path of fix 3 has a hole that produces the exact lie the fix exists to prevent.

**Fixes attacked and held:**
- **Fix 1 (start refuses from error-with-words):** Holds. The refusal guard (useFreestyleSession.ts:238-240) is read from `stateRef`/`fragmentsRef`, and the button is genuinely unrendered in that state, so `handleStart`'s unconditional `speechStart()` is unreachable from it. Verified no keyboard/Escape route reaches it either.
- **Fix 2 (fatal-error flush ordering):** Holds. `onerror` flushes before clearing the want-flag (useFreestyleSpeech.ts:239-246); `onend`'s later arrival is correctly gated by the now-false flag and flushes nothing stale. Denied-retry transitions `speech.error` null→DENIED (async arrival after a synchronous `start()` success), so it recovers honestly.
- **Fix 4 (all pause paths flush):** Holds. Gesture, `isOpen`-false, `visibilitychange`, and `pagehide` all route through `pauseWithFlush`, which flushes while the session is still `'listening'` so the fragment lands before `pause()` closes the gate.
- **Fix 5 (focus restore on disarm):** Holds. `isOpenRef` is updated during render, so the cleanup of the confirm-focus effect correctly skips when `handleDiscard` batches `discard()`+`onClose()` into one commit.

**Fix 3 does not hold on its retry path:**

---

**FINDING [HIGH]: Gesture retry of a persistent speech error latches the session into fake 'listening' — UI says "Listening. Talk as long as you need" over an engine that can never start**

**Evidence:** CoachFreestyleOverlay.tsx:188-190 (failure bridge keyed solely on `speech.error`), CoachFreestyleOverlay.tsx:211-214 (`handleStart` commits the session to `'listening'` unconditionally, then calls `speechStart()`), useFreestyleSpeech.ts:301-302 (`!supported` → `setError(FREESTYLE_SPEECH_UNSUPPORTED_COPY)`), useFreestyleSpeech.ts:291-297 (non-InvalidState start throw → `setError(FREESTYLE_SPEECH_START_FAILED_COPY)`)

**Why:** Concrete deterministic scenario, Firefox (no `SpeechRecognition`): (1) overlay auto-starts; `speech.start()` hits the `!supported` branch, `speech.error` goes null→UNSUPPORTED — the bridge fires, `fail()` runs, the surface honestly shows the error. So far so good. (2) User taps "Start talking" (rendered because fragments === 0). `handleStart` calls `session.start()` — legal from error-without-words — which clears the session's error and sets state `'listening'`. Then `speechStart()` fails identically: `setError` is called with the *same string* it already holds, so `Object.is` on the dep means the bridge effect at line 188 **never re-runs**. Result: session state `'listening'`, `speech.error` still set, engine never started. The follow effect's `!speech.error` gate correctly prevents a restart — but nothing fails the session. `session.error` was nulled by `start()`, so StatusLine falls through to the `isListening` branch: *"Listening. Talk as long as you need — no record is created until you review it."* over a breathing orb, on a browser that cannot listen. Every word is lost, the lie is permanent until the user gives up and taps Done (yielding a 0-word snapshot). The same latch occurs whenever a start failure recurs with an identical error string (persistent `START_FAILED` — whose copy literally instructs "Tap Start talking to try again", making this the designed recovery path). This is precisely the failure mode the file's own comments call out as unacceptable ("asserting `listening` over it made the UI say 'Talk as long as you need' to a mic that never opened") — the round-2 fixes closed it for the *first* failure and for the engine-follow restart, but the session-failure bridge only re-evaluates when `speech.error` *changes*, and an identical retry failure never changes it. Not fenced: R4's fence covers the initial non-gesture auto-start and says the retry path is honest now — it isn't.

**Fix:** Re-evaluate the bridge when the session re-enters capture, not only when the error string changes: key the effect on `[speech.error, state]` (its `fail()` call already no-ops from non-listening/paused states, so this is safe for the denied-recovery flow, where `startEngine` clears the error synchronously inside the same gesture before effects commit). Additionally, gate `handleStart` on `speech.supported` (or have `speech.start()` return a synchronous failure) so an unsupported browser cannot commit the session to `'listening'` at all.

---

**Count: 1 finding.**
