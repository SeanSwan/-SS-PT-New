# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round20-packet.md
**Tokens:** 32619 in / 22295 out (reasoning: 21166) | total 54914
**Wall:** 457.9s

---

## ROUND 20 — VERIFICATION OF THE ROUND-19 PRESCRIPTION

**Chokepoint confirmed in its stronger form.** Both terminating exits route through one `closeSession` (`CoachFreestyleOverlay.tsx:321-334`): Close/Cancel → `handleClose` → `reset('completed')`; confirmed Discard → `handleDiscard` → `discard`. Order matches the prescription exactly: `speechStopRef.current()` → `speech.clearError()` → `settle()` → `onClose()`. The parent-driven hide path is exempt as specified (`:169-174`, pauses with flush only from `'listening'`; the latch survives hiding). Attacking the chokepoint directly:

- **Orderings.** `speech.stop()` cannot synthesize a new error (teardown detaches handlers before `abort()`), so `clearError` cannot erase an error the settle path needed — the only live error at chokepoint time was already consumed by the fail-bridge in a prior commit, and if a passive-effect deferral lets a click beat the bridge, the settle has already reset everything identically. Terminal either way.
- **Settle callbacks.** Guarded correctly: `discard()` two-step-enforced on the ref (double-tap no-ops; the 10s-disarm race fails *safe* — buffer preserved, overlay closes); `reset` refuses across ownership mismatch (no forged receipts); `reset('completed')` is unreachable with a non-empty non-stopped buffer *as of render time*. One seam survives — see the finding.
- **Hide-path exemption.** Holds: hide during an armed confirm keeps session + disarm timer; reopen within 10s restores focus to "Keep it"; hide during `'paused'`/`'stopped'`/`'error'` needs no action (engine already down). GLM's round-19 resurrection vector (discard exit reopening with the latched transport error) is dead — `clearError` fires on both exits before `onClose`.

## FINDING

**FINDING [LOW]: Cancel/Escape close promotes the trailing interim into the buffer inside the chokepoint's engine stop, then destroys it under a `'completed'` receipt — single-tap, no two-step, audit-fiction class.**
**Evidence:** `CoachFreestyleOverlay.tsx:321-334` (closeSession runs `speechStopRef.current()` before `settle()`); `useFreestyleSpeech.ts:326-332` + `:182-186` (`stop()` flushes while `wantListening` is true; `flush()` promotes interim via `onPhrase`); `useFreestyleSession.ts:459` (append lands — session still `'listening'` at that instant); `useFreestyleSession.ts:474-484` → `:255-261` (`reset('completed')` → `clearBuffer`: `hadData` is now TRUE from the just-flushed phrase → `onPurge('completed')`).
**Why:** The Cancel button renders precisely because `fragments.length === 0` — but the user can be mid-sentence, watching those words in `LivePhrase`. `closeSession`'s stop flushes them into the buffer (violating the transport's own "interim is display only, never stored," `useFreestyleSpeech.ts:114`), and `reset('completed')` then destroys them on the same tap — the exact "single mis-tap must not destroy heard words" doctrine the two-step exists to enforce (`useFreestyleSession.ts:372-379`), and the purge receipt records `'completed'` for words destroyed by a *cancellation* — the same audit-fiction class rounds 4, 9, and 18 eliminated. Bounded to one trailing interim phrase on an explicit cancel tap → LOW.
**Fix:** Terminating exits whose settle destroys the buffer must not promote interim on the way out. Add a non-flushing engine stop (clear `wantListening`, clear interim, teardown — no `onPhrase`) and use it inside `closeSession`; the deliberate flush points (Done, Pause, discard-*arming*, which legitimately judges the in-flight words with the rest, round 13) keep the flushing stop. Alternative — capture pre-flush word presence at chokepoint entry and pass the honest reason — still stores-then-destroys; suppression is cleaner: interim dies as interim.

## SWEPT AND CLEARED (not re-reported per fence; recorded for the audit)

- `closeSession`'s `[speech, onClose]` deps recreate it (and `handleDiscard`/`handleClose`, and the Escape listener subscription) every render — consequence-free (no staleness; the swap is atomic per commit), and dep-only items are excluded by this loop's own precedent. Below the bar; noted, not counted.
- Engine finality on both exits; restart-timer cleared in teardown; no late `onend` resurrection post-close.
- Ownership mismatch through the chokepoint: both settles refuse, `onClose` still fires, the switch effect purges with the true receipt.
- `useVoiceRecorder` double-stop/supersede/rejection paths; `useCoachCapture` latch/mirror/late-arrival interleavings; session TTL-on-every-extending-path, mask, and receipt gating — all hold as previously fixed.

**FINDINGS: 1**
