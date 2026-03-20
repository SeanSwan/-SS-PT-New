# SwanStudios AI System — God-Level Upgrade Master Prompt V2

> **Purpose:** Comprehensive specification for upgrading the SwanStudios AI Assistant from a basic chatbot to a full-command enterprise AI secretary that can execute ANY trainer/admin operation via voice or text, with recursive multi-AI debate for maximum accuracy, integrated AI Village validation, and zero-typing workflow.
>
> **Constraint:** NO OpenAI APIs. No Whisper. All models must be FREE (OpenRouter free tier) or use existing paid APIs (Gemini API key, Anthropic API key via OpenRouter). No new paid subscriptions.
>
> **Privacy Mandate:** Client PII (names, emails, health data, medical conditions) must NEVER be sent to cloud AI models. All AI prompts use de-identified aliases (Client-A, Client-61) with data enrichment happening server-side only. Health data is abstracted to categories (pain: low/medium/high, not specific injuries).
>
> **Deployment:** Render Professional Plan (~$60/month) — NOT free tier. No cold start issues. Standard PostgreSQL + web service.
>
> **V2 Enhancement:** This version incorporates ALL findings from the 11-Brain AI Village Round 1 validation:
> - 3 CRITICAL security findings (prompt injection, authorization bypass, PHI leakage)
> - 4 HIGH performance findings (request storms, N+1 queries, memory leaks, WebSocket jank)
> - 6 consensus fixes from Phase 2 debate (Redis history, Zod whitelisting, DataLoader + 90-day SQL, PHI scanning, TypeScript registry, HMAC signatures)
> - 2 design consensus items from Phase 3 debate (Shattered Ruby/Glacial Emerald tokens, typography hierarchy)
> - Architecture decomposition (no god objects, domain-split registries, circuit breakers)

---

## SECTION 1: CURRENT STATE AUDIT

### 1.1 What the AI Can Do Today
| Capability | Status | Service |
|-----------|--------|---------|
| Chat with NASM-CPT + PhD Nutrition context | Working | `aiChatService.mjs` |
| Generate workout drafts (coach approval required) | Working | `aiWorkoutService.ts` → `providerRouter.mjs` |
| Log body measurements via AI | Working | `aiDataWriteService.mjs` type: `body_measurement` |
| Create/update goals via AI | Working | `aiDataWriteService.mjs` type: `goal` |
| Add trainer notes via AI | Working | `aiDataWriteService.mjs` type: `client_note` |
| Log nutrition with FDA warnings | Working | `aiDataWriteService.mjs` type: `macro_log` |
| Update NASM progress levels | Working | `aiDataWriteService.mjs` type: `progress_level` |
| Create daily workout forms | Working | `aiDataWriteService.mjs` type: `daily_workout_form` |
| Enrich context from 20 data sources | Working | `contextBuilder.mjs` |
| Provider failover (Gemini → Anthropic → Venice) | Working | `providerRouter.mjs` |
| Voice dictation (Web Speech API) | Working | `DictationOrb.tsx` (has memory leak — fix in Phase 5) |

### 1.2 What the AI CANNOT Do Today (Gaps)
| Missing Capability | Required API | Priority |
|-------------------|-------------|----------|
| Select a client by name/ID in the drawer | Frontend only — no backend needed | P0 |
| Create a new client account | `POST /api/admin/clients` | P0 |
| Create an external/Move Fitness client | `POST /api/admin/clients/create-external` | P0 |
| Block/deactivate a user | `PUT /api/admin/clients/:id` (isActive: false) | P0 |
| Schedule a client session | `POST /api/sessions/admin/create` | P0 |
| Unschedule/cancel a session | `PATCH /api/sessions/:id/cancel` | P0 |
| View/scan Command Center overview | Aggregated BFF endpoint (see Section 3.6) | P0 |
| View Universal Master Schedule | `GET /api/schedule` + `GET /api/sessions` | P0 |
| Create a full workout plan for a client | `POST /api/workouts/plans` + recursive debate | P0 |
| Log a workout for a client | `POST /api/admin/clients/:id/workouts` | P0 |
| Enter pain management data | `POST /api/pain/:userId` | P0 |
| Update/resolve pain entries | `PUT /api/pain/:userId/:entryId` | P0 |
| Moderate social media posts | `POST /api/admin/content/moderate` | P1 |
| Upload voice files for transcription (Gemini Flash) | `POST /api/ai-chat/transcribe` (NEW) | P1 |
| Generate AI workout plan with recursive debate | Multi-model debate before final plan | P1 |
| Client-facing AI commands ("Show MY workout") | Client Mode AI persona | P1 |
| Run AI Village validation from within the app | Backend endpoint wrapping orchestrator | P2 |

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
1. **Understands natural language commands** — "Add Jackie from Move Fitness", "Schedule her for Tuesday at 3pm"
2. **Executes via real API calls** — Every command maps to actual backend endpoints with Zod-validated parameters
3. **Confirms before destructive actions** — Two-phase commit with HMAC-signed operations stored in Redis
4. **Uses recursive AI debate for complex decisions** — Workout plans, nutrition plans go through multi-model consensus with circuit breakers
5. **Protects client privacy** — De-identification at the data layer (branded TypeScript types), PHI scanning on all prompts
6. **Works via voice OR text** — DictationOrb + Gemini Flash transcription, no typing required
7. **Scans dashboards on command** — BFF aggregator endpoint with Redis caching (60s TTL)
8. **Supports three personas** — Admin Mode (full control), Trainer Mode (client management), Client Mode (self-service)

