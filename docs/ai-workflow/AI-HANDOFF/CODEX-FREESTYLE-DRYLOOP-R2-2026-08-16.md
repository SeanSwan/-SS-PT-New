# Codex (GPT-5.5) Consult — 2026-08-16T23:18:25.862Z

**Model:** openai/gpt-5.5
**Tokens:** in=23771 out=7114
**Elapsed:** 92.2s

---
FINDING [MED]: lifecycle auto-pause flushes too late, so pending interim words are dropped  
Evidence: `CoachFreestyleOverlay.tsx:120-122`, `CoachFreestyleOverlay.tsx:149-155`, `useFreestyleSession.ts:249-253`, `useFreestyleSession.ts:350-357`, `useFreestyleSpeech.ts:289-297`  
Why: [VERIFIED] The close/hidden paths call `pause()` directly, not `speech.flush()`. `pause()` synchronously moves `stateRef.current` to `'paused'` (`useFreestyleSession.ts:249-253`). Only after render does the speech-following effect stop the recognizer, and `speech.stop()` flushes pending interim (`useFreestyleSpeech.ts:289-297`). But by then `appendFragment()` rejects the flushed phrase because the session is no longer `'listening'` (`useFreestyleSession.ts:350-357`).  
Concrete reproduction steps:  
1. Open freestyle overlay and start listening.  
2. Mock Web Speech to emit interim text only, e.g. `"client said knee pain"`, not final.  
3. Trigger `document.visibilityState = 'hidden'` + `visibilitychange`, or set `isOpen` to `false`.  
4. Observe no fragment is appended; the interim phrase is cleared by `speech.stop()` after the session is already paused.  
Fix: Flush before every lifecycle pause. The `isOpen` close effect and `visibilitychange/pagehide` handlers should call a stable `speech.flush()` ref before `pauseRef.current()`, or route through a shared `pauseWithFlush()` that preserves the current ordering used by the explicit Pause button.

FINDING [HIGH]: “Start talking” from error with retained words destroys the buffer without the two-step discard  
Evidence: `useFreestyleSession.ts:228-240`, `useFreestyleSession.ts:293-300`, `CoachFreestyleOverlay.tsx:367-395`  
Why: [VERIFIED] The hook’s own discard doctrine says a single stray API call must not destroy a session (`useFreestyleSession.ts:293-300`). But `start()` is allowed from `'error'` and, if fragments exist, calls `clearBuffer('discard')` immediately (`useFreestyleSession.ts:237-240`). The overlay also renders both “Done” and “Start talking” in an error state with fragments: Done at `CoachFreestyleOverlay.tsx:367-370`, and Start at `CoachFreestyleOverlay.tsx:393-397` because the condition does not exclude `state === 'error' && fragments.length > 0`. One tap on Start after a mic failure purges already captured words with no confirmation.  
Concrete reproduction steps:  
1. Start freestyle.  
2. Append at least one fragment.  
3. Trigger `speech.error`, causing `session.fail()` and `state === 'error'`.  
4. Click “Start talking”.  
5. `start()` clears `fragmentsRef` via `clearBuffer('discard')` and starts a new session; the retained words are gone without `requestDiscard()` / confirmation.  
Fix: Do not allow `start()` to purge retained error buffers. Either make `start()` return when `state === 'error' && fragmentsRef.current.length > 0`, or hide/disable “Start talking” in that state and force the user to choose Done or confirmed Discard first.

FINDING [MED]: fatal speech errors can be immediately re-started by the overlay before `fail()` runs  
Evidence: `useFreestyleSpeech.ts:216-223`, `CoachFreestyleOverlay.tsx:133-138`, `CoachFreestyleOverlay.tsx:170-172`  
Why: [VERIFIED] On `not-allowed` / `service-not-allowed`, the speech hook explicitly sets `wantListeningRef.current = false` “do not fight a denied permission” (`useFreestyleSpeech.ts:216-223`). But the overlay’s engine-following effect runs before the speech-error-to-session-failure effect in the file: it calls `speechStart()` whenever `isOpen && state === 'listening'` (`CoachFreestyleOverlay.tsx:133-138`), while `fail()` is invoked only later (`CoachFreestyleOverlay.tsx:170-172`). [VERIFIED] React runs effects in declaration order. So on the render where `speech.error` first appears, the session is still `'listening'`, and the overlay can call `speech.start()` again before `fail()` transitions the session to `'error'`.  
Concrete reproduction steps:  
1. Mock `SpeechRecognition.start()` to succeed.  
2. Fire `onerror({ error: 'not-allowed' })`.  
3. On the next render, observe the engine-following effect invokes `speechStart()` once more before the failure effect calls `session.fail()`.  
Fix: Gate the engine-following effect on no fatal speech error, e.g. `if (isOpen && state === 'listening' && !speech.error) speechStart(); else speechStop();`, or move failure propagation before engine following and ensure fatal errors synchronously take the session out of `'listening'`.

FINDING [MED]: fatal speech errors drop pending interim text  
Evidence: `useFreestyleSpeech.ts:216-223`, `useFreestyleSpeech.ts:228-234`, `useFreestyleSpeech.ts:289-297`  
Why: [VERIFIED] The fatal error handler sets `wantListeningRef.current = false` and does not flush pending interim text (`useFreestyleSpeech.ts:216-223`). `onend` only promotes pending interim if `wantListeningRef.current` is still true (`useFreestyleSpeech.ts:228-234`). `stop()` also only calls `flush()` if `wantListeningRef.current` is true (`useFreestyleSpeech.ts:289-294`). Therefore, if a permission/service denial or revocation happens after interim words exist but before a final result, those words are cleared/lost rather than appended.  
Concrete reproduction steps:  
1. Use `useFreestyleSpeech` with an `onPhrase` spy.  
2. Start recognition.  
3. Emit an interim result `"client reports shoulder pain"` with `isFinal: false`.  
4. Emit `onerror({ error: 'not-allowed' })`, then `onend()` or call `stop()`.  
5. `onPhrase` is never called for the pending interim.  
Fix: On fatal errors, flush pending interim before setting `wantListeningRef.current = false`, or make `stop()` / `onend` flush based on actual pending interim rather than the caller-wants-listening flag.

New findings: 4.
