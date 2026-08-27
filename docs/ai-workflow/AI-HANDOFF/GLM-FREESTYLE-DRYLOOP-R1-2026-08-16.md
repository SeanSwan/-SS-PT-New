# GLM Consult

**Model:** glm-5.3
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/48467224-73ba-4b82-84d9-97070a08692a/scratchpad/review-round1-packet.md
**Tokens:** 25168 in / 24957 out (reasoning: 21254) | total 50125
**Wall:** 364.3s

---

# HOSTILE REVIEW ROUND 1 — Findings

## NEW FINDINGS

---

**FINDING [HIGH]: Closed overlay keeps invisible, keyboard-operable controls — an invisible "Resume"/"Start talking" press takes the microphone live behind closed UI**
/ Evidence: `CoachFreestyleOverlay.styles.ts:41-42` (closed state is `opacity: 0; pointer-events: none` — nothing else); `CoachFreestyleOverlay.tsx:183-287` (the entire tree, including all buttons, renders unconditionally); `:279-285` ("Start talking" rendered whenever state is idle, regardless of `isOpen`); `:247-251` ("Resume" rendered whenever paused); `:121-126` (engine-follow effect depends only on `[state, speechStart, speechStop]` — nothing gates it on `isOpen`)
/ Why: `pointer-events: none` blocks the mouse; it does not remove buttons from the tab order, and `opacity: 0` does not remove them from the accessibility tree. There is no `visibility: hidden`, no `inert`, no `aria-hidden`, no conditional render. The component is designed to stay mounted with `isOpen` false (its own comment at `:105-112` describes exactly that state, left `paused`). Trace the chain: keyboard user tabs into the invisible overlay → focuses invisible **Resume** (or **Start talking** if idle) → Enter → `state === 'listening'` → the follow effect at `:121-126` fires `speechStart()` with no `isOpen` check → recogniser goes live, mic indicator on, audio streaming (to Google on Chrome) — behind invisible UI. Invisible **Discard** (`:265-268`) similarly destroys a session with zero visual feedback. This is precisely the hot-mic class the overlay's own comment (`:105-112`) and the entire `useCoachCapture` rationale (`useCoachCapture.ts:23-28`) exist to close. Where is the code that enforces "hiding the overlay leaves nothing running"? Nowhere — the pause-on-close effect (`:110-112`) only handles the transition *out* of listening; it does nothing about re-entry while hidden.
/ Fix: When `!isOpen`, either unmount the interactive subtree or apply `visibility: hidden` + `inert` + `aria-hidden="true"` to `FreestyleOverlay`; additionally gate the engine-follow effect on `isOpen` so no state change can start the engine while closed.

---

**FINDING [MED]: RECORD pipeline: "Nothing was saved." while the blob is retained, `transcribe()` remains callable, and the never-transcribe-after-auto-stop rule is enforced in one consumer instead of the hook**
/ Evidence: `useCoachCapture.ts:71-72` (`CAPTURE_AUTO_STOPPED_COPY = '...Nothing was saved.'`); `:64-65` (`dismissNotice` "Clears an auto-stop notice **without discarding a usable capture**" — so the blob deliberately survives the notice); `:216-220` (`transcribe()` has no `stoppedAutomatically` guard); enforcement lives only in `VoiceRecordingOverlay.tsx` (diff): `if (capture.status === 'ready' && !capture.stoppedAutomatically) { void capture.transcribe(); }`
/ Why: The hook's own test file states the team's interpretation — "shipping their audio off to be transcribed anyway would contradict the 'Nothing was saved' notice" (`VoiceRecordingOverlay.hotMic.test.tsx`, test 5 comment) — yet the hook that *owns* the copy also owns an API that violates it. Any second consumer of `useCoachCapture` (freestyle will need both pipelines per the header, `useCoachCapture.ts:17-21`) can call `transcribe()` on auto-stopped audio and nothing stops them. Meanwhile the auto-stopped blob has no TTL, no purge on notice-dismiss, no purge on tab-return: on a shared gym tablet it sits in memory until the next `start()`/`reset()`/unmount. Also note `transcribe()` has no in-flight guard — a double call is a double upload. Same enforcement-location smell twice.
/ Fix: Decide the property and enforce it in the hook: either clear `audioBlob` on auto-stop (making the copy true) or block `transcribe()` while `stoppedAutomatically` (making the copy false and rewriting it). Add an in-flight guard to `transcribe`.

---

