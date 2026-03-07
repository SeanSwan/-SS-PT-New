# Boot Camp Class Builder
## SwanStudios AI Form Analysis — Phase 10 Design Document

### AI Village Review Request
This document defines the Boot Camp Class Builder system for SwanStudios.
Please review for: security, architecture, code quality, UX, performance, and competitive gaps.

---

## Overview

Sean Swan teaches group fitness boot camp classes at Move Fitness. These classes have unique constraints that differ fundamentally from 1-on-1 personal training: variable class sizes, shared equipment, station rotations, time pressure, mixed fitness levels, and the need to keep workouts fresh week after week. The Boot Camp Class Builder is an AI-powered system that generates, manages, and evolves group workout classes while respecting all of these real-world constraints.

### Why This Matters
- Boot camp classes are a core revenue stream (multiple clients per hour vs 1-on-1)
- Class quality directly impacts client retention and referrals
- Manual class planning is time-consuming and prone to staleness
- No competitor platform has AI-powered group class generation with space/equipment/time awareness

---

## A. Core Requirements (Parsed from Sean's Input)

### A1. Space-Aware Planning
- AI needs to understand the physical gym space (dimensions, layout, obstacle zones)
- Trainer uploads **360-degree video or photos** of the workout area
- AI uses Gemini Flash Vision to analyze:
  - Total usable floor area (approximate sqft)
  - Station zones (where equipment can be placed)
  - Traffic flow paths (how clients move between stations)
  - Obstacle zones (pillars, walls, mirrors, reception desk)
- Space constraints determine max stations and clients per station
- If more than 4 people per station, AI must get creative (see overflow planning)

### A2. Time-Aware Workout Structure
Every class follows strict timing:

| Component | Duration | Notes |
|-----------|----------|-------|
| Demo time | 5 min | Trainer demonstrates all exercises |
| Workout time | 35-45 min | Pure exercise time |
| Clear/cooldown | 5 min | Clean up, stretch, clear space for next class |
| **Total** | **45-55 min** | Optimal is 50 min (5 demo + 45 workout) |

### A3. Class Format Variations

Sean uses 4 primary class formats:

#### Format 1: Standard Stations (4 exercises x N stations x 35 sec)
```
Station 1: [Exercise A] [Exercise B] [Exercise C] [Exercise D]
Station 2: [Exercise A] [Exercise B] [Exercise C] [Exercise D]
...
- 35 seconds per exercise
- Transition between stations after completing all 4 exercises
- Rest during transition (walk to next station)
- Target: 45 min workout
```

#### Format 2: Triple Stations (3 exercises x 5 stations x 40 sec)
```
5 stations, 3 exercises each
40 seconds per exercise
Transition after all 3 exercises complete
```

#### Format 3: Speed Stations (2 exercises x 7 stations x 30 sec)
```
7 stations, 2 exercises each
30 seconds per exercise
Fast transitions — higher cardio effect
```

#### Format 4: Full Group Workout (15 exercises x 2 rounds)
```
No stations — entire class works together
Mix of heavy weights (chest press, rows, RDLs) and light weights (shoulder press)
Mix of bodyweight (mountain climbers, burpees, squat press) and weighted
~15 different exercises, done 2x through
Everyone grabs a heavy dumbbell AND a light dumbbell at start
Heart-rate elevated throughout — include explosive moves between strength sets
```

### A4. Station Organization Rules

1. **Heavy setup exercises FIRST** at each station
   - Resistance bands (putting them on legs takes time)
   - Adjusting bench height
   - Grabbing correct weight
   - Setting up cable machines
   - Clients should NOT have to change equipment mid-station

2. **Cardio exercise LAST at every station**
   - Entire class does cardio simultaneously (mountain climbers, burpees, jumping jacks, high knees)
   - Creates group energy and synchronization
   - Natural transition point — everyone is moving, easy to rotate

3. **No client waiting**
   - AI must account for transition time between exercises within a station
   - If equipment is shared within a station, exercises must be sequenced so no one waits
   - Example: if 2 people share a bench, alternate bench exercise with floor exercise

### A5. Overflow Planning (Class Size Variability)

Class size varies day-to-day. The AI must generate:

1. **Primary Workout** — Designed for expected class size (e.g., 12 people, 4 per station)
2. **Overflow Backup** — Activated when class exceeds station capacity (e.g., 20 people show up)
   - **Lap Rotation**: Split class into Group A and Group B
   - Group A does the gym workout stations
   - Group B does a 3-5 minute lap (running, walking lunges, bear crawls outside)
   - Groups rotate
   - AI must design lap exercises that don't require equipment
3. **Minimal Attendance Plan** — For small classes (< 6 people), condense stations

### A6. Exercise Difficulty Tiers

Every exercise in a boot camp class needs **4 difficulty options**:

| Tier | Description | Example (Squat) |
|------|-------------|-----------------|
| **Easy** | Ultra-beginner, mobility-limited | Chair-assisted squat, quarter squat |
| **Medium** | Standard execution | Bodyweight squat to parallel |
| **Hard** | Advanced, full ROM + load | Goblet squat, jump squat |
| **Modified** | Pain/injury adaptation | Wall sit (knee pain), single-leg squat to box (ankle pain) |

