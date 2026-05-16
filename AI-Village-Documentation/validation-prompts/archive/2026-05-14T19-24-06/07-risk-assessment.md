# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 30.2s
> **Files:** docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md
> **Generated:** 5/14/2026, 12:24:06 PM

---

## 📋Executive Summary
**Overall Verdict:** **REVISE** – the sequencing is mostly sound, but several high‑risk gaps and hidden dependencies must be addressed before full‑scale implementation. The plan needs tighter scoping of Phase 1, clearer stub‑client modeling, and a concrete rollback/feature‑flag strategy.

---

## 1️⃣ Risk Assessment  | # | Risk Category | Description | Rating | Mitigation |
|---|---------------|-------------|--------|------------|
| 1 | **Dependency Risks** | Phase 4 (voice) is the longest‑running workstream; it blocks Phase 5 (progress chart) and Phase 6 (trainer parity). If voice transcription / Gemini SDK integration slips >2 weeks, the entire “single staging inbox” cannot be validated. | **CRITICAL** | • Build a **voice‑prototype sandbox** early (mock Gemini SDK) to prove feasibility.<br>• Use **feature flags** to isolate voice ingestion behind `FEATURE_VOICE_INTAKE`.<br>• Parallelize non‑voice work (Phase 1‑3) on separate branches. |
| 2 | **Technical Unknowns** | • Gemini SDK version (v1 vs v2) – API stability & rate limits.<br>• `MediaRecorder` support on older Android browsers (≤ Chrome 71).<br>• `react-markdown` bundle size impact on mobile bundle (current estimate 45 KB gzipped, but with plugins may exceed 100 KB). | **HIGH** | • Pin SDK version in `package.json` and lock to a **LTS** release.<br>• Conduct **browser‑compat matrix** testing on target devices (iOS 13+, Android 8+).<br>• Run `source-map-explorer` on the built bundle; if >120 KB gzipped, replace `react-markdown` with `remarkable` + custom plugins. |
| 3 | **Scope Creep Indicators** | • Full‑edge‑case markdown rendering (tables, code fences, nested lists).<br>• Voice transcription for all browsers & noisy environments.<br>• Auto‑client matching for ambiguous names. | **MEDIUM** | • Define **minimum viable parsing** (plain text + simple bullet detection).<br>• Defer advanced markdown features to Phase 2.2 (post‑MVP).<br>• Keep voice transcription gated behind a **“beta‑voice”** flag. |
| 4 | **Effort Accuracy** | 22 files × ≤ 300 LOC each → ≤ 6 600 LOC. Realistically, files like `PlaudMergeWorkspace.apply.ts` and `coachIntakeRoutes.mjs` will exceed 300 LOC once error handling, types, and tests are added. | **MEDIUM** | • Adopt a **LOC budget** per file (e.g., 250 LOC) and track via CI.<br>• Split large files into **module‑level** pieces early (e.g., `useVoiceTranscription.ts`). |
| 5 | **Testing Gaps** | • Unit tests only for hooks (`useAIChat`, `useCoachAssistant`).<br>• No E2E coverage for the sidebar or markdown rendering.<br>• No visual‑regression tests for dark‑theme contrast on mobile dock. | **HIGH** | • Add **Cypress** specs for the Command Center flow (queue → approval → write).<br>• Implement **Storybook** stories for mobile dock at breakpoints 300/332/390/430 px.<br>• Use **Percy** for visual regression on dark theme. |
| 6 | **Rollback Plan** | Feature‑flagging is mentioned but no concrete flag names or rollback scripts are defined. If Phase 3 approval workflow crashes, the whole admin route could become unusable. | **CRITICAL** | • Introduce **`FEATURE_APPROVAL_WORKFLOW`** and **`FEATURE_VOICE_INTAKE`** flags in `src/flags.ts`.<br>• Deploy a **feature‑flag service** (e.g., LaunchDarkly) with instant kill‑switch.<br>• Keep a **read‑only fallback** of the static `COMMAND_THREADS` data for emergency revert. |
| 7 | **Database Migration Risks** | Phase 1 claims “zero backend work”, yet client‑creation proposals will need new fields (`stubClient`, `sourceIntakeId`). Existing `adminClientController` expects email/username; adding stub fields may break unique‑constraint checks. | **HIGH** | • Add a **migration script** that creates a `client_type = 'stub'` flag and relaxes `email` uniqueness for stubs.<br>• Run migration on a **copy of production** first; verify no existing client violates new constraints. |
| 8 | **Phase Ordering** | The proposed 0→1→2→3→4→5→6 order is logical but **Phase 2** (single staging inbox) depends on Phase 1’s real conversation context. If Phase 1 stalls, Phase 2 cannot be validated. | **MEDIUM** | • Re‑order to **Phase 1‑A**: “Real conversation wiring + feature‑flag scaffolding”.<br>• Then **Phase 1‑B**: “Mobile dock & queue visibility”.<br>• Only after both are merged, start Phase 2. |

