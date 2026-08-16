# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round2-packet.md
**Tokens:** 24113 in / 21367 out (reasoning: 19617) | total 45480
**Wall:** 335.1s

---

# HOSTILE REVIEW ROUND 2 — Verdict

Round-1 fixes attacked first. The following **held** under adversarial tracing and are not re-litigated: the stop-latch/late-arrival-guard ordering (verified through the requesting→recording race, including stop-during-prompt then deny, and prompt-resolves-after-hide); backoff timer cleared by `teardown()` on every stop path; quick-death pacing math and reset-on-result; TTL `>=` + wake recheck incl. stopped/paused/error states; receipt gating on `hadData` incl. StrictMode replay; frozen owner-stamped snapshot; discard disarm timer lifecycle; focus-in/restore/Tab-cycle while armed; the `min()` landscape diff; color-mix plain-first cascade. Four new findings.

---

**FINDING [MEDIUM]: Hide-path pause drops the pending interim — the flush fix covers taps, not screen-lock / tab-hide / parent-close**
Evidence: CoachFreestyleOverlay.tsx:149-160 (visibility/pagehide handler calls `pauseRef.current()` with no flush), CoachFreestyleOverlay.tsx:120-122 (`isOpen` false → `pause()`, same omission); mechanism: useFreestyleSpeech.ts:289-298 (`stop()` flushes via `onPhrase`), useFreestyleSession.ts:357 (`appendFragment` refuses non-`listening`).
Why: `handlePause` (line 184-187) established the contract: flush *while still `listening`*, then pause. Every other pause path inverts it. Trace: tab hides → `pause()` sets `stateRef.current = 'paused'` synchronously → re-render → engine-follow effect (line 133-138) → `speechStop()` → `wantListeningRef` is still true → `flush()` → `onPhrase(pending)` → `appendFragment` → **dropped by the guard**. Same for `pagehide` and for a parent toggling `isOpen=false` without going through `handleClose`. This is exactly the loss class round 1 closed — "the words I said as I tapped the button" — reopened for "the words I said as I locked the phone," which is the *most likely* moment a sentence is mid-flight. The comment at useFreestyleSession.ts:354-356 says paused-window finals are "the SURFACE's responsibility" and points at this file; the surface honours it in one of three pause sites.
Fix: hold `speech.flush` in a ref beside `pauseRef` and call `flush(); pause();` in the hide handler; apply the same order in the `isOpen`-false effect. (Do **not** flush in `handleClose`-adjacent paths — `reset`/`discard` legitimately destroy pending interim.)

**FINDING [MEDIUM]: Mid-session mic death (`audio-capture`) never reaches `fail()` — the "Still listening" lie survives the round-1 fix**
Evidence: useFreestyleSpeech.ts:216-226 (`onerror` handles only `not-allowed`/`service-not-allowed`; everything else falls through with no comment covering `audio-capture`), restart loop at 242-254; narration at CoachFreestyleOverlay.tsx:327-328; fail wiring at 170-172.
Why: unplug a USB mic / let a Bluetooth headset die mid-dictation. Chrome fires `onerror('audio-capture')` → swallowed → `onend` → restart. Each restart succeeds at `start()` (permission intact) and dies instantly → backoff caps at 15s → **infinite retry loop, `speech.error` never set** → `fail()` never fires → session stays `listening` and the StatusLine narrates "Still listening. Nothing heard for 47s" over a microphone that will never return — the precise dishonesty the `fail()` path was built to eliminate (its own comment, useFreestyleSession.ts:336-339). `no-speech`/`aborted` silence is correct; `audio-capture` is not: it means no input device exists, and no restart fixes that. (`network` is defensibly retried — flaky gym wifi recovers — but `audio-capture` is terminal until human action.)
Fix: in `onerror`, treat `audio-capture` as fatal: `wantListeningRef.current = false; setListening(false); setError(mic-disconnect copy)` — the existing `speech.error → fail()` wiring then does the rest, and the buffer-retention semantics of `fail()` apply.

**FINDING [MEDIUM]: `start()` over a failed session single-tap-destroys the retained words and receipts it as `'discard'`**
Evidence: useFreestyleSession.ts:237-240 (`if (fragmentsRef.current.length > 0) clearBuffer('discard')` on the start path), contradicting the API's own rule at line 135 ("`reason` is receipted verbatim; do not collapse everything into 'discard'") and the retention intent of `fail()` at 340-348.
Why: `fail()` keeps the buffer specifically so "five minutes of heard words survive the mic dying." In `error` with fragments, the overlay renders **both** Done and "Start talking" (CoachFreestyleOverlay.tsx:367-371, 393-399). The trainer who means "retry the mic" but taps Start has destroyed those five minutes with one tap — no two-step, even though the two-step exists (line 295-299) precisely because "a single mis-tap must not destroy [work] that cannot be recovered." The audit then records a **discard that never happened**: the user performed a start, not a discard, and the retention log — which round 1 fixed to stop being fiction — logs fiction again. The in-code comment acknowledges the receipt fires but not that the reason is wrong or that the confirm was bypassed.
Fix: either (a) mint a distinct reason (e.g. `'restart-superseded'`) and keep it single-tap, or (b) treat start-from-error-with-fragments as requiring the same two-step as discard. Minimum: stop receipting a start-induced wipe as `'discard'`.

**FINDING [LOW]: 10s auto-disarm of the discard confirm strands focus on `<body>` inside the open modal**
Evidence: useFreestyleSession.ts:312-315 (timer sets `discardPending=false`), CoachFreestyleOverlay.tsx:236-242 (focus effect only runs on arm, never on disarm), 339-352 (confirm unmounts with the focused "Keep it"/"Discard" button inside it).
Why: arm via Escape → focus lands on "Keep it" (correct). Let the 10s disarm expire: the confirm row unmounts, the focused element is removed, focus falls to `document.body`. The modal is still open, but the keyboard/SR user is outside it until the next Tab, when the trap's outside-root branch rescues them. The round-1 focus lifecycle handles open, cycle, arm, and close — disarm is the one transition that drops focus.
Fix: in the arm effect's cleanup (or a matching `discardPending → false` transition), if the confirm is unmounting while `isOpen`, restore focus to the first control in the main `ControlRow`.

---

**New findings: 4** (2× MEDIUM data/narrative integrity, 1× MEDIUM destructive-path + audit mislabel, 1× LOW a11y).

Not reported, for the record: the 1Hz interval running in `stopped`/`paused`/`error` is load-bearing (TTL enforcement in the foreground tab), so the redundant `setTick` there is waste, not a defect; the `flush()`-while-listening duplication hazard in `useFreestyleSpeech` is latent only — no current caller flushes without stopping; the `start()`-during-latched-`requesting` window in `useCoachCapture` depends on `useVoiceRecorder` internals not in this packet and the observable outcome matches user intent, so it does not meet the evidence bar. The loop continues — one more empty round after fixes closes it.
