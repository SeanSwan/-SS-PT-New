# Consult reply — Claude Opus 5 (anthropic/claude-opus-5) — 2026-07-31T06:53:38.995Z

> tokens: prompt=2678 completion=15030 | finish_reason: stop | max_tokens: 60000

# §A — THE SWAP INTERACTION

## A1. What "better than the Rolodex" means mechanically

**The Rolodex's fatal flaw is not that it's a list. It's that it's stateless.** It doesn't know the class, the frozen snapshot, the room, or what's already been used at minute 15. So every legality check — "is this legal for the day type, is the kettlebell free, did I already use this today, does it wreck the three knee flags" — is offloaded onto the trainer's working memory at 6am with 13 people watching. Browsing is not the cost. **Verification is the cost.**

So the replacement primitive is not a better browser. It's an inversion:

> **Rolodex = browse → verify → pick → confirm. SwapDeck = decide → commit.**

The system does the verification *before* the trainer touches anything, and presents a pre-ranked deck of **three** already-legal candidates rendered *in place of* the thing being replaced. The library is still there — demoted to a fourth tile, `Browse all (142) →`, which reuses `ExerciseRolodexPanel.tsx` unchanged. You don't throw the Rolodex away; you make it the escape hatch instead of the front door.

**One component, `SwapDeck`, three densities keyed off `SwapContext.moment`:**

| Moment | Surface | What's on screen | Taps to commit |
|---|---|---|---|
| **Build** (desktop) | Inline row expansion under the exercise | 3 candidate tiles + `Browse all` + delta preview (setup ±s, pattern shift, balance bar) | 2 (⇄, tile) — keyboard: `s`, `←→`, `Enter` |
| **Pre-class** (laptop, 60s, one hand) | Pre-flight list S1 — **only flagged rows** | "3 things to look at": equipment conflict, repeat from last Tuesday, knee-flag count spiked. Each row pre-expanded to rank-1 with a single `Use this` button | 1 per row; **0 if nothing is flagged** — screen is just `Start class` |
| **Live** (phone Floor Card, 20s) | Bottom sheet, thumb zone | Station chips across the top, then 3 candidate rows @ 88px, ≤2 chips each. No scroll, no search field, no images | **2** (station, candidate) |

**Mid-class there is no confirmation dialog.** Confirmation is haptic + the TV state change; the safety net is an 8-second undo toast. A dialog costs a guaranteed tap on every swap to protect against a mistake that happens maybe 1 in 20. Undo costs zero taps when it isn't used. This is the single biggest tap-count win over the current build-time pattern.

Why it's better per moment: build-time gains **consequence preview** (the thing a list can never show); pre-class gains **triage** (you don't open a picker at all unless the system flags something); live gains **latency and certainty** (candidates are precomputed at freeze and invalidated on class-state change, so the sheet opens in one frame — never a spinner, never an empty state, never an illegal option you have to reason about).

## A2. Ranking and surfacing

**Surface exactly 3.** Justification, not taste: Hick's law puts a 3-option decision at ~1.5s vs ~3s for 8; three 88px rows plus a header is the maximum that fits the thumb-reachable arc of a 6″ phone held one-handed without scroll; and a 20-second budget can't absorb a scroll gesture plus re-read. The 4th slot is always `Browse all →` so the ceiling stays discoverable and never occupies attention.

**Deterministic lexicographic tiers, one scoring function, moment-weighted:**

- **T0 — hard (frozen snapshot, never scored, only filtered):** legal for day type · equipment physically present *and* not committed to another station this round · not already used in this class · not contraindicated at high severity for any flagged joint.
- **T1 — joint safety** match against aggregate flags (`knee_sensitive: 3` → prefer low-knee-load).
- **T2 — movement fidelity:** same primary pattern > same primary muscle > same region.
- **T3 — setup delta:** 0 = station kit unchanged.
- **T4 — anti-repeat** (preference, per K3 — never a filter).
- **T5 — novelty / coach favorite.**

`SwapContext.moment` selects a weight vector, not a different algorithm. **Live: T3 and T1 dominate (~3×), T5 → 0** — mid-class, "the dumbbells are already there" beats "this is a more interesting movement," every time. **Build: T4/T5 carry real weight, T3 nearly nothing** — you have all night to move a rack.

**"Why" without prose: ≤2 chips per candidate, closed enum, ordered by which tier actually drove the rank.**
`same pattern` · `same kit` · `no setup` · `knee-safe ×3` · `low impact` · `not used 6 wks` · `new` · `coach favorite`

