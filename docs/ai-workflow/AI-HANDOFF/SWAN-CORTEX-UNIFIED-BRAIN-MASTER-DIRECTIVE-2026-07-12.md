# SWAN CORTEX — UNIFIED BRAIN MASTER IMPLEMENTATION DIRECTIVE
**Date:** 2026-07-12 · **Author:** Fable 5 (Final Decider) · **Status:** **RATIFIED** — triangle fusion review complete 2026-07-12 (Claude hostile leg: REVISE→5 blockers, all folded in; Gemini 3.1 Pro: APPROVED WITH MODIFICATIONS, design directives folded Rule-6-corrected; Codex: async window open via review-queue, findings to be folded as addendum if/when posted; Final Decider: Fable 5). Board: `.ai-workflow/fusion/cortex-directive-20260712/`.
**Ground truth:** audited against `origin/main` @ `08f29f92b` in worktree `c:/tmp/ss-cortex-audit` (NOT the stale wip branch, which is 427 behind). All file:line citations below are `[VERIFIED]` against that commit.
**Supersedes:** the 2026-07-11 ChatGPT/GPT-5.6-Pro "Swan Coach Unified Cortex" draft directive (external, unverified). This version corrects its guesses with repo evidence, drops what already exists, and adds what it missed.

---

## §0 — Mission

Make SwanStudios run on **ONE Swan Coach brain**: one authority contract, one NASM-governed programming system, one exercise ontology, one safety spine — consumed by every generation surface (personal training, bootcamp, corrective/recovery, clinician-coordinated rehab, return-to-performance, coach chat). Expert clinical-depth reasoning with **bounded clinical authority**: Swan Coach is never a licensed physical therapist, never diagnoses, and clinician restrictions are hard boundaries that define the envelope inside which NASM programming operates.

Product naming: **"Rehab-Aware Training" / "Clinician-Coordinated Recovery" / "Return-to-Performance"** — never "AI Physical Therapist," never "AI" user-facing (Swan Coach branding rule).

---

## §1 — VERIFIED CURRENT STATE (the audit the plan must build on)

### 1.1 What already exists and is GOOD — do not rebuild
| Asset | Evidence | Note |
|---|---|---|
| Coach-brain policy vault w/ approved-only ingestion | `backend/services/swanCoachCortexService.mjs:112-131` loads only `brain: swan_coach_cortex` + `review_status: approved` docs; throws if none | This IS the knowledge-vault runtime layer — extend, don't replace |
| Authority stack doctrine | `docs/ai-workflow/coach-brain/00-cortex-contract.md` (safety > DB data > NASM > Sean doctrine > Rolodex > LLM) | Formalize in code, don't re-invent |
| CES closed-set taxonomy + citation hard-rule | `docs/ai-workflow/references/NASM-CES-TAXONOMY.md` §4.3; 40 seeded cited rows (32 + 8 backfill, `backend/seeders/20260504…` + `20260707020000…`) | The evidence-governance pattern for ALL future clinical content |
| Deterministic recovery board, pain-capped, zero-LLM | `backend/services/recoveryBoardService.mjs` (3 SMR + 3 stretch + 2 drills, painLevel ≥7 = gentle-only, disclaimers) + `recovery_completions` | Template for rehab composers |
| Rich client context assembly (16-way) | `clientIntelligenceService.mjs:446,494-733` — pain, OHSA compensations, form analyses, history, equipment, goals, baseline 1RM/PAR-Q, nutrition, vault | The single context spine — Path A uses it |
| Readiness Green/Yellow/Red + intensity caps | `swanCoachCortexService.mjs:188-279` (drops intensityMethod, de-scores plyo/power on Yellow/Red) | |
| Rationale/audit trail | `workoutBuilderService.mjs:721-833` typed `explanations[]` + `rationale[]`; fingerprint w/ `dataCategoriesUsed`, safety gate, standards stack (`swanCoachPlanningFingerprintService.mjs:72-86`) | |
| Hard 409 approval gate (long-horizon LLM path) | `swanCoachPlanningApprovalGateService.mjs:47` + `longHorizonController.mjs:845` (`SWAN_COACH_REVIEW_REQUIRED`) | The enforcement pattern to spread |
| OHSA → planner bridge | `backend/services/ohsaCompensationAggregator.mjs` → `MovementProfile.commonCompensations` | |
| PAR-Q+ w/ medical-clearance triggers | `services/ai/nasmTemplateRegistry.mjs:421-427`; clearance columns on `MovementAnalysis` (`medicalClearanceRequired/Date/Provider`) | Only clearance storage in the system |
| LLM output validator (PII reject, Zod, NASM rules) | `services/ai/outputValidator.mjs:27,58` | |

