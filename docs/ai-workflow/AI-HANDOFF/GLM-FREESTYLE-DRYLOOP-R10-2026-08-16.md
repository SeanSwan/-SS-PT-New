# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round10-packet.md
**Tokens:** 30394 in / 17315 out (reasoning: 16075) | total 47709
**Wall:** 275.1s

---

# HOSTILE REVIEW ROUND 10 — Swan Coach freestyle capture layer

## Attack 1: LivePhrase gate (CoachFreestyleOverlay.tsx:377–381)

Attempted breach paths:

- **Account-switch window (A listening → B prop).** The mismatch render computes `owned = false` (useFreestyleSession.ts:208), so masked `state = 'idle'` (line 537) and `isListening = false` → `latestPhrase = ''`. The interim branch is unreachable and the fragment-tail fallback reads the *masked* `fragments` (line 538 → `[]`), so even the fallback source is empty. The painted frame is clean.
- **Interim lifetime across the window.** On the same commit, the follow effect (overlay:160–170) sees `state` leave `'listening'` → `speechStop()` → `flush()` promotes pending interim into `appendFragment`, which refuses at useFreestyleSession.ts:435; `setInterimBoth('')` then clears the transport copy. No stale `speech.interim` can survive into B's session, including the backoff-restart case (`teardown` clears `restartTimerRef`, useFreestyleSpeech.ts:182–185).
- **Mask soundness.** `owned` is true only when `ownerRef.current === ownerKey`, and `ownerRef` is the stamp of who owns the live buffer (fragments can only be appended while that identity holds, line 435; wipes coincide with stamp changes, line 477). So `owned && isListening` cannot display another account's words in either branch.
- **Derived consumers.** `isQuiet` (masked `sinceLastFragmentMs`), StatusLine error text (masked `error`), DiscardConfirm wordCount (masked) — all read the masked view. The unmasked transport fields (`interim`, `error`, `restarts`) reach the DOM only through `latestPhrase`, the fail-bridge (refused via `ownedNow` during the window), and the fenced restarts counter.

The gate holds.

## Attack 2: ownedNow chokepoint (useFreestyleSession.ts:217–220, guarded at 260/283/306/335/368/385/400/422/435/456)

- **All ten mutators verified guarded** — the eight named in the remit plus the inline checks on `stop` (line 335) and `appendFragment` (line 435). No unguarded mutation path exists; the only writers to `fragmentsRef`/`ownerRef` outside mutators are the switch effect itself (sole purge authority, line 474–483), TTL/unmount lifecycle purges, and `wipeRefs` behind them.
- **Stale-closure callers.** Every cross-tick caller routes through the session's own guard or a ref-updated callback: `onPhraseRef` → `appendFragment` (refused), the fatal-error flush (useFreestyleSpeech.ts:246–247 → refused), `pauseWithFlush` on pagehide during the window (flush refused, `pause()` refused), Escape's `handleClose` → `reset('completed')` (refused — the round-9 forgery stays closed).
- **ownerKeyRef freshness.** Render-assigned (line 192); event handlers run after the last committed render, so a pending-but-uncommitted prop change leaves `ownerRef` and `ownerKeyRef` consistently old — mutation proceeds under the still-current owner and the purge lands on commit. No window where a mutator acts under a mismatched stamp.
- **Receipt integrity.** The only purge of mismatched data is the switch effect, with `logout`/`account-switch` chosen by the actual transition (line 478). The theoretical TTL-tick-lands-inside-the-one-commit-window case receipts `ttl` only when `isExpired()` is genuinely true (real expiry, truthful receipt, data outcome identical), and cannot be induced by any caller in this packet.

The chokepoint holds.

## Re-sweep (nothing nine rounds missed)

- **Recorder flight/latch interplay** (useVoiceRecorder.ts:137–214): stop-during-requesting → second-start → late-grant ordering remains closed by the flightSeq check at 147/191; stray stop after 'stopped' preserves blob+state (212).
- **useCoachCapture**: transcribe flight is blob-keyed (247), start/reset abandonment of inherited uploads intact (215, 272), latch semantics on reset preserved (259–267). Status mapping and error precedence unchanged from cleared rounds.
- **Speech engine**: duplicate-instance paths (onend catch → startEngine → teardown-first, 281/199), fatal-error non-restart set, flush-before-clear ordering — all as previously cleared.
- **Overlay**: auto-start once-per-open interacts correctly with the mask (same-commit switch: the session's purge effect is registered before the auto-start effect, so `start()` proceeds under the settled owner; later-commit switch: one manual tap, design-acceptable); focus lifecycle, tab trap, Escape arming, and the closed-overlay `visibility` gate all re-verified.
- **Session internals**: pause accounting (`settlePause` anchor shift), snapshot freezing, `atMs` clock, TTL ceiling clamping, empty-wipe receipt suppression — no regressions introduced by the round-9 edits.

Every remaining observation maps to the fenced list (concurrent-render tearing, 1Hz tick, dead `'discarded'` paths, out-of-packet callers, transport owner decision, S3 items) or to ratified product decisions. Nothing new is reportable.

---

**FINDINGS: 0**

Reviewer empty. Per the packet: one more empty reviewer round ends the loop.