Rules that matter:
- **Two chips maximum.** Three chips is a paragraph at 6am. Pick the top-two drivers; drop the rest.
- The count in `knee-safe ×3` is the **aggregate** — it carries urgency without a name and satisfies Rule 8 by construction.
- **Chip colour: cyan for structural match (`same kit`, `same pattern`), gold for earned/history (`coach favorite`, `not used 6 wks`), gold *outline* for relaxed (A3). Purple is forbidden here** — purple means AI-coach, and these chips are deterministic. If a chip is purple, you have lied about provenance.
- Reasons **do** differ by moment because the weights differ — the same candidate legitimately shows `no setup` live and `not used 6 wks` at build time. That's correct, not inconsistent: the chip reports why *this* ranking happened.

Build-time only: the delta preview line (`setup +90s · posterior chain instead of quads`). Never mid-class.

## A3. Zero candidates — the relaxation ladder, surfaced

**Non-negotiable design constraint: the ladder must never dead-end, because mid-class a dead end is a stalled class in front of 14 people.** Guarantee it structurally, don't hope for it.

Each rung relaxes **exactly one** constraint, most-relaxable first:

| Rung | Relaxes | Visible cost to the trainer |
|---|---|---|
| **R0** | *nothing* — hard floor: equipment present, no high-severity contraindication, day-type safe | — |
| **R1** | anti-repeat across weeks | "you did this last Tuesday" |
| **R2** | novelty / variety | — |
| **R3** | pattern fidelity (same muscle, different pattern) | "hinge instead of squat" |
| **R4** | not-used-in-*this*-class | **the board says the same word twice** |
| **R5** | equipment identity → bodyweight regression of the same pattern | "no kit" |
| **R6** | *structure* — no swap exists | choose a trade-off (below) |

R5 is a **mathematical guarantee**, not a search: pin an **"always-legal 12"** — squat / hinge / push / pull / carry / core × 2 variants each, low-impact-tagged, zero equipment, legal in every room profile. R5 therefore cannot return empty, so R6 is only reachable when the trainer *rejects* bodyweight.

**UI: never render an empty state.** The deck always has three rows.
- All rows from R0 → header reads `Swap station 3`.
- Any row from R1+ → header becomes `Swap station 3 — no exact match`, and each relaxed row gets a **gold outline** plus one chip naming the bent rule (`repeats R2`, `hinge not squat`, `no kit`). The trainer is choosing which rule to break, knowingly, in one glance.
- At R6 the deck shows two actions instead of three exercises: `Hold station 3 longer (tempo / iso)` and `Drop station 3 → 3 stations, 5 per station`. **The system never says no; it offers the two structural outs and lets Sean pick.**

Volume differs by moment, and this is important: at **build time the ladder is loud** — "we can only fill 6 of 8 stations without repeating; here's what I'd relax" is a plan defect and deserves a full modal. **Pre-class it's a single flagged row.** **Mid-class it is silent until asked** — never a proactive warning while a class is running.

## A4. Blast radius

**Default scope: all remaining rounds.** Reasoning: the reason you swapped (a bad knee, a broken rack, a movement failing at scale) does not resolve in four minutes; it's one decision instead of N; and a station whose exercise changes every round is **unreadable at 20 ft** — you break the mental model 14 people just memorised.

**Default timing: the swap commits at the next round boundary, not instantly.** This is the non-obvious call and it's the one I'd defend hardest. Mutating a station while people are mid-set is precisely the event that makes fourteen heads look up confused, and the immediate individual need is *already served by the mod line* (see A5). A long-press on the candidate gives `Change now` for the genuine emergency (equipment pulled, someone dropped a plate on the station).

**TV, two states, both anti-flicker:**
- **Pending:** station 3 card gets a thin cyan bottom rule and a `next round: Bulgarian split squat` line at ~40% of the exercise size. No animation, no flash, no toast, no modal — ever.
- **Applied:** the change lands *inside the round-transition screen that already exists* — which is free attention, everyone is already looking. 400ms cross-fade on that one card, 2s cyan underline pulse, decays to normal. No board re-render, no layout reflow.

