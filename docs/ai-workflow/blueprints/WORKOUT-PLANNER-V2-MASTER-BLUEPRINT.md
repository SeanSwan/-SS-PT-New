# WORKOUT PLANNER V2 — Master Blueprint

## Overview
Complete rework of the NASM Workout Planner page with 3D Rolodex exercise picker, advanced workout builder (supersets, pyramids, circuits), plan persistence, multi-dashboard visibility, and Swan Coach AI integration.

**883 exercises** (653 SwanStudios + 230 NASM) — all local database, no external API.

---

## Architecture — 5 Major Systems

### System 1: 3D Exercise Rolodex (Mobile-First)

**Approach:** Custom Framer Motion + `@tanstack/react-virtual` for virtualization.

```
DESKTOP (≥1024px):
┌──────────────────────────────────────────────────────────────┐
│  [Search] [NASM | SwanStudios] [Body Part ▾] [Equipment ▾]  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    ╭─────────────╮                     │  │
│  │               ╭────│  Deadlift   │────╮                │  │
│  │          ╭────│    │  ★★★★☆     │    │────╮           │  │
│  │     ╭────│    │    │  Barbell    │    │    │────╮      │  │
│  │     │    │    │    │  [Add ➕]   │    │    │    │      │  │
│  │     ╰────│    │    ╰─────────────╯    │    │────╯      │  │
│  │          ╰────│                       │────╯           │  │
│  │               ╰───────────────────────╯                │  │
│  └────────────────────────────────────────────────────────┘  │
│  ◀ Swipe or scroll to browse ▶                              │
└──────────────────────────────────────────────────────────────┘

MOBILE (≤768px):
┌─────────────────────┐
│ [🔍 Search...]      │
│ [NASM] [SwanStudios] │
│ [Chest▾][Barbell▾]  │
│ ┌─────────────────┐ │
│ │   ╭───────────╮  │ │
│ │   │  Squat    │  │ │
│ │   │  ★★★★☆   │  │ │
│ │   │  Barbell  │  │ │
│ │   │  [+ Add]  │  │ │
│ │   ╰───────────╯  │ │
│ │  ╭─────╮  ╭─────╮│ │
│ │  │prev │  │next ││ │
│ │  ╰─────╯  ╰─────╯│ │
│ └─────────────────┘ │
│ Swipe ↕ to scroll   │
└─────────────────────┘
```

**3D Transform Math:**
```typescript
// Each visible item gets rotateX based on distance from center
const DEGREES_PER_ITEM = 25; // Spacing between cards on the cylinder
const RADIUS = 300; // px - cylinder radius

function getItemTransform(index: number, centerIndex: number) {
  const angle = (index - centerIndex) * DEGREES_PER_ITEM;
  const absAngle = Math.abs(angle);
  return {
    transform: `perspective(800px) rotateX(${angle}deg) translateZ(${RADIUS}px)`,
    opacity: Math.max(0.15, 1 - absAngle / 90),
    scale: Math.max(0.7, 1 - absAngle / 180),
    zIndex: 100 - Math.floor(absAngle),
  };
}
```

**Exercise Card (centered item shows full detail):**
```
┌─────────────────────────────────────┐
│ 🎯 Cable Bicep Curl                │
│ ┌─────────┐  Type: Isolation       │
│ │ 🎬      │  Muscles: Biceps       │
│ │ thumb   │  Equipment: Cable      │
│ │ nail    │  Difficulty: ★★★☆☆     │
│ └─────────┘  Impact: Low           │
│                                     │
│  [+ Add to Workout]  [📖 Learn]    │
└─────────────────────────────────────┘
```

**Technical Requirements:**
- `@tanstack/react-virtual` for windowed rendering (only ~7-11 items in DOM)
- Framer Motion `useSpring` for momentum/snap physics
- Touch: `onPanStart/onPan/onPanEnd` with velocity-based inertia
- Snap-to-nearest on release (spring to closest card center)
- Filter chips reduce pool BEFORE rolodex renders (never render 883 raw)
- `@media (prefers-reduced-motion: reduce)` → flat scrollable list fallback
- ARIA: `role="listbox"`, `aria-activedescendant`, keyboard Up/Down/Enter

---

### System 2: Advanced Workout Builder

**Exercise Grouping Types:**

