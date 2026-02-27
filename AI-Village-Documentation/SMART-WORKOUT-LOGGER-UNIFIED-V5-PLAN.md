# Smart Workout Logger Unified V5 Plan (NASM Protocol-First)
**Status:** Active Master Plan (Refactored after Phase 5B.1)
**Project:** SwanStudios / SS-PT
**Last Updated:** 2026-02-25
**Owner:** SwanStudios (Admin + Trainer workflows)
**Architecture Principle:** NASM training protocol governs programming logic. AI/privacy/provider systems are implementation layers, not replacements for NASM methodology.
**Appendix:** `AI-Village-Documentation/SMART-WORKOUT-LOGGER-UNIFIED-V5-PLAN-APPENDIX.md`

---

## 1. Executive Summary

This document is the refactored master plan for the Smart Workout Logger / AI Coach Copilot system.

### What is already complete
- Phase 1/2: Privacy foundation (consent, de-identification, audit logging, kill switch)
- Phase 3A/3B: Multi-provider AI router (OpenAI, Anthropic, Gemini) with failover, degraded mode, rate limiting, cost tracking
- Phase 4A: NASM template registry + structured schema integration
- Phase 5A: Backend draft generation + approval flow (hardened and production-verified)
- Phase 5B: Admin AI Copilot UI surface (state machine + editor + explainability + degraded flow)
- Phase 5B.1: Trainer surface reuse + assignment-specific error taxonomy

### What this V5 refactor adds
1. **NASM Protocol-First long-horizon planning** (3 / 6 / 12 month plans)
2. **Progressive planning using client historical data** (workouts, trends, injuries, ROM/flexibility, goals, chart/graph data)
3. **Voice dictation + manual entry** for coach workflows
4. **Venice AI provider option** in the provider roadmap
5. Clear distinction between **Consent** (permission) and **De-identification** (data minimization)

---

## 2. Core Governing Principles

### 2.1 NASM Protocol Is the Training Authority
All AI-generated workout/program recommendations must be grounded in NASM-based programming and assessments (OPT/CES/PAR-Q+).

AI may assist with: drafting, adapting, sequencing, summarizing, explaining.
AI must not replace: NASM framework logic, coach judgment, medical clearance requirements, scope-of-practice boundaries.

### 2.2 Consent and De-Identification Are Separate Controls
- **Consent** = permission control (whether client-specific AI generation is allowed)
- **De-identification** = data minimization (what data may leave the app boundary)
- **Rule:** Client-specific AI usage always requires de-identification. Consent is enforced through a role-aware AI eligibility layer:
- `trainer` / `client` require a valid consent source
- `admin` may use an audited override path (no silent bypass)

### 2.3 Client-Specific vs Coach-Sandbox AI
- **Client-specific AI (current/planned):** Uses real client data. De-identification required; consent enforced through role-aware AI eligibility (trainer/client hard gate, admin audited override).
- **Coach sandbox AI (future optional):** Generic/manual constraints without client record. No client consent required, still sanitized.

---

## 3. Current State (Completed Phases)

### 3.1 Phase 0 — Baseline Audit & Research
**Status:** Complete. Repo/code audit, endpoint inventory, NASM resource inventory, sensitivity matrix, Playwright evidence.

### 3.2 Phase 1/2 — Privacy Foundation + Consent + De-Identification
**Status:** Complete (deployed). `AiPrivacyProfile`, `AiInteractionLog`, de-identification service, consent controller/routes/middleware, kill switch, client consent UI, rollout/backfill policy (default deny / opt-in).

### 3.3 Phase 3A/3B — Provider Router + Validation + Degraded Mode
**Status:** Complete (deployed). Provider router, OpenAI + Anthropic + Gemini adapters, failover chain, circuit breaker, rate limiter, cost tracking, output sanitization + validation (Zod + rule engine), degraded mode contract.

