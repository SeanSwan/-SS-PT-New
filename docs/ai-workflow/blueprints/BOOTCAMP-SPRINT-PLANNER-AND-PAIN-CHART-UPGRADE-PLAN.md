# Bootcamp Sprint Planner + Pain Chart Upgrade + Bootcamp Calendar

## Overview
Three interconnected features that complete the Bootcamp Creator ecosystem:

1. **3-Month Sprint Planning System** — AI generates 3 months of unique bootcamp classes with exercise memory across sprints, ensuring progressive overload and zero staleness
2. **Pain Chart Upgrade** — Rebuild the existing body map with ultra-realistic anatomical imagery (AI-generated male/female bodies showing muscles + bones), full dashboard integration across client/trainer/admin views, and AI workout integration
3. **Bootcamp Calendar** — Day-by-day calendar view for tracking what bootcamp was done each day, with save/confirm workflow

---

## FEATURE 1: 3-Month Sprint Planning System

### Problem
Currently, bootcamp classes are generated one at a time with only a 14-day freshness window. There's no way to:
- Plan an entire quarter's worth of classes in advance
- Track which exercises were used across an entire sprint
- Ensure systematic progression over weeks
- Generate the NEXT 3 months knowing exactly what the previous 3 months contained
- Prevent adaptation by cycling exercise selection intelligently

### Proposed Architecture

#### New Database Models

**BootcampSprint** — Container for a 3-month (or configurable) planning cycle
```
id, trainerId, name, startDate, endDate, durationWeeks (default 12)
classesPerWeek (e.g., 3 for MWF, 5 for weekdays)
frequencyPattern: JSON array of days ['monday', 'wednesday', 'friday']
focusRotation: JSON array of dayTypes per week ['lower_body', 'upper_body', 'cardio']
defaultFormat: ClassFormat
defaultStyle: ClassStyle
status: 'draft' | 'generating' | 'active' | 'completed' | 'archived'
spaceProfileId: FK (default space for all classes)
exerciseMemory: JSONB — master set of ALL exercise keys used in this sprint
totalClassesPlanned, totalClassesCompleted
progressionStrategy: 'linear' | 'undulating' | 'block' | 'random'
notes: TEXT
metadata: JSONB
```

**SprintWeek** — One week within a sprint
```
id, sprintId (FK), weekNumber (1-12)
theme: STRING (e.g., "Strength Focus", "Conditioning Week", "Deload")
startDate, endDate
isDeloadWeek: BOOLEAN
intensityModifier: FLOAT (0.7 for deload, 1.0 normal, 1.1 push week)
notes: TEXT
```

**SprintClassSlot** — A scheduled class within a week
```
id, weekId (FK), sprintId (FK), templateId (FK, nullable until generated)
dayOfWeek: INTEGER (0=Sun, 1=Mon...)
scheduledDate: DATEONLY
dayType: DayType
classFormat: ClassFormat
classStyle: ClassStyle
status: 'planned' | 'generated' | 'taught' | 'skipped'
classLogId: FK to bootcamp_class_logs (linked after class is taught)
wasUsed: BOOLEAN (trainer confirms "did you teach this class?")
usedDate: DATEONLY (actual date taught, may differ from scheduled)
exerciseKeys: JSONB (exercise keys used in this slot for memory tracking)
```

#### Sprint Generation Algorithm

1. **Create Sprint** — Trainer sets: duration (4-16 weeks), classes/week, frequency pattern, focus rotation, default format/style, progression strategy
2. **Generate All Classes** — AI generates all classes for the sprint:
   - Week 1: Generate classes with standard freshness (14-day lookback into history)
   - Week 2+: Generate using sprint's cumulative `exerciseMemory` — every exercise used in prior weeks is tracked
   - Deload weeks: Auto-insert every 4th week with reduced intensity (0.7 modifier)
   - Focus rotation: Cycle through dayTypes based on `focusRotation` pattern
3. **Exercise Memory Accumulation** — After each class is generated, its exercise keys are added to `exerciseMemory` JSONB field
4. **Next Sprint Generation** — When starting a new sprint, load the previous sprint's `exerciseMemory` as the exclusion set. This ensures the next 3 months uses DIFFERENT exercises than the previous 3 months.
5. **840+ Exercise Pool** — With 840+ exercises in the rolodex, a 3-month sprint of 36 classes (~4-6 exercises per station x 4-8 stations = ~20-48 exercises per class) uses roughly 720-1728 exercise slots. Even with repeats across stations, the pool is deep enough for 2+ sprints before recycling.

