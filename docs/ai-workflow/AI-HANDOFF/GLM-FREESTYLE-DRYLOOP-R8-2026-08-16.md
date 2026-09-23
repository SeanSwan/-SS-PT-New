# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round8-packet.md
**Tokens:** 29378 in / 19339 out (reasoning: 17758) | total 48717
**Wall:** 351.4s

---

# HOSTILE REVIEW ROUND 8 — Swan Coach freestyle capture layer

## Part 1 — Attacking the settlePause anchor shift

I built explicit clock traces for every vector in the remit, plus the invariants the shift silently depends on.

**V1: Multiple pause/resume cycles with fragments between.**
Trace (wall ms): start 0 · F1@5 (anchor 5) · pause@10 · resume@20 → pausedTotal 10, anchor 15 · F2@25 → atMs = 25−0−10 = 15 ✓ (true active time) · pause@30 · resume@40 → pausedTotal 20, anchor 25+10 = 35 · render@41 → sinceLast = 41−35 = 6; true active since F2 = (30−25)+(41−40) = 6 ✓; elapsed = 41−0−20 = 21; true active = 10+10+1 = 21 ✓. / Evidence: useFreestyleSession.ts:258-270, 471-479. Composes correctly; no divergence accumulates.

**V2: Fragment-then-pause in the same tick.** Flush→append lands while `stateRef` is still 'listening' (useFreestyleSession.ts:378), anchor = t; pause sets `pausedAtRef` ≈ t (useFreestyleSession.ts:251-252). On settle, anchor' = t + span ≈ resume instant → since ≈ 0 at resume, which is the truth: the last active moment was the tap. Anchor can never exceed the settle instant because fragment ≤ pausedAt ⟹ anchor+span ≤ now (useFreestyleSession.ts:260-269). The `Math.max(0,…)` clamp at :479 is unreachable defensive slack, not a mask. **Dies.**

**V3: Discard-arm pause → Keep it → resume.** `requestDiscard` interrupts from 'listening' only, so it can't double-write `pausedAtRef` (useFreestyleSession.ts:320-324); engine is released by the follow effect's else-branch while armed (CoachFreestyleOverlay.tsx:168-170); `cancelDiscard` deliberately stays paused (comment at :326-329); `resume` → `settlePause` shifts correctly; 10s auto-disarm (useFreestyleSession.ts:331-338) doesn't touch the clock. **Dies.**

**V4: TTL interaction.** `isExpired` reads `startedAtRef` against wall `now` (useFreestyleSession.ts:421-424) — buffer *age*, deliberately not active time; the shift touches neither. Purge mid-pause wipes `pausedAtRef`/anchor via `wipeRefs` (useFreestyleSession.ts:206-215), settles to idle, disarms a pending discard (:426-436); the wake listeners (:453-461) catch slept tabs. No state in which a purged session retains a live anchor. **Dies.**

**V5 (unlisted, invented to break it): stop/fail while paused.** stop-from-paused: settle → stoppedAt S, anchor F+(S−P) → frozen since = P−F, exactly the pre-pause active silence (useFreestyleSession.ts:279-300, 471). fail-from-paused: same settle, then freeze (:361-369). `settlePause` is idempotent (null-guard :259); the invariant "pausedAtRef non-null ⟹ state 'paused'" holds on every writer path I could reach (pause :250-255, requestDiscard :320-324) and every clearer (resume/stop/fail via settle; discard/reset/switch/TTL via wipe). Stale flights can't append during the pausedAt→stateRef window — it's one synchronous block. **Dies.**

**V6: anchor vs atMs monotonicity.** Stored fragment `atMs` values are immutable and computed only while listening (open-pause span zero, :379-385); the shift never rewrites them; the next fragment overwrites the anchor with a wall stamp, discarding the shift — correct, since a fresh fragment resets the quiet clock anyway. S4 will see one consistent clock. **Dies.**

The shift is mathematically sound: `at − (F + Σspans-after-F)` equals active time since F for every interleaving I can construct. No reachable failure.

## Part 2 — Re-sweep of the full packet

- **useVoiceRecorder flights/latch**: stop→start→late-grant #1 (generation mismatch, tracks released, no state touch :147-156); start→start double-flight (older grant invalidated :138,147); double-stop in the stop→onstop window (stateRef 'recording' ≠ 'requesting', no wipe :199-213); reset during recording (handlers detached before deref :128-134). Raw double-*start* after a built recorder would leak stream #1 — unreachable through useCoachCapture's synchronous `isCapturingRef` guard (useCoachCapture.ts:200,210), and out-of-packet callers are fenced. Holds.
- **useCoachCapture lifecycle**: pagehide inside the start window (flag set before await :210, recorderStop latches the flight, late grant released); late 'recording' after latch (:164-168); unmount-while-requesting; transcribe keyed by blob identity with `.finally` self-clear (:246-256); error/auto-stop precedence (:296-300). Holds.
- **useFreestyleSpeech**: fatal-error flush-before-clear (:244-252); onend flush gated on wantListening (:255-261); backoff resets on real results (:222,280); teardown clears the pending restart timer (:181-185) so a hidden page cannot resurrect the engine; fatal path leaves `recognitionRef` live-but-dead — covered: wantListening false blocks restart in onend, and the overlay's else-branch stops/tears down on the next commit. Holds.
- **Overlay**: auto-start once per open incl. TTL-idle (autoStartedRef :106-113); hidden-pause synchronous flush→stop→pause (:136-140); fail-bridge keyed on [error, state] survives identical-string retries (:200-211); gesture starters carry isOpen + supported guards (:240-255); Escape/Tab/focus-restore orderings (:283-356). Holds.
- **Near-misses examined and killed without reporting**: 1s ticker running in 'stopped' (fenced); 'discarded' dead copy branch (fenced); Cancel dropping a pending interim (user-initiated abandon, no retention claim broken); restarts counter persisting after stop (display only); StrictMode unmount purge (empty buffer, no receipt :223-225); stateRef render-write tearing (fenced — no concurrent features).

Nothing in seven rounds of fixes regressed; nothing new surfaces under the changed anchor.

## Verdict

The round-7 fix survives every attack I could mount, including the four named vectors and the invariant edges around them. The re-sweep of recorder flights, capture lifecycle, engine restart/flush, and overlay effects confirms the prior zeros. Manufacturing a finding here would be the only defect in this round.

**FINDINGS: 0**
