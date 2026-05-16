# Implementation Risk Assessment — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7-20260318 | **Duration:** 94.4s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-BUILDER-OVERHAUL-PLAN.md
> **Generated:** 4/3/2026, 5:26:04 PM

---

# Risk Assessment: Bootcamp Builder Overhaul

**Project:** SwanStudios Bootcamp Class Builder Enhancement
**Review Date:** Generated
**Assessor Role:** Project Manager / Risk Assessor

---

## Executive Summary

This overhaul addresses critical UX gaps in a production SaaS platform serving NASM-certified trainers. The plan is **technically feasible** but carries **elevated execution risk** due to AI integration complexity, scope ambiguity in the "Teach Me" feature, and the absence of an explicit rollback/feature-flagging strategy. The 22-file scope is achievable in the proposed timeline if scope creep is strictly controlled.

**Overall Risk Profile:** 🟡 **HIGH** — Mitigable with phased delivery and strict scope gates

---

## 1. DEPENDENCY RISKS

### Risk 1.1: Phase Sequencing Creates Hard Blockers

**Rating:** 🟠 CRITICAL

| Phase | Dependency On | Blocking Risk |
|-------|---------------|---------------|
| Phase 2 (Rolodex UI) | Phase 1 (Equipment backend) | HIGH — UI can't display without data bridge |
| Phase 3 (Hybrid Mode) | Phase 2 (Rolodex UI) | HIGH — Manual selection impossible without component |
| Phase 5 (AI Hive Mind) | `aiChatService.mjs` stability | CRITICAL — Entire feature contingent on external service |
| Phase 6 (Dashboard) | Fully functional builder | MEDIUM — Can ship dead link; poor UX |

**Scenario:** If Phase 5 (AI integration) slips 2+ weeks, Phases 3-4 are functionally complete but the "AI" portion of "Hybrid Mode" remains vaporware.

**Mitigation:**
- Decouple AI integration as a separate feature flag: `ENABLE_AI_HIVEMIND=false`
- Build Hybrid Mode UI to work in "Manual Only" mode first, activate AI toggle later
- Establish API contract with aiChatService.mjs team before Phase 5 begins

---

### Risk 1.2: Voice Feature Timeline Variability

**Rating:** 🟠 CRITICAL

The plan references "voice-first AI coach" as a key differentiator, but voice integration is **not detailed in the implementation plan**. This is a critical gap.

**Scenarios:**
| Delay | Impact |
|-------|--------|
| +1 week | Schedule impact; Phase 4 (voice) delayed |
| +2-3 weeks | UX inconsistency; voice vs text AI modes mismatch |
| +1 month | Reputation risk; marketing materials promise voice |

**Mitigation:**
- **Immediate:** Define voice feature scope explicitly — is it STT (speech-to-text for commands), TTS (AI voice responses), or full duplex conversation?
- **Parallel track:** Ship text-based AI Coach first (Phase 5), voice as Phase 5b
- **SDK selection:** Reserve decision until Phase 5 spike; default to Web Speech API for MVP, upgrade to Gemini voice SDK for v2

---

## 2. TECHNICAL UNKNOWNS

### Risk 2.1: Gemini SDK Version for Voice

**Rating:** 🟠 HIGH

| Unknown | Implication |
|---------|--------------|
| Which SDK version? | API changes between versions; v1.5 vs v2 have different capabilities |
| Rate limits | Voice processing is token-heavy; throttling could break UX |
| Cost model | Per-character vs per-minute billing affects feature viability |

**Mitigation:**
- Spike in Phase 0: Validate Gemini Flash pricing for expected voice volume
- Cache AI explanations for static content (Teach Me); only use live LLM for dynamic queries
- Implement request debouncing: don't call AI for every keystroke in Rolodex search

---

### Risk 2.2: MediaRecorder Browser Compatibility

**Rating:** 🟡 MEDIUM

MediaRecorder API support:
- ✅ Chrome 80+, Edge 79+, Firefox 76+, Safari 14.1+
- ❌ Safari < 14.1 (older iOS)
- ⚠️ Firefox requires specific MIME types

**Mitigation:**
- Feature detect before enabling voice recording UI
- Fallback to file upload for audio (older browsers)
- Document minimum browser requirements: Chrome/Edge recommended for voice features

---

### Risk 2.3: React-Markdown Bundle Size Accuracy

**Rating:** 🟡 MEDIUM

The plan mentions 10KB for react-markdown, but:
- `react-markdown` core is ~14KB gzipped
- Adding `remark-gfm` (tables, strikethrough) adds ~4KB
- Syntax highlighting plugins add 20-50KB+
- `rehype-raw` for HTML in markdown adds overhead

**Mitigation:**
- Audit actual bundle impact in Phase 0 with `webpack-bundle-analyzer`
- Lazy-load markdown renderer for Teach Me content (user clicks "?" before loading)
- Consider lightweight alternatives: `marked` (25KB) vs `react-markdown` (14KB + plugins)