Pain/injury modifications by common areas:
- **Knee pain**: Avoid deep flexion, prefer isometric holds, seated exercises, upper body alternatives
- **Shoulder pain**: Avoid overhead, prefer neutral grip, reduce ROM, band-only resistance
- **Foot/ankle pain**: Avoid impact, prefer seated/lying exercises, cycling, upper body focus
- **Wrist pain**: Avoid weight-bearing on hands (push-ups → incline push-ups on forearms)
- **Lower back pain**: Avoid loaded spinal flexion, prefer neutral spine, core stability

### A7. Low-Impact Advanced Options

Advanced clients who need joint-friendly training:
- **Isolation exercises**: Slow, controlled single-joint movements under tension
- **Isometric holds**: Wall sits, plank variations, dead hangs, pause squats
- **Slow tempo**: 4-second eccentric, 2-second pause, 2-second concentric (4-2-2-0)
- **Time under tension**: Lighter weight, longer sets (45-60 sec)
- **Band-only circuits**: High tension without joint compression
- **Challenge**: Some clients don't follow slow tempo — AI should suggest exercises where slow tempo is enforced by the movement pattern (e.g., Turkish get-up, tempo push-ups with chest-to-floor pause)

### A8. Workout Rotation & Freshness

Classes must not get stale. The AI must:

1. **Log all past boot camp workouts** — what exercises were used, in what format, on what date
2. **Track muscle group rotation** — ensure balanced weekly programming:
   - Monday: Lower Body
   - Tuesday: Upper Body
   - Wednesday: Cardio/Conditioning
   - Thursday: Full Body
   - (Current Move Fitness schedule — configurable)
3. **Rotate exercises within same muscle groups** — don't repeat the same exercises within a 2-week window (mirrors the BUILD-BUILD-SWITCH variation engine logic)
4. **Trend research integration** — AI researches current fitness trends:
   - Popular YouTube workout videos (read transcripts of trending fitness content)
   - Reddit fitness communities (r/fitness, r/bodyweightfitness, r/xxfitness)
   - Trending boot camp formats from popular gyms nationally
   - Inclusive fitness communities — Black fitness culture, Latinx fitness trends, diverse training styles
   - Rate all discovered exercises against NASM protocol (safety, effectiveness)
   - Classify as high-impact vs low-impact
   - Flag exercises that violate NASM standards with explanation

### A9. Current Workout Logging

Sean needs to log existing boot camp workouts currently being taught:
- **Lower Body Day** workouts
- **Upper Body Day** workouts
- **Cardio Day** workouts
- **Full Body Day** workouts

The AI ingests these to:
- Understand current exercise selection patterns
- Identify gaps (muscle groups being neglected)
- Suggest progressive variations
- Avoid suggesting exercises already in heavy rotation

---

## B. Database Schema

### Boot Camp Class Templates

