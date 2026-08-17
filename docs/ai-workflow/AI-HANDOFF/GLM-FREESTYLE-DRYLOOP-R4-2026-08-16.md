# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round4-packet.md
**Tokens:** 25443 in / 27272 out (reasoning: 25754) | total 52715
**Wall:** 413.0s

---

# HOSTILE REVIEW ROUND 4

Round-3 fixes were attacked first: handleResume/handleStart gesture + isOpen guards hold (no reachable path to an engine start while hidden — the follow effect's `!speech.error` gate can't be tripped from 'paused' with a live error, because the bridge fails the session out of 'paused' first); requestDiscard's pause-while-armed holds (flush-then-pause ordering is correct in every caller, engine released via the follow effect, 10s disarm leaves a safe 'paused'); the `[speech.error, state]` bridge keying holds (identical-error retries re-enter 'listening' and re-fail; fail() no-ops outside listening/paused so the healthy path is clean). The three findings below are residual defects, not restatements.

---

**FINDING [MEDIUM]: Late-arrival mic hole survives unmount — the guard that closes it is a component effect, and unmount destroys it**
/ Evidence: useCoachCapture.ts:164-168 (guard is an effect with no surviving cleanup), useCoachCapture.ts:192-196 (unmount cleanup), useCoachCapture.ts:96-101 (file's own assertion that a grant after stop-during-`requesting` still transitions the recorder to `recording`) /
Why: The latch + late-arrival guard exist precisely because `recorder.stop()` during `requesting` cannot cancel the in-flight `getUserMedia` — the recorder goes to `recording` anyway and only the mounted guard effect stops it. On unmount, `stopInternal('auto-unmount')` runs (or early-returns if `pagehide` already latched), calls the same ineffective `stop()`, and then the guard effect is destroyed. If the user then clicks "Allow" on the still-pending prompt, the recorder transitions to `recording` with **no owner, no listener, and no release path until tab close**. The header's claim that unmount "is the ONLY release path" is false exactly at this boundary.
Failure scenario: desktop Chrome/Firefox, first-ever grant: tap Record → permission bubble appears (`requesting`) → user navigates in-app (SPA route change; the omnibox prompt persists, page stays interactive) → unmount cleanup runs, latch set, `stop()` ineffective → user clicks Allow → microphone goes live on an unmounted surface. (Mobile system prompts block page interaction, so this is desktop-first-grant reachable — narrow, but it is the exact hole the hook advertises closing.) /
Fix: The in-file guard cannot observe a post-unmount transition; the recorder must honor cancellation — set a cancelled flag inside `useVoiceRecorder.start()` when `stop()` is called during `requesting`, and stop tracks immediately when `getUserMedia` resolves late (or expose the AbortController the header already names as missing).

**FINDING [MEDIUM]: `transcribeInFlightRef` survives `reset()` and `start()` — a new capture inherits the previous (possibly discarded) capture's pending promise**
/ Evidence: useCoachCapture.ts:233-243 (guard returns any pending promise unconditionally), useCoachCapture.ts:245-258 (`reset` clears recorder/transcription/state but not the flight ref), useCoachCapture.ts:199-220 (`start` likewise) /
Why: The in-flight guard is keyed to nothing — it returns whatever promise is pending regardless of which capture spawned it. `reset()` clears every other piece of transcription state but leaves the ref armed, and the guard's only escape (`finally`) waits for the *old* upload to settle.
Failure scenario: long capture A → tap transcribe (upload in flight; 20-40s on gym wifi) → user resets/discards A, records B → taps transcribe → returns **A's** pending promise. The caller awaits A's transcript attributed to B's capture; B's audio is never transcribed; and A's audio — discarded by the user — completes its upload anyway, i.e., PII-dense audio leaves the device *after* an explicit discard, which the retention posture in this file's own header treats as unacceptable. Same inheritance via `start()` without `reset()`. /
Fix: Null `transcribeInFlightRef.current` in `reset()` and `start()`, and capture the originating blob (or a capture id) alongside the promise so the guard only shares a flight that belongs to the current `audioBlob`.

**FINDING [LOW]: Fatal-error copy instructs "tap Start talking," a control that is deliberately not rendered in the only state where that copy appears with words**
/ Evidence: useFreestyleSpeech.ts:92-93 (`MIC_LOST` copy: "…then tap Start talking"), useFreestyleSpeech.ts:89-90 (`START_FAILED`: "Tap Start talking to try again"), CoachFreestyleOverlay.tsx:475-476 (Start row suppressed when `state === 'error' && fragments.length > 0`), CoachFreestyleOverlay.tsx:443-459 (only Done/Discard rendered there) /
Why: Two ratified decisions from different rounds now contradict: the overlay hides Start in error-with-words (correct — `session.start()` refuses there to protect captured words), but the error strings written for the speech hook name that button as the recovery action. This file family's own standard ("'Saved'/'sent' claims must match what the code does", useCoachCapture.ts:71-76) makes instruction-to-absent-control a defect, not a nit.
Failure scenario: Bluetooth headset disconnects three minutes into dictation → `audio-capture` fatal → session `error` with 137 words → screen reads "The microphone was disconnected. Check your mic or headset, then tap Start talking." → controls are Done and Discard only. The instructed action is impossible; the only real paths either freeze the truncated session or destroy it. Same mismatch when a failed Resume sets `START_FAILED` over retained words. /
Fix: Branch the copy on fragment presence ("…then finish and review, or discard this session"), or stop naming the control in the strings the hook exports. A true mid-session retry-after-replug would need a resume-without-wipe path — larger, S4-adjacent — but the copy must not promise it today.

---

Cleared after adversarial sweep (no findings): session clock/pause accounting across stop/fail/resume/discard-arm interleavings; snapshot built-from-refs at every flush boundary; purge receipts (no empty-wipe or mislabeled-reason path found); account-switch/logout purge incl. `String()` normalization; engine restart backoff incl. timer cleared by `stop()`; onresult `resultIndex` de-dup; bridge double-fire safety; focus lifecycle incl. the close-vs-disarm focus race (isOpenRef check holds); tab trap and Escape paths in every rendered control set; `color-mix` fallback cascade; the 250ms fade-out focus window (all destructive gesture handlers are `isOpen`-guarded — the round-3 fix covers it).

**Count: 3 findings (2 MEDIUM, 1 LOW).** Not a zero round — the two useCoachCapture residuals are real holes in that hook's own advertised guarantees; the loop continues.
