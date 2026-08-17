# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round12-packet.md
**Tokens:** 31056 in / 15199 out (reasoning: 13094) | total 46255
**Wall:** 295.2s

---

# HOSTILE REVIEW ROUND 12 — GLM

Attack log first. Every candidate I could construct against the two fresh fixes and the re-sweep, with disposition. Findings at the end.

---

## ATTACK 1: Fix 1 — synchronous track release kills the final blob

**Attack line:** `useVoiceRecorder.ts:201-212` — `recorder.stop()` queues the final `dataavailable`/`stop` tasks; stopping the tracks at :212 before the queue runs could discard buffered audio, so the blob never lands and a working capture path regresses.

**Why it fails:** Ordering is load-bearing and correct. `recorder.stop()` at :201 runs *first* and, per the MediaRecorder spec, synchronously sets state to `inactive` and queues the finalization task over data already captured as of that call. The track-stop at :212 cannot un-queue that task; track-end itself converges on the same terminal `dataavailable`+`stop` events (recorder already inactive, no double-fire). Handlers are intentionally still attached (`cleanup()` only runs inside the queued `onstop`, :168-173), so the blob is built, `setAudioBlob` fires, and `cleanup()`'s second track-stop (:118) is a no-op on ended tracks. The only conceivable loss is audio arriving *between* the `stop()` call and the track-stop — zero milliseconds of separation, same synchronous block. No reachable failure.

## ATTACK 2: Fix 1 — `streamRef` desync makes the sync release a silent skip

**Attack line:** :212's `streamRef.current?.` optional chain — if `recorderRef` is live but `streamRef` is null, the mic is NOT released synchronously and the fix's guarantee is hollow.

**Why it fails:** Invariant holds by construction. `start()` assigns `streamRef.current` (:157) before `recorderRef.current` (:161) in one synchronous block; `cleanup()` nulls both (:119, :133) in one synchronous block; no invalidated flight ever writes `recorderRef` (superseded grants return at :147-156 before any ref write). There is no interleaving point where the guard at :200 passes with `streamRef` null. The `?.` is dead defensive syntax, not a hole.

## ATTACK 3: Fix 1 — double `stop()` re-enters the else-branch and corrupts the settle

**Attack line:** After a first `stop()`, `recorder.state` is `inactive` (spec: synchronous state flip), so a second `stop()` before the queued `onstop` takes the **else** branch (:213-224): latch set, flight invalidated — do these poison the pending blob?

**Why it fails:** The queued `onstop` is gated on neither the latch nor the flight sequence (:168-173). It still builds the blob, still sets `'stopped'`, still cleans up. The else-branch also refuses the state settle from non-`requesting` (:223), so no visible-state clobber. Benign by structure.

## ATTACK 4: Fix 1 — `stop()` → `start()` inside one frame resurrects the old blob over the new flight

**Attack line:** `stop()` (blob pending in queue) → `start()` immediately mints a new flight and clears the blob (:142) → the old `onstop` then fires `setAudioBlob(oldBlob)` + `setRecState('stopped')` (:170-171) + `cleanup()` mid-`requesting` of flight 2.

**Why it fails as a finding:** The queued recorder tasks and the second tap are both task-queue entries; the recorder tasks were queued first and flush within a frame — a human double-tap (≥100ms) always lands after `onstop` has settled. Reaching the interleaving requires programmatic sub-frame calls; the residue is a transient mislabel that self-heals when flight 2's grant resolves and overwrites everything. Same class as the fenced astronomical-window races. Below the concrete-reachable bar.

## ATTACK 5: Fix 2 — unmount cleanup ordering vs. the wrapper's unmount stop

**Attack line:** Both hooks' unmount effects live in one component; the primitive's cleanup (registered first, `useVoiceRecorder.ts:245-249`) runs before `useCoachCapture.ts:199` `stopInternal('auto-unmount')`. Does the primitive's `cleanup()` (handlers detached, refs nulled) break the wrapper's release, or does blob-loss-on-unmount regress the auto-stop copy ("audio is still on this device")?

