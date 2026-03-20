# SwanStudios AI System — God-Level Upgrade Master Prompt V1

> **Purpose:** Comprehensive specification for upgrading the SwanStudios AI Assistant from a basic chatbot to a full-command enterprise AI secretary that can execute ANY trainer/admin operation via voice or text, with recursive multi-AI debate for maximum accuracy, integrated AI Village validation, and zero-typing workflow.
>
> **Constraint:** NO OpenAI APIs. All models must be FREE (OpenRouter free tier) or use existing paid APIs (Gemini API key, Anthropic API key via OpenRouter). No new paid subscriptions.
>
> **Privacy Mandate:** Client PII (names, emails, health data) must NEVER be sent to cloud AI models. All AI prompts use de-identified aliases (Client-A, Client-61) with data enrichment happening server-side only.

---

## SECTION 1: CURRENT STATE AUDIT

### 1.1 What the AI Can Do Today
| Capability | Status | Service |
|-----------|--------|---------|
| Chat with NASM-CPT + PhD Nutrition context | Working | `aiChatService.mjs` |
| Generate workout drafts (coach approval required) | Working | `aiWorkoutService.ts` → `providerRouter.mjs` |
| Transcribe audio (Whisper) | Working but uses OpenAI | `aiChatRoutes.mjs` POST `/transcribe` |
| Log body measurements via AI | Working | `aiDataWriteService.mjs` type: `body_measurement` |
| Create/update goals via AI | Working | `aiDataWriteService.mjs` type: `goal` |
| Add trainer notes via AI | Working | `aiDataWriteService.mjs` type: `client_note` |
| Log nutrition with FDA warnings | Working | `aiDataWriteService.mjs` type: `macro_log` |
| Update NASM progress levels | Working | `aiDataWriteService.mjs` type: `progress_level` |
| Create daily workout forms | Working | `aiDataWriteService.mjs` type: `daily_workout_form` |
| Enrich context from 20 data sources | Working | `contextBuilder.mjs` |
| Provider failover (Gemini → Anthropic → Venice) | Working | `providerRouter.mjs` |

### 1.2 What the AI CANNOT Do Today (Gaps)
| Missing Capability | Required API | Priority |
|-------------------|-------------|----------|
| Select a client by name/ID in the drawer | Frontend only — no backend needed | P0 |
| Create a new client account | `POST /api/admin/clients` | P0 |
| Create an external/Move Fitness client | `POST /api/admin/clients/create-external` | P0 |
| Block/deactivate a user | `PUT /api/admin/clients/:id` (isActive: false) | P0 |
| Schedule a client session | `POST /api/sessions/admin/create` | P0 |
| Unschedule/cancel a session | `PATCH /api/sessions/:id/cancel` | P0 |
| View/scan Command Center overview | `GET /api/admin/dashboard-stats` + `/compliance/at-risk` + `/business-intelligence/metrics` | P0 |
| View Universal Master Schedule | `GET /api/schedule` + `GET /api/sessions` | P0 |
| Create a full workout plan for a client | `POST /api/workouts/plans` + `POST /api/workouts/plans/:id/generate` | P0 |
| Log a workout for a client | `POST /api/admin/clients/:id/workouts` | P0 |
| Enter pain management data | `POST /api/pain/:userId` | P0 |
| Update pain entries | `PUT /api/pain/:userId/:entryId` | P0 |
| Resolve pain entries | `PUT /api/pain/:userId/:entryId/resolve` | P0 |
| Moderate social media posts | `POST /api/admin/content/moderate` | P1 |
| Block user from posting | `PUT /api/admin/content/posts/:id` (status: blocked) | P1 |
| Lock a user account | `PUT /api/admin/users/:id` (isActive: false, locked: true) | P1 |
| Manage trainers (assign clients, update permissions) | `POST /api/admin/clients/:id/assign-trainer` + `/api/trainer-permissions` | P1 |
| Upload voice files for transcription (non-OpenAI) | Need new endpoint using Gemini or free model | P1 |
| Answer form questions via voice dictation | Frontend DictationOrb + structured form filling | P1 |
| Generate AI workout plan with recursive debate | New: multi-model debate before final plan | P1 |
| Run AI Village validation from within the app | New: backend endpoint wrapping orchestrator | P2 |
| Use Playwright/skills to build features | New: agentic code execution with permission | P2 |
| Scan schedule showing only client IDs (privacy) | Data masking layer in context builder | P0 |

