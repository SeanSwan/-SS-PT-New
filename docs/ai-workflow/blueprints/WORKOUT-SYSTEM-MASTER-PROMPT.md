# SwanStudios Workout System — 7-Star Enterprise Master Prompt

> **Purpose:** Comprehensive blueprint for the unified workout system overhaul.
> **Generated from:** Playwright QA of production site, full codebase analysis, competitor research (Trainerize, TrueCoach, Fitbod, Strong, Hevy, JEFIT, Exercise.com), NASM/Squat University protocol review, and Sean's detailed vision.
> **Target:** Transform fragmented workout tabs into a cohesive, AI-powered training platform that outperforms every competitor.

---

## 1. CURRENT STATE (Playwright QA Findings)

### Workouts Workspace — 10 Tabs
| Tab | Route | Status | Issues |
|-----|-------|--------|--------|
| **Plans** | `/dashboard/workouts` | Working | 4-step wizard (Plan Details → Schedule → Exercises → Review). "Next" button disabled — needs validation fix. No link to AI generation. |
| **Logger** | `/dashboard/workouts/logger` | Partially Working | Shows exercise search, date auto-fill (3/16/2026), equipment location selector, AI terminal embedded. Missing: NASM sections (lengthening, balance, core), tempo field, send-to-client. Sessions Remaining: 0. |
| **Movement** | `/dashboard/workouts/movement` | Working | Lists completed assessments with search/filter (All/Draft/Completed/Linked/Archived). 2 assessments found for Sean Swan. |
| **Deep Research** | `/dashboard/workouts/ai` | Partially Working | AI workout generator with Single Workout / Long-Horizon modes. Auto-starts "Generating Workout Plan..." on load. Still uses "Deep Research" branding. |
| **Movement Analysis** | `/dashboard/workouts/form-analysis` | Working | Upload/Live/History/Profile sub-tabs. Video/photo drop zone. 18 exercise buttons for form analysis. |
| **Body Map** | `/dashboard/workouts/body-map` | Working | Front + Back SVG body views with clickable regions. Pain entry form: level slider, type, side, client description, onset date, aggravating movements, relieving factors, postural syndrome, AI guidance notes, trainer notes. |
| **Boot Camp** | `/dashboard/workouts/bootcamp` | Not Checked | Bootcamp builder |
| **Equipment** | `/dashboard/workouts/equipment` | Broken | Shows 1 Location, 0 Equipment, 0 Pending. Stuck on "Loading profiles..." — API may be failing. |
| **Nutrition** | `/dashboard/workouts/nutrition` | Not Checked | Nutrition tab |
| **Scanner** | `/dashboard/workouts/scanner` | Not Checked | Equipment scanner |

### Critical UI Issues Found
1. **FAB still says "Deep Research (Ctrl+K)"** — needs rename to "AI Assistant"
2. **"Deep Research" tab name** — should be "Workout Intelligence" or "AI Planner"
3. **Duplicate tabs:** "Movement" AND "Movement Analysis" serve different purposes but naming is confusing
4. **Equipment tab broken** — "Loading profiles..." never resolves
5. **Plans "Next" button permanently disabled** — wizard can't advance
6. **Logger missing NASM sections** — no lengthening/corrective, balance/stability, or core sections

---

## 2. SEAN'S VISION (Comprehensive Requirements)

### 2A. Workout Logger — What It SHOULD Do
The workout logger is the trainer's primary tool during a live training session.

**Manual Entry Mode:**
- Exercise name (autocomplete from exercise library)
- Auto-timestamped date (with override option)
- Sets and reps per exercise
- Tempo notation (e.g., 4-2-1 eccentric-isometric-concentric)
- Weight used
- RPE (Rate of Perceived Exertion, 1-10)
- Form quality rating (1-5 stars)
- Rest period between sets

