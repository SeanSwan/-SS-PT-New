# SwanStudios Client Onboarding Workflow Overhaul — AI Village Planning Document

## 1. EXECUTIVE SUMMARY

Redesign the client onboarding workflow so that the Coach Assistant AI can create new clients, pre-fill onboarding data from natural language, and trigger a guided completion flow. This affects admin, trainer, and client dashboards — with glowing "incomplete onboarding" indicators, Move Fitness vs SwanStudios client differentiation, session deduction logic, and the Crystalline Link Protocol (SWAN-XXXX claim codes).

## 2. CURRENT STATE (What Exists)

### Built & Working
- **8-step onboarding wizard** (Basic Info, Goals, Health, Nutrition, Lifestyle, Training, AI Consent, Summary) — `frontend/src/pages/onboarding/ClientOnboardingWizard.tsx`
- **ClientOnboardingQuestionnaire model** — 85 questions, responsesJson JSONB, status enum (in_progress/submitted/completed/archived)
- **ClientBaselineMeasurements model** — NASM PAR-Q+, Overhead Squat Assessment, 15+ strength/mobility fields, corrective strategy
- **Claim code system** — SWAN-XXXXXXXX tokens, SHA-256 hashing, 30-day expiry, O(1) lookup, public claim/activate endpoints
- **AI client_onboarding prompt** — Trainer/admin voice/text dictation → ONBOARD_CLIENT_INTENT JSON extraction
- **Admin createClient endpoint** — POST /api/admin/clients with password generation, email, trainer assignment
- **POST /api/clients/onboard** — Atomic creation: User + ClientProgress + ClientTrainerAssignment + claim token
- **Move Fitness vs SwanStudios differentiation** — clientSource enum, availableSessions=0 for MF, session deduction for SS
- **10 context chips** in Coach Assistant (Coach, Workouts, Log Meal, Clients, Schedule, Progress, Exercises, XP & Badges, Form Tips, Onboarding)

### Broken / Incomplete
- **AI creates client via chat but doesn't pre-fill the onboarding questionnaire** — only creates the User record
- **No "incomplete onboarding" indicators** on any dashboard
- **No glowing tab** to guide clients to complete their onboarding
- **ONBOARD_CLIENT action block from AI isn't processed by frontend** — generates JSON but no handler consumes it
- **4 context chips have NO backend prompts** — Schedule, Progress, Exercises, Gamification silently fall back to generic
- **Teach Mode panel is isolated** — exercise encyclopedia doesn't integrate with chat
- **No "Teach Me" system** for new trainers to learn what each context does

## 3. PROPOSED CHANGES

### 3A. AI-Driven Client Creation + Questionnaire Pre-Fill

**Goal:** When admin/trainer tells the Coach AI to onboard a new client, the AI:
1. Extracts basic info (name, age, goals, health, client source)
2. Creates the User account (already implemented in aiChatRoutes.mjs)
3. **NEW:** Pre-fills as much of the 8-stage questionnaire as possible from the conversation
4. Generates the SWAN-XXXX claim code
5. Returns: client ID, temp password, claim URL, what % of onboarding was pre-filled

**Implementation:**
- After creating the User, also create a ClientOnboardingQuestionnaire with status='in_progress'
- Map AI-extracted fields to questionnaire responsesJson:
  - firstName/lastName → Stage 1 (Basic Info)
  - dateOfBirth/age, gender → Stage 1
  - fitnessGoal → Stage 2 (Goals)
  - healthConcerns → Stage 3 (Health)
  - trainingExperience → Stage 6 (Training)
  - clientSource → metadata (determines free vs paid)
- Calculate completionPercentage based on filled sections
- Store trainerNotes (NASM assessment) in client_notes table

### 3B. Glowing "Complete Your Onboarding" Tab

**Goal:** Unfinished onboarding shows a pulsing/glowing tab on:
- **Client dashboard:** Prominent glowing tab at top — "Complete Your Profile" with progress bar showing X/8 sections done
- **Trainer dashboard:** List of assigned clients with incomplete onboarding, showing completion % per client
- **Admin dashboard:** Master list of ALL clients with incomplete onboarding, filterable by trainer

