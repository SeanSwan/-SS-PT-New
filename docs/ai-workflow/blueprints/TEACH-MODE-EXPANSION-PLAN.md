# TEACH MODE EXPANSION PLAN — Deep Exercise Intelligence + Multi-Tab Educational System

## Executive Summary
Expand the existing Teach Mode from a basic exercise metadata sidebar into a **comprehensive NASM educational platform** embedded across the 5 most critical dashboard tabs. The Workout Planner's Exercise Rolodex needs deep per-exercise instruction (form cues, step-by-step guides, safety, progressions, biomechanics). Then Teach Mode must be extended to Coach Assistant, Gamification, Client Management, and Scheduling with domain-specific educational content.

## Current State

### What Teach Mode Currently Shows (TeachModeSidebar.tsx)
1. **Wisdom Text** — Generic phase-context prose ("Bench Press targets Chest in Phase 2...")
2. **Exercise Data Card** — Name, type, body part, primary muscles, difficulty, exercise key
3. **OPT Phase Section** — Phase name, sets, reps, tempo, rest, intensity
4. **Phase Progression Buttons** — Toggle Ph 1-5 to see parameter changes
5. **Oracle Insights Widget** — YouTube/research videos (lazy-loaded)

### What's Available in Database But NOT Shown
- `instructions` (TEXT) — Step-by-step how-to guide
- `coachingCues` (JSON) — Form coaching tips array
- `safetyTips` — Safety considerations
- `contraindicationNotes` — When NOT to perform
- `secondaryMuscles` (JSON) — Secondary muscles targeted
- `force` — Push/pull/static classification
- `mechanic` — Compound vs isolation
- `nasmMovementPattern` — Squat, hinge, push, pull, press, rotation, gait
- `equipmentNeeded` (JSON) — Equipment details
- `progressionPath` (JSON) — Easier → harder exercise chain
- `prerequisites` — Required exercises before this one
- `videoUrl`, `imageUrl`, `thumbnailUrl` — Visual references
- `scientificReferences` — Evidence-based links
- `optPhases` (JSON) — Which OPT phases this exercise fits

### Existing Teach Mode Implementations (Reference Patterns)
1. **TeachModeSidebar.tsx** — Workout Planner exercise sidebar (metadata + phase info)
2. **NASMTeachMode.tsx** — Trainer Assessments (accordion-based, protocol-heavy teaching)

---

## PHASE 1: Deep Exercise Intelligence (Workout Planner Enhancement)

### Goal
Transform the Exercise Rolodex Teach Mode from showing basic metadata into a **comprehensive exercise encyclopedia** that teaches trainers everything about every exercise.

### New Teach Mode Tabs (3-Tab Layout)
Replace single-panel with tabbed interface:

#### Tab 1: "How To Perform" (NEW — Primary Focus)
```
┌────────────────────────────────────┐
│ 📋 Step-by-Step Instructions       │
├────────────────────────────────────┤
│ 1. Set up: Position bench at flat  │
│    angle. Grip bar shoulder-width.  │
│ 2. Unrack: Lift bar with straight  │
│    arms, position over mid-chest.  │
│ 3. Lower: Inhale, bend elbows to   │
│    90°. Bar touches mid-chest.      │
│ 4. Press: Exhale, drive bar up.     │
│    Lock elbows at top.              │
│ 5. Repeat for prescribed reps.     │
├────────────────────────────────────┤
│ 🎯 Coaching Cues                   │
│ • "Drive your feet into the floor" │
│ • "Squeeze shoulder blades together"│
│ • "Bar path: slight J-curve"       │
│ • "Controlled eccentric, explosive │
│    concentric"                     │
├────────────────────────────────────┤
│ 🏋️ Muscles Worked                  │
│ Primary:   Pectoralis Major, Ant.  │
│            Deltoid, Triceps        │
│ Secondary: Serratus Anterior,      │
│            Core Stabilizers        │
├────────────────────────────────────┤
│ ⚡ Biomechanics                    │
│ Movement Pattern: Horizontal Push  │
│ Force Type:       Push             │
│ Mechanic:         Compound         │
│ Plane of Motion:  Sagittal/Trans.  │
├────────────────────────────────────┤
│ ⚠️ Safety & Contraindications      │
│ • Use spotter for heavy loads      │
│ • Avoid if acute shoulder injury   │
│ • Don't bounce bar off chest       │
│ • Maintain natural lumbar curve    │
├────────────────────────────────────┤
│ 🔧 Equipment Needed               │
│ • Flat Bench                       │
│ • Barbell (Olympic)                │
│ • Weight Plates                    │
│ • Safety Catches (recommended)     │
├────────────────────────────────────┤
│ 🏠 Can be performed at home: No    │
│ 📊 Difficulty: 450/900 (Intermed.) │
│ 🎮 XP Value: 15 points            │
└────────────────────────────────────┘
```