---

## 2️⃣ Missing Context & Files to Inspect  | Area | What to Review | Key Files |
|------|----------------|-----------|
| **Conversation Backend** | How `useAIChat` persists messages, links them to a client, and stores `targetUserId`. | `frontend/src/hooks/useAIChat.ts`, `backend/routes/aiChatRoutes.mjs`, `backend/models/AiConversation.mjs` |
| **PLAUD Webhook Flow** | Current webhook only marks items *pending merge*; no transcription step. | `backend/controllers/plaud/plaudApplaudWebhookController.mjs`, `backend/services/applaudAudioFetcher.mjs` |
| **Coach Intake Service** | How `coach_action_proposals` are generated and validated. | `backend/services/ai/coachActionProposalPromptContract.mjs`, `backend/services/coachIntakeItemService.mjs` |
| **Client Creation Logic** | Current stub‑client creation path (`coachClientOnboardingApprovalService`). | `backend/controllers/adminClientController.mjs`, `backend/services/coachClientOnboardingApprovalService.mjs` |
| **Mobile Dock Constraints** | Exact CSS for 44 px touch targets, overflow handling at 300/332/390/430 px. | `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`, `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx` |
| **Security/Privacy Proxy** | Redaction layer before sending any PII to external LLMs. | Not yet implemented – need a **privacy‑proxy service** (e.g., `/api/privacy/redact`) |

---

## 3️⃣ Security & Privacy Blockers

1. **External LLM Exposure** – Any call to Gemini must be routed through a **proxy** that strips client names, emails, phone numbers, and raw transcript IDs.  2. **PII Leakage in Logs** – Ensure that `console.log` or error reporting does not inadvertently serialize full transcripts.
3. **Webhook Auth** – Validate Plaid/AppLaude webhook signatures with a **shared secret** stored in AWS Secrets Manager; reject unsigned payloads.
4. **Data Retention** – Voice clips stored in `plaud_clips` must be encrypted at rest (PostgreSQL `pgcrypto`) and auto‑purged after 30 days unless approved.

---

## 4️⃣ Front‑End / Mobile UX Changes

| Change | Rationale | Implementation Hint |
|--------|-----------|----------------------|
| Fixed bottom dock (44 px) with **sticky** positioning, `z-index: 1000`. | Guarantees one‑handed access on all breakpoints. | Use `position: sticky; bottom: 0; width: 100%;` with `min-height: 44px`. |
| **Overflow guard** for mobile at 300/332/390/430 px – enforce `max-width: 380px` on the main panel. | Prevents horizontal scroll on small screens. | Add `@media (max-width: 430px) { .main-panel { max-width: 380px; } }`. |
| **Dark‑first contrast** for all actionable buttons (WCAG AA ≥ 4.5:1). | Aligns with Crystalline theme. | Verify contrast using `styled-components` `color: #E0ECF4` on `#0A0A0F` background. |
| **Voice‑status badge** (e.g., “🔊 Transcribing…”) with spinner. | Gives immediate feedback for voice intake. | Add a small badge next to the clip thumbnail. |
| **Markdown preview** limited to **bulleted lists + headings** until Phase 2.2. | Reduces bundle size & visual noise. | Use `remarkable` with `highlight.js` disabled. |

---

## 5️⃣ Backend / Data‑Model Changes

| Change | Description | Files / Routes |
|--------|-------------|----------------|
| **Add `intake_source` enum** (`voice`, `transcript`, `upload`, `note`, `chat`) to `coach_intake_items`. | Enables unified queue and status tracking. | Migration `20260506120000-create-coach-intake-items.cjs` |
| **Add `stub_client` flag** + `source_intake_id` (FK to `coach_intake_items.id`). | Allows creation of minimal clients without email/phone. | `backend/models/Client.mjs` + migration script |
| **New table `coach_action_proposals`** (already exists) – extend with `proposal_type = 'workout_log'` and `requires_approval = true`. | Guarantees writes only after trainer approval. | `backend/services/ai/coachActionProposalPromptContract.mjs` |
| **Feature‑flag table** (`feature_flags`) with `key` (`FEATURE_VOICE_INTAKE`, `FEATURE_APPROVAL_WORKFLOW`). | Centralized rollback mechanism. | New migration `20260515000100-add-feature-flags.cjs` |
| **Webhook signature verification** – store secret in `env` and validate in `plaudApplaudWebhookController`. | Prevents spoofed events. | `backend/controllers/plaud/plaudApplaudWebhookController.mjs` |

---

## 6️⃣ Answers to the AI Village Questions

