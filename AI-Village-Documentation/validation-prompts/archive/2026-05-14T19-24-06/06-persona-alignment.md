# User Persona Alignment — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 28.7s
> **Files:** docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md
> **Generated:** 5/14/2026, 12:24:06 PM

---

## 📋 ExecutiveSummary
**Verdict:** **REVISE** – the sequencing is solid but several high‑risk gaps and UX frictions need to be addressed before Phase 1 can be shipped. The biggest blockers are (1) privacy‑first handling of voice‑memo PII, (2) real‑time client‑context binding in the mobile dock, and (3) the stub‑client creation flow that currently risks polluting production data.

Below you’ll find:

1. **Persona‑by‑persona review** (Sean, Golf Client, Working Professional, Move Fitness Client, Trust & Emotion).
2. **Answer to the AI‑Village questions** (risk gaps, Phase 1 scope, stub modeling, canonical logging path, mobile interactions, blockers, tests, implementation order).
3. **Concrete “first‑slice” implementation plan** – files to touch, security checks, UI tweaks, and a minimal backend change that can be built and verified safely.

---

## 1️⃣ Persona‑Specific Review

### 1️⃣ Sean (Admin/Trainer) – “Gym‑Between‑Sets Voice Log”
| Question | Current State | Recommendation |
|----------|---------------|----------------|
| **Can he voice‑log a client’s workout between sets?** | Voice notes land in the PLAUD queue, but the **Coach Command Center** still uses static `COMMAND_THREADS`. The composer only appends prototype logs; no real AI‑chat backend is wired. | **Wire the real `useAIChat` flow** so that a voice memo can be transcribed → parsed → a *draft workout log* appears instantly. Add a **“Log Now”** button in the fixed bottom dock (44 px tap target) that sends the current conversation to the AI‑coach endpoint. |
| **Load a previous conversation to check last session’s notes?** | Conversation list exists but is populated from static data. | Replace the static list with the **real conversation store** (`useAIChat` + backend `/api/aiChat/conversations`). Add **search** and **filter** (e.g., “leg day”) that works on the client‑side cache. |
| **How many taps?** | At least 4 taps: open dock → open queue → tap voice icon → tap “Create Thread”. | Reduce to **2 taps**: (1) tap the **fixed “+” dock** → (2) select “Record Voice” → auto‑populate a new thread. Use **voice‑activated trigger** (micro‑permission) for power users. |

### 2️⃣ Golf Client Onboarding – “Premium Feel”
| Question | Current State | Recommendation |
|----------|---------------|----------------|
| **Will the Coach Assistant feel premium enough?** | Conversation history shows generic placeholders; no client‑specific branding. | Inject **client‑specific metadata** (e.g., “Client: *John – Golf Coach*) into the conversation title and header. Use **Royal Depth #003080** accent for the client card and **Gilded Fern #C6A84B** for “Premium” badges. |
| **Does conversation history look sophisticated or basic?** | Uses generic “Chat #123”. | Show **rich previews** (e.g., “John – 3‑day split, 12 min ago”) and **avatar initials** with the Crystalline Swan palette. Add a **“Premium Coach” badge** next to the AI‑coach name to signal human‑in‑the‑loop oversight. |

### 3️⃣ Working Professional – “5‑Minute Check‑In”  | Question | Current State | Recommendation |
|----------|---------------|----------------|
| **Is the sidebar fast?** | Sidebar loads the entire queue; on mobile it can overflow at 332 px. | **Lazy‑load** the queue after the dock is pinned. Keep the **sidebar width ≤ 280 px** on mobile; use **collapsible “More”** button. |
| **Can they search “leg day” in past conversations?** | No search yet; only static list. | Add **client‑side fuzzy search** on conversation titles & snippets (indexed from the AI‑chat store). Debounce to 300 ms for smoothness. |
| **One‑handed usability?** | Fixed dock is 44 px but contains many icons. | Consolidate primary actions (Record, Approve, Search) into **three icons** at the bottom; hide secondary actions behind a **long‑press** or **swipe‑up**. |

### 4️⃣ Move Fitness Client – “Free Tier, Less Tech‑Savvy”
| Question | Current State | Recommendation |
|----------|---------------|----------------|
| **Accessibility for 40‑60 yr olds?** | Dark theme, small fonts, no high‑contrast toggle. | Enforce **WCAG AA contrast** (≥ 4.5:1) on all text; increase **base font size to 16 sp** on mobile. Provide **“High‑Contrast” toggle** in the dock settings. Touch targets must be **≥ 48 × 48 dp**. |
| **Voice UX?** | Voice‑first AI coach exists but not integrated. | Add **“Tap & Hold to Transcribe”** with a **visual waveform** that persists while the user speaks; auto‑stop after 30 s to avoid fatigue. |