### 1.2 P0 SAFETY DEFECTS — all `[VERIFIED]`, fix before any new intelligence
1. **7-day pain window silently drops chronic active pain.** `clientIntelligenceService.mjs:491` (`painQueryWindow = 7 days`) + `:514-518` (`createdAt >= painQueryWindow`). An unresolved `isActive` pain entry older than 7 days vanishes from generation context even though the pain system still shows it active.
2. **Empty arrays satisfy the pain-context presence check.** `swanCoachPlanningSafetyGateService.mjs:24-26` — `Array.isArray(pain.exclusions)` is true for `[]`. **Compounds with #1:** aged-out chronic pain → empty exclusions/warnings → gate says pain context present → `coach_review_ready`, pain-blind.
3. **The safety gate is ADVISORY in the deterministic path.** `generateWorkout`/`generatePlan` embed the gate as fingerprint metadata but never block on `review_required` (`workoutBuilderService.mjs:502,712,724`). Hard 409 enforcement exists ONLY on the LLM long-horizon approval. Single-workout deterministic output has no blocking gate.
4. **Coach chat bypasses the deterministic stack entirely.** `aiChatService.mjs:493-503` emits `AI_ADD_EXERCISE`/`AI_LOAD_TEMPLATE` frontend dispatches straight from the LLM — no `clientIntelligenceService` pain exclusions, no `exerciseQualityGate`, no safety gate. The chat surface can add an exercise the builder would have excluded for pain.
5. **Bootcamp pain handling annotates but never gates — and the query is DEAD.** `bootcampGenerator.mjs:509-546` — pain queried by `createdById: trainerId` (trainer-AUTHORED entries, not the trainer's clients' entries — wrong population), maps via its own inline region map (`:516-522`), and only decorates `painAlerts` afterward; flagged exercises still appear on Board 1. **Triangle-review catch [VERIFIED]:** the query filters `status: 'active'` (`:511`) but `ClientPainEntry` has NO `status` column (model defines `isActive` at `:79`; index `idx_pain_user_active` on `isActive` at `:130`) — Rule 58 drift class #6: every call errors, the non-fatal catch (`:546`) swallows it, so **`painAlerts` has been empty in production since the feature shipped**. The bootcamp pain feature is dead code wearing a feature's name.
6. **Pain filter bypass for untagged exercises.** `workoutBuilderService.mjs:231` — exercises with `undefined` muscles fall through the pain-exclusion filter (`?? false`).
7. **Exercise quality gate is fail-OPEN.** `exerciseQualityGate.mjs:53` — if all candidates are rejected it returns the original pool with `gateStoodDown: true`. Acceptable for style; not acceptable when the rejection reason is safety.

### 1.3 Fragmentation map — the "two brains" (actually three surfaces)
- **Bootcamp is a parallel brain.** Shares only `getExerciseRegistry` (fallback) + `applyExerciseQualityGate` (`bootcampGenerator.mjs:18-19`). Own raw-SQL exercise access (`exerciseRolodexBridge.mjs:57-170`) vs the builder's `getExerciseRegistryFromDB()`. NASM phase is a **hardcoded constant** `nasmPhase: 2` (`bootcampGenerator.mjs:449`); the bridge's `optPhase` filter is never passed from the generator (`:401-406`). No impact budget, no skill ceiling, no fatigue sequencing within a class. EMOM/AMRAP/tabata/circuit are **config labels with no generation logic** (`bootcampConstants.mjs:54-58`).
- **≥6 backend copies of NASM OPT acute-variable tables** (+3 frontend): `workoutBuilderService.mjs:108` (`OPT_PHASE_PARAMS`) and `:669` (`phaseIntensityMap`), `nasmProgressionService.mjs:22`, `nasmTemplateRegistry.mjs:19-210`, `workoutBuilderCandidateService.mjs:99`, `services/ai/dispatchers/nasmPhaseDispatcher.mjs`; frontend `NASMPhaseTemplates.ts`, `OPTPhaseIndicator.tsx`, `NASMEducationContent.ts`.
- **Two divergent CES datasets:** `CES_MAP` (8 patterns, `clientIntelligenceService.mjs:346`) vs `CES_CORRECTIVE_SCHEMA` (9, `nasmTemplateRegistry.mjs:214`) with different key spellings, bridged by `mapCompensationToCesTags`.
- **Two context assemblers:** deterministic path = `clientIntelligenceService`; LLM path = `services/ai/contextBuilder.mjs`. Safety windows/exclusions are not guaranteed identical.
- **Three region→muscle maps:** `clientIntelligenceService.mjs:290-342`, bootcamp inline (`bootcampGenerator.mjs:516-522`), and controller body-region allowlist (`painEntryController.mjs:13-39`).
- Per-phase `contraindications` in `nasmTemplateRegistry` are **defined but never consumed** by the deterministic builder. Quality-gate `rejected[]` reasons are computed but dropped from trainer-facing output.

### 1.4 Dormant assets — cheap wins, activate instead of building new
| Dormant asset | Evidence | Activation |
|---|---|---|
| `Exercise.prerequisites` + `progressionPath` (JSON ID arrays) | stored, **no service traverses them** | Seed of the progression-graph engine (§8) |
| `FormAnalysis.findings` (compensations, `fatigueDetected`, symmetry) | never read by generation | Feed readiness + regression flags |
| `PainEntryCorrectiveExercise` junction (per-CES-phase prescriptions) | **no writer exists** | Corrective composer output target |
| `MovementAnalysis` clearance columns | only clearance storage; pain model has none | Migrate concept into §9 clearance model |
| `Exercise.contraindicationNotes`/`safetyTips`/`scientificReferences` | free-text blobs | Structure via §7 clinical profile |
| `corrective_protocols`/`corrective_homework_logs` tables | **DEAD — do NOT revive**: no models, 0 rows, `client_id` FKs legacy lowercase `users` w/ CASCADE (data-reset landmine, documented in `RecoveryCompletion.mjs:9-14`) | `recovery_completions` is the sanctioned replacement pattern |