| # | Question | Answer |
|---|----------|--------|
| 1 | **Highest‑risk gap in unifying AppLaude/PLAUD intake?** | The **lack of a reliable transcription pipeline** (Phase 4) – without Gemini SDK integration the intake queue cannot be turned into actionable proposals, stalling Phases 2‑3. |
| 2 | **Should Phase 1 also move PLAUD review state into conversation context?** | **Yes, but only as read‑only metadata**. Move the *status* (`pending`, `approved`, `rejected`) into the AI‑chat context so the coach can see the review outcome, but do **not** embed the full transcript until voice is production‑ready. |
| 3 | **How to model stub/minimal client creation safely?** | Create a **`ClientType = 'stub'`** with a **soft‑delete** flag. Do **not** store fake email/phone; instead store placeholder `contact_source: 'intake'`. Enforce a **review step** before any email invitation is sent. |
| 4 | **Canonical logging path for future charts?** | **`WorkoutSession` + `WorkoutLog`** is the source of truth for cardio & strength. `DailyWorkoutForm` is UI‑specific; for charts use a **materialized view** that aggregates from both tables. |
| 5 | **Most important mobile interactions for a trainer?** | • One‑tap **“Approve Draft”** button.<br>• Quick **voice‑note playback** from the dock.<br>• Swipe‑right to **stage** a new workout.<br>• Persistent **bottom dock** with “+ New Intake” floating action. |
| 6 | **What should be blocked until Phase 2/3?** | • Auto‑generation of workout plans (Phase 4) until approval workflow is stable.<br>• Any **PII‑sending** to external LLMs (must wait for privacy proxy). |
| 7 | **Evidence/tests before deployment?** | • Unit test coverage ≥ 80 % for all new services.<br>• End‑to‑end Cypress flow: “Intake → Propose → Approve → Write”.<br>• Visual regression on mobile dock at 300/332/390/430 px.<br>• Security scan for PII leakage (GitHub CodeQL). |
| 8 | **Optimal implementation order?** | 1️⃣ **Phase 1‑A** – Wire real `useAIChat` conversations + feature‑flag scaffolding.<br>2️⃣ **Phase 1‑B** – Mobile dock & queue visibility (no new backend).<br>3️⃣ **Phase 2** – Unified staging inbox (statuses, client linking).<br>4️⃣ **Phase 3** – Approval workflow & stub‑client creation.<br>5️⃣ **Phase 4** – Voice‑first AI coach (behind flag).<br>6️⃣ **Phase 5‑6** – Chart & trainer parity. |

---

## 7️⃣ Recommended First Implementation Slice

**Goal:** Deliver a **minimal, testable version of Phase 1‑A** that proves the conversation wiring works and establishes the feature‑flag infrastructure.

| Component | Scope (≤ 300 LOC) | Files to Touch |
|-----------|-------------------|----------------|
| **Conversation Hook** | Add `useRealCoachChat` that fetches messages from `AiConversation` and pushes new messages to the backend. | `frontend/src/hooks/useAIChat.ts` (add `fetchLatestMessages`), `backend/routes/aiChatRoutes.mjs` (add `GET /:convId/messages`). |
| **Command Center Integration** | Replace `COMMAND_THREADS` with live conversation list; keep mobile dock unchanged. | `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx` (swap data source). |
| **Feature‑Flag Service** | Create `src/flags.ts` with `FEATURE_REAL_CONVERSATIONS` and a simple wrapper `isEnabled(key)`. | `src/flags.ts`, `src/utils/featureGate.ts`. |
| **Basic Unit Tests** | 2 tests: (a) hook returns messages, (b) component renders when flag enabled. | `__tests__/useAIChat.test.ts`, `__tests__/CoachCommandCenterPage.test.tsx`. |
| **CI Guardrail** | Add a GitHub Action step that fails if new files exceed 250 LOC. | `.github/workflows/loc-check.yml`. |

**Why this slice?**
- **Low risk** – no external LLM calls, no voice processing.
- **Immediate feedback** – developers can run the app locally and see real conversation data.
- **Lays groundwork** for later phases (Phase 2‑3) by proving the data‑flow and flagging mechanism.

Once merged, the team can **iterate on UI polish** and **add the staging inbox** (Phase 2) with confidence that the underlying conversation backend is stable.

---

## 8️⃣ Quick Checklist for the Next Review Meeting

- [ ] Confirm Gemini SDK version and obtain API key (store in `.env`).  - [ ] Sign off on **feature‑flag naming** (`FEATURE_VOICE_INTAKE`, `FEATURE_APPROVAL_WORKFLOW`).
- [ ] Approve **stub‑client schema** (add `client_type` enum, `source_intake_id`).
- [ ] Allocate **QA resources** for Cypress E2E and Percy visual tests.
- [ ] Schedule **security review** of the privacy‑proxy implementation.

---

*Prepared by the SwanStudios Project Management & Risk Assessment team – 2026‑05‑14*

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