**NASM Protocol Sections (MANDATORY — not optional):**
- **Lengthening/Corrective Section:** Muscles identified as shortened from Movement Analysis and Body Map pain data. Prescribe static stretching, foam rolling, or corrective exercises per NASM CES guidelines.
- **Balance & Stability Section:** Proprioceptive exercises based on client's current OPT phase. Single-leg stance, BOSU work, stability ball exercises.
- **Core Section:** Core stabilization exercises appropriate to client's phase (stabilization → strength → power).

**AI-Assisted Entry Modes:**
- **Text Paste:** Trainer pastes raw workout text into AI chat → AI parses into structured log fields automatically
- **Voice Dictation:** Trainer speaks during live session ("Sean did bench press, 225 for 8 reps, felt easy, good form") → AI transcribes and fills log in real-time
- **Microphone icon** in the logger input area for one-tap voice recording

**Post-Workout Actions:**
- **Send Summary to Client:** Button that generates a formatted workout summary including:
  - All exercises performed with sets/reps/weight
  - Form observations and corrections noted
  - Homework: corrective exercises based on weaknesses observed
  - Stretching recommendations based on tight muscles identified
  - Next session focus areas
- Summary saved to client's record in a printable format
- Client can view in their dashboard, print to PDF, or print directly

### 2B. Workout Planner (Plans Tab) — Manual + AI Hybrid
The Plans tab is for **pre-session planning** — creating the workout BEFORE the training session.

**Data Sources for Plan Generation:**
- Client's workout history (all previous logged sessions)
- Client's goals (from onboarding/orientation)
- Movement Analysis results (postural findings, OHSA, squat compensations)
- Body Map pain entries (contraindicated movements, modified exercises)
- Equipment profile for the training location
- Client's current NASM OPT phase
- Session count remaining (intensity planning)

**Plan ↔ Logger Integration:**
- Planned workouts appear in the Logger on the scheduled date
- Logger auto-prefills from the day's planned workout
- Trainer can select which plan to follow or deviate
- Logger tracks plan adherence (planned vs actual)
- Deviations are logged and fed back to AI for future planning

**AI Workout Generation (currently "Deep Research" tab — should MERGE into Plans):**
- Single Workout mode: Generate one session based on all client data
- Long-Horizon mode: Generate multi-week periodized program
- The AI considers ALL data: movement analysis, body map, equipment, history, goals
- Draft → Review → Approve → Save workflow (WorkoutCopilotPanel)
- Pain check before generation (Body Map integration)

### 2C. Data Flow Architecture
```
Movement Analysis (7-step wizard)
  ↓ findings saved to MovementAnalysis model
Body Map (Pain & Injury Map)
  ↓ pain entries saved to PainEntry model
Equipment Profile (photos + location)
  ↓ available equipment saved to EquipmentProfile/EquipmentItem
Client History (previous workout logs)
  ↓ performance data from WorkoutSession/WorkoutLog

ALL FEED INTO ↓

AI Workout Generation (Planner)
  ↓ creates WorkoutPlan with days + exercises

PLAN FEEDS INTO ↓

Workout Logger (live session)
  ↓ pre-filled from plan, trainer adjusts
  ↓ logs actual performance

LOGGED DATA FEEDS INTO ↓

Client Dashboard (Victory Charts)
  ↓ progress visualization
  ↓ strength curves, volume trends, body composition

AND BACK TO ↓

AI Planner (next workout considers all history)
```

---

## 3. COMPETITOR ANALYSIS — GAPS WE FILL

