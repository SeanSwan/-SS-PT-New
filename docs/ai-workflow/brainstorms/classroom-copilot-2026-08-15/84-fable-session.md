# Fable 5 — Independent hostile pass (written BEFORE reading the other three replies)

**Reviewer:** claude-fable-5 (in-session, Final Decider)
**Scope:** the workstream as a program — decisions, sequencing, omissions.
**Recorded pre-arbitration so the Final Decider's own findings are not anchored by the panel's.**

## VERDICT
This workstream has produced excellent design and zero delivery: two days, ~15 model calls,
seven published artifacts, thirteen defects found and fixed — and T has not received one
physical object, while the deadline the whole plan was anchored to (school start) has already
passed. The single most important next act is not another design round; it is O printing three
pieces of paper and running the runbook. Everything else in this review is subordinate to that.

## HOSTILE FINDINGS (ranked)

1. **Delivery inversion.** The review loop optimised for artifact rigor over the one metric
   that matters — whether T has help. The paper half was shippable after round 3; four further
   rounds hardened the digital half while the install date slipped past the school-start
   anchor. Discipline became displacement. Fix: the forward plan's step 1 must be an install,
   and nothing may be inserted before it.

2. **The H0 gate now measures a stale premise.** The 5-day gate was designed for
   setup-before-term. Term started; setup now lands mid-first-week — the single most
   overloaded week of her year, i.e. the worst adoption window the design could have picked.
   Nobody re-examined the gate's timing assumptions after the anchor passed. Fix: the gate
   still runs, but week-1 results must be read as directional-low, not disqualifying; a failed
   gate in week 1 warrants one re-run in week 2 or 3 before any kill decision.

3. **Scope tripled with zero evidence arriving.** Original ask: one app. Current inventory:
   H0 package + Switchyard + Desk + coach-architecture port + production-system advisory +
   Rule 82 + vault architecture. The evidence-gate discipline was honored in letter (S1 not
   built) and violated in spirit (three other systems designed instead). All of it rests on
   the unvalidated assumption that T will use anything at all. Fix: hard WIP limit — no new
   system enters design until the gate has produced its first data.

4. **The coach-architecture port is a pre-evidence commitment.** It is architecturally right
   AND it is O's enthusiasm for his own system; both are true. If the gate fails, the port is
   dead weight. Fix: the port spec is written only after the gate passes. Its first slice is
   already known (compress the ~90-line proposal contract for a 14B and test against the
   held-out corpus; the sorter prototype becomes the deterministic layer) — that goes in the
   handoff as a sealed instruction, not as work to start.

5. **Rule 82 is cited as law and exists only as a draft.** Every packet since its drafting
   says "RULE 82 —" as if in force; it lives in a brainstorms folder on a branch 1,950 commits
   behind main. Either O says go and it is hand-applied to both constitution files on main as
   #82, or packets stop citing it as standing law. The status mismatch is exactly the class of
   overclaim this workstream keeps catching in others.

6. **The production minors check is mis-prioritised as routine.** Verified: the waiver schema
   supports guardian-signed minors. If minors are active AND their records reach the AI chat
   pipeline, the live system is today sending minor health data through an identity-blind
   layer whose insufficiency for closed cohorts two models just established. That is a
   ~30-minute targeted read of pipeline callers, and until it runs, the Kimi-vs-GLM production
   split cannot be resolved. It belongs in this week, not "later."

7. **The loop fed itself.** 8 of 13 defects were introduced by fixes. The fix-then-rereview-
   per-finding cadence maximises this. Future loops: batch all fixes from a round, re-review
   once, and rotate the model on every confirmation pass (the R4 lesson — a same-model pass
   is an echo).

8. **T's consent is assumed, not obtained.** T asked a chat assistant to help her get
   organised. O has commissioned an ecosystem. Nothing in two days includes T seeing the plan
   and saying what she actually wants. The for-her page exists for exactly this; it has not
   been shown to her. Fix: showing it to her is part of install night, and her reaction is
   recorded as gate data.

9. **Handoff surface risk.** The project folder now holds ~30 files. Without a single entry
   point with an explicit reading order and a do-not-re-derive list, the next agent burns its
   first session re-reading consults and re-litigating settled decisions — the precise failure
   the continuity system exists to prevent.

## FORWARD PLAN (Fable draft — to be arbitrated against the panel's three)

1. **TONIGHT — O:** print the three paper artifacts; run the H0 runbook end-to-end including
   her hands-on test and the offline proof. Gate: she closes and reopens the assistant
   herself. Effort: ~1 evening. **Nothing may be sequenced before this.**
2. **THIS WEEK — T:** the 5-day tick-box gate runs; O supports per the watchlist and does not
   build anything. Gate: 5 school days elapse.
3. **THIS WEEK — O (30 min):** production minors check — do guardian-signed users exist as
   active clients, and can their records reach the AI pipeline? Gate: a yes/no with file:line.
4. **THIS WEEK — O (one conversation):** director — approval wording/tier, child data on
   personal devices, school incident-form process. Gate: answers in writing, even informal.
5. **ON O'S GO — next agent (30 min):** Rule 82 hand-applied to both constitution files on
   main as #82. Gate: constitution-guard passes; both files carry identical rule text.
6. **WEEK 2, IF GATE PASSES — T + O:** ship "two lanes and a rule" (a sentence, not a tool).
   The Desk is deferred until the middle lane (named-but-ordinary traffic) proves significant
   in her real usage. Gate: two weeks of lane observation.
7. **WEEK 2–3, IF GATE PASSES — next agent:** coach-architecture port spec, first slice as
   sealed in finding 4. Gate: compressed contract ≥ the held-out corpus baseline (53.3%)
   with zero child-link violations on a 14B.
8. **BACKGROUND — next agent:** Village plan-mode fix (`debatePanels` into the `:2203` gate).
   Small, unclaimed, unblocks future flat runs.
9. **AFTER 1–8 — everything else.** S1 app build only after: gate passed + laptop-location
   answered + parent-app-scope answered.

## RESOLUTIONS (Fable, pre-arbitration)
- **H0 install:** tonight. Unconditional. It precedes and outranks every other step.
- **Two-lanes-rule vs Desk:** rule first; Desk only on demonstrated middle-lane traffic.
- **Coach port:** yes in direction, sealed until the gate passes; first slice fixed as above.
- **Production minors check:** this week; it is cheap and it arbitrates a live split.
- **Rule 82:** apply on O's explicit go; until applied, packets may cite it as convention,
  not law.

## DISSENT (against this packet's own framing)
The packet frames the workstream's history as its content. The next agent needs the history
only to avoid re-deriving it; what it needs foremost is the ranked to-do and the sealed
decisions. The handoff should lead with the plan and demote the narrative — the reverse of
this packet's structure. Also: the packet's "well under $2" spend framing invites a false
economy comparison; the real cost of this workstream is two days of O's attention and a
missed install window, and the handoff should say so plainly.
