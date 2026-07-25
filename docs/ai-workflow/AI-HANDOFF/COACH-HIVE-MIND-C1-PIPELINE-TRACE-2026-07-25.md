# Swan Coach Hive-Mind — C1 Pipeline Trace (SWA-63)

**Slice:** C1 — Informed mind. **Trace pass only** — SWA-63 mandates *"trace before build… then Sean picks scope."* No runtime code written.
**Executed:** 2026-07-25 · **Tree:** worktree `c:/tmp/ss-coach-hive-20260724`, branch `claude/coach-hive-mind-20260724` off `origin/main@e57f6804a`
**Rules:** 26 (receipt), 27 (surface classification), 51 (confidence tags), 58 (schema/context drift)

---

## 0. Headline — C1's premise is overturned

The master prompt scopes C1 as: *"Intake → Coach context: injuries, goals, equipment, pain map, history feed every proposal,"* and warns *"the week of 'make it easier on her knees' producing knee-agnostic output is the week trust dies."*

**Coach is not knee-agnostic. It already reads 21 client data sources, including pain entries, movement analysis, the onboarding questionnaire, equipment profiles, and NASM levels.** `[VERIFIED]`

This is the **sixth** premise correction in this program (five in C0). The C1 build as written would have rebuilt a working enrichment layer.

The real gaps are narrower, and two of them are more interesting than the one we set out to fix.

---

## 1. Hop-by-hop trace (SWA-63 task 1)

| # | Hop | Status | Evidence |
|---|---|---|---|
| 1 | Client intake capture → models | **CONNECTED** | UI: `frontend/src/pages/onboarding/ClientOnboardingWizard.tsx` + `hooks/useClientOnboardingData.ts`. Backend writers: `clientOnboardingController.mjs`, `onboardingController.mjs`, `adminOnboardingController.mjs`, `adminClientController.mjs`, plus `onboardingSubmitDispatcher.mjs` / `onboardingStartDispatcher.mjs` / `clientOnboardingCoverageLedgerWriteService.mjs`. Models: `ClientOnboardingQuestionnaire`, `EquipmentProfile`, `MovementProfile`, `ClientOnboardingCoverageItem` |
| 2 | Intake → **Coach chat prompt** | **CONNECTED** | `aiChatService.mjs:1093` `enrichWithUserData` — **21 numbered data-source sections** (see §2). Injected at `aiChatRoutes.mjs:821-826` |
| 3 | Intake → **Coach proposal generation** | **CONNECTED (inherited)** | `coachActionProposalService.mjs:274` parses proposals out of LLM `content` produced by the hop-2 prompt. Intake reaches proposals *through* the prompt |
| 3b | Intake → proposal **eligibility gate** | **CONNECTED** | `coachActionProposalService.mjs:306-309` loads `getClientContext` from `clientIntelligenceService` to filter frontend actions (registry membership + pain exclusions, fail-closed) |
| 4 | Intake → **Workout Planner generation** | **CONNECTED** | `contextBuilder.mjs:46` `buildUnifiedContext` handles `movementAssessments`, `equipmentContext`, pain/injury constraints → consumed by `aiWorkoutController.mjs` |
| 5 | Intake → **Workout Logger** | **PARTIAL** | Logger fetches `/api/workout-builder/corrective-recommendations` — intake-derived (NASM CES compensation mapping via `clientIntelligenceService.CES_MAP`). But **no** general client-context/brief fetch (§4) |
| 6 | `coachContextEngine` "Hive-Mind Read Layer" | **INTAKE-BLIND + NEAR-ORPHANED** | 7 domains, none of them intake (§3). Sole non-test consumer: `briefClientDispatcher.mjs` |

> **Correction recorded (Rule 51):** hop 5 was first drafted **MISSING** based on a grep for `clientContext|coachContext|intake` in `WorkoutLogger/`. Enumerating the Logger's *actual* API calls disproved it — `corrective-recommendations` is an intake-derived feed. **Third narrow-regex false negative in this program** (after C0 §7's `speechWindow` alias and C0.5's destructured `clientId`). The recurring lesson: enumerate what a surface *actually does* before concluding from a keyword grep what it *doesn't*.

### 🔴 Hop 1 is wired but NOT co-populated — the actual "informed mind" gap

The enrichment layer (hop 2) is complete. **Its inputs are filled by three separate surfaces, and the onboarding wizard is only one of them.** `[VERIFIED]`