| Type | Description | UI Pattern | Rest Behavior |
|------|-------------|------------|---------------|
| **Standard** | Single exercise, standard sets | Default row | Normal rest between sets |
| **Superset** | 2 exercises, alternating sets | Bracket connector `⎡⎣` | No rest between pair, rest after both |
| **Tri-set** | 3 exercises, rotating sets | Triple bracket `⎡⎢⎣` | No rest between trio, rest after all 3 |
| **Giant Set** | 4+ exercises, continuous | Extended bracket | No rest until full cycle complete |
| **Circuit** | N exercises, continuous loop | Circular connector `↻` | Rest only after full circuit lap |
| **Pyramid** | Same exercise, ascending/descending weight+reps | Pyramid icon `△` | Standard rest, weight changes per set |
| **Drop Set** | Same exercise, decreasing weight, no rest | Drop icon `▼` | No rest, strip weight immediately |
| **Rest-Pause** | Same exercise, brief pause, continue | Pause icon `⏸` | 10-15s micro-rest between clusters |

```
WORKOUT BUILDER WIREFRAME:
┌──────────────────────────────────────────────────────┐
│ Phase 2: Strength Endurance  │  Client: Anand Kumar  │
│ 4 sets × 8-12 reps  │  Tempo: 2/0/2  │  Rest: 60s   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  WARMUP (auto-generated)                             │
│  ┌──────────────────────────────────────────────┐   │
│  │ 1. Foam Roll Upper Back      2 min           │   │
│  │ 2. Band Pull-Apart           2×15            │   │
│  │ 3. Cat-Cow Stretch           1 min           │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  MAIN WORKOUT                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │ ⎡ A1. Barbell Bench Press   4×10  80% △      │   │
│  │ ⎣ A2. Bent-Over Row         4×10  75%        │   │
│  │    ↕ [Drag to reorder]       ⟳ Superset      │   │
│  ├──────────────────────────────────────────────┤   │
│  │ B1. Dumbbell Shoulder Press  4×12  70%       │   │
│  ├──────────────────────────────────────────────┤   │
│  │ ⎡ C1. Tricep Pushdown       3×12  65% ▼     │   │
│  │ ⎢ C2. Hammer Curl           3×12  65%        │   │
│  │ ⎣ C3. Lateral Raise         3×15  60%        │   │
│  │    ↕ [Drag to reorder]       ⟳ Tri-set       │   │
│  ├──────────────────────────────────────────────┤   │
│  │ D1. Plank Hold              3×45s            │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  COOLDOWN (auto-generated)                           │
│  ┌──────────────────────────────────────────────┐   │
│  │ 1. Standing Quad Stretch     30s/side        │   │
│  │ 2. Chest Doorway Stretch     30s             │   │
│  │ 3. Cat-Cow Stretch           1 min           │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  [💾 Save Plan]  [🤖 AI Optimize]  [📤 Assign]     │
└──────────────────────────────────────────────────────┘
```

**Superset/Circuit Creation UX:**
1. User adds exercises normally (they appear as Standard)
2. User long-press/right-click an exercise → context menu appears
3. Options: "Create Superset With Next", "Create Circuit (select exercises)", "Make Pyramid", "Make Drop Set"
4. Selected exercises get visually grouped with bracket connector
5. Drag handle allows reordering within and between groups
6. Group type chip shows on the bracket: `⟳ Superset`, `↻ Circuit`, `△ Pyramid`, `▼ Drop`

**Pyramid Set Schema:**
```typescript
interface PyramidSet {
  setNumber: number;
  reps: number;        // e.g., 12, 10, 8, 6, 8, 10, 12
  weight: number;      // ascending then descending
  percentOneRM: number; // auto-calculated
  restSeconds: number;
}

// Example ascending pyramid:
// Set 1: 12 reps @ 65% 1RM
// Set 2: 10 reps @ 70% 1RM
// Set 3: 8 reps @ 75% 1RM
// Set 4: 6 reps @ 80% 1RM
```

---

### System 3: Plan Persistence & Dashboard Integration

**Data Flow:**
```
Trainer creates plan in Workout Builder
  → POST /api/workout-plans (saves to workout_plans table)
  → Plan appears in:
    ├── Admin Dashboard → Client Management → [Client Name] → Workout Plans tab
    ├── Trainer Dashboard → My Clients → [Client Name] → Active Plan
    └── Client Dashboard → "Today's Workout" card + "My Plans" section

Client completes workout
  → PUT /api/workout-plans/:id/advance (marks session done, moves cursor)
  → Gamification engine awards points
  → Progress charts update
  → Trainer sees completion notification
```