**Implementation:**
- Query `ClientOnboardingQuestionnaire WHERE status IN ('in_progress', 'submitted') AND completedAt IS NULL`
- Client dashboard: `OnboardingStatusCard` component already exists — enhance with glow animation + progress
- Trainer dashboard: Add `IncompleteOnboardingList` to MyClientsView
- Admin dashboard: Add column to Clients & Team table showing onboarding status

**Visual Design:**
- Glowing animation: `@keyframes onboardingGlow` — Wing Purple (#8B5CF6) pulsing border
- Progress indicator: 8-dot step tracker showing filled vs empty sections
- Dismissible only after completion (not closeable)

### 3C. Move Fitness vs SwanStudios Client Flow

**Move Fitness clients (free):**
- clientSource = 'move_fitness'
- availableSessions = 0 (always)
- No session deduction — workouts logged for tracking only
- Free access to charts, progress, gamification
- Onboarding focuses on: basic info, goals, health concerns (3 sections minimum)
- Claim code sent via text/email for account activation

**SwanStudios clients (paid):**
- clientSource = 'swanstudios'
- availableSessions = N (set by admin, deducted per session)
- Full session management with deduction
- Full onboarding required (all 8 sections recommended)
- Claim code + payment setup

### 3D. Context Chips → "Teach Me" System

**Goal:** Transform the context chips from mere context switchers into educational guides. When a new trainer clicks a chip, instead of (or in addition to) switching AI context, show a brief tutorial explaining what they can do in that context.

**Implementation:**
- Add `teachDescription` field to each CONTEXT_CHIP definition
- On first click of a chip (tracked via localStorage), show a 3-4 sentence tooltip explaining what that context enables
- Examples:
  - **Coach:** "I'm the master AI — I can do everything. Just tell me what you need in natural language."
  - **Onboarding:** "Tell me about a new client and I'll create their account, pre-fill their intake form, and generate a claim code."
  - **Workouts:** "Describe a workout and I'll generate a full NASM-protocol program with sets, reps, tempo, and rest."

### 3E. Hive Mind AI System Verification

**Goal:** Ensure the backend AI system actually processes requests through the multi-model consensus (Gemini Flash → Qwen → Gemini Pro) for complex tasks like onboarding.

**Current state:** The hive mind system is documented in CLAUDE.md but implementation needs verification:
- Check if `aiChatService.mjs` actually calls multiple models for complex tasks
- Verify complexity detection routes onboarding requests to the hive mind
- Ensure fallback chain works when primary provider fails

## 4. DATA FLOW: COMPLETE ONBOARDING JOURNEY

```
ADMIN/TRAINER (Coach Assistant)
│
├─ "Onboard Will, 32, Move Fitness client, wants to build muscle, bad right knee"
│
├─ AI extracts: { firstName: "Will", lastName: "?", age: 32, clientSource: "move_fitness",
│                  fitnessGoal: "Build muscle", healthConcerns: "Right knee issue" }
│
├─ AI asks: "What's Will's last name and email?"
│
├─ Admin: "Will Johnson, will.j@email.com"
│
├─ AI confirms: "Creating Move Fitness client Will Johnson — shall I proceed?"
│
├─ Admin: "Yes"
│
├─ AI generates: { action: "create_client", firstName: "Will", lastName: "Johnson",
│                   email: "will.j@email.com", clientSource: "move_fitness", ... }
│
├─ BACKEND PROCESSES:
│   1. Create User (role='client', clientSource='move_fitness', availableSessions=0)
│   2. Create ClientOnboardingQuestionnaire (status='in_progress', pre-filled sections)
│   3. Create ClientTrainerAssignment (assign to admin)
│   4. Generate SWAN-XXXXXXXX claim code
│   5. Create ClientProgress record
│
├─ AI responds: "Will Johnson created! Client ID: 95
│   Claim code: SWAN-ABCD1234
│   Claim URL: https://sswanstudios.com/claim/SWAN-ABCD1234
│   Temp password: xK7mQ2pR9vLn
│   I pre-filled 3/8 onboarding sections (Basic Info, Goals, Health).
│   Send Will the claim URL to activate his account."
│
└─ Admin texts/emails Will the claim URL
     │
     └─ WILL (Client):
        │
        ├─ Opens claim URL → enters SWAN-ABCD1234
        ├─ Sets new password
        ├─ Logs in → sees GLOWING "Complete Your Profile" tab
        ├─ Clicks tab → opens onboarding wizard at Stage 4 (Nutrition)
        │   (Stages 1-3 pre-filled, shown as completed with green checks)
        ├─ Fills remaining sections (Nutrition, Lifestyle, Training, AI Consent, Summary)
        └─ Submits → onboarding complete, glow disappears, full platform access

TRAINER DASHBOARD:
├─ "Incomplete Onboarding" section shows: "Will Johnson — 3/8 sections (37%)"
├─ After Will completes: checkmark, removed from incomplete list
└─ Can click to view/edit Will's onboarding data

ADMIN DASHBOARD:
├─ Clients & Team table has "Onboarding" column: "In Progress (37%)" badge
├─ Filterable by status (complete/incomplete)
└─ Can view all clients' onboarding progress regardless of trainer
```

## 5. FILES TO MODIFY/CREATE

### Backend (Modify)
- `backend/routes/aiChatRoutes.mjs` — Enhance create_client handler to also create questionnaire
- `backend/services/aiChatService.mjs` — Update coach_assistant prompt with create_client instructions
- `backend/controllers/adminClientController.mjs` — Add onboarding status to getClients response

### Frontend (Modify)
- `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachConstants.ts` — Add teachDescription to chips
- `frontend/src/components/DashBoard/Pages/coach-assistant/ContextChipBar.tsx` — Show teach tooltips
- `frontend/src/components/ClientDashboard/OnboardingStatusCard.tsx` — Add glow animation + progress
- `frontend/src/components/DashBoard/workspaces/clients-team/MasterDetailLayout.tsx` — Add onboarding column
- `frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx` — Add incomplete onboarding list

### Frontend (Create)
- `frontend/src/components/DashBoard/Pages/client-dashboard/IncompleteOnboardingBanner.tsx` — Glowing banner for clients
- `frontend/src/components/DashBoard/Pages/admin-clients/components/OnboardingStatusBadge.tsx` — Status badge component

## 6. SECURITY CONSIDERATIONS
- AI-created clients get forcePasswordChange=true
- Claim codes are SHA-256 hashed, 30-day expiry
- Only admin role can trigger create_client action (enforced in aiChatRoutes.mjs)
- PII stripping still applies — AI never sees real client data in subsequent messages
- Email validation: stub emails auto-generated if not provided, client can update on claim

## 7. MOVE FITNESS vs SWANSTUDIOS CRITICAL RULES
- MF: availableSessions ALWAYS 0, no session deduction, free platform access
- SS: availableSessions tracked, deducted per completed session, payment required
- Both: full onboarding flow, same questionnaire, same NASM assessment
- Both: claim code system, forcePasswordChange, trainer assignment
- Differentiation stored in User.clientSource field

## 8. QUESTIONS FOR AI VILLAGE
1. Should we require email for Move Fitness clients or allow phone-only onboarding?
2. How should the "minimum viable onboarding" differ between MF and SS clients?
3. Should the AI auto-detect clientSource from conversation context or always ask?
4. What gamification rewards should trigger on onboarding milestones?
5. How should the Teach Me tooltips be triggered — first click, or always available?
6. Should the glowing tab be animated (GPU-intensive) or use a simpler indicator?
7. Are there regulatory/compliance considerations for collecting health data via AI?
8. Should completed onboarding trigger an automatic NASM OPT Phase recommendation?