### 1.3 Available API Endpoints (400+ Total)
The backend has **400+ REST endpoints** across these categories:
- **Client Management:** 14 endpoints (CRUD, photo upload, assign trainer, billing, AI workout gen)
- **User/Auth:** 20 endpoints (register, login, RBAC, promote, soft-delete)
- **Workouts:** 19 endpoints (sessions, plans, generate, client-specific)
- **Scheduling:** 10+ endpoints (sessions, availability, recurring)
- **Goals:** 9 endpoints (CRUD, analytics, progress tracking)
- **Pain Management:** 6 endpoints (CRUD, resolve, active entries)
- **Measurements:** 11 endpoints (body measurements, photos, schedule)
- **Nutrition:** 9 endpoints (macros, food scanner, health data)
- **Social:** 20+ endpoints (posts, comments, likes, friends, challenges)
- **Content Moderation:** 11 endpoints (moderate, bulk action, queue)
- **Gamification:** 17 endpoints (badges, streaks, leaderboard, points)
- **Analytics:** 18 endpoints (revenue, users, system, video)
- **Notifications:** 8 endpoints (CRUD, settings, quiet hours)
- **Store/Payments:** 16 endpoints (cart, checkout, Stripe, orders)
- **AI/MCP:** 22 endpoints (chat, generation, monitoring, consent)

---

## SECTION 2: TARGET STATE — THE AI SECRETARY

### 2.1 Core Vision
The SwanStudios AI Assistant becomes a **full-command enterprise secretary** that:
1. **Understands natural language commands** — "Add Jackie from Move Fitness", "Schedule her for Tuesday at 3pm", "Build her a Phase 2 strength program"
2. **Executes via real API calls** — Every command maps to actual backend endpoints, not fake responses
3. **Confirms before destructive actions** — "I'm about to deactivate John's account. Confirm?"
4. **Uses recursive AI debate for complex decisions** — Workout plans, nutrition plans, and progress assessments go through multi-model consensus
5. **Protects client privacy** — Cloud AI models never see real names/emails/health data
6. **Works via voice OR text** — DictationOrb + text input, no typing required
7. **Scans dashboards on command** — "What's my Command Center showing?" → AI reads real-time data and summarizes

### 2.2 Command Categories (Complete Taxonomy)

#### Category A: Client Management (14 commands)
```
"Add a new client named [name]"                    → POST /api/admin/clients
"Add [name] as a Move Fitness client"              → POST /api/admin/clients/create-external
"Show me [client name]'s profile"                  → GET /api/admin/clients/:id
"Update [client]'s email to [email]"               → PUT /api/admin/clients/:id
"Deactivate [client]'s account"                    → PUT /api/admin/clients/:id {isActive: false}
"Lock [client]'s account"                          → PUT /api/admin/clients/:id {locked: true}
"Assign [trainer] to [client]"                     → POST /api/admin/clients/:id/assign-trainer
"Reset [client]'s password"                        → POST /api/admin/clients/:id/reset-password
"Upload a photo for [client]"                      → POST /api/admin/clients/:id/upload-photo
"Show me all active clients"                       → GET /api/admin/clients?status=active
"Who are my at-risk clients?"                      → GET /api/admin/compliance/at-risk
"Show me [client]'s billing overview"              → GET /api/admin/clients/:id/billing-overview
"Notify [client] about [message]"                  → POST /api/admin/clients/:id/notify
"Export client list"                               → GET /api/admin/clients (CSV transform)
```

#### Category B: Workout Management (12 commands)
```
"Build a workout plan for [client]"                → Triggers recursive AI debate → POST /api/workouts/plans
"Create a Phase [1-5] program for [client]"        → NASM-specific plan generation with debate
"Log today's workout for [client]"                 → POST /api/admin/clients/:id/workouts
"What exercises did [client] do last session?"      → GET /api/admin/clients/:id/workouts
"Generate a 12-week periodization for [client]"    → Long-horizon generation with debate
"Show me [client]'s workout history"               → GET /api/workouts/sessions/user/:userId
"Update [client]'s NASM level for [muscle group]"  → aiDataWriteService type: progress_level
"What's [client]'s current NASM phase?"            → Context enrichment query
"Show exercise recommendations for [client]"        → GET /api/workouts/recommendations/:userId
"Create a workout session for [client] on [date]"  → POST /api/workouts/sessions
"Delete workout plan [id]"                         → DELETE /api/workouts/plans/:id (with confirmation)
"Show [client]'s workout statistics"               → GET /api/workouts/statistics/:userId
```