**Enhanced WorkoutPlan Schema (additions):**
```sql
ALTER TABLE "workout_plans" ADD COLUMN IF NOT EXISTS "exerciseGroups" JSONB DEFAULT '[]';
-- Stores superset/circuit/pyramid grouping metadata
-- [{ groupId: 'A', type: 'superset', exerciseIds: ['uuid1', 'uuid2'] }]

ALTER TABLE "workout_plans" ADD COLUMN IF NOT EXISTS "warmupTemplate" JSONB DEFAULT '[]';
ALTER TABLE "workout_plans" ADD COLUMN IF NOT EXISTS "cooldownTemplate" JSONB DEFAULT '[]';
```

**Dashboard Visibility Matrix:**

| Dashboard | What They See | Actions |
|-----------|--------------|---------|
| Admin | ALL plans, ALL clients, ALL trainers | Create, Edit, Delete, Reassign |
| Trainer | Plans they created + assigned clients | Create, Edit, Mark Complete |
| Client | Their active plan + history | View, Log Workout, Mark Session Done |

---

### System 4: Swan Coach AI Integration

**AI Commands (additions to workoutCommands.mjs):**

| Command | Description | Trigger |
|---------|-------------|---------|
| `find_workout_plan` | Find saved plans for a client | "Show me Anand's workout plan" |
| `modify_workout_plan` | Adjust sets/reps/exercises in existing plan | "Make the bench press 5x5 instead" |
| `explain_exercise_group` | Explain why exercises are grouped | "Why is bench paired with rows?" |
| `suggest_superset_pair` | AI suggests complementary exercise | "What should I superset with squats?" |
| `create_pyramid_scheme` | Generate pyramid set/rep/weight progression | "Create a pyramid for deadlifts" |
| `auto_warmup` | Generate NASM CES warmup for selected exercises | "Generate warmup for this push day" |

**AI Context Enhancement:**
When on the Workout Planner page, the AI Terminal automatically receives:
- Current client's injury/pain history
- Selected NASM phase + parameters
- Current exercises in the builder
- Client's workout history (last 4 weeks)
- Available equipment profile

---

### System 5: Video Library Integration

**Exercise → Video Link:**
Each exercise card in the rolodex shows a thumbnail. Tapping it navigates to the video library.

```
Exercise Card:
┌─────────────────────────┐
│ ┌─────────┐             │
│ │ 🎬      │  Deadlift   │
│ │ YouTube │  ★★★★☆      │
│ │ thumb   │  Barbell     │
│ └────▶────┘  [+ Add]    │
└─────────────────────────┘
       │
       ▼ (tap thumbnail)
┌─────────────────────────┐
│ VIDEO LIBRARY PAGE      │
│ ┌─────────────────────┐ │
│ │ ▶ Sean's Deadlift   │ │
│ │   Tutorial Video    │ │
│ └─────────────────────┘ │
│ YouTube embed or        │
│ member-only R2 video    │
└─────────────────────────┘
```

**Database fields (already exist):**
- `videoUrl` — YouTube link or R2 URL
- `thumbnailUrl` — Video thumbnail image
- `imageUrl` — Exercise illustration fallback

---

## Responsive Breakpoint Matrix

| Breakpoint | Layout | Rolodex | Builder |
|------------|--------|---------|---------|
| 320px | Single column, stacked | Vertical 3D wheel, full width | Full width below rolodex |
| 375px | Single column | Vertical 3D wheel | Full width |
| 430px | Single column | Vertical 3D wheel, larger cards | Full width |
| 768px | Two column | Rolodex left (40%) | Builder right (60%) |
| 1024px | Two column | Rolodex left (35%) | Builder right (65%) |
| 1280px | Three column | Rolodex left | Builder center | Teach right |
| 1440px | Three column, wider | More card detail visible | Wider builder |
| 1920px | Three column, spacious | 3D depth enhanced | Full parameter controls |
| 2560px | Ultra-wide optimized | Panoramic rolodex | Expanded builder |
| 3840px | 4K cinematic | Maximum 3D depth | Full dashboard mode |

**Mobile-First Priority:**
- Filters collapse into dropdown selectors on ≤430px
- 3D rolodex uses vertical scroll on mobile, horizontal on desktop
- Workout builder uses accordion pattern on mobile (one exercise expanded at a time)
- Superset brackets simplify to colored left-border on mobile
- Drag-to-reorder uses long-press on mobile (touch-action: none)

---

## Component Decomposition (No-Monolith Rule: ≤300 lines each)

