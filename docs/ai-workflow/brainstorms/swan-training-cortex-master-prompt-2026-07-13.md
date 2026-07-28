# SWAN Training Cortex — Fable Audit + Remade Master Prompt (v2)
**Date:** 2026-07-13 · **Author:** Fable 5 (Final Decider) · **Owner:** Sean Swan, SWAN Studios
**Status:** MASTER PROMPT — this v2 supersedes the raw v1 draft as the operating prompt. The v1 text is preserved as Annex A (binding requirements source).
**Supersedes:** Sean's v1 "SWAN Training Cortex" draft (2026-07-13, chat-delivered).

---

# PART A — FABLE'S AUDIT OF THE v1 SPEC

## A1. Verdict

The v1 spec is **substantively excellent and directionally right** — comprehensive domain coverage,
correct legal posture on NASM, correct scope-of-practice humility, correct source-lineage thinking.
Its one structural flaw is fatal if uncorrected: **it was written as if SwanStudios were an empty
repo.** It is not. A repo scan (2026-07-13) found:

| v1 asks for | Already exists (file evidence) |
|---|---|
| "Model & retrieval architecture… Layer 4 SWAN Methodology" | `backend/services/swanCoachCortexService.mjs` + `swanCoachCortexPolicyConfig.mjs` — a live Cortex policy loader reading the **coach-brain vault** |
| Knowledge/doctrine store | `docs/ai-workflow/coach-brain/` — 10 docs: `00-cortex-contract.md`, `01-sean-style-intake.md`, `02-sean-training-doctrine.md`, `03-nasm-swan-programming-rules.md`, `04-guided-generation-flow.md`, `05-client-output-privacy.md`, `06-full-plan-pdf-contract.md`, `07-implementation-roadmap.md`, `08-joint-integrity-and-release.md`, `09-brain-map-diagram.md` |
| Exercise ontology (Deliverable 6) | `backend/models/Exercise.mjs` (355 lines, 736-exercise catalog) already carries: `optPhases`, `nasmMovementPattern`, `nasmCorrectiveCategory`, `cesProtocolStep`, `sourceCitation`, `scientificReferences`, `coachingCues`, `contraindicationNotes`, `progressionPath`, `prerequisites`, `force`, `mechanic`, `aliases`, `unlockLevel` (gamification) |
| Intake / health screening (Domains 1–2) | `ClientOnboardingQuestionnaire`, `ClientOnboardingCoverageItem`, `Orientation`, `WaiverRecord`+`WaiverConsentFlags`, `ClientBaselineMeasurements`, `coachIntakeContextService` |
| Movement analysis (Domain 5) | `MovementAnalysis`/`MovementProfile` + 7-step admin wizard + `clientMovementScreenService.mjs`; separate `FormAnalysis` (pose/video) |
| Program generation (Domains 21, 36, 46) | `workoutBuilderService.mjs` (deterministic) + `ai/workoutGenerationSchemas.mjs`/`longHorizonPromptBuilder.mjs` (LLM) + `nasmPhaseDispatcher.mjs` + `LongTermProgramPlan`/`ProgramMesocycleBlock` + full PDF pipeline |
| Pain & corrective (Domains 16, 24) | `ClientPainEntry`, `PainEntryCorrectiveExercise`, `correctiveExerciseService.mjs`, `nasmWorkoutLogAnalysisService.mjs` |
| Safety/privacy AI plumbing (Domain 44) | `phiScanner.mjs`, `deIdentifier.mjs`, `inputSanitizer.mjs`, `outputValidator.mjs`, `EthicalAIPipeline`, `AiCommandAuditLog`, `AiConsentLog`, `AiPrivacyProfile` |
| Human-in-the-loop (Domain 47) | Coach action-proposal engine (~10 `coachActionProposal*` services) with approve/reject governance |
| Workout rolodex (Domain 35) | `WorkoutSession`/`WorkoutExercise`/`Set`/`WorkoutLog`/`ExerciseTrend`/`personal records` via gamification + progress models |
| Bootcamps (Domain 20) | `bootcamp/bootcampGenerator.mjs`, `sprintGenerator.mjs`, `BootcampExercise`/`BootcampStretch` |

**Therefore: the Cortex project is a brownfield UPGRADE-AND-UNIFY, not a greenfield build.**
Roughly 60% of v1's 50 proposed tables already exist under different names. Building them again
would create exactly the competing-surface disease CLAUDE.md rules 26–31 exist to kill.

## A2. Gaps in v1 (what Sean's draft missed) — Fable's additions

1. **Brownfield mandate (biggest).** v1 says "inspect the repository" only in its final paragraph.
   v2 makes repo-mapping Phase 0 with a required Existing-vs-Proposed reconciliation table before
   ANY schema is approved.
2. **Product Core Loop integration.** The Cortex is not a side-brain; it must power the app's main
   loop: log workout → progress proof → **next best action** → shareable milestone. v1 never
   connects knowledge rules to the next-best-action surfaces on the user/trainer/admin dashboards.
3. **Trainer indispensability doctrine (Sean 2026-07-11).** Clients get read+do, NEVER decide.
   The Cortex must enforce: plan switching and planData edits are trainer-only; client-facing
   Cortex output is explanation + execution guidance, never self-service reprogramming. v1's
   "client-facing assistant" section was silent on this.
4. **Retrieval architecture decision.** v1 assumes a knowledge base without choosing its physical
   form. Repo truth: NO vector/embedding infra exists; the working pattern is markdown vault →
   frontmatter-parsed policy (`swanCoachCortexService`). v2 phases this deliberately:
   Phase 1 = extend the vault + structured DB rules; RAG/embeddings only if/when rule volume
   demands it (own decision gate, not assumed).
5. **Cost/model-tier routing.** Every Cortex answer can't be a frontier-model call. v2 requires a
   query-tier map: deterministic rule lookup (free, DB) → cheap model synthesis → frontier model
   only for novel program generation / conflict resolution. Reuses existing `providerRouter.mjs` /
   `modelSelector.mjs` / `providerCostTracker.mjs`.
