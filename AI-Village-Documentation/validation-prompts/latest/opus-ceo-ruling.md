# Opus CEO Ruling — Client Detail Wiring Phase 2

> **CEO:** Claude Opus 4.6 (FINAL AUTHORITY)
> **Date:** 2026-03-25
> **Scope:** WorkoutLogger integration, Biometrics wiring, AI Assistant redesign
> **AI Village Status:** 11-brain validation COMPLETE, all phases passed
> **Supersedes:** Phase 4 ruling from 2026-03-24

---

## EXECUTIVE SUMMARY

The 11-brain AI Village validation identified **6 critical/high findings** across security, architecture, and UX. I have reviewed all Phase 1 validator reports (9/9 passed), the Phase 2 code quality debate (4 rounds, consensus YES), and the Phase 3 design debate (consensus YES).

**My rulings below override all prior Sonnet VP decisions where they conflict.**

---

## CEO RULINGS ON IMMEDIATE IMPLEMENTATION

### RULING 1: WorkoutPlanBuilder Mock Clients — CRITICAL BUG FIX
**Status:** FIX IMMEDIATELY
**Finding:** `WorkoutPlanBuilderTypes.ts` contains hardcoded `mockClients` array. When WorkoutPlanBuilder is rendered inside the Training tab, `clientId` is NOT passed as a prop (TrainingTabContent.tsx line 339: `<WorkoutPlanBuilder />`). This causes the mock client dropdown to appear instead of auto-applying the selected client.

**CEO Directive:**
1. Pass `clientId` and `clientName` from TrainingTabContent to WorkoutPlanBuilder
2. Remove `mockClients` array entirely from WorkoutPlanBuilderTypes.ts
3. When `clientId` is provided, hide the client selector completely and display a read-only client badge
4. The "Next" button validation should auto-pass the clientId check when pre-set

### RULING 2: WorkoutLogger + NASM Rolodex Missing from Training Tab — CRITICAL
**Status:** FIX IMMEDIATELY
**Finding:** The "Active Session" sidebar item in the Training tab loads `WorkoutCopilotPanel` (an AI plan generator) but NOT the actual `WorkoutLogger` component with the NASM Exercise Rolodex/Autocomplete. The user explicitly stated the rolodex was attached to the workout logger and is now gone.

**CEO Directive:**
1. Replace "Active Session" content with lazy-loaded `WorkoutLogger` component (not WorkoutCopilotPanel)
2. WorkoutLogger already includes ExerciseAutocomplete and NASMExerciseRolodex
3. Pass `clientId` to WorkoutLogger so it logs against the selected client
4. Move WorkoutCopilotPanel to the "Enchanted AI" section or merge into the AI sidebar item

### RULING 3: Biometrics Tab — Wire Real Components
**Status:** FIX IMMEDIATELY
**Finding:** All 4 biometrics components (Body Map, Measurements, Movement Analysis, Form Analysis) are BUILT and exist in the codebase but show "Coming Soon" placeholders in BiometricsTabContent.tsx.

**CEO Directive:**
1. Replace bento card placeholders with lazy-loaded real components
2. Body Map -> lazy BodyMap component, pass clientId + mode="trainer"
3. Measurements -> lazy ClientMeasurementPanel, pass clientId
4. Movement Analysis -> lazy MovementAnalysisWizard, pass clientId
5. Form Analysis -> lazy FormAnalysisPage, pass clientId
6. Each card click expands that card to fill the content area with the real component
7. Back button returns to the bento grid view
8. Wrap each in TabErrorBoundary for crash isolation

### RULING 4: AI Assistant Redesign — "SwanStudios Assistant"
**Status:** FIX IMMEDIATELY
**Finding:** User explicitly stated: "I DO NOT WANT THE HOVERING AI ASSISTANT ICON."

**CEO Directive:**
1. REMOVE AIAssistantFAB from UnifiedAdminDashboardLayout.tsx
2. The existing AICommandBar (Raycast-style, Ctrl+K) is the correct replacement
3. Add AICommandBar to: Dashboard, Clients & Team, Scheduling workspaces
4. Rename display text to "SwanStudios Assistant..."
5. Add admin-only capsule button on homepage header

### RULING 5: Gemini CTO Design Consensus — ACCEPTED WITH MODIFICATIONS
**Status:** ACCEPTED

- CSS-only touch targets (no JS hooks) — APPROVED
- No Framer Motion for bento expansion — APPROVED
- CSS keyframe luxuryExpand fallback — APPROVED
- Shimmer must use `color-mix()` per CSS custom property system

### RULING 6: Security & State Management — DEFERRED TO NEXT SPRINT
**Status:** DEFERRED (not blocking)

- Zustand stores for timer persistence (current useState works for MVP)
- Zod validation on AI JSONB (backend concern)
- AI prompt injection hardening (existing system prompt handles this)
- `checkTrainerClientRelationship` already handles IDOR prevention

---

## IMPLEMENTATION ORDER

1. WorkoutPlanBuilder — Fix client auto-apply, remove mocks
2. Training Tab — Wire WorkoutLogger with NASM Rolodex, pass clientId
3. Biometrics Tab — Wire all 4 real components with lazy loading
4. AI Assistant — Remove FAB, embed SwanStudios Assistant, add homepage capsule
5. Build verification — Vite build must pass
6. Commit & push — Deploy to Render

---

*Claude Opus 4.6, CEO — FINAL AUTHORITY*
*This ruling supersedes all Sonnet VP and Gemini CTO interim decisions.*