#### Progression Strategies

| Strategy | Description | Week-over-Week Change |
|----------|-------------|----------------------|
| linear | Steady intensity increase | +5% duration or +1 exercise per station each week |
| undulating | High/medium/low intensity waves | Week pattern: H-M-L-H-M-L... |
| block | 3-week blocks with different focus | Weeks 1-3: endurance, 4-6: strength, 7-9: power, 10-12: mixed |
| random | AI picks optimal variety | No fixed pattern, maximize novelty |

#### API Endpoints

```
POST   /api/bootcamp/sprints              Create new sprint
GET    /api/bootcamp/sprints              List trainer's sprints
GET    /api/bootcamp/sprints/:id          Get sprint with all weeks/slots
POST   /api/bootcamp/sprints/:id/generate Generate all classes for sprint
PUT    /api/bootcamp/sprints/:id          Update sprint settings
DELETE /api/bootcamp/sprints/:id          Archive sprint

GET    /api/bootcamp/sprints/:id/weeks          Get weeks
PUT    /api/bootcamp/sprints/:id/weeks/:weekId  Update week (deload, theme)

PUT    /api/bootcamp/sprints/:sprintId/slots/:slotId          Update slot
PUT    /api/bootcamp/sprints/:sprintId/slots/:slotId/confirm  Confirm class was taught
POST   /api/bootcamp/sprints/:sprintId/slots/:slotId/regenerate  Regenerate single class
```

#### Frontend Components

**SprintPlannerPage** — Main sprint planning UI
- Sprint creation wizard (duration, frequency, rotation, format)
- Timeline view showing all 12 weeks
- Click a week to expand and see individual classes
- "Generate All" button kicks off AI generation for entire sprint
- Progress indicator: X of Y classes generated/taught

**SprintCalendarView** — Calendar grid (see Feature 3 below — shared component)

**SprintDetailPanel** — Shows one week's classes with:
- Day cards showing class format, style, day type
- Exercise preview per class
- "Mark as Taught" button per class
- Edit/regenerate individual classes

---

## FEATURE 2: Pain Chart Upgrade

### Current State
The existing pain chart at `frontend/src/components/BodyMap/` is fully functional with:
- 42 clickable body regions (22 front, 20 back)
- SVG-based simplified body outline
- Pain level 1-10 slider
- 8 pain types, aggravating movements, relieving factors
- NASM CES corrective exercise linking
- Full CRUD with RBAC

### Problems to Solve
1. **Basic SVG body outline** — looks generic, not professional/realistic
2. **No muscle/bone labeling** — clients can't identify specific anatomical structures
3. **Not in client sidebar** — clients can't easily access it from their dashboard
4. **Not prominently in admin/trainer dashboards** — buried in kebab menus
5. **AI doesn't pull pain data into workout generation** — pain entries exist but aren't factored into bootcamp class generation or workout plans

### Proposed Upgrade

#### A. Anatomical Image Upgrade

**Approach:** Use AI image generation to create ultra-realistic anatomical reference images.

**Image Requirements:**
- **Male anterior (front) view** — Full body, standing anatomical position, showing major muscle groups with clean labels
- **Male posterior (back) view** — Same pose, back muscles visible
- **Female anterior (front) view** — Same treatment, female anatomy
- **Female posterior (back) view** — Same treatment
- **Skeletal overlay variant** — Optional toggle to show skeletal system with bone labels
- **Muscular overlay variant** — Default view showing muscular system with muscle labels

**Style Requirements:**
- Ultra-realistic medical illustration quality (NOT cartoon/stylized)
- Clean dark background (compatible with Crystalline Swan dark theme)
- Muscle groups clearly delineated with subtle color differentiation
- Labels positioned cleanly with leader lines (not cluttered)
- Minimum resolution: 2048x4096 for zooming without blur
- Transparent background preferred (PNG) for theme overlay

**Label Groups (Muscles):**
Front: Sternocleidomastoid, Deltoids (anterior), Pectoralis Major/Minor, Biceps Brachii, Brachialis, Rectus Abdominis, External Obliques, Serratus Anterior, Hip Flexors (Iliopsoas), Quadriceps (Rectus Femoris, Vastus Lateralis/Medialis/Intermedius), Tibialis Anterior, Adductors