#### Tab 2: "Phase & Progression" (Enhanced Current)
```
┌────────────────────────────────────┐
│ ⚡ Current Phase: Phase 2          │
│   Strength Endurance               │
├────────────────────────────────────┤
│ Sets:      2-4                     │
│ Reps:      8-12                    │
│ Tempo:     2/0/2                   │
│ Rest:      0-60s                   │
│ Intensity: 70-80% 1RM             │
├────────────────────────────────────┤
│ [Ph 1] [Ph 2] [Ph 3] [Ph 4] [Ph 5]│
├────────────────────────────────────┤
│ 📈 Progression Path                │
│ ┌──────────────────────────────┐  │
│ │ Easier ← → Harder           │  │
│ │                              │  │
│ │ Push-Up (Knee)               │  │
│ │   ↓                          │  │
│ │ Push-Up (Standard)           │  │
│ │   ↓                          │  │
│ │ Dumbbell Bench Press         │  │
│ │   ↓                          │  │
│ │ ★ Barbell Bench Press ←YOU  │  │
│ │   ↓                          │  │
│ │ Incline Barbell Bench        │  │
│ │   ↓                          │  │
│ │ Weighted Dip                 │  │
│ └──────────────────────────────┘  │
├────────────────────────────────────┤
│ 🎯 Phase Compatibility            │
│ ✅ Phase 1  ✅ Phase 2  ✅ Phase 3│
│ ✅ Phase 4  ⚠️ Phase 5 (superset)│
├────────────────────────────────────┤
│ 📋 Prerequisites                  │
│ • Push-Up (Standard) — mastered   │
│ • Shoulder mobility adequate      │
├────────────────────────────────────┤
│ 🔄 Variations                     │
│ • Incline Bench (upper chest)     │
│ • Decline Bench (lower chest)     │
│ • Close-Grip (triceps emphasis)   │
│ • Pause Bench (strength focus)    │
└────────────────────────────────────┘
```

#### Tab 3: "Learn & Watch" (Enhanced Oracle)
```
┌────────────────────────────────────┐
│ 🎬 Video Demonstrations            │
│ [Exercise Video Player/Thumbnail] │
│ [YouTube Results from Oracle]     │
├────────────────────────────────────┤
│ 📚 Scientific References          │
│ • Schoenfeld (2016): "Muscle      │
│   activation during bench press   │
│   variations" — JSCR              │
│ • Saeterbakken (2011): "EMG       │
│   analysis of bench press grip    │
│   width" — JSCR                   │
├────────────────────────────────────┤
│ 💡 NASM Wisdom                     │
│ "The bench press is a fundamental │
│  horizontal push pattern. In      │
│  Phase 2, focus on controlled     │
│  tempo to build muscular          │
│  endurance alongside strength..." │
└────────────────────────────────────┘
```

### Data Requirements
- Surface ALL available Exercise model fields in Teach Mode
- For exercises missing `instructions`/`coachingCues` in DB, use AI-generated defaults from exercise name + type + muscles
- ExerciseSlim interface needs expansion to include new fields from API

### API Changes Needed
- Expand exercise GET endpoint to return full detail (instructions, cues, safety, progression, etc.)
- Or create a new `/api/exercises/:id/teach-mode` endpoint that returns the deep data
- Lazy-load the deep data only when Teach Mode is open AND exercise is selected

---

## PHASE 2: Coach Assistant Teach Mode

### What to Teach
The Coach Assistant is the most complex feature. Trainers need education on:

1. **Context Chip Guide** — Each context type (workout, client, schedule, nutrition, form) produces different AI behavior. Show examples of good prompts per context.
2. **Response Style Flowchart** — When to use balanced vs. detailed vs. brief
3. **Prompt Engineering 101** — How to ask better questions (be specific, provide context, ask for format)
4. **Voice & Attachment Features** — Setup guide, supported formats, tips
5. **Conversation Management** — Saving, searching, organizing conversations

### Implementation
- Toggle button (BookOpen icon) in header area next to context chips
- Sidebar panel with 5 collapsible accordion sections
- Inline tooltips on context chips and response style buttons
- "Example Prompts" section with copy-to-input buttons

---

## PHASE 3: Gamification Teach Mode