### 2.2 Command Categories (Complete Taxonomy)

#### Category A: Client Management (14 commands)
```
"Add a new client named [name]"                    → POST /api/admin/clients
"Add [name] as a Move Fitness client"              → POST /api/admin/clients/create-external
"Show me [client name]'s profile"                  → GET /api/admin/clients/:id
"Update [client]'s email to [email]"               → PUT /api/admin/clients/:id
"Deactivate [client]'s account"                    → PUT /api/admin/clients/:id {isActive: false}  [DESTRUCTIVE]
"Lock [client]'s account"                          → PUT /api/admin/clients/:id {locked: true}  [DESTRUCTIVE]
"Assign [trainer] to [client]"                     → POST /api/admin/clients/:id/assign-trainer
"Reset [client]'s password"                        → POST /api/admin/clients/:id/reset-password  [DESTRUCTIVE]
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
"Delete workout plan [id]"                         → DELETE /api/workouts/plans/:id  [DESTRUCTIVE]
"Show [client]'s workout statistics"               → GET /api/workouts/statistics/:userId
```

#### Category C: Scheduling (8 commands)
```
"Show me today's schedule"                         → GET /api/schedule
"Show me this week's schedule"                     → GET /api/schedule?range=week
"Schedule [client] for [date] at [time]"           → POST /api/sessions/admin/create (with optimistic locking)
"Cancel [client]'s session on [date]"              → PATCH /api/sessions/:id/cancel  [DESTRUCTIVE]
"Show me [trainer]'s availability"                 → GET /api/availability/trainer/:id
"Set my availability for [day] [time]-[time]"      → POST /api/availability/trainer/:id
"Who has sessions today?"                          → GET /api/sessions (filtered by date)
"Reschedule [client] from [date] to [date]"        → Cancel + Create new (atomic transaction)
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
"Block [user] from posting"                         → PUT /api/admin/content/posts/:id + user flag  [DESTRUCTIVE]
"Show moderation stats"                             → GET /api/admin/content/stats
"Delete post [id]"                                  → DELETE /api/admin/content/posts/:id  [DESTRUCTIVE]
```

#### Category G: Dashboard Intelligence (8 commands)
```
"Scan my Command Center"                            → GET /api/admin/ai-bff/command-center (BFF aggregator)
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

#### Category L: Client Self-Service Mode (10 commands) — NEW in V2
```
"Show my workout plan for today"                    → GET /api/workouts/sessions/user/:myId (today)
"Log my nutrition intake"                           → aiDataWriteService type: macro_log (self)
"Track my pain levels"                              → POST /api/pain/:myId
"Schedule my next session"                          → GET /api/availability/trainer/:trainerId → pick slot
"Show my progress this month"                       → GET /api/measurements/user/:myId/stats
"What should I eat today?"                          → Context-enriched nutrition advice
"How many XP do I have?"                            → GET /api/gamification
"Show my streaks and badges"                        → GET /api/gamification
"Request a plan adjustment"                         → Creates trainer note flagged for review
"What exercises should I avoid?"                    → Pain-aware exercise exclusion list
```

**Total: 94 natural language commands mapping to real API endpoints.**

---

## SECTION 3: ARCHITECTURE

### 3.1 AI Model Selection (No OpenAI)

#### Quick Tasks (Simple Q&A, lookups, status checks)
- **Primary:** Gemini 2.5 Flash (existing, fast, free via Google API)
- **Fallback:** `meta-llama/llama-3.3-70b-instruct:free` (strong general purpose)

#### Intent Classification (Fast, structured output)
- **Primary:** Gemini 2.5 Flash (structured JSON output mode)
- **Fallback:** `qwen/qwen3-30b-a3b:free` (3B active params, ultra-fast)
- **Output:** Structured JSON intent (NOT free text) — validated by rule engine before execution

#### Complex Reasoning (Workout plans, nutrition plans, progress analysis)
- **Primary:** Gemini 3.1 Pro (existing paid API — Lead Design Authority, best reasoning)
- **Debate Partner:** `anthropic/claude-4.5-sonnet` via OpenRouter (free tier)
- **Additional Debaters:** `nvidia/nemotron-3-super-120b-a12b:free` (strong reasoning)

#### Audio Transcription (Replacing OpenAI Whisper)
- **Primary:** Gemini 2.5 Flash with audio input (supports audio natively)
- **Fallback:** Browser Web Speech API (already implemented in DictationOrb)
- **Note:** Old Whisper endpoint must be re-implemented to use Gemini Flash. NO OpenAI dependency.

#### AI Village Phase 1 Validators (9 tracks, all free)
| Track | Model | Notes |
|-------|-------|-------|
| 1. UX & Accessibility | Gemini 2.5 Flash | Free via Google API |
| 2. Code Quality | Claude 4.5 Sonnet | Free on OpenRouter |
| 3. Security | Step 3.5 Flash | Free |
| 4. Performance | Gemini 3 Flash | Free |
| 5. Competitive Intel | MiniMax M2.1 | Free |
| 6. User Research | Nemotron 3 Super 120B | Free, replaces DeepSeek (privacy) |
| 7. Architecture & Bugs | MiniMax M2.5 | ~$0.005/run |
| 8. Frontend Patterns | Gemini 3.1 Flash | Free |
| 9. Data Safety | Claude 4.5 Sonnet | Free on OpenRouter |

#### AI Village Phase 2+3 Debates
- **Gemini 3.1 Pro** (direct API) ↔ **Claude 4.5 Sonnet** (OpenRouter free)
- Max 5 rounds per debate with **circuit breakers** (see Section 3.3)

### 3.2 Privacy Architecture — De-Identification Layer

**V2 CRITICAL UPGRADE:** De-identification happens at the DATA LAYER, not as a post-processing step. TypeScript branded types enforce this at compile time.

```typescript
// backend/services/ai/types/privacy.ts

