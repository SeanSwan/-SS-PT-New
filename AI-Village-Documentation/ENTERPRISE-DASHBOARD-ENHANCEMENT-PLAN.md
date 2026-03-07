# Enterprise Dashboard Enhancement Plan
## SwanStudios — AI-First Personal Training Platform

> **Goal:** Transform client, trainer, and admin dashboards into enterprise-grade command centers with AI assistants, real-time form analysis, macro logging, and comprehensive metrics.

> **HARD RULE: ZERO MOCK DATA.** Every metric, KPI, chart, and widget must display REAL data from the database. No hardcoded values, no placeholder numbers, no "TODO" stubs. If data doesn't exist yet, show "No data yet" or "0" — never a fake number. All existing mock values in `adminEnterpriseRoutes.mjs` (churn=5%, CAC=$50, productivity=85, NPS=8.5, etc.) MUST be replaced with real DB queries.

---

## Current State Assessment

### What Exists (Strong Foundation)

| System | Status | Details |
|--------|--------|---------|
| Form Analysis Service | BUILT, NOT INTEGRATED | Python FastAPI on port 8100, MediaPipe 33-point pose, 81 exercises, rep counting, tempo analysis, compensation detection, Gemini coaching feedback |
| AI Workout Generation | FULL | 4-provider failover (OpenAI, Anthropic, Gemini, Venice), NASM OPT phases 1-5, coach-in-the-loop approval, long-horizon 3/6/12mo planning |
| Gamification/XP | FULL | Points, streaks (with grace period), milestones, achievements, tiers, leaderboards. Concurrency-safe with row locking |
| Nutrition Plans | PARTIAL | Trainer-created plans with macros (protein/carbs/fat/fiber), dietary restrictions, allergies. NO daily logging, NO AI generation |
| RBAC | FULL | JWT auth, role-based (admin/trainer/client), trainer-client assignment enforcement, AI consent management |
| Client Dashboard | 9 TABS | Overview, Workouts, Schedule, Progress, Health, Gamification, Onboarding, Messages, Account |
| Trainer Dashboard | 4 SECTIONS | TrainingOverview, ClientManagement, ContentStudio, AssignedSessions (reduced from 17 in Phase 2) |
| Admin Dashboard | 9 WORKSPACES | Dashboard, Clients, Workouts, Scheduling, Gamification, Store, Content, Analytics, System |
| Voice Logger | EXISTS | VoiceSessionLogger with speech-to-text, exercise logging via voice |
| WorkoutCopilotPanel | ADMIN ONLY | AI draft generation, pain/injury constraints, template suggestions, approval flow |

### What's Missing (Critical Gaps)

| Gap | Impact | Priority |
|-----|--------|----------|
| **No AI Assistant on Client/Trainer dashboards** | Users can't interact with AI for workout guidance, macro logging, or questions | P0 |
| **Form Analysis not in any UI** | Python service exists but clients can't use phone camera for form checks | P0 |
| **No daily macro/food logging** | No endpoint or UI for clients to track daily food intake | P1 |
| **Client overview lacks enterprise data** | Missing: workout compliance %, next session countdown, body comp trends, AI recommendations | P1 |
| **Trainer overview lacks enterprise data** | Missing: client adherence rates, session utilization, revenue per client, at-risk alerts | P1 |
| **Admin overview gaps** | Missing: MRR trends, client retention cohorts, trainer productivity, program effectiveness | P1 |
| **No AI chat/conversation endpoint** | Backend has no POST /api/ai/chat route, no conversation model, no message threading | P0 |
| **WorkoutCopilot not available to clients/trainers** | AI workout generation only accessible from admin panel | P1 |

---

## Enhancement Phases

### Phase A: AI Assistant Backend (Foundation)
> Build the backend API for AI-powered conversations across all dashboards

#### A1. AI Conversation Model
**New file:** `backend/models/AiConversation.mjs`
```javascript
{
  id, userId, role, // 'client' | 'trainer' | 'admin'
  title,            // Auto-generated from first message
  context,          // 'workout' | 'nutrition' | 'form' | 'general' | 'macro_log'
  messages: [{      // JSONB array
    role: 'user' | 'assistant' | 'system',
    content: string,
    timestamp: Date,
    metadata: {}     // tool calls, form analysis refs, etc.
  }],
  status: 'active' | 'archived',
  metadata: {},      // Client profile snapshot for context
  createdAt, updatedAt
}
```