### What Competitors Do Well
| Feature | Best-in-Class | How They Do It |
|---------|---------------|----------------|
| AI Workout Generation | Trainerize | Conversational AI prompt, coach describes in natural language |
| Recovery-Aware Programming | Fitbod | Tracks muscle "freshness," auto-adjusts volume/intensity |
| Exercise Video Library | TrueCoach (3,500+), My PT Hub (8,000+) | Pre-loaded HD demonstration videos |
| Voice Coaching | Apple Workout Buddy (watchOS 26) | Real-time AI voice during workouts |
| Form Analysis | Gymscore | Computer vision from uploaded videos |
| Gamification | Workout Quest | Full RPG: XP, levels, quests, guilds |
| Muscle Heatmap | Hevy | Bird's-eye muscle group activity visualization |
| Client Homework | TrueCoach | Habit assignments (daily/weekly/monthly) |
| Custom Branded App | Exercise.com | White-label iOS/Android apps |

### Gaps NO Competitor Fills (Our 7-Star Advantages)
1. **Voice-input workout logging** — "225 for 8, felt easy" → structured data. NO major app does this.
2. **NASM OPT Model as native programming engine** — Only NASM EDGE app (separate, not integrated into trainer platforms)
3. **Assessment → Corrective → Programming pipeline** in ONE platform (currently requires 3 separate apps)
4. **Equipment-aware + Assessment-aware + Progressive overload** (all three combined — Fitbod gets 2/3)
5. **RPG-grade gamification in a trainer platform** — We already have 600+ achievement badges, XP, levels
6. **Body Map → AI Workout Constraints** — Pain entries auto-modify workout generation (no competitor does this)
7. **Real-time voice dictation during live training** — Trainer speaks, log fills itself
8. **Structured homework with corrective exercise prescriptions** — Based on NASM CES, sent to client dashboard

---

## 4. COMPLETE FEATURE SPECIFICATION

### 4A. Tab Restructuring
**MERGE/RENAME these tabs:**
| Current | New Name | Purpose |
|---------|----------|---------|
| Plans | **Workout Planner** | Manual + AI workout plan creation |
| Logger | **Session Logger** | Live workout logging during training |
| Deep Research | *(MERGE into Planner)* | AI generation becomes a mode within Planner |
| Movement | **Assessments** | List/search/filter all movement assessments |
| Movement Analysis | **Form Analysis** | Video/photo upload for exercise form checking |
| Body Map | **Body Map** | Keep as-is (excellent) |
| Boot Camp | **Boot Camp** | Keep as-is |
| Equipment | **Equipment** | Fix loading bug, keep functionality |
| Nutrition | **Nutrition** | Keep as-is |
| Scanner | **Equipment Scanner** | Keep as-is |

**Final tab order (8 tabs, down from 10):**
`Workout Planner` | `Session Logger` | `Assessments` | `Form Analysis` | `Body Map` | `Equipment` | `Boot Camp` | `Nutrition`

### 4B. Workout Planner (Merged Plans + AI Generation)

**Two Modes (toggle buttons at top):**
1. **Manual Builder** — Current 4-step wizard (fix "Next" button)
2. **AI Generator** — Current WorkoutCopilotPanel (Single Workout / Long-Horizon)

**AI Generator Data Pipeline:**
```
When "Generate Workout" is clicked:
1. Fetch client's MovementAnalysis (latest completed)
2. Fetch client's PainEntry records from Body Map
3. Fetch selected EquipmentProfile items
4. Fetch client's WorkoutSession history (last 30 days)
5. Fetch client's goals from User profile / orientation
6. Determine client's current NASM OPT phase
7. Pass ALL to AI with NASM + Squat University constraints
8. AI returns structured plan → Draft Review → Approve → Save
```

