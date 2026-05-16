# SwanStudios Workout System â€” Unified Upgrade & Fix Master Prompt

## Context
SwanStudios is a production personal training SaaS platform (React 18 + TypeScript + styled-components frontend, Node.js + Express + Sequelize + PostgreSQL backend). The workout system spans Plans, Logger, AI Chat, Body Map, Bootcamp Builder, and Equipment Manager â€” but these systems have critical bugs, missing integrations, and design issues that prevent them from working as a unified training ecosystem.

**Owner:** Sean Swan â€” 25+ year NCEP-certified personal trainer who uses NASM protocols
**Theme:** Enchanted Apex: Crystalline Swan (Midnight Sapphire `#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0`, Wing Purple `#8B5CF6`, Gilded Fern `#C6A84B`, Frost White `#E0ECF4`)
**Privacy Requirement:** Swan AI must ONLY see client ID numbers, NEVER client names â€” all AI interactions must use de-identified client references (e.g., "Client #47")

---

## CRITICAL BUGS (P0 â€” Must Fix)

### Bug 1: Swan AI Chat Fails After One Message (429 Rate Limit Lock)

**Symptoms:** User sends one message in AI chat terminal â†’ gets response â†’ second message returns `429: An AI generation request is already in progress`
**Console errors:**
```
/api/ai-chat/conversations/14/messages:1 Failed to load resource: status 429
```

**Root Cause:** In `backend/routes/aiChatRoutes.mjs` line 201, the route `POST /conversations/:id/messages` uses `aiRateLimiter` middleware which calls `checkRateLimit(userId)` â€” this adds `userId` to `concurrentUsers` Set in `backend/services/ai/rateLimiter.mjs` line 115. But the route handler **NEVER calls `releaseConcurrent(userId)`** after the request completes. The lock is permanent until server restart.

**Fix required:**
- In `aiChatRoutes.mjs`, the `POST /conversations/:id/messages` handler must call `releaseConcurrent(req.user.id)` in a `finally` block
- Import `releaseConcurrent` from `../services/ai/rateLimiter.mjs`
- Same fix needed in `backend/controllers/aiWorkoutController.mjs` for the workout generation endpoint
- Same fix needed anywhere `aiRateLimiter` middleware is used

**Files:**
- `backend/routes/aiChatRoutes.mjs` (line 201-315)
- `backend/services/ai/rateLimiter.mjs` (line 124-126 â€” `releaseConcurrent` exists but is never called)
- `backend/controllers/aiWorkoutController.mjs`
- `backend/middleware/aiRateLimiter.mjs`

### Bug 2: Workout Logger Fails to Load Client Data

**Symptoms:** Navigating to workout logger tab shows error in console:
```
WorkoutLogger.tsx:888 Failed to load client data: Error: Failed to load client data
```

**Root Cause:** The `loadClientData` function at line 884-885 checks `response.success` but the API may return data in a different shape. The error handling falls through and shows "Failed to load client data" generically.

**Fix required:**
- Improve error handling in `WorkoutLogger.tsx` around line 884-900
- Ensure the API endpoint `/api/workout-forms/client/{clientId}/info` returns proper `{ success: true, client: {...} }` shape
- Check backend route `dailyWorkoutFormRoutes.mjs` for the client info endpoint

**Files:**
- `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` (lines 870-900)
- `backend/routes/dailyWorkoutFormRoutes.mjs`

### Bug 3: AI Workout Generation Returns 429

**Symptoms:**
```
ss-pt-new.onrender.com/api/ai/workout-generation:1 Failed to load resource: status 429
```

**Root Cause:** Same concurrent lock issue as Bug 1. The `aiRateLimiter` middleware is shared and the lock from a chat request blocks workout generation requests too (same user, same `concurrentUsers` Set).

**Fix:** Same `releaseConcurrent()` fix as Bug 1.

### Bug 4: MCP Disabled Error in Exercise Library

**Symptoms:**
```
useWorkoutMcp.ts:210 MCP call failed for workout recommendations: Error: MCP_DISABLED
```

**Assessment:** Historical note. MCP fallback is retired; the exercise library should work without MCP by loading from the database exercise table directly.

**Files:**
- `frontend/src/hooks/useWorkoutMcp.ts`

---

## INTEGRATION GAPS (P1 â€” Unify the Ecosystem)

### Gap 1: Swan AI Cannot Fill Out Workout Logger Forms

**Current state:** The AI chat terminal is separate from the Workout Logger. A trainer can't say "Log today's workout for Client #47: bench press 3x10 at 185lbs, squats 4x8 at 225lbs" and have it auto-populate the form.