#### A2. AI Chat Route
**New file:** `backend/routes/aiChatRoutes.mjs`
- `POST /api/ai/chat` — Send message, get AI response (streaming optional)
  - Role-based system prompts (client gets restricted, trainer gets more, admin gets full)
  - Context-aware: knows user's workout history, nutrition plan, form analysis results
  - Tool use: can call form analysis, log macros, generate workouts
- `GET /api/ai/chat/conversations` — List user's conversations
- `GET /api/ai/chat/conversations/:id` — Get conversation with messages
- `DELETE /api/ai/chat/conversations/:id` — Archive conversation

#### A3. AI Chat Controller
**New file:** `backend/controllers/aiChatController.mjs`
- Uses existing `providerRouter.mjs` for multi-provider failover
- System prompt includes role-based permissions:
  - **Client:** Can ask about exercises, log macros, get form tips, request workout suggestions (suggestions only — trainer must approve plans)
  - **Trainer:** All client permissions PLUS can generate workout plans for assigned clients, review form analysis, create nutrition plans
  - **Admin:** Full access to all AI capabilities
- Integrates with existing AI consent check
- Rate limited per role (client: 50/day, trainer: 200/day, admin: unlimited)

#### A4. Daily Macro Log Model & Endpoints (Powered by USDA + CalorieNinjas)
**New file:** `backend/models/DailyMacroLog.mjs`
```javascript
{
  id, userId, date,
  meals: [{          // JSONB array
    name: string,    // 'breakfast' | 'lunch' | 'dinner' | 'snack' | custom
    time: string,
    items: [{
      food: string,
      calories: number,
      protein: number,
      carbs: number,
      fat: number,
      fiber: number,
      quantity: string,
      source: 'manual' | 'ai_parsed' | 'barcode' | 'usda' | 'calorie_ninjas',
      usdaFdcId: number,  // USDA FoodData Central ID for detailed lookup
    }]
  }],
  totals: { calories, protein, carbs, fat, fiber, water_oz },
  notes: string,
  aiParsed: boolean,  // true if AI helped parse food descriptions
  createdAt, updatedAt
}
```

**New routes in:** `backend/routes/dailyMacroRoutes.mjs`
- `POST /api/macros/log` — Log a meal (manual or AI-parsed from natural language)
- `GET /api/macros/today` — Get today's log
- `GET /api/macros/history?from=&to=` — Date range history
- `GET /api/macros/summary?period=week|month` — Aggregated summary
- `GET /api/macros/:userId/today` — Trainer/admin view of client's log

---

### Phase B: AI Assistant Frontend (Client + Trainer)
> Universal AI terminal component that lives on every dashboard

#### B1. AIAssistantDrawer Component
**New file:** `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx`
- Slide-up drawer (mobile) / side panel (desktop) — always accessible
- Persistent floating trigger button (DictationOrb) in bottom-right corner
- Features:
  - Text input with send button
  - Voice dictation (Web Speech API) with visual waveform
  - Conversation history sidebar
  - Context-aware suggestions ("Log my lunch", "Check my form", "What's my workout today?")
  - Streaming responses with typing indicator
  - Quick action chips: Log Meal, Check Form, My Plan, Ask Trainer

#### B2. DictationOrb Component
**New file:** `frontend/src/components/AIAssistant/DictationOrb.tsx`
- Floating action button (56px, meets 44px touch target)
- States: idle (cyan glow), listening (pulsing purple), processing (spinning), error (red)
- Tap to open drawer with keyboard
- Long-press to start voice dictation directly
- Galaxy-Swan themed: glass surface, cosmic gradient, subtle particle effect

#### B3. AI Chat Hook
**New file:** `frontend/src/hooks/useAIChat.ts`
- `sendMessage(text)` — POST to /api/ai/chat
- `startDictation()` / `stopDictation()` — Web Speech API wrapper
- `conversations` — cached conversation list
- `currentConversation` — active thread
- `isListening`, `isProcessing`, `error` states
- Auto-retry with exponential backoff

