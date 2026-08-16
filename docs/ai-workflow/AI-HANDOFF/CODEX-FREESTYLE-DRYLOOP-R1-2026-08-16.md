# Codex (GPT-5.5) Consult — 2026-08-16T22:52:13.864Z

**Model:** openai/gpt-5.5
**Tokens:** in=25121 out=6922
**Elapsed:** 78.4s

---
## Known open findings — characterization check

- [VERIFIED] **S2 is correct.** `onStopped` receives a frozen snapshot with only `fragments`, `wordCount`, and `elapsedMs`; no owner/account key, expiry, purge binding, or revocation path is included. Evidence: `CoachFreestyleOverlay.tsx:53-58`, `CoachFreestyleOverlay.tsx:128-135`.

- [VERIFIED] **S7 is correct but incomplete.** The overlay declares `role="dialog"` and `aria-modal="true"` with no focus trap, initial focus, or focus restore. Evidence: `CoachFreestyleOverlay.tsx:184`. It is also rendered when closed; I report that separately as a new finding.

- [VERIFIED] **R1 is correct.** `onend` clears `interim` before restart. Evidence: `useFreestyleSpeech.ts:176-185`.

- [VERIFIED] **R2 is correct.** Restart is immediate and unbounded; there is no backoff or network/dead-zone circuit breaker. Evidence: `useFreestyleSpeech.ts:176-185`.

- [VERIFIED] **R3 is correct.** `startEngine` treats any `rec.start()` throw as “already live” and sets `listening=true`. Evidence: `useFreestyleSpeech.ts:189-196`.

- [VERIFIED] **R4 is correct.** The overlay auto-starts from an effect, not a user gesture. Evidence: `CoachFreestyleOverlay.tsx:97-103`; speech then starts from the state-following effect at `CoachFreestyleOverlay.tsx:121-126`.

- [VERIFIED] **R5 is mostly correct, but one sentence is wrong.** Permission denial is kept in `useFreestyleSpeech` and does not transition `useFreestyleSession` to `error`; `discarded` is also unreachable because discard sets `idle`. Evidence: `useFreestyleSpeech.ts:164-170`, `useFreestyleSession.ts:213-222`. However, the **denial** copy does not offer typing; the **unsupported-browser** copy does. Evidence: denial at `useFreestyleSpeech.ts:81-82`, unsupported typing copy at `useFreestyleSpeech.ts:78-79`.

- [VERIFIED] **R7 is correct.** TTL enforcement depends on a 1s interval, so a throttled/suspended background tab can exceed the 24h ceiling. Evidence: `useFreestyleSession.ts:263-277`.

---

## New findings beyond the known 8

FINDING [HIGH]: Freestyle still hot-mics across tab hide/pagehide / Evidence: `CoachFreestyleOverlay.tsx:110-126`, `useFreestyleSpeech.ts:214-218` / Why: [VERIFIED] The overlay pauses only when `isOpen` becomes false, and speech stops only when session state stops being `listening` or the hook unmounts. There is no `visibilitychange` or `pagehide` listener in the freestyle path. [LIKELY] If the user backgrounds the tab while the overlay remains open and `state === 'listening'`, the Web Speech recognizer can remain active or continue its restart loop. / Repro: Open freestyle overlay; allow it to enter `listening`; dispatch `document.visibilitychange` with `visibilityState='hidden'` or `window.pagehide`; observe no session pause/stop path is called by this code. / Fix: Add lifecycle policy equivalent to `useCoachCapture`: on `visibilitychange:hidden` and `pagehide`, synchronously stop/pause the session and stop speech; include a late-permission/late-engine-start latch.

FINDING [MEDIUM]: Code still overstates Web Speech as “on-device” / Evidence: `useFreestyleSpeech.ts:3-4`, `CoachFreestyleOverlay.tsx:75-79` / Why: [VERIFIED] The file purpose says “On-device continuous speech capture,” and the overlay comment says “Freestyle listens ON-DEVICE.” [VERIFIED] The same file later admits Chrome streams audio to Google’s cloud recognizer and says this is not a privacy guarantee. Evidence: `useFreestyleSpeech.ts:19-29`. This violates the stated review instruction to report code/copy that overstates privacy. / Repro: Inspect comments around the hook and overlay. They make an absolute on-device claim while the implementation uses `SpeechRecognition`/`webkitSpeechRecognition`. / Fix: Rename/comment as “browser speech transport” or “Web Speech capture”; do not say on-device unless capability-gated to an actually local recognizer.