// Branded type — compiler prevents sending raw PII to AI
type DeIdentifiedString = string & { __brand: 'DeIdentified' };
type DeIdentifiedData = {
  clientAlias: DeIdentifiedString;  // "Client-61"
  age: number;                       // Kept
  gender: string;                    // Kept
  fitnessGoals: string[];            // Kept (generic goals)
  painLevel: 'none' | 'low' | 'medium' | 'high';  // Abstracted from 1-10
  painArea: string;                  // Body part only, no specific diagnoses
  nasmPhase: number;                 // Kept
  recentExercises: string[];         // Exercise names only
  macroAverages: { calories: number; protein: number; carbs: number; fat: number };
  measurementTrends: 'improving' | 'stable' | 'declining';
  // EXCLUDED: name, email, phone, SSN, insurance, medical diagnoses, medications
};

// Compile-time enforcement
type AIPrompt = { content: DeIdentifiedString; context: DeIdentifiedData };
function sendToCloudAI(prompt: AIPrompt): Promise<AIResponse>;
// ^ Cannot be called with raw PII — TypeScript enforces this
```

**De-Identification Pipeline:**
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
│  2. Fetch data via DataLoader (batched)  │
│     - 90-day rolling window on all       │
│       historical queries                 │
│     - SELECT with ORDER BY + LIMIT       │
│     - 5s query timeout (PostgreSQL       │
│       statement_timeout)                 │
│  3. De-identify AT FETCH TIME:           │
│     - fetchClient(61, { transform:       │
│       deIdentifyTransform })             │
│     - PII NEVER exists in AI memory      │
│     - Name → "Client-61"                 │
│     - Email → [REDACTED]                 │
│     - Phone → [REDACTED]                 │
│     - Injury details → pain level only   │
│     - Medications → [REDACTED]           │
│  4. PHI Scanner (regex + patterns):      │
│     - Scan user's raw message for PHI    │
│     - Detect: injury names, medications, │
│       diagnoses, SSN, insurance IDs      │
│     - If PHI found: strip from prompt,   │
│       warn user, log to audit            │
│  5. Build prompt with DeIdentifiedData   │
│  6. Send to AI model (cloud)             │
│  7. Receive response                     │
│  8. Re-hydrate: Replace "Client-61" →    │
│     "Jackie" ONLY in frontend response   │
│     (use high-performance string replace, │
│     NOT regex on event loop)             │
└──────────────────────────────────────────┘
```

**PHI Scanner (runs locally, no network calls):**
```typescript
// backend/services/security/phiScanner.ts

const MEDICAL_PATTERNS = [
  /\b(torn|ruptured|fractured|sprained|dislocated)\s+(ACL|MCL|rotator cuff|meniscus|labrum|hamstring)\b/i,
  /\b(taking|prescribed|on|using)\s+(Oxycodone|Vicodin|Percocet|Tramadol|Ibuprofen|Naproxen|Cortisone)\b/i,
  /\b(diagnosed with|suffering from|has|history of)\s+(diabetes|hypertension|heart disease|asthma|arthritis)\b/i,
  /\b(surgery|operation|procedure)\s+(on|for|to)\b/i,
  /\b\d{3}-\d{2}-\d{4}\b/,  // SSN pattern
  /\b[A-Z]{2}\d{7,10}\b/,   // Insurance ID pattern
];

export function scanForPHI(text: string): { hasPHI: boolean; matches: string[] } {
  const matches: string[] = [];
  for (const pattern of MEDICAL_PATTERNS) {
    const match = text.match(pattern);
    if (match) matches.push(match[0]);
  }
  return { hasPHI: matches.length > 0, matches };
}
```

**Schedule Privacy:** When AI scans the schedule, it sees ONLY:
```json
{
  "monday_3_18": [
    { "time": "9:00 AM", "slotType": "booked", "clientAlias": "Client-61" },
    { "time": "10:30 AM", "slotType": "booked", "clientAlias": "Client-42" },
    { "time": "2:00 PM", "slotType": "available" }
  ]
}
```
No session counts, no NASM phases, no financial data sent to cloud AI. Frontend re-hydrates client IDs to names.

