# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/bootcamp-creator-v2-master-prompt-2026-07-30.md
**Seed:** (none)
**Tokens:** 6056 in / 6500 out | **Cost:** ~$0.1157 | **Wall:** 205.6s

---

# ADVERSARIAL REVIEW — Section 9 (Kimi remit)

Scope acknowledged: §2 infrastructure is preserved per §8.1. Everything below attacks the *re-architecture*, not the plumbing.

---

## 1. Attack on the three-layer architecture (§6.1)

### 1.1 The layer assignment has a category error: anti-repeat is not a constraint

§6.1 Layer 1 lists "anti-repeat vs class log" as a **legality** constraint. That is wrong, and a 6am class will prove it within a month. Concrete case: upper-body day, strict equipment profile, Sean owns 8 upper-body-legal exercises after filtering, he ran 6 of them last Tuesday. If anti-repeat is a Layer-1 legality rule, the pool is now size 2 and the class needs 12 slots. You have rebuilt D1 with extra steps — either the engine fails closed and violates its own invariant "THE CLASS ALWAYS GENERATES" (§6.1 Layer 3), or it silently relaxes and you've reintroduced the leak through the back door, this time with no D1-style code comment to blame.

Anti-repeat is a **preference**, and preferences belong in Layer 2 ranking. The diagram's own §5.6 language ("don't repeat last week's picks") is a quality goal, not a contract. Move it.

### 1.2 Aggregate pain flags will over-constrain the pool

Rule 8 forces Layer 1 to receive `knee_sensitive: 3` rather than names. Fine for privacy, fatal for programming: the constraint engine cannot distinguish "3 of 14 with knee flags" from "12 of 14." As specified, Layer 1 must either exclude all high-impact work class-wide (destroying the class for the 11 healthy people) or ignore the flag (liability). The correct mechanism — per-person Board 2/3 modifications, which already exist (§2.6, `BootcampBoardViews.ts`) — is a **display-time and Layer-2 concern**, not pool exclusion. §6.1 as drawn forces the dumbest possible answer. Joint-load *budgeting* (§5.10) as a pool-level constraint is defensible; blanket exclusion is not, and the document doesn't say which one Layer 1 does.

### 1.3 "Rejected and deterministically backfilled" — backfilled from *what*?

Layer 3 says violations are "deterministically backfilled." Backfill draws from the same legal pool the brain already picked from. If the pool is exhausted, backfill is empty and the validator fails closed — dead class, violated invariant. If the pool is not exhausted, backfill picks the brain's rejects, i.e. the validator overrides judgment with the exact ranking-bypass behavior D4 was diagnosed as. The validator as specified handles **illegality**, but the diagram gives it no stated behavior for **insufficiency**. The relaxation ladder — which constraint yields first, second, third when the pool can't fill the structure math — is the single most important policy object in this architecture and it appears nowhere in §6.1 or §10. DoD #1 tests the happy path and the exhausted path's *legality*, but nothing tests *which* constraint relaxed.

### 1.4 The order is right for safety and wrong as drawn for quality — and §4-E already breaks it

Constraint-then-brain-then-validate is the correct spine. Brain-proposes-constraints as the primary flow is a safety inversion — the LLM would be authoring its own legality boundary, and Rule 8 plus D1–D4's history say no.

**But the pipeline as drawn is strictly one-directional, and that's the real flaw.** The brain needs a *negotiation channel*: "pool contains no hinge pattern under current constraints; request relaxation of anti-repeat" or "request equipment assumption: med balls." And here's the hostile part: **§4-E already requires this and §6.1 already forbids it.** Open Gym mode says "the brain proposes freely, and *states its equipment assumptions*." A brain proposing exercises against no equipment profile is a brain proposing constraints. §6.1 says the brain "may NEVER introduce an exercise outside the pool." These two sentences cannot both be true. Open Gym is brain-proposed-constraints smuggled in as a product requirement with no architectural home. Resolve it honestly: add a formal **assumption-declaration output channel** on Layer 2 (brain emits pool + declared assumptions + rationale; Layer 3 validates the assumptions are *stated and equipment-plausible*), or admit Open Gym bypasses Layer 1 and say so in the diagram.

### 1.5 The validator proves legality, not quality — and DoD only tests legality

Fatigue sequencing (§5.9) is assigned to Layer 2. The validator re-checks "the Layer-1 contract." So a class with three consecutive posterior-chain stations **passes validation**. DoD #1–#4 are all legality tests. Nothing in §10 proves the brain's judgment layer did anything. You can ship V2, pass all ten DoD items, and have a system where the Swan Coach brain is decorative — the deterministic fallback (DoD #5's failure path) would produce an indistinguishable product. That's the exact §2.4 split surviving the rebuild in a trench coat. Add a DoD item: *a judgment regression suite — fixed pool, fixed history, brain output must beat the ranked-deterministic baseline on defined sequencing/variety metrics.*

### 1.6 Latency is unspecified

