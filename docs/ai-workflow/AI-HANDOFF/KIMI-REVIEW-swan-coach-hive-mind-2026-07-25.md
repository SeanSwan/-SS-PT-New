# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-COACH-HIVE-MIND-MASTER-PROMPT-2026-07-25.md
**Seed:** (none)
**Tokens:** 3392 in / 4475 out · **Cost:** ~$0.0773 · **Wall:** 189.6s

---

# Review: Swan Coach Hive-Mind Master Prompt

The document is better grounded than most (real file counts, real commit hashes, honest environment disclosures). That buys it credibility — and means I'm holding it to a higher standard, not a lower one. Findings below, no filler.

---

## (a) The reframe: right diagnosis, wrong organism

**"Surfaces are hands, Coach is nervous system" is directionally correct and will still fail as written**, for three reasons the doc doesn't confront:

**1. The metaphor smuggles in a fatal assumption: that memory is the mind.** H1's fix — "one session-scoped Coach context keyed by `(actor, client)`" — makes *conversation* the shared state. But conversation is not truth. If Coach proposes a plan edit in the Planner, the trainer moves to the Logger, and the edit silently failed (validation, network, permissions), the shared memory now contains a belief the database contradicts. Every subsequent proposal ("keep going") is built on a lie, and a *confident, continuous* lie is worse than N amnesiac docks — at least amnesia fails obviously. **The memory must be a projection of domain state plus pending-intent state, not a chat log.** The doc's §2 item 2 says "conversation + working state" and never defines the reconciliation rule. That omission will be the source of the worst production bugs in the whole program.

**2. Centralized routing is architecturally wrong for the stated environment.** A nervous system implies every signal transits the center. On a gym floor with basement connectivity (H7, which the doc itself raises), a centralized cloud-resident mind means the trainer's "log 185 for 8" dies waiting on a round trip. The correct shape is **a thin intent router with local-first effectors**: surfaces hold optimistic local state and can execute their own core verbs offline; the Coach lane resolves, enriches, and syncs. The doc reaches this conclusion implicitly at C6 but never revises the C3 architecture to match it — see (b), this is the ordering failure.

**3. "Intent → capability → client → destination" hides the actual hard layer.** The doc treats intent resolution as a routing problem. It's a *dialog management* problem: what does the system do at 70% confidence? 45%? Every routing decision has a disambiguation cost, and the doc budgets zero slices for it.