### 3.3 Recursive Debate for Workout Planning

**V2 CRITICAL UPGRADE:** Circuit breakers, timeouts, cost tracking, and fallback strategies.

```typescript
// backend/services/ai/types/debate.ts
interface DebateConfig {
  maxRounds: number;
  timeoutMs: number;           // Per round
  maxTotalTimeMs: number;       // Entire debate
  maxCostUSD: number;           // Emergency brake
  fallbackStrategy: 'authority' | 'majority' | 'abort';
  circuitBreaker: {
    failureThreshold: number;
    resetTimeMs: number;
  };
}

const DEBATE_CONFIGS: Record<string, DebateConfig> = {
  workout_plan: {
    maxRounds: 5,
    timeoutMs: 30000,           // 30s per round
    maxTotalTimeMs: 180000,     // 3min total
    maxCostUSD: 0.50,
    fallbackStrategy: 'authority',
    circuitBreaker: { failureThreshold: 3, resetTimeMs: 60000 },
  },
  nutrition_plan: {
    maxRounds: 3,
    timeoutMs: 20000,
    maxTotalTimeMs: 90000,
    maxCostUSD: 0.25,
    fallbackStrategy: 'authority',
    circuitBreaker: { failureThreshold: 2, resetTimeMs: 60000 },
  },
  simple_question: {
    maxRounds: 0,
    timeoutMs: 15000,
    maxTotalTimeMs: 15000,
    maxCostUSD: 0,
    fallbackStrategy: 'abort',
    circuitBreaker: { failureThreshold: 1, resetTimeMs: 30000 },
  },
};
```

**Debate Pipeline:**
```
┌──────────────────────────────────────────────────┐
│          WORKOUT PLAN DEBATE PIPELINE             │
│                                                    │
│  Input: Client-61 context (de-identified)          │
│  - Age 35, Male, NASM Phase 2, 8 weeks exp        │
│  - Pain: right shoulder, level: medium             │
│  - Goals: lose 15 lbs, improve bench press         │
│  - Equipment: Full gym                             │
│                                                    │
│  Round 1: Gemini 3.1 Pro (NASM Specialist)         │
│    → Proposes 4-day split based on OPT Model       │
│    → 30s timeout, circuit breaker armed             │
│                                                    │
│  Round 2: Claude Sonnet (Safety Reviewer)           │
│    → Reviews for contraindications                  │
│    → Flags overhead press (shoulder pain)           │
│    → Suggests landmine press alternative            │
│                                                    │
│  Round 3: Nemotron 120B (Periodization Expert)      │
│    → Reviews volume/intensity progression           │
│    → If API fails → circuit breaker, skip round     │
│                                                    │
│  Round 4: Gemini responds to feedback               │
│    → Incorporates shoulder modifications            │
│                                                    │
│  Round 5: Claude final review                       │
│    → CONSENSUS or AUTHORITY VERDICT                 │
│                                                    │
│  TIMEOUT/FAILURE HANDLING:                          │
│  - If any round times out → skip, continue          │
│  - If 3 consecutive failures → fallback to          │
│    finalAuthority (Gemini) solo decision             │
│  - If entire debate times out (180s) → return       │
│    best plan so far with "Draft" label              │
│                                                    │
│  WebSocket Updates (throttled 500ms):               │
│  → { phase: 'debate', round: 2, total: 5,          │
│      currentModel: 'Safety Reviewer' }              │
└──────────────────────────────────────────────────┘
```

### 3.4 Command Execution Architecture — Sandboxed Intent Pipeline

**V2 CRITICAL UPGRADE:** Intent classification outputs STRUCTURED JSON validated by a separate rule engine. No free-text-to-API execution.