6. **Duplicate-surface consolidation is a prerequisite.** The scan flagged: 3+ onboarding wizards
   (`ClientOnboardingWizard` ×2 + `UnifiedOnboardingWizard`) with 5 overlapping backend route
   families; 2 exercise-creation wizards; parallel exercise tables (`Exercise` vs
   `BootcampExercise`/`BootcampStretch`/`SprintExerciseMemory`); and **two plan-generation
   philosophies** (deterministic builder vs LLM doctrine-driven) feeding the same `WorkoutPlan`
   shape. The Cortex must name ONE canonical generation path and one canonical intake path —
   otherwise knowledge rules will fire on some surfaces and not others (data-truth violation).
7. **Zero-PII hard gate (Rule 8).** v1's privacy section is generic. v2 binds it to the house law:
   client IDs only to LLMs, names mapped client-side, all Layer-5→LLM traffic through the existing
   `deIdentifier`/`phiScanner` pipeline. Non-negotiable.
8. **Credentials language law.** "26+ years experience," "NASM workshop-trained / NASM-protocol" —
   NEVER "NASM-certified." v1's brand policy was compatible but didn't state the exact house strings.
9. **Wording bans.** "stretching/flexibility" never "yoga/meditation" (Rule 9); no injury-prevention
   promises (v1 had this — kept); Swan Coach is never called "AI" user-facing.
10. **Gamification linkage.** `Exercise.unlockLevel`, XP, streaks, milestones already exist. Cortex
    rules should feed them (e.g., progression events → milestone/XP triggers) — v1 ignored the
    entire engagement layer that makes the product sticky.