```sql
-- Boot camp class templates (reusable class designs)
CREATE TABLE bootcamp_templates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id      INTEGER REFERENCES "Users"(id),
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  class_format    VARCHAR(30) NOT NULL,
  -- class_format: 'stations_4x', 'stations_3x5', 'stations_2x7', 'full_group', 'custom'
  target_duration_min INTEGER NOT NULL DEFAULT 45,
  demo_duration_min   INTEGER NOT NULL DEFAULT 5,
  clear_duration_min  INTEGER NOT NULL DEFAULT 5,
  day_type        VARCHAR(30),
  -- day_type: 'lower_body', 'upper_body', 'cardio', 'full_body', 'custom'
  difficulty_base VARCHAR(20) NOT NULL DEFAULT 'medium',
  -- difficulty_base: 'easy', 'medium', 'hard', 'mixed'
  equipment_profile_id INTEGER REFERENCES equipment_profiles(id),
  space_profile_id     INTEGER,  -- references boot camp space profiles
  max_participants     INTEGER DEFAULT 20,
  optimal_participants INTEGER DEFAULT 12,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  tags            TEXT,  -- comma-separated: 'trending', 'nasm_approved', 'low_impact', etc.
  ai_generated    BOOLEAN DEFAULT FALSE,
  last_used_at    TIMESTAMPTZ,
  times_used      INTEGER DEFAULT 0,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bootcamp_templates_trainer ON bootcamp_templates(trainer_id);
CREATE INDEX idx_bootcamp_templates_format ON bootcamp_templates(class_format);
CREATE INDEX idx_bootcamp_templates_day ON bootcamp_templates(day_type);

-- Stations within a boot camp class
CREATE TABLE bootcamp_stations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id     INTEGER REFERENCES bootcamp_templates(id) ON DELETE CASCADE,
  station_number  INTEGER NOT NULL,
  station_name    VARCHAR(100),
  equipment_needed TEXT,  -- comma-separated equipment names
  setup_time_sec  INTEGER DEFAULT 0,  -- time to set up this station
  notes           TEXT,
  sort_order      INTEGER NOT NULL,
  UNIQUE(template_id, station_number)
);

-- Exercises within a station (or within full-group workout)
CREATE TABLE bootcamp_exercises (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id     INTEGER REFERENCES bootcamp_templates(id) ON DELETE CASCADE,
  station_id      INTEGER REFERENCES bootcamp_stations(id) ON DELETE CASCADE,
  exercise_name   VARCHAR(100) NOT NULL,
  duration_sec    INTEGER NOT NULL DEFAULT 35,
  rest_sec        INTEGER DEFAULT 0,
  sort_order      INTEGER NOT NULL,
  is_cardio_finisher BOOLEAN DEFAULT FALSE,
  muscle_targets  TEXT,  -- comma-separated: 'quadriceps,gluteus_maximus'
  -- Difficulty tiers (each is an alternative exercise name)
  easy_variation  VARCHAR(100),
  medium_variation VARCHAR(100),  -- usually same as exercise_name
  hard_variation  VARCHAR(100),
  -- Pain modifications (alternative exercises for common pain areas)
  knee_mod        VARCHAR(100),
  shoulder_mod    VARCHAR(100),
  ankle_mod       VARCHAR(100),
  wrist_mod       VARCHAR(100),
  back_mod        VARCHAR(100),
  equipment_required VARCHAR(100),
  notes           TEXT
);

CREATE INDEX idx_bootcamp_exercises_template ON bootcamp_exercises(template_id);
CREATE INDEX idx_bootcamp_exercises_station ON bootcamp_exercises(station_id);

-- Overflow backup plans
CREATE TABLE bootcamp_overflow_plans (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id     INTEGER REFERENCES bootcamp_templates(id) ON DELETE CASCADE,
  trigger_count   INTEGER NOT NULL,  -- activate when class size exceeds this
  strategy        VARCHAR(30) NOT NULL,
  -- strategy: 'lap_rotation', 'split_groups', 'add_stations', 'condense'
  lap_exercises   JSONB,  -- exercises for the outdoor/lap group
  lap_duration_min INTEGER DEFAULT 4,
  notes           TEXT
);

-- Boot camp class log (what was actually taught)
CREATE TABLE bootcamp_class_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id     INTEGER REFERENCES bootcamp_templates(id),
  trainer_id      INTEGER REFERENCES "Users"(id),
  class_date      DATE NOT NULL,
  day_type        VARCHAR(30),
  actual_participants INTEGER,
  overflow_activated BOOLEAN DEFAULT FALSE,
  exercises_used  JSONB NOT NULL,  -- snapshot of what was actually done
  modifications_made JSONB,  -- pain mods, difficulty adjustments made on the fly
  trainer_notes   TEXT,
  class_rating    INTEGER,  -- 1-5 how well the class went
  energy_level    VARCHAR(20),  -- 'low', 'medium', 'high', 'explosive'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bootcamp_log_date ON bootcamp_class_log(class_date);
CREATE INDEX idx_bootcamp_log_trainer ON bootcamp_class_log(trainer_id);
CREATE INDEX idx_bootcamp_log_day ON bootcamp_class_log(day_type);

-- Space profiles (gym layout for boot camp planning)
CREATE TABLE bootcamp_space_profiles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  trainer_id      INTEGER REFERENCES "Users"(id),
  name            VARCHAR(100) NOT NULL,
  location_name   VARCHAR(200),
  total_area_sqft INTEGER,
  max_stations    INTEGER,
  max_per_station INTEGER DEFAULT 4,
  layout_data     JSONB,  -- AI-analyzed space layout from 360 video/photos
  media_urls      JSONB,  -- array of photo/video URLs of the space
  has_outdoor_access BOOLEAN DEFAULT FALSE,
  outdoor_description TEXT,  -- "parking lot for laps", "grass area 50x30ft"
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise trend tracking (from YouTube/Reddit research)
CREATE TABLE exercise_trends (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_name   VARCHAR(100) NOT NULL,
  source          VARCHAR(30) NOT NULL,
  -- source: 'youtube', 'reddit', 'instagram', 'trainer_input', 'nasm_library'
  source_url      TEXT,
  trend_score     INTEGER,  -- 1-100 popularity score
  nasm_rating     VARCHAR(20),
  -- nasm_rating: 'approved', 'approved_with_caveats', 'not_recommended', 'dangerous'
  impact_level    VARCHAR(20),
  -- impact_level: 'low', 'medium', 'high', 'plyometric'
  muscle_targets  TEXT,
  difficulty      VARCHAR(20),
  description     TEXT,
  ai_analysis     JSONB,  -- AI assessment of safety, effectiveness, fun factor
  discovered_at   TIMESTAMPTZ DEFAULT NOW(),
  is_approved     BOOLEAN DEFAULT FALSE,
  approved_by     INTEGER REFERENCES "Users"(id)
);

CREATE INDEX idx_exercise_trends_source ON exercise_trends(source);
CREATE INDEX idx_exercise_trends_rating ON exercise_trends(nasm_rating);
```

---

## C. Boot Camp Class Generation Algorithm