Back: Trapezius, Rhomboids, Infraspinatus/Teres Minor (Rotator Cuff), Latissimus Dorsi, Erector Spinae, Triceps Brachii, Forearm Extensors, Gluteus Maximus/Medius/Minimus, Hamstrings (Biceps Femoris, Semitendinosus, Semimembranosus), Gastrocnemius, Soleus, Achilles Tendon area

**Label Groups (Bones — skeletal toggle):**
Skull, Cervical Spine, Clavicle, Scapula, Sternum, Humerus, Radius, Ulna, Thoracic Spine, Lumbar Spine, Sacrum, Pelvis (Ilium), Femur, Patella, Tibia, Fibula, Calcaneus, Metatarsals

**AI Image Generation:**
- The user mentioned "nano banana 2" — this likely refers to an AI image generation tool
- Alternative approach: Use high-quality medical illustration SVGs that are layered and interactive
- Each muscle/bone group should be a separate clickable region that highlights on hover
- Consider: Generating base images with AI, then overlaying interactive SVG hotspots on top

#### B. Interactive Layer System

Instead of replacing the entire SVG, upgrade to a layered approach:
1. **Base Layer:** AI-generated realistic body image (PNG/WebP)
2. **Hotspot Layer:** Invisible SVG overlay with clickable regions (same 42 regions, refined coordinates)
3. **Label Layer:** Toggle-able muscle/bone names with leader lines
4. **Pain Layer:** Existing pain entry indicators (colored dots/pulses)
5. **Toggle Controls:** Muscles view / Skeletal view / Labels on/off / Gender selector

#### C. Dashboard Integration

**Client Dashboard Sidebar:**
- Add "Pain & Injury" menu item with HeartPulse icon
- Route: `/dashboard/pain-chart` or `/dashboard/body-map`
- Client mode: Can add/view/resolve their own pain entries

**Admin Dashboard:**
- Add "Client Pain Charts" to the client management section
- Bulk view: See all clients with active pain entries (severity badges)
- Click client → opens full body map in trainer mode

**Trainer Dashboard:**
- Same as admin but scoped to assigned clients only
- Quick-access pain summary cards for each client

#### D. AI Workout Integration (CRITICAL)

**Pain entries MUST be pulled into workout generation:**

1. **Bootcamp Generator** — Before generating a class, query active pain entries for the trainer's client roster. If ANY client has active pain in a region:
   - Auto-generate Board 2 modifications targeting that pain area
   - Flag exercises that aggravate the reported pain region
   - Include corrective exercises from NASM CES protocol

2. **Coach Assistant** — When generating workout plans, the AI already gets enriched context. Add pain entry data to enrichment:
   ```
   --- ACTIVE PAIN ENTRIES ---
   Client #47: left_knee, pain level 7/10, sharp, onset 2026-03-15
   Client #23: lower_back, pain level 5/10, aching, onset 2026-03-28
   --- END PAIN ENTRIES ---
   ```

3. **Exercise Filtering** — Exercises with contraindications matching active pain regions should be flagged or auto-excluded

---

## FEATURE 3: Bootcamp Calendar

### Problem
No way to visually browse what bootcamp classes were done on which days. Trainers need to:
- See a month/week calendar view of all bootcamp classes
- Click a day to see the class that was done
- Confirm whether a planned class was actually taught
- Quick-add a class to a specific date

### Proposed Implementation

#### Calendar Component

**BootcampCalendar** — Full-page calendar view
- Month view (default): Grid of days, each day shows a colored badge if a class was done
  - Color = dayType (lower=blue, upper=purple, cardio=orange, full=green)
  - Icon badge shows format (station icon, group icon)
- Week view: Expanded cards per day showing class details
- Click a day → slide-out panel showing:
  - Class name, format, style, day type
  - Station layout with exercises
  - "Was this class taught?" toggle
  - If yes: actual date used (defaults to scheduled date), participant count, energy level, rating
  - Quick link to full class preview

#### Data Model

Uses existing `bootcamp_class_logs` table. New fields needed on SprintClassSlot:
- `wasUsed: BOOLEAN` — Did the trainer actually teach this class?
- `usedDate: DATEONLY` — What day was it actually used?
- `trainerConfirmedAt: TIMESTAMP` — When did they confirm?

#### Calendar + Sprint Integration

