# Swan Coach Hive-Mind — MASTER PROMPT v2 (HANDOFF-READY)

**Supersedes:** `SWAN-COACH-HIVE-MIND-MASTER-PROMPT-2026-07-25.md` (v1).
**Authors:** Claude Opus 5 (lead orchestrator) + Kimi K3 hostile review (`KIMI-REVIEW-swan-coach-hive-mind-2026-07-25.md`, ~$0.077).
**Adoption note:** v1's diagnosis held; its *architecture and slice order* did not survive review. v2 integrates 10 Kimi findings and modifies 1. Rationale for every change is recorded in §7 so the next agent knows what was decided and why.

---

===== COPY EVERYTHING BELOW INTO A NEW CHAT =====

You are the builder agent for SwanStudios (SS-PT), a production personal-training SaaS on Render (sswanstudios.com). Read the repo's `CLAUDE.md` house rules first, then execute this. It is self-contained — you need no prior conversation.

## The mission

Rebuild **Swan Coach** from a chat panel bolted onto four screens into the **hive mind** — one command lane, one truthful memory, many effectors — that a personal trainer drives **by voice, hands-busy, on a gym floor, with a client standing in front of them.** Dictation is the primary input. Manual tapping is the fallback, not the reverse.

Sean's words: *"Swan Coach is the hive mind. It's the Jarvis. Dictation first, manual logging second."*

## Ground truth (verified in-repo 2026-07-24/25 — do not re-derive, but do re-verify before editing)

Four surfaces, **796 files**:

| Surface | Files | Note |
|---|---|---|
| `frontend/src/components/DashBoard/Pages/coach-assistant` | 369 | biggest surface in the app |
| `frontend/src/components/WorkoutLogger` | 203 | `WorkoutLogger.tsx` is **866 lines** — 2.9× the 300-line cap |
| `frontend/src/components/DashBoard/Pages/admin-workout-planner` | 160 | |
| `frontend/src/components/BootcampBuilder` | 64 | |
| `backend/services/bootcamp` | 10 | |
| `backend/services/swanCoach` | **0 — does not exist** | Coach backend location is UNKNOWN and must be located first |

Already shipped and good — **build on these, do not rebuild them**:
- **Arc L logger craft** — ghost-tap-accept (`df145eb39`), "Beat this" ghost gesture (`1a2045f63`), coarse-pointer numeric keypad sheet (`63ec38748`, `9112752bb`), rest-timer atmosphere with aria-live + haptics (`058c26efc`), dictation-degradation chips that turn a failed receipt into tap-to-type (`25a6912c5`, `2e88917f2`).
- **CoachDock generalization** — `AI_*` event family with an acknowledge contract (`59e643ae0`), generalized dock mounted in Bootcamp (`63da01407`), bootcamp executor applying Coach tool calls with real-option validation (`b3ea8b239`), bootcamp command registry (`e4251cd86`), Pain Chart dock (`00add3f55`), **real-previous Undo on tool receipts** (`249716c38`) — that Undo pattern is the seed of this program's event model.
- Bootcamp IDOR hotfix (`7576453b1`).