#### Category C: Scheduling (8 commands)
```
"Show me today's schedule"                         → GET /api/schedule
"Show me this week's schedule"                     → GET /api/schedule?range=week
"Schedule [client] for [date] at [time]"           → POST /api/sessions/admin/create
"Cancel [client]'s session on [date]"              → PATCH /api/sessions/:id/cancel
"Show me [trainer]'s availability"                 → GET /api/availability/trainer/:id
"Set my availability for [day] [time]-[time]"      → POST /api/availability/trainer/:id
"Who has sessions today?"                          → GET /api/sessions (filtered by date)
"Reschedule [client] from [date] to [date]"        → Cancel + Create new
```

#### Category D: Health & Pain Management (8 commands)
```
"Add a pain entry for [client]: [body part] level [1-10]" → POST /api/pain/:userId
"What are [client]'s active pain entries?"          → GET /api/pain/:userId/active
"Resolve [client]'s [body part] pain entry"         → PUT /api/pain/:userId/:entryId/resolve
"Update [client]'s pain level for [body part]"      → PUT /api/pain/:userId/:entryId
"Log [client]'s measurements: [data]"               → POST /api/measurements
"What are [client]'s latest measurements?"           → GET /api/measurements/user/:userId/latest
"Log a weigh-in for [client]: [weight]"              → POST /api/measurements (weight only)
"Show measurement trends for [client]"               → GET /api/measurements/user/:userId/stats
```

#### Category E: Nutrition (6 commands)
```
"Log [client]'s meals for today: [food items]"     → aiDataWriteService type: macro_log
"What did [client] eat yesterday?"                  → GET /api/macro/:userId
"Create a nutrition plan for [client]"              → POST /api/nutrition/:userId (with AI debate)
"Scan this food: [barcode/name]"                    → POST /api/food-scanner/scan
"Show [client]'s macro trends"                      → GET /api/macro/:userId (aggregated)
"Flag [client]'s sodium intake"                     → Auto-flagged by FDA warning system
```

#### Category F: Social & Content Moderation (6 commands)
```
"Show me posts pending review"                      → GET /api/admin/content/queue
"Approve post [id]"                                 → POST /api/admin/content/moderate
"Reject post [id] for [reason]"                     → POST /api/admin/content/moderate
"Block [user] from posting"                         → PUT /api/admin/content/posts/:id + user flag
"Show moderation stats"                             → GET /api/admin/content/stats
"Delete post [id]"                                  → DELETE /api/admin/content/posts/:id
```

#### Category G: Dashboard Intelligence (8 commands)
```
"Scan my Command Center"                            → Aggregates: dashboard-stats + at-risk + business-intelligence + recent-signups
"What's my revenue this month?"                     → GET /api/admin/analytics/revenue
"Show me business KPIs"                             → GET /api/admin/compliance/analytics/business-kpis
"Who signed up recently?"                           → GET /api/admin/recent-signups
"What's the system health status?"                  → GET /health + /api/admin/analytics/system/health
"Show me user engagement metrics"                   → GET /api/admin/analytics/users/engagement
"How many active users do I have?"                  → GET /api/admin/dashboard-stats
"Show visitor intelligence"                         → Real-time WebSocket data from dashboard
```

#### Category H: Trainer Management (6 commands)
```
"Show me all trainers"                              → GET /api/auth/users/trainers
"Promote [user] to trainer"                         → POST /api/auth/promote-client (then role update)
"Set [trainer]'s permissions"                       → POST /api/trainer-permissions/trainer/:id
"Revoke [trainer]'s [permission]"                   → DELETE /api/trainer-permissions/trainer/:id/:perm
"Show [trainer]'s client list"                      → GET /api/sessions/trainer/:id
"Assign [client] to [trainer]"                      → POST /api/admin/clients/:id/assign-trainer
```

#### Category I: Goals & Gamification (6 commands)
```
"Set a goal for [client]: [goal description]"       → POST /api/goals
"Show [client]'s goals and progress"                → GET /api/goals (filtered by userId)
"Update [client]'s goal progress to [%]"            → PATCH /api/goals/:id/progress
"Show leaderboard"                                  → GET /api/gamification/leaderboard
"Award [badge] to [client]"                         → POST /api/gamification/badges
"Show [client]'s XP and streaks"                    → GET /api/gamification
```