### 5️⃣ Trust Signals – “Thinking Indicator + Provider Badge”
| Question | Current State | Recommendation |
|----------|---------------|----------------|
| **Does it build trust or cause confusion?** | Indicator shows “AI thinking…” but no clear mapping to which model is used. | Add a **persistent badge** next to the indicator: “Powered by Swan‑AI (internal)” with a tooltip explaining **“All data stays on‑prem; no external LLM calls.”** Use **Obsidian Black #0A0A0F** background with **Frost White #E0ECF4** text for readability. |
| **Clarity of “which AI am I talking to?”** | Ambiguous; only generic “Coach Assistant”. | Rename the UI element to **“Swan Coach AI”** and display a **small “🤖” icon** that expands to show **“Model: Swan‑GPT‑v2 (internal)”**. This reassures the Golf Client that a *premium* AI is in use. |

### 6️⃣ Emotional Response – “Crystalline Swan Aesthetic”
| Question | Current State | Recommendation |
|----------|---------------|----------------|
| **Premium vs. Cold?** | Dark theme with high contrast can feel stark. | Introduce **subtle gradient overlays** (e.g., `linear-gradient(135deg, #002060 0%, #003080 100%)`) on panels to soften the look. Add **micro‑animations** (fade‑in of draft proposals) to convey “thoughtful” rather than “mechanical.” |
| **Motivating?** | Minimal visual feedback on approvals. | When a draft is approved, show a **“✅ Logged”** toast with **Gilded Fern #C6A84B** accent and a **tiny swan animation** that flies across the screen. This reinforces a sense of progress. |

---

## 2️⃣ AI‑Village Answers

### 2.1 Highest‑Risk Gap
**Unified PII handling of voice‑memo transcripts.**
- Voice memos may contain client names, phone numbers, or health details.
- Current webhook (`plaudWebhookRoutes.mjs`) forwards raw audio to SwanStudios without **redaction** or **on‑prem transcription**.
- If an external ASR is ever introduced, it would violate the “no PII to external LLMs” rule.

**Mitigation:**
- Enforce **server‑side transcription** using an internal, encrypted ASR pipeline (e.g., Whisper‑tiny hosted on the same VPC).
- Strip any detected PII before it reaches the `coachIntakeItemService`.
- Log a **privacy audit** of every inbound transcript.

### 2.2 Should Phase 1 Wire Real Conversations *or* Move PLAUD Review State into Conversation Context?
**Phase 1 should wire real conversations** *and* **embed the PLAUD review state** (e.g., `pending_merge`, `needs_client`) **as part of the conversation metadata**.
- This creates a **single source of truth** for the trainer: the conversation thread already contains the status flags, so no separate UI is needed.
- It also simplifies later phases because the same `useAIChat` hooks can be reused for admin, trainer, and mobile views.

### 2.3 Modeling Stub/Minimal Client Creation
- **Data model:** Add a new table `stub_client` with fields: `id (UUID)`, `created_at`, `status ENUM('pending', 'active', 'archived')`, `source (voice|upload|note)`, `placeholders (phone,email)`.
- **UI flow:** When the operator clicks “Create Minimal Client” from the staging inbox, open a **modal** that only asks for **name** and **source** (auto‑populated from the intake). **Do not pre‑fill email/phone**.
- **Safety:** The modal must **require explicit “Save as Stub”** button; the resulting record must be **marked `status='pending'`** and **excluded from all billing/notification flows** until an admin manually upgrades it.
- **Security:** Add a **row‑level security policy** in Sequelize (`scope: 'stub'`) so that any write to `clients` table must pass a middleware that checks `is_stub` flag.

### 2.4 Canonical Logging Path for Future Charts  - **Preferred path:** **`WorkoutSession` → `WorkoutLog`** (the existing admin endpoint).
- Reason: It stores **granular session timestamps**, **duration**, and **exercise metadata** that can be aggregated into charts without additional joins.
- **DailyWorkoutForm** is currently a *read‑only* view for progress; it should **not** be the source of truth for charts until the logging path is audited.
- **Action:** Create a **materialized view** `mv_client_progress` that joins `WorkoutLog` + `DailyWorkoutForm` once the data model is stable.

### 2.5 Mobile Interactions That Matter Most for a Trainer
| Interaction | Why It Matters | Suggested Implementation |
|-------------|----------------|--------------------------|
| **One‑tap “Log Current Session”** | Trainer often finishes a set and wants to capture the workout instantly. | Add a **floating “Log” button** in the dock that auto‑selects the *currently active client* (if any) and opens the AI‑coach to generate a draft. |
| **Swipe‑right to Archive a Conversation** | Quick cleanup of completed threads. | Implement a **swipe gesture** on the conversation list items (44 px swipe area) that triggers `archive()` via the backend. |
| **Voice‑activated “Next”** | Hands may be occupied. | Enable **“Hey Swan, next”** (platform‑specific) that triggers the next draft approval without touching the screen. |
| **Quick‑filter by “Leg Day”, “Cardio”, “Stretch”** | Trainers need to locate past workouts fast. | Add **filter chips** in the sidebar that persist across sessions; store the last used filter in `localStorage`. |

