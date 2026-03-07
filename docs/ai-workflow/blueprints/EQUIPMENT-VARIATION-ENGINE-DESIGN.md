# Equipment Profile Manager + Workout Variation Engine
## SwanStudios AI Form Analysis — Phase 7 & 8 Design Document

### AI Village Review Request
This document defines two interconnected systems for the SwanStudios AI Form Analysis platform.
Please review for: security, architecture, code quality, UX, performance, and competitive gaps.

---

## SYSTEM 1: Equipment Profile Manager (Phase 7)

### Overview
Trainers photograph equipment at various training locations. AI identifies equipment, trainer approves labels, and the system maps equipment to exercises. This enables location-aware workout programming.

### Default Profiles (Built-in, Cannot Delete)
1. **Move Fitness** — Sean's primary gym, full commercial equipment
2. **Park / Outdoor** — Minimal/no equipment, bodyweight-focused by default
3. **Home Gym** — Basic home setup (dumbbells, bands, bench, pull-up bar)
4. **Client Home** — Varies per client, assessed on first visit

### Custom Profiles
- Trainers create additional profiles (e.g., "John's Home Gym", "Hotel Gym", "Beach Workout")
- Each profile stores: name, description, location type, equipment inventory, default exercise preferences

### Equipment Photo Upload + AI Recognition Flow
```
1. Trainer opens Equipment Profile (e.g., "Move Fitness")
2. Taps camera FAB button (56px, Swan Cyan gradient)
3. Camera view opens (custom viewfinder overlay with framing guide)
4. Snaps photo → image freezes
5. "Cosmic Scanning" animation (cyan line sweeps down image, 1.5s)
6. AI analyzes image via Gemini Flash Vision API:
   - Equipment name suggestion
   - Equipment category (free weights, machines, cables, bands, bodyweight, cardio, accessories)
   - Exercises this equipment supports (mapped to our 81-exercise library)
   - Bounding box coordinates for visual overlay
7. Glassmorphic bottom sheet slides up with:
   - Bounding box overlay on photo (Swan Cyan #00FFFF)
   - AI suggestion: "Adjustable Dumbbells (5-75 lbs)"
   - Category auto-filled
   - Trainer name input (pre-filled with AI suggestion, editable)
   - Trainer description of what it does (pre-filled with AI, editable)
   - "Edit" (ghost button) + "Confirm" (gradient button)
8. On Confirm → equipment saved to profile, mapped to exercises
9. Pending items appear in Admin Dashboard widget
```

### Database Schema
```sql
-- Training locations / equipment profiles
CREATE TABLE equipment_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id      UUID REFERENCES users(id),
  name            VARCHAR(100) NOT NULL,
  description     TEXT,
  location_type   VARCHAR(50) NOT NULL DEFAULT 'custom',
  -- location_type: 'gym', 'park', 'home', 'client_home', 'hotel', 'custom'
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  cover_photo_url VARCHAR(500),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Individual equipment items
CREATE TABLE equipment_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES equipment_profiles(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  ai_suggested_name VARCHAR(200),
  trainer_label   VARCHAR(200),       -- trainer's custom name if different
  description     TEXT,
  category        VARCHAR(50) NOT NULL,
  -- category: 'free_weights', 'machines', 'cables', 'bands', 'bodyweight',
  --           'cardio', 'accessories', 'stability', 'plyometric', 'other'
  photo_url       VARCHAR(500),
  ai_bounding_box JSONB,              -- {x, y, width, height} from AI vision
  ai_confidence   FLOAT,              -- 0.0-1.0 confidence score
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- approval_status: 'pending', 'approved', 'rejected', 'needs_review'
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  metadata        JSONB,              -- weight range, dimensions, brand, etc.
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equipment_items_profile ON equipment_items(profile_id);
CREATE INDEX idx_equipment_items_status ON equipment_items(approval_status);

-- Equipment-to-Exercise mapping (what exercises can this equipment do?)
CREATE TABLE equipment_exercise_map (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id    UUID REFERENCES equipment_items(id) ON DELETE CASCADE,
  exercise_name   VARCHAR(100) NOT NULL,  -- matches registry key
  is_primary      BOOLEAN DEFAULT FALSE,  -- is this the primary equipment for this exercise?
  resistance_type VARCHAR(50),            -- 'bodyweight', 'dumbbell', 'barbell', 'cable', 'band', 'machine'
  notes           TEXT,
  UNIQUE(equipment_id, exercise_name)
);

CREATE INDEX idx_equip_exercise_name ON equipment_exercise_map(exercise_name);
```

