# Blueprint-First Protocol (MANDATORY)
> Reference doc extracted from CLAUDE.md — loaded on-demand, not every message.
> Read this doc when working on: creating or modifying components >100 lines, building new pages, or reviewing component architecture.

---

## Blueprint-First Protocol (MANDATORY)

Every major component (>100 lines) MUST have a blueprint comment block at the top of the file. This is the guardrail that prevents "vibe coding" as the project grows across multiple AI agents.

### What Goes in the Blueprint
1. **Component name, purpose, owner, last validation date**
2. **ASCII wireframe** showing the visual layout
3. **Data flow** (props in, state, API calls, events, children)
4. **Architecture diagram** (Mermaid-style component tree)

### Blueprint Format (Main Components)
```
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: [Name]                                           ║
 * ║  PURPOSE: [One-line description]                              ║
 * ║  OWNER: [AI/person who last modified]                         ║
 * ║  LAST VALIDATED: [Date of last AI Village run]                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────┐
 * │ [Visual layout of the component]       │
 * └────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { ... }
 * State:     { ... }
 * API Calls: GET /api/..., POST /api/...
 * Events:    customEventName
 * Children:  SubComponent1, SubComponent2
 *
 * ARCHITECTURE:
 * graph TD
 *   A[Parent] --> B[Child1]
 *   A --> C[Child2]
 */
```

### Sub-Component Blueprint (shorter)
```
/**
 * ┌─── SUB-COMPONENT: [Name] ──────────────────────┐
 * │ PARENT: [ParentComponent]                        │
 * │ PURPOSE: [What it does]                          │
 * │ WIREFRAME: [ASCII layout]                        │
 * │ Props: { ... }                                   │
 * └──────────────────────────────────────────────────┘
 */
```

### Enforcement Rules
- **No component >100 lines may exist without a blueprint header**
- **When modifying a component, update its blueprint FIRST**
- **Sub-components reference their parent's blueprint**
- **AI Village validation checks for blueprint presence**
- **Master prompt V1:** `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT.md`
- **Master prompt V2 (CURRENT):** `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md`

### Embedded AI Terminal Architecture
The AI assistant is **embedded into every admin dashboard tab** at the top of the content area (not a floating drawer). Each tab auto-sets the AI context based on its data domain. The floating FAB remains for non-admin pages.

| Dashboard Tab | AI Context | Tab Route |
|--------------|------------|-----------|
| Overview | `general` | `/dashboard/default` |
| Schedule | `scheduling` | `/dashboard/schedule` |
| Training Sessions | `workout_generation` | `/dashboard/admin-sessions` |
| Client Progress | `progress_analysis` | `/dashboard/client-progress` |
| Client Management | `client_review` | `/dashboard/client-management` |
| NASM Exercises | `exercise_library` | `/dashboard/nasm-exercises` |
| Reports | `data_analysis` | `/dashboard/reports` |

### NASM Exercise Database (V3 — 840+ Exercises)
- **840 production exercises** across 12 sources:
  | Source | Count | Content |
  |--------|-------|---------|
  | `free-exercise-db` | 501 | Chest, back, shoulders, arms, legs, core, olympic, cardio, full body, stretching |
  | `nasm-advanced` | 140 | Sliders/gliding discs, mini-bands, long bands, stability ball, BOSU, medicine ball, corrective exercises |
  | `nasm` | 55 | Core NASM OPT protocol exercises |
  | `beachbody` | 26 | Original Insanity/T25 signature moves |
  | `beachbody-insanity` | 36 | Insanity Pure Cardio, Plyometric Cardio, Max Interval |
  | `beachbody-t25` | 19 | Focus T25 Alpha/Beta/Gamma |
  | `beachbody-max30` | 15 | Insanity Max:30 |
  | `beachbody-hiphopabs` | 10 | Hip Hop Abs |
  | `beachbody-transform20` | 10 | Cize + Transform 20 |
  | `p90x` | 15 | P90X / P90X3 |
  | `taebo` | 10 | Tae Bo martial arts cardio |
  | `squat-university` | 3 | Mobility/squat mechanics |
- **10 filter chips:** All, Chest, Back, Shoulders, Arms, Legs, Core, Full Body, Cardio, Recovery
- **15+ equipment categories:** Barbell, Dumbbell, Cable, Machine, Bodyweight, Kettlebell, Resistance Band, Mini Band, Stability Ball, Medicine Ball, BOSU Ball, Sliders, Landmine, TRX/Suspension Trainer, Cardio Equipment, None
- **Difficulty scale:** 50-900 (50=beginner stretching, 500=intermediate, 900=elite/advanced)
- **Source tracking:** Every exercise tagged with origin source for audit trail
- **Autocomplete Rolodex UI:** `frontend/src/components/DashBoard/Pages/admin-exercises/` — react-window virtualized, ExerciseSearchBar with dropdown z-index fix
- **Draft Mode RBAC:** Admin creates = active+global. Trainer creates = draft+trainer. Drafts blocked from production logs until approved.
- **Admin custom exercise management:** Only admins can create/edit/soft-delete custom exercises. Seeded exercises are read-only.
- **Seeder files (run in order):**
  1. `backend/seeders/20250503-seed-nasm-exercises.mjs` (13 original)
  2. `backend/seeders/20260228-seed-nasm-comprehensive-exercises.mjs` (55 NASM)
  3. `backend/seeders/20260321-seed-expanded-exercises.mjs` (85 Beachbody/Tae Bo/bands/KB)
  4. `backend/seeders/20260321-seed-free-exercise-db.mjs` (501 comprehensive)
  5. `backend/seeders/20260322-seed-nasm-advanced-equipment.mjs` (151 sliders/bands/BOSU/corrective)
  6. `backend/seeders/20260322-seed-beachbody-expanded.mjs` (106 Insanity/T25/Max30/P90X/HipHopAbs/Transform20)