**Why it fails:** Ordering is irrelevant to the guarantee in both directions. Primitive-first: mic already released by `cleanup()`'s track-stop (:118); wrapper's `stopInternal` then hits a null `recorderRef`, takes the primitive's else-branch, and mutates refs of a dying instance — harmless. Wrapper-first: `recorder.stop()` + fix 1's synchronous track-stop release the mic regardless of whether the queued `onstop` later finds its handlers detached. The "audio still on this device" copy (`useCoachCapture.ts:81-82`) renders only from a *mounted* component; unmount destroys the state that would hold the blob, pre- and post-fix identically. No regression, no reachable failure.

## ATTACK 6: Fix 2 — the unmount latch/invalidation poisons a remount or StrictMode replay

**Attack line:** `cancelRequestedRef.current = true` and `flightSeqRef.current += 1` (:246-247) persist into any subsequent use of the instance.

**Why it fails:** The only consumer of the latch is `start()`'s grant check (:147), and `start()` unconditionally clears the latch first (:140). StrictMode's mount→cleanup→mount replay runs the cleanup before any recording can exist (no-op) and is healed by the same line. A true unmount destroys the refs with the instance. No poisoned path.

## ATTACK 7: Fix 2 — unmount during the settle window strands the mic or the state

**Attack line:** Unmount lands between `recorder.stop()` (queued `onstop` pending) and the queue run; or during `requesting`.

**Why it fails:** Settle-window: tracks already released synchronously by fix 1 at stop-time; detached handlers mean no blob on a dead component — correct fail-closed, and strictly better than the pre-round-11 live-mic outcome. Requesting-window: latch + flight-invalidate mean the late grant hits :147, stops its own tracks (:153), touches no state. This is precisely the hole the fix exists to close; it closes it.

## RE-SWEEP — residual candidates and dispositions

- **`requestDiscard` pauses the session in the hook but leaves the engine to the follow effect** (`CoachFreestyleOverlay.tsx:274-277` + `useFreestyleSession.ts:378-382`): the ~1-frame window where the engine is live over a paused session drops finals at the `state !== 'listening'` guard (`useFreestyleSession.ts:442`) — which is the *intended* round-3 behavior (asides during judgment must not land). No loss of wanted words: `handleRequestDiscard` flushes first (:275).
- **`handleStop` does not stop the engine synchronously** (unlike `pauseWithFlush`, :229-236 vs :136-140): engine release rests on the follow effect (:176-186). The freeze-race that justified the synchronous pattern for pause is covered here by the native `pagehide`/`visibilitychange` handlers (:195-206), which run `pauseWithFlush` synchronously in the browser (pause no-ops on `'stopped'`; flush/stop still execute). Screen lock fires `visibilitychange` before freeze. Residual unreleased span is the sub-frame gap between tap and effect flush — not concrete-reachable.
- **`flush()` while still listening can duplicate a phrase when the engine later finalizes the same result:** no in-packet caller flushes while leaving the session listening — every flush site (`handleStop`, `pauseWithFlush`, `handleRequestDiscard`) stops the engine or closes the session in the same tick. Documented-API hazard, not a reachable failure in this code.
- **250ms fade-out leaves invisible buttons keyboard-focusable** (`CoachFreestyleOverlay.styles.ts:57-58`): every gesture starter carries the `isOpen` guard (:257, :268), so an invisible-button activation no-ops; after `visibility` flips, focus drops out. Functional round-1/round-3 guards intact; cosmetic residue only.
- **iOS UA sniff misses desktop-mode iPads** (`useVoiceRecorder.ts:48-51`): falls through to the candidate list, which still contains `audio/mp4` — correct outcome via a different route.
- **Instant start→stop yields a header-only blob → status `'ready'`** (`useCoachCapture.ts:293`): empty-blob transcription failure surfaces through `transcription.state === 'error'` → status `'error'`. Handled.
- **1Hz tick in `'stopped'`, `'discarded'` dead branch, auto-start semantics, transcribe-gate location, abort/upload ownership** — all fenced or contract-owned.

---

## FINDINGS

None. Both round-11 fixes survive every attack I could mount: fix 1's ordering (recorder stop → queued finalization → synchronous track release → queued `onstop` with handlers attached) is sound by spec and by the refs' write invariants; fix 2 closes the unmount/permission-window holes without opening ordering, latch-poisoning, or blob-regression paths. The re-sweep produced only astronomical-window races, out-of-packet callers, and fenced categories.

**COUNT: 0**
