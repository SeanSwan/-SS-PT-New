# Multi-Workstream QA & Enhancement Plan

## Overview
This plan covers 9 workstreams for SwanStudios production QA, bug fixes, feature enhancements, and infrastructure upgrades. Each workstream has been researched and scoped. This document is the input for the 14-Brain AI Village planning mode.

---

## Workstream 1: Coach Assistant Production QA & Fixes

### Current State
- **Component:** `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx`
- **Hooks:** `useCoachAssistant.ts` (orchestration), `useAIChat.ts` (core CRUD), `useConversationSidebar.ts` (sidebar state)
- **Backend:** `backend/routes/aiChatRoutes.mjs` (9 endpoints), `backend/services/aiChatService.mjs` (17 data enrichment sources)
- **Style files:** Split into 5 files under `styles/` (CoachAnimations, CoachLayoutStyles, CoachMessageStyles, CoachChipStyles, CoachInputStyles, CoachSidebarStyles)

### Known Issues (User-Reported)

#### Issue 1: New Chat Button Not Creating New Chat
- **Root cause investigated:** `handleNewChat()` calls `coach.clearConversation()` which calls `chat.newChat()` which sets `activeConversation` to null and clears messages. The code DOES work in isolation.
- **Likely real issue:** After clearing, the conversation list doesn't refresh, so the user sees no visible change. Also, when sidebar is open on desktop, the "New Chat" button closes the sidebar (via `handleNewChat` calling `onClose()`), which may confuse users.
- **Proposed fix:** After newChat(), force-refresh the conversation list. Add visual feedback (brief toast or flash) confirming new chat started. Don't close sidebar on desktop after New Chat.

#### Issue 2: Context Chips Not Clickable
- **Root cause investigated:** Context chips DO have `onClick={() => onContextChange(chip.key)}` handlers and `cursor: pointer` in styles.
- **Likely real issue:** Visual feedback is too subtle. Active state uses `color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)` which is very faint on dark backgrounds. No transition animation on click. No ripple/scale effect.
- **Proposed fix:** Add `whileTap={{ scale: 0.95 }}` or CSS active state with scale. Increase active background opacity to 25-30%. Add a brief color transition on click. Consider adding a subtle border glow on active chip.

#### Issue 3: Sidebar Makes Screen Longer
- **Root cause investigated:** On desktop (≥1024px), `SidebarContainer` is `position: relative` with `flex-shrink: 0` and `width: 280px`. It's ALWAYS visible on desktop — no toggle.
- **Real issue:** The sidebar is always present on desktop, consuming 280px. The PageShell has `height: 100%` and `overflow: hidden`, but if the parent container doesn't have a constrained height (e.g., the dashboard layout gives it `min-height` instead of fixed `height`), the flex layout can grow vertically.
- **Proposed fix:**
  1. Make sidebar collapsible on desktop too (toggle via the existing PanelLeftOpen button)
  2. When collapsed on desktop, show a narrow icon strip (48px) or fully hide
  3. Ensure `SidebarContainer` has `max-height: 100vh` or is constrained by parent flex
  4. `ConversationList` already has `overflow-y: auto` — verify the flex parent constrains it

#### Issue 4: Save Previous Conversations
- **Status:** Already implemented! `useAIChat.ts` has full CRUD: `listConversations()`, `loadConversation(id)`, `renameConversation(id, title)`, `archiveConversation(id)`, `deleteConversation(id)`.
- **Real issue:** Users may not realize conversations are auto-saved. The sidebar may not be loading conversations on mount (or auth may be failing silently).
- **Proposed fix:** Verify conversations persist after page reload. Add visual indicator that conversations are auto-saved. Show conversation count or "Saved" badge in sidebar header.

#### Issue 5: Mobile Responsiveness (320px to 4K)
- **Current breakpoints in styles:** 768px, 1024px, 1200px
- **Missing:** 320px (tiny phones), 375px (iPhone SE), 430px (iPhone Pro Max), 2560px (QHD), 3840px (4K)
- **Proposed fix:**
  1. Add `@media (max-width: 375px)` for chip font sizes (11px), message padding reduction, input bar compaction
  2. Add `@media (max-width: 320px)` for extreme small — stack chips vertically or reduce to icons only
  3. Add `@media (min-width: 2560px)` for QHD — increase max-width of messages area, larger fonts
  4. Add `@media (min-width: 3840px)` for 4K — scale up all measurements by 1.5x
  5. Ensure minimum 16px font size for readability on all breakpoints (iOS zoom prevention)
  6. Test that sidebar overlay works correctly on narrow viewports