**Undo:** 8 seconds (not the usual 5 — the trainer's eyes are on the room, not the phone), Floor Card + console only, **never on the TV.** After the window closes, undo is not a stack — the previous exercise is simply re-injected at rank 1 of that station's deck with a `was here` chip. Restoring prior state as a first-class candidate beats a time-boxed undo and costs one data field.

Scope *control* (this round / all rounds / save to template) exists at build and pre-class where time is free. **Do not put a scope selector in the live sheet** — it's a third tap and a decision, spent on a case that's rare.

Every swap appends to `ClassPlan.log`: `{actor, moment, stationIdx, from, to, rung, appliedAtRound, ts}`. That log is what feeds anti-repeat and the "it remembers" axis.

## A5. The dignity case — swap is a station tool, never a person tool

**This is the most important line in the feature, so state it as a rule and enforce it in the type system: there is no per-person swap. Ever.**

Three independent reasons, any one sufficient:

1. **The data model forbids it.** The system knows `knee_sensitive: 3`, not Jane. A person-level swap requires the console to name a person — which is the exact announcement Sean is trying to avoid, and it punches a hole in the aggregate-only contract (Rule 8).
2. **Wrong blast radius.** A swap changes the board for 14 people to serve 1.
3. **It's invisible to its beneficiary.** The TV shows stations, not people. A per-person swap renders nowhere the person can see it. It is a control with no output.

**The decision rule:** the mod line handles the person. The swap handles the station. Escalate only when **the mod line cannot fix it for everyone in the rotation.**

- **Someone winces and the station is otherwise fine → do not swap.** The card already carries Board 2 (`Sub: box squat`) and Board 3 (`Easier: hands on wall · Harder: 3-1-3 tempo`), always visible, never behind an interaction. The coach walks over, points at line 2, says one sentence. **Zero system interaction.** That's the feature working.
- **The Floor Card's primary job at a station is therefore to be a cheat sheet, not a control.** Tapping station 3 must open **Mods** — the three lines, set at arm's-length legibility — with `Swap station` as a *secondary* button underneath.
- **Concrete defect callout:** the packet's mid-class model, as written, makes swap the primary station action. Invert it. Frequency check: pointing at a mod happens ~5×/class; swapping happens 0–1×/class. Optimise the interaction hierarchy for the 5, not the 1.
- **Escalate to a swap when:** ≥2 attendees at that station are flagged for the loaded joint (flag count ≥ people-per-station ÷ 2) · equipment broken or occupied · form breaking down across the group · the coach simply doesn't like it. That's it.

**Then close the loop where it belongs — at build time.** Add one zero-friction, anonymous tap on the Floor Card: `mod used` (a tally, no name, no dropdown). Post-class review later says: *"The knee mod was used in 3 of the last 4 classes at the squat station — replace it in the template?"* The individual accommodation becomes a **plan improvement**, which is the correct place for it, and no one is ever named. That's the "it remembers" axis doing real work with a one-tap input.

**Also verify:** aggregate flag counts must never render on the TV. `knee ×3` is console/Floor-Card only. If that leaks to a 55″ screen you have built the exact opposite of a dignity feature.

## A6. Floor Card vs Trainer Console

**Floor Card only (phone, in hand, walking, sweaty, one thumb):** current round + mirrored `ENDS 6:47` (so the coach never turns around) · **station mod lines — the highest-value item on the device** · per-station aggregate flag chips · `mod used` tally · `±30s` / pause · `Swap station` (secondary) · undo toast. 88px targets, dark, glove-tolerant.

**Never on the Floor Card:** attendance editing, full library browse, plan restructuring, video, analytics, anything needing two hands or a paragraph.

**Console only (laptop, front of room, drives the TV):** TV/fullscreen/WakeLock ownership · timer master · round transitions · music duck · **the relaxation ladder in full, with rung labels and trade-offs** · attendance + latecomers + station rebalance · whole-plan drag-reorder · structural fallback (drop station, redistribute) · save-as-template · demo cueing · incident note · `Browse all`.

**Never on the console:** anything that requires standing next to a person. And the console must survive 40 minutes of abandonment — no session expiry, no modal that can occlude the TV window.

**One architectural hole to name:** laptop↔TV is same-origin `BroadcastChannel` (correct, zero network). **Phone↔laptop is not** — different device, different origin. If the packet assumes the Floor Card is a live controller, it has silently reintroduced the network you removed in 0.2. Honest resolution, consistent with demoting the phone: **the Floor Card is read-mostly with optimistic local writes and eventual sync; if it can't reach the laptop it degrades to a pure cheat sheet** — which is ~80% of its value anyway. One writer per action, monotonic `ClassPlan` version, console wins ties.

## A7. Cut from the swap feature

**Exercise demo video / GIF thumbnails inside the swap flow.** It demos beautifully and dies at 6am: decode latency in the one interaction that must be instant, layout shift on a 20-second budget, bytes on gym wifi, and it competes with the chips for the only two seconds of attention available. Sean already knows all ~140 exercises in his own library — he needs *legality*, not *identification*. Allow it build-time only, behind hover, lazy-loaded. Kill it pre-class and live.

Runners-up I'd also cut without much argument: mid-class search-as-you-type · proactive "AI suggests a swap" nudges during a live class · multi-level undo history · starring favourites mid-class · drag-to-reorder on the phone.

---

# §B — RANKED CUT LIST

*Scored value ÷ effort. Items I can name from the record; anything in packet §5 not listed here didn't reach me verbatim — apply the same rubric.*

## Ship in V1 — without these it fails at 6am

| # | Item | V÷E | One line |
|---|---|---|---|
| 1 | `ClassPlan` schema + immutable freeze snapshot | ★★★★★ | Everything else is a pure function of it; get it wrong and you rewrite twice. |
| 2 | One-click activation (fullscreen + WakeLock + AudioContext + first `play()`) — **absorbs "TV sleep timers"** | ★★★★★ | Without it the TV is black at 5:59. Two days' work. |
| 3 | Absolute epoch `segmentEndsAt` + resume prompt | ★★★★★ | rAF-accumulated drift ends the class at the wrong minute; unfixable later. |
| 4 | TV type scale in `vh`, max 4 cards @55″, `tvDiagonalIn` on the space profile | ★★★★★ | Illegible board = no product. Pure CSS. |
| 5 | Printed station cards | ★★★★★ | The zero-risk fallback for every failure below. Half a day. |
| 6 | Mod lines (Board 2/3) always visible | ★★★★★ | Sean's dignity requirement *and* the answer to A5. Data + layout, no logic. |
| 7 | `SwapDeck` live: 2 taps, 3 candidates, ≤2 chips, queued-to-boundary, 8s undo | ★★★★ | The literal ask. Alternatives engine already exists. |
| 8 | Relaxation ladder + **always-legal 12** bodyweight fallback | ★★★★ | Prevents the only truly unrecoverable state: a stalled class. |
| 9 | Small-class collapse (n=4, not 8–16) | ★★★★ | If the real 6am is 4 people, an 8–16 engine is wrong on day one. Adversarial pass is right. |
| 10 | Zero-decision morning / pre-flight flag list | ★★★★ | §1's >45s setup death clause. Mostly a filter over existing checks. |
| 11 | No-auth-required local run + IndexedDB checkpoint + offline pre-flight cache | ★★★★ | Collapses "session expires at 5:58," "gym wifi," and "browser killed at min 12" into one local-first fix. |
| 12 | Latecomer counter → recompute people-per-station | ★★★★ | Happens every class; scope it to a `+/-` control and it's an afternoon. |
| 13 | Round-change audio: loud, mid-frequency, gym-music-survivable chime + volume slider | ★★★ | Minimal version only. Ducking/OS integration is fast-follow. |
| 14 | Swap/mod **logging** (not the review UI) | ★★★★ | Anti-repeat and "it remembers" need the log to exist from class #1. Append-only, trivial. |

## Fast follow

| Item | Why it waits |
|---|---|
| Post-class review + `mod used` → template suggestions | The log (V1 #14) preserves the data; the UI can arrive in v1.1. |
| Class turnover / 3-minute reset for back-to-back | Real, but Sean can reload a page twice. |
| Substitute trainer via QR | High value the day it's needed; the printed cards (#5) cover the gap. |
| Incident capture | Legally nice; a phone note works for one release. |
| Build-time delta preview (setup Δ, balance bar) | Pure upside, zero risk of failure without it. |
| Template library / save-as-template | Second-class-onward value; first class has nothing to reuse. |
| `Browse all` Rolodex reuse, polished | Component exists; leave it as-is in V1. |
| Multi-swap "shuffle this round" | Build-time luxury. |
| Audio ducking over gym sound system | Needs hardware reality-testing; #13 is enough. |

## Cut

| Item | Why |
|---|---|
| **Per-person swap** *(packet treats as mandatory — cut it)* | See A5: violates the aggregate data model, wrong blast radius, invisible to its beneficiary. The mod line is the answer. |
| **LLM prose reasons** *(re-affirming 0.4)* | Layer-3 backfill fabricates justifications. Fact chips only. |
| **Phone-as-TV-mirror / cast-from-phone** *(packet treats as central)* | Two different screens, not one (0.2). Delete the whole code path. |
| **Live cross-device sync as a hard requirement** *(implicitly mandatory)* | Reintroduces the network you removed. Degrade the Floor Card to a cheat sheet instead. |
| **Demo video in the swap flow** | A7. |
| **Anti-repeat as a legality constraint** *(currently modelled as hard)* | Pool exhaustion mid-class. Ranking preference (T4) only. |
| Mid-class search field | You cannot type one-handed in 20 seconds. |
| Proactive AI swap suggestions during a live class | Unsolicited interruption at the worst possible moment. |
| Multi-level undo history | One level plus "previous exercise at rank 1" is strictly better and cheaper. |
| Participant-facing app / per-person check-in | Different product. |
| Leaderboards for a 6am circuit | Only coherent for AMRAP (§6.3); not for stations. |
| Analytics dashboard v1 | The whiteboard already solved this: Sean remembers. |