#### Category J: Onboarding & Forms (6 commands)
```
"Start onboarding for [client]"                     → POST /api/admin/onboarding/clients/:id/onboarding
"Where is [client] in onboarding?"                  → GET /api/admin/onboarding/clients/:id/onboarding
"Fill out [client]'s baseline measurements"         → Voice-driven form filling → POST /api/admin/onboarding/baseline-measurements
"Show orientation queue"                            → GET /api/admin/onboarding
"Ask me the onboarding questions for [client]"      → AI reads form schema, asks questions via voice, fills answers
"Submit [client]'s onboarding"                      → POST /api/admin/onboarding/clients/:id/onboarding {status: 'submitted'}
```

#### Category K: AI Village & System (4 commands)
```
"Run AI Village validation on [files]"              → Triggers orchestrator via backend endpoint
"Show latest validation results"                    → Reads from validation output directory
"What's the AI system status?"                      → GET /api/ai-monitoring
"Run a health check"                                → GET /health/db + /health/services
```

**Total: 84 natural language commands mapping to real API endpoints.**

---

## SECTION 3: ARCHITECTURE

### 3.1 AI Model Selection (No OpenAI)

#### Quick Tasks (Simple Q&A, lookups, status checks)
- **Primary:** Gemini 2.5 Flash (existing, fast, free via Google API)
- **Fallback:** `qwen/qwen3-next-80b-a3b-instruct:free` (3B active params, ultra-fast)

#### Complex Reasoning (Workout plans, nutrition plans, progress analysis)
- **Primary:** Gemini 3.1 Pro (existing paid API — Lead Design Authority, best reasoning)
- **Debate Partner:** `anthropic/claude-4.5-sonnet` via OpenRouter (free tier)
- **Additional Debaters:** `nvidia/nemotron-3-super-120b-a12b:free` (strong reasoning)

#### Code Generation (Playwright, skills, building features)
- **Primary:** `qwen/qwen3-coder-480b:free` (SWE-Bench 70.6%, purpose-built)
- **Fallback:** `meta-llama/llama-3.3-70b-instruct:free`

#### Audio Transcription (Replacing OpenAI Whisper)
- **Primary:** Gemini 2.5 Flash with audio input (supports audio natively)
- **Fallback:** Browser Web Speech API (already implemented in DictationOrb)

#### AI Village Phase 1 Validators (9 tracks, all free)
| Track | Current Model | Upgraded Model |
|-------|-------------|---------------|
| 1. UX & Accessibility | Gemini 2.5 Flash | Keep (free) |
| 2. Code Quality | Claude Sonnet | Keep (free on OpenRouter) |
| 3. Security | Step 3.5 Flash | Keep (free) |
| 4. Performance | Gemini 3 Flash | Keep (free) |
| 5. Competitive Intel | MiniMax M2.1 | Keep (free) |
| 6. User Research | DeepSeek V3.2 | `nvidia/nemotron-3-super-120b-a12b:free` (privacy: avoids Chinese servers) |
| 7. Architecture & Bugs | MiniMax M2.5 | Keep (~$0.005/run) |
| 8. Frontend Patterns | Gemini 3.1 Flash | Keep (free) |
| 9. Data Safety | Claude Sonnet | Keep (free on OpenRouter) |

#### AI Village Phase 2+3 Debates
- **Gemini 3.1 Pro** (direct API) ↔ **Claude 4.5 Sonnet** (OpenRouter free)
- Max 5 rounds per debate (existing)
- Add: **Recursive debate for workout plan generation** (same architecture, different prompts)

### 3.2 Privacy Architecture — De-Identification Layer

```
┌─────────────────────────────────────────┐
│            FRONTEND (Browser)           │
│  User says: "Build a plan for Jackie"   │
│  AI Drawer sends: { targetClientId: 61 }│
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         BACKEND (Server-Side Only)       │
│                                          │
│  1. Resolve clientId 61 → Jackie Client  │
│  2. Fetch all 20 data sources for #61    │
│  3. De-identify:                         │
│     - Name → "Client-61"                 │
│     - Email → [REDACTED]                 │
│     - Phone → [REDACTED]                 │
│     - Keep: age, gender, goals, metrics  │
│     - Keep: pain entries (body part only) │
│     - Keep: workout history (exercises)   │
│     - Keep: NASM phase, measurements      │
│  4. Build prompt with de-identified data  │
│  5. Send to AI model (cloud)             │
│  6. Receive response                      │
│  7. Re-hydrate: Replace "Client-61" with │
│     "Jackie" in response before sending   │
│     to frontend                           │
└──────────────────────────────────────────┘
```