**Plan Output Structure:**
```typescript
interface GeneratedPlan {
  title: string;
  goal: string;
  optPhase: 'stabilization' | 'strength_endurance' | 'hypertrophy' | 'maximal_strength' | 'power';
  durationWeeks: number;
  days: {
    dayNumber: number;
    name: string; // e.g., "Upper Body Push"
    focus: string;
    warmup: {
      foamRolling: Exercise[]; // From Body Map tight areas
      staticStretching: Exercise[]; // From Movement Analysis shortened muscles
      dynamicWarmup: Exercise[];
    };
    workout: {
      exercises: {
        exercise: Exercise;
        sets: number;
        reps: string; // "8-12" or "12-15"
        tempo: string; // "4-2-1"
        rest: number; // seconds
        intensity: string; // "70% 1RM" or "RPE 7"
        notes: string; // form cues, modifications
        supersetGroup?: number;
        isOptional: boolean;
        alternateExercise?: Exercise; // if equipment unavailable
      }[];
    };
    balance: Exercise[]; // NASM balance exercises
    core: Exercise[]; // NASM core exercises for current phase
    cooldown: {
      staticStretching: Exercise[]; // targeted to worked muscles
      breathwork: string; // optional
    };
  }[];
  homework: {
    correctiveExercises: Exercise[]; // from assessment findings
    stretching: { muscle: string; exercise: string; duration: string }[];
    focusAreas: string[];
  };
}
```

### 4C. Session Logger (Enhanced)

**Layout — 5 Sections (scrollable, collapsible):**

**Section 1: Session Header**
- Client name + avatar
- Auto-date (overridable)
- Session timer (start/pause/resume)
- Sessions remaining counter
- Equipment location selector
- "Load Today's Plan" button (fetches planned workout for this date)

**Section 2: Warmup & Corrective (Pre-filled from AI/Assessment)**
- Foam rolling targets (from Body Map tight areas)
- Static stretching (from Movement Analysis shortened muscles)
- Dynamic warmup exercises
- Each item has a checkbox (completed/skipped)

**Section 3: Main Workout**
- Exercise rows with: name, sets × reps, weight, tempo, RPE, form rating, rest, notes
- "Add Exercise" button with search/autocomplete
- If loaded from plan: shows planned vs actual side-by-side
- Superset grouping (visual bracket)
- Drag-and-drop reorder

**Section 4: Balance, Core & Cooldown**
- Balance exercises (from NASM OPT phase)
- Core exercises (stabilization → strength → power)
- Cooldown stretching (targeted to worked muscles)
- Each item has completion checkbox

**Section 5: Session Summary & Client Communication**
- Overall intensity rating (1-10)
- Energy level (1-10)
- Session notes (trainer observations)
- Form issues noted (auto-populated from form ratings < 3)
- **"Generate & Send Summary" button:**
  - Creates formatted summary with all workout data
  - Adds homework section (corrective exercises, stretching)
  - Saves to client's record
  - Optionally sends notification to client
  - Client views in their dashboard with PDF export

**AI Input Modes (in the AI Terminal panel):**
- Text input: Paste workout description → AI parses to structured fields
- Voice input: Microphone button → real-time transcription → AI fills fields
- Context: AI sees the current exercise list, equipment profile, client pain data

### 4D. Client Dashboard — Victory Charts for Workout Data

**Charts to Wire to Real Workout Data:**

| Chart | Data Source | Priority |
|-------|-----------|----------|
| **Strength Progression** (Line) | WorkoutLog weight over time per exercise | P0 |
| **Volume Trend** (Area) | Total volume (sets × reps × weight) per session | P0 |
| **Training Frequency** (Heatmap Calendar) | WorkoutSession dates | P0 |
| **Muscle Group Activity** (Radar) | Exercises → primaryMuscles mapping | P1 |
| **Session Duration** (Line) | WorkoutSession duration | P1 |
| **Body Map Heatmap** | PainEntry severity over time | P1 |
| **Plan Adherence** (Gauge) | Planned exercises completed / total | P1 |
| **Exercise Distribution** (Pie) | Exercise category breakdown | P2 |
| **RPE Trend** (Line) | Average RPE per session over time | P2 |
| **Form Quality Trend** (Line) | Average form rating over time | P2 |
| **1RM Estimates** (Bar) | Calculated from logged weight × reps | P2 |
| **NASM Phase Progression** (Timeline) | OPT phase changes over time | P2 |