| Coach data source | Written by | Reached by completing onboarding? |
|---|---|---|
| `ClientOnboardingQuestionnaire` (#3) | `clientOnboardingController.mjs:213` ← `POST /api/onboarding` | ✅ yes |
| `ClientBaselineMeasurements` (#5) | same controller (`:49` docblock) | ✅ yes |
| **`MovementProfile`** (#4, #13) | `movementAnalysisController.mjs`, `formAnalysisRoutes.mjs`, `workoutBuilderRoutes.mjs` | ❌ **no — separate Movement Analysis wizard** |
| **`EquipmentProfile`** (#2) | **only** `equipmentRoutes.mjs:294` `EquipmentProfile.create` | ❌ **no — separate equipment surface** |

`[VERIFIED]` — repo-wide `MovementProfile.create|EquipmentProfile.create` returns **exactly one hit** (`equipmentRoutes.mjs:294`); no onboarding path creates either. The frontend confirms the split: `useClientOnboardingData.ts:136` reads the questionnaire from `/api/onboarding/:id/questionnaire` while `:172` reads movement from a *different* surface, `/api/admin/movement-screens/:id`.

**Consequence:** a client who completes onboarding has a questionnaire but **no movement profile and no equipment profile**. Coach's equipment reasoning, movement-compensation reasoning, and corrective recommendations all degrade to empty for that client — and the trace found **no evidence the prompt announces the absence**. Coach would answer "make it easier on her knees" from pain entries and questionnaire text alone, with the movement screen simply missing rather than flagged.

That is the real version of the master prompt's warning — not "Coach can't see intake," but **"Coach can't tell the difference between *no compensations found* and *never screened*."** `[HYPOTHESIS]` on the silent-degradation half: I verified the tables are unpopulated by onboarding, **not** that the prompt omits an absence marker. That is the single highest-value probe before building (§6.1).

---

## 2. What Coach chat actually sees (hop 2, verified against source, not docblock)

`aiChatService.mjs` — its header claims 17 data sources; the body has **21 numbered sections**. The docblock *understates* it.

| # | Source | | # | Source |
|---|---|---|---|---|
| 1 | User profile | | 12 | Macro logs |
| **2** | **Equipment profiles** | | **13** | **Movement profile** |
| **3** | **Onboarding questionnaire** | | 14 | Waiver records |
| **4** | **Movement analysis** | | 15 | Form analyses |
| 5 | Baseline measurements | | **16** | **Pain entries** |
| 6 | Recent workout diary | | 17 | Sessions |
| 7 | Body measurements | | 18 | Compliance data |
| 8 | Gamification | | 19 | Business KPIs (staff) |
| **9** | **Goals** | | 20 | Check-in placeholder |
| 10 | Client notes (staff) | | **21** | **Active workout plans** |
| **11** | **Client progress (NASM levels)** | | | |

Bold = the NASM/intake inputs SWA-63 requires. All present.

### 🔴 Data source #2 (equipment) is structurally dead for client enrichment

`aiChatService.mjs` §2 of the enrichment:

```sql
FROM equipment_profiles ep
WHERE ep."trainerId" = :userId AND ep."isActive" = true
```

`:userId` is bound to `enrichUserId` — which is **`conversation.targetUserId`, the CLIENT** (`aiChatRoutes.mjs:688-690`).

But `EquipmentProfile.trainerId` is documented as *"Trainer who owns this equipment profile"* (`models/EquipmentProfile.mjs:29`), and the sole creator sets `trainerId: req.user.id` — the **creating trainer** (`equipmentRoutes.mjs:294`). There is a unique index on `(trainerId, lower(name))`, confirming trainer-scoped ownership.

**So the query asks for equipment profiles owned by the client.** A normal client owns none → **zero rows, always.** `[VERIFIED]` by ownership semantics + the sole write path; `[LIKELY]` on "always" — not confirmed against production data, and it *would* return rows in the edge case where `enrichUserId` is itself a trainer.

Syntactically valid, silently empty, and it fails in the direction that matters: **Coach reasons about a client's workout without knowing what equipment exists.**

Equipment does still reach Coach by a second path — `buildSelectedEquipmentProfilePromptBlock` (`aiChatRoutes.mjs:829`) — but only when the request explicitly carries a selected `equipmentProfileId` (gated at `:562-566`). So equipment awareness is **opt-in per request**, not a property of knowing the client.

This is a Rule 58 drift instance: right column, right syntax, wrong subject.

**Sibling sweep (Rule 20) — it is the only one.** `[VERIFIED]` I audited the `WHERE` subject of every section in the enrichment: `client_onboarding_questionnaires`, `movement_analyses`, `client_baseline_measurements`, `workout_sessions`, `body_measurements`, `streaks`, `UserBadges`, `goals`, `client_notes`, `client_progress`, `daily_macro_logs`, `movement_profiles`, `waiver_records`, `form_analyses`, `client_pain_entries`, `sessions` — **all key on `"userId" = :userId`.** Only `equipment_profiles` keys on `"trainerId"`. Twenty of twenty-one agree; this one does not. That asymmetry is the strongest evidence it is a defect rather than an intentional trainer-scoped lookup.

### The one real conditional — §5's actual gap candidate

`aiChatRoutes.mjs:688-690`:

```js
const enrichUserId = requesterIsStaff
  ? (conversation.targetUserId || null)        // null = no client selected → skip enrichment
  : (conversation.targetUserId || req.user.id); // clients always enrich with their own data
```

**All 21 sources are gated on `conversation.targetUserId`.** For a trainer with no client selected, Coach receives **zero** client context. That is correct behavior — you cannot enrich without knowing who — but it means **Coach's informedness is entirely a function of client resolution**, which is exactly the referential-grounding surface C0 named as the catastrophic failure mode and C0.5 hardened on the write side.

Companion guard at `:693-697`: fail-closed trainer RBAC via `contextEngine/clientAccess.mjs` (active `ClientTrainerAssignment` **or** session history; pending grants nothing). Escape hatch `AI_CHAT_CLIENT_ACCESS_SOFT=true` restores legacy warn-only — **an env flag that downgrades a security gate; worth an explicit review** (§6).

---

## 3. Rule 27 — three competing context layers

| Layer | Lines | Reads intake? | Consumers | Classification |
|---|---|---|---|---|
| `aiChatService.enrichWithUserData` | in 2211-ln file | ✅ **21 sources** | `aiChatRoutes` (Coach chat) | **CANONICAL for Coach chat** |
| `contextBuilder.buildUnifiedContext` | 597 | ✅ movement / equipment / pain | `aiWorkoutController` only | **CANONICAL for plan generation** |
| `contextEngine/coachContextEngine.mjs` | 316 | ❌ **none** | `briefClientDispatcher` (`buildCoachContext`) + `dayBriefDispatcher` (`buildTrainerDayContext`) | **narrow + intake-blind** |

`coachContextEngine.mjs:2` describes itself as *"The Coach Context Engine — The Hive-Mind Read Layer (Slice A1)."* It is the layer whose **name** matches this program's thesis — and it is the **least** capable of the three: 7 domains (`profile`, `workouts`, `pain`, `nutrition`, `goals`, `schedule`, `badges`), no equipment, no movement screen, no questionnaire, no NASM level — powering two read commands (`brief_client` via `buildCoachContext`, and the trainer day brief via `buildTrainerDayContext`).

> **Correction recorded (Rule 51):** this section first said "sole consumer: `briefClientDispatcher`" and classified the layer *near-orphaned*. Round-1 review found a second export, `buildTrainerDayContext`, consumed by `dayBriefDispatcher.mjs` — I had traced consumers of one export and generalized to the file. It is **narrow**, not orphaned.

**This is the finding C1 should act on.** The program's "one truthful memory" is supposed to be built on a shared read layer. The one named for that job is the weakest, and the two strong ones are per-surface silos that overlap heavily. Unifying them is real work with real payoff; re-wiring intake is not.

---

## 4. ⚠️ Naming collision — "coach intake" ≠ client intake

SWA-63 lists `coachIntakeContextService.mjs` as part of the client-intake pipeline. **It is not.**

`coachIntakeContextService.mjs:252` `buildCoachIntakeContextPromptBlock` emits:

```
--- COACH INTAKE QUEUE STATE ---
Actionable / Ready review / Needs client / Needs clarification /
Duplicate hold / Failed / Processing / Unprocessed
Health status … Retention status … Retention purge ready …
```

That is the **Coach's review queue** — PLAUD audio pieces, review states, retention/purge planning. Operational, not clinical. It contains **no** client fitness data.

Two unrelated meanings of "intake" collide in this codebase:
- **Coach intake** = items arriving in the trainer's review queue
- **Client intake** = onboarding/PAR-Q/goals/injuries

Anyone scoping from SWA-63's description will plan against the wrong service. Worth renaming or documenting explicitly.

---

## 5. Pre-req file split (SWA-63 task 2) — re-verified on fresh main

| File | SWA-63 (2026-07-23) | Fresh main | Over cap |
|---|---|---|---|
| `coachIntakeContextService.mjs` | 322 | **322** | +22 |
| `contextBuilder.mjs` | 597 | **597** | +297 |
| `contextEngine/coachContextEngine.mjs` | — | **316** | +16 |
| `aiChatService.mjs` | — | **2211** | **+1911** |
| `clientIntelligenceService.mjs` | — | **1144** | +844 |
| `aiChatRoutes.mjs` | — | **1226** | +926 |

SWA-63's two flagged files are accurate and unchanged. But the trace surfaced **four more** cap breaches on this pipeline, and the two largest (`aiChatService` 2211, `aiChatRoutes` 1226) are the *canonical* Coach chat path — i.e. the files any C1 wiring work would have to touch.

`[UNKNOWN]` whether these are already tracked elsewhere; not investigated this pass.

---

## 6. Gaps worth building (SWA-63 tasks 3–4) — ranked, for Sean to pick

1. 🔴 **Fix equipment enrichment (§2).** Data source #2 queries `equipment_profiles.trainerId = <client id>` and can only return zero rows. Coach reasons about workouts equipment-blind unless a profile is explicitly attached to the request. Smallest fix, largest coaching-quality gain — but **probe production first** (`[LIKELY]`, not `[VERIFIED]`, that it is always empty) and decide the correct subject: the client's *assigned trainer's* profiles, or a client-linked location.
2. 🔴 **Absence markers over silent empties.** Coach cannot distinguish *"no compensations found"* from *"never screened."* Every intake-derived source should state its absence explicitly (`movement screen: not on file`) so Coach can say "I haven't seen a movement screen for this client" instead of reasoning from a void. This is the concrete, testable form of the master prompt's trust warning — and it pairs with (1), since equipment has been silently empty this whole time.
3. **Co-populate or surface the split (§1).** Onboarding writes only the questionnaire + baselines; `MovementProfile` and `EquipmentProfile` come from two other surfaces. Either drive the trainer to complete all three, or make intake completeness visible per client. (2) makes this failure *legible*; this makes it *rare*.
4. **Unify the three context layers (§3).** `coachContextEngine` gains the intake domains it lacks; `enrichWithUserData` and `buildUnifiedContext` become consumers rather than parallel implementations. The real "one truthful memory" foundation and the natural bridge into C2 — but it is the largest item here and should follow 1–3.
5. **Logger context surface.** The Logger gets corrective recommendations but never the client's constraints in plain view — a trainer logging a set cannot see "left knee, pain on descent" without leaving the surface.
6. **`AI_CHAT_CLIENT_ACCESS_SOFT` review.** An env flag that downgrades a fail-closed RBAC gate to warn-only. Confirm it is off in production; consider removing it now the gate has shipped.
7. **Naming collision (§4)** and **file splits (§5)** — cheap; do the splits *inside* whichever slice touches them (the C0.5 lesson: amortize the refactor against real change).

**Recommended C1 build: (1) + (2) together**, with (3) as the follow-on. That trio is small, provable, and fixes a Coach that is *quietly* less informed than it appears — which is the failure mode this program exists to prevent. (4) is the right C1→C2 bridge but is a slice of its own. Not started — awaiting Sean.

---

## 7. What I could not prove

- **No runtime code written or executed.** Trace is static: `grep`, `wc`, file reads, API-call enumeration. `[VERIFIED]` claims rest on cited file:line.
- **No live authenticated browser** — no Coach conversation was exercised end-to-end; I did not observe an actual assembled prompt at runtime. The 21 sources are verified by source structure, not by a captured prompt.
- **`backend/node_modules` is empty in every local tree** — backend vitest cannot run here (pre-existing baseline, SWA-59). No tests run this pass.
- **`tsc --noEmit` OOMs at 8GB** (pre-existing baseline). Not claimed.
- **Hop 3 is inference-by-construction**: proposals are parsed from LLM `content`, so they inherit the hop-2 prompt. I did not trace a specific request from prompt assembly through to a persisted proposal.
- **`clientIntelligenceService.getClientContext`'s full field list** was not enumerated — only that it is loaded for eligibility filtering.
- **The intake UI was located, not exercised.** `ClientOnboardingWizard.tsx` exists and `useClientOnboardingData.ts` backs it; I did not verify which fields it actually submits, nor that a completed wizard populates `MovementProfile`/`EquipmentProfile` (as opposed to only `ClientOnboardingQuestionnaire`). **That is the one hop still worth probing before building** — it is the difference between "the pipeline is wired" and "the pipeline is wired and fed."
