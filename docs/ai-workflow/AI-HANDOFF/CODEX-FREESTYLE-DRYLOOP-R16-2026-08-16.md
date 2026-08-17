# Codex (GPT-5.5) Consult — 2026-08-17T02:00:17.652Z

**Model:** openai/gpt-5.5
**Tokens:** in=31239 out=5972
**Elapsed:** 84.1s

---
FINDING [MEDIUM]: Resume can start the speech engine after the session refused/purged the resume  
/ Evidence: `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:324-329`, `frontend/src/components/DashBoard/Pages/coach-assistant/CoachFreestyleOverlay.tsx:281-286`  
/ Why: [VERIFIED] `resume()` purges and returns early when the buffer is expired (`if (purgeExpired()) return;`) before transitioning to `listening`. [VERIFIED] `handleResume` ignores whether `resume()` actually resumed and unconditionally calls `speechStart()` immediately afterward. That can open the Web Speech recognizer while the session has just been reset to `idle`; the passive follow effect later stops it, but there is still a reachable live-microphone window with no active session.  
Concrete reproduction steps:  
1. Open the freestyle overlay and let it enter `listening`.  
2. Click Pause so the UI renders Resume.  
3. Advance the system clock past the 24h TTL, or in a test mock `Date.now()` forward past `FREESTYLE_TTL_MS`, before the 1s TTL sweep runs.  
4. Click Resume.  
5. `useFreestyleSession.resume()` purges via `purgeExpired()` and does not set `listening`, but `CoachFreestyleOverlay.handleResume()` still calls `speechStart()`. A mocked `SpeechRecognition.start()` will be called despite the session being idle.  
/ Fix: Make `resume()` return a boolean/result (`true` only when it transitioned to `listening`) and call `speechStart()` only on success. Apply the same pattern to gesture paths where the session mutator can refuse.

FINDING [LOW]: `appendFragment` uses a stale TTL policy after `ttlMs` changes  
/ Evidence: `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:161-163`, `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:265-275`, `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:436-443`, `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:461`  
/ Why: [VERIFIED] `effectiveTtlMs` is derived from the `ttlMs` option. [VERIFIED] `purgeExpired()` closes over the current `effectiveTtlMs`. [VERIFIED] `appendFragment()` calls `purgeExpired()` but is declared with an empty dependency array, so it keeps the initial `purgeExpired` forever. [LIKELY] If a caller tightens `ttlMs` during a live session, `appendFragment()` can accept new words using the old, longer TTL until another path or the interval purge catches it. This weakens the round-15 claim that expiry is synchronous on every live-buffer extension path.  
Concrete reproduction steps:  
1. Render `useFreestyleSession({ accountKey: 'a', ttlMs: 60_000, now })`.  
2. Call `start()`.  
3. Rerender the hook with `ttlMs: 1`.  
4. Advance `now()` beyond 1ms but less than 60s.  
5. Call `appendFragment('client pii')`.  
6. The stale `appendFragment` uses the initial 60s `purgeExpired` and appends instead of purging/dropping.  
/ Fix: Include `purgeExpired` in `appendFragment`’s dependency array, or store the effective TTL in a ref read by a stable `purgeExpired`.

Explicit count: 2 findings.