### Architecture Questions for AI Village
1. Should the desktop sidebar be collapsible (ChatGPT-style) or always visible (Slack-style)?
2. Should context switching create a new conversation or continue the existing one with a context note?
3. Should we add a "pin conversation" feature for important chats?
4. What's the best UX pattern for indicating auto-save to users?

---

## Workstream 2: Coach Assistant AI Command Testing

### Scope
Test all AI commands with QA Bot tester client to verify the 17 data enrichment sources work correctly.

### Context Types to Test
| Context | Expected Behavior | Data Sources |
|---------|-------------------|--------------|
| `coach_assistant` | General fitness advice | User profile, workout history |
| `workout_generation` | Generate OPT-compliant workouts | Exercise DB, user's OPT phase, 1RM data |
| `macro_logging` | Help log meals, calculate macros | DailyMacroLog, USDA food data |
| `form_tips` | Exercise form guidance | Exercise DB, video links |
| `client_review` | Review client progress (admin/trainer) | Client profiles, workout logs, gamification |
| `scheduling` | Session booking help | Calendar, session packages |
| `progress_analysis` | Analyze training progress | Workout logs, body metrics, PRs |
| `exercise_library` | Exercise info, alternatives | 840+ exercise database |
| `gamification` | XP, badges, level info | Gamification engine data |
| `client_onboarding` | New client intake | Onboarding wizard data |

### Test Protocol
1. Create or use existing QA Bot tester client account
2. Send test prompts for each context type
3. Verify responses include enriched data (not just generic AI text)
4. Verify PII stripping works (no real client names in AI prompts)
5. Verify provider failover (Gemini → OpenAI → Anthropic → Venice)
6. Test error handling for each context

---

## Workstream 3: Session Routes QA

### Scope
Verify the session purchase → decrement → schedule flow works end-to-end.

### Routes to Test
- `POST /api/sessions/purchase` — Buy session package
- `PATCH /api/sessions/:id/use` — Decrement session on booking
- `GET /api/sessions/remaining` — Check remaining sessions
- Integration with Universal Master Schedule (booking creates session, decrements count)

### Architecture Questions
1. What happens when sessions reach 0? Is the user blocked from booking?
2. Are session refunds handled (increment on cancellation)?
3. Is there a grace period for session expiry?

---

## Workstream 4: Universal Master Schedule Enhancement

### Current State
- Located in `frontend/src/components/UniversalMasterSchedule/`
- Calendar view with session booking
- "All Trainers" button exists but shows nothing

### Known Issues
1. **"All Trainers" button shows nothing** — Likely data fetching issue or empty trainer list
2. **No scrollable multi-trainer view** — Need left/right scroll for multiple trainer schedules

### Proposed Enhancements
1. Fix "All Trainers" — verify API returns trainer data, fix rendering
2. Add horizontal scroll view showing trainer columns side-by-side
3. Create tester trainer account with appropriate RBAC permissions
4. Add trainer availability indicators (green/yellow/red status)
5. Mobile: stack trainer schedules vertically with swipe navigation

### Architecture Questions
1. Should trainers see only their own schedule or all trainers?
2. How should double-bookings be prevented across trainers?
3. Should clients be able to request specific trainers?

---

## Workstream 5: Workout Planner QA

### Scope
Full QA of the NASM Workout Planner with QA bot tester.

### Test Areas
1. OPT Phase selection (all 5 phases)
2. Exercise selection from 840+ database
3. Sets/reps/tempo/rest auto-fill based on OPT phase
4. 1RM calculator integration
5. Workout save and retrieval
6. Workout sharing to social feed
7. Gamification point awards on workout completion
8. AI-generated workout suggestions

---

## Workstream 6: Workout Log QA & Enhancement

### Scope
Find errors, bugs, enhance logic, UI/UX improvements in the workout logging system.

### Test Areas
1. Exercise logging (sets, reps, weight, RPE)
2. Tempo tracking (4/2/1 notation)
3. Rest timer functionality
4. PR detection and notification
5. Volume calculation accuracy
6. History view and filtering
7. Export/share functionality
8. Integration with gamification (XP awards)

### Architecture Questions
1. Should rest timer be a floating overlay or inline?
2. Should PR celebrations use the same animation system as gamification?
3. How should superset/circuit logging work for Phase 5 OPT?

