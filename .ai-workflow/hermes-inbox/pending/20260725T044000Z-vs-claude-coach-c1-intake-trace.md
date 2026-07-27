# Swan Coach C1 trace — Coach is already intake-informed; two real defects behind it

**Surface:** vs-claude (Opus 5, VS Code terminal) · **Date:** 2026-07-25 UTC
**Linear:** SWA-63 (trace complete), SWA-65 · **Commit:** `0c90369d2` on `claude/coach-hive-mind-20260724` — not pushed, not merged
**Prior:** C0 locate + C0.5 wrong-client-write memos

---

## The correction Hermes should carry

The plan of record said Coach needed an "informed mind" built — intake wired into its context. **That work is already done.** `aiChatService.mjs:1093` `enrichWithUserData` assembles **21 numbered client data sources** into the Coach system prompt (its own docblock understates it as 17), including onboarding questionnaire, movement analysis, movement profile, pain entries, equipment profiles, NASM levels, and active workout plans. Injected at `aiChatRoutes.mjs:821-826`, gated on `conversation.targetUserId`.

**Sixth premise correction in this program.** The pattern is now unmistakable: this codebase is far more built than its planning documents assume. Trace before building, every time.

## Two real defects the trace surfaced

**1. Equipment enrichment is structurally dead for clients.** The query filters `equipment_profiles."trainerId" = :userId`, but `:userId` is the **client**, while `trainerId` is the *owning trainer* (model comment; sole creator sets `req.user.id`; unique index on `trainerId`+name). Clients own no profiles → zero rows. **Sibling sweep: 20 of 21 enrichment sections key on `"userId"`; only this one keys on `"trainerId"`** — that asymmetry is the evidence it's a defect, not intent. Equipment does still reach Coach via an explicitly-selected profile block, so awareness is opt-in per request rather than a property of knowing the client.

**2. Intake inputs are not co-populated, and absence is silent.** Onboarding writes only the questionnaire + baseline measurements. `MovementProfile` and `EquipmentProfile` are written by two *separate* surfaces (`MovementProfile.create`/`EquipmentProfile.create` = one hit repo-wide). A newly onboarded client therefore has neither — and nothing marks the absence. **Coach cannot distinguish "no compensations found" from "never screened."** That is the operative trust risk: not that Coach is blind, but that it can't tell informed from uninformed.

## Naming trap worth remembering

**"Coach intake" ≠ "client intake."** `coachIntakeContextService.mjs` emits `--- COACH INTAKE QUEUE STATE ---` — PLAUD audio pieces, review states, retention/purge. It is the trainer's *review queue* and contains no client fitness data. SWA-63's own description conflated the two; anyone scoping from it would plan against the wrong service.

## Method lesson — third instance of the same failure

A keyword grep told me the Workout Logger had no intake context. Enumerating what the Logger *actually fetches* disproved it — `/api/workout-builder/corrective-recommendations` is intake-derived via the NASM CES map. That is the **third** narrow-regex false negative in this program (after a file aliasing `window`→`speechWindow`, and a dispatcher destructuring `clientId` instead of reading `params.clientId`).

**Rule to carry: enumerate what a surface actually does before concluding from a keyword grep what it doesn't.** All three misses shared one shape — a search written for the form I expected, against code written in a form I didn't.

## Architecture note

Three overlapping context layers, each canonical for a different consumer: `enrichWithUserData` (Coach chat, 21 sources), `contextBuilder.buildUnifiedContext` (plan generation, movement/equipment/pain), and `contextEngine/coachContextEngine` (2 read commands, **intake-blind**). The layer literally named "The Hive-Mind Read Layer" is the least capable of the three. Unifying them is the real "one truthful memory" foundation.

Six files on this path exceed the 300-line cap; the two largest (`aiChatService` 2211, `aiChatRoutes` 1226) are the canonical Coach chat path any wiring slice must touch.

## Status

Trace complete; **no code written** (SWA-63 mandates trace → Sean picks scope). Both defects flagged to Linear rather than fixed. Recommended C1 build = the two defects together, co-population as follow-on.

**Provenance:** Opus 5 (sub-Fable). Working memo only — not eligible for the durable Fable-tier learning corpus (Rule 68).
