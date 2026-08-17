# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round23-packet.md
**Tokens:** 34031 in / 24285 out (reasoning: 22932) | total 58316
**Wall:** 348.6s

---

# HOSTILE REVIEW ROUND 23 — FINDINGS

**Attack log on the three round-22 fixes first (all three held):**

- **Fix 1 (expiry owns the receipt):** Verified every `clearBuffer` caller — `purgeExpired`, `discard`, `reset`, account-switch effect, unmount effect. `isExpired()` is evaluated strictly before `wipeRefs()` nulls `startedAtRef` on every path; no caller pre-wipes the clock. Account-switch and unmount of an expired buffer now correctly receipt `'ttl'` over `'account-switch'`/`'logout'`/`'unmount'`, which matches the stated invariant. No ordering hole found.
- **Fix 2 (purge-then-refuse):** `discard` and `reset` both check `purgeExpired()` before destroying; `requestDiscard`'s `stateRef.current === 'idle'` precondition closes the corpse-arm path. The one residue — arming from `'error'` with zero fragments — is unreachable from this surface (`hasWords` gates every entry point) and only exists at raw-API level. Not reportable.
- **Fix 3 (unmount purge via ref, empty deps):** Audited **every effect in all four TS files** for the destructive-cleanup-plus-dep-churn class: the only destructive cleanups are the unmount purges (now `[]`-deps or stable-dep), `useCoachCapture`'s lifecycle effect (`stopInternal` is `[]`-deps — stable), `useFreestyleSpeech`'s teardown effect (`teardown` is `[]`-deps), and the overlay's unmount layout effect (`[]`). None can re-run on identity churn. `clearBuffer`'s identity churn (ttl-prop-driven) is fully absorbed by guards or refs on all five dependent effects. The class is closed.

The two survivors are below.

---

**FINDING [LOW]: `closeSession` depends on the whole `speech` object, so the Escape-key effect tears down and re-registers its document listener on every render / Evidence: CoachFreestyleOverlay.tsx:330 (`}, [speech, onClose]);`), consumed at :336-338 (`handleClose`) and :359-369 (Escape effect deps include `handleClose`) / Why:** `speech` is a fresh object literal every render (useFreestyleSpeech.ts:357). `closeSession` → `handleClose` → `handleDiscard` therefore churn identity every render, and the Escape effect's deps change every render — during live dictation that means remove/add of the `keydown` listener several times per second (interim results) plus every tick. This is exactly the identity/dep-churn class in scope, and it violates this file's own doctrine fifteen lines up (:195-196: "Depend on the stable callbacks, not the hook object — that object is new on every render"). Today the cleanup is non-destructive (listener removal only), so no round-22-class wipe — but the hazard is one future `stopInternal`-style cleanup away from being live, and the churn is pure noise during the exact ten-minute session this surface is built for. Adjacent same-class instance: `useFreestyleSession.ts:316` lists `clearBuffer` in `start`'s deps without calling it, churning `start`/`handleStart` on ttl-prop changes (currently consumed by nothing with a cleanup). / Fix:** Destructure the two primitives `closeSession` uses — `const { abandon, clearError } = speech;` — and set deps to `[abandon, clearError, onClose]`; both are stable (`abandon` deps `[teardown, setInterimBoth]`, `clearError` deps `[]`), making `closeSession`/`handleClose`/`handleDiscard` stable and the Escape effect's re-runs semantic-only. Drop the dead `clearBuffer` dep from `start`.

---

**FINDING [LOW]: A completed, handed-off session whose overlay unmounts before Close is receipted `'unmount'` — the audit's surface-death reason — for words that were successfully delivered / Evidence: useFreestyleSession.ts:578 (`clearBufferRef.current('unmount')`) with :261-278 (`hadData` → receipt); the flow at CoachFreestyleOverlay.tsx:254-256 (`handleStop` hands the snapshot via `onStopped` while the buffer deliberately persists in `'stopped'` to feed the Finished readout at :504) / Why:** After Done, the hook keeps the buffer alive in `'stopped'` (the Finished line and Close flow read it). If the parent then unmounts the overlay — route change, or a parent that auto-dismisses on `onStopped` — the unmount purge fires with `hadData === true` and receipts `'unmount'`. Round 19-22's doctrine is "the receipt names the act"; here the act was a completed handoff and the receipt names the mechanism, so the retention audit systematically counts data-loss-shaped `'unmount'` events for successfully delivered sessions. The hook genuinely cannot distinguish consumed-from-not (a `'stopped'` buffer unmounting without handoff IS a loss, and receipting that `'completed'` would be the worse lie), so this is a semantics gap, not a code defect — and the load-bearing guarantees (purge happens, no cross-account leak) hold either way. / Fix:** Product-level, recorded in the retention contract: either (a) document `'unmount'`-while-`'stopped'` as handoff-ambiguous so the audit consumer doesn't read it as loss, or (b) have the surface settle `reset('completed')` once the parent acknowledges `onStopped`, accepting the loss of the Finished readout. Do NOT change the hook to guess.

---

**Count: 2** (both LOW; zero MEDIUM/HIGH).

Honest assessment: the three fresh fixes survived direct attack, the destructive-cleanup-plus-churn class is verifiably closed across every effect in scope, and the two survivors are a churn/fragility wart and a receipt-semantics ambiguity — neither loses data, leaks across accounts, or mis-receipts a destruction the user performed. If the second reviewer also returns empty-or-equivalent, this is a defensible zero-or-noise round on the merits.