```
┌─────────────────────────────────────────────────┐
│     AI COMMAND PIPELINE (Sandboxed Intent)       │
│                                                   │
│  1. INPUT: Voice/text from trainer                │
│     └─ PHI Scanner runs FIRST                     │
│     └─ Input sanitizer strips injection attempts  │
│                                                   │
│  2. INTENT CLASSIFICATION (Gemini Flash):         │
│     └─ Output: STRUCTURED JSON ONLY               │
│     {                                             │
│       "intent": "schedule_session",               │
│       "clientRef": "Jackie",                      │
│       "params": { "date": "2026-03-19",           │
│                   "time": "15:00" },              │
│       "confidence": 0.95                          │
│     }                                             │
│                                                   │
│  3. ZOD VALIDATION (Rule Engine):                 │
│     └─ Validate against CommandInputSchema        │
│     └─ Reject unknown fields                      │
│     └─ If confidence < 0.7 → ask user to clarify  │
│                                                   │
│  4. RBAC CHECK:                                   │
│     └─ admin → all commands                        │
│     └─ trainer → Categories A-J (own clients)     │
│     └─ client → Category L only (self-service)    │
│     └─ Check happens AFTER classification,         │
│        BEFORE any API call                         │
│                                                   │
│  5. CLIENT RESOLUTION:                             │
│     └─ Fuzzy match → top 3 candidates             │
│     └─ 1 match: proceed. Multiple: ask user.      │
│     └─ Check isActive === true                     │
│     └─ Store client snapshot (id + version)        │
│                                                   │
│  6. CONFIRMATION (destructive + creative):         │
│     └─ Generate confirmationToken (crypto random)  │
│     └─ Tied to: intent + clientId + params +       │
│        timestamp + userId                          │
│     └─ Display confirmation card to user           │
│     └─ Token expires in 120s                       │
│                                                   │
│  7. EXECUTION:                                     │
│     └─ Verify client snapshot (optimistic lock)    │
│     └─ For destructive: verify HMAC signature      │
│     └─ Call REST API endpoint                      │
│     └─ Handle success/error                        │
│                                                   │
│  8. RESPONSE + AUDIT:                              │
│     └─ Action card with details                    │
│     └─ Log to AiAuditLogs (PostgreSQL)            │
│                                                   │
│  9. COMPLEX TASKS:                                 │
│     └─ Route to recursive debate pipeline          │
│     └─ WebSocket progress (throttled 500ms)        │
└─────────────────────────────────────────────────┘
```

### 3.5 Destructive Operation Manager (HMAC-Signed)

```typescript
// backend/services/ai/destructiveOperations.ts
import crypto from 'crypto';

const OPERATION_SECRET = process.env.OPERATION_SIGNING_KEY;

interface PendingOperation {
  id: string;
  type: 'DELETE' | 'UPDATE' | 'DEACTIVATE' | 'LOCK';
  endpoint: string;
  params: Record<string, unknown>;
  affectedRecords: { id: number; name: string }[];
  createdBy: number;
  expiresAt: Date;
  signature: string;
}

class DestructiveOperationManager {
  private signOperation(op: Omit<PendingOperation, 'signature'>): string {
    const payload = JSON.stringify({ id: op.id, endpoint: op.endpoint, params: op.params, createdBy: op.createdBy });
    return crypto.createHmac('sha256', OPERATION_SECRET!).update(payload).digest('hex');
  }

  async prepare(type, endpoint, params, userId): Promise<PendingOperation> {
    const opId = crypto.randomUUID();
    const operation = { id: opId, type, endpoint, params, affectedRecords: await this.previewAffected(endpoint, params), createdBy: userId, expiresAt: new Date(Date.now() + 120000), signature: '' };
    operation.signature = this.signOperation(operation);
    await redisClient.setex(`pending_op:${opId}`, 120, JSON.stringify(operation));
    return operation;
  }

  async execute(opId: string, userId: number): Promise<void> {
    const raw = await redisClient.get(`pending_op:${opId}`);
    if (!raw) throw new Error('Operation expired or not found.');
    const operation = JSON.parse(raw);
    if (operation.createdBy !== userId) throw new Error('Ownership mismatch.');
    const expected = this.signOperation(operation);
    if (operation.signature !== expected) {
      await auditLog.create({ action: 'TAMPERED_OPERATION_BLOCKED', operationId: opId, severity: 'CRITICAL' });
      throw new Error('Signature invalid. Possible tampering.');
    }
    await internalApiClient.execute(operation.endpoint, operation.params);
    await auditLog.create({ action: `AI_${operation.type}`, operationId: opId, affectedCount: operation.affectedRecords.length, userId });
    await redisClient.del(`pending_op:${opId}`);
  }
}
```

### 3.6 BFF Aggregator for Dashboard Scanning

```typescript
// backend/routes/aiBffRoutes.mjs — prevents "request storm"

router.get('/api/admin/ai-bff/command-center', protect, adminOnly, async (req, res) => {
  const cached = await redisClient.get('ai_bff:command_center');
  if (cached) return res.json(JSON.parse(cached));

  const [stats, atRisk, kpis, signups] = await Promise.allSettled([
    fetchWithTimeout('/api/admin/dashboard-stats', 5000),
    fetchWithTimeout('/api/admin/compliance/at-risk', 5000),
    fetchWithTimeout('/api/admin/compliance/analytics/business-kpis', 5000),
    fetchWithTimeout('/api/admin/recent-signups', 5000),
  ]);

  const result = {
    dashboardStats: stats.status === 'fulfilled' ? stats.value : { error: 'unavailable' },
    atRiskClients: atRisk.status === 'fulfilled' ? atRisk.value : { error: 'unavailable' },
    businessKpis: kpis.status === 'fulfilled' ? kpis.value : { error: 'unavailable' },
    recentSignups: signups.status === 'fulfilled' ? signups.value : { error: 'unavailable' },
    fetchedAt: new Date().toISOString(),
    sourcesAvailable: [stats, atRisk, kpis, signups].filter(s => s.status === 'fulfilled').length,
  };

  await redisClient.setex('ai_bff:command_center', 60, JSON.stringify(result));
  res.json(result);
});
```

### 3.7 AI Village Integration Into App