**Key Requirements:**
- Charts must show ALL workout history — never truncated or cut off
- Client, trainer, and admin can all view relevant charts
- Drill-down: click a data point to see the specific workout session
- Time range selector: Last 30 days, 90 days, 6 months, 1 year, All Time
- Export to PDF for client records

### 4E. Backend API Gaps to Fill

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /api/workout-summaries` | Generate workout summary (async, returns jobId) | **NEW** |
| `GET /api/workout-summaries/:id` | Retrieve completed summary | **NEW** |
| `POST /api/workout-forms/:id/send-summary` | Send summary notification to client | **NEW** |
| `GET /api/workout/plans/client/:id/today` | Get planned workout for today's date | **NEW** |
| `GET /api/workout/statistics/:userId/charts` | Aggregate chart data for Victory charts | **ENHANCE** |
| `POST /api/workout-logs/voice-transcribe` | Real-time voice → structured workout data | **NEW** |
| `GET /api/equipment/profiles/:id/items` | Fix equipment loading (currently broken) | **FIX** |
| `GET /api/pain-entries/client/:id/active` | Get active pain entries for AI constraints | **VERIFY** |
| `GET /api/movement-analysis/client/:id/latest` | Get latest assessment for AI constraints | **VERIFY** |

---

## 5. IMPLEMENTATION PRIORITY

### Phase 1: Fix What's Broken (P0)
1. Fix Equipment tab "Loading profiles..." bug
2. Fix Plans wizard "Next" button disabled state
3. Rename "Deep Research" → "AI Assistant" everywhere (FAB, tab labels, headers)
4. Merge "Deep Research" tab into Plans as "AI Generator" mode
5. Rename "Movement" → "Assessments", "Movement Analysis" → "Form Analysis"
6. Remove duplicate tabs (10 → 8)

### Phase 2: Logger Enhancement (P0)
1. Add NASM sections to Logger (Warmup/Corrective, Balance/Core, Cooldown)
2. Add tempo field to exercise entry
3. Add "Load Today's Plan" button with auto-prefill
4. Add "Generate & Send Summary" post-workout flow
5. Wire voice dictation to AI transcription endpoint

### Phase 3: AI Data Pipeline (P1)
1. Wire MovementAnalysis → AI Planner (fetch latest assessment)
2. Wire Body Map PainEntry → AI Planner (fetch active pain constraints)
3. Wire EquipmentProfile → AI Planner (fetch available equipment)
4. Wire workout history → AI Planner (fetch last 30 days of sessions)
5. Build preflight data aggregation endpoint

### Phase 4: Victory Charts (P1)
1. Create `/api/workout/statistics/:userId/charts` aggregate endpoint
2. Wire Strength Progression, Volume Trend, Training Frequency charts to real data
3. Add time range selector and drill-down
4. Ensure full history display (never truncated)

### Phase 5: Client Experience (P2)
1. Client dashboard: display workout summaries received from trainer
2. PDF export for workout summaries
3. Client-facing Victory charts wired to their workout data
4. Homework section with corrective exercises

---

## 6. NASM PROTOCOL INTEGRATION DETAILS

### OPT Model Phases (Drive Exercise Selection)
| Phase | Focus | Sets × Reps | Tempo | Rest | Intensity |
|-------|-------|-------------|-------|------|-----------|
| 1: Stabilization Endurance | Proprioception, core stability | 1-3 × 12-20 | 4-2-1 | 0-90s | Low |
| 2: Strength Endurance | Superset stability + strength | 2-4 × 8-12 | 2-0-2 | 0-60s | Moderate |
| 3: Hypertrophy | Muscle growth | 3-5 × 6-12 | 2-0-2 | 0-60s | 75-85% 1RM |
| 4: Maximal Strength | Peak force production | 4-6 × 1-5 | X-X-X | 3-5min | 85-100% 1RM |
| 5: Power | Speed + force | 3-5 × 1-5 | X-X-X | 3-5min | 30-45% or 85-100% |

### Corrective Exercise Protocol (From Assessment Findings)
```
IF postural finding = "forward head posture":
  → Inhibit: Upper trapezius, levator scapulae (foam roll)
  → Lengthen: Upper trapezius, levator scapulae, SCM (static stretch)
  → Activate: Deep cervical flexors (chin tucks)
  → Integrate: Ball combo 1 (squat to row)