```
admin-workout-planner/
├── WorkoutPlannerPage.tsx          (orchestrator, ≤200 lines)
├── WorkoutPlannerStyles.ts         (all styled-components)
├── WorkoutPlannerTypes.ts          (interfaces)
├── WorkoutPlannerConstants.ts      (filter arrays, phase configs)
├── components/
│   ├── ExerciseRolodex3D.tsx       (3D wheel component)
│   ├── ExerciseCard3D.tsx          (individual card in rolodex)
│   ├── ExerciseFilters.tsx         (filter chips + search)
│   ├── WorkoutBuilder.tsx          (main builder panel)
│   ├── ExerciseRow.tsx             (single exercise in builder)
│   ├── ExerciseGroupBracket.tsx    (superset/circuit visual connector)
│   ├── PyramidSetEditor.tsx        (pyramid set/rep/weight table)
│   ├── WarmupCooldown.tsx          (auto-generated warmup/cooldown)
│   ├── PlanSaveModal.tsx           (save/name/assign plan)
│   ├── SavedPlansDrawer.tsx        (list of saved plans per client)
│   └── TeachModeSidebar.tsx        (existing, enhanced)
├── hooks/
│   ├── useRolodexPhysics.ts        (3D scroll + snap logic)
│   ├── useWorkoutBuilder.ts        (exercise add/remove/reorder/group)
│   ├── usePlanPersistence.ts       (save/load/assign plans)
│   └── useExerciseGroups.ts        (superset/circuit/pyramid state)
└── utils/
    ├── pyramidCalculator.ts        (generate pyramid progressions)
    ├── warmupGenerator.ts          (NASM CES warmup templates)
    └── exerciseGrouping.ts         (grouping logic + validation)
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create component file structure (decompose monolith)
- [ ] Build ExerciseRolodex3D with Framer Motion + virtualization
- [ ] Exercise card design with thumbnail placeholder
- [ ] Filter integration (body part, equipment, source, type, impact)
- [ ] Mobile vertical scroll + desktop horizontal
- [ ] Reduced motion fallback

### Phase 2: Workout Builder (Week 2)
- [ ] Rebuild WorkoutBuilder with drag-and-drop (dnd-kit)
- [ ] Implement superset/tri-set/giant-set grouping UI
- [ ] Implement circuit grouping with circular connector
- [ ] Implement pyramid set editor
- [ ] Implement drop set + rest-pause types
- [ ] Auto-warmup/cooldown generation
- [ ] NASM phase parameter integration

### Phase 3: Persistence & Dashboards (Week 3)
- [ ] Enhanced plan save with grouping metadata
- [ ] Client dashboard "Today's Workout" card
- [ ] Trainer dashboard client workout overview
- [ ] Admin dashboard plan management
- [ ] Plan history + archive
- [ ] Session advance + gamification trigger

### Phase 4: AI Integration (Week 4)
- [ ] New AI commands for plan retrieval/modification
- [ ] AI context enhancement (current builder state)
- [ ] Superset suggestion engine
- [ ] Pyramid auto-generation
- [ ] Smart warmup/cooldown based on selected exercises

### Phase 5: Video Library Link (Week 4-5)
- [ ] Video thumbnail on exercise cards
- [ ] Click-through to video library page
- [ ] YouTube embed + member-only R2 video support
- [ ] Admin exercise video assignment UI

---

## Technology Stack

| Component | Library | Version | Purpose |
|-----------|---------|---------|---------|
| 3D Animations | `motion` (Framer Motion) | 11+ | Spring physics, 3D transforms |
| Virtualization | `@tanstack/react-virtual` | 3+ | Windowed rendering for 883 exercises |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` | 6+ | Exercise reordering + grouping |
| State | React `useState`/`useReducer` | 18 | Local component state |
| API | Existing `authAxios` | — | Backend communication |
| Styling | `styled-components` | 6+ | Crystalline Swan theme tokens |

---

## NASM Protocol Compliance

All workout generation MUST follow:
- Phase-appropriate sets/reps/tempo/rest (see OPT table in CLAUDE.md)
- Warmup follows NASM CES: Inhibit (foam roll) → Lengthen (stretch) → Activate (band work)
- Supersets pair agonist/antagonist muscles (e.g., bench + row)
- Circuits maintain muscle group rotation (no back-to-back same group)
- Pyramids use Brzycki formula for weight calculations
- Exercise difficulty matches client's current NASM phase

---

## Success Metrics

- [ ] 883 exercises browsable in 3D rolodex with <16ms frame time
- [ ] Superset/circuit/pyramid creation in ≤3 taps
- [ ] Plans save and load correctly across all 3 dashboards
- [ ] AI can retrieve and describe any saved plan
- [ ] Mobile usable at 320px with touch gestures
- [ ] 4K displays use full screen real estate
- [ ] Reduced motion users get full functionality via flat list