### AI Equipment Recognition (Gemini Flash Vision)
```python
# Backend: POST /api/equipment/scan
# Accepts: photo (multipart), profile_id
# Returns: AI analysis with equipment name, category, exercises, bounding box

async def scan_equipment(image_bytes: bytes) -> dict:
    """Use Gemini Flash Vision to identify gym equipment."""
    # Send image to Gemini 2.5 Flash with structured prompt
    prompt = """Analyze this gym/fitness equipment photo.
    Return JSON:
    {
      "equipment_name": "name of the equipment",
      "category": "free_weights|machines|cables|bands|bodyweight|cardio|accessories|stability|plyometric",
      "description": "what this equipment is used for",
      "exercises": ["list of exercise names this equipment supports"],
      "weight_range": "if applicable, e.g. '5-75 lbs'",
      "brand": "if visible",
      "bounding_box": {"x": 0.1, "y": 0.1, "width": 0.8, "height": 0.8}
    }"""
    # Cost: ~$0.001 per image scan via Gemini Flash
```

### Admin Dashboard Widget: "Equipment Intelligence"
```
+-----------------------------------------------+
|  Equipment Intelligence        [3 pending]     |
|-----------------------------------------------|
|  Move Fitness    | 47 items | 2 pending        |
|  Park / Outdoor  | 0 items  | Setup needed     |
|  Home Gym        | 12 items | All approved     |
|  Client Home     | 8 items  | 1 pending        |
|-----------------------------------------------|
|  Recent Activity:                              |
|  * Sean scanned 3 items at Move Fitness (2m)   |
|  * AI identified "Cable Machine" (5m)          |
|  * Form analysis: 12 videos processed (1h)     |
|  * New exercise variation suggested (2h)        |
+-----------------------------------------------+
```

### REST API Endpoints
```
POST   /api/equipment-profiles              Create profile
GET    /api/equipment-profiles              List all profiles (trainer-scoped)
GET    /api/equipment-profiles/:id          Get profile with equipment
PUT    /api/equipment-profiles/:id          Update profile
DELETE /api/equipment-profiles/:id          Delete custom profile (not defaults)

POST   /api/equipment-profiles/:id/scan     Upload photo + AI scan
GET    /api/equipment-profiles/:id/items    List equipment in profile
PUT    /api/equipment-items/:id             Update/approve equipment item
DELETE /api/equipment-items/:id             Remove equipment item

GET    /api/equipment-items/pending         All pending approvals (admin)
PUT    /api/equipment-items/:id/approve     Approve AI suggestion
PUT    /api/equipment-items/:id/reject      Reject AI suggestion

GET    /api/equipment/exercises-available?profile_id=X
       → Returns exercises available at this location
```

---

## SYSTEM 2: Workout Variation Engine (Phase 8)

### Overview
NASM-aligned exercise rotation system that keeps workouts fresh while maintaining progressive overload and corrective exercise programming.

### Sean Swan's 2-Week Rotation Principle
Based on 20+ years of training experience:

```
Week 1:
  Day 1 (Chest): Bench Press, Incline DB Press, Cable Fly     ← WORKOUT A (BUILD)
  Day 4 (Chest): Bench Press, Incline DB Press, Cable Fly     ← WORKOUT A (BUILD)

Week 2:
  Day 1 (Chest): Push-up, DB Floor Press, Band Chest Press    ← WORKOUT B (SWITCH!)
  Day 4 (Chest): Bench Press, Incline DB Press, Cable Fly     ← WORKOUT A (BUILD)

Pattern: BUILD → BUILD → SWITCH → BUILD → BUILD → SWITCH...
```