```
NEW BACKEND ENDPOINTS:
  POST /api/admin/ai-village/run       → Admin RBAC enforced
  GET  /api/admin/ai-village/status/:jobId
  GET  /api/admin/ai-village/results/:jobId
  GET  /api/admin/ai-village/latest

WEBSOCKET PROTOCOL:
  { type: 'progress' | 'track_complete' | 'debate_round' | 'complete' | 'error',
    jobId, phase: 1|2|3, round?, trackName?, progress: 0-100, message? }

IMPLEMENTATION:
  - BullMQ job queue (shared Redis instance)
  - WebSocket progress (throttled 500ms)
  - Results in PostgreSQL (ai_validation_results table) + filesystem
  - Admin-only RBAC
  - validationContextIsolation flag prevents infinite loops
```

---

## SECTION 4: IMPLEMENTATION PHASES

### Phase 1: Command Execution Engine (P0)

**Domain-Split Command Registry (no god objects):**

| File | Purpose |
|------|---------|
| `backend/services/ai/types/commands.ts` | TypeScript discriminated unions for all 94 commands |
| `backend/services/ai/types/privacy.ts` | Branded DeIdentified types |
| `backend/services/ai/commandRegistry/clientCommands.ts` | Category A + Zod schemas |
| `backend/services/ai/commandRegistry/workoutCommands.ts` | Category B + Zod schemas |
| `backend/services/ai/commandRegistry/scheduleCommands.ts` | Category C + Zod schemas |
| `backend/services/ai/commandRegistry/healthCommands.ts` | Category D + Zod schemas |
| `backend/services/ai/commandRegistry/nutritionCommands.ts` | Category E + Zod schemas |
| `backend/services/ai/commandRegistry/socialCommands.ts` | Category F + Zod schemas |
| `backend/services/ai/commandRegistry/dashboardCommands.ts` | Category G + Zod schemas |
| `backend/services/ai/commandRegistry/trainerCommands.ts` | Category H + Zod schemas |
| `backend/services/ai/commandRegistry/goalCommands.ts` | Category I + Zod schemas |
| `backend/services/ai/commandRegistry/onboardingCommands.ts` | Category J + Zod schemas |
| `backend/services/ai/commandRegistry/systemCommands.ts` | Category K + Zod schemas |
| `backend/services/ai/commandRegistry/clientSelfService.ts` | Category L + Zod schemas |
| `backend/services/ai/commandRegistry/index.ts` | Merges all registries |
| `backend/services/ai/commandExecutor.mjs` | Sandboxed intent → API pipeline |
| `backend/services/ai/deIdentifier.mjs` | Data-layer PII stripping |
| `backend/services/security/phiScanner.ts` | PHI pattern matching |
| `backend/services/ai/destructiveOperations.ts` | HMAC two-phase commit |
| `backend/services/ai/intentClassifier.mjs` | Gemini Flash structured JSON |
| `backend/services/ai/inputSanitizer.mjs` | Injection prevention |
| `backend/routes/aiBffRoutes.mjs` | Dashboard aggregator |

**Command TypeScript Pattern:**
```typescript
import { z } from 'zod';

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type UserRole = 'admin' | 'trainer' | 'client';

interface BaseCommand<T extends string> {
  type: T;
  description: string;
  naturalLanguagePatterns: readonly string[];
  endpoint: `${HTTPMethod} /api/${string}`;
  inputSchema: z.ZodSchema;
  destructive: boolean;
  requiresConfirmation: boolean;
  roleRequired: readonly UserRole[];
  relatedCommands?: readonly string[];
}

// Example:
const createClientSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().optional(),
  clientSource: z.enum(['direct', 'move_fitness', 'referral']).optional(),
});

export const CREATE_CLIENT: BaseCommand<'create_client'> = {
  type: 'create_client',
  description: 'Create a new client account',
  naturalLanguagePatterns: ['add a new client', 'create client', 'add {name} as a client'],
  endpoint: 'POST /api/admin/clients',
  inputSchema: createClientSchema,
  destructive: false,
  requiresConfirmation: true,
  roleRequired: ['admin', 'trainer'],
  relatedCommands: ['create_external_client', 'start_onboarding'],
} as const;
```

### Phase 2: Recursive Debate for Complex Tasks (P1)

| File | Purpose |
|------|---------|
| `backend/services/ai/debate/debateOrchestrator.ts` | Core engine with circuit breakers |
| `backend/services/ai/debate/workoutDebate.ts` | NASM debate prompts |
| `backend/services/ai/debate/nutritionDebate.ts` | Nutrition debate prompts |
| `backend/services/ai/debate/types.ts` | DebateConfig, DebateRound types |

### Phase 3: Voice-First Workflow (P1)

| File | Action |
|------|--------|
| `backend/services/ai/transcription.mjs` | NEW — Gemini Flash audio transcription (replaces Whisper) |
| `frontend/src/components/AIAssistant/DictationOrb.tsx` | FIX — Memory leak, add hold-to-talk |
| `frontend/src/components/AIAssistant/VoiceUpload.tsx` | NEW — Audio file upload |