#### B4. Client Dashboard Integration
**Modified:** `frontend/src/components/ClientDashboard/RevolutionaryClientDashboard.tsx`
- Add `<AIAssistantDrawer role="client" />` as overlay on all tabs
- AI is the FIRST thing visible — prominent on overview
- Overview gets "AI Quick Actions" card:
  - "Log today's meals" (opens AI chat with macro context)
  - "Check my form" (opens form analysis camera)
  - "What's my workout?" (shows today's plan)
  - "Talk to my trainer" (opens messages)

#### B5. Trainer Dashboard Integration
**Modified:** `frontend/src/components/TrainerDashboard/StellarComponents/StellarTrainerDashboard.tsx`
- Add `<AIAssistantDrawer role="trainer" />` as overlay
- AI Quick Actions for trainers:
  - "Generate workout for [client]" (opens copilot)
  - "Review [client]'s form" (opens form analysis)
  - "Check today's schedule"
  - "Client progress summary"

---

### Phase C: Form Analysis Integration (Client Camera)
> Let clients use their phone camera to check form during workouts

#### C1. FormAnalysisWidget Component
**New file:** `frontend/src/components/FormAnalysis/FormAnalysisWidget.tsx`
- Camera capture (getUserMedia API) with exercise selector
- Upload flow: Record clip -> Select exercise -> Upload -> Show results
- Results display: Overall score (0-100), rep count, compensations found, corrective cues
- Movement profile summary (aggregated over time)
- Mobile-first: full-screen camera view, large touch targets

#### C2. FormAnalysisCard on Client Overview
**Modified:** `frontend/src/components/ClientDashboard/GalaxySections.tsx` (OverviewGalaxy)
- Add "Form Check" card to overview grid
- Shows: Last form score, trend arrow, "Check Form Now" button
- Tapping opens FormAnalysisWidget
- If no history: "Get your first form analysis" CTA

#### C3. Form Analysis in AI Chat
- AI chat recognizes "check my form" / "analyze my squat" commands
- Responds with camera prompt + exercise selection
- Results feed back into conversation with coaching tips
- Links to full form analysis history

---

### Phase D: Enterprise Overview Data (All Dashboards)
> Upgrade overview pages with the metrics expected from a professional PT platform

#### D1. Client Overview Enhancement
**Modified:** `frontend/src/components/ClientDashboard/GalaxySections.tsx` (OverviewGalaxy)

**New KPI Cards:**
| Card | Data Source | Description |
|------|-------------|-------------|
| Workout Streak | User.streakDays | Current streak with flame icon, best streak |
| Weekly Compliance | WorkoutSession count vs plan | "4/5 workouts this week" progress ring |
| Next Session | Upcoming session | Countdown timer with trainer name |
| Body Composition | Measurements | Weight/BF% trend sparkline (last 30 days) |
| Form Score | FormAnalysis avg | Average form score with trend |
| XP & Level | User.points, User.level | Level progress bar, points to next level |
| Nutrition Adherence | DailyMacroLog vs plan | "You hit your protein goal 5/7 days" |
| AI Recommendations | AI-generated | "Try adding hip mobility work before squats" |

**Quick Actions Row:**
- Log Workout | Log Meal | Check Form | View Schedule | Message Trainer

#### D2. Trainer Overview Enhancement
**Modified:** `frontend/src/components/TrainerDashboard/StellarComponents/TrainerStellarSections.tsx` (TrainingOverview)

**New KPI Cards:**
| Card | Data Source | Description |
|------|-------------|-------------|
| Active Clients | ClientTrainerAssignment | Total assigned, active this week |
| Session Utilization | WorkoutSession | Sessions delivered / available slots (%) |
| Client Adherence | WorkoutSession per client | Avg compliance across all clients |
| Revenue This Month | Order/Session data | Estimated revenue from sessions |
| At-Risk Clients | Inactivity detection | Clients with 5+ days no activity, declining streaks |
| Upcoming Sessions | Next 48h sessions | Session list with client names |
| Top Performers | Streak/XP leaders | Clients with best adherence this week |
| Form Alerts | FormAnalysis | Clients with declining form scores |

**Client Quick List:**
- Scrollable client cards with: Name, last workout, streak, compliance %, form score trend

#### D3. Admin Overview Enhancement — Replace Mock Data with Real Calculations
**Modified:** `backend/routes/adminEnterpriseRoutes.mjs` + Admin overview components

**CRITICAL: These admin KPIs are currently HARDCODED MOCK VALUES that must be replaced:**

| Metric | Current Value | Fix | Source |
|--------|--------------|-----|--------|
| Churn Rate | `0.05` hardcoded | Calculate from users who haven't logged in 30+ days / total active | `users` table |
| CAC | `$50` hardcoded | Track referral sources, calculate from marketing spend | New `AcquisitionSource` tracking |
| Profit Margin | `0.3` hardcoded | Revenue - (Stripe fees + infrastructure costs) | `orders` + config |
| Trainer Productivity | `85` hardcoded | Sessions delivered per trainer per week | `sessions` + `users WHERE role='trainer'` |
| Revenue Growth Rate | `0.15` hardcoded | Compare current 30d revenue vs previous 30d | `orders` table |
| NPS | `8.5` hardcoded | Implement NPS survey (future) or remove | New survey system |
| Error Rate | `0.02` hardcoded | Track actual API errors via middleware | New error counter middleware |
| Throughput | `450 req/min` hardcoded | Track actual request count | New request counter |
| Retention Trends | `[]` empty | Monthly cohort retention query | `users` + `sessions` tables |
| Revenue Trends | `[]` empty | Monthly revenue aggregation | `orders` table |
| Session Trends | `[]` empty | Weekly session count aggregation | `sessions` table |
| Social Analytics | All zeros | Connect to actual social post/engagement data | `social_posts` table |

**New Real Executive KPI Cards:**
| Card | Data Source | Description |
|------|-------------|-------------|
| Monthly Recurring Revenue | orders WHERE status='paid' last 30d | MRR with REAL month-over-month trend |
| Active Users | users WHERE updated_at >= 7d | DAU/WAU/MAU with REAL retention curve |
| Session Completion Rate | sessions completed/total | Platform-wide completion vs scheduled |
| Client Retention | users active 30d ago still active today | REAL 30/60/90 day retention cohorts |
| Trainer Productivity | sessions.count GROUP BY trainerId / 4 weeks | REAL avg sessions per trainer per week |
| Revenue Per Client | SUM(orders.amount) / COUNT(DISTINCT users) | REAL ARPC with trend |
| Platform Health | Real DB response time + error tracking | API latency, REAL error rates, uptime |
| AI Usage | AiInteractionLog | Generations this month, approval rate, cost |

**Operational Widgets:**
- Revenue trend chart (last 12 months)
- Client acquisition funnel (visitor -> signup -> first session -> retained)
- Trainer leaderboard (sessions, client satisfaction, retention)
- AI cost tracker (spend by provider, cost per generation)

#### D4. Backend Endpoints for Dashboard Metrics
**New file:** `backend/routes/dashboardMetricsRoutes.mjs`
- `GET /api/metrics/client/overview` — Client's own KPI data (compliance, streak, next session, body comp)
- `GET /api/metrics/trainer/overview` — Trainer's KPI data (utilization, adherence, at-risk clients)
- `GET /api/metrics/admin/overview` — Admin executive KPIs (MRR, retention, productivity)
- `GET /api/metrics/admin/revenue` — Detailed revenue analytics
- `GET /api/metrics/admin/retention` — Cohort retention analysis
- All endpoints respect RBAC (client sees own, trainer sees assigned clients, admin sees all)

---

### Phase E: AI Integration into Existing Workflows
> Wire AI assistant into workout logging, form checks, and scheduling

#### E1. AI-Assisted Macro Logging (CalorieNinjas + USDA)
- Client types or dictates: "I had 2 eggs, toast with butter, and a protein shake for breakfast"
- **CalorieNinjas API** parses natural language → returns structured macro data per item
- **USDA FoodData Central** provides authoritative micronutrient details on tap
- User confirms/edits parsed data, then saves to DailyMacroLog
- Integrated into AI chat AND standalone macro logging view
- Future: Open Food Facts barcode scanning for packaged foods

#### E2. AI-Assisted Workout Logging
- Client can tell AI: "I did 3 sets of 10 squats at 135lbs"
- AI parses into WorkoutSession format
- User confirms exercise, sets, reps, weight
- Triggers XP award on save
- Integrated into AI chat

#### E3. Form Analysis in Workout Flow
- During workout logging, "Check Form" button appears next to each exercise
- Opens camera with exercise pre-selected
- Results saved and linked to that workout session
- AI provides immediate corrective cues

---

### Phase F: Admin Mock Data Replacement (Real Calculations)
> Replace all hardcoded mock values in adminEnterpriseRoutes.mjs with real DB queries

#### F1. Real Churn Rate Calculation
**Modified:** `backend/routes/adminEnterpriseRoutes.mjs` (~line 690)
```sql
-- Users active 60 days ago who haven't been active in last 30 days
SELECT
  COUNT(CASE WHEN updated_at < NOW() - INTERVAL '30 days'
             AND updated_at >= NOW() - INTERVAL '60 days' THEN 1 END)::float
  / NULLIF(COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '60 days' THEN 1 END), 0)
  AS churn_rate
FROM users WHERE role = 'client'
```

#### F2. Real Revenue Trends (12-month)
**Modified:** `backend/routes/adminEnterpriseRoutes.mjs` (~line 766)
```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  SUM(amount) as revenue,
  COUNT(DISTINCT user_id) as paying_clients
FROM orders WHERE status = 'paid'
AND created_at >= NOW() - INTERVAL '12 months'
GROUP BY 1 ORDER BY 1
```

#### F3. Real Trainer Productivity
**Modified:** `backend/routes/adminEnterpriseRoutes.mjs` (~line 731)
```sql
SELECT
  u.id, u."firstName", u."lastName",
  COUNT(s.id) as sessions_30d,
  COUNT(DISTINCT s."clientId") as unique_clients
FROM users u
LEFT JOIN sessions s ON s."trainerId" = u.id
  AND s.created_at >= NOW() - INTERVAL '30 days'
  AND s.status = 'completed'
WHERE u.role = 'trainer'
GROUP BY u.id
```

#### F4. Real Retention Cohorts
**New function in:** `backend/routes/adminEnterpriseRoutes.mjs`
```sql
-- 30/60/90 day retention: users who signed up in cohort window AND had activity recently
SELECT
  DATE_TRUNC('month', u.created_at) as cohort_month,
  COUNT(*) as cohort_size,
  COUNT(CASE WHEN u.updated_at >= NOW() - INTERVAL '30 days' THEN 1 END) as retained_30d,
  COUNT(CASE WHEN u.updated_at >= NOW() - INTERVAL '60 days' THEN 1 END) as retained_60d,
  COUNT(CASE WHEN u.updated_at >= NOW() - INTERVAL '90 days' THEN 1 END) as retained_90d
FROM users u WHERE u.role = 'client'
GROUP BY 1 ORDER BY 1 DESC LIMIT 12
```

#### F5. Real Session Trends
```sql
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
  COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows
FROM sessions
WHERE created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY 1 ORDER BY 1
```

#### F6. Real Social Analytics
```sql
SELECT
  COUNT(*) as total_posts,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as posts_7d,
  SUM(likes_count) as total_engagement,
  COUNT(DISTINCT user_id) as active_posters
FROM social_posts
WHERE moderation_status = 'approved'
```

#### F7. Error Rate & Throughput Middleware
**New file:** `backend/middleware/requestMetrics.mjs`
- Increment request counter on every request
- Track error count (status >= 500)
- Store in-memory with 5-minute rolling window
- Expose via `GET /api/admin/system/metrics` endpoint
- Replace hardcoded error rate (0.02) and throughput (450)

---

## Files Summary

### New Files (Backend: 6)
| File | Purpose |
|------|---------|
| `backend/models/AiConversation.mjs` | AI chat conversation storage |
| `backend/models/DailyMacroLog.mjs` | Daily food/macro logging |
| `backend/routes/aiChatRoutes.mjs` | AI assistant chat endpoints |
| `backend/controllers/aiChatController.mjs` | AI chat logic with role-based prompts |
| `backend/routes/dashboardMetricsRoutes.mjs` | Enterprise KPI endpoints for all 3 dashboards |
| `backend/middleware/requestMetrics.mjs` | Real-time error rate + throughput tracking (replaces mock values) |

### New Files (Backend Migrations: 2)
| File | Purpose |
|------|---------|
| `backend/migrations/YYYYMMDD-create-ai-conversations.cjs` | AiConversation table |
| `backend/migrations/YYYYMMDD-create-daily-macro-logs.cjs` | DailyMacroLog table |

### New Files (Frontend: 5)
| File | Purpose |
|------|---------|
| `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx` | Universal AI chat drawer |
| `frontend/src/components/AIAssistant/DictationOrb.tsx` | Floating AI trigger button |
| `frontend/src/hooks/useAIChat.ts` | AI chat hook with speech API |
| `frontend/src/components/FormAnalysis/FormAnalysisWidget.tsx` | Camera-based form analysis UI |
| `frontend/src/hooks/useFormAnalysis.ts` | Form analysis upload/results hook |

### Modified Files (9)
| File | Change |
|------|--------|
| `frontend/src/components/ClientDashboard/RevolutionaryClientDashboard.tsx` | Add AIAssistantDrawer overlay |
| `frontend/src/components/ClientDashboard/GalaxySections.tsx` | Enterprise KPI cards + Form Check card on overview |
| `frontend/src/components/TrainerDashboard/StellarComponents/StellarTrainerDashboard.tsx` | Add AIAssistantDrawer overlay |
| `frontend/src/components/TrainerDashboard/StellarComponents/TrainerStellarSections.tsx` | Enterprise KPI cards on overview |
| `frontend/src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-view.tsx` | Enterprise executive KPIs |
| `backend/routes/dailyMacroRoutes.mjs` | Daily macro logging endpoints |
| `backend/routes/adminEnterpriseRoutes.mjs` | Replace ALL mock/hardcoded values with real DB queries |
| `backend/core/startup.mjs` | Register new routes + request metrics middleware |
| `backend/server.mjs` | Add requestMetrics middleware to Express app |

### Zero Breaking Changes
- All backend changes are additive (new models, new routes)
- Existing endpoints unchanged
- AI Assistant is an overlay — doesn't modify existing dashboard structure
- Form analysis uses existing Python service (no new microservice)
- RBAC enforced on all new endpoints using existing middleware
- AI consent required for all AI features (existing consent system)

---

## Role-Based Permission Matrix

| Feature | Client | Trainer | Admin |
|---------|--------|---------|-------|
| AI Chat (general questions) | Own context only | Own + assigned clients | Full access |
| AI Macro Logging | Own meals only | View client logs | Full access |
| AI Workout Suggestions | Suggestions only (trainer approves) | Generate + approve for clients | Full access |
| Form Analysis (camera) | Own form only | Own + review client forms | Full access |
| Form Analysis History | Own history | Own + assigned clients | All users |
| Dashboard Metrics | Own KPIs | Own + assigned client KPIs | Platform-wide |
| Workout Logging via AI | Own workouts | Log for assigned clients | Full access |
| Nutrition Plan Creation | View own plan | Create for assigned clients | Full access |

---

## Implementation Priority

| Priority | Phase | Effort | Impact |
|----------|-------|--------|--------|
| P0 | A (AI Backend) | 2-3 days | Foundation for everything |
| P0 | B (AI Frontend) | 2-3 days | Immediate user-facing value |
| P0 | C (Form Analysis UI) | 1-2 days | Uses existing backend service |
| P1 | D (Enterprise Data) | 3-4 days | Professional-grade dashboards |
| P1 | E (AI Workflow Integration) | 2-3 days | Seamless AI-assisted workflows |
| P1 | F (Admin Mock Data Kill) | 2-3 days | Replace 12 hardcoded values with real SQL |
| P1 | G (Food Intelligence Backend) | 2-3 days | Barcode scanner + ingredient analysis + safety scoring |
| P1 | H (Food Intelligence Frontend) | 3-4 days | Scanner UI, farm finder, fast food analyzer, education hub |
| P2 | I (Supplements & AG1) | 1-2 days | Supplement store tab + AG1 affiliate |
| P2 | Social Media Unsplash | 0.5 day | Rotating fitness/lifestyle backgrounds |

> **Full blueprint:** See `AI-Village-Documentation/FOOD-INTELLIGENCE-BLUEPRINT.md` for Phases G-I details
> **API research:** See `AI-Village-Documentation/FREE-API-INTEGRATIONS-RESEARCH.md` for all free + paid API recommendations

---

## Verification Checklist

1. `cd frontend && npm run build` — zero errors after each phase
2. Client login -> AI Assistant visible immediately on overview
3. Client can type/dictate "I had chicken and rice for lunch" -> macro data parsed and saved
4. Client can open camera -> select exercise -> get form analysis score
5. Trainer login -> AI Assistant with client context
6. Trainer can ask "How is [client] doing?" -> gets compliance/progress summary
7. Admin dashboard shows MRR, retention, utilization, AI costs
8. All new endpoints respect RBAC (client can't see other clients, trainer limited to assigned)
9. AI consent check enforced on all AI features
10. Mobile responsive: 44px touch targets, drawer works at 375px

---

*SwanStudios Enterprise Dashboard Enhancement Plan v1.0*
*Generated: 2026-03-07*