### What to Teach
1. **Achievement Design Fundamentals** — Types (milestone, skill, streak), difficulty scaling, psychology
2. **Point Economy Balance** — XP values, tier progression rates, avoiding inflation/deflation
3. **Reward Strategy** — Cosmetic vs functional vs VIP, budget allocation, ROI tracking
4. **Engagement Psychology** — Streaks, loss aversion, social proof, leaderboard effects
5. **Common Mistakes** — Too many impossible achievements, rewards that cost too much, no variety

### Implementation
- Teach Mode sidebar on Achievement Manager and Reward Manager tabs
- "Strategy Guide" accordion sections
- Case studies with examples

---

## PHASE 4: Client Management Teach Mode

### What to Teach
1. **Client Lifecycle** — Prospect → assessment → active → retention (intervention triggers)
2. **Assessment Interpretation** — What movement screen scores mean, corrective strategies
3. **Progress Chart Reading** — Trends vs noise, plateau detection, realistic timelines
4. **Churn Risk Signals** — Early warning indicators, intervention scripts
5. **Onboarding Best Practices** — Discovery questions, goal-setting, first session planning

### Implementation
- Toggle sidebar on Client Detail view
- Contextual tips that appear based on current client data
- "At-Risk" badge with tooltip explaining why

---

## PHASE 5: Scheduling Teach Mode

### What to Teach
1. **Optimal Frequency by Goal** — Weight loss (2-3x/wk), strength (3x/wk), general (1-2x/wk)
2. **Clustering Strategy** — First 4 weeks at higher frequency builds momentum
3. **No-Show Prevention** — Confirmation timing, reminder cadence
4. **Package Economics** — Bundle psychology, credit policies, upsell mechanics
5. **Trainer Schedule Optimization** — Back-to-back sessions, travel time, recovery blocks

### Implementation
- Guide sidebar on Schedule view
- "Booking Strategy" checklist when creating new sessions
- Frequency recommendations based on client's goals

---

## Questions for AI Village

1. **Exercise Data Gap Strategy:** Many of our 880+ exercises lack `instructions` and `coachingCues` in the database. Should we:
   a) Bulk-generate instructions via AI for all exercises and seed them into the DB?
   b) Generate on-the-fly when Teach Mode opens for an exercise?
   c) Hybrid: seed the top 200 most-used exercises, generate on-the-fly for the rest?

2. **Teach Mode Architecture:** Should Teach Mode be:
   a) A shared component library (`TeachModeProvider` + `TeachModePanel`) used across all tabs?
   b) Independent implementations per tab (like current TeachModeSidebar + NASMTeachMode)?
   c) A higher-order component that wraps dashboard tabs?

3. **Content Depth vs Performance:** The deep exercise data (instructions, cues, videos, progressions) is heavy. Should we:
   a) Lazy-load all teach data per exercise on selection?
   b) Pre-fetch for visible exercises in the Rolodex?
   c) Cache teach data in Redux/localStorage after first load?

4. **Teach Mode Persistence:** Should Teach Mode state (open/closed, active tab) persist:
   a) Per session only (resets on page reload)?
   b) In localStorage (persists across sessions)?
   c) In user preferences API (persists across devices)?

5. **Progressive Disclosure:** How should we handle the information density?
   a) All sections collapsed by default, user expands what they need?
   b) Smart defaults based on user role (new trainers see more, experienced see less)?
   c) "Beginner / Intermediate / Expert" difficulty toggle?

6. **Competitive Analysis:** Which competing platforms do teach mode well?
   - Strong app, JEFIT, Hevy, Trainerize, TrueCoach
   - What do they show per exercise?
   - What educational features do they offer for trainers?

7. **Mobile Experience:** On mobile (375px), Teach Mode can't be a sidebar. Should it be:
   a) Bottom sheet / drawer?
   b) Full-screen modal overlay?
   c) Separate "Learn" tab within the page?

8. **Gamification of Teaching:** Should we award XP to trainers for:
   a) Opening Teach Mode and spending time learning?
   b) Completing exercise knowledge quizzes?
   c) Both?

---

## Technical Constraints
- Max 300 lines per file (CLAUDE.md rule)
- All components must use CSS variables with dark-theme fallbacks
- 44px minimum touch targets
- Lazy-load heavy content (videos, images, scientific references)
- No new npm dependencies (use existing styled-components, lucide-react, react)
- Exercise API must not break existing Rolodex performance (lazy-load deep data separately)

## Success Metrics
- Trainer feature adoption rate increase (target: +40% Coach Assistant usage)
- Support ticket reduction (target: -30% in first month)
- Workout plan quality improvement (trainer feedback scores)
- Client retention rate improvement (churn reduction post-better-onboarding)
- Teach Mode engagement (% of trainers who open it, time spent)