**Schedule Privacy:** When AI scans the schedule, it sees:
```
Monday 3/18:
- 9:00 AM: Client-61 (Phase 2, 12 sessions remaining)
- 10:30 AM: Client-42 (Phase 1, 8 sessions remaining)
- 2:00 PM: [Available Slot]
```
The frontend re-hydrates client IDs to names for display.

### 3.3 Recursive Debate for Workout Planning

When a trainer says "Build a workout plan for Jackie", the system triggers a multi-model debate:

```
┌──────────────────────────────────────────────────┐
│          WORKOUT PLAN DEBATE PIPELINE             │
│                                                    │
│  Input: Client-61 context (de-identified)          │
│  - NASM Phase 2, 8 weeks experience               │
│  - Pain: Right shoulder level 4 (impingement)      │
│  - Goals: Lose 15 lbs, improve bench press         │
│  - Equipment: Full gym (barbells, cables, etc)     │
│                                                    │
│  Round 1: Gemini 3.1 Pro (NASM Specialist)         │
│    → Proposes 4-day split based on OPT Model       │
│    → Includes exercise selection + progression      │
│                                                    │
│  Round 2: Claude Sonnet (Safety Reviewer)           │
│    → Reviews for contraindications                  │
│    → Checks shoulder pain → flags overhead press    │
│    → Suggests alternatives (landmine press)         │
│                                                    │
│  Round 3: Nemotron 120B (Periodization Expert)      │
│    → Reviews volume/intensity progression           │
│    → Suggests deload week timing                    │
│    → Validates rep ranges for Phase 2               │
│                                                    │
│  Round 4: Gemini responds to feedback               │
│    → Incorporates shoulder modifications            │
│    → Adjusts volume based on Nemotron feedback      │
│                                                    │
│  Round 5: Claude final review                       │
│    → CONSENSUS or AUTHORITY VERDICT                 │
│                                                    │
│  Output: Finalized workout plan JSON                │
│  → Presented to trainer for one-tap approval        │
│  → Saved via POST /api/workouts/plans               │
└──────────────────────────────────────────────────┘
```

### 3.4 Command Execution Architecture

```
┌─────────────────────────────────────────────────┐
│              AI COMMAND PIPELINE                  │
│                                                   │
│  1. INPUT: Voice/text from trainer                │
│                                                   │
│  2. INTENT CLASSIFICATION (fast model):           │
│     - Qwen3 4B or Gemini Flash                    │
│     - Classifies into Category A-K                │
│     - Extracts: action, target_client, params     │
│     - Returns structured JSON:                    │
│       {                                           │
│         "intent": "schedule_client",              │
│         "client_name": "Jackie",                  │
│         "date": "2026-03-19",                     │
│         "time": "15:00",                          │
│         "confidence": 0.95                        │
│       }                                           │
│                                                   │
│  3. RESOLUTION:                                   │
│     - Resolve client name → client ID             │
│     - Resolve trainer name → trainer ID           │
│     - Validate parameters                         │
│                                                   │
│  4. CONFIRMATION (destructive actions only):      │
│     - "I'll schedule Jackie for Tuesday 3pm.      │
│        Confirm?"                                  │
│     - User confirms via voice "yes" or tap        │
│                                                   │
│  5. EXECUTION:                                    │
│     - Call actual REST API endpoint               │
│     - Handle success/error response               │
│                                                   │
│  6. RESPONSE:                                     │
│     - "Done! Jackie is scheduled for              │
│        Tuesday March 19th at 3:00 PM."            │
│     - Show action card with details               │
│                                                   │
│  7. COMPLEX TASKS (workout plans, nutrition):     │
│     - Route to recursive debate pipeline          │
│     - Show progress ("Round 2 of 5...")           │
│     - Present final plan for approval             │
└─────────────────────────────────────────────────┘
```

### 3.5 AI Village Integration Into App