11. **PLAUD / voice lane.** Dictated session logs (`workoutLogParserService`, plaudCommands) are a
    primary ingestion path for Sean's real coaching decisions — the richest source of Domain 40
    (Sean's brain) data. v1 treated interviews as the only extraction channel.
12. **Knowledge capture via grill-me.** Domain 40's interview = the existing `grill-me` skill run
    against coaching topics, checkpointed to brainstorm docs, then promoted into vault/rules. Don't
    invent a second interview system.
13. **Ops constraints v1 omitted:** feature flags default-off (v1 had this — kept); FKs reference
    `"Users"` not `users`; schema-drift check (Rule 58) on every touched model; ≤300 lines/file;
    styled-components only + Crystalline Swan tokens for every UI surface; Victory-only charts;
    migration safety on the production DB (local dev IS production DB).
14. **Copyright vault placement.** Restricted source excerpts (Layer 1) must NOT live in this git
    repo (it deploys to Render and has leaked before). They belong in the Hermes desktop vault
    (`~/.hermes`) or R2 private bucket with access controls; the repo stores metadata + rules only.
15. **Charts & progress-proof visualization (Sean directive 2026-07-13).** The Cortex's richer
    data (rolodex, progression/regression events, readiness, pain trends, rule-driven milestones)
    must flow into **more and better Victory charts** — beautiful, premium, Crystalline-Swan-styled
    (Victory only, Rule 10; `SafeChart` lazy-load pattern). This includes the existing
    **client custom-chart builder** vision: clients can compose their own charts from their real
    logged data, and every new Cortex data stream (per-exercise history, PRs, phase distribution,
    readiness, adherence) must be exposed as selectable series for it. Chart truthfulness rule
    applies: charts render real logged data only; mock data is a gap to replace. Owned by Phase 4
    (Surface Integration) with the dashboard next-best-action work.
16. **Execution method.** v1 asks Fable for 30 deliverables in one breath. v2 routes execution
    through **`fable-blueprint-forge`**: Fable forges the decision-dense build package
    (diagrams, contracts, slices, acceptance criteria), a builder executes slice-by-slice, Fable
    checkpoints each boundary. That is how "planned, not vibe-coded" actually gets enforced.

## A3. Risks (top of the register)

| # | Risk | Class | Mitigation in v2 |
|---|---|---|---|
| R1 | Rebuilding what exists → competing surfaces, schema drift | Technical | Phase 0 reconciliation table; Rule 26/27 receipts before any new table |
| R2 | NASM IP overreach (reproducing expressive content) | Legal | v1's transformation pipeline kept verbatim; restricted excerpts OUT of repo (A2.14) |
| R3 | Scope-of-practice / medical liability | Legal/Safety | v1 Domains 2/16/24/26 kept verbatim; red-flag stop rules become deterministic code, not LLM judgment |
| R4 | Client PII reaching LLMs via Layer 5 | Privacy | Rule 8 hard gate through existing deIdentifier/phiScanner |
| R5 | Cortex undermines trainer value | Product | Trainer-indispensability doctrine (A2.3) encoded as rule-engine law |
| R6 | Token cost explosion | Cost | Query-tier routing (A2.5); deterministic rules answer first |
| R7 | 30-deliverable big-bang stalls | Delivery | Blueprint-forge slicing; each phase ships behind flags with acceptance criteria |
| R8 | Knowledge rules go stale (Sean keeps learning) | Product | v1's versioning/review-due kept; continuing-ed ingestion is a standing lane |

---

# PART B — THE REMADE MASTER PROMPT (v2, OPERATIVE)

> **PROJECT: SWAN Training Cortex v2 — Unify, Deepen, and Operationalize Sean Swan's Coaching
> Intelligence inside SwanStudios.**
> Owner: Sean Swan. Final Decider: Fable 5. Builder: per `fable-blueprint-forge`.

## B0. Prime directive

Evolve the EXISTING SwanStudios coaching intelligence — the coach-brain vault, the
`swanCoachCortexService` policy loader, the 736-exercise taxonomy, the coach dispatch/proposal
engine, and the intake/movement/plan surfaces — into the full SWAN Training Cortex described in
Annex A: a structured, source-traceable, safety-governed digital extension of Sean Swan's coaching
brain that powers assessment, program generation, progression, pain response, bootcamps, athlete
training, and client education across all four dashboards.

**This is a brownfield unify-and-deepen project. Creating a parallel new system is failure.**

## B1. Binding requirement sources (in precedence order)

1. CLAUDE.md rules (all 67+) — house law wins over everything below.
2. This v2 prompt (Parts B + A2 gap additions).
3. **Annex A — Sean's v1 spec in full.** Every domain (1–53), schema field list, source category,
   status label, hierarchy tier, deliverable, table, and test in v1 remains a binding requirement
   EXCEPT where Part A2/B amends it (brownfield mapping, PII gate, trainer doctrine, vault
   placement, execution method). Nothing else in v1 is dropped. Do not re-litigate it; build to it.
4. `docs/ai-workflow/coach-brain/00-cortex-contract.md` and siblings — the live doctrine the v2
   Cortex extends.

## B2. Non-negotiable house laws restated for this project

- **Positioning:** "SWAN's proprietary coaching methodology, informed by professional education,
  NASM principles, continuing education, practical coaching experience, movement science, and
  current evidence." Never NASM-official/endorsed/certified-platform. Credentials strings:
  "26+ years experience," "NASM workshop-trained / NASM-protocol" — never "NASM-certified."
- **Quiet application:** apply principles without announcing sources user-facing; internal
  citations always; explicit NASM attribution only in the seven cases Annex A lists.
- **Zero PII to LLMs (Rule 8):** client IDs only; every Layer-5 context passes
  `deIdentifier`/`phiScanner`; names map client-side.
- **Trainer indispensability:** clients read + do; trainers decide. No client-facing surface may
  switch active plans or edit planData. Cortex explains to clients; it proposes to trainers;
  Sean approves methodology.
- **Never diagnose.** Observation → modification → referral language only (Annex A Domain 16/24
  verbatim). Red-flag stop/escalation rules are deterministic code paths, not model judgment.
- **No injury-prevention promises; "risk reduction."** "Stretching/flexibility," never
  yoga/meditation. Swan Coach, never "AI," user-facing.
- **Restricted source material lives OUTSIDE this repo** (Hermes desktop vault or private R2);
  repo carries metadata, rules, and citations only. Quotation limits per Annex A.
- **All new functionality behind default-off feature flags; production stays green; FKs reference
  `"Users"`; Rule 58 drift check on every touched model; ≤300 lines/file; styled-components +
  Crystalline Swan tokens + Victory only on UI.**

## B3. Target architecture (7 layers, mapped to repo reality)

| Layer (Annex A §45) | v2 physical home |
|---|---|
| 1 Source Library | Metadata + permissions in DB (`knowledge_sources` etc.); restricted files in Hermes vault / private R2 — NOT this repo |
| 2 Normalized Knowledge | Extended coach-brain vault (`docs/ai-workflow/coach-brain/`) + new `knowledge_concepts` table |
| 3 Operational Rules | New `knowledge_rules` (+ `rule_sources`, `rule_versions`, `rule_conflicts`, `rule_approvals`) using Annex A's rule schema; loaded by an extended `swanCoachCortexService` |
| 4 SWAN Methodology | Existing vault doctrine docs + `swan_methodology`/`coaching_preferences`/`coaching_cues` tables; Sean-approval workflow (Domain 42) |
| 5 Client Context | EXISTING models (onboarding, waivers, baseline, pain, progress, rolodex) — extended only where Annex A fields are missing; PII-gated |
| 6 Program Generation | ONE canonical path: the deterministic `workoutBuilderService` candidate engine governed by Layer-3 rules, with LLM synthesis (existing schemas/prompt builders) as the explanation/creative layer — not a second independent generator |
| 7 Review & Outcomes | Existing proposal/approval engine + `trainer_reviews`, `outcome_metrics`, `knowledge_feedback`, existing audit logs |

Retrieval: structured rules + vault first. Embeddings/RAG is a Phase-gated future decision, not an
assumption.

## B4. Phase plan (each phase = a `fable-blueprint-forge` package; flags default-off)

- **Phase 0 — Repo Truth & Reconciliation (no code).** Canonical-surface receipts for every
  Cortex-adjacent surface; the Existing-vs-Proposed table for all ~60 Annex-A tables
  (exists-as / extend / new / kill-duplicate); consolidation decisions: ONE intake path, ONE
  exercise catalog strategy (fold bootcamp/sprint variants), ONE generation path, Movement-vs-Form
  analysis relationship. Output: reconciliation doc + Sean sign-off.
- **Phase 1 — Knowledge Spine.** `knowledge_sources`, `knowledge_concepts`, `knowledge_rules` +
  versioning/conflict/approval tables; source classification A–T; status labels; citation levels
  1–5; the ~2000 NASM workshop source record (Annex A verbatim); admin review UI (Domain 42);
  extend `swanCoachCortexService` to load DB rules alongside vault doctrine.
- **Phase 2 — Sean's Brain Capture.** grill-me-driven interview program (Domain 40 question set),
  checkpointed to brainstorm docs → promoted to rules with `Needs Sean Review` → `Sean Approved`;
  PLAUD/voice-log mining lane for real-session decisions; each rule cites source lineage.
- **Phase 3 — Decision Engines.** Safety/referral engine (Domain 2/24 red-flag deterministic
  rules), progression/regression engine (Domain 22), autoregulation (Domain 23), eligibility +
  contraindication checks wired into the canonical generation path; explanation engine (Domain 36)
  producing the multi-level outputs (Domain 29/48).
- **Phase 4 — Surface Integration.** Cortex-driven next-best-action on user/trainer/admin
  dashboards; bootcamp generator governed by rules (Domain 20); sport-specific + special-population
  rule packs (Domains 18–19); gamification hooks (progression events → XP/milestones);
  **charts upgrade (A2.15):** new Victory chart suite over Cortex data streams + wiring every new
  data stream into the client custom-chart builder as selectable series — real logged data only.
- **Phase 5 — Learning Loop.** Outcome tracking → rule-effectiveness review (Layer 7), continuing-ed
  ingestion lane, knowledge-gap reports, scheduled review-due sweeps.

Each phase closes with Annex A §51 tests relevant to it, the Rule 48 audit record, and Sean sign-off.

## B5. Deliverables

All 30 Annex-A deliverables stand, re-sequenced into the phases above, with three amendments:
(D21/D50) database plan must be the reconciliation-mapped version, not greenfield; (D25) roadmap =
B4; (D30) acceptance criteria must be executable per `fable-blueprint-forge` (named tests, exact
API calls + expected JSON, viewport checks) — never prose-only.

## B6. First actions when this prompt is executed

1. Run Phase 0 (repo truth + reconciliation) — nothing else may start before it.
2. Return: hostile review of THIS v2, remaining blind spots, the reconciliation table, questions
   requiring Sean's decision (start with: retrieval form, intake-path winner, generation-path
   governance, bootcamp table fold, restricted-vault location).