### 1.5 Pain/symptom model gaps (`ClientPainEntry`)
Structured today: bodyRegion (60-entry controller allowlist), side, painLevel 1-10, painType enum, posturalSyndrome, onsetDate, isActive/resolvedAt, `assessmentFindings` JSONB. **Missing entirely:** mechanism-of-onset, radiating/numbness-as-red-flag booleans (numbness exists only as a pain *quality*), instability, swelling, night pain, during-session vs next-day response, symptom trend, clinician status, clearance status, irritability. No red-flag detection engine anywhere. No clinician/restriction/protocol model anywhere.

---

## §2 — NON-NEGOTIABLE PRODUCT DECISIONS

1. **ONE brain, many composers.** No second bootcamp brain, no PT chatbot, no competing NASM engine, no duplicate prompt rule-dumps. Composers/adapters (PT, Bootcamp, Corrective, Clinician-Coordinated Rehab, Return-to-Training, Return-to-Performance, Long-Horizon, Coach-chat actions) all consume the same context spine, safety spine, ontology, policies, progression engine, and rationale system.
2. **"One brain" means one authority contract — NOT one god service.** Keep safety, knowledge, ontology, composition, validation, audit modular. `swanCoachCortexService.mjs` becomes the facade; existing imports stay backward-compatible.
3. **NASM OPT is the programming constitution.** CES/PES and modality packs (functional-conditioning/CrossFit-inspired, hypertrophy, athletic power, calisthenics, kettlebell/carry work) are subordinate packs that may contribute movements/formats but never override phase appropriateness, readiness, impact budget, movement quality, or clinician restrictions. "Hard" ≠ "more jumping": challenge, impact, load, density, volume, technical complexity, and systemic fatigue are separate dials.
4. **Clinical restrictions define the envelope; NASM programs inside it.** A clinician's restriction, clearance requirement, red flag, or post-op protocol outranks any desired exercise, style, or Sean-preference.
5. **Trainer indispensability (Sean 2026-07-11):** clients get read+do, NEVER decide. Mode switches, plan changes, rehab-stage progression, and restriction edits are trainer/admin/clinician actions only. Client surfaces show what to do and why it's safe — never controls that change the plan.
6. **Deterministic safety first, LLM last.** The LLM interprets, explains, drafts, proposes from eligible pools. It never invents diagnoses, restrictions, exercises outside the registry, citations, or progression clearance. LLM unavailability must not disable any safety behavior.
7. **Privacy:** Rule 8 zero PII to LLMs (IDs only); no diagnoses on shared bootcamp boards; no client history in the knowledge vault; pain/injury/recovery data treated as sensitive-by-design (consent, export, deletion, access rationale are product surfaces).
8. **Language:** "stretching/flexibility" never yoga/meditation (rule 9); "26+ years experience / NASM-protocol," never "NASM-certified."

---

## §3 — AUTHORITY STACK (canonical, encode once)

```
1. Emergency / red-flag / privacy / access-control / legal-scope gates
2. Clinician restrictions, medical clearance, post-op protocols, referrals
3. Current client data: active pain (ALL active, any age), symptom response,
   OHSA/form analysis, readiness, history, recovery, equipment, goals
4. Approved clinical-exercise / rehab / return-to-performance protocols (versioned, cited)
5. NASM OPT + CES + PES + approved specialist domain packs
6. Sean's approved Swan doctrine & coaching preferences (biases, not overrides)
7. Optional modality/style packs
8. LLM interpretation / explanation / drafting / conversational edits
```
Higher layer always wins. Implement as `training-cortex/policy/authorityStack.mjs`, formalizing what `00-cortex-contract.md` already states in prose. Every composer's output records which layers fired (extend the existing fingerprint).

---

## §4 — CLINICAL BOUNDARY: THREE OPERATING MODES

- **A. DURABILITY_AND_CORRECTIVE** (default trainer territory): joint prep, CES Inhibit→Lengthen→Activate→Integrate, mobility/stability, regressions, pain-aware substitutions, gradual rebuild after clearance. This is today's system, hardened.
- **B. CLINICIAN_COORDINATED_REHAB** (requires a verified clinician protocol/restriction/clearance record, §9): organize approved exercises into schedules, stay inside prescribed load/range/movement restrictions, track adherence + symptom response, produce clinician-review summaries, bridge back to normal NASM training. Never silently alter the clinician's plan.
- **C. CLINICAL_REVIEW_REQUIRED** (hard hold): red flags, unresolved clearance, post-op without protocol, worsening neuro-type symptoms, recent significant trauma, unexplained major weakness, or any request outside trainer authority. Generation stops or returns a safe hold/referral response with a trainer-facing reason. User-facing copy: "This needs clinician review before progression" — calm, non-diagnostic.

Mode is computed deterministically from context (never by the LLM), stored on the plan/session, and surfaced in the fingerprint, plan vault, and PDF.

---

## §5 — P0 SAFETY SLICE (build FIRST, before any new intelligence)

Narrow, independently shippable, feature-flag-free (these are corrections, not features):

