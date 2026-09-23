# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round11-packet.md
**Tokens:** 30525 in / 23869 out (reasoning: 22174) | total 54394
**Wall:** 410.9s

---

# HOSTILE REVIEW ROUND 11 — ATTACK LOG

Attacks first, re-sweep second. Per the remit, both round-10 fixes were targeted with the strongest interleavings I could construct; each attack is reported with the line that defeats it, so the zeros below are evidenced rather than asserted.

## Attack 1 — The `isOpen` phrase gate (CoachFreestyleOverlay.tsx:393-397)

The gate reads `!isOpen || !isListening`, where `isListening` (line 289) derives from the **masked** session state (useFreestyleSession.ts:537). Vectors attempted:

1. **Fade-out exposure on close.** For A's words to survive into the fade, they would have to persist past the commit that flips `$isOpen`. `latestPhrase` is computed during that same render, and `LivePhrase` is conditionally mounted (line 432) — the element leaves the DOM in the same commit that starts the opacity transition (styles:49). The fade carries no content. Gate holds.
2. **Account switch with `isOpen` still true.** The mask (useFreestyleSession.ts:208) is active in the render that first sees the new key — `ownerRef.current` is only rewritten by the passive purge effect (line 477), so the mismatch render masks state to `'idle'`, `isListening` false, phrase `''`. The fallback branch (`fragments[fragments.length - 1]`) reads the masked empty array (line 538). No path renders the raw buffer.
3. **`speech.interim` bypassing the mask** (the round-9 residue class). Interim is only consumed at line 395, behind the same gate; `speech.stop()` additionally clears it synchronously (useFreestyleSpeech.ts:156, 323). There is no other DOM consumer of `speech.interim` — verified by reading every reference in the overlay.
4. **Reopen / state-transition frames.** Opening frames, paused→listening, error→listening: every transition either satisfies the gate legitimately (owner matched, session genuinely listening) or masks to idle. No frame paints stale-owner words.

**Result: gate holds. No finding.**

## Attack 2 — Pre-paint account-switch engine kill (CoachFreestyleOverlay.tsx:151-156)

1. **Does it actually run pre-paint?** It is the only `useLayoutEffect` in the tree; `useFreestyleSession` has none. All layout effects precede the commit's paint and all passive effects of that commit — so ordering is: mismatch render (masked) → layout kill → paint (idle, engine dead) → passive purge/receipt (useFreestyleSession.ts:474-483). Correct by construction.
2. **Is the kill synchronous?** `speech.stop()` (useFreestyleSpeech.ts:316-325) clears `wantListening` before teardown; teardown (181-193) clears the backoff restart timer, detaches `onend` (no restart resurrection), and calls `abort()`. A pending backoff timer is cleared first thing in teardown; even a fired callback re-checks `wantListening`. No resurrection path.
3. **The "no flush" claim.** `stop()` does invoke `flush()` when `wantListening` was true — but `flush` → `onPhrase` → `appendFragment`, which refuses on `ownerRef.current !== ownerKeyRef.current` (useFreestyleSession.ts:435). `ownerKeyRef` is render-synchronized (191-192), so it already holds B at layout time; `ownerRef` still holds A until the passive purge. The trailing words die at the guard, exactly as the round-10 write-up claims. Fail-closed confirmed.
4. **Follow-effect resurrection during the window.** The follow effect (CoachFreestyleOverlay.tsx:176-186) keys on the masked `state`; the mismatch render flips it to `'idle'`, so any re-run lands in the `speechStop()` branch. It cannot restart under B — and the layout effect's own `setListening/setInterim` updates re-render pre-paint without changing the follow effect's deps toward a start. No resurrect.
5. **StrictMode double-invoke / remount / A→B→A.** `prevAccountRef` makes the second invoke a no-op; a keyed remount unmounts the speech hook, whose cleanup tears the engine down anyway; rapid A→B→A double-purges, which is the ratified contract ("a change purges"), not a defect.
6. **Events between render and layout effect.** Recognition events are tasks; the commit is synchronous, so no `onresult` can land inside it — and if one could, the append guard (435) refuses it.

**Result: kill holds. No finding.**

## Re-sweep — candidates examined and why each fails the concrete-reachable-failure bar

- **Keyboard activation during the 250 ms visibility-delayed fade-out** (styles:57-58): `handleStop` is not `isOpen`-guarded, but the open-effect cleanup (319-324) restores opener focus in the passive flush, and React 18 flushes passive effects before dispatching discrete events — the Enter cannot land on an invisible button ahead of the focus restore. Sub-frame speculation, precluded by the event pipeline. Dismissed.
- **1 Hz tick re-render while `stopped`** (useFreestyleSession.ts:486-493): readout is frozen at `stoppedAtRef` (518); renders change nothing visible. Perf nit, not a failure. Dismissed.
- **`'discarded'` state unreachable** (discard settles to `'idle'`, line 410): dead enum branch, harmless. Dismissed.
- **TTL sweep racing the account-switch purge at the 24 h boundary** (319-329 vs 474-483): would mislabel one receipt `'ttl'` instead of `'account-switch'` in a one-tick-wide window on a 24-hour-old session; both are legitimate receipted purges, no exposure. Astronomical, no user harm. Dismissed.
- **`onPurge` throwing mid-purge** (useFreestyleSession.ts:256): requires a defective out-of-packet consumer callback; every callback-based hook shares this property, and the failure mode is loud (boundary/unmount), not silent. Caller defect, not a code defect. Dismissed.
- **`startEngine`'s non-InvalidState throw path leaves `interim` uncleared** (useFreestyleSpeech.ts:290-304): unreachable as exposure — the fail bridge flips the session to `error` in the same flush (overlay 216-227), and the gate at 393 hides interim in every non-listening state. Dismissed.
- **`useVoiceRecorder` double-start stream leak**: unreachable through the public surface — `useCoachCapture.start` guards on `isCapturingRef` (useCoachCapture.ts:200), the only consumer path. Dismissed.
- **`reset()` during live recording never calls `recorder.stop()`** (useVoiceRecorder.ts:112-135): cleanup stops the tracks, which auto-stops the recorder with handlers detached; no mic is held. Dismissed.

Fenced items (transport owner decision, R4 auto-start, S3 expiry, transcribe-gate location, prior GLM/R6-R10 exclusions, jsdom paint-timing) were not re-reported.

## Verdict

Both round-10 fixes survive targeted attack at the sub-paint-frame severity the trend has reached, and the re-sweep produced nothing that clears the concrete-reachable-failure bar. The interleavings that remain are either precluded by React's event/effect pipeline, require out-of-packet defective callers, or fail harmlessly with no exposure and no user-visible consequence.

**FINDINGS: 0**