```
NEW BACKEND ENDPOINTS:
  POST /api/admin/ai-village/run
    Body: { files?: string[], since?: string, staged?: boolean }
    Response: { jobId: string, status: 'queued' }

  GET /api/admin/ai-village/status/:jobId
    Response: { status, phase, round, completedTracks, progress% }

  GET /api/admin/ai-village/results/:jobId
    Response: { summary, tracks: [...], debates: [...] }

  GET /api/admin/ai-village/latest
    Response: { summary, criticalCount, highCount, ... }

NEW FRONTEND COMPONENT:
  <AIVillagePanel /> in Admin Dashboard → System workspace
    - "Run Validation" button
    - Progress bar (Phase 1: 6/9 validators, Phase 2: Round 3/5)
    - Results viewer with severity filtering
    - Debate transcript viewer
    - Action items checklist

BACKEND IMPLEMENTATION:
  - BullMQ job queue for async execution
  - WebSocket progress updates to frontend
  - Results stored in DB + filesystem
  - Admin-only access (RBAC)
```

---

## SECTION 4: IMPLEMENTATION PHASES

### Phase 1: Command Execution Engine (P0)
**Files to modify:**
- `backend/services/aiChatService.mjs` — Add intent classification + command routing
- `backend/services/aiDataWriteService.mjs` — Expand from 6 to 20+ action types
- `backend/services/ai/commandExecutor.mjs` — NEW: Maps intents to API calls
- `backend/services/ai/deIdentifier.mjs` — NEW: PII stripping + re-hydration
- `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx` — Action confirmation cards

**New Action Types for aiDataWriteService:**
```javascript
// Existing 6:
'body_measurement', 'goal', 'client_note', 'macro_log', 'progress_level', 'daily_workout_form'

// New 14:
'create_client',           // POST /api/admin/clients
'create_external_client',  // POST /api/admin/clients/create-external
'deactivate_client',       // PUT /api/admin/clients/:id {isActive: false}
'lock_account',            // PUT /api/admin/clients/:id {locked: true}
'schedule_session',        // POST /api/sessions/admin/create
'cancel_session',          // PATCH /api/sessions/:id/cancel
'create_pain_entry',       // POST /api/pain/:userId
'resolve_pain_entry',      // PUT /api/pain/:userId/:id/resolve
'moderate_content',        // POST /api/admin/content/moderate
'assign_trainer',          // POST /api/admin/clients/:id/assign-trainer
'create_workout_plan',     // POST /api/workouts/plans (triggers debate)
'update_goal_progress',    // PATCH /api/goals/:id/progress
'award_badge',             // POST /api/gamification/badges
'start_onboarding',        // POST /api/admin/onboarding/clients/:id/onboarding
```

### Phase 2: Recursive Debate for Complex Tasks (P1)
**Files to create:**
- `backend/services/ai/recursiveDebate.mjs` — Adapted from `scripts/lib/recursive-consensus.mjs`
- `backend/services/ai/workoutDebate.mjs` — NASM-specific debate prompts
- `backend/services/ai/nutritionDebate.mjs` — Nutrition plan debate prompts

**Debate Configuration:**
```javascript
const DEBATE_CONFIG = {
  workout_plan: {
    maxRounds: 5,
    models: [
      { role: 'NASM Specialist', model: 'gemini-3.1-pro', provider: 'gemini' },
      { role: 'Safety Reviewer', model: 'anthropic/claude-4.5-sonnet', provider: 'openrouter' },
      { role: 'Periodization Expert', model: 'nvidia/nemotron-3-super-120b-a12b:free', provider: 'openrouter' },
    ],
    finalAuthority: 'gemini-3.1-pro', // NASM specialist has final say on exercise selection
  },
  nutrition_plan: {
    maxRounds: 3,
    models: [
      { role: 'Nutrition PhD', model: 'gemini-3.1-pro', provider: 'gemini' },
      { role: 'Safety Reviewer', model: 'anthropic/claude-4.5-sonnet', provider: 'openrouter' },
    ],
    finalAuthority: 'gemini-3.1-pro',
  },
  simple_question: {
    maxRounds: 0, // No debate, direct answer
    models: [{ role: 'Assistant', model: 'gemini-2.5-flash', provider: 'gemini' }],
  },
};
```

### Phase 3: Voice-First Workflow (P1)
**Files to modify:**
- `backend/routes/aiChatRoutes.mjs` — Replace Whisper with Gemini audio transcription
- `frontend/src/components/AIAssistant/DictationOrb.tsx` — Fix memory leak, add hold-to-talk
- `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx` — Voice form filling mode

