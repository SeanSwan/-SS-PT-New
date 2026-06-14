# Chromie Pressure-Test: SwanStudios Embedded RPG Game

**Date:** 2026-06-14  ·  **Status:** complete — VERDICT: DEFER (bank, don't kill)  ·  **Chains from:** [grill-me doc](swanstudios-rpg-game-2026-06-13.md)

## Summary
Strategy pressure-test on whether to build the embedded RPG game (the 3D + unification layer over the ~60%-built gamification/avatar stack), and crucially WHEN — given it is not on the current Business Priority Order.

## The Bet (one sentence)
*A 3D living-avatar RPG that turns real logged workouts into visible, addictive progression will lift retention/adherence enough to justify building it ahead of (or alongside) the revenue-critical priority stack.*

## Founder panel used
Default: Mark Zuckerberg (growth loop / one metric) · Bill Gates (defensibility) · Sam Altman (10x / why-now-why-you). Swappable per Sean.

## Q&A Log
<!-- appended after every exchange: question → founder lens → Sean's answer → what it exposed -->

### CQ1: How many genuinely active (weekly-logging) users right now? — Zuckerberg lens
- **Sean's answer:** Single digits (0–10).
- **What it exposed:** The bet-as-framed (lift retention/adherence) FAILS the first gate. Retention features have nothing to retain at single-digit DAU. Confirms the prior roadmap call (defer gamification depth until 50+ active users). The ONLY way the game justifies jumping the line now is if it is an ACQUISITION / differentiation / conversion weapon, not a retention feature. → CQ2.

### CQ2: What job is the game actually doing for the business at single-digit users? — Altman lens
- **Sean's answer (honest):** "Honestly retention/vision — it's for later."
- **What it exposed:** Bet RESOLVED. The game is a retention/vision asset, explicitly not an acquisition/conversion play right now. Sean conceded the sequencing point directly. No distribution mechanism claimed → no basis to jump the revenue/acquisition stack. Verdict path = DEFER (bank it, don't kill it). The interview can stop — the load-bearing unknown (why-now) is answered.

## The Spec
The product shape is fully captured in the [grill-me doc](swanstudios-rpg-game-2026-06-13.md) (Q1–Q7 + Phase 2 + MVP order). Not duplicated here — Chromie defers detailed spec/build planning to swan-orchestrator (rule 15). The Chromie-relevant spec point: **V1 = a thin vertical slice** (R3F + champion driven by real `ClientProgress` level/tier + power-surge + tier-ascension + Home widget + 2D fallback). One success metric *when built*: D7 return rate of users who have seen their champion vs. those who haven't.

## 3 Ways This Fails
1. **Built-too-early tombstone.** Ships at single-digit users; almost no one plays it; the engineering + asset time it cost meant Swan Coach / trainer logging / acquisition slipped, so the base never grew. A beautiful feature for users who never arrived. — *Mitigation: DEFER until a base exists (this verdict).*
2. **Data-truth amplifier (the dangerous one).** The avatar is driven by progress/level data. Chart-truthfulness is still an OPEN priority-stack item (#3) — some progress data is still mock/placeholder. If the champion shows a tier/level derived from wrong data, users lose trust in the WHOLE app, not just the game. The game *magnifies* every data-truth bug into an emotional, front-and-center lie. — *Mitigation: hard-gate the game behind completion of the chart/KPI truthfulness work. This makes the sequencing structurally correct, not arbitrary — the game DEPENDS on the truthful-data layer the stack delivers.*
3. **Permanent maintenance tax on a solo+AI build.** R3F + 3D asset pipeline + perf budget + mobile (React Native expo-gl) + 2D fallback = a large new surface to maintain forever (rule 4 caps, mobile parity, asset re-gen). At single-digit users that tax is paid for ~zero return and competes with revenue work indefinitely. — *Mitigation: keep V1 a thin slice; do not expand (pet 3D, vault theater, rooms, social) until usage justifies each.*

## Absence-First Gaps (ranked by value left on the table)
*What's ABSENT from the overall plan that the game distracts from — ranked by money/value left on the table:*
1. **(Highest) There is no acquisition engine — nothing in the plan reliably gets you users #11–#100.** This is the single biggest pile of money on the table. The game doesn't touch it. Neither, fully, does the current stack. A real acquisition motion (content/YouTube funnel per your video-library strategy, local SEO, a trainer/client referral loop) is the work that actually changes the business. *This should have your energy, not the game.*
2. **Conversion of existing free Move Fitness clients → paid SwanStudios clients.** Revenue sitting in existing relationships. Trainer logging + truthful progress charts (stack items #2/#3) are the proof-of-value that converts them. The explicit conversion mechanic (the moment/offer that flips free→paid) is absent and worth designing.
3. **The game's OWN missing acquisition hook.** IF it's ever to pull its weight, the deferred game needs a marketing/demo motion (the screenshot/short-video moment → content → signups). That's absent today. When revisited, pair the game with a content plan or it stays retention-only and the cycle repeats.

## Verdict (BUILD / RESHAPE / KILL-or-DEFER)
**DEFER — bank it, don't kill it.** The vision is strong and ~60% built; the *timing* is wrong. Build it when it can actually pay off.
- **Revisit trigger (both must be true):** (a) ≥ ~50 weekly-active users (your own threshold), AND (b) chart/KPI truthfulness work complete (the game's hard data dependency — failure mode #2).
- **What's banked:** the full grill-me vision doc + this pressure-test. When the trigger fires, skip straight to swan-orchestrator → swan-design-router → the thin V1 slice. No re-thinking needed.
- **Status:** Sean's call — Chromie recommends DEFER; Sean/Fable decide.

## Open Flags
- [x] Central tension RESOLVED: retention feature vs early-stage base → DEFER until ≥50 weekly-active + truthful-data complete.
- [ ] Next-best use of energy is an ACQUISITION engine (gap #1) — not currently a named plan. Worth its own grill-me/chromie.
- [ ] Cheap win available now: reconcile stale gamification docs (`GAMIFICATION-SYSTEM.md` + memory) to reflect actually-shipped state (pending Sean's yes).