IF squat compensation = "knees valgus":
  → Inhibit: Adductors, TFL/IT band (foam roll)
  → Lengthen: Adductors, TFL (static stretch)
  → Activate: Gluteus medius (side-lying leg raise, tube walking)
  → Integrate: Single-leg balance reach
```

### Squat University Protocol (Supplementary)
- Ankle dorsiflexion test → mobility drills if restricted
- Hip mobility assessment → 90/90 stretching, pigeon stretch
- Thoracic spine mobility → foam roller extensions, wall slides
- Bracing assessment → proper breathing cues, anti-extension exercises

---

## 7. DESIGN SPECIFICATIONS (Crystalline Swan)

All new UI follows the Crystalline Swan design system:
- **Backgrounds:** Midnight Sapphire `#002060`, Royal Depth `#003080`
- **Text:** Frost White `#E0ECF4`
- **Interactive:** Ice Wing `#60C0F0` glow on purple buttons, Wing Purple `#8B5CF6` glow on blue buttons
- **Warning/Caution:** Gilded Fern `#C6A84B`
- **Touch targets:** 44px minimum
- **Typography:** Plus Jakarta Sans (headings), Fira Code (data/metrics)
- **Glass surfaces:** `backdrop-filter: blur(12px)` with controlled opacity
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` everywhere

---

## 8. AI VILLAGE 11-BRAIN CONSENSUS AMENDMENTS (2026-03-17)

> **Source:** 11-Brain validation with Phase 2 (Code Quality: Gemini CTO ↔ Claude CEO, 4 rounds) and Phase 3 (UX/UI Design: Gemini Creative Dir ↔ Claude Collaborator, 4 rounds). All 9 Phase 1 validators passed.

### 8A. Data Model Corrections (CRITICAL — from Phase 2 Debate)

**FINDING 1: Separate planned reps from actual logged reps.**
The `reps: string` ("8-12") in `GeneratedPlan` makes `sets × reps × weight` impossible for Victory charts (NaN).

```typescript
// REVISED: Planner uses ranges, Logger uses integers
interface PlannedExercise {
  exerciseId: string;        // FK to Exercise table (not embedded object)
  targetSetsMin: number;
  targetSetsMax: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeightGuidance?: string; // "Use 70% 1RM" or "Bodyweight"
  restSeconds: number;
  notes?: string;
}

interface LoggedSet {
  setNumber: number;
  actualReps: number;        // Integer — used for Volume calculation
  actualWeight: number;      // Integer — used for Volume calculation
  rpe?: number;
  completedAt: timestamp;
}
```

**FINDING 2: Use Foreign Keys, not embedded objects.**
Use `exerciseId` FK (UUID) instead of `exercise: Exercise`. Sequelize eager loading provides full objects at query time. Use `SET NULL` + soft delete pattern (CEO mandate over CTO's RESTRICT).

```typescript
// Exercise model MUST include soft delete fields:
{
  deletedAt: Date,
  deprecationReason: string,
  replacementExerciseId: string
}