The calendar pulls from TWO sources:
1. **Sprint class slots** — Planned classes from the sprint planner (shows as "planned" until confirmed)
2. **Ad-hoc class logs** — Classes generated and taught outside of sprints

Calendar view merges both:
- Sprint classes show as planned (dotted border) until confirmed (solid border)
- Ad-hoc classes always show as confirmed
- Empty days available for quick class addition

#### Calendar Navigation

```
┌─────────────────────────────────────────────────┐
│  < March 2026 >          [Month] [Week] [List]  │
├──────┬──────┬──────┬──────┬──────┬──────┬──────┤
│ Sun  │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│      │  1   │  2   │  3   │  4   │  5   │  6   │
│      │      │      │ ●UB  │      │ ●LB  │      │
│      │      │      │ pyr  │      │ std  │      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  7   │  8   │  9   │ 10   │ 11   │ 12   │ 13   │
│      │ ●CD  │      │ ●FB  │      │ ●UB  │      │
│      │ HIIT │      │ sup  │      │ pyr  │      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ ...  │      │      │      │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘

● = class dot (color by dayType)
UB/LB/CD/FB = dayType abbreviation
pyr/std/sup = classStyle abbreviation
Dotted border = planned but not confirmed
Solid border = confirmed/taught
```

---

## INTEGRATION MAP

All three features connect:

```
Sprint Planner ──generates──→ Classes ──saved to──→ Calendar
     │                              │                    │
     │ exerciseMemory               │ pain filtering     │ usage tracking
     │ (accumulates)                │ (Board 2 mods)     │ (wasUsed/usedDate)
     ▼                              ▼                    ▼
Next Sprint                   Pain Chart Data      Class History
(excludes prev exercises)    (injury-aware AI)    (freshness engine)
```

---

## IMPLEMENTATION PHASES

### Phase A: Database & Models (Sprint System)
- Create BootcampSprint, SprintWeek, SprintClassSlot models
- Migration for new tables
- Add exerciseMemory JSONB to sprint model
- Update BootcampClassLog with sprint linking fields

### Phase B: Sprint Generation Engine (Backend)
- Sprint creation service
- Multi-class generation with cumulative exercise memory
- Progression strategy implementations (linear, undulating, block, random)
- Deload week auto-insertion
- Cross-sprint exercise exclusion

### Phase C: Bootcamp Calendar (Frontend + Backend)
- Calendar component with month/week/list views
- Day detail slide-out panel
- "Was this taught?" confirmation workflow
- Sprint class slots + ad-hoc class merge view
- Calendar API endpoints

### Phase D: Pain Chart Anatomical Upgrade (Frontend)
- AI-generated anatomical images (male + female)
- Layered SVG hotspot system over realistic images
- Muscle/bone label toggle
- Gender selector
- Skeletal vs muscular view toggle

### Phase E: Pain Chart Dashboard Integration
- Add to client sidebar navigation
- Admin bulk pain entry view
- Trainer client pain summary cards
- Route setup for all three dashboard roles

### Phase F: Pain-Aware Workout Generation
- Inject active pain entries into bootcamp generator
- Auto-generate Board 2 modifications for pain areas
- Coach Assistant enrichment with pain data
- Exercise contraindication flagging

---

## QUESTIONS FOR AI VILLAGE

1. **Image Generation Approach:** Should we use AI-generated PNG images with SVG overlays, or fully interactive SVG illustrations? What gives the best zoom/interaction quality on mobile?
2. **Sprint Memory Strategy:** Is JSONB exerciseMemory on the sprint sufficient, or should we use a dedicated junction table (sprint_exercise_usage) for better querying?
3. **Calendar Library:** Build custom calendar component or use a library (react-big-calendar, FullCalendar)? Must be dark-theme compatible and styled-components friendly.
4. **Deload Logic:** Auto-insert every 4th week, or let trainer choose deload placement?
5. **Pain → Bootcamp Integration:** Should pain filtering happen at generation time (exclude exercises) or at display time (flag but don't exclude)?
6. **Anatomical Image Licensing:** If using AI-generated images, are there medical illustration accuracy concerns? Should we reference real anatomy textbooks for label placement?
7. **Cross-Sprint Freshness:** When starting sprint #2, should we exclude ALL exercises from sprint #1, or use a weighted decay (exercises from early sprint #1 are less penalized than recent ones)?
8. **Mobile Calendar UX:** Month view on 375px screens — day cells will be tiny. Should mobile default to week view or list view?