### Input
```
{
  spaceProfile: SpaceProfile,           // gym layout, max stations
  equipmentProfile: EquipmentProfile,   // available equipment
  classFormat: 'stations_4x' | 'stations_3x5' | 'stations_2x7' | 'full_group',
  dayType: 'lower_body' | 'upper_body' | 'cardio' | 'full_body',
  expectedParticipants: 12,
  targetDuration: 45,                   // minutes of exercise
  clientProfiles: [{                    // optional: known attendees
    userId, painEntries, compensations, fitnessLevel
  }],
  recentClasses: BootcampClassLog[],    // last 2-4 weeks of classes
  trendExercises: ExerciseTrend[],      // trending exercises to consider
  preferences: {
    includeCardioFinisher: true,
    heavySetupFirst: true,
    lowImpactFriendly: true
  }
}
```

### Algorithm: Station-Based Class Generation

```
Step 1: DETERMINE STATION COUNT & EXERCISES PER STATION
  - Based on classFormat:
    - stations_4x: ceil(targetDuration / (4 * exerciseDuration + transitionTime))
    - stations_3x5: 5 stations fixed, 3 exercises each
    - stations_2x7: 7 stations fixed, 2 exercises each
    - full_group: no stations, 15 exercises x 2 rounds
  - Verify against space constraints (max_stations from space profile)
  - If expectedParticipants / stations > max_per_station: trigger overflow plan

Step 2: SELECT MUSCLE GROUPS PER STATION
  - Based on dayType:
    - lower_body: quads, hamstrings, glutes, calves, hip flexors, core
    - upper_body: chest, back, shoulders, biceps, triceps, core
    - cardio: full body explosive, minimal equipment, high heart rate
    - full_body: mix of all, balanced push/pull/squat/hinge/carry/core
  - Distribute across stations evenly (no two adjacent stations same primary muscle)

Step 3: SELECT EXERCISES (NASM-Compliant)
  For each station:
    a. Query exercise library filtered by:
       - Muscle targets matching station's assigned group
       - Equipment available at this location
       - NOT used in last 2 weeks of classes (freshness)
       - NASM approved (or approved_with_caveats)
    b. Apply station ordering rules:
       - Position 1: Heaviest setup / most equipment needed
       - Position 2-N-1: Decreasing equipment needs
       - Position N (last): Cardio finisher (bodyweight, explosive)
    c. Generate difficulty tiers:
       - Easy: regression of selected exercise
       - Medium: the selected exercise (standard)
       - Hard: progression of selected exercise
    d. Generate pain modifications:
       - For each common pain area (knee, shoulder, ankle, wrist, back)
       - Select alternative exercise targeting same muscles but avoiding painful movement
    e. Estimate transition time:
       - Equipment changes within station (putting on bands, grabbing weights)
       - Total station time = sum(exercise_durations) + sum(transitions)
       - Must fit within class timing

Step 4: CALCULATE TIMING
  - Total workout time = stations * (exercises_per_station * duration_sec + inter_exercise_rest + transition_to_next_station)
  - Verify total <= targetDuration
  - If over: reduce exercise duration or remove one exercise per station
  - If under: add rest periods or add exercise per station
  - Account for demo time (5 min) and clear time (5 min)

Step 5: GENERATE OVERFLOW PLAN
  - If expectedParticipants > optimal_per_station * num_stations:
    - Create lap rotation plan:
      - Group A: indoor stations
      - Group B: 3-5 min outdoor circuit (jogging, walking lunges, bear crawls, high knees)
      - Rotation signal: trainer whistle/timer
    - Lap exercises must be bodyweight-only, no equipment
    - Total lap duration should match one station rotation cycle

Step 6: VALIDATE AGAINST NASM STANDARDS
  - Check exercise progression appropriateness
  - Verify warm-up adequacy (dynamic stretches should be in demo)
  - Ensure no contraindicated exercise combinations
  - Rate overall class: impact level (low/medium/high/mixed)
  - Flag any exercises that need trainer supervision for safety

Step 7: GENERATE AI EXPLANATIONS
  - Why each exercise was chosen
  - Which trending exercises were incorporated and why
  - What was rotated out from recent classes
  - Difficulty tier rationale
  - Pain modification reasoning
```

### Algorithm: Full Group Workout Generation

```
Step 1: SELECT 15 EXERCISES
  - Mix of:
    - 5 heavy compound (chest press, rows, RDLs, squats, shoulder press)
    - 5 bodyweight explosive (mountain climbers, burpees, squat press, jumping jacks, high knees)
    - 5 accessory/isolation (bicep curls, lateral raises, calf raises, tricep extensions, core)
  - Weight requirements:
    - Heavy dumbbell exercises (3-5 of the 15)
    - Light dumbbell exercises (3-5 of the 15)
    - Bodyweight exercises (5-7 of the 15)
  - Clients grab ONE heavy and ONE light dumbbell at start — no mid-workout weight changes

Step 2: SEQUENCE FOR HEART RATE
  - Alternate strength and explosive:
    [Strength] → [Explosive/Cardio] → [Strength] → [Explosive/Cardio] → ...
  - Never stack 3 strength exercises in a row
  - Start with compound strength to activate large muscle groups
  - End with core + final cardio blast

Step 3: TIMING
  - Each exercise: 40-45 seconds work, 15 seconds transition
  - 15 exercises x 1 min each = 15 min per round
  - 2 rounds = 30 min + 5 min demo + 5 min cooldown + 5 min buffer = 45 min
  - If 3 rounds needed for 45 min target, reduce to 12 exercises

Step 4: DIFFICULTY TIERS + MODS
  - Same as station format: easy/medium/hard + pain modifications for every exercise
```