FINDING [MEDIUM]: Closed freestyle dialog remains in the accessibility tree as modal / Evidence: `CoachFreestyleOverlay.tsx:183-286`, `CoachFreestyleOverlay.styles.ts:32-46` / Why: [VERIFIED] The component always renders `<FreestyleOverlay role="dialog" aria-modal="true">`; closed state only changes CSS `opacity` and `pointer-events`. Evidence: `CoachFreestyleOverlay.tsx:184`, `CoachFreestyleOverlay.styles.ts:41-42`. CSS opacity and pointer-events do not remove a subtree from assistive technology. [LIKELY] Screen-reader users can encounter a modal dialog that is visually closed and non-interactive. / Repro: Render `<CoachFreestyleOverlay isOpen={false} ... />`; inspect DOM/accessibility tree; the dialog node still exists with `aria-modal=true`. / Fix: Return `null` when closed, or set `hidden`/`aria-hidden`/`inert` and do not set `aria-modal=true` unless open.

FINDING [MEDIUM]: Done/Pause can lose the current phrase because only final results are stored / Evidence: `useFreestyleSpeech.ts:88-90`, `useFreestyleSpeech.ts:148-161`, `CoachFreestyleOverlay.tsx:128-135`, `useFreestyleSession.ts:197-202`, `useFreestyleSession.ts:225-235` / Why: [VERIFIED] Interim text is display-only and never stored; `onPhrase` fires only for final results. [VERIFIED] `handleStop` calls `stop()` and immediately snapshots the existing `fragments`. [VERIFIED] `session.stop()` synchronously moves `stateRef` to `stopped`; later phrases are dropped because `appendFragment` returns unless `stateRef.current === 'listening'`. [LIKELY] If the user taps Done or Pause while the recognizer has a non-final current phrase, that phrase is neither flushed nor included in the snapshot. / Repro: Start freestyle; mock Web Speech to expose `interim='client did squats'` without a final result; click Done; `onStopped` receives a snapshot missing that phrase. / Fix: On stop/pause, explicitly finalize or preserve the current interim as a pending/clarification fragment before changing session state, or stop the recognizer first and wait for final `onresult` before snapshotting.

FINDING [LOW]: `useFreestyleSession.start()` destroys an existing buffer without a purge receipt / Evidence: `useFreestyleSession.ts:162-174` / Why: [VERIFIED] `start()` unconditionally clears `fragments`, resets timing refs, and sets state to `listening`; it does not guard on `idle`, does not call `clearBuffer`, and does not call `onPurge`. This means the hook API can lose a stopped/listening session without audit. / Repro: Use the hook directly; call `start()`, `appendFragment('foo')`, `stop()`, then `start()` again. The first fragment is gone and `onPurge` was not called. / Fix: Make `start()` legal only from `idle` with no fragments, or route destructive restart through `reset(reason)`/`clearBuffer(reason)`.

FINDING [LOW]: Logout purge reason is defined but unreachable through account changes / Evidence: `useFreestyleSession.ts:84-91`, `useFreestyleSession.ts:253-261` / Why: [VERIFIED] `FreestylePurgeReason` includes `'logout'`, but the account-change effect always receipts `clearBuffer('account-switch')`, including transitions from an account key to `null`. This weakens audit semantics. / Repro: Render with `accountKey='trainer-a'`; rerender with `accountKey=null`; `onPurge` receives `'account-switch'`, not `'logout'`. / Fix: Branch account changes: previous non-null → current null should emit `'logout'`; non-null → different non-null should emit `'account-switch'`.

FINDING [LOW]: Unmount emits a second/misleading purge receipt after completed/discard reset / Evidence: `useFreestyleSession.ts:213-223`, `useFreestyleSession.ts:238-246`, `useFreestyleSession.ts:279-280` / Why: [VERIFIED] `discard()` and `reset()` call `clearBuffer(...)`; unmount always calls `clearBuffer('unmount')` regardless of whether a buffer still exists. [LIKELY] Audit consumers can see duplicate purge receipts such as `completed` followed by `unmount` for the same already-cleared session. / Repro: Start session, append a fragment, call `reset('completed')`, then unmount the component. `onPurge` is called once for `completed` and again for `unmount`. / Fix: Track whether a buffer exists or whether the current buffer generation has already been purged; only receipt unmount when there is live retained content.

FINDING [LOW]: Auto-stop copy says “Nothing was saved” while audio can still be retained in the hook / Evidence: `useCoachCapture.ts:71-72`, `useCoachCapture.ts:143-147`, `useCoachCapture.ts:249`, `useCoachCapture.ts:262-267` / Why: [VERIFIED] Automatic stop sets the notice “Nothing was saved,” but the hook does not purge/reset the recorder. If `recorder.state === 'stopped' && recorder.audioBlob`, status becomes `ready`, and `audioBlob` is returned to consumers. [LIKELY] The copy is at least misleading for privacy/retention: raw audio may still be held in memory even if not transcribed. / Repro: Mock recorder to produce an `audioBlob` after an automatic hidden stop; hook returns `error === CAPTURE_AUTO_STOPPED_COPY` and non-null `audioBlob`. / Fix: Either purge the blob on automatic stop, or change the copy to accurately say recording stopped and audio is held locally until retry/close.

---

## Verdict

[VERIFIED] I found **8 new findings beyond the known 8**.