1. **All active pain loads.** Change the pain query (`clientIntelligenceService.mjs:514`) to `isActive: true` with NO creation-window cutoff (keep `limit`, order by severity+recency). Compute recency separately: the 72h/severity-7 auto-exclude stays; add a `staleActiveIssue` flag (active >30 days without review → reassessment prompt, never silent drop).
2. **Source-state semantics.** Context gains `painDataStatus: 'loaded_no_active_issue' | 'loaded_active_issue' | 'unavailable' | 'stale' | 'never_collected'`, `activeIssueCount`, `lastPainReviewAt`. Rewrite `hasPainContext` (`swanCoachPlanningSafetyGateService.mjs:20-32`) to key on status, not array existence. "No active pain reported" ≠ "pain unknown."
3. **Make the gate blocking on the deterministic path — WITH TIERED SIGNALS (triangle amendment).** `generateWorkout`/`generatePlan` check gate status; blocking uses the same acknowledged-review contract as the long-horizon 409 (`SWAN_COACH_REVIEW_REQUIRED` + `planningReviewAcknowledged`). **Signal tiers are mandatory to prevent alarm fatigue** (alarm fatigue IS a safety failure): **safety-class signals BLOCK** (active pain above severity/recency threshold, `source_data_unavailable`, medical-clearance, referral, special-population); **data-hygiene signals WARN only** (`low_training_history`, `missing_baseline_or_readiness_context`) — otherwise every new client 409s on their first workout and every chronic-pain client acknowledges forever, turning the gate into a reflex click. Chronic active pain gets a severity/recency threshold + a once-per-plan (not per-workout) acknowledgment with change-detection re-prompt. Trainer override requires a reason; audited. State the expected trainer-friction budget in the slice receipt.
4. **Close the chat bypass (honest sizing — this is the biggest §5 slice).** Every `AI_ADD_EXERCISE`-class dispatch from `aiChatService` currently carries free-text `exerciseName` (`coachFrontendDispatchClassifier.mjs:10`) and only passes an event/field allowlist — it **stages** a potentially contraindicated exercise into the client's logger form (draft lane, but the human submitting may be the client the coach just misadvised). The fix requires **exerciseName → registry resolution** (aliases, fuzzy match, custom-exercise handling) BEFORE pain/quality eligibility can even run — that resolution is in-scope work with its own tests, not a footnote. Ineligible → the coach explains why and proposes eligible alternatives.
5. **Bootcamp pain gating — repair the dead query FIRST.** (a) `status: 'active'` → `isActive: true` (the [VERIFIED] schema drift in §1.2#5); (b) fix roster semantics — `createdById: trainerId` fetches trainer-authored entries, not the trainer's clients; aggregate by the trainer's ACTIVE CLIENT list and say so in the output (never imply per-participant safety was computed until real rosters exist); (c) then replace annotate-only with constraint aggregation feeding selection (flagged movements auto-route to Board 2/3 or are excluded per severity), keeping the alerts.
6. **Untagged-exercise fail-safe.** `workoutBuilderService.mjs:231` — exercises with no muscle tags are treated as *potentially affected* under active pain (excluded or warned), not silently passed.
7. **Quality gate fail-closed for safety rejections.** Split rejection classes: style/variety rejections may stand down (current behavior); safety rejections (impact vs pain/readiness) never stand down. Surface `rejected[]` reasons in trainer output (they're already computed).
8. **Tests + audit.** Synthetic regression tests for each of the above (see §14, tests 1-9); every gate decision logs rule ID, inputs-state, result, and policy version.

**Non-goals for this slice:** no diagnosis engine, no clinician-protocol model yet, no ontology migration, no bootcamp rewrite, no textbook ingestion, no new UI beyond the acknowledge-review affordance.

---

## §6 — TARGET SHARED ARCHITECTURE (evolve, don't greenfield)

`backend/services/training-cortex/` grows around the existing services; `swanCoachCortexService.mjs` becomes the facade. Map to reality:

- **policy/** — `authorityStack.mjs`; `nasmOptPolicy.mjs` = THE single OPT acute-variable table (consolidates the 6 backend copies; frontend copies become a generated mirror or API-served constants); `nasmCesPolicy.mjs` (merges `CES_MAP` + `CES_CORRECTIVE_SCHEMA` into one keyed dataset); `nasmPesPolicy.mjs` (new, Phase 5); `swanDoctrinePolicy.mjs` (wraps the coach-brain vault loader).
- **safety/** — `clinicalScopeGate` (mode A/B/C), `redFlagGate`, `medicalClearanceGate`, `clinicianRestrictionGate`, `missingDataGate` (the §5 source-state logic), `specialPopulationGate`. All deterministic, all fail-closed, all audited.
- **context/** — ONE assembler. `clientIntelligenceService` stays canonical; `services/ai/contextBuilder.mjs` is refactored to consume it (not duplicate it) so LLM and deterministic paths see identical safety context.
- **ontology/** — `exerciseOntologyService` (one exercise-access path replacing the bootcamp raw-SQL bridge divergence), `movementPatternService`, `clinicalExerciseProfileService` (§7), `progressionGraphService` (§8), ONE `regionMuscleMap.mjs` (kills the 3 copies).
- **rehab/** — `rehabEpisodeService`, `clinicianProtocolService` (§9), `rehabStageEngine`, `symptomResponseEngine`, `returnToTrainingEngine`, `returnToPerformanceEngine` (Phases 4-5).
- **programming/** — extract from `workoutBuilderService`: `candidatePoolService`, `candidateScorer`, `fatigueModel` (new: local + systemic fatigue cost budgeting), `sessionRoleComposer`, `sessionValidator`, `rationaleService` (already exists in spirit — formalize).
- **modality-packs/** — hypertrophy, strength, functionalConditioning (EMOM/AMRAP/chipper/density/carries/sleds/KB — the REAL implementations of what `FORMAT_CONFIG` only labels), athleticPower, calisthenics, correctiveRecovery.
- **adapters/** — `personalTrainingAdapter` (wraps current builder), `bootcampAdapter` (§11), `longHorizonAdapter`, `swanCoachActionAdapter` (the chat eligibility enforcement from §5.4).
- **audit/** — `planningDecisionAuditService` + `clinicalDecisionAuditService` (extend the fingerprint system).

Rule-4 discipline (≤300 lines/file) applies; this module map is a boundary sketch, not a mandate for 40 micro-files on day one. Every extraction is behavior-preserving with the existing test suites as the harness.

---

## §7 — EXERCISE ONTOLOGY UPGRADE (additive)

**Do NOT bloat the `Exercises` table with the whole clinical ontology.** Split:

- **`Exercises` (existing) gains only high-traffic programming fields** (additive migration): `impactLevel` (none/low/moderate/high), `unilateralMode`, `localFatigueCost`/`systemicFatigueCost` (1-5), `technicalComplexity` (1-5), `balanceDemand`, `setupTimeSec`, `spaceRequirement`, `equipmentQuantity`. Constrained enums/integers — no new free text. **Triangle amendment:** `setupTimeSec` superseding the 3 divergent setup-time tables is a **bridged deprecation, not a same-slice replacement** — new field lands additively, consumers migrate one-by-one with a Rule 20 sibling sweep, old tables die only after a grep-verified zero-consumer check (Rule 34).
- **NEW `exercise_clinical_profiles` table (1:1, FK → Exercises)**: `precautionTags[]`, `contraindicationTags[]` (closed vocab, versioned), `tissueStressTags[]`, `bodyRegionStressTags[]` (keyed to the ONE region map), `permittedRehabStages[]`, `permittedContractionTypes[]`, `rangeProfile`, `requiresClinicianApproval`, `evidenceGrade`, `sourceIds[]` (FK → source registry §10), `reviewStatus/reviewedAt/reviewDueAt`, `policyVersion`. Existing free-text `contraindicationNotes`/`safetyTips` stay as prose; the structured tags are what engines check.
- **Backfill honestly:** profile rows start for the 40 CES exercises + the top-N most-programmed movements; exercises without a clinical profile are treated conservatively in Mode B/C (not assumed safe). No mass AI-generated backfill without the §10 citation gate.
- FK discipline: reference `"Users"`/`"Exercises"` (PascalCase); never the legacy lowercase tables.

---

## §8 — PROGRESSION GRAPH + REHAB ENGINE

**Progression graph:** activate the dormant `prerequisites`/`progressionPath` fields into a real traversal service. **Triangle note:** these are TEXT columns with JSON stringify/parse getters (`Exercise.mjs:105-127`), not JSONB — the graph service must tolerate malformed/legacy strings, and a data-normalization step is in-scope for this slice. `progressionGraphService` answers: "is the client cleared for X?" via demonstrated prerequisites (logged history, form-analysis quality, readiness), and "what's the next rung up/down for X?" The iron-cross lesson generalized: every advanced skill = required capacities + a regression/progression family; a difficulty integer is not a prerequisite model. Graph edges carry criteria (`minSessions`, `formScoreFloor`, `painFreeAtLoad`), not just IDs.

**Rehab stage engine (Phase 4):** a criterion-based state machine — protection → comfortable motion → local capacity → general strength → speed/impact reintroduction → return-to-training → return-to-performance — as an organizational shell whose actual restrictions/criteria come from the active clinician protocol or approved condition templates (§10), never from a universal hardcoded protocol. **Progression never fires on elapsed days alone**; it requires symptom response (during-session + next-day), range/load tolerance, movement quality, and clinician-restriction compatibility. Regression triggers are explicit (worsening next-day response → auto-regress + trainer flag).

**Symptom-response loop (the missing feedback wire):** workout logger gains pre-session pain check-in, during-session symptom marks, post-session response, and a next-day follow-up prompt (client-answerable — read+do, not decide); responses feed `symptomResponseEngine` → readiness + stage decisions. `FormAnalysis.findings.fatigueDetected` + symmetry finally feed readiness. The `PainEntryCorrectiveExercise` junction finally gets its writer: corrective composer records what was prescribed per CES phase, enabling adherence + outcome tracking.

---

## §9 — CLINICIAN PROTOCOL & CLEARANCE MODEL (additive, Phase 4)

New models (FK `"Users"`, additive migrations): `ClientRehabEpisode`, `ClinicianProtocol` (provider ref, region, injury/procedure date, stage, prohibited/permitted movements as closed-vocab tags, range/load restrictions, dosage, milestones, reassessment date, clearance status, document provenance, verification status, expiry), `ClientClinicalRestriction` (flat, queryable, what gates check), `RehabOutcomeMeasure`, `RehabProgressReview`.

**Draft-verify-activate is absolute:** uploaded/extracted protocol → draft with page-level source anchors → trainer/admin (or clinician) verifies every consequential field → only then restrictions activate. OCR/LLM extraction NEVER becomes an active medical restriction without human verification. Expired protocols fail toward Mode C review, not silent lapse. `MovementAnalysis`'s clearance columns migrate conceptually into this model (kept for back-compat, bridged).

---

## §10 — KNOWLEDGE VAULT & EVIDENCE GOVERNANCE

Extend the two patterns that already work — the coach-brain vault (`review_status: approved` ingestion) and the CES taxonomy citation hard-rule — into a general pipeline:

`raw source (licensed/open, access-controlled, NOT bulk-committed textbooks)` → `evidence card / source summary (AI-drafted, source-traceable)` → `structured protocol/decision rule` → `qualified human review` → `versioned approved policy (frontmatter: source_id, evidence_level, review_status, reviewed_by, review_due_at, supersedes, allowed_runtime_uses)` → `deterministic runtime enforcement`.

- **NEW `knowledge_sources` registry table** — normalizes today's free-text `sourceCitation`; corrective/clinical rows FK it; the taxonomy's allowed-source list becomes data the seeder/quality-gate validates against (today nothing enforces it on future rows).
- Runtime rejects: uncited clinical claims, expired/pending-review policies, AI-generated rules without provenance, unresolved contradictions.
- Wiki layering (Karpathy/Obsidian): `clinical-knowledge/{raw,evidence,protocols,pending-review,source-registry}` stays knowledge; `docs/ai-workflow/coach-brain/` stays the approved policy layer; PostgreSQL stays client truth; **no client data ever enters the Wiki.** No full copyrighted textbooks in the repo — licensed private storage + evidence cards + citations.
- Domain-pack rollout order: OPT core (consolidation) → CES (exists, extend toward the taxonomy's ~120-155 target) → orthopedic/MSK rehab-aware lens → PES/return-to-performance → older-adult & youth → chronic-condition/cleared populations. Each pack: sources, scope boundary, deterministic rules, version, owner, synthetic tests, production-eligibility status.

---

## §11 — BOOTCAMP UNIFICATION (Phase 3)

`bootcampAdapter` consumes the shared Cortex; the class-specific value (station flow, boards, space/equipment profiles, sprint memory — all good, keep) stays in the adapter:

1. Exercise access via `exerciseOntologyService` (retire the raw-SQL divergence in `exerciseRolodexBridge` or make the bridge delegate).
2. **Real NASM phase input** — class goal/style resolves a phase through the same `nasmOptPolicy`; kill the `nasmPhase: 2` constant.
3. **Class-wide impact budget** (max % high-impact slots by phase/population) + **skill ceiling** (max technicalComplexity by class level) + fatigue sequencing within the class (systemic-fatigue dial ordering stations).
4. **Real format engines** in the functional-conditioning modality pack: EMOM/AMRAP/tabata/circuit/chipper/density/YGIG generation logic honoring `blockMin`/`restSec` — not label fall-through.
5. **Anonymous constraint aggregation:** per-participant constraints (when rosters exist) collapse to class-level rules ("no overhead station," "jump-free lane") — generalized modification pathways on boards (jump-free / overhead-free / chair-supported / low-impact), never a diagnosis, never one client's medical details.
6. One region→muscle map, one setup-time table (ontology fields), shared quality gate with safety-fail-closed semantics.

---

## §12 — SITE-WIDE INTEGRATION

- **Pain chart / body map:** show ALL active issues + trend + staleness ("active 34 days — reassess"), during/after/next-day responses, clinician status; trainer-facing reassessment queue. Client sees read+do views only.
- **Workout logger:** the §8 symptom-response check-ins; RPE/RIR + per-exercise tolerance capture already-shaped data flows into readiness.
- **Plan vault + PDF (swanPdfKit):** plan documents state mode (A/B/C), phase, rehab stage, active restrictions, progression criteria, policy/source versions, clinician-review date. White-label branding rules apply (Move Fitness clients see MF only).
- **Gamification guardrails:** reward adherence, movement quality, recovery completion, safe progression. NEVER reward training through pain, ignoring red flags, or premature return; recovery XP stays never-billable/never-cursor-advancing (existing `recovery_completions` contract). Streak logic must not punish clinician-ordered holds — a Mode C hold freezes, not breaks, streaks.
- **Admin governance:** source registry queue, expiring-policy queue, contradiction queue, uncited-row queue, clinician-verification queue, override-audit report. Fits the existing admin command-center pattern.
- **Swan Coach chat:** classifies clinical scope BEFORE answering (Mode C questions get the referral script), asks only necessary safety questions, routes to composers, explains deterministic decisions, never claims a write happened unless it did.

---

## §13 — LLM ROLE (unchanged doctrine, now enforced everywhere)

LLM: interpretation, parameter extraction, retrieval of approved knowledge, explanation of deterministic decisions, proposals from pre-filtered eligible pools, summaries, clinician-review drafts, ambiguity detection. Deterministic code: everything in §3 layers 1-5, exercise eligibility, acute variables, fatigue/impact budgets, progression prerequisites, final validation. The `outputValidator` pattern (PII → Zod → NASM rules) extends to every LLM-touching surface including chat dispatches (§5.4).

---

## §13.5 — COACH PRESENCE & PERSONALITY LAYER (the "beyond-Jarvis" gap — added 2026-07-12 per Sean)

The Cortex above makes Swan Coach *correct*; this layer makes it *alive*. Target persona: **genius but humble, warm, cool, quietly funny, benevolent** — a world-class coach in your corner, never a smug robot, never clinical-cold, never hype-cringe. Never "AI" user-facing.

1. **Persona is versioned policy, not prompt vibes.** New coach-brain vault doc `docs/ai-workflow/coach-brain/10-coach-persona-and-voice.md` (`brain: swan_coach_cortex`, `review_status: approved`) — voice principles, register per audience (client / trainer / admin), banned tones, example rewrites. Loaded by the existing vault loader; versioned, reviewable, testable like every other policy.
2. **Personality sits at authority layer 8 — below everything.** A deterministic refusal stays a refusal; persona only changes HOW it's said ("charming no is still a no"). Tone state machine keyed to clinical mode: Mode A full personality; active-pain/Yellow-Red readiness → warm, steady, zero jokes about the issue; Mode B/C → calm, supportive, referral script verbatim. Humor NEVER about pain, injury, body weight, appearance, or missed sessions — it punches at the workout, not the person. Per-client `reducedPersonality` setting.
3. **Client memory = the aliveness engine (grounded, never invented).** The coach references only real logged data from the existing context spine: PRs and streaks ("that's three Mondays in a row — the bench PR from last month is about to have company"), past pain patterns ("overhead pressing bugged your shoulder in May — we're going landmine today"), preferences, milestones. Zero-PII discipline unchanged (IDs in prompts, names mapped client-side). A memory claim the DB can't back is a defect, not a feature.
4. **Proactive beats (the Jarvis part), all consent- and cadence-gated:** pre-session brief (today's plan + one-line why), post-session recap + celebration hook into gamification/community share, next-day symptom follow-up (§8 loop — safety and presence are the same wire), streak-risk and milestone nudges, trainer morning digest (who trained, who's stale, who needs eyes). Hard proactivity budget: caps/day, quiet hours, one-tap mute — an assistant that spams is not Jarvis, it's a popup.
5. **Explainability as charm.** The existing `rationale[]`/`explanations[]` system gets a conversational renderer — the coach explains *why* in plain human language ("readiness came back yellow, so plyo is out and sled work is in — same engine, kinder chassis"). Transparency is the personality.
6. **One voice everywhere:** chat, notifications, plan-vault copy, PDF cover notes (inside white-label rules — Move Fitness clients get the MF-branded register), bootcamp boards (class-hype register). Same brain, same soul, register-switched.
7. **Feels-fast engineering:** streaming responses (depends on the pending B1b SSE spike flag), instant ack then substance, optimistic UI on coach actions. Latency is a personality trait.
8. **Outbound notification privacy (triangle amendment — hard rule).** Proactive beats push content OUT to lock screens, shared devices, and possibly Telegram. Rule 8 constrains what goes INTO LLMs; this constrains what goes OUT: push/SMS/email envelopes are **generic** ("Your coach left you a note" / "Time to check in") — body-region, pain, symptom, and clinical-mode detail appears ONLY behind an authenticated surface. Server-side envelope minimizer with its own test (test 30).
9. **Visual language for brain states (Gemini design fold, Rule-6-corrected).** The Cortex's states get a real UI system, built via `swan-design-router` at implementation time: Mode A/B/C status pill (A = Ice Wing outline, B = Gilded Fern outline + verified check, C = Wing Purple filled w/ subtle pulse), `SafetyGateModal` for the acknowledged-review contract (calm-authoritative: blurred obsidian overlay, graphite card, shield icon, override reason required, Dual-Button Glow discipline), "charming-no" chat variant (Wing Purple left-border + eligible-alternative suggestion chips), living body map (SVG hotspots, severity-mapped glow, slow pulse on `staleActiveIssue`), ontology stat glyphs on exercise cards (Arctic Cyan, Fira Code — data only). **Implementation constraint overriding Gemini's example code:** all colors via `var(--token, #fallback)` (Rule 6), NOT a new theme-provider object; motion via existing framer-motion (`^10.16.5`, in-repo pattern) honoring `prefers-reduced-motion`; full a11y — ARIA roles + focus trap on the gate modal, screen-reader text for every state icon ("a safety gate a screen reader can't understand is not a safety gate"); 44px targets; verified at the responsive matrix incl. 320px.

---

## §14 — SYNTHETIC EVALUATION SUITE (versioned, no real client data)

P0 regression (Phase 1): (1) active pain entry 45 days old appears in context; (2) `loaded_no_active_issue` ≠ `unavailable` ≠ `never_collected` produce distinct gate outcomes; (3) pain-fetch failure blocks aggressive generation (review-required path); (4) deterministic `generateWorkout` returns the review contract when gate fires; (5) chat `AI_ADD_EXERCISE` for a pain-excluded exercise is refused server-side with an eligible alternative; (6) bootcamp flagged movement cannot land on Board 1 unmodified; (7) muscle-untagged exercise is excluded under active regional pain; (8) safety-class quality-gate rejection never stands down; (9) trainer override requires reason + lands in audit.

Cortex/foundation (Phases 2-3): (10) exactly ONE OPT acute-variable table feeds builder, candidate service, progression, dispatcher, bootcamp; (11) merged CES dataset serves both old key spellings; (12) uncited corrective/clinical row cannot activate; (13) expired policy fails toward review; (14) LLM-path and deterministic-path context expose identical pain/safety blocks; (15) bootcamp respects phase-resolved impact budget + skill ceiling; (16) EMOM/AMRAP produce structurally distinct outputs honoring timing config; (17) LLM outage leaves all deterministic generation + gates fully functional.

Rehab/clinical (Phases 4-5): (18) clinician restriction overrides NASM preference, Sean doctrine, and modality packs; (19) extracted protocol cannot activate without human verification; (20) stage progression blocked on elapsed-time-only; worsening next-day response auto-regresses + flags; (21) advanced skill unselectable before prerequisite-graph criteria; (22) Mode C red-flag input produces hold/referral, zero exercise suggestions; (23) client role cannot trigger mode/stage/restriction changes (trainer-indispensability); (24) no PII in vault content, prompts, or audit records; (25) gamification awards zero points for sessions logged against a Mode C hold.

Presence layer (§13.5): (26) persona/humor fully mutes in Mode B/C and around active-pain topics; (27) a deterministic refusal remains a refusal regardless of persona rendering (charming no = same no, same audit record); (28) every coach "memory" reference resolves to the CORRECT DB record — attribute-level match (record ID + body region + date), not mere existence ("your knee" when it was the shoulder = failure); (29) proactivity budget caps and quiet hours are enforced server-side; (30) outbound notification envelopes contain zero body-region/pain/symptom/clinical-mode detail (generic envelope only; detail auth-gated).

---

## §15 — IMPLEMENTATION PHASES (each independently shippable + reversible)

- **Phase 0 — Reconciliation (docs-only):** this directive ratified (triangle review), architecture decision record, stale-doc markings (`COACH-CORTEX-V3.0-ULTIMATE.md`, NASM 4-tier blueprint, old validation prompts → mark historical/superseded where contradicted).
- **Phase 1 — P0 Safety Truth (§5):** the seven fixes + tests 1-9. High value; mostly small diffs EXCEPT §5.4 chat eligibility (exerciseName→registry resolution is real engineering — size it as its own sub-slice). UI companions built in-phase (Gemini lockstep, backend gates land first within the phase): `SafetyGateModal` + charming-no chat variant per §13.5.9 — the 409 acknowledged-review contract needs a usable surface to avoid alarm-fatigue-by-ugliness.
- **Phase 2 — Consolidation & Ontology Foundation:** single OPT table, merged CES dataset, one region map, one exercise-access path, unified context assembler, `knowledge_sources` registry, ontology additive migration + clinical-profile table (§7). Tests 10-14. **Decide before the phase:** frontend NASM constants = build-time **generated mirror** (API-served collides with Vite build-time env constraints).
- **Phase 3 — Shared Cortex + Bootcamp Adapter:** programming extractions (§6), bootcamp unification (§11). Tests 15-17. **Format engines are demand-gated** (triangle amendment): build each style engine (EMOM/AMRAP/tabata/chipper/density/YGIG) only when that class style is actually used/requested — not all six speculatively (Karpathy #2).
- **Phase 4 — Corrective + Clinician-Coordinated Rehab:** §9 models, rehab stage engine, symptom-response loop, junction writer, Mode B end-to-end. Tests 18-20, 22-23. **Phase 4's Village/review pass includes a legal-scope checklist** (Mode B approaches regulated-practice boundaries in some jurisdictions), not just code review.
- **Phase 5 — Performance:** PES pack, return-to-performance engine, progression-graph enforcement at selection, sport demand profiles. Test 21.
- **Phase 6 — Knowledge Compilation & Learning:** wiki ingestion pipeline, evidence cards, contradiction detection, de-identified outcome analytics. No silent clinical-rule learning — everything through the §10 review gate.
- **Cross-cutting — Presence layer (§13.5):** the persona vault doc + tone state machine land with Phase 2 (cheap, docs+policy); conversational rationale renderer + proactive beats land with Phase 3; streaming/SSE rides the existing B1b spike flag. Tests 26-29 gate each landing.

Per-phase discipline: Rule 48 audit record at close; Rule 42 pre-push backend audit; batch-push cadence (commit per slice, ONE push per batch); Tier-B review per Rule 46 (Fable final decider); Tier-C paid Village only with Sean's per-run permission — warranted candidates: Phase 4 clinical models (health data) and Phase 2 migration set.

---

## §16 — REQUIRED DELIVERABLES PER PHASE

1. File-and-line evidence receipts (Rule 26 where UI surfaces are touched).
2. Schema cross-check artifact for any model change (Rule 29) — drift classes per Rule 58 actively checked (dual `users`/`"Users"`, case drift, FK targets).
3. Migration risk analysis + rollback path (additive-only; reversible).
4. Test results (targeted suites + baseline disclosure per Rule 56).
5. Updated synthetic evaluation suite.
6. Verification receipt: files changed, migrations, tests run/results, unresolved risks, flags, rollback.
7. No completion claims for unimplemented components; residual risk stated plainly.

**Final principle:** ONE SWAN COACH · ONE CORTEX · NASM-GOVERNED · CLINICIAN RESTRICTIONS AS HARD BOUNDARIES · DETERMINISTIC SAFETY FIRST, LLM LAST · EXPERT KNOWLEDGE WITHOUT FALSE MEDICAL AUTHORITY · TRAINER STAYS INDISPENSABLE.