Related Linear issues — read them before planning: **SWA-51** (Elegance Arc L, Sean's #1), **SWA-59** (SwanCoach Operator Runtime, S0 shipped, S1–S10 ladder), **SWA-46** (Coach plan-edit review UI), **SWA-63** (onboarding → Coach → Planner/Logger NASM pipeline — currently Backlog, promoted by this plan), **SWA-64** (admin↔trainer superset, just shipped — all four surfaces are now admin-reachable, so every deep link inside them must resolve by audience via `resolveAudienceFromPath`).

## The thesis

The four surfaces are the **hands**. Coach is the **nervous system** — *including its reflexes*. A nervous system does not route every signal to the brain: the spinal reflex acts locally and reports centrally. Applied here: **surfaces execute their core verbs locally and optimistically; the Coach lane resolves, enriches, reconciles, and syncs.** A design where "log 185 for 8" waits on a cloud round trip is wrong for a basement gym, and a basement gym is the actual environment.

## The architecture: an event-sourced command bus

**Every Coach action — voice, palette, or tap — emits a typed intent event. Effectors subscribe and apply. Memory is a projection over the event log plus domain state.**

This is not architectural taste; it collapses four separate problems into one mechanism:

| Problem | How the bus solves it |
|---|---|
| Dictation-first is unmeasured | `inputOrigin: 'voice' \| 'manual' \| 'coach_tool'` is just a field on the event |
| Cross-surface amnesia | Memory is a projection over the shared log |
| Offline / basement gym | Events queue locally and drain on reconnect |
| "Always reversible" | Events are reversible by construction — generalizes the shipped `249716c38` Undo |

**The critical rule — memory must never be a chat log.** If Coach proposes a plan edit in the Planner, the trainer moves to the Logger, and that edit silently failed (validation, permission, network), a conversation-based memory now holds a belief the database contradicts, and every later proposal is built on a lie. **A confident, continuous lie is worse than four amnesiac docks — amnesia at least fails visibly.** Memory = projection of *domain state* + *pending-intent state*, with an explicit reconciliation rule for every pending intent: `applied | failed | superseded | awaiting-confirm`. Design that reconciliation rule before writing the store.

## THE CATASTROPHIC FAILURE MODE — read this twice

**Referential grounding under client churn.** A trainer runs back-to-back (sometimes overlapping) sessions and speaks in pronouns: *"she's feeling it in her knee," "add another set for him," "make her next session lighter."* Every pronoun, every "the workout," every "next Tuesday" must resolve to a specific client, session, and exercise.

**A wrong resolution is not a wrong answer — it is a write to the wrong client's record.** Clients read their own plans; pain notes feed NASM-protocol decisions. A misattributed pain note or a set logged against the wrong client is trust-ending and potentially liability-creating.

Required, non-negotiable:
- **Hard client-lock** while a session is active. Pronouns always resolve to the locked client.
- **Mandatory re-anchor on client switch** — spoken confirm: *"Now with client 84 — confirm."*
- Any **cross-client utterance requires deliberate confirmation**, never silent execution.
- The memory must record not just what was said but **who it was about, at what confidence, and whether it landed.**

## The voice interaction model (specify this before building any of it)

**Wake: push-to-talk, never a wake word.** Gym floors have music, dropped plates, and other people's conversations — a wake word false-triggers constantly, false-negatives in noise, and always-listening with a client present is a privacy problem the zero-PII rule cannot wash. PTT via headphone remote, watch, or on-screen hold.

**The whole logging loop must work screen-off, phone-in-pocket**, driven from the headphone remote with audio + haptic feedback only. If the trainer must wake, unlock, and find a mic button, a competitor's two taps already won.

**Confirmation is tiered by reversibility and defaults to silent:**

| Tier | Examples | Behavior |
|---|---|---|
| Fire-and-forget | log a set · start/stop rest timer · "next exercise" · "same again" | No speech. Short earcon + haptic. Reversible by saying "undo." |
| Read-back | anything with parsed numbers (weight, reps) · pain notes | One-line spoken read-back with a correction slot: *"Squats, one eighty-five, eight — say 'no' to fix."* Digits are the highest-error class in ambient noise, so numbers always get read-back. |
| Deliberate confirm | plan edits · active-plan switches · anything trainer-only · any cross-client action | Explicit spoken yes. Trainer-only actions must also establish that the *trainer* is speaking — a client joking "delete the workout" into a propped phone is not hypothetical. |

**Speak vs stay silent:** repetitive success is **silent** (earcon only). A Coach that says *"Logged, set three, squats, one eighty-five, eight reps"* thirty times per session gets muted by week two. Reserve speech for ambiguity, errors, the read-back tier, and **summaries at natural breakpoints** (*"Three sets squats logged, up two reps from last Tuesday"*) — that is where voice earns trust. **Barge-in is mandatory**: talking over Coach always interrupts it.

**Error recovery never loops.** *"Sorry, I didn't catch that"* twice is where trainers abandon voice permanently. Recovery is structured: state the best-guess parse with the uncertain **slot** flagged, and let the trainer correct that slot — never re-dictate the whole utterance. After two failures, degrade to the shipped Arc L tap-chip **without stopping the session**; corrections queue.

**Resolve exercise names against the client's plan vocabulary, not a global dictionary.** *"Legs"* or *"the pull thing"* must match against what is in **today's session** (~8 exercises → near-perfect fuzzy match in noise), never against the 736-exercise database (→ fails in noise). Cheap decision, outsized impact.

**Never require the screen for:** logging sets/reps/weight · rest-timer control · next/previous/skip · undo · "repeat last set" · flagging a pain note (*"note — right knee, twinge on the descent"*) · ending the session. If any of these needs a glance, this is not dictation-first; it is dictation-decorated.

## Slice plan

Each slice: design contract first if it is visible → build → hostile-review until a round finds nothing → one confirming round → `PROOF:` line with executed evidence → commit.

| Slice | Deliverable |
|---|---|
| **C0 — Locate** | Canonical receipt (Rule 26) for the whole lane: **where the Coach backend actually lives** (`backend/services/swanCoach/` is empty), the full `AI_*` tool inventory across all four surfaces, current dictation entry points, and every write path that would carry `inputOrigin`. No code. You cannot unify what you have not located. |
| **C1 — Informed mind (SWA-63)** | Intake → Coach context: injuries, goals, equipment, pain map, history feed every proposal; NASM doctrine verdicts surface inline. **Promoted to first build slice** — a front door onto an uninformed parser demos well and retains terribly. The week of *"make it easier on her knees"* producing knee-agnostic output is the week trust dies, and voice trust does not recover. |
| **C2 — The bus + truthful memory + offline, as ONE slice** | Typed intent events; `(actor, client)`-keyed memory as a **projection over domain state + pending intents** with an explicit reconciliation rule; local queue + explicit sync state from day one. Offline is a **design constraint on this slice**, not a later slice — building C2 assuming cloud round-trips makes offline a rewrite. Includes the **client-lock + re-anchor safety model** above. Fold the `WorkoutLogger.tsx` 866-line decomposition into this slice *only where it is touched*, so the refactor is amortized against real change. |
| **C3 — Confirmation taxonomy + Undo** | Implement the tiered voice interaction model as one shared contract every surface's executor consumes. Without this, each surface invents its own confirmation rules and you have rebuilt the four-registries drift at the interaction layer. |
| **C4 — Evaluation harness** | A golden set of real utterances (*"log 185 for 8," "she's feeling it in her left knee," "swap the lunges," "same again"*) replayed against intent resolution as a regression suite, including wrong-client-resolution cases. **Nothing else measures whether the mind is *right*** — usage telemetry only proves it was used. This is the line between a voice feature and a voice product. |
| **C5 — The one intent bar** | Role-aware Cmd+K **and** the voice lane as a single object: intent → capability → client → audience-correct destination. Deliberately late: it is the most impressive and least differentiating piece (a competitor ships palette parity in a quarter), and it is worthless on top of an uninformed, untrustworthy mind. Converges with SWA-64's planned S4 — build it once, here. |
| **C6 — Telemetry read-out** | Admin-visible voice-origination rate, dictation failure/abandon rate, per surface. Trivial once events exist, which is why it is last rather than first. |

## Definition of done

1. **A voice-originated set log lands in ≤2 seconds, screen-off, offline-capable, with earcon confirmation and spoken undo.** This is DoD #1 and it outranks everything else in this document. Trainers will benchmark Swan Coach against a two-tap manual logger, not against other voice assistants — if voice is slower than tapping, or needs a glance, or fails once in a basement gym, dictation-first is dead no matter how good the intent bar is.
2. Coach proposals reflect the client's real intake, injuries, and equipment.
3. A trainer starts a thought in one surface and finishes it in another without repeating themselves — and the memory never asserts something the database contradicts.
4. A wrong-client write is structurally prevented, not merely unlikely.
5. Intent resolution has a replayable golden-set regression suite.
6. Every Coach action is reversible; every degraded path leaves the trainer something they can still act on.
7. No runtime file touched by this program exceeds 300 lines.

## Hard rules (non-negotiable — from CLAUDE.md)

- **Never call it "AI" user-facing.** It is **Swan Coach**. Credentials framing: **"26+ years / NASM-protocol"**, never "NASM-certified". No yoga/meditation language — use "stretching"/"flexibility".
- **Trainer indispensability:** clients get **read + do, never decide**. Switching the active plan and editing `planData` are trainer-only.
- **Zero PII to LLMs** (Rule 8) — client IDs only, names mapped client-side.
- styled-components only (**no MUI**) · **Victory** charts only (no Recharts) · Crystalline Swan dark-first palette via `var(--token, #fallback)` · reject retired Galaxy-Swan `#0a0a1a/#00FFFF/#7851A9` · **44px** touch targets · `prefers-reduced-motion` · **300-line** file cap · WCAG 4.5:1.
- All four surfaces are now admin-reachable (SWA-64): every deep link and return path inside them must resolve by audience (`resolveAudienceFromPath`), or an admin gets demoted into the trainer shell mid-session.
- Money/auth-adjacent paths (session credits, commission) ride the careful lane.
- **Per slice:** hostile-review until a round finds nothing, then one confirming round (**DRY-LOOP CLEAN×2**), a `PROOF:` line with real executed evidence, no "done" without proof (Rule 74). Subagent output is a hypothesis until you verify it (Rule 30).
- Shared tree (Rule 67): read `.ai-workflow/coordination/*.lane.md` before editing; stage **explicit paths only**, never `git add -A`.
- Branch off fresh `origin/main` in a worktree. Commit per slice; **batch-push once at the end** (Rule 70). No merge to main without Sean's OK.
- Disclose honestly what you could not prove: there is no live authenticated browser in this environment, and `tsc --noEmit` **OOMs at 8GB heap** on this repo (pre-existing baseline — do not claim typecheck coverage).

## First action

**C0.** Locate the Coach backend and inventory every `AI_*` tool family across the four surfaces. Produce the canonical receipt with file:line evidence. Bring it back with your C1 plan before writing feature code.

===== COPY EVERYTHING ABOVE INTO A NEW CHAT =====

---

## §7 — What changed from v1, and why (orchestrator's record)

**Adopted from Kimi (10):**
1. **Memory ≠ chat log.** The memory-vs-truth divergence is the worst latent bug class in the program; v1 said "conversation + working state" and never defined reconciliation. Now an explicit projection + pending-intent state machine.
2. **Event-sourced command bus.** v1 built telemetry (C1), memory (C3), offline (C6), and Undo as four separate things. They are one mechanism seen four ways. Collapsed.
3. **Referential grounding / wrong-client write** — named as *the* catastrophic failure mode. Absent from v1 entirely. This is the single best catch in the review.
4. **Evaluation harness** — v1 measured whether voice was *used*, never whether it was *right*. Without replayable eval, every improvement is unfalsifiable.
5. **Confirmation/Undo taxonomy** as a shared contract — otherwise each surface invents its own rules and the four-registries drift returns at the interaction layer.
6. **Offline is a constraint, not a slice.** v1 scheduled it last; building the memory and intent bar against cloud round-trips would have made it a rewrite.
7. **Intake context before the intent bar.** v1 called SWA-63 the highest-value unbuilt thing, then scheduled it 5th. Fixed.
8. **Plan-vocabulary exercise resolution** (~8 candidates, not 736).
9. **PTT over wake word; screen-off loop mandatory.**
10. **DoD #1 rewritten** to the ≤2s offline screen-off logging loop, on the Hevy-benchmark argument: trainers compare voice to *tapping*, not to other assistants.

**Modified, not adopted as written (1):** Kimi argued for **cutting** the `WorkoutLogger.tsx` decomposition entirely as "speculative" and "process theater." The premise is wrong — this program *will* modify the logger heavily (offline queue, confirmation model, dictation loop all land there), so the refactor is not speculative. But Kimi's *mechanism* is right: decomposing behavior-identically as a standalone slice is risk on the money path with no user-visible reward. **Synthesis:** keep the decomposition, fold it into C2 and only where the file is actually touched, so it is amortized against real change and new tests cover new behavior.

**Refined rather than rejected (1):** Kimi called centralized routing "architecturally wrong." That is a refinement of the nervous-system metaphor, not a refutation — nervous systems have spinal reflexes that act locally and report centrally. The metaphor survives with reflexes made explicit: local-first effectors, central resolution and reconciliation.