### Rules (NASM Priority Protocol)
1. **NASM CES is PRIMARY authority** — corrective programming never compromised
2. **Squat University is secondary reference**
3. SWITCH exercises must target the SAME muscle groups as BUILD exercises
4. SWITCH exercises must be available at the client's training location
5. If client has compensations (e.g., knee valgus), ALL variations must address it
6. Corrective continuum (inhibit/lengthen/activate/integrate) stays consistent
7. Exercise novelty — system tracks what was used recently, avoids repeats
8. NASM progression level — don't give advanced to beginner

### Equipment-Aware Substitution Logic
```
Input:
  - Original exercise: "bench_press"
  - Client's profile: "Park / Outdoor" (bodyweight only)
  - Client's compensations: ["shoulder_elevation"]
  - Muscles targeted: ["pectoralis_major", "anterior_deltoid", "triceps"]

Engine Logic:
  1. Query exercises targeting same muscles → [pushup, dips, chest_fly, cable_crossover, ...]
  2. Filter by equipment available at Park → [pushup, dips, pike_pushup]
  3. Filter out exercises that conflict with compensations → [pushup, dips] (pike_pushup ok too)
  4. Filter out recently used (last 2 sessions) → [dips] (pushup was used last time)
  5. Check NASM progression level → [dips] ✓ (client is Phase 3)
  6. Return suggestion with NASM confidence badge

Output:
  "dips" — [NASM: Stabilization Endurance Match] — targets same primary movers
```

### Database Schema
```sql
-- Workout templates (the planned workout)
CREATE TABLE workout_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id      UUID REFERENCES users(id),
  client_id       UUID REFERENCES users(id),
  name            VARCHAR(200) NOT NULL,
  body_parts      TEXT[] NOT NULL,          -- ['chest', 'triceps']
  nasm_phase      INTEGER DEFAULT 1,        -- 1-5 (OPT model phases)
  rotation_type   VARCHAR(20) DEFAULT 'standard',
  -- rotation_type: 'standard' (2:1), 'aggressive' (1:1), 'conservative' (3:1)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Individual exercises within a workout template
CREATE TABLE workout_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_name   VARCHAR(100) NOT NULL,
  sets            INTEGER DEFAULT 3,
  reps            VARCHAR(20) DEFAULT '10-12',
  rest_seconds    INTEGER DEFAULT 60,
  tempo           VARCHAR(20),             -- e.g., '3-1-2-0'
  sort_order      INTEGER NOT NULL,
  is_build        BOOLEAN DEFAULT TRUE,    -- TRUE = BUILD exercise, FALSE = can be swapped
  muscle_targets  TEXT[] NOT NULL,          -- ['pectoralis_major', 'anterior_deltoid']
  equipment_required VARCHAR(100),         -- equipment needed (or 'bodyweight')
  notes           TEXT
);

-- Workout variation log (tracks the rotation)
CREATE TABLE workout_variation_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID REFERENCES workout_templates(id),
  client_id       UUID REFERENCES users(id),
  session_date    DATE NOT NULL,
  rotation_position INTEGER NOT NULL,      -- 1=BUILD, 2=BUILD, 3=SWITCH
  exercises_used  JSONB NOT NULL,          -- snapshot of what was actually done
  variations_applied JSONB,                -- what was swapped and why
  profile_id      UUID REFERENCES equipment_profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variation_log_client ON workout_variation_log(client_id, session_date);

-- Exercise muscle mapping (which muscles each exercise targets)
CREATE TABLE exercise_muscle_map (
  exercise_name   VARCHAR(100) NOT NULL,
  muscle_group    VARCHAR(100) NOT NULL,
  role            VARCHAR(20) NOT NULL,    -- 'primary', 'secondary', 'stabilizer'
  PRIMARY KEY (exercise_name, muscle_group)
);
```

