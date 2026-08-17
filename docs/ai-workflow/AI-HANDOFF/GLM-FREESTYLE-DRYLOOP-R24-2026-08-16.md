# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round24-packet.md
**Tokens:** 34143 in / 17533 out (reasoning: 16629) | total 51676
**Wall:** 261.4s

---

# HOSTILE REVIEW ROUND 24 — Swan Coach freestyle capture layer

## Round-23 item 1: `closeSession` identity fix — attacked, holds

Traced every link in the chain. `abandon` (`useFreestyleSpeech.ts:348`) closes over `[teardown, setInterimBoth]`, both empty-deps — stable. `clearError` (`:355`) is `[]`. So `closeSession` (`CoachFreestyleOverlay.tsx:322-336`) is stable given a stable `onClose`, and `handleClose`/`handleDiscard`/the Escape effect (`:375`) inherit that stability. The dead-dep removals check out against source: session `start` (`useFreestyleSession.ts:316`) carries only `[ownedNow, wipeRefs]`; recorder `start` only `[cleanup]`. During live dictation the interim state churns renders but no listener re-subscribes. Nothing reintroduced.

## Round-23 item 2: the unmount-while-`stopped` receipt — attacked, and documentation is the RIGHT resolution

Explicitly, as invited: I do not believe code is the correct fix here, and I would reject one. Two reasons, both structural:

1. `stop()` **cannot** clear the buffer it just snapshotted — the entire `'stopped'` screen is built from the retained fragments (`wordCount` at `CoachFreestyleOverlay.tsx:510` derives from the live buffer via `useFreestyleSession.ts:595`). Wiping at handoff to make the unmount receipt unambiguous would blank the "Finished — N words captured" screen the user is looking at.
2. The hook cannot observe whether the parent persisted the snapshot between `onStopped` and unmount. Any code path that picked one answer ("delivered" or "destroyed") would forge a receipt for an event the hook did not witness — the exact sin the round-22 chokepoint exists to prevent. "Indeterminate: possibly delivered" is the only truthful record. The disposition matches the hook's own stated law (`reset` doc, `useFreestyleSession.ts:136`: receipt verbatim, never collapse). Recorded, not coded around. Correct.

## Attack sweep — probed and cleared

The full-class pass (mic ownership, unconfirmed destruction, receipt integrity, cross-account leakage, identity churn, double-upload, dead-end states) found no defect at or above this loop's demonstrated bar. The three sharpest near-misses, dismissed with reasons so they don't get re-litigated as noise in round 25:

- **`hasWords` reads unmasked `speech.interim`** (`CoachFreestyleOverlay.tsx:357`) — during the one-commit account-switch window the masked session shows 'idle' but a trailing interim could render Discard where Cancel belongs. Every mutator the button reaches refuses across the mismatch (`ownedNow` at `useFreestyleSession.ts:218`, `requestDiscard:393`), the layout effect kills the engine before paint (`:158-162`), and `speech.stop()` clears the interim in the same commit. Zero words exposed, zero state reachable, one frame. Below bar.
- **Unmount-while-listening flushes rather than abandons** (`CoachFreestyleOverlay.tsx:183` uses `speechStopRef`, not `abandon`) — nominally off-doctrine versus round 20, but the round-20 complaint was the wrong-act *receipt*; here the flushed fragment is real speech, and its destruction is receipted truthfully as `'unmount'`. Adjacent to the fenced ambiguity; no integrity violation.
- **`restarts` counter stale for the frame between reopen and `speechStart`** — `start()` resets it (`useFreestyleSpeech.ts:326`) before the engine can appear live; sub-frame cosmetic.

Both round-23 fixes verified in source, not taken on the packet's word. Twenty-three rounds of convergence now show the expected asymptote: what remains is either fenced by ratified decision, documented as contract, or below the severity floor a hostile-but-honest reviewer must not lower just to avoid an empty round. Manufacturing a LOW from the dismissed list above would be exactly that.

## Count

**FINDINGS: 0**