---

## 3. SCOPE CREEP INDICATORS

### Risk 3.1: Teach Me Mode Content Explosion

**Rating:** 🟠 CRITICAL

| Scope Creep Scenario | Estimated Overrun |
|----------------------|-------------------|
| Static markdown for 10 sections | Baseline: 2-3 days |
| Add inline diagrams/animations | +3-5 days |
| Add video embeds per section | +5-7 days |
| AI-generated dynamic explanations | +1-2 weeks (Phase 5 dependency) |
| Accessibility: screen reader support | +2-3 days |

**Current plan doesn't specify content format** — this is the highest-probability scope creep driver.

**Mitigation:**
- Lock content format in Phase 0: **Static markdown only for MVP**
- Define content scope: 10 sections × ~300 words = 3,000 words total
- No diagrams/videos in v1; roadmap for v1.1
- AI-generated content is Phase 5+ only, not MVP

---

### Risk 3.2: Markdown Rendering Edge Cases

**Rating:** 🟡 MEDIUM

Expected expansions:
- Tables for exercise comparisons (GFM required)
- Checkbox lists for trainer checklists
- Collapsible sections for "Advanced Options"
- Custom components (embedded videos, interactive diagrams)

**Mitigation:**
- Pre-approve a finite set of markdown features: headers, bold, italic, lists, blockquotes, tables
- Add linting rule to reject unsupported markdown in Teach Me content
- Use `remark-gfm` for tables, avoid `rehype-raw` (XSS risk)

---

### Risk 3.3: Voice Browser Compatibility Expansion

**Rating:** 🟡 MEDIUM

Trainers may demand:
- Safari iOS support (MediaRecorder gap)
- Offline functionality for gym basement training
- Multi-language support
- Push-to-talk vs voice activation toggle

**Mitigation:**
- MVP: Chrome/Edge desktop only for voice
- Document supported browsers prominently
- Prioritize text fallback; voice is enhancement, not requirement

---

## 4. EFFORT ACCURACY

### Risk 4.1: Line Count Estimates

**Rating:** 🟠 HIGH

| File | Estimated Lines | Realistic Estimate | Variance |
|------|-----------------|-------------------|----------|
| `ExerciseRolodexPanel.tsx` | ~300 | 400-500 | +33-67% |
| `TeachMeContent.md` | ~300 | 500-800 | +67-167% |
| `BootcampBuilderPage.tsx` | ~300 | 350-450 | +17-50% |
| `ConfigPanel.tsx` | ~300 | 300-400 | 0-33% |
| `ClassPreviewPanel.tsx` | ~300 | 350-450 | +17-50% |
| `bootcampConstants.mjs` | ~300 | 200-300 | 0% |

**Key observation:** The plan specifies "300 lines max each" but several components will realistically exceed this. The Rolodex panel alone (search, filters, drag-drop, pagination) is underestimated.

**Mitigation:**
- **Refactor strategy:** Treat 300 lines as per-component limit, not per-file
- Split Rolodex into sub-components: `ExerciseSearchBar`, `ExerciseFilterChips`, `ExerciseCard`, `ExerciseList`
- Split Teach Me content into 10 separate `.md` files, one per section
- Budget 15% buffer per file; enforce with ESLint `max-lines` rule

---

### Risk 4.2: Backend File Underestimates

**Rating:** 🟡 MEDIUM

`bootcampGenerator.mjs` changes for:
- Equipment profile integration
- 6 new class formats (EMOM, Tabata, AMRAP, Hybrid, Circuit, Partner)
- 55-minute validation
- Hybrid mode endpoints

**Realistic estimate:** 400-600 lines for `bootcampGenerator.mjs` alone.

**Mitigation:**
- Extract new format logic into `backend/services/bootcamp/formatConfigs.mjs`
- Keep `bootcampGenerator.mjs` as orchestrator only (<200 lines)
- Add unit tests for each format's timing calculation

---

## 5. TESTING GAPS

### Risk 5.1: No Testing Strategy Defined

**Rating:** 🟠 HIGH

| Gap | Risk |
|-----|------|
| No unit tests for hooks | Regression in state logic goes undetected |
| No E2E for sidebar navigation | Route changes break trainer dashboard access |
| No visual regression for markdown | Teach Me content formatting breaks silently |
| No integration tests for AI service | AI failures crash entire builder |

**Mitigation:**

| Test Type | Tool | Coverage Target | Phase |
|-----------|------|------------------|-------|
| Unit tests | Jest + React Testing Library | 80% for hooks/utilities | Phase 2+ |
| Component tests | Jest + RTL | 70% for key UI components | Phase 2+ |
| E2E: navigation | Playwright | Admin sidebar + trainer sidebar routes | Phase 6 |
| E2E: core flow | Playwright | Generate class → save → log | Phase 3 |
| Visual regression | Chromatic / Percy | Teach Me markdown panels | Phase 7 |
| API integration | Supertest | All new endpoints | Phase 1 |
| AI mock tests | MSW (Mock Service Worker) | Mock aiChatService responses | Phase 5 |