### 3.4 Phase 4A — NASM Template Registry + Structured Schema Integration
**Status:** Complete (deployed). Config-backed NASM registry, versioned templates + schema versions, `templateRefs[]` provenance, template endpoints with RBAC, prompt deduplication, degraded response alias compatibility.

### 3.5 Phase 5A — Coach Copilot Backend MVP (Draft + Approve)
**Status:** Complete (deployed + hardened). Progress context builder, 1RM/intensity helper, unified context builder, explainability/warnings/missing inputs, `/workout-generation/approve`, hardened approval ordering: auth → role → input → user existence → assignment → consent → validation → persist → audit.

### 3.6 Phase 5B — Admin Copilot Surface
**Status:** Complete (deployed). `WorkoutCopilotPanel`, `aiWorkoutService`, admin integration, template catalog, degraded mode UI, 13 mocked tests for all states.

### 3.7 Phase 5B.1 — Trainer Surface Reuse
**Status:** Complete (deployed). Trainer integration, same panel/state machine reuse, `AI_ASSIGNMENT_DENIED` error code, frontend assignment-specific error panel, tests/build green.

---

## 4. NASM Protocol Mapping

### 4.1 NASM Components Already in Scope
- **OPT Model** (phases 1-5), **CES corrective strategy**, **PAR-Q+ screening**
- Baseline assessment fields, NASM-related scoring/helpers, NASM registry metadata + template schemas (Phase 4A)

### 4.2 NASM-Driven Inputs for Planning
The AI planning system consumes: NASM score / OPT phase signals, OHSA/postural compensations, corrective strategy outputs, PAR-Q+ clearance status (derived only), baseline measurements, movement restrictions / contraindications, goal profile.

### 4.3 NASM Protocol Requirements for Long-Horizon Planning (New in V5)
- Mesocycle/block progression consistent with OPT/CES intent
- Phase transitions justified by progress/adherence, assessment changes, fatigue/recovery indicators, safety constraints
- Regressions/progressions explained in coach-readable terms
- Corrective work remains integrated where indicated

### 4.4 Gaps Not Covered by NASM (Handled by SwanStudios)
NASM does not define: consent enforcement, de-identification, provider router/failover/degraded mode, audit logging, cost controls, UI workflows, long-term plan operationalization, voice dictation. These are implementation layers and must not override NASM programming logic.

---

## 5. Refactored Roadmap (Unified V5)

### 5.1 Completed
Phase 0, Phase 1/2, Phase 3A/3B, Phase 4A, Phase 5A, Phase 5B, Phase 5B.1

### 5.2 Active / Next
- **Phase 5C — Long-Horizon Planning Engine (NASM Protocol-First)** — Active build phase (5C-A/B/C implemented; 5C-D next)
  - Contract: `docs/ai-workflow/blueprints/PHASE-5C-LONG-HORIZON-PLANNING-CONTRACT.md`
  - Scope: 3/6/12 month NASM-aligned plans, block/mesocycle structure, goal-specific progression, assessment-aware modifications, coach review + approve, revision workflow
  - Sub-phases: 5C-A (models), 5C-B (context builder), 5C-C (generation), 5C-D (approval), 5C-E (UI)
- **Phase 5W — Public QR Waivers + AI Eligibility (Admin Override)** — New parallel track
  - Contract: `docs/ai-workflow/blueprints/WAIVER-CONSENT-QR-FLOW-CONTRACT.md`
  - Scope: Public no-login waiver capture, multi-activity addenda (home gym/park/swim), AI notice + consent, ghost-record matching, admin waivers dashboard, role-aware AI eligibility service
  - Sub-phases: 5W-A (policy contract), 5W-B (schema), 5W-C (public QR flow), 5W-D (admin dashboard), 5W-E (AI eligibility integration), 5W-F (re-consent/versioning)
- **Phase 5D — Voice Dictation + Manual Entry Workflow** — Can begin after 5C contracts stabilize
- **Phase 5E — Provider Expansion + Venice Option** — After 5C/5D contracts defined