---

## D. Space Analysis via AI Vision

### 360 Video/Photo Upload Flow

```
1. Trainer opens "Boot Camp Space" section
2. Options:
   a. "Record 360 Video" — slow pan around the workout area
   b. "Upload Photos" — multiple angles (min 4: front, back, left, right)
3. Media uploaded to R2 storage
4. Gemini Flash Vision analyzes:
   - Approximate dimensions (using reference objects: standard equipment, doors, floor tiles)
   - Open floor areas vs equipment zones
   - Station placement suggestions
   - Traffic flow analysis
   - Natural grouping areas
5. AI generates space profile with:
   - Estimated total area
   - Recommended max stations (based on ~64 sqft per station for 4 people)
   - Recommended max participants
   - Station placement map (simple grid overlay)
6. Trainer reviews, adjusts if needed, saves
```

### Gemini Flash Vision Prompt for Space Analysis

```
Analyze this gym/fitness space photo for boot camp class planning.
Return JSON:
{
  "estimated_area_sqft": 1200,
  "usable_workout_area_sqft": 900,
  "recommended_stations": 6,
  "max_participants_comfortable": 24,
  "obstacles": ["pillar near center", "reception desk on east wall"],
  "suggested_station_zones": [
    {"zone": "A", "location": "front-left", "approx_sqft": 150},
    {"zone": "B", "location": "front-right", "approx_sqft": 150},
    ...
  ],
  "has_outdoor_access": true,
  "outdoor_description": "Parking lot visible through back door",
  "equipment_visible": ["dumbbells rack", "benches", "cable machine", "TRX straps"],
  "notes": "Good natural light, mirrors on north wall, ceiling height adequate for overhead exercises"
}
```

---

## E. Trend Research Engine

### How the AI Discovers New Exercises

```
1. YOUTUBE RESEARCH (via Gemini with web search)
   - Search: "boot camp workout 2026", "group fitness class ideas", "trending gym exercises"
   - Target channels: popular fitness YouTubers, Black fitness creators, diverse training styles
   - Read video transcripts of trending videos
   - Extract exercise names, formats, timing structures
   - Rate against NASM protocol

2. REDDIT RESEARCH (via web search API)
   - Subreddits: r/fitness, r/bodyweightfitness, r/xxfitness, r/personaltraining
   - Search for: "boot camp ideas", "group class exercises", "fun workout exercises"
   - Extract community-validated exercises

3. NASM RATING PROCESS
   For each discovered exercise:
   - Is it in the NASM exercise library? → Auto-approve
   - Is it a variation of an approved exercise? → Approve with caveats
   - Does it involve contraindicated movements? → Flag for review
   - Impact classification: low / medium / high / plyometric
   - Joint stress assessment: which joints are loaded, injury risk
   - Effectiveness rating: how well it targets intended muscles
   - Fun factor: community engagement metrics (likes, shares, comments)

4. ADMIN APPROVAL QUEUE
   - Discovered exercises go to admin dashboard for review
   - Admin can: approve, reject, modify classification, add notes
   - Approved exercises enter the boot camp exercise pool
   - Rejected exercises are excluded with reason logged
```

---

## F. REST API Endpoints

### Boot Camp Templates

```
POST   /api/bootcamp/templates              Create template
GET    /api/bootcamp/templates              List all templates
GET    /api/bootcamp/templates/:id          Get template with stations + exercises
PUT    /api/bootcamp/templates/:id          Update template
DELETE /api/bootcamp/templates/:id          Delete template
POST   /api/bootcamp/templates/:id/duplicate Duplicate template as starting point
```

### AI Class Generation

```
POST   /api/bootcamp/generate
       Body: { classFormat, dayType, expectedParticipants, equipmentProfileId,
               spaceProfileId, targetDuration, preferences }
       Returns: { template, overflowPlan, aiExplanations, trendExercisesUsed }

POST   /api/bootcamp/generate/overflow
       Body: { templateId, actualParticipants }
       Returns: { overflowPlan, lapExercises, groupRotation }
```

### Space Profiles

```
POST   /api/bootcamp/spaces                 Create space profile (upload photos/video)
GET    /api/bootcamp/spaces                 List space profiles
GET    /api/bootcamp/spaces/:id             Get space profile
PUT    /api/bootcamp/spaces/:id             Update space profile
POST   /api/bootcamp/spaces/:id/analyze     Re-analyze space with AI vision
```

### Class Log