- **Exercise → Gamification link:** Every exercise has `experiencePointsEarned` (default 10 XP). Completing exercises in workouts triggers the gamification engine for point awards.
- Full database spec: `docs/ai-workflow/blueprints/EMBEDDED-AI-TERMINAL-AND-WORKOUT-LOGGER-MASTER-PROMPT-V2.md` (Appendix C)

---

## Enhanced Blueprint-First Protocol (MANDATORY — UPGRADED)

The original blueprint protocol is extended with **parent-child mapping, click-outcome flowcharts, and Mermaid diagrams** to eliminate vibe coding.

### Parent Component Blueprint (REQUIRED for all top-level dashboard pages)
Every parent/page component MUST include ALL of the following before any code is written:
```
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: [Name]                                           ║
 * ║  PURPOSE: [One-line description]                              ║
 * ║  OWNER: [AI/person who last modified]                         ║
 * ║  LAST VALIDATED: [Date of last AI Village run]                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ [Header: Title + Actions]                                   │
 * ├──────────┬─────────────────────────────────────────────────┤
 * │ Sidebar  │  [Main Content Area]                             │
 * │          │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
 * │          │  │ Widget 1 │ │ Widget 2 │ │ Widget 3 │           │
 * │          │  └─────────┘ └─────────┘ └─────────┘           │
 * │          │  [Detail Panel / Modal Area]                      │
 * └──────────┴─────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[ParentPage] --> B[HeaderBar]
 *   A --> C[SidebarNav]
 *   A --> D[ContentArea]
 *   D --> E[WidgetGrid]
 *   D --> F[DetailPanel]
 *   E --> G[Widget1]
 *   E --> H[Widget2]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Button: "Add Client"] → Opens AddClientModal → POST /api/users → Refreshes client list
 * [Tab: "Schedule"] → Sets AI context to 'scheduling' → Loads ScheduleTab → GET /api/sessions
 * [Card: Client Name] → Opens ClientDetailPanel → GET /api/users/:id → Shows profile + charts
 * [Badge Icon] → Opens AchievementModal → Shows badge art + XP reward + share button
 *
 * DATA FLOW:
 * Props In:  { user: User, role: 'admin' | 'trainer' | 'client' }
 * State:     { activeTab, selectedClient, isModalOpen }
 * API Calls: GET /api/users, GET /api/sessions, POST /api/workouts
 * Events:    onClientSelect, onTabChange, onWorkoutLog
 * Children:  HeaderBar, SidebarNav, ContentArea, DetailPanel
 *
 * GAMIFICATION HOOKS:
 * - Workout save → GamificationEngine.awardPoints('completeWorkout', userId)
 * - Achievement unlock → trigger tierGlowPulse animation
 * - Level up → particle burst + XP counter animation
 */
```

### Child Component Blueprint (REQUIRED for all sub-components)
```
/**
 * ┌─── SUB-COMPONENT: [Name] ──────────────────────────────────┐
 * │ PARENT: [ParentComponent]                                    │
 * │ PURPOSE: [What it does for the parent]                       │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────┐                                 │
 * │ │ [Visual layout]          │                                 │
 * │ └──────────────────────────┘                                 │
 * │ Props: { ... }                                               │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Action] → [Result] → [API Call] → [UI Update]              │
 * │ GAMIFICATION: [What XP/badge events this triggers]           │
 * └──────────────────────────────────────────────────────────────┘
 */
```

### Enforcement Rules (UPGRADED)
- **No component >100 lines may exist without a blueprint header** — includes wireframe + Mermaid + click-outcomes
- **Parent components MUST list ALL children** with their purpose
- **Every clickable element MUST have a documented outcome** in the click-outcome flowchart
- **Gamification hooks MUST be documented** if the component triggers point awards or animations
- **Chart components MUST document** which data source feeds them and which profile visibility toggle controls them
- **When modifying a component, update its blueprint FIRST**
- **Before creating a new parent component:** Research 3+ competitor sites for the same feature type, document findings in blueprint
- **AI Village validation checks for blueprint completeness** (wireframe + Mermaid + click-outcomes + data flow)

### Competitor Research Protocol (BEFORE building new features)
Before building any new page or major feature:
1. **Identify 3+ competitor/reference sites** that implement the same feature
2. **Screenshot key interactions** from each reference
3. **Document in blueprint:** What they do well, what we can improve, how our Crystalline Swan theme differentiates
4. **Examples:** For social feed → study Instagram, Strava, Fitocracy. For workout logger → study Strong, JEFIT, Hevy. For gamification → study Duolingo, Habitica, Nike Run Club.
