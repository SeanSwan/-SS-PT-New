# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round16-packet.md
**Tokens:** 31807 in / 21390 out (reasoning: 20598) | total 53197
**Wall:** 453.3s

---

Reviewed all five files line-by-line, with particular hostility toward the two round-15 surfaces. Verification notes on the fresh fixes first, then the one residual I can actually stand behind.

**Round-15 fix verification (attacked, held):**

- *Layout-unmount kill* (CoachFreestyleOverlay.tsx:177): layout destroy functions run synchronously in the removing commit before any passive cleanup, so `speechStopRef.current()` precedes the speech hook's own teardown — including through ancestor unmounts, StrictMode remount cycles, and the backoff-timer case (`teardown` clears `restartTimerRef`). The flush it triggers lands in session refs before the session's passive unmount purge, so the 'unmount' receipt includes those words — accurate, not a loss. Holds.
- *Extend-path expiry sweep* (useFreestyleSession.ts:324-333, 436-461): I enumerated every path that touches `fragmentsRef` or extends buffer life — appendFragment, resume, stop are guarded; start mints a fresh `startedAt`; discard/reset/clearBuffer destroy outright; pause doesn't extend; `purgeExpired` is idempotent post-wipe (`startedAt` nulled ⇒ `isExpired` false), so the stop-flush→stop() double-check can't double-purge or double-receipt. The category is genuinely closed.

One residual survived the sweep — a surface/ordering miss *created by* the round-15 guard itself:

---

**FINDING [LOW]: Resume-after-expiry starts the engine over a session the state machine just killed** / Evidence: CoachFreestyleOverlay.tsx:282-286 (`handleResume` calls `resume(); speechStart();` unconditionally) + useFreestyleSession.ts:324-328 (round-15 `purgeExpired()` guard makes `resume()` a refusal that settles to 'idle' with no signal to the caller) / Why: `handleResume` assumes paused ⇒ resumable. Round 15 broke that assumption: on an expired buffer, `resume()` purges, receipts 'ttl', settles 'idle' — and then the very next statement takes the microphone live with no session behind it. `appendFragment` refuses (state ≠ 'listening'), so anything finalized in the window is dropped after the mic audibly engaged; the engine is only stopped by the passive follow effect (CoachFreestyleOverlay.tsx:188-198) one commit later — the exact "left to the follow effect" pattern rounds 13–14 eliminated from every other gesture. Honest reachability framing: the 1s sweep (useFreestyleSession.ts:494-501) or the wake listener (508-516) purges an expired paused session before a tap in almost every timeline — the trigger needs the 24h boundary to cross inside the sub-second gap between sweep tick and tap (interval throttling widens it slightly). Narrow, but structural: it is now the only gesture starter that doesn't verify the transition it drives succeeded (`handleStart` checks `isOpen` and `supported`; `handleResume` checks only `isOpen`). / Fix: make `resume()` return a boolean (or have the handler consult the session state synchronously) and gate: `if (resume()) speechStart();` — one line, restores "no engine without a live session" as a synchronous invariant on the gesture path.

---

**Count: 1** (LOW).

Everything else I could construct either repairs itself within one commit via a guaranteed re-running effect, is masked/fail-closed by an existing guard, or sits behind the fence (upload abort, snapshot expiry/S3, transcribe gate, out-of-packet consumers, ratified decisions). The two round-15 fixes themselves held up under direct attack.