```
POST   /api/bootcamp/log                    Log a completed class
GET    /api/bootcamp/log                    Class history (paginated)
GET    /api/bootcamp/log/stats              Class statistics (frequency, ratings, exercises used)
GET    /api/bootcamp/log/rotation           Exercise rotation analysis (what's been used recently)
```

### Workout Logging (Existing Classes)

```
POST   /api/bootcamp/existing-workouts      Log an existing workout the trainer currently does
GET    /api/bootcamp/existing-workouts      List logged existing workouts
PUT    /api/bootcamp/existing-workouts/:id  Update existing workout
DELETE /api/bootcamp/existing-workouts/:id  Delete existing workout
GET    /api/bootcamp/existing-workouts/analysis  AI analysis of current workout patterns
```

### Trend Research

```
POST   /api/bootcamp/trends/research        Trigger AI trend research
GET    /api/bootcamp/trends                 List discovered trends (paginated)
PUT    /api/bootcamp/trends/:id/approve     Admin approve a trend exercise
PUT    /api/bootcamp/trends/:id/reject      Admin reject a trend exercise
GET    /api/bootcamp/trends/stats           Trend statistics and insights
```

---

## G. Integration with Existing Systems

### Equipment Profiles (Phase 7)
- Boot camp classes use the same equipment profile system
- Equipment profile gets a new `location_type: 'bootcamp'` option
- Boot camp space profiles LINK to equipment profiles
- When generating a class, equipment available is pulled from the linked equipment profile