3. Then forge the Phase 1 blueprint package and await Sean's go.

---

# ANNEX A — Sean's v1 specification (binding, verbatim by reference)

The full v1 text ("PROJECT TITLE: SWAN Training Cortex … Place all new functionality behind
appropriate feature flags until reviewed and approved") delivered by Sean 2026-07-13 in chat is
incorporated here in its entirety as binding requirements: Primary Mission; Core Positioning;
Brand Language Policy; Knowledge Sources 1–55; Source Classification A–T; Source Record fields;
the ~2000 NASM Workshop record + verification policy; Knowledge Transformation pipeline;
Originality/Copyright boundaries (may/may-not lists); Authority Hierarchy 1–13; Status Labels;
Knowledge Rule Schema; Domains 1–48 (intake → output modes); Deliverables 1–30; Database tables;
Testing Requirements; Quality Standard; Final Instruction. Where v1 and this v2 conflict, v2 wins;
where v1 and CLAUDE.md conflict, CLAUDE.md wins.

## Annex A verbatim substance (v1, Sean 2026-07-13 — full text, compacted formatting only)

PROJECT TITLE: SWAN Training Cortex — Comprehensive Coaching Knowledge, Programming, Safety, and Decision Engine. PROJECT OWNER: Sean Swan, SWAN Studios.

PRIMARY MISSION: Build a comprehensive proprietary coaching intelligence system that accurately represents the full body of knowledge Sean Swan uses when assessing clients, designing workouts, coaching movement, modifying exercises, progressing programs, responding to pain or limitations, teaching clients, creating bootcamps, training athletes, and managing long-term client outcomes. This system must not be a shallow workout generator. It must function as a structured representation of Sean's professional coaching brain. It must understand: what Sean knows; where that knowledge came from; how Sean applies it; how recommendations change based on the individual; how exercises are selected; how exercises are modified; how programs are progressed; when training should stop; when medical clearance or referral is appropriate; how historical methods differ from current evidence; how to distinguish education, experience, preference, and verified guidance; how to explain recommendations without overusing third-party branding; how to generate original SWAN programs from the combined knowledge base. The goal is not to reproduce NASM books, courses, or training materials. The goal is to ensure that the SWAN Training Cortex knows and can operationalize the knowledge Sean legitimately acquired through NASM education, other professional courses, certifications, workshops, independent study, mentorship, practical coaching, and decades of direct experience.

CORE POSITIONING: Position as "SWAN's proprietary coaching methodology, informed by professional education, NASM principles, continuing education, practical coaching experience, movement science, strength and conditioning principles, and current evidence." Do not position as: an official NASM product; an NASM-certified software platform; an NASM-approved protocol; an NASM replacement; a digital copy of NASM educational materials; a system endorsed, licensed, sponsored, or operated by NASM; a system that applies only one certification organization's philosophy. NASM may be a major knowledge source and an important foundation, but SWAN is the governing methodology and product identity.

BRAND LANGUAGE POLICY: Do not overtalk NASM in user-facing output; normally apply principles without announcing the source. Preferred user-facing language: "Based on your assessment…"; "The safest progression is…"; "This movement should be regressed because…"; "Your current program emphasizes stability before increasing load."; "The exercise was selected to improve control, strength, and movement quality."; "This recommendation follows established training and movement principles."; "Your next phase will gradually increase intensity while maintaining control." Explicit NASM attribution only when: Sean asks; a trainer reviews source lineage; comparing methodologies; documenting continuing education; a citation is needed for an internal rule; a source audit is performed; the user asks which framework informed a decision. Preferred attribution: "Informed in part by NASM education and the OPT model."; "Based on Sean's NASM training and broader coaching methodology."; "This principle is consistent with NASM programming concepts."; "Source lineage includes NASM education, Sean's practical experience, and current evidence." Avoid trademarked names in every program, workout, phase, screen, or explanation.

KNOWLEDGE SOURCES (accept and organize all; extensible without redesign): 1 NASM textbooks owned by Sean; 2 NASM course materials lawfully obtained; 3 NASM certifications completed; 4 NASM workshops attended; 5 Sean's approximately-2000 NASM workshop; 6 personal notes from workshops/courses; 7 recollection of live instruction; 8 other fitness certifications; 9 continuing education; 10 conference sessions; 11 seminars; 12 webinars; 13 professional workshops; 14 trainer manuals; 15 strength & conditioning education; 16 corrective exercise education; 17 sports performance education; 18 nutrition education within scope; 19 youth fitness education; 20 senior fitness education; 21 behavior-change education; 22 mobility/flexibility education; 23 exercise technique education; 24 physical therapy concepts via professional exposure; 25 rehabilitation-adjacent knowledge within trainer scope; 26 lessons from physical therapists; 27 lessons from athletic coaches; 28 lessons from healthcare professionals; 29 peer-reviewed research; 30 professional position statements; 31 ACSM guidance; 32 NSCA guidance; 33 government physical activity guidance; 34 equipment manufacturer instructions; 35 Sean's personal training experience; 36 athletic experience; 37 bodybuilding; 38 swimming; 39 track; 40 major commercial gym work; 41 work with beginners; 42 older adults; 43 deconditioned clients; 44 athletes; 45 clients with movement limitations; 46 program results; 47 regressions/progressions; 48 coaching cues; 49 client communication methods; 50 real-session success/failure observations; 51 SWAN original methods; 52 future education; 53 future research Sean approves; 54 qualified-professional feedback; 55 de-identified SWAN client outcome data.

SOURCE CLASSIFICATION: A Formal Certification Education; B Continuing Education; C Published Professional Textbook; D Live Workshop or Seminar; E Personal Course Notes; F Professional Recollection; G Peer-Reviewed Research; H Professional Organization Guidance; I Government Guidance; J Equipment Manufacturer Guidance; K Licensed Healthcare Professional Direction; L Sean's Practical Coaching Experience; M SWAN Original Methodology; N Client Outcome Observation; O Historical Training Method; P Current Industry Practice; Q Unverified or Pending Review; R Superseded Guidance; S Conflicting Evidence; T User-Submitted Information.

SOURCE RECORD FIELDS: sourceId; sourceTitle; sourceType; organization; author/instructor; edition; publication year; workshop date; attendance date; completion date; certification name; certification status; source owner; file location; source format; chapter; page; module; lesson; timestamp; Sean's notes; source summary; topics covered; historical/current status; evidence level; review status; reviewedBy; lastReviewedAt; nextReviewAt; copyright sensitivity; user-display permissions; internal-use permissions; quotation restrictions; commercial-use restrictions; conflicts with newer guidance; replacement source; confidence level; implementation notes.

THE ~2000 NASM WORKSHOP: legitimate professional lineage; must not be ignored for age or incomplete documentation. Dedicated source record — name: Sean Swan NASM Workshop Education; ~2000; live professional workshop/continuing education; formats: recollection, memory, notes/handouts if available, remembered exercises/concepts/programming methods, techniques Sean kept using, concepts later reinforced by experience; status: historical professional education. Use policy: may be incorporated into Sean's knowledge profile and SWAN methodology. Verification policy: any safety-sensitive, medical, nutritional, rehab-related, or highly specific physiological recommendation originating primarily from it must be checked against newer evidence before becoming an authoritative automated rule. Historical knowledge is never deleted for newness alone — label: still supported; supported with modification; historically relevant; superseded; contradicted; requires verification; incorporated into Sean's approach; replaced by a safer/more effective modern method.

KNOWLEDGE TRANSFORMATION: source material → extracted concept → normalized principle → Sean-specific interpretation → operational training rule → safety constraints → client eligibility criteria → exercise selection criteria → progression/regression logic → original SWAN explanation → internal citation → validation status. Don't summarize books — operationalize (e.g., not "stability is important" but: verify alignment before adding load; assess balance/control/tempo/ROM/breathing/pain; regress unstable movement before intensifying; use support when needed; progress stable→less stable only when appropriate; no instability for entertainment; preserve specificity to the actual goal; no unstable surfaces where they impair required force production or add risk).

ORIGINALITY/COPYRIGHT: capture knowledge, not expressive content. MAY: identify concepts; original summaries/tables/taxonomies/programming logic/coaching rules/decision trees/exercise descriptions/cues/contraindication records; internal citations; structured data from facts/principles/methods; compare sources; original SWAN educational content. MUST NOT (absent documented permission): publish complete books/chapters; expose source PDFs to customers; reproduce lengthy passages, proprietary photos/illustrations/worksheets/exams/answer keys/complete proprietary tables; build user-facing retrieval of substantial source text; imply endorsement/partnership; use NASM logos as SWAN branding; label SWAN programming as official NASM. Limited internal excerpts allowed for verification with restricted access, never production-exposed.

AUTHORITY HIERARCHY (contextual): 1 immediate client safety; 2 law and professional scope; 3 client's licensed healthcare provider direction; 4 current contraindications/health status; 5 current high-quality evidence; 6 professional consensus/position statements; 7 certification and continuing-ed principles; 8 Sean's documented professional judgment; 9 Sean's direct experience with the individual; 10 client preferences/goals; 11 historical professional education; 12 industry convention; 13 unverified online information. Physician restrictions can override general recommendations; one new study doesn't override mature evidence; frameworks never override client-specific safety. Sean holds final methodology approval.

STATUS LABELS: Draft; Extracted; Needs Source Verification; Needs Sean Review; Sean Approved; Professionally Reviewed; Current; Historical; Current With Qualifications; Conflicting Evidence; Restricted Use; Client-Specific Only; Experimental; Deprecated; Superseded; Archived; Prohibited.

RULE SCHEMA: ruleId; ruleName; domain; subdomain; ruleType; plainLanguageRule; technicalExplanation; operationalLogic; purpose; applicablePopulation; excludedPopulation; prerequisites; assessmentInputs; triggeringConditions; contraindications; precautions; stopConditions; referralConditions; progressionCriteria; regressionCriteria; exercise/dosage/frequency/intensity/tempo/rest/volume/rangeOfMotion/equipment/environmental Implications; coachingCues; commonErrors; alternativeStrategies; sourceIds; sourceStrength; historicalStatus; SeanInterpretation; swanImplementation; userFacingExplanation; trainerFacingExplanation; confidenceLevel; validationStatus; approvedBy; approvedAt; reviewDueAt; version; changeHistory.

DOMAINS 1–48 (all binding):
1 CLIENT INTAKE — identity/contact; emergency contact; age; biological considerations; occupation; daily activity; training/sports/injury/surgical/pain history; diagnosed conditions; medications; physician restrictions; pregnancy/postpartum; sleep; stress; nutrition habits; hydration; alcohol/tobacco; recovery capacity; availability; preferences; disliked exercises; environment; equipment access; goals; deadlines; motivation; readiness to change; barriers; previous outcomes; communication preferences; accessibility; cultural considerations; guardian info for minors; consent/waivers.
2 HEALTH SCREENING — health-history questionnaire; PAR-Q or equivalent; cardiovascular risk; metabolic/neurological/orthopedic/respiratory conditions; medication changes; unexplained symptoms; red flags; medical clearance conditions; referral conditions; emergency escalation; documentation; trainer scope boundaries. NEVER diagnose. May identify that information warrants: stopping exercise; modifying; medical clearance; emergency services; referral to physician/PT/RD/other qualified professional.
3 GOAL CLASSIFICATION — general health; weight management; body composition; hypertrophy; maximal strength; muscular endurance; power; athletic performance; speed; agility; quickness; balance; mobility; flexibility; posture; movement confidence; return after clearance; healthy aging; fall-risk reduction; cardio conditioning; stress management; daily function; pain-aware exercise within scope; event prep; sport-specific; aesthetics; lifestyle consistency; adherence; confidence; skill acquisition. Separate stated goals from underlying needs.
4 ASSESSMENTS — resting measures; HR; BP documentation; circumference; body weight/composition; consented progress photos; posture; movement observations; squat/hinge/push/pull/overhead/step-up/single-leg/gait; balance; ROM; mobility; flexibility; core control; breathing; grip; endurance; strength; power; speed; agility; sport-specific; work capacity; session tolerance; pain response; recovery response; readiness. Select by relevance — never force every test on every client.
5 MOVEMENT ANALYSIS — joint position; kinetic chain; alignment; stability; mobility; motor control; compensations; asymmetry; range limits; balance; coordination; breathing; tempo control; fatigue/load breakdown; pain response; confidence; environment. Observations ≠ diagnoses.
6 EXERCISE TAXONOMY — per exercise: id; name; aliases; movement pattern; primary/secondary goals; joints; primary/secondary muscles; stabilizers; plane; uni/bilateral; open/closed chain; body position; equipment; setup/space requirements; skill level; stability/mobility/strength/power/coordination/cardio demand; impact; complexity; risk; contraindications; precautions; regressions; progressions; substitutions; cues; common mistakes; spotting; tempo/loading options; rep/time/rest ranges; suitable/unsuitable populations; sport transfer; daily-life transfer; source lineage; Sean's preferred use; SWAN rating; evidence confidence.
7 PROGRAMMING PRINCIPLES — specificity; overload; progression; regression; adaptation; recovery; reversibility; variation; individuality; minimum effective dose; maximum recoverable workload; fatigue management; stimulus-to-fatigue; skill acquisition; movement quality; adherence; enjoyment; safety; preference; consistency; readiness; autoregulation; periodization.
8 PROGRAM PHASES — may use stabilization/endurance/hypertrophy/strength/max-strength/power concepts, but no rigid branded sequence. Determine: foundation needed?; what foundation means for that client; is stability actually limiting; existing competency; hypertrophy/max-strength/power relevance; concurrent training; linear/nonlinear/block/undulating/hybrid/maintenance. NASM = framework, not script.
9 RESISTANCE TRAINING — bodyweight; machines; cables; bands; dumbbells; barbells; kettlebells; med balls; suspension; landmine; sleds; tubes; selectorized; plate-loaded; functional trainers; carries; calisthenics; Olympic derivatives; isometrics; eccentrics; tempo; clusters; supersets; circuits; complexes; contrast; traditional; density; uni/bilateral. Plus: load selection; rep ranges; proximity to failure; RPE; RIR; tempo; rest; set/weekly volume; frequency; technique thresholds; spotting; fatigue; progression; deloading.
10 CARDIO/ENERGY SYSTEMS — LISS; moderate continuous; intervals; HIIT; tempo; threshold; repeated sprints; aerobic base; work capacity; recovery intervals; HR use; talk test; RPE; modality; impact management; progression; contraindications; medication effects; heat; hydration; environment.
11 CORE — beyond abs: breathing; bracing; trunk control; anti-extension; anti-rotation; anti-lateral-flexion; controlled flexion/extension; rotation; force transfer; carries; crawling; gait integration; sport transfer; daily function. Don't auto-declare spinal movement unsafe — use context/control/tolerance/goal/load/medical restrictions.
12 BALANCE — static; dynamic; narrow base; single-leg; sensory challenge; controlled reach; stepping; perturbation when appropriate; fall risk; surface; support; progression; regression. Instability not universally superior.
13 PLYO/POWER — landing mechanics; deceleration; low hops; jumps; bounds; med-ball throws; explosive push/pull; Olympic derivatives; RFD; intent; ground contacts; fatigue; surface; footwear; age; readiness criteria; regression; progression.
14 SAQ — acceleration; max velocity; deceleration; change of direction; reactive agility; footwork; perception-response; mechanics; sprint volume; rest; surface; sport specificity; fatigue. Distinguish planned COD from reactive agility.
15 FLEXIBILITY/MOBILITY — active/passive range; control within range; dynamic movement; static/active stretching; mobility drills; self-myofascial techniques; warm-up/cool-down use; sport timing; tolerance; contraindications. More ROM ≠ always better.
16 CORRECTIVE WITHIN SCOPE — MAY: observe; identify limitations; modify; regress; improve control/strength/tolerance/mobility; monitor; coordinate with licensed professionals. MUST NOT: diagnose injury/dysfunction; claim to heal pathology; prescribe medical rehab; contradict provider restrictions; present training as physical therapy. Language: movement limitation; observed compensation; reduced control; discomfort reported; exercise intolerance; asymmetry observed; modification recommended; medical review recommended.
17 INJURY-RISK REDUCTION — never promise prevention: risk reduction; preparedness; capacity; workload management; technique; recovery; graded exposure; sport demands; environmental safety; appropriate progression.
18 SPECIAL POPULATIONS — youth; adolescents; older adults; beginners; advanced athletes; deconditioned; obesity; prenatal/postpartum within qualifications; controlled hypertension; diabetes; arthritis; osteoporosis/osteopenia; neurological conditions; relevant medications; post-clearance returns; mobility limitations; disabilities; low confidence. No universal age/diagnosis rules — individual screening + professional guidance.
19 SPORT-SPECIFIC — needs analysis; movement/energy/force/velocity demands; injury patterns; competition calendar; practice schedule; travel; position; playing time; training age; off/pre/in/post-season; return from layoff; testing; transfer; fatigue management. Support the sport, don't compete with practice.
20 BOOTCAMP — class goal; duration; participant range; equipment inventory; space; weather; flooring; station flow; warm-up; movement prep; strength/conditioning/skill/core blocks; cooldown; regressions; progressions; impact alternatives; beginner/intermediate/advanced lanes; injury-aware substitutions; work/rest intervals; transition time; coaching visibility; bottleneck prevention; sanitation; emergency access; attendance; exertion monitoring; group energy; music timing; partner/competitive/noncompetitive options. Nobody forced into advanced variations by format.
21 SESSION DESIGN — consider: goal; phase; previous session; soreness; pain; sleep; stress; readiness; time; equipment; environment; trainer observations; adherence; recent volume; upcoming activities; medical restrictions; preferences; progression status. Components (not all required every session): check-in; readiness review; warm-up; movement prep; skill; strength; power; conditioning; accessory; mobility; cooldown; education; homework.
22 PROGRESSION/REGRESSION ENGINE — progression ≠ only load. Progress via: technique; range; control; load; reps; sets; duration; density; reduced assistance; speed; complexity; relevant instability; variability; sport specificity; reduced rest; work capacity; independence. Regress via: reduce load/range/speed/volume/impact; add support; simplify coordination; alter position; machine; stable surface; change equipment; decrease fatigue; increase rest; isometrics; remove pain-provoking components; substitute.
23 AUTOREGULATION — readiness score; pain score; soreness; sleep; stress; motivation; RPE; RIR; bar speed when available; HR response; technique quality; session performance; trainer judgment. Engine may: proceed; reduce volume; reduce intensity; replace exercise; shift session goal; recovery work; stop; recommend referral.
24 PAIN/STOP RULES — no universal pain rule. Evaluate: location; severity; quality; onset; duration; movement relationship; neurological symptoms; swelling; trauma; baseline change; history; provider guidance. Immediate stop/escalation red flags: chest pain; severe shortness of breath; fainting; stroke signs; severe allergic reaction; acute neurological change; significant trauma; severe/rapidly worsening pain; loss of function; other emergencies. Instruct emergency assistance when appropriate.
25 RECOVERY — sleep; hydration; nutrition within scope; rest days; active recovery; stress; training distribution; deloads; soreness; readiness; travel; work demands; illness; heat; adherence.
26 NUTRITION WITHIN SCOPE — MAY: general healthy-eating and performance-nutrition education; hydration; meal timing; macro education; calorie/macro estimates with disclosures; behavior support; food logging; meal ideas; referrals. MUST NOT: diagnose deficiency; prescribe treatment diets; treat eating disorders; contradict medical restrictions; deliver medical nutrition therapy without credentials; promise disease treatment. Build RD/medical referral workflows.
27 BEHAVIOR CHANGE — motivation; confidence; readiness; barriers; habits; implementation intentions; goal setting; process/outcome goals; accountability; self-monitoring; reinforcement; setbacks; relapse planning; identity; environment; scheduling; social support; autonomy. Never shame/humiliation/fear/punishment.
28 COACHING COMMUNICATION — store Sean's: cues; analogies; explanations; motivational language; correction style; encouragement; teaching sequence; demonstration strategy; tactile-cue restrictions; consent requirements; tone; recap format. Learn how Sean actually coaches.
29 CLIENT EDUCATION — multi-level explanations: simple client; detailed client; trainer; technical; parent/guardian; healthcare-provider summary; progress-note language.
30 DOCUMENTATION — intake; consent; health history; assessment results; session plan; completed exercises; load/reps/sets/tempo/duration; pain; RPE; modifications; response; trainer notes; progress; incidents; referrals; restrictions; communication; missed sessions; program changes; source reasoning.
31 SCOPE & SAFETY — trainer scope; laws; confidentiality; guardian consent; informed consent; documentation; CPR/AED; emergency action planning; referral; truthful credentials; liability awareness; equipment instructions; facility safety.
32 EQUIPMENT SAFETY — manufacturer guidance; inspection; setup; anchoring; load limits; maintenance; sanitation; surface; spacing; spotting; storage; damage; retiring unsafe equipment.
33 ENVIRONMENT — heat; cold; humidity; air quality; altitude; sun; rain; lightning; flooring; traffic; visibility; crowding; outdoor hazards; park rules; emergency access.
34 CLIENT PROGRESS — attendance; adherence; completion; strength; endurance; cardio response; mobility; balance; power; measurements; composition; movement quality; pain trends; confidence; habits; sleep; readiness; PRs; exercise history; volume; intensity; frequency; consistency; milestones; subjective wins; functional improvements.
35 WORKOUT ROLODEX — permanent per-client per-exercise history: first/most-recent performed; total sessions/sets/reps/duration/distance/load; estimated volume; best load/reps/duration/pace/power; form rating; pain response; regressions used; progressions reached; substitutions; PRs; plateaus; frequency over time; phase distribution; trainer notes; videos; relevant assessments. No arbitrary history cap.
36 EXPLANATION ENGINE — every program explains: why the plan; why each exercise; why that order; target adaptations; influencing limitations; safety constraints applied; progression mechanism; regression triggers; monitored data; reassessment timing.
37 CONFLICT RESOLUTION — identify disagreement; don't hide uncertainty; classify evidence quality; weigh date/population/client specificity/risk; preserve Sean's insight; ask Sean for final approval when needed; record decision + rationale.
38 ANTI-HALLUCINATION — never: invent certifications/workshops/citations/page numbers; claim unsupported research; claim medical authority; fabricate client data; state NASM endorses SWAN; confuse Sean's method with official NASM policy; present uncertain memories as verified quotations; false precision. Label uncertainty.
39 CITATIONS — L1 exact source/edition/chapter/page; L2 source+chapter/module; L3 course/workshop record; L4 Sean's documented experience; L5 unverified recollection pending confirmation. Client programs need not display citations; trainer/admin/audit/research views allow source inspection.
40 SEAN'S KNOWLEDGE CAPTURE — structured interview: assessing new clients; what he notices first; first-workout selection; nervous beginners; advanced clients; knee discomfort; back concerns; balance; teaching squats/hinges/presses/pulls; core strength; progressing load; readiness signals; modification; bootcamps; motivation; athletes; how methods changed; what he kept from NASM; disagreements; experience lessons; per-gym lessons; PT lessons; bodybuilding/swimming/track lessons; trusted exercises; avoided exercises; common mistakes; what makes his coaching different. Each interview → structured rules requiring Sean's approval.
41 USER-FACING BEHAVIOR — client-facing: clear; low-jargon; explains purpose; encouraging; no shaming; no diagnosing; respects trainer authority; routes major program changes to Sean; flags concerning symptoms; protects privacy; no citation/framework overload; actionable. Trainer-facing may be more detailed.
42 ADMIN REVIEW — Sean can: accept/edit/reject rules; merge duplicates; mark historical; request evidence review; choose preferred method; limit rules to certain clients; authorize user-facing display; archive; view lineage; compare versions.
43 VERSIONING — never silently overwrite: prior/new version; reason; causing source; reviewer; approval; effective date; affected programs/clients; re-evaluation need.
44 PRIVACY — client data and copyrighted material separated: access controls; least privilege; restricted source storage; appropriate PHI handling; de-identification for analytics; audit logs; consent controls; retention; deletion workflows; guardian protections for minors.
45 ARCHITECTURE — L1 Source Library; L2 Normalized Knowledge; L3 Operational Rules; L4 SWAN Methodology; L5 Client Context; L6 Program Generation; L7 Review & Outcomes (contents per v2 §B3 mapping).
46 GENERATION REQUIREMENTS — never generate from a goal label alone; account for: person; safety; training age; available data; equipment; schedule; preferences; phase; previous performance; recovery; restrictions; readiness; progression criteria; coaching context. Missing data → ask; conservative defaults; label assumptions; no fake certainty; prevent unsafe recommendations.
47 HUMAN-IN-THE-LOOP — Sean review required: high-risk clients; major program changes; unclear medical restrictions; post-injury return; severe pain; pregnancy concerns; youth high-performance; advanced power; maximal lifting; source conflicts; experimental methods; automated referrals; anything outside established rules.
48 OUTPUT MODES — client workout; trainer workout; bootcamp plan; monthly/phased/annual/athlete plan; assessment summary; progress report; readiness adjustment; substitution; regression plan; progression plan; referral recommendation; safety alert; coaching script; exercise explanation; parent summary; healthcare-provider summary; internal source audit; rule-conflict report; knowledge-gap report; continuing-education integration report.

DELIVERABLES 1–30: complete knowledge architecture; source-ingestion architecture; NASM/CE integration policy; historical workshop knowledge model; knowledge-rule schema; exercise ontology; assessment ontology; programming ontology; client-context schema; safety/referral engine; progression/regression engine; program-generation logic; bootcamp-generation logic; citation system; Sean approval workflow; rule versioning; conflict resolution; copyright-safe transformation process; trainer-facing interface requirements; client-facing interface requirements; data model + tables; API contracts; validation/testing plan; migration plan for existing SWAN data; phased roadmap; knowledge-gap interview; domains needing source material; decisions requiring Sean's input; risk register; acceptance criteria.

DATABASE TABLES (proposal set — each needs purpose, columns, types, PK, FKs, indexes, constraints, status fields, timestamps, audit, privacy classification; v2 Phase 0 maps each to existing models first): knowledge_sources; source_files; source_sections; source_permissions; credentials; continuing_education; workshops; workshop_notes; knowledge_concepts; knowledge_rules; rule_sources; rule_versions; rule_conflicts; rule_approvals; swan_methodology; coaching_preferences; coaching_cues; exercises; exercise_aliases; exercise_muscles; exercise_equipment; exercise_contraindications; exercise_precautions; exercise_progressions; exercise_regressions; exercise_substitutions; exercise_cues; exercise_errors; exercise_dosage_options; assessments; assessment_protocols; assessment_results; client_health_history; client_medications; client_restrictions; client_clearances; client_goals; client_preferences; client_readiness; client_pain_reports; client_referrals; programs; program_phases; workouts; workout_blocks; workout_exercises; completed_sessions; completed_sets; exercise_history; personal_records; progression_events; regression_events; program_adjustments; bootcamp_templates; bootcamp_stations; bootcamp_variations; safety_events; emergency_actions; trainer_reviews; outcome_metrics; knowledge_feedback; audit_logs.

TESTING — incomplete intake; conflicting goals; medical red flags; medication changes; pain during exercise; beginners; advanced; older adults; youth; athletes; limited equipment; 30-min sessions; 1-hour sessions; bootcamps; outdoor; historical source conflicts; duplicate sources; unsupported claims; citation failures; progression eligibility; regression selection; excessive fatigue; missed sessions; poor sleep; high stress; substitutions; emergency recommendations; scope boundaries; privacy; unauthorized source access.

QUALITY STANDARD — comprehensive; evidence-aware; experience-aware; source-traceable; original; legally cautious; clinically humble; trainer-centered; client-specific; safety-conscious; adaptable; explainable; versioned; auditable; scalable; usable in real coaching; faithful to Sean's actual knowledge; improving as Sean learns.

FINAL INSTRUCTION — not a generic exercise database/chatbot/template generator; a structured digital extension of Sean Swan's coaching intelligence. NASM fully represented as one source within SWAN methodology. Preserve substance; reduce branding; apply quietly; cite internally; client-and-SWAN-centered language; distinguish historical from current; preserve Sean's experience; require traceability, boundaries, safety controls, Sean's final approval. Before implementation code, return: hostile review; blind spots; legal/safety/technical/product risks; corrections; normalized architecture; complete database plan; phased roadmap; acceptance criteria; questions for Sean; fully refactored final specification. Don't omit requirements for brevity; don't prematurely simplify; don't assume existing components are correct; inspect the repository and map before recommending construction; reuse sound systems; refactor weak ones; remove duplicates; don't break production; feature-flag everything new until approved.