**Required integration:**
1. Swan AI chat must support a `workout_logging` context for trainers
2. When trainer describes a workout in natural language, AI should:
   a. Parse exercises, sets, reps, weight, RPE from the description
   b. Return a structured JSON action block (similar to existing `update_client_data` pattern in aiChatRoutes line 279-301)
   c. Frontend receives the structured data and auto-fills the WorkoutLogger form
3. The AI must reference the client's:
   - Pain chart/body map entries (avoid exercises that aggravate active pain areas)
   - Onboarding questionnaire (goals, limitations, experience level)
   - Previous workout history (progressive overload context)
   - Movement analysis results (compensations to address)
   - Equipment available at training location (see Gap 3)
4. **Privacy:** AI receives `Client #47` not "John Smith" â€” de-identification must be enforced

**Data flow:**
```
Trainer types: "Log workout for Client #47: we did bench 3x10 at 185, squats 4x8 at 225, felt good, RPE 7"
â†’ AI chat sends to backend with targetUserId = 47
â†’ Backend enriches with client #47's data (pain map, history, equipment profile)
â†’ AI parses and returns structured JSON:
{
  "action": "populate_workout_form",
  "clientId": 47,
  "exercises": [
    { "name": "Bench Press", "sets": [{"reps": 10, "weight": 185, "rpe": 7}, ...] },
    { "name": "Back Squat", "sets": [{"reps": 8, "weight": 225, "rpe": 7}, ...] }
  ],
  "sessionNotes": "Client felt good overall",
  "overallIntensity": 7
}
â†’ Frontend detects action block, opens WorkoutLogger pre-filled
â†’ Trainer reviews, adjusts, submits
```

**Files to modify:**
- `backend/services/aiChatService.mjs` â€” Add `workout_logging` context with structured output instructions
- `backend/routes/aiChatRoutes.mjs` â€” Handle `populate_workout_form` action type
- `frontend/src/hooks/useAIChat.ts` â€” Detect action blocks in AI responses
- `frontend/src/components/Shared/AITerminalPanel.tsx` â€” Show "Apply to Logger" button when action detected
- `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` â€” Accept pre-filled data from AI

### Gap 2: Swan AI Cannot Manipulate Bootcamp Builder

**Current state:** Bootcamp Builder generates classes via a separate AI endpoint. Trainers can't use natural language in the Swan AI chat to say "Build me a lower body bootcamp for 12 people using the park equipment."

**Required integration:**
1. Add `bootcamp_generation` context to trainer/admin ROLE_CONTEXTS
2. AI should parse bootcamp requests and return structured station layouts
3. Frontend should detect `generate_bootcamp` action and populate the BootcampBuilderPage
4. AI must respect equipment profiles for the specified location

**Files:**
- `backend/services/aiChatService.mjs` â€” Add bootcamp generation context
- `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx` â€” Accept AI-generated data

### Gap 3: Training Location / Equipment Profile Not in Workout Logger

**Current state:** Equipment profiles exist (`EquipmentProfile` model) but the Workout Logger doesn't have a field for selecting the training location. The AI can't know what equipment is available.

**Required integration:**
1. Add location/equipment profile selector to WorkoutLogger form
2. Pass selected equipment profile ID to AI chat context enrichment
3. AI workout suggestions must constrain to available equipment at the selected location
4. Equipment Manager must support photo uploads that persist to database (R2 or similar)

**Data model changes:**
- `DailyWorkoutForm` model â€” Add `equipmentProfileId` field (FK to EquipmentProfile)
- Equipment photos should use the existing image upload pipeline (multer â†’ R2)

**Files:**
- `backend/models/DailyWorkoutForm.mjs` â€” Add `equipmentProfileId` column
- `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` â€” Add equipment profile picker
- `backend/services/aiChatService.mjs` â€” Include equipment list in AI context enrichment
- `frontend/src/components/Shared/EquipmentProfilePicker.tsx` â€” Ensure photo upload works

### Gap 4: Body Map Contrast Issues

**Current state:** Body map colors don't have enough contrast against the Crystalline Swan dark backgrounds. Severity markers may be hard to see.

**Required fixes:**
1. Audit all colors in `BodyMapSVG.tsx` against WCAG AA contrast requirements
2. Replace any low-contrast colors with the active Crystalline Swan palette:
   - Use Wing Purple `#8B5CF6` for interactive hover states
   - Use Ice Wing `#60C0F0` for selected regions
   - Pain severity: Red `#FF4444` (high, 8-10), Gilded Fern `#C6A84B` (medium, 5-7), Ice Wing `#60C0F0` (low, 1-4)