### Workout Variation Engine (Phase 8)
- Boot camp uses the same exercise rotation logic (don't repeat within 2 weeks)
- BUILD-BUILD-SWITCH pattern applies to boot camp class series too
- Week 1-2: Same class format with same exercises (BUILD)
- Week 3: Switch up exercises while keeping same muscle targets (SWITCH)

### Pain Management (ClientPainEntry)
- If trainer knows who's attending, pull their active pain entries
- Generate class-wide pain modification sheet
- Show on trainer's tablet: "3 clients with knee issues — knee mods highlighted"
- Trainer announces: "If you have knee issues, do the modification shown on the board"

### Form Analysis (Phase 1-2)
- During boot camp, trainer can record video of a client for post-class form review
- Boot camp exercises are in the same 81-exercise library
- Compensation data from form analysis feeds into boot camp exercise selection
  (e.g., if many clients show knee valgus, increase glute activation exercises)

### Admin Dashboard (Phase 9)
New widgets for boot camp:
- **Boot Camp Planner** — upcoming classes with auto-generated plans
- **Class History Feed** — recent classes with ratings and participation
- **Exercise Rotation Calendar** — visual calendar showing which exercises were used when
- **Trend Discovery Feed** — latest trending exercises awaiting approval

### Cross-Component Intelligence Layer (Phase 9)
- ClientIntelligenceService.getBootcampContext() — aggregates class attendee data
- Class-level compensation trends (most common issues across boot camp clients)
- Equipment utilization tracking (which equipment gets used most in classes)

---

## H. Frontend Components

### Boot Camp Dashboard (Admin)

```
Desktop (1440px+):
+-------------------------------------------+
| Boot Camp Command Center                   |
+-------------------------------------------+
| [+ New Class]  [Log Existing]  [Trends]   |
+-------------------------------------------+
|                                            |
| THIS WEEK'S SCHEDULE                       |
| ┌─────────────────────────────────────┐    |
| │ Mon: Lower Body | Format: 4x Stations│   |
| │ [VIEW] [EDIT] [GENERATE NEW]         │   |
| ├─────────────────────────────────────┤    |
| │ Tue: Upper Body | Format: Full Group │   |
| │ [VIEW] [EDIT] [GENERATE NEW]         │   |
| ├─────────────────────────────────────┤    |
| │ Wed: Cardio | Format: 2x7 Speed     │   |
| │ [VIEW] [EDIT] [GENERATE NEW]         │   |
| ├─────────────────────────────────────┤    |
| │ Thu: Full Body | Format: 3x5 Triple  │   |
| │ [VIEW] [EDIT] [GENERATE NEW]         │   |
| └─────────────────────────────────────┘    |
|                                            |
| ROTATION HEALTH                            |
| ┌─────────────────────────────────────┐    |
| │ Last 2 weeks: 47 unique exercises    │   |
| │ Freshness: 82% (exercises rotated)   │   |
| │ Staleness risk: Burpees used 6x      │   |
| │ Suggestion: Try "Bear Crawl to       │   |
| │ Push-up" instead                     │   |
| └─────────────────────────────────────┘    |
+-------------------------------------------+
```

### Class Builder View

```
3-Pane Layout (matches Workout Builder from Phase 9d):

Left: Class Config Panel (300px)
  - Class format selector (4 options)
  - Day type selector
  - Expected participants slider
  - Duration selector
  - Equipment profile dropdown
  - Space profile dropdown
  - [GENERATE CLASS] button (Swan Cyan gradient)

Center: Class Canvas (fluid)
  Station cards in a grid:
  ┌──────────────────────────┐
  │ STATION 1: Leg Press Zone │
  │ Setup time: 30s           │
  │ ┌────────────────────┐    │
  │ │ 1. Goblet Squat    │    │
  │ │    35s | Heavy DB   │    │
  │ │    Easy: Chair Squat│    │
  │ │    Hard: Jump Squat │    │
  │ │    Knee: Wall Sit   │    │
  │ ├────────────────────┤    │
  │ │ 2. Walking Lunges  │    │
  │ │    35s | Bodyweight  │    │
  │ ├────────────────────┤    │
  │ │ 3. Calf Raises     │    │
  │ │    35s | Bodyweight  │    │
  │ ├────────────────────┤    │
  │ │ 4. High Knees [C]  │    │
  │ │    35s | CARDIO      │    │
  │ └────────────────────┘    │
  └──────────────────────────┘

Right: AI Insights Panel (350px)
  - "Used 8 trending exercises from this month"
  - "Rotated out: bench press (used 3x last 2 weeks)"
  - "Added bear crawl push-up (trending on YouTube, NASM approved)"
  - "Overflow plan ready for 20+ participants"
  - Difficulty distribution chart
  - Time breakdown per station
```

### Printable Class Sheet

For the trainer to reference during class:
```
+----------------------------------------------------+
| MOVE FITNESS BOOT CAMP — Monday Lower Body          |
| Date: March 10, 2026 | Duration: 50 min            |
| Format: 4 exercises x 4 stations x 35 sec          |
+----------------------------------------------------+
| STATION 1          | STATION 2                      |
| 1. Goblet Squat    | 1. RDL (heavy DB)              |
|    E: Chair Squat  |    E: Good Morning             |
|    H: Jump Squat   |    H: Single-Leg RDL           |
|    K: Wall Sit     |    K: Hip Hinge (no weight)    |
| 2. Walking Lunges  | 2. Glute Bridge                |
| 3. Calf Raises     | 3. Band Side Steps             |
| 4. HIGH KNEES [C]  | 4. MOUNTAIN CLIMBERS [C]       |
|--------------------+--------------------------------|
| STATION 3          | STATION 4                      |
| 1. Step-Ups (bench)| 1. Sumo Squat (heavy DB)       |
|    ...             |    ...                          |
| 4. BURPEES [C]     | 4. JUMPING JACKS [C]           |
+----------------------------------------------------+
| OVERFLOW: Group B does parking lot laps (4 min)     |
| Lap circuit: Jog → Walking Lunges → Bear Crawl     |
+----------------------------------------------------+
| E = Easy  H = Hard  K = Knee mod  [C] = Cardio     |
+----------------------------------------------------+
```

---

## I. Implementation Checklist

### Phase 10a: Database Models + Migrations
- [ ] BootcampTemplate Sequelize model
- [ ] BootcampStation Sequelize model
- [ ] BootcampExercise Sequelize model (with difficulty tiers + pain mods)
- [ ] BootcampOverflowPlan Sequelize model
- [ ] BootcampClassLog Sequelize model
- [ ] BootcampSpaceProfile Sequelize model
- [ ] ExerciseTrend Sequelize model
- [ ] Migration file for all 7 tables
- [ ] Register in associations.mjs and index.mjs

### Phase 10b: Space Analysis Service
- [ ] Space photo/video upload to R2
- [ ] Gemini Flash Vision integration for space analysis
- [ ] Space profile CRUD service
- [ ] REST API endpoints for spaces

### Phase 10c: Boot Camp Generation Engine
- [ ] Station-based class generation algorithm
- [ ] Full group workout generation algorithm
- [ ] Overflow plan generation
- [ ] Exercise difficulty tier auto-generation
- [ ] Pain modification auto-generation
- [ ] Time calculation and validation
- [ ] Exercise rotation tracking (freshness engine)
- [ ] REST API endpoints for generation

### Phase 10d: Trend Research Engine
- [ ] Gemini-powered web search for trending exercises
- [ ] YouTube transcript analysis
- [ ] Reddit fitness community scraping
- [ ] NASM protocol rating system
- [ ] Impact level classification (low/medium/high/plyometric)
- [ ] Admin approval queue for discovered exercises
- [ ] REST API endpoints for trends

### Phase 10e: Existing Workout Logger
- [ ] CRUD for logging current boot camp workouts
- [ ] AI analysis of existing workout patterns
- [ ] Gap detection (neglected muscle groups)
- [ ] Rotation suggestions based on history
- [ ] REST API endpoints

### Phase 10f: Boot Camp Frontend
- [ ] Boot Camp Dashboard (command center view)
- [ ] Class Builder (3-pane layout matching Phase 9d)
- [ ] Station card components with difficulty tiers
- [ ] Space profile management UI
- [ ] Printable class sheet generator
- [ ] Trend discovery feed with approve/reject
- [ ] Exercise rotation calendar visualization
- [ ] Class history and rating log
- [ ] Mobile-responsive (tablet-first for gym floor use)

### Phase 10g: Integration Wiring
- [ ] Connect to Equipment Profiles (Phase 7)
- [ ] Connect to Variation Engine (Phase 8) for rotation logic
- [ ] Connect to Pain Management for class-wide pain mods
- [ ] Connect to Form Analysis for compensation trends
- [ ] Admin Dashboard widgets (Phase 9)
- [ ] Event bus: bootcamp.classCompleted, bootcamp.trendDiscovered

---

## J. Gemini 3.1 Pro Design Directives

### Critical Additions

#### "Floor Mode" — High-Contrast Active Class View
- Toggle between Builder Mode (Galaxy-Swan dark theme) and Floor Mode (high-contrast for gym glare)
- Floor Mode: `background: #000; color: #F8F9FA;` — maximum contrast
- Primary action buttons (Start Timer, Next Station, Swap Exercise): **64px minimum touch targets**
- Sweaty-hand ergonomics: larger hit areas, no small tap targets during live class

#### Offline Resilience
- Gym WiFi is unreliable — UI must handle offline gracefully
- Subtle pulsing amber border (`border: 2px solid rgba(255, 165, 0, 0.6); animation: pulse 2s infinite;`) when operating from local cache
- Class templates cached locally in IndexedDB for offline access

#### "Holographic Blueprint" — Space Analysis UX
- Upload state: dashed border dropzone `border: 2px dashed rgba(0, 255, 255, 0.3);`
- Processing: "Nebula Scan" effect — wireframe grid overlay sweeps across video, transitions into 2D blueprint
- Scanning line: `animation: scan 2s cubic-bezier(0.25, 1, 0.5, 1) infinite;` — 2px Swan Cyan gradient
- Result: SVG top-down gym map:
  - Obstacles: red hatched patterns
  - Usable zones: `fill: rgba(0, 255, 255, 0.1); stroke: #00FFFF;`
  - Station nodes: pulsing dots (`12px, border-radius: 50%, background: #00FFFF, box-shadow: 0 0 12px #00FFFF`)

#### "Magnetic Timeline" — Class Timeline Interaction
- Horizontal, magnetic track (inspired by Final Cut Pro)
- Drag exercises in — they snap into place, auto-recalculate durations
- Visual blocks: heavy exercises in Cosmic Purple, cardio in Swan Cyan
- `framer-motion <Reorder.Group>` for drag-and-drop

#### Progressive Disclosure for Difficulty Tiers
- Exercise blocks show small glowing indicator dots if modifications exist
- Tapping expands a glassmorphic drawer (`framer-motion` height animation, spring stiffness 300, damping 30)
- Color coding:
  - Easy/Mod: `color: #A0AEC0;` (muted)
  - Hard: `color: #FF4757;` (alert red)
  - Low-Impact Advanced: `color: #00FFFF; text-shadow: 0 0 8px rgba(0,255,255,0.4);`
- Pain mods: horizontal scrollable chips `border-radius: 16px; padding: 6px 12px; background: rgba(255,255,255,0.05);`

### Theme Tokens

```typescript
export const bootcampTokens = {
  stationHeavy: 'rgba(120, 81, 169, 0.15)',   // Cosmic Purple tint
  stationCardio: 'rgba(0, 255, 255, 0.15)',    // Swan Cyan tint
  glassPanel: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  blurHeavy: 'backdrop-filter: blur(24px) saturate(150%)',
  textHighContrast: '#F8F9FA',
};
```

### Layout Contexts

1. `<BuilderLayout>` — 1024px+ (Tablet Landscape/Desktop): 60/40 split view
   - Left (60%): Scrollable class timeline with `framer-motion <Reorder.Group>`
   - Right (40%): Tabbed interface (AI Suggestions | Full Library | Space Analysis)
2. `<FloorModeLayout>` — 768px+ (Tablet Portrait/Landscape): Maximized active view, 64px buttons
3. `<PrintableSheet>` — `@media print` CSS only

### Printable Class Sheet Specs
- Strip Galaxy theme for print — ink-saving grid
- 3-column CSS Grid layout
- Typography: Inter SemiBold, `#000000` on `#FFFFFF`
- Station numbers: `font-size: 24pt; font-weight: 800; border-bottom: 2px solid #000;`
- Pain modifications: standardized body-part icons (not text), mod exercise name in `10pt italic`

### Animation Specs
- Drag & drop: `scale: 1.02`, `box-shadow: 0 20px 40px rgba(0,0,0,0.5)`, `rotate: 1deg`
- AI generation cascade: `transition: { staggerChildren: 0.05 }` — stations fade + slide in from top
- All panel slides: `cubic-bezier(0.16, 1, 0.3, 1)` (Apple-like ease-out)

### Build Order (Gemini Directive)
1. Printable Class Sheet first (finalizes data structure)
2. BuilderLayout with 60/40 split and Magnetic Timeline
3. Space Analysis SVG blueprint (mock Gemini data first)
4. Floor Mode high-contrast toggle with 64px targets

---

*SwanStudios Boot Camp Class Builder v1.0*
*Designed for Sean Swan's Move Fitness boot camp classes*
*Gemini 3.1 Pro: Lead Design Authority | Claude: Lead Software Engineer*