**Transcription (No OpenAI):**
```javascript
// Replace Whisper with Gemini Flash audio input
const transcribeAudio = async (audioBuffer, mimeType) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent([
    { text: 'Transcribe this audio exactly. Return only the transcribed text.' },
    { inlineData: { mimeType, data: audioBuffer.toString('base64') } }
  ]);

  return result.response.text();
};
```

### Phase 4: AI Village App Integration (P2)
**Files to create:**
- `backend/routes/aiVillageRoutes.mjs` — REST endpoints for triggering validation
- `backend/services/aiVillageService.mjs` — Wraps orchestrator for in-app use
- `backend/jobs/validationWorker.mjs` — BullMQ worker for async validation
- `frontend/src/components/DashBoard/Pages/admin-dashboard/sections/AIVillageSection.tsx` — UI

### Phase 5: Agentic Code Execution (P2)
**Capability:** Trainer says "Add a stretching timer to the workout logger" → AI generates code, runs Playwright to test, submits PR with permission.

**Safety:** Requires explicit admin confirmation for EVERY code change. AI presents diff, admin approves/rejects.

---

## SECTION 5: DOCUMENTATION REQUIREMENTS

### 5.1 Every AI Action Must Be Documented
Each action type in `aiDataWriteService.mjs` must have:
```javascript
/**
 * @action create_client
 * @description Creates a new client account in the system
 * @endpoint POST /api/admin/clients
 * @requiredRole admin | trainer
 * @requiredParams firstName, lastName, email
 * @optionalParams phone, dateOfBirth, gender, fitnessGoal, trainingExperience
 * @destructive false
 * @requiresConfirmation true (new account creation)
 * @privacyLevel high (creates PII record)
 * @example "Add a new client named John Smith with email john@example.com"
 * @rollback Soft-delete the created user record
 */
```

### 5.2 Error Loop Prevention
To prevent AI from going in circles fixing the same issue:
```javascript
// backend/services/ai/actionHistory.mjs
const ACTION_HISTORY = {
  // Track last 50 actions per conversation
  maxHistory: 50,

  // Before executing any action, check:
  isDuplicate(conversationId, action) {
    const recent = getRecentActions(conversationId, 5);
    return recent.some(a =>
      a.type === action.type &&
      a.targetId === action.targetId &&
      a.status === 'failed' &&
      a.error === action.lastError
    );
  },

  // If duplicate detected, AI must:
  // 1. Acknowledge the repeated failure
  // 2. Explain WHY it failed (different from last attempt)
  // 3. Propose a DIFFERENT approach
  // 4. If 3 consecutive failures on same action → escalate to human
};
```

### 5.3 Command Registry (Self-Documenting)
```javascript
// backend/services/ai/commandRegistry.mjs
export const COMMAND_REGISTRY = {
  create_client: {
    description: 'Create a new client account',
    naturalLanguagePatterns: [
      'add a new client',
      'create client',
      'onboard new client',
      'add {name} as a client',
      'register new client {name}',
    ],
    requiredParams: ['firstName', 'lastName', 'email'],
    optionalParams: ['phone', 'clientSource', 'fitnessGoal'],
    endpoint: 'POST /api/admin/clients',
    destructive: false,
    requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    relatedCommands: ['create_external_client', 'start_onboarding'],
  },
  // ... 83 more commands
};
```

---

## SECTION 6: SECURITY REQUIREMENTS

### 6.1 Authentication & Authorization
- All AI actions execute with the REQUESTING USER'S permissions (not a service account)
- AI cannot escalate privileges — trainer AI can't do admin-only operations
- Every API call includes the user's JWT token
- Rate limiting: 30 AI commands per hour per user (separate from chat rate limit)

### 6.2 Confirmation Protocol
```
DESTRUCTIVE ACTIONS (always require confirmation):
  - Deactivate account
  - Lock account
  - Delete content
  - Cancel session
  - Reset password

CREATIVE ACTIONS (require confirmation for new records):
  - Create client
  - Schedule session
  - Create workout plan
  - Award badge

READ-ONLY ACTIONS (no confirmation needed):
  - Show profile
  - Scan dashboard
  - View schedule
  - Check metrics
```

### 6.3 Audit Trail
Every AI-executed command is logged:
```javascript
{
  timestamp: '2026-03-18T10:30:00Z',
  userId: 'admin-1',        // Who initiated
  aiModel: 'gemini-3.1-pro', // Which model
  intent: 'schedule_session',
  targetClientId: 61,
  params: { date: '2026-03-19', time: '15:00' },
  endpoint: 'POST /api/sessions/admin/create',
  result: 'success',
  responseId: 'sess-123',
  conversationId: 'conv-456',
}
```