### Variation Engine API
```
POST   /api/variation/suggest
  Body: { template_id, profile_id, client_id }
  Returns: { original_exercises, suggested_swaps[], nasm_confidence, rotation_position }

POST   /api/variation/accept
  Body: { template_id, accepted_swaps[] }
  → Saves to workout_variation_log

GET    /api/variation/history?client_id=X&template_id=Y
  → Returns rotation history (BUILD/SWITCH pattern)

GET    /api/variation/timeline?client_id=X
  → Returns 2-week visual timeline data (for the 3-node indicator)
```

### NASM Muscle Group Taxonomy
For exercise-muscle mapping, use NASM's kinetic chain:
```
Lower Body:
  - quadriceps, hamstrings, gluteus_maximus, gluteus_medius,
  - adductors, hip_flexors, calves (gastrocnemius, soleus),
  - anterior_tibialis

Upper Body:
  - pectoralis_major, pectoralis_minor, anterior_deltoid,
  - lateral_deltoid, posterior_deltoid, latissimus_dorsi,
  - trapezius (upper, mid, lower), rhomboids, serratus_anterior,
  - biceps_brachii, brachialis, triceps_brachii,
  - rotator_cuff (infraspinatus, supraspinatus, teres_minor, subscapularis)

Core:
  - rectus_abdominis, transverse_abdominis, internal_oblique,
  - external_oblique, erector_spinae, multifidus, quadratus_lumborum
```

### Frontend UX Components

#### 2-Week Rotation Timeline (3-Node Indicator)
```
  [●]——————[●]——————[◆]
  BUILD     BUILD     SWITCH
  (purple)  (purple)  (cyan glow)

  Current position highlighted with pulse animation
```

#### SwapCard Component
```
Desktop (side-by-side):
  +------------------+    +------------------+
  | Push-up          | →  | Cable Crossover  |
  | (original)       |    | [NASM: Phase 2]  |
  | opacity: 0.6     |    | cyan border glow |
  +------------------+    +------------------+

Mobile (stacked):
  +------------------+
  | Push-up (orig)   |  ← muted
  +------------------+
         ↓
  +------------------+
  | Cable Crossover  |  ← highlighted
  | [NASM: Phase 2]  |
  +------------------+
```

---

## Integration: How Systems Connect

```
Equipment Profile → exercises available at location
                         ↓
Workout Template → planned exercises for client
                         ↓
Variation Engine → checks rotation position (BUILD or SWITCH?)
                         ↓
  If SWITCH: query available exercises at location
           → filter by muscle targets + compensations + novelty
           → rank by NASM phase match
           → present SwapCards to trainer
           → trainer approves/edits
           → log variation
                         ↓
Form Analysis → client records video of workout
              → AI scores each exercise
              → compensations feed back into Variation Engine
              → next SWITCH is even smarter
```

---

## Phase 7 Implementation Checklist
- [ ] 7a: Sequelize models + migrations (equipment_profiles, equipment_items, equipment_exercise_map)
- [ ] 7b: Seed default profiles (Move Fitness, Park, Home Gym, Client Home)
- [ ] 7c: Gemini Flash Vision integration for equipment scanning
- [ ] 7d: REST API (CRUD profiles, scan, approve/reject)
- [ ] 7e: Admin Dashboard widget (Equipment Intelligence)
- [ ] 7f: Mobile-first camera UI (custom viewfinder, cosmic scanning animation)
- [ ] 7g: Equipment approval flow (bottom sheet, bounding box overlay)
- [ ] 7h: Equipment-to-exercise auto-mapping

## Phase 8 Implementation Checklist
- [ ] 8a: Sequelize models + migrations (workout_templates, workout_exercises, variation_log, exercise_muscle_map)
- [ ] 8b: Seed exercise-muscle mapping for all 81 exercises
- [ ] 8c: Variation Engine core logic (substitution algorithm)
- [ ] 8d: REST API (suggest, accept, history, timeline)
- [ ] 8e: 2-Week Rotation Timeline component
- [ ] 8f: SwapCard + NASM confidence badge components
- [ ] 8g: Integration with Equipment Profiles (location-aware suggestions)
- [ ] 8h: Integration with Form Analysis (compensation-aware suggestions)