### 2.6 What Should Be Blocked Until Phase 2/3?
- **Auto‑generation of client contact details** (email, phone) – risk of fake data.
- **Full‑scale client onboarding flow** (requires email verification, invitation flow).
- **Social‑feed posting** (XP, streaks) – must wait for stable logging path.
- **Trainer‑only parity** – can be built later; for now keep admin‑only to avoid permission bugs.

### 2.7 Required Evidence / Tests Before Deployment
1. **Privacy audit script** that scans all inbound webhook payloads for PII and verifies redaction.
2. **End‑to‑end test** that a voice memo → transcription → draft workout → admin approval works on **mobile Safari** with a single tap.
3. **Accessibility audit** (axe-core) confirming ≥ AA contrast, touch target size, and screen‑reader labels.
4. **Conversation state sync test** – ensure `pending_merge` status appears correctly in the conversation sidebar on both desktop and mobile.
5. **Stub‑client isolation test** – create a stub, attempt to log a workout, verify that no email invitation is sent and that the stub is excluded from billing reports.

### 2.8 Recommended Implementation Order (Lowest Rework)

| Phase | Core Change | Files to Touch | Reason |
|------|--------------|----------------|--------|
| **0️⃣ Prep** | Add server‑side transcription & PII redaction middleware | `backend/controllers/plaud/plaudWebhookRoutes.mjs`, `backend/services/audioTranscriber.mjs` | Guarantees privacy before any UI work. |
| **1️⃣ Real Conversations** | Replace static `COMMAND_THREADS` with `useAIChat` integration; embed PLAUD review state in conversation metadata | `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx`, `frontend/src/hooks/useAIChat.ts`, `backend/routes/aiChatRoutes.mjs` | Provides the foundation for all later phases. |
| **2️⃣ Staging Inbox** | Unified queue UI; status tags (needs_client, clarification_hold) | `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx`, `frontend/src/components/PlaudClipMerge/*` | Makes the inbox usable for all personas. |
| **3️⃣ Stub Client** | Minimal client modal + `stub_client` model + security middleware | `backend/controllers/adminClientController.mjs`, `backend/services/coachClientOnboardingApprovalService.mjs`, `frontend/src/components/DashBoard/Pages/coach-assistant/StubClientModal.tsx` | Prevents data pollution. |
| **4️⃣ Quick Workout Mode** | “Create today’s workout” flow with confidence flagging | `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx` (new “QuickPlan” button) | Directly addresses Working Professional need. |
| **5️⃣ Chart Read‑Model** | Materialized view + chart component (later) | `backend/services/progress/mv_client_progress.mjs` | Can be deferred until logging path is stable. |

---

## 3️⃣ Detailed “First‑Slice” Implementation Plan

### 3.1 What to Build (Small, Verifiable)
**Goal:** Enable a trainer to **record a voice memo**, have it transcribed on‑server, appear as a **draft workout log** in the Coach Command Center, and **approve** it with a single tap.  | Step | File(s) | Change Summary |
|------|---------|----------------|
| **A. Server‑side transcription** | `backend/services/audioTranscriber.mjs` (new) | Wrap Whisper‑tiny (hosted locally) to convert PLAUD audio → plain text; strip PII via regex + whitelist. |
| **B. Webhook → transcription pipeline** | `backend/controllers/plaud/plaudWebhookRoutes.mjs` (add `transcribe` route) | After audio fetch, call `audioTranscriber`, store result in `plaud_clips.transcript`, mark `status='ready_for_coach'`. |
| **C. Coach intake queue update** | `backend/services/coachIntakeItemService.mjs` (extend `source` enum) | Add `plaud_clip` as a valid source; when a clip reaches `ready_for_coach`, push to `coach_intake_queue`. |
| **D. Front‑end: real conversation list** | `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx` | Replace `useCoachIntakeQueue` static data with `useAIChat` + `useCoachIntakeQueue` combined; map each intake item to a **conversation thread** (`<Thread key={id}>`). |
| **E. Draft generation UI** | `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx` + `frontend/src/components/DashBoard/Pages/coach-assistant/ConversationSidebar.tsx` | Add a **“Generate Draft”** button inside each thread header; on click, POST to `/api/aiChat/propose` with `{action: 'workout_log', context: thread.id}`. |
| **F. Approval flow** | `frontend/src/components/DashBoard/Pages/coach-assistant/ConversationSidebar.tsx` | Add **“Approve”** badge next to each draft; on click, dispatch `POST /api/admin/clients/:clientId/workouts` (via existing `workoutLogService`). |
| **G. Mobile dock update** | `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx` (bottom dock) | Insert a **new icon** “🎤 Record” that opens the voice‑memo recorder; after recording, automatically push to the queue and show a **toast

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