// GeneratedPlan associations:
GeneratedPlan.belongsTo(Exercise, {
  foreignKey: { name: 'exerciseId', allowNull: true },
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
```

**FINDING 3: LLM context optimization — pass 3 sessions + equipment names.**
84% token cost reduction ($0.075 → $0.012 per generation).

```typescript
function prepareAIContext(clientId: string) {
  return {
    clientProfile: getClientBasics(clientId),
    recentProgress: getLastNSessions(clientId, 3), // NOT 30 days
    equipmentAvailable: getEquipmentNames(clientProfile.equipmentProfileId),
    // Returns: [{ name: "Barbell", category: "Free Weights" }, ...]
    constraints: getNASMRules(clientProfile.experienceLevel)
  };
}
```

**FINDING 5: Summary generation → POST (not GET), async with job queue.**
```
POST /api/workout-summaries          → Returns 202 { jobId, status: 'processing' }
GET  /api/jobs/:jobId                → Poll for completion
GET  /api/workout-summaries/:id      → Retrieve completed summary
```
Uses BullMQ + Redis. 60s timeout, 2 attempts, exponential backoff.

### 8B. Design Consensus (from Phase 3 Debate)

**Glassmorphism (WCAG AA compliant):**
```css
.section-card {
  background: rgba(0, 48, 128, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(96, 192, 240, 0.25);
  box-shadow: inset 0 1px 0 0 rgba(224, 236, 244, 0.1);
  border-radius: 16px;
}
```
Measured contrast: 4.7:1 ✅

**AI Terminal Typography:**
```css
.ai-terminal-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: #E0ECF4;
  text-transform: uppercase;
  text-shadow: 0 2px 10px rgba(96, 192, 240, 0.3);
}
```

**Voice FAB (GPU-accelerated + circuit breaker):**
- 56px button, Royal Depth idle → Wing Purple listening
- Infinite `transform`+`opacity` animation (NO box-shadow animation)
- `prefers-reduced-motion` → static glow fallback
- Low-end device circuit breaker: 10s animation → static after on devices with <4 cores/<4GB RAM
- `isolation: isolate` on parent to fix z-index stacking

**Cormorant Garamond:** Marketing pages + H1 Welcome ONLY. Never in recurring UI.

**Victory Charts on mobile (<768px):** 4px stroke, 44px invisible hit areas on data points, tooltip repositioned above finger.

### 8C. Architecture Recommendations (from Phase 1 Validators)

**Shared Components (DRY):**
- `ExerciseEntryForm` shared between Planner and Logger with `mode: 'plan' | 'log'` prop
- `correctiveProtocol.ts` shared NASM CES logic used by AI backend, Logger warmup, and homework generation

**Error Handling (AI Generation Pipeline):**
- Use `Promise.allSettled()` to fetch all 6 data sources
- Minimum required: client goals + OPT phase (others degrade gracefully)
- Show warning toast: "Generated workout with limited data. Missing: [sources]"

**Performance:**
- Session timer MUST be isolated (React.memo or useRef) — no re-renders of exercise list
- Lazy-load all tabs (code splitting per tab)
- Victory charts: `useMemo` on chart data, `React.memo` on chart components

**Security:**
- Auth middleware on ALL new endpoints (RBAC: trainer/admin only for generation)
- Input validation on voice transcription pipeline
- Rate limiting on AI generation endpoints (prevent cost abuse)

---

## 9. SUCCESS CRITERIA

- [ ] Trainer can create AI-generated workout plan using ALL client data (assessment, body map, equipment, history)
- [ ] Trainer can log a workout with NASM sections (warmup/corrective, main workout, balance/core, cooldown)
- [ ] Trainer can voice-dictate during live session and AI fills the log
- [ ] Trainer can send formatted workout summary to client with one click
- [ ] Client receives summary with homework (corrective exercises, stretching)
- [ ] Client can view workout history charts (never truncated) and export to PDF
- [ ] Logger auto-prefills from today's planned workout
- [ ] Plan adherence is tracked (planned vs actual)
- [ ] All data flows bidirectionally: assessment ↔ planner ↔ logger ↔ charts
- [ ] Equipment tab loads and shows actual equipment profiles
- [ ] Zero "Deep Research" branding anywhere in the UI
- [ ] All 8 tabs functional with no broken states