3. Ensure the body map works on both client and trainer dashboards
4. Add clearer visual distinction between front and back body views

**Files:**
- `frontend/src/components/BodyMap/BodyMapSVG.tsx`

---

## ENHANCEMENT REQUESTS (P2 â€” Upgrade & Polish)

### Enhancement 1: Workout Plan Builder â€” Full AI Integration

The Plan tab should allow trainers to:
1. Create plans manually (current functionality)
2. Ask Swan AI to generate a full multi-week plan based on client data
3. AI-generated plans should auto-populate the plan builder form
4. Plans should be editable after AI generation

### Enhancement 2: Equipment Manager â€” Photo Persistence

Current state unclear whether equipment photos persist to database. Ensure:
1. Photos upload to R2/cloud storage via multer
2. Photo URLs stored in `EquipmentItem` or `EquipmentProfile` model
3. Photos display in Equipment Manager UI
4. Equipment profiles are selectable in Workout Logger and AI chat

### Enhancement 3: Swan AI â€” Unified Client Data Access

When a trainer chats about a specific client (via `targetUserId`), the AI must see ALL of:
1. Onboarding questionnaire responses
2. Movement analysis results and compensations
3. Body map pain entries (active and historical)
4. All previous workout forms (exercise history, progressive overload data)
5. Body measurements and trends
6. Gamification progress (XP, achievements, streaks)
7. Goals and milestones
8. Available equipment at their training location(s)
9. Session package info (remaining sessions)
10. Waiver records and medical clearances

**Privacy enforcement:** All of this data must be de-identified before reaching the AI. Client names, emails, phone numbers must be stripped. Only "Client #[ID]" references allowed.

### Enhancement 4: Body Map â€” Enhanced Interactive Experience

Upgrade the body map to:
1. Show pain history timeline (not just current entries)
2. Animate severity changes over time
3. Better touch targets for mobile (44px minimum per CLAUDE.md)
4. Integration with workout logger â€” auto-flag exercises that target painful areas
5. Crystalline Swan theme compliance (current colors may use retired Galaxy-Swan tokens)

### Enhancement 5: Error Handling & UX Flow

All tabs in the workout workspace should:
1. Show meaningful error messages (not generic "Failed to load")
2. Have loading skeletons instead of spinners
3. Gracefully degrade when backend is slow (Render cold start ~30s)
4. Never show a white screen â€” use ErrorBoundary
5. All forms should save draft state to localStorage to prevent data loss

---

## PRIVACY & SECURITY REQUIREMENTS

1. **Client ID Only for AI:** The Swan AI must NEVER see client names, emails, or phone numbers. All AI prompts must use de-identified references like "Client #47". This applies to:
   - AI chat system prompts
   - Workout generation prompts
   - Bootcamp generation prompts
   - Any AI-facing data enrichment

2. **De-identification enforcement:** The existing `de-identification` step in `aiWorkoutController.mjs` must be extended to all AI interactions, including the chat service enrichment function.

3. **Audit logging:** All AI interactions that modify client data must be audit-logged with the admin/trainer's user ID.

---

## TECHNICAL ARCHITECTURE