**Better architecture:** an event-sourced command bus. Every Coach action — voice, palette, or tap — emits a typed intent event; effectors subscribe and apply; the unified memory is a projection over the event log plus domain stores. This gets you the "one mind" property, a real Undo for free (events are reversible by construction, generalizing the `249716c38` pattern the doc wants anyway), telemetry for free (H2's `inputOrigin` is just a field on the event), and an offline story for free (events queue). The doc's C1, C3, C6, and the DoD's "every action reversible" are *the same mechanism* viewed four ways — and the slice plan builds them as four separate things.

---

## (b) Slice order: two mis-orders, one cut, three missing

**Mis-ordered:**

- **C6 is catastrophically late.** The degraded/offline contract is not a slice, it's a *constraint on C3 and C4's designs*. If the unified context (C3) and intent bar (C4) are built assuming cloud round-trips, C6 becomes a rewrite, not a slice. The doc's own thesis — dictation-first on gym floors — makes connectivity a first-class design input, then schedules the response to it last. Move C6's design contract into C3; implement the queue early, not the polish.
- **C5 (intake context) should precede C4 (intent bar).** The doc itself calls SWA-63 "the highest-value unbuilt thing in the entire arc" (H5) — then schedules it fifth. A front door to a command parser (C4 before C5) demos well and retains poorly: the trainer's first week of "make it easier on her knees" producing knee-agnostic output is when trust dies, and trust in a voice system does not recover. Ship the mind informed *before* you give it a bigger door.

**Cut:**

- **C2 as a standalone slice.** Decomposing an 866-line file behavior-identically is risk with no user-visible reward, executed on the money path, justified by "we'll touch it a lot later." That's speculative. Fold decomposition into the first slice that actually needs to modify the logger (the offline queue or the confirmation model), where the refactor is amortized against real change and the new tests are testing new behavior. If nothing ever needs to modify it, the 866 lines were fine. The 300-line cap governs new code; grandfathering with a refactor-only slice is process theater.

**Missing:**

- **A confirmation/Undo taxonomy slice** — the doc says "always reversible" in §2 and DoD 6 but never designs *which actions require voice confirmation, which get earcon + post-hoc undo, which are trainer-only via voice at all*. This is the core voice interaction model and it has no home. Without it, each surface's executor will make its own confirmation calls and you've rebuilt the four-registries drift (H6) at the interaction layer.
- **An evaluation harness.** There is no golden set of utterances ("log 185 for 8," "she's feeling it in her left knee," "swap the lunges") against which intent resolution is regression-tested. You cannot iterate on voice accuracy without replayable evaluation; C1 measures *usage*, nothing measures *correctness*. This is the difference between a voice feature and a voice product.
- **A client-scoping safety slice.** Wrong-client writes are the catastrophic failure mode and appear nowhere in the plan. See (d).

---

## (c) Dictation-first UX, moment to moment

The doc says "dictation first" five times and never designs a single interaction. Here is what the slice plan should be specifying:

**Wake behavior: push-to-talk, never wake word.** A gym floor has music, dropped plates, and other people's conversations — a wake word will false-trigger constantly and false-negative in noise, and constant listening with a client present is a privacy problem the zero-PII rule can't wash. PTT via headphone button, watch, or on-screen hold. Critical requirement the doc misses entirely: **the full logging loop must work screen-off, phone-in-pocket**, triggered from the headphone remote, with audio + haptic feedback only. If the trainer has to wake the phone, unlock it, and find the mic button, Hevy's two taps already won.

**Confirmation model: tiered by reversibility, defaulting to silent.**

| Tier | Examples | Behavior |
|---|---|---|
| Fire-and-forget | Log a set, start/stop rest timer, "next exercise," "same again" | No spoken confirmation. Short earcon + haptic on success. Undo by saying "undo." |
| Read-back | Anything with numbers parsed in noise (weight, reps), pain notes | One-line spoken read-back with a correction slot: "Squats, one eighty-five, eight — say 'no' to fix." Numbers get mandatory read-back because digits are the highest-error class in ambient noise. |
| Deliberate confirm | Plan edits, active-plan switches, anything trainer-only | Explicit yes. Trainer-only actions must also verify the *trainer* is the one speaking near the phone — a client joking "delete the workout" into a propped phone is not hypothetical. |

**Speak back vs. stay silent:** success on repetitive actions is *silent* (earcon only) — a Coach that says "Logged, set three, squats, one eighty-five, eight reps" thirty times per session will be muted by week two. Speech is reserved for: ambiguity, errors, read-back tier, and summaries at natural breakpoints (end of exercise: "Three sets squats logged, up two reps from last Tuesday"). Summaries at breakpoints are where voice earns trust — proactive, bounded, skippable by just talking over it (barge-in is mandatory).

**Error recovery: never a repeat loop.** "Sorry, I didn't catch that" twice is where trainers abandon voice permanently (and C1's abandon metric will show it). Recovery is structured: state the best-guess parse with the uncertain slot flagged, and let the trainer correct the *slot*, not re-dictate the utterance. Two failed attempts auto-degrades to the Arc L chip — but the chip appears on the Watch/headphone-propped screen *without requiring the trainer to stop the session*; the session continues, corrections queue.

**Exercise-name resolution against the client's plan vocabulary, not the dictionary.** "Legs" or "the pull thing" must resolve against what's in *today's session*, not a global exercise database. A fuzzy match over 8 exercises in the active plan will be nearly perfect in noise; a match over 800 will not. This is a concrete, cheap design decision that matters more than any model choice.

**What must NEVER require the screen:** logging sets/reps/weight, rest timer control, navigating the session (next/previous/skip), undo, "repeat last set," flagging a pain note ("note — right knee, twinge on the descent"), ending the session. If any of these needs a glance, the feature is not dictation-first, it's dictation-decorated.

---

## (d) The hardest unnamed problem

**Referential grounding under client churn — and nobody in the plan has named it.**

The unified memory is keyed `(actor, client)`. But a trainer on a gym floor runs back-to-back sessions, sometimes overlapping, and dictates in pronouns: "she's feeling it in her knee," "add another set for him," "make her next session lighter." Every pronoun, every "the workout," every "next Tuesday" has to resolve to a client, a session, and an exercise — and the cost of a wrong resolution is not a wrong answer, it's a **write to the wrong client's record**. In a product where clients read their plans and pain charts feed NASM-protocol decisions, a misattributed pain note or a set logged to the wrong client is a trust-ending, possibly liability-creating event.

This composes with the memory-vs-truth divergence from (a): the system must know not just what was said, but *who it was about, with what confidence, and whether it landed*. The fixes are unglamorous and absent from the slice plan: a hard client-lock while a session is active, a mandatory re-anchor on client switch ("Now with Marcus — confirm"), pronouns always resolving to the locked client, and any cross-client utterance requiring deliberate confirmation. Voice assistants die of a thousand paper cuts; this is the one that's an arterial bleed.

Runner-up, also unnamed: **you have no way to measure whether the mind is right.** C1 tracks that voice was used; nothing tracks that the intent resolved correctly. No eval harness = every "improvement" to the lane is unfalsifiable.

---

## (e) Where competitors win, and the one change to make

**Hevy beats this on the core loop, today, without any AI.** Its manual set-logging is two taps and under two seconds, works offline by nature, and never mishears you. Every trainer evaluating Swan Coach will implicitly benchmark voice logging against Hevy's tap loop, not against other voice assistants. If "log 185 for 8" takes 4 seconds, requires a screen glance, or fails once in a basement gym, dictation-first is dead regardless of how good the intent bar is — and C1's telemetry will dutifully record the corpse. **Trainerize and TrueCoach beat this on reliability and habit:** their coaches open the app 6 days a week because it never surprises them; a voice system that surprises (wrong client, lost log, phantom confirmation) gets one strike. **Whoop Coach beats this on groundedness** — answers derived from *your* data — which is exactly the C5/intake gap the doc correctly identifies and then under-prioritizes.

**The one highest-impact change: promote the degraded-mode + latency contract from C6 to a foundation constraint on C3/C4, and make "voice-originated set log lands in ≤2 seconds, screen-off, offline-capable, with earcon confirmation and spoken undo" the program's first Definition-of-Done item — ahead of the intent bar, ahead of everything.**

Rationale: the intent bar (C4) is the most impressive thing in the plan and the least differentiating — Trainerize is shipping a command palette too, and palette parity is a quarter of work for any competent competitor. The thing no competitor has, and the thing that is hardest to copy, is a logging loop that is *genuinely faster hands-busy than Hevy is hands-free*, that survives a basement gym, and that a trainer trusts enough to use with a client watching. That is also the only version of this program where "dictation first, manual second" is a description of user behavior rather than an aspiration in a master prompt. The doc's own thesis demands it; the slice order betrays it. Fix the order.

---

## Summary of required changes

1. **Redefine C3's memory as a projection over domain state + an intent event log, not a conversation store.** Memory-truth divergence is the critical unaddressed bug class.
2. **Collapse C1/C3/C6/Undo into one event-sourced command-bus architecture** instead of four slices that will be reconciled later at higher cost.
3. **Reorder:** C0 → C2-cut → C5 (informed mind) → C3+C6-contract (memory, offline-first) → confirmation taxonomy + eval harness (new slices) → C4 (door) → telemetry dashboard last, since events make it trivial.
4. **Add client-lock/re-anchor safety** as an explicit slice with wrong-client-write as its named catastrophic failure.
5. **Cut the standalone logger decomposition**; fold it into the first slice that touches the logger.
6. **Rewrite DoD #1** as the ≤2s offline-capable screen-off set-logging loop.