**Gemini Flash Transcription (No OpenAI):**
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function transcribeAudio(audioBuffer, mimeType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent([
    { text: 'Transcribe this audio exactly as spoken. Return ONLY the transcribed text.' },
    { inlineData: { mimeType, data: audioBuffer.toString('base64') } }
  ]);
  return result.response.text().trim();
}
```

**DictationOrb Memory Leak Fix:**
```typescript
useEffect(() => {
  return () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };
}, []);
```

### Phase 4: AI Village App Integration (P2)

| File | Purpose |
|------|---------|
| `backend/routes/aiVillageRoutes.mjs` | REST endpoints (admin RBAC) |
| `backend/services/aiVillageService.mjs` | Wraps orchestrator |
| `backend/jobs/validationWorker.mjs` | BullMQ worker (shared Redis) |
| `frontend/.../AIVillageSection.tsx` | Validation UI |

### Phase 5: Performance & Error Hardening (P1)

**Redis State Manager:**
```typescript
class AIStateManager {
  async trackAction(conversationId, action) {
    const key = `ai_actions:${conversationId}`;
    await redisClient.lpush(key, JSON.stringify(action));
    await redisClient.ltrim(key, 0, 49);
    await redisClient.expire(key, 3600);
  }

  async isDuplicate(conversationId, action) {
    const recent = await redisClient.lrange(`ai_actions:${conversationId}`, 0, 4);
    return recent.some(raw => {
      const a = JSON.parse(raw);
      return a.type === action.type && a.targetId === action.targetId && a.status === 'failed';
    });
  }
}
```

**Context Enrichment (DataLoader + 90-Day Window):**
```sql
SELECT u.id, u.age, u.gender,
  json_agg(DISTINCT g.*) FILTER (WHERE g.id IS NOT NULL) AS goals,
  json_agg(DISTINCT p.*) FILTER (WHERE p.id IS NOT NULL) AS pain_entries,
  json_agg(DISTINCT m.*) FILTER (WHERE m.id IS NOT NULL) AS measurements
FROM "Users" u
LEFT JOIN "Goals" g ON g."userId" = u.id AND g."createdAt" > NOW() - INTERVAL '90 days'
LEFT JOIN "PainEntries" p ON p."userId" = u.id AND p."isActive" = true
LEFT JOIN "Measurements" m ON m."userId" = u.id AND m."createdAt" > NOW() - INTERVAL '90 days'
WHERE u.id = ANY($1)
GROUP BY u.id ORDER BY u.id
-- 5s statement_timeout enforced at connection level
```

**Database Config:**
```typescript
export const sequelize = new Sequelize({
  pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
  dialectOptions: { statement_timeout: 5000 },
});
```

---

## SECTION 5: DOCUMENTATION & ERROR PREVENTION

### 5.1 Error Loop Prevention (Redis-Backed)
- Track last 50 actions per conversation in Redis
- Same action fails 3x in a row → AI escalates to human with explanation
- Same params on retry after failure → blocked, must try different approach
- Stored in Redis (survives restarts, works with horizontal scaling)

### 5.2 Audit Trail (PostgreSQL)
```sql
CREATE TABLE "AiAuditLogs" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "Users"(id),
  "conversationId" VARCHAR(255),
  "aiModel" VARCHAR(100),
  intent VARCHAR(100),
  "targetClientId" INTEGER,
  params JSONB,
  endpoint VARCHAR(255),
  result VARCHAR(20),
  "errorMessage" TEXT,
  "phiDetected" BOOLEAN DEFAULT false,
  "debateRounds" INTEGER,
  "executionTimeMs" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