---

## SECTION 7: TESTING & VALIDATION

### 7.1 Accuracy Target: 100% Command Execution
- Every command in the registry must have a test case
- Test: natural language input → correct intent classification → correct API call → correct response
- Acceptance: 100% of registered commands execute correctly when given clear input
- Fuzzy matching: 90%+ accuracy on natural language variations ("add Jackie", "create a client named Jackie", "onboard Jackie")

### 7.2 AI Village Self-Validation
After building the system, run AI Village on all changed files:
```bash
node scripts/validation-orchestrator.mjs --files \
  backend/services/aiChatService.mjs \
  backend/services/aiDataWriteService.mjs \
  backend/services/ai/commandExecutor.mjs \
  backend/services/ai/deIdentifier.mjs \
  backend/services/ai/recursiveDebate.mjs \
  frontend/src/components/AIAssistant/AIAssistantDrawer.tsx
```

All 11 brains must pass. Zero CRITICAL findings allowed.

---

## SECTION 8: UPGRADE TO AI VILLAGE ORCHESTRATOR

### 8.1 Replace DeepSeek V3.2 (Privacy Concern)
DeepSeek routes through Chinese servers — replace with:
- **Track 6 (User Research):** `nvidia/nemotron-3-super-120b-a12b:free` (US-based, strong reasoning)

### 8.2 Add Recursive Debate to All Free Models
Current AI Village debate is only Phase 2+3 (Gemini ↔ Claude). Upgrade:
- **Phase 1 Enhancement:** After 9 parallel validators complete, add a **consolidation debate** where 2 free models argue about which findings are valid vs false positives
- **Consolidation Debaters:** `meta-llama/llama-3.3-70b-instruct:free` (Proposer) ↔ `nvidia/nemotron-3-super-120b-a12b:free` (Critic)
- **Max rounds:** 3 (keeps cost at $0)
- **Purpose:** Reduce noise from Phase 1 — too many MEDIUM/LOW findings dilute CRITICAL ones

### 8.3 Upgraded AI Village Model Roster

```javascript
const UPGRADED_MODELS = {
  // Phase 1 (9 parallel, all free)
  track1_ux: 'google/gemini-2.5-flash',
  track2_code: 'anthropic/claude-4.5-sonnet',
  track3_security: 'stepfun/step-3.5-flash:free',
  track4_perf: 'google/gemini-3-flash-preview',
  track5_competitive: 'minimax/minimax-m2.1',
  track6_userResearch: 'nvidia/nemotron-3-super-120b-a12b:free', // Replaced DeepSeek
  track7_archBugs: 'minimax/minimax-m2.5',
  track8_frontend: 'google/gemini-3.1-flash-lite-preview',
  track9_dataSafety: 'anthropic/claude-4.5-sonnet',

  // Phase 1.5 NEW: Consolidation Debate (free)
  consolidation_proposer: 'meta-llama/llama-3.3-70b-instruct:free',
  consolidation_critic: 'nvidia/nemotron-3-super-120b-a12b:free',

  // Phase 2: Code Quality Debate (existing)
  phase2_cto: 'gemini-3.1-pro', // Direct Google API
  phase2_ceo: 'anthropic/claude-4.5-sonnet', // OpenRouter

  // Phase 3: Design Debate (existing)
  phase3_creative: 'gemini-3.1-pro', // Direct Google API
  phase3_collab: 'anthropic/claude-4.5-sonnet', // OpenRouter
};
```

---

## SECTION 9: SUCCESS CRITERIA

1. Trainer can manage ALL clients, workouts, schedule, and content via voice commands alone
2. AI correctly classifies 90%+ of natural language commands on first attempt
3. Workout plans generated via recursive debate are NASM-compliant and pain-aware
4. Client PII never appears in any AI model request (verified via audit log)
5. AI Village runs from within the app with real-time progress
6. Zero circular error loops (AI escalates after 3 failures)
7. All 84 commands execute against real API endpoints (not mocked)
8. Destructive actions always require explicit confirmation
9. Full audit trail for every AI-executed command
10. System works on mobile (375px) via voice dictation

---

*SwanStudios God-Level AI Upgrade Prompt V1 — Ready for AI Village Enhancement*