**FINDING [MED]: Retention audit is unenforced end-to-end — the only surface never wires `onPurge`, and `start()` wipes a buffer while bypassing `clearBuffer` (no receipt, duplicated logic)**
/ Evidence: `useFreestyleSession.ts:80-81` (`onPurge` documented as "For audit/receipts"); `CoachFreestyleOverlay.tsx:73` (`useFreestyleSession({ accountKey })` — no `onPurge`, ever); `:162-174` (`start()` resets `startedAtRef`/`pausedTotalRef`/`pausedAtRef`/`lastFragmentAtRef`/`stoppedAtRef`/`nextIdRef` and `setFragments([])` by hand — this is `clearBuffer`'s body minus `onPurgeRef.current?.(reason)` at `:151-160`); `:241-243` (comment: "Every close used to be logged as a discard, which made the retention audit fiction")
/ Why: The hook's doctrine says every purge must be receipted with its true reason, and the code comment explicitly calls unaudited wipes "fiction." Yet (a) the only mounted consumer passes no `onPurge`, so *every* purge today — discard, TTL, account-switch, unmount — is unreceipted; (b) `start()` destroys any existing buffer with no receipt at all, so the audit can never see it, and the duplicated reset logic in `start()` will drift from `clearBuffer` the next time a field is added. Where is the code that enforces "every buffer destruction is receipted"? Nowhere.
/ Fix: Wire `onPurge` in the overlay (at minimum to telemetry/logging). Route `start()`'s wipe through `clearBuffer('discard')` (or a dedicated reason) so there is exactly one destruction path.

---

**FINDING [MED]: Pause boundary silently drops finalized phrases — words spoken *before* the Pause tap are lost forever**
/ Evidence: `useFreestyleSession.ts:229-231` (`appendFragment` drops any fragment when `stateRef.current !== 'listening'`); `CoachFreestyleOverlay.tsx:121-126` (the engine is only stopped *after* the `state` commit, by the follow effect); `useFreestyleSpeech.ts:160` (`onPhrase` delivers finals asynchronously from `onresult`)
/ Why: `pause()` flips `stateRef` synchronously (`useFreestyleSession.ts:179`), but the recogniser keeps running until the next commit runs `speechStop()`. Any final result delivered inside that window — speech the user completed *before* tapping Pause, mid-sentence — is dropped by the `!== 'listening'` guard with no notice, no buffer, no merge on resume. The code comment justifies the guard as "not silently reopening a session the user believes is closed" (`:229-230`), but that premise is wrong for **paused**: paused means "I will resume," not "closed." This is distinct from known R1 (interim loss at `onend`): this is *finalized* text destroyed by a session-level guard. It also contradicts the surface's stated ethos, "never lose the session to a mis-tap" (`CoachFreestyleOverlay.tsx:12-14`).
/ Fix: On pause, stash late finals (or flush the engine's pending results before accepting the transition) and merge them on `resume()`; keep the drop only for genuinely terminal states.

---

**FINDING [MED]: The single "polite" live region announces a mutating counter every second — screen-reader flooding the code explicitly claims to prevent**
/ Evidence: `CoachFreestyleOverlay.tsx:215-222` (`StatusLine role="status" aria-live="polite"` containing `` `Still listening. Nothing heard for ${quietFor}s.` ``); `:169-170` (`quietFor` recomputed from `sinceLastFragmentMs`, which advances every tick); `useFreestyleSession.ts:274` (`setTick(t => t + 1)` every 1000ms while non-idle); `:211-214` (comment: "Announcing every fragment would make a screen reader unusable during dictation")
/ Why: Once `isQuiet` is true, the live region's text content changes once per second (`4s` → `5s` → `6s`…), and a polite live region re-announces on every content change. The design intent — one calm status announcement — has no enforcement; the churn was simply moved from fragments into a counter. This fires exactly when the user has gone quiet, i.e., when a screen-reader user is most likely mid-thought.
/ Fix: Keep numeric churn out of the live region: announce the *transition* to quiet once (static string, `aria-atomic="true"`, or a debounced region), and render the running seconds counter in a separate non-live element.

---

**FINDING [LOW]: Overlay comment asserts "Freestyle listens ON-DEVICE" — privacy overstatement the hook explicitly forbids**
/ Evidence: `CoachFreestyleOverlay.tsx:76-79` ("Freestyle listens ON-DEVICE. It deliberately does not use the RECORD pipeline, which uploads audio to a server-side model"); vs. `useFreestyleSpeech.ts:19-29` ("IT DOES NOT SATISFY 'ZERO PII TO MODELS', AND MUST NOT BE DESCRIBED AS IF IT DOES… this path is a TRANSPORT IMPROVEMENT, not a privacy guarantee")
/ Why: Per review remit, overstatement is reportable even with the transport hole itself fenced. The hook's header is exemplary; the consuming file's comment then commits exactly the sin the hook forbids — and comments are where the next developer learns the contract. On Chrome this sentence is false. No user-facing copy currently overstates (the StatusLine's "no record is created until you review it" is about records, and is accurate), which is why this is LOW — but it is rot planted one layer from the truth.
/ Fix: Rewrite the comment to mirror the hook's caveat ("uses the Web Speech API rather than our upload path; on Chrome this still reaches a cloud recogniser — see useFreestyleSpeech header").

---

**FINDING [LOW]: Multiple final results concatenated without separator — possible word-merge in stored fragments**
/ Evidence: `useFreestyleSpeech.ts:153-158` — `finalText += chunk` inside the per-event loop, then `:160` `onPhrase(finalText.trim())`
/ Why: One `onresult` event can carry several final results; joining their transcripts with no space can concatenate the last word of one result to the first word of the next ("press twomore" class of corruption). Chrome finals usually carry a trailing space, but that is not guaranteed cross-browser (Safari in particular), and the fragment is then frozen verbatim into the buffer and the snapshot.
/ Fix: `finalText += (finalText ? ' ' : '') + chunk` — or collect chunks and `.join(' ')`.

---

**FINDING [LOW]: Messaging landscape fix reintroduces the overflow it exists to remove — the comment documents the failure, then ships it**
/ Evidence: `MessagingStyles.ts` (diff, `MessagingContainer` `@media (max-width: 768px)`): `height: calc(100dvh - 210px); min-height: 240px;` with the comment "240px … still leaves a usable strip in landscape, where 100dvh-210px is ~165px"
/ Why: If the computed height in landscape is ~165px, `min-height: 240px` forces the container to 240px inside a ~165px region — 75px of overflow, composer pushed below the fold, the identical bug the change cites as its motivation. The comment concedes the number and does the arithmetic wrong anyway.
/ Fix: `min-height: min(240px, calc(100dvh - 210px))`, or drop the floor in landscape orientation.

---

## KNOWN OPEN FINDINGS — characterization check

**S2 — CORRECT, and can be strengthened.** Evidence holds: `CoachFreestyleOverlay.tsx:128-136` hands a frozen copy out; `useFreestyleSession.ts:151-160` (`clearBuffer`) can only touch the hook's own state, so every purge trigger (discard, switch, TTL, unmount) leaves the parent copy intact. Strengthening: once `stopped`, **Escape re-arms discard** (`:152-158`) — the two-step confirmation now guards data that has *already left*. The confirm/discard ritual is theatre for a handed-off snapshot; the snapshot also carries no `accountKey`, so nothing binds it to the account whose PII it holds.

**S7 — CORRECT, but too narrow.** `CoachFreestyleOverlay.tsx:184` (`role="dialog" aria-modal="true"`, no trap/initial focus/restore) — accurate. But `:226` (`role="alertdialog"`) has the identical gap, and the closed-overlay focusability (new HIGH above) is the mirror image of the same failure to manage focus as a lifecycle, not just an open-state property.

**R1 — CORRECT, but too narrow.** `useFreestyleSpeech.ts:177` clears interim in `onend` before the restart at `:184-185` — accurate for the restart path. But the *same loss class* fires on deliberate teardown: `stop()` (`:207-212`) → `teardown()` (`:128-136`) discards pending interim with no flush, so tapping Done mid-sentence silently drops the user's trailing words. Two triggers, one missing flush. (Distinct from my new MED above, which is *finalized* text dropped by the session guard at pause.)

**R2 — CORRECT.** `useFreestyleSpeech.ts:184-185`: restart is immediate (`try { rec.start(); } catch { startEngine(); }`), no delay, no cap, no failure accounting beyond an incrementing counter. Optional strengthening: on Chrome every hot restart re-opens a cloud recogniser stream, so a dead-zone loop is also continuous PII-bearing connection churn, not just battery waste.

**R3 — CORRECT.** `useFreestyleSpeech.ts:189-196`: the `catch { setListening(true) }` converts *any* throw into success; `listening` is asserted, not observed.

**R4 — CORRECT.** The chain is even longer than stated: click → `isOpen` → auto-start effect (`CoachFreestyleOverlay.tsx:97-103`) → `state` commit → engine-follow effect (`:121-126`) → `speech.start` (`useFreestyleSpeech.ts:199-205`) → `startEngine` → `rec.start()` — two effect hops from the gesture, then R3 masks failure at the last hop.

**R5 — CORRECT, and can be strengthened.** `useFreestyleSpeech.ts:164-174` confines denial to the speech hook (`wantListening=false`, error, `setListening(false)`) — the *session* stays `'listening'`, and nothing in `useFreestyleSession.ts` ever sets `error` (`:124` is write-only-null; `'error'`/`'discarded'` are unreachable states). Strengthening: because the session stays listening, the StatusLine eventually renders "Still listening. Nothing heard for 12s." *next to* the denial copy (`CoachFreestyleOverlay.tsx:217, 221`) — the UI asserts it is hearing with a dead mic. Also note the *unsupported* copy (`useFreestyleSpeech.ts:78-79`) makes the same promise of a typing path that does not exist, not just the denial copy.

**R7 — CORRECT.** `useFreestyleSession.ts:264-277`: a 1s `setInterval` is the only TTL check; background throttling (≥60s), frozen tabs, and bfcache suspend it entirely, so retention exceeds the 24h ceiling until the next post-wake tick. (Nit: in `'stopped'` the interval also drives pointless per-second re-renders of frozen readouts.)

---

## VERDICT

**8 NEW findings beyond the known 8** — 1 HIGH (invisible keyboard-operable overlay → live mic behind closed UI), 4 MED (auto-stop copy/blob/transcribe enforcement in the wrong layer; unenforced purge audit + `start()` bypass; pause-boundary loss of finalized speech; per-second screen-reader flooding), 3 LOW (on-device comment overstatement; final-result concatenation; landscape min-height self-defeat).

All 8 known characterizations are substantively **correct**; S7 and R1 are **too narrow** (alertdialog; deliberate-stop interim loss), and S2/R5 have strengthenable edges noted above. None is wrong.