-- Indexes: userId, conversationId, createdAt, intent
-- 90-day retention policy via scheduled cleanup
```

---

## SECTION 6: SECURITY REQUIREMENTS

### 6.1 Authentication & Authorization
- All AI actions use the REQUESTING USER'S JWT
- RBAC check AFTER intent classification, BEFORE execution
- Rate limiting: credit-based (simple=1, debate=15, transcription=2, AI Village=50)

### 6.2 Input Sanitization
- Strip SQL injection patterns
- Strip command injection (`;`, `|`, `&&`, backticks)
- Strip prompt injection markers ("ignore previous", "you are now", etc.)
- Max 2000 chars per command

### 6.3 Confirmation Protocol
- **DESTRUCTIVE:** HMAC-signed two-phase commit (Redis, 120s TTL)
- **CREATIVE:** Confirmation token (crypto random, 120s expiry)
- **READ-ONLY:** No confirmation needed

---

## SECTION 7: DESIGN SYSTEM — AI COMPONENTS

### 7.1 Crystalline Swan AI Tokens (Phase 3 Consensus)
```typescript
const AI_TOKENS = {
  shatteredRuby: '#D92D53',    // Destructive actions
  glacialEmerald: '#14B881',   // Creative actions
  // NO EMOJIS — Lucide/Phosphor SVG icons only (1.5px stroke)
};
```

### 7.2 Action Confirmation Cards
- Left border: `4px solid #D92D53` (destructive) or `#14B881` (creative)
- Icons: `ShieldWarningSvg` / `SparkleSvg` (1.5px stroke, #FFFFFF)
- Title: Pure White #FFFFFF, Plus Jakarta Sans 16px
- Confirm button: 44px min-height

### 7.3 Debate Transcript Typography
- **Headers:** Cormorant Garamond Italic, 1.5rem, #C6A84B
- **Persona Labels:** Sora, 0.85rem, uppercase, letter-spacing 1.5px, weight 600, #C6A84B
- **Body Text:** Plus Jakarta Sans, 16px, #FFFFFF, line-height 1.6

### 7.4 Error Boundary
- `<AIErrorBoundary>` wraps entire AI drawer
- 3+ errors → disable AI for 5min (circuit breaker)
- Fallback UI with retry button

---

## SECTION 8: AI VILLAGE ORCHESTRATOR UPGRADES

### 8.1 Replace DeepSeek (Privacy)
Track 6 → `nvidia/nemotron-3-super-120b-a12b:free` (US-based)

### 8.2 Add Consolidation Debate (Phase 1.5)
After 9 validators, Llama 3.3 70B ↔ Nemotron 120B debate which findings are valid (3 rounds, $0 cost).

### 8.3 Model Roster
```javascript
const MODELS = {
  // Phase 1: 9 parallel (all free)
  track1: 'google/gemini-2.5-flash',
  track2: 'anthropic/claude-4.5-sonnet',
  track3: 'stepfun/step-3.5-flash:free',
  track4: 'google/gemini-3-flash-preview',
  track5: 'minimax/minimax-m2.1',
  track6: 'nvidia/nemotron-3-super-120b-a12b:free',
  track7: 'minimax/minimax-m2.5',
  track8: 'google/gemini-3.1-flash-lite-preview',
  track9: 'anthropic/claude-4.5-sonnet',
  // Phase 1.5: Consolidation (free)
  consolidation_proposer: 'meta-llama/llama-3.3-70b-instruct:free',
  consolidation_critic: 'nvidia/nemotron-3-super-120b-a12b:free',
  // Phase 2+3: Debates
  debate_cto: 'gemini-3.1-pro',
  debate_ceo: 'anthropic/claude-4.5-sonnet',
};
```

---

## SECTION 9: SUCCESS CRITERIA

1. Trainer manages ALL operations via voice commands alone
2. 90%+ natural language classification accuracy on first attempt
3. Workout plans are NASM-compliant and pain-aware (recursive debate)
4. Client PII NEVER in any cloud AI request (branded types + audit)
5. PHI in user messages detected and stripped before processing
6. AI Village runs in-app with WebSocket progress
7. Zero circular error loops (Redis tracking, 3-failure escalation)
8. All 94 commands execute with Zod validation
9. Destructive actions require HMAC-signed two-phase commit
10. Full audit trail (PostgreSQL, 90-day retention, indexed)
11. Mobile-first (375px, 44px touch targets, voice-first)
12. Dashboard scanning via BFF aggregator (Redis cache, no storms)
13. Debate circuit breakers (30s/round, 180s total, 3-failure threshold)
14. Input sanitized against SQL/command/prompt injection
15. Client self-service mode (Category L)

---

## APPENDIX: V1 → V2 CHANGE LOG

| Source | Severity | Change |
|--------|----------|--------|
| Security (Track 3) | CRITICAL | Sandboxed intent pipeline (JSON + Zod) |
| Security (Track 3) | CRITICAL | RBAC after classification, before execution |
| Security (Track 3) | CRITICAL | Input sanitizer (SQL/prompt injection) |
| Code Quality (Track 2) | CRITICAL | De-identification at data layer (branded types) |
| Code Quality (Track 2) | CRITICAL | TypeScript discriminated unions for commands |
| Code Quality (Track 2) | CRITICAL | Debate circuit breakers + timeouts |
| Performance (Track 4) | CRITICAL | BFF aggregator + Redis cache for dashboards |
| Performance (Track 4) | HIGH | Redis for all state (actions, debates, ops) |
| Performance (Track 4) | HIGH | DataLoader + 90-day SQL + 5s timeout |
| Performance (Track 4) | HIGH | DictationOrb memory leak fix |
| Phase 2 Debate | CONSENSUS | 6 findings (Redis, Zod, DataLoader, PHI, TS, HMAC) |
| Phase 3 Debate | CONSENSUS | Shattered Ruby/Glacial Emerald tokens |
| Phase 3 Debate | CONSENSUS | Sora labels, Cormorant headers, SVG only |
| Architecture (Track 7) | CRITICAL | Split god object into domain registries |
| Architecture (Track 7) | HIGH | Confirmation tokens, fuzzy matching, optimistic locking |
| Architecture (Track 7) | HIGH | Error boundary, WebSocket protocol |
| User Research (Track 6) | P0 | Category L: Client Self-Service (10 commands) |
| Code Quality (Track 2) | HIGH | Credit-based rate limiting |
| Architecture (Track 7) | HIGH | Audit trail in PostgreSQL |

**Commands: 84 → 94 | Findings addressed: 35+**

---

*SwanStudios God-Level AI Upgrade Prompt V2 — Enhanced by 11-Brain AI Village Consensus*
*Ready for AI Village Round 2 Validation*