**Critical path:** E2E tests for sidebar navigation must pass before Phase 6 deployment.

---

### Risk 5.2: AI Response Quality Testing

**Rating:** 🟠 HIGH

AI explanations are non-deterministic. How do you test:
- "Why was this exercise chosen?" — multiple valid answers
- "Suggest a modification for knee pain" — safety-critical

**Mitigation:**
- Build golden dataset: 20 manually approved AI responses for regression testing
- Automated checks: response length (50-300 chars), no banned phrases, JSON structure validation
- Human-in-the-loop: flag responses containing medical terms for review

---

## 6. ROLLOBACK PLAN

### Risk 6.1: No Feature-Flagging Strategy

**Rating:** 🟠 CRITICAL

The plan contains **zero mention of feature flags**. For a production SaaS platform, this is unacceptable.

| Failure Scenario | Without Flags | With Flags |
|-----------------|---------------|------------|
| AI explanations crash | Entire builder down | Disable AI, keep manual mode |
| New formats break timing | Cannot generate classes | Rollback format selection to 4x/3x5/2x7/full_group |
| Teach Me crashes markdown | Blank modals | Disable Teach Me button |
| Mobile layout breaks | Mobile users see broken UI | Redirect to desktop-optimized message |

**Mitigation:**

| Feature | Flag Name | Kill Switch Behavior |
|---------|-----------|---------------------|
| Exercise Rolodex UI | `ENABLE_EXERCISE_ROLODEX` | Revert to API-only access |
| Hybrid Mode | `ENABLE_BOOTCAMP_HYBRID_MODE` | Show AI Generate + Manual only |
| AI Hive Mind | `ENABLE_AI_HIVEMIND` | Disable AI Coach panel |
| New Formats | `ENABLE_NEW_CLASS_FORMATS` | Hide EMOM/Tabata/AMRAP from dropdown |
| Teach Me | `ENABLE_TEACH_ME_MODE` | Hide "?" buttons |
| Mobile Redesign | `ENABLE_MOBILE_REDESIGN` | Serve existing 3-pane layout |
| Dashboard Integration | `ENABLE_TRAINER_BOOTCAMP_ACCESS` | Keep in admin sidebar only |

**Implementation:** Use a config service (e.g., LaunchDarkly, or custom `featureFlags.ts`) injected via React Context.

---

## 7. DATABASE MIGRATION RISKS

### Risk 7.1: "Zero Backend Work" Claim for Phase 1

**Rating:** 🟡 MEDIUM — **Needs verification**

The plan states Phase 1 involves "zero backend work" for connecting Equipment Profile to Generator. This is **likely incorrect**:

| Required Change | Backend Work? |
|----------------|---------------|
| Pass `equipmentProfileId` from frontend to generator | Already done per plan |
| Actually USE `equipmentProfileId` in generator logic | **Backend code change required** |
| Ensure `queryExercisesForBootcamp()` uses equipment filter | **Backend logic change** |
| Add validation if equipment profile is empty | **Backend validation** |
| Handle case: profile exists but no matching exercises | **Backend error handling** |

**Verification steps:**
1. Audit `bootcampGenerator.mjs`: find `getExerciseRegistry()` calls
2. Audit `exerciseRolodexBridge.mjs`: verify `queryExercisesForBootcamp()` exists and works
3. Write integration test: given equipment profile [Barbell, Dumbbell] + Lower Day, verify generator returns only Lower exercises using those equipment types

**Mitigation:**
- Treat Phase 1 as **1-2 backend files modified**, not zero
- Budget 1 day for backend changes in Phase 1
- Add unit test for equipment filtering before Phase 2

---

### Risk 7.2: Schema Changes for New Features

**Rating:** 🟡 MEDIUM

| Potential Schema Change | Likelihood | Risk |
|------------------------|------------|------|
| Store "Teach Me" content in DB | Low — plan uses markdown files | — |
| Track Hybrid Mode usage analytics | Medium | New analytics table |
| Store class format preferences per trainer | Medium | New migration |
| Modify `BootcampSession` for new formats | Low | Add enum value to `formatType` |

**Mitigation:**
- Phase 0: Audit current `BootcampSession` schema for `formatType` enum
- If new formats require schema change, include migration in Phase 4 (not Phase 1)
- Use Sequelize migrations with rollback scripts

---

## 8. PHASE ORDERING

### Risk 8.1: Suboptimal Phase Sequence

**Rating:** 🟡 MEDIUM

**Current proposed order:**
```
Phase 0: Planning
Phase 1: Equipment Profile Connection
Phase 2: Exercise Rolodex UI
Phase 3: Manual + AI Hybrid Mode
Phase 4: New Class Formats + 55

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
