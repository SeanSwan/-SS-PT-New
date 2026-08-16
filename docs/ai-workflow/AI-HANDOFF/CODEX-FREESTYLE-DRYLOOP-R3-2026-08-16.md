# Codex (GPT-5.5) Consult — 2026-08-16T23:45:03.063Z

**Model:** openai/gpt-5.5
**Tokens:** in=24410 out=7198
**Elapsed:** 87.6s

---
FINDING [MED]: Resume starts Web Speech outside the user gesture on iOS/Safari  
Evidence: `frontend/src/components/DashBoard/Pages/coach-assistant/CoachFreestyleOverlay.tsx:402-404`, `frontend/src/components/DashBoard/Pages/coach-assistant/CoachFreestyleOverlay.tsx:148-158`, `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:264-269`, `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSpeech.ts:279-297`  
Why: [VERIFIED] The Resume button calls only `resume` (`onClick={resume}`), and `resume()` only changes the session state to `listening`; it does not start speech inside the click handler. [VERIFIED] The recognizer is then started later by the engine-follow `useEffect` when it sees `state === 'listening'`. [LIKELY] On iOS/Safari/WebKit, `SpeechRecognition.start()` often requires user activation; starting it from a passive effect is outside the tap gesture and can throw. [VERIFIED] `useFreestyleSpeech` catches non-`InvalidStateError` start failures and sets `FREESTYLE_SPEECH_START_FAILED_COPY`, which the overlay converts into a session failure via `fail`.  
Concrete reproduction steps:  
1. Use Safari/iOS with Web Speech requiring gesture activation.  
2. Open overlay, start dictation using the Start button.  
3. Tap Pause.  
4. Tap Resume.  
5. Session state flips to `listening`, but speech start occurs from the follow effect, not the tap handler; recognizer start fails and the session enters error.  
Fix: Add a `handleResume` that calls both `resume()` and `speechStart()` synchronously in the Resume button’s click handler, mirroring `handleStart`.

FINDING [MED]: Discard confirmation leaves the microphone live and continues appending phrases  
Evidence: `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:302-305`, `frontend/src/components/DashBoard/Pages/coach-assistant/CoachFreestyleOverlay.tsx:420-423`, `frontend/src/components/DashBoard/Pages/coach-assistant/CoachFreestyleOverlay.tsx:156-157`, `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:351-358`  
Why: [VERIFIED] `requestDiscard()` only arms `discardPending`; it does not pause the session or stop speech. [VERIFIED] The Discard button is available while listening whenever fragments exist. [VERIFIED] The engine-follow effect keeps speech running while `isOpen && state === 'listening' && !speech.error`. [VERIFIED] `appendFragment()` still accepts phrases while `stateRef.current === 'listening'`. Result: while the alertdialog asks whether to delete the session, the app is still listening and can append anything said during that confirmation interval.  
Concrete reproduction steps:  
1. Start freestyle dictation.  
2. Speak one phrase so `fragments.length > 0`.  
3. Tap Discard; the confirm dialog appears.  
4. Speak another phrase, or emit a mocked final speech result.  
5. The phrase is appended because the session is still `listening`; if the user taps “Keep it,” that aside remains in the retained buffer.  
Fix: On discard arm, synchronously flush and pause/stop speech. Track whether the session was listening before the confirmation; on “Keep it,” require an explicit Resume or restart speech inside that button’s user gesture.

Explicit count: 2 findings.