### Current File Structure
```
Frontend (React 18 + TypeScript + styled-components):
â”œâ”€â”€ components/WorkoutLogger/WorkoutLogger.tsx     â€” Manual workout form
â”œâ”€â”€ components/WorkoutLogger/MobileWorkoutLogger.tsx â€” Mobile variant
â”œâ”€â”€ components/WorkoutManagement/WorkoutPlanBuilder.tsx â€” Plan creation
â”œâ”€â”€ components/BootcampBuilder/BootcampBuilderPage.tsx â€” Bootcamp class builder
â”œâ”€â”€ components/BodyMap/BodyMapSVG.tsx               â€” Interactive pain map
â”œâ”€â”€ components/Shared/AITerminalPanel.tsx            â€” AI chat UI
â”œâ”€â”€ components/Shared/EquipmentProfilePicker.tsx     â€” Equipment selector
â”œâ”€â”€ hooks/useAIChat.ts                              â€” AI chat state management
â”œâ”€â”€ hooks/useWorkoutMcp.ts                          â€” MCP integration (fallback)

Backend (Node.js + Express + Sequelize):
â”œâ”€â”€ routes/aiChatRoutes.mjs          â€” AI conversation CRUD + messaging
â”œâ”€â”€ routes/aiRoutes.mjs              â€” AI workout generation
â”œâ”€â”€ routes/workoutPlanRoutes.mjs     â€” Workout plan CRUD
â”œâ”€â”€ routes/dailyWorkoutFormRoutes.mjs â€” Workout form submission
â”œâ”€â”€ routes/workoutSessionRoutes.mjs  â€” Session tracking
â”œâ”€â”€ services/aiChatService.mjs       â€” AI prompt construction + provider routing
â”œâ”€â”€ services/ai/rateLimiter.mjs      â€” Rate limiting (THE BUG IS HERE)
â”œâ”€â”€ middleware/aiRateLimiter.mjs      â€” Express middleware wrapper
â”œâ”€â”€ controllers/aiWorkoutController.mjs â€” 18-step generation pipeline
â”œâ”€â”€ models/DailyWorkoutForm.mjs      â€” Workout form data
â”œâ”€â”€ models/WorkoutPlan.mjs           â€” Plan entity
â”œâ”€â”€ models/WorkoutPlanDay.mjs        â€” Plan days
â”œâ”€â”€ models/WorkoutPlanDayExercise.mjs â€” Plan exercises
â”œâ”€â”€ models/EquipmentProfile.mjs      â€” Location equipment inventories
â”œâ”€â”€ models/EquipmentItem.mjs         â€” Individual equipment
â”œâ”€â”€ models/BootcampTemplate.mjs      â€” Bootcamp class templates
```

### Database Models Involved
- User, DailyWorkoutForm, WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise
- WorkoutSession, WorkoutLog, WorkoutExercise
- EquipmentProfile, EquipmentItem, Equipment, EquipmentExerciseMap
- BootcampTemplate, BootcampStation, BootcampExercise, BootcampSpaceProfile, BootcampClassLog
- AiConversation (JSONB messages array)
- PainEntry, ClientPainEntry (body map data)
- OnboardingQuestionnaire, MovementAnalysis, BaselineMeasurement
- GamificationProfile, Achievement, UserAchievement

### AI Provider Chain
Gemini 3.1 Pro â†’ OpenAI â†’ Anthropic â†’ Venice (failover)

### Rate Limiter Configuration
- Per-user per-minute: 15 requests
- Per-user per-hour: 60 requests
- Concurrent: 1 per user (THIS IS THE BUG â€” lock never released)
- Global per-minute: 60 requests

---

## AI VILLAGE INSTRUCTIONS

**IMPORTANT: Phase 2 debate is authorized for 30 ROUNDS (not the default 5).** This is a complex, interconnected system and Sean wants maximum scrutiny.

### Validation Focus Areas:
1. **Security:** De-identification enforcement, PII detection, rate limiting correctness
2. **Architecture:** Unified data flow between Logger â†” AI Chat â†” Bootcamp â†” Body Map
3. **UX:** Error states, loading states, mobile responsiveness, accessibility
4. **Performance:** AI response times, database query optimization, N+1 queries in enrichment
5. **NASM Compliance:** Ensure AI workout suggestions follow NASM OPT model phases
6. **Privacy:** Client ID-only references in all AI-facing code
7. **Data Integrity:** Equipment profile constraints, session deduction atomicity
8. **Contrast/Accessibility:** Body map WCAG AA compliance

### Phase 2 Debate Parameters:
- **Rounds:** 30 (authorized by project owner)
- **CTO (Gemini 3.1 Pro):** Focus on architecture, data flow, security, performance
- **CEO (Claude Sonnet):** Focus on code quality, error handling, test coverage, maintainability
- **Final authority:** Claude (per CLAUDE.md)

### Phase 3 Design Debate Parameters:
- **Rounds:** 30 (authorized by project owner)
- **Creative Director (Gemini 3.1 Pro):** Focus on Crystalline Swan theme compliance, body map UX, workout logger mobile UX
- **Collaborator (Claude Sonnet):** Focus on accessibility, contrast ratios, touch targets
- **Final authority:** Gemini (per CLAUDE.md)

---

## SUCCESS CRITERIA

After implementation:
1. Swan AI chat sends messages without 429 errors (concurrent lock properly released)
2. Workout Logger loads client data without errors
3. Trainer can describe a workout in AI chat â†’ forms auto-populate in Logger
4. Body map has proper contrast on Crystalline Swan theme (WCAG AA)
5. Equipment profile selector in Workout Logger
6. AI uses equipment constraints when suggesting exercises
7. All AI interactions use Client #ID, never names
8. Bootcamp Builder can receive AI-generated configurations from chat
9. No white screens â€” all error states handled gracefully
10. Mobile responsive at 340px-3840px (7-point verified)