---

## Workstream 7: Auto Research Framework (Karpathy-Style)

### Concept
Based on Andrej Karpathy's auto-research methodology: autonomous skill optimization loop.

### Three Ingredients
1. **Objective metric** — Binary yes/no eval criteria for each skill
2. **Measurement tool** — Script that runs skill N times and scores results
3. **Something to change** — The skill prompt itself (iterated until optimal)

### Proposed Architecture
```
scripts/auto-research/
├── runner.mjs              — Main loop: run skill → eval → mutate → repeat
├── eval-suite.mjs          — Eval framework (binary criteria per skill)
├── prompt-mutator.mjs      — AI-powered prompt mutation (keep winner, discard loser)
├── results/                — Historical run results for analysis
│   └── {skill}-{timestamp}.json
└── evals/                  — Per-skill eval definitions
    ├── verification.eval.json
    ├── debugging.eval.json
    └── code-review.eval.json
```

### Eval Format
```json
{
  "skill": "verification-before-completion",
  "criteria": [
    { "id": "checks-tests", "description": "Skill prompt causes agent to run tests before claiming done", "weight": 1 },
    { "id": "checks-build", "description": "Skill prompt causes agent to verify build succeeds", "weight": 1 },
    { "id": "no-false-done", "description": "Agent does not claim done when tests fail", "weight": 2 }
  ],
  "iterations": 10,
  "model": "gemini-2.5-flash"
}
```

### Architecture Questions
1. Which model should run the eval loop? (Gemini Flash for cost, or Claude for quality?)
2. How do we prevent prompt collapse (converging to degenerate prompt)?
3. Should we use ELO rating between prompt versions or simple win/loss?
4. How do we handle skills that have subjective quality criteria (design taste)?

---

## Workstream 8: Skills Audit

### Current Skills (in `.claude/skills/`)
Need to audit:
1. What skills are currently installed
2. What skills are available via `skills.sh` / Claude skills marketplace
3. Which new skills would benefit SwanStudios development
4. Remove any deprecated or conflicting skills

### Categories to Check
- Code quality / review skills
- Testing skills (unit, integration, E2E)
- Design / UI skills
- Security audit skills
- Performance optimization skills
- Documentation skills
- DevOps / deployment skills

---

## Workstream 9: CLAUDE.md Update

### Additions Needed
1. Auto Research Protocol section
2. New skills documentation
3. Any architectural decisions from AI Village consensus
4. Updated file paths and component counts
5. Any new conventions discovered during QA

---

## Implementation Priority (Proposed)

| Priority | Workstream | Effort | Impact |
|----------|-----------|--------|--------|
| P0 | Coach Assistant Fixes (#1) | Medium | High — primary user-facing AI feature |
| P0 | Coach Assistant AI Testing (#2) | Low | High — validates AI actually works |
| P1 | Session Routes QA (#3) | Low | High — revenue-critical flow |
| P1 | Universal Master Schedule (#4) | Medium | High — scheduling is core feature |
| P2 | Workout Planner QA (#5) | Low | Medium — existing feature validation |
| P2 | Workout Log QA (#6) | Medium | Medium — existing feature validation |
| P3 | Auto Research Framework (#7) | High | High — long-term productivity multiplier |
| P3 | Skills Audit (#8) | Low | Medium — development quality |
| P3 | CLAUDE.md Update (#9) | Low | Low — documentation |

---

## Technical Constraints
- All changes must use CSS custom properties for theme compatibility
- 44px minimum touch targets on all interactive elements
- 300-line max per file
- No Material-UI — styled-components only
- Victory for all charts
- NASM OPT protocol compliance for all workout features
- PII stripping for all AI interactions
- Dark-first design (default theme: crystalline-dark)

## Competitive References
- **ChatGPT:** Collapsible sidebar, conversation search, rename, archive, share
- **Claude.ai:** Clean sidebar, conversation organization, markdown rendering
- **Gemini:** Full-width chat, no sidebar (inline conversation switching)
- **Trainerize:** Trainer-client messaging, program delivery, progress tracking
- **TrueCoach:** Exercise video library, workout logging, client management
- **Strong App:** Clean workout logging, rest timer, PR tracking, exercise history
- **JEFIT:** Social fitness features, workout plans, progress photos
- **Hevy:** Modern UI workout logging, social features, Apple Health sync