### 5.3 Deferred
Phase 4B (DB-backed registry), Phase 4C (template UI expansion), Phase 6 (eval harness), Phase 7 (summarization engine), Phase 8 (observability), Phase B (broad UI/cinematic refactors)

**Detail on Phase 5C/5D/5E scope, data models, and API contracts:** See appendix.

---

## 6. NASM Protocol Gaps vs SwanStudios Platform Requirements

### 6.1 NASM Protocol Covers
Training methodology (OPT/CES), assessment frameworks, progression principles, corrective intent, programming guidance.

### 6.2 NASM Protocol Does Not Cover (SwanStudios must implement)
1. AI privacy / consent / de-identification
2. Provider routing / failover / cost/rate limits
3. Audit logging and provenance
4. Long-term plan persistence models and revision workflow
5. Voice dictation UX and transcription architecture
6. Trainer assignment RBAC
7. Product UI state machines (admin/trainer/client)
8. Deployment/runtime ops (Render, migrations, environment configs)
9. Evaluation harness / regression testing
10. Error taxonomy and coach-facing fallback UX

---

## 7. Verification Strategy (Current + Next Phases)

### 7.1 Current verification baseline
Backend tests (full suite), frontend unit tests, frontend build, production smoke tests, degraded-mode verification when provider keys absent.

### 7.2 Phase 5C/5D/5E verification requirements
- **Backend:** long-horizon context builder tests, planning generation/approval tests, Venice adapter tests, privacy regression tests, RBAC/AI eligibility ordering tests
- **Frontend:** long-horizon workflow tests, dictation/manual entry UX tests, trainer/admin reuse tests, build verification
- **Production smoke:** read-only endpoint checks first, controlled test accounts, degraded path testable without keys, draft/approve when keys configured

---

## 8. Documentation Deliverables

### Existing docs to maintain
- `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md`
- Phase-specific blueprints/contracts in `docs/ai-workflow/blueprints/`

### New / updated docs for V5 roadmap
- **This file** (core plan)
- **Appendix:** `AI-Village-Documentation/SMART-WORKOUT-LOGGER-UNIFIED-V5-PLAN-APPENDIX.md`
- `docs/ai-workflow/blueprints/PHASE-5C-LONG-HORIZON-PLANNING-CONTRACT.md` (created)
- `docs/ai-workflow/blueprints/WAIVER-CONSENT-QR-FLOW-CONTRACT.md` (created)
- Future: `PHASE-5D-VOICE-DICTATION-CONTRACT.md`, `PHASE-5E-VENICE-PROVIDER-ADAPTER-PLAN.md`

---

## 9. Immediate Next Actions

1. Keep `CURRENT-TASK.md` as source of truth for shipped status
2. Use this V5 plan as the planning source for next phase design
3. Execute 5C-D (long-horizon approval endpoint) with role-aware AI eligibility re-check
4. Freeze 5W-A/5W-B waiver schema + ghost-record matching contract before QR flow implementation

**Recommended order:** 5C (long-horizon backend contracts) → 5D (dictation/manual entry UX) → 5E (Venice provider adapter). This protects correctness first.
**Updated order:** 5C-D (long-horizon approval) + 5W-A/B (waiver/eligibility contracts) → 5W-C/D/E (QR waivers + admin dashboard + AI eligibility integration) → 5C-E (frontend long-horizon UI) → 5D → 5E.

---

## 10. Open Decisions (Resolve Before Next Phase)
- Coach sandbox mode: include in near-term roadmap or defer
- Waiver legal rollout sequence: core+AI notice first vs full multi-activity launch together
- Ghost-record auto-link threshold: strict exact match only vs confidence scoring + admin review
- Venice priority: add before long-horizon phase completion or after
- Long-horizon persistence depth: minimal plan/block models now vs full review/forecast models in first pass
- STT provider policy: browser-first only for MVP vs server STT support in same phase

---

**END OF V5 PLAN (CORE)**
**Detailed phase scope, data models, API contracts, and Claude continuation prompt: see appendix.**