LLM-in-path generation with no stated timeout, no stated UX during the wait, no stated partial-response handling. At 5:50am Sean taps generate; 25 seconds of spinner; timeout; fallback ships. Fine — but say it. And make generation **idempotent and persisted**: if Sean refreshes mid-generation or the tab dies, he must get the same class back, not a coin flip between brain-class and fallback-class depending on retry timing.

---

## 2. Failure-mode enumeration

**AI timeout mid-generation.** As above: treat partial output as total failure (no half-parsed JSON), fall back deterministically, persist the result, surface a one-line "generated offline — coaching cues unavailable" badge so Sean knows which brain made his class. DoD #5's wording ("AI failure still ships a valid class") quietly concedes the brain is optional; at least instrument the fallback rate or you'll never know the brain was down for three weeks.

**Equipment profile edited during a live class.** §5.3's pre-cache helps the *Runner*, but DoD #7's mid-class swap queries a pool. Pool against *which* profile — live DB or the snapshot frozen at class start? If another admin (or Sean's own phone) edits the profile at minute 15, swap candidates computed against the live profile may reference equipment not physically in the room. Rule: **the class start freezes an immutable constraint snapshot; all mid-class operations validate against the snapshot; profile edits apply to the *next* class.** This snapshot semantics is stated nowhere in §6.

**Roster changes at the door.** Three cases, three different answers, none specified: (a) headcount +3 → station occupancy and the §5.8 quantity check recompute cheaply — do it live, flag infeasible stations, don't regenerate; (b) new pain flag at the door → update that person's Board 2/3 display line (§6.3 already shows modification lines), never regenerate; (c) walk-in with no client record → §8.2's attendance/log-back write breaks. DoD #9 as written fails on guests. Define a guest-attendance path or scope DoD #9 to registered clients explicitly.

**Network loss at minute 20.** The Runner survives per §6.3 — *if* the pre-cache actually landed. 4K demo video × ~20 exercises is potentially gigabytes; service-worker cache quota on a laptop browser is not a rounding error, and §5.3 says "pre-cache" with no size budget, no partial-cache degradation behavior (video missing → static image → text? say it), and no pre-flight check ("class fully cached ✓" before the start button unlocks). Separately: **§8.3's phone remote — what transport?** If remote sync is cloud-relayed, minute-20 network loss kills the remote even while the TV keeps running, which is exactly when Sean is mid-floor and needs it. LAN-direct sync (WebSocket/WebRTC on gym Wi-Fi, or the laptop hosting a hotspot) is the only answer consistent with §5.3, and the document never says it.

**Phone-remote desync.** The pure state machine (§6.2) is the right foundation, but you now have **two writers**: the laptop's clock auto-advancing and the phone issuing commands. Nothing in the document defines authority. Required and absent: laptop is single source of truth; every `RunnerState` carries a monotonic sequence number; phone commands carry a base-version and are idempotent ("pause" against already-paused is a no-op, not an error); rejected commands trigger full-state resync on the phone. Without this, Sean taps "pause" on a 4-second-stale screen, the command lands in the wrong phase, and the class skips a station. This is the failure mode §8.3's "not a bolt-on" language gestures at without specifying.

**Wake-lock denied.** §5.1 says "a fallback" and names none. Facts: `navigator.wakeLock` is *released on tab visibility change* and must be re-requested on `visibilitychange` — the classic bug where one alt-tab at minute 8 kills the lock silently. iOS Safari only gained support in 16.4 — the phone remote on an older device will sleep mid-class. And wake-lock protects the *laptop*, not the *TV*: consumer TVs have their own sleep/auto-off timers that no web API touches. The honest fallback set: detect denial → persistent on-screen warning + audio heartbeat; document TV settings in setup; treat wake-lock loss as a loud failure, not a silent one.

**Ones the prompt didn't list, same severity:** browser tab crash/OOM from pre-cached 4K video mid-class → checkpoint `RunnerState` to IndexedDB every phase transition, reload resumes in-place (the pure state machine makes this nearly free — no excuse for omitting it); **audio autoplay policy** — the first beep is silently blocked until a user gesture, so the Runner start button must be the gesture that unlocks the AudioContext, tested; backgrounded-tab throttling — §6.2's monotonic clock handles drift but not a backgrounded tab where rAF stops entirely; drive ticks from `setInterval`/Web Worker or the WebAudio clock; Bluetooth speaker disconnect mid-class; HDMI unplug → fullscreen exits → window lands on the wrong display; **auth token expiry at 5:58am** — a cold laptop, a browser that updated overnight, and an expired session is the most probable week-one failure of all, and nothing in §5 or §10 mentions session survival for the Runner.

---

## 3. What §5 misses that a 6am class exposes in week one

1. **The TV itself.** §5.1 covers laptop wake-lock; consumer TVs sleep, screensave, and auto-switch inputs. Week one, the gym's TV reverts to the cable box. Setup checklist / TV-settings documentation is a product feature, not an afterthought.
2. **Audio over music.** §5.2 assumes cues are audible. TV speakers against a gym playlist at 6am — inaudible. Missing: cue routing (gym PA vs TV), volume independence, music ducking. Open Q6 (beeps vs voice) is downstream of "can anyone hear it at all."
3. **Latecomers at 6am.** §5.4 handles *Sean* starting late; nothing handles half the room arriving at 6:07 into a warmup that started at 6:00. Warmup loop-until-ready / late-join cue.
4. **Small-class collapse.** §8 assumes 8–16. The real 6am class is 4. Station math built for 12 yields empty stations and dead transitions. Min-headcount handling (merge stations, convert to full_group) is unspecified.
5. **No-morning-decisions flow.** Sean at 5:45am should make zero choices. §5 never says "generate tonight, run tomorrow" — the saved-template → one-tap-start path (templates exist, §2.1) needs to be the *default* Runner entry, and open Q4's schedule knowledge (today is lower day) is what makes it zero-touch.
6. **Turnover between classes.** 6:45 end, 7:00 start. Runner `complete` must exit cleanly to a reset state — equipment reset checklist, next class queued. §6.3's state machine ends at `complete` and thinks it's done.
7. **The substitute trainer.** Sean's sick day, week two. A staff member with zero training must run the class — QR-on-screen to join as remote, no login. Nothing in §5 contemplates a non-Sean operator.
8. **Incident capture.** §5.5 covers pause for an injury; the loop back to `bootcampPainAlerts` (§2.1) — logging which exercise, for whom — is missing, and it's the cheapest safety-credibility feature available.

---

## 4. Attack on the portable-core seam (§6.2)

**DoD #8 proves nothing.** "Zero SwanStudios imports" is a lint rule. You can have zero imports and total semantic coupling — every type in `types.ts` shaped by Swan's domain, every port interface calcified around Swan's only implementation. The hostile test isn't the import scan; it's: *can a third party implement the ports without knowing what a "board" is?* On the current sketch, no:

- **`DayType` is a Swan leak wearing a generic name.** §2.2's `DAY_TYPE_MUSCLES` is literally Sean's four gym rotations. If `types.ts` ships `DayType = 'lower_body' | 'upper_body' | 'cardio' | 'full_body'`, the core is Swan's schedule with the imports removed. §8-open-Q4 says "design the day-type contract to be extensible" — that sentence is doing all the work and has no mechanism. Day types must be a *registry/config object* passed into the constraint engine, or this is leak #1.
- **Board 1/2/3 is Swan pedagogy.** §2.6's main/joint-friendly/low-impact boards are Swan's modification system. If `ClassPlan` or `RunnerState` embeds board lines as first-class fields, every future consumer inherits Swan's coaching model. Modification variants belong behind a `ModificationPolicy` port or as a generic `variants[]` on Exercise.
- **`Exercise` will be shaped by `exerciseRolodexBridge`.** Setup-time estimates (§2.1), media-readiness, 4K preview media (§2.6) — if those are required fields on the core `Exercise` type, the "portable" exercise schema is Swan's Rolodex schema. The muscle token taxonomy (`anterior_deltoid`, §2.2) is likewise Swan's; core must define its own minimal taxonomy with adapter-side mapping, or adapters in other apps are translating into Swan's anatomy to use a "portable" package.
- **`BrainPort` will calcify around the Swan Coach prompt.** The only implementation that will ever exist in V2 is Swan Coach, and the interface will accrete whatever the prompt needs — aggregate flags like `knee_sensitive: 3` (§6.1) are *Swan's pain model* wearing a generic hat. One implementation, zero forcing functions for generality.
- **`runner/` assumes station-based formats.** `station_transition` (§6.3) is a bootcamp-shaped phase. Fine for a bootcamp core — but `FORMAT_CONFIG`'s 30+ formats (§2.1) are Swan's; which live in core `structure/` and which in the Swan adapter is undecided and will default to "all of them in core," which is Swan's programming library, not a portable kernel.
- **Gravity has no counterweight.** Every future Swan feature needs a new core field; nothing resists. No governance, no minimality rule, no second consumer.

**The fix that fits §8 scope:** the genuine decoupling proof is a **second reference adapter** — a tiny in-memory demo app inside `packages/bootcamp-core`'s own test suite that implements all five ports (`ExerciseSource`, `EquipmentSource`, `HistorySource`, `BrainPort`, `MediaSource`) with fake data and runs a full class end-to-end. If the fake app needs to know what a board is, the seam failed. Add this to §10 as the real DoD #8 — the import check stays, but it's the floor, not the ceiling.

---

## Verdict

The three-layer spine survives hostile review — constraint-first is correct — but §6.1 as written contains a category error (anti-repeat as legality), an unspecified relaxation ladder, a validator with no insufficiency behavior, an unresolved contradiction with §4-E, and a DoD suite that can pass with a decorative brain. §6.2's portability is currently asserted, not demonstrated, and at least four Swan concepts (day types, boards, exercise schema, pain flags) are queued to leak through the ports. The failure-mode surface — snapshot semantics, remote transport and authority, cache pre-flight, session survival, the TV's own sleep timer — is the difference between a demo and a product that survives week one at 6am.
