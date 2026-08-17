# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round19-packet.md
**Tokens:** 32518 in / 21881 out (reasoning: 20745) | total 54399
**Wall:** 445.9s

---

# HOSTILE REVIEW ROUND 19 — findings

I attacked the round-18 pair as ordered. The `handleClose` ordering itself holds (verified below); the fix's *invariant* — "clear at surface close" — is enforced at only one of the surface-close call sites.

---

**FINDING [HIGH]: clearError is never called on the discard-confirm exit — the round-18 "stale latched error no longer suppresses auto-retry on next open" guarantee is resurrected through `handleDiscard`**

**Evidence:** CoachFreestyleOverlay.tsx:309-312 (`handleDiscard` — calls `discard(); onClose();`, no `speech.clearError()`), vs. CoachFreestyleOverlay.tsx:314-328 (`handleClose` — the only clearError call site, line 325); suppression gate at CoachFreestyleOverlay.tsx:202 (`isOpen && state === 'listening' && !speech.error` → `else speechStop()`); fail bridge at CoachFreestyleOverlay.tsx:234-245; auto-start at CoachFreestyleOverlay.tsx:107-113; useFreestyleSpeech.ts:323-332 (`stop()` deliberately never clears the latched error).

**Why:** Round 18 established that a fatal transport error must be cleared "at surface close, after the bridge has run" — but the overlay closes through **two** exits, and only `handleClose` clears. Trace the natural continuation of the round-18 scenario: fatal error with retained words (session `'error'`, `speech.error = X` latched, consumed by the bridge). The user's exits with words are Done and Discard. Done → Close → `handleClose` → cleared ✓. **Discard → confirm → `handleDiscard` → `discard(); onClose()` — X survives the close.** Next open (same account, permission possibly granted since):

1. Auto-start: `discard()` settled `'idle'` → `start()` → `'listening'` — the session commits to listening.
2. Follow effect: `!speech.error` is false (stale X) → `speechStop()`. The engine is killed before it draws breath — the exact round-18 suppression.
3. Bridge (re-keyed by the `idle → listening` state change): `fail(X)` → session `'error'` re-populated with the **stale** denial copy — instructing the user to fix a browser-permission problem that may not exist.

Recovery exists (`handleStart` from error-with-0-fragments → `startEngine` → `setError(null)` on success), so this is not a hard lock — but it falsifies the overlay's freshly ratified auto-retry promise on the primary exit for failed-with-words sessions, and the resurrected message is affirmatively misleading when the failure condition has since cleared. Note this also compounds the Escape path: Escape with fragments *arms* discard rather than closing, so a keyboard user who confirms is routed through the broken exit even from the stale-error state.

The ordering *within* `handleClose` is safe, for the record: React 18 flushes pending passive effects before discrete event updates, so the bridge has always consumed a latched error before any tap handler runs — the unconsumed-erase race the remit asked me to hunt does not exist there. The hole is the missing call site, not the sequence.

**Fix:** Clear the transport error on every surface-terminating exit. Minimal: add `speech.clearError()` to `handleDiscard` after `discard()` and before `onClose()` — the same "bridge has long consumed" invariant `handleClose` relies on holds (the fatal error committed turns earlier; even the arm step is a separate gesture). Better: extract a shared `closeSession(reason)` that does stop → clearError → reset/discard → onClose so the invariant "surface close clears the latch" is enforced in one place. Do **not** clear on the parent-driven `isOpen` false path — that hide preserves the session (paused/error), and Resume's engine restart re-derives the error state correctly.

---

## Attacked and held (no finding)

- **clearError-before-consumption race:** `setError(X)` from a native callback is committed and its passive bridge flushed before any subsequent discrete user event (React 18 guarantee), and nothing inside `handleClose` can set an error before clearing. No same-commit race exists — `clearError` runs only from a click handler.
- **Fix 2 (session error in clearBuffer):** enumerated every buffer-destroying path — `discard`, `purgeExpired`, `reset`, account-switch/logout effect, unmount effect — all flow through `clearBuffer` (:249-262); `start`'s direct `wipeRefs`+`setError(null)` is not a purge (no receipt owed) and correctly clears the retry path's error. Account-switch ordering verified: the bridge re-runs on the state change but `fail()` no-ops from `'idle'` post-purge — no cross-account error bleed through the session mask.
- **Recorder/capture layer:** flight-generation guards on late grant/rejection, superseded-start cleanup, queued-onstop detach, synchronous track release, and the `useCoachCapture` latch/mirror interleave all re-verified clean.

**Count: 1** (1 HIGH, 0 MEDIUM, 0 LOW).
