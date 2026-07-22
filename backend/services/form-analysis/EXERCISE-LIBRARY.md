# SwanStudios AI Form Analysis - Exercise Library

## Overview

SwanStudios AI Form Analysis supports **81 unique exercises** across **14 NASM-aligned categories**, with **150+ aliases** for flexible input (e.g., "rdl", "romanian_deadlift", "stiff_leg_deadlift" all resolve to the same engine). Every exercise is built on **NASM CES (Corrective Exercise Specialist)**, **NASM PES (Performance Enhancement Specialist)**, and **Squat University** biomechanics standards.

---

## Built-In Exercise Library (81 Exercises)

### 1. Squat Patterns (6 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| squat | back_squat, bodyweight_squat, air_squat | knee_flexion | CES Overhead Squat Assessment |
| goblet_squat | | knee_flexion | CES corrective tool (counterbalance) |
| front_squat | | knee_flexion | PES thoracic extension demand |
| overhead_squat | ohs | knee_flexion | CES gold standard movement assessment |
| sumo_squat | | knee_flexion | PES adductor/glute emphasis |
| split_squat | | knee_flexion | CES single-leg progression |

**Form Checks:** Depth (hip crease below knee), forward lean (LPHC), knee valgus (adductor/TFL overactivity), heel rise (ankle dorsiflexion), lateral shift, bilateral asymmetry. Overhead squat adds arms-fall-forward checkpoint.

### 2. Hip Hinge / Deadlift (7 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| deadlift | conventional_deadlift | hip_flexion | CES hip hinge assessment |
| sumo_deadlift | | hip_flexion | PES wide-stance posterior chain |
| romanian_deadlift | rdl, stiff_leg_deadlift | hip_flexion | CES hamstring length assessment |
| good_morning | | hip_flexion | RDL variant (stricter back position) |
| kettlebell_swing | kb_swing | hip_flexion | PES ballistic hip hinge |
| hip_thrust | barbell_hip_thrust | hip_flexion | PES glute activation |
| glute_bridge | | hip_flexion | CES glute activation baseline |

**Form Checks:** Lumbar flexion (back rounding), hip hinge quality (squat vs stiff-leg pattern), lockout (glute activation), bilateral hip symmetry, shoulder level, knee valgus (sumo).

### 3. Lunge / Single-Leg (6 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| forward_lunge | lunge | knee_flexion | CES single-leg squat assessment |
| reverse_lunge | | knee_flexion | CES deceleration pattern |
| walking_lunge | | knee_flexion | PES dynamic stability |
| lateral_lunge | side_lunge | knee_flexion | Frontal-plane stability |
| bulgarian_split_squat | bss, rear_foot_elevated_split_squat | knee_flexion | CES advanced single-leg |
| step_up | | knee_flexion | PES single-leg strength |

**Form Checks:** Depth (90-deg front knee), knee valgus (primary CES checkpoint), trunk lean, hip drop/Trendelenburg (glute medius), knee asymmetry, heel rise.

### 4. Horizontal Push (4 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| pushup | push_up, push-up | elbow_flexion | CES upper body pushing |
| bench_press | flat_bench_press, barbell_bench_press, dumbbell_bench_press | elbow_flexion | PES horizontal push |
| incline_press | incline_bench_press | elbow_flexion | PES upper chest emphasis |
| dips | tricep_dips, chest_dips | elbow_flexion | PES vertical push bodyweight |

**Form Checks:** Depth (elbow at 90-deg), hip sag (anterior pelvic tilt), hip pike, elbow flare (impingement risk), head position (cervical), bilateral elbow symmetry, shoulder elevation.

### 5. Vertical Push (3 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| overhead_press | ohp, military_press, barbell_press, shoulder_press | shoulder_flexion | CES arms-overhead checkpoint |
| push_press | | shoulder_flexion | PES power push with leg drive |
| dumbbell_shoulder_press | db_shoulder_press, arnold_press | shoulder_flexion | PES unilateral pressing |

**Form Checks:** Lockout (full overhead extension), lumbar hyperextension (rib flare), shoulder elevation/shrugging, elbow flare, bilateral shoulder symmetry.

### 6. Horizontal Pull (4 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| bent_over_row | barbell_row, pendlay_row | elbow_flexion | CES pulling pattern |
| single_arm_row | dumbbell_row, one_arm_row | elbow_flexion | PES unilateral pull |
| cable_row | seated_row, seated_cable_row | elbow_flexion | PES scapular retraction |
| face_pull | | elbow_flexion | CES posterior shoulder health |

**Form Checks:** Back position (maintain hip hinge), pull height (full ROM), shoulder shrugging (upper trap dominance), bilateral symmetry, posture.

### 7. Vertical Pull (3 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| pull_up | pullup, pull-up | elbow_flexion | CES vertical pulling |
| chin_up | chinup, chin-up | elbow_flexion | PES bicep-dominant pull |
| lat_pulldown | lat_pull_down | elbow_flexion | PES assisted vertical pull |

**Form Checks:** Full ROM (chin above bar / full extension at bottom), shoulder shrugging, bilateral symmetry, excessive lean back (lat pulldown).

### 8. Core / Anti-Movement (7 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| plank | forearm_plank, high_plank | hip_flexion | CES core stabilization baseline |
| side_plank | | hip_flexion | CES lateral subsystem |
| dead_bug | deadbug | knee_flexion | CES TVA activation |
| crunch | sit_up, situp | hip_flexion | Spinal flexion (controlled) |
| russian_twist | | elbow_flexion | PES rotational power |
| mountain_climber | mountain_climbers | knee_flexion | PES dynamic core stability |
| leg_raise | hanging_leg_raise, lying_leg_raise | hip_flexion | Hip flexion + core stabilization |

**Form Checks:** Hip sag/pike (plank alignment), head position, shoulder level, back arching (dead bug), neck pull (crunch), rotation symmetry, leg symmetry.

### 9. Upper Body Isolation (9 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| bicep_curl | bicep_curls, dumbbell_curl, barbell_curl | elbow_flexion | CES elbow flexion |
| hammer_curl | | elbow_flexion | PES brachialis emphasis |
| tricep_extension | skull_crusher, overhead_tricep_extension | elbow_flexion | PES elbow extension |
| tricep_pushdown | | elbow_flexion | PES cable tricep |
| lateral_raise | side_raise, dumbbell_lateral_raise | shoulder_flexion | PES medial deltoid |
| front_raise | dumbbell_front_raise | shoulder_flexion | PES anterior deltoid |
| rear_delt_fly | reverse_fly, rear_delt_raise | shoulder_flexion | CES posterior shoulder |
| chest_fly | dumbbell_fly, pec_fly | shoulder_flexion | PES pec isolation |
| shrug | barbell_shrug, dumbbell_shrug | shoulder_flexion | Upper trapezius isolation |

**Form Checks:** Body swing/momentum (main isolation compensation), lean back, full ROM, elbow drift (curls), elbow flare (extensions), shoulder shrugging, bilateral symmetry.

### 10. Lower Body Isolation (3 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| calf_raise | standing_calf_raise, seated_calf_raise | ankle_dorsiflexion | CES ankle assessment |
| leg_extension | | knee_flexion | PES quad activation |
| leg_curl | hamstring_curl, lying_leg_curl, seated_leg_curl | knee_flexion | PES hamstring activation |

**Form Checks:** Full ROM, knee straightness (calf raise), hip lift compensation (leg curl), bilateral asymmetry.

### 11. Stability Ball (6 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| stability_ball_crunch | swiss_ball_crunch | hip_flexion | CES proprioceptive core |
| stability_ball_hamstring_curl | swiss_ball_hamstring_curl | knee_flexion | CES hamstring + hip extension |
| stability_ball_pushup | swiss_ball_pushup | elbow_flexion | PES reactive stabilization |
| stability_ball_back_extension | | hip_flexion | CES posterior chain activation |
| stability_ball_plank | swiss_ball_plank | hip_flexion | PES advanced core |
| wall_ball_squat | wall_squat | knee_flexion | CES corrective squat |

**Form Checks:** Hip shift on ball, hip drop during curl, enhanced sag detection (unstable surface amplifies compensations), hyperextension control, shoulder alignment.

### 12. Resistance Band (6 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| banded_squat | band_squat | knee_flexion | CES corrective squat with band cue |
| band_pull_apart | banded_pull_apart | shoulder_flexion | CES scapular stabilization |
| banded_glute_kickback | band_kickback | hip_flexion | CES glute activation |
| banded_lateral_walk | monster_walk, crab_walk | knee_flexion | CES glute medius activation |
| banded_hip_thrust | | hip_flexion | CES combined glute max + med |
| banded_row | band_row | elbow_flexion | CES scapular retraction |

**Form Checks:** Knee valgus (the whole point of banded squats), trunk movement, hip rotation (kickbacks), maintaining athletic position (lateral walk), shoulder shrugging.

### 13. Cable Machine (7 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| cable_crossover | cable_fly | shoulder_flexion | PES pec constant tension |
| cable_woodchop | wood_chop | shoulder_flexion | PES rotational power |
| cable_kickback | cable_glute_kickback | hip_flexion | CES glute activation |
| cable_lateral_raise | | shoulder_flexion | PES medial deltoid |
| cable_curl | cable_bicep_curl | elbow_flexion | PES constant tension curl |
| cable_tricep_extension | cable_pushdown | elbow_flexion | PES tricep isolation |
| cable_pull_through | | hip_flexion | CES hip hinge corrective |

**Form Checks:** Elbow lock (crossover/fly), body lean/momentum, rotation control (woodchop), hip rotation (kickback), standing posture, elbow flare.

### 14. Bodyweight Calisthenics (10 exercises)
| Exercise | Aliases | Primary Angle | NASM Standard |
|----------|---------|---------------|---------------|
| burpee | burpees | hip_flexion | PES integrated plyometric |
| jump_squat | squat_jump | knee_flexion | PES lower body reactive power |
| box_jump | | knee_flexion | PES plyometric landing mechanics |
| pistol_squat | single_leg_squat | knee_flexion | CES advanced single-leg |
| pike_pushup | pike_push_up | elbow_flexion | PES bodyweight vertical push |
| wall_sit | | knee_flexion | CES isometric quad endurance |
| hollow_body_hold | hollow_hold | hip_flexion | CES anti-extension |
| superman | superman_hold, back_extension | hip_flexion | CES posterior chain |
| inverted_row | bodyweight_row, australian_pullup | elbow_flexion | PES bodyweight horizontal pull |
| bear_crawl | | knee_flexion | PES contralateral locomotion |

**Form Checks:** Hip sag in plank phase (burpee), knee valgus on landing (plyometrics), depth before jump, forward lean, heel rise (pistol), body alignment (inverted row), hip height/rocking (bear crawl).

---

## NASM Corrective Exercise Framework

Every detected compensation maps to the **NASM CES 4-Step Corrective Continuum:**

| Step | Name | Purpose | Example |
|------|------|---------|---------|
| 1 | **Inhibit** | Foam roll overactive muscles | Foam roll adductors (30-60 sec) |
| 2 | **Lengthen** | Static stretch overactive muscles | Adductor stretch (30 sec each) |
| 3 | **Activate** | Isolated strengthening of underactive muscles | Side-lying hip abduction (2x15) |
| 4 | **Integrate** | Full-body movement pattern retraining | Banded bodyweight squat (2x10) |

**Built-in corrective protocols for 8 compensation types:**
- Knee Valgus
- Anterior Lean (Excessive Forward Lean)
- Heel Rise (Limited Ankle Dorsiflexion)
- Hip Shift (Lateral)
- Back Rounding (Lumbar Flexion Under Load)
- Shoulder Elevation (Shrugging)
- Bilateral Movement Asymmetry
- Hip Sag (Anterior Pelvic Tilt in Push-up/Plank)

---

## Custom Exercise Training System

### The Problem
81 exercises cover the most popular movements, but experienced NASM-protocol trainers work with hundreds of exercise variations. Trainers need to add new exercises without writing Python code.

### AI Village Research Summary
**Gemini 3.1 Pro (Lead Design Authority)** was consulted on the optimal approach. Full design spec saved at `AI-Village-Documentation/gemini-consults/latest.md`.

### The Solution: "The Biomechanics Studio"
A split-pane live workspace in the admin panel that lets trainers visually define new exercises with real-time MediaPipe validation.

### Architecture Decision: PostgreSQL + JSONB (Gemini-Approved)

**Why JSONB over JSON files on disk:**
- Relational integrity (links to TrainerId, AnalysisHistory)
- Tenant isolation (trainer-specific exercises)
- Backup/restore through standard DB tools
- Version control through append-only rows

**Database Schema:**
```sql
CREATE TABLE custom_exercises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id      UUID REFERENCES users(id),
  base_template_id UUID REFERENCES custom_exercises(id),  -- NULL if built from scratch
  name            VARCHAR(100) NOT NULL,
  display_name    VARCHAR(200) NOT NULL,
  nasm_category   VARCHAR(50) NOT NULL,                   -- squat_patterns, hip_hinge, etc.
  version         INTEGER NOT NULL DEFAULT 1,
  is_latest       BOOLEAN NOT NULL DEFAULT TRUE,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  mechanics_schema JSONB NOT NULL,                         -- Full rule definition
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_custom_exercises_trainer ON custom_exercises(trainer_id);
CREATE INDEX idx_custom_exercises_latest ON custom_exercises(is_latest) WHERE is_latest = TRUE;
CREATE INDEX idx_custom_exercises_category ON custom_exercises(nasm_category);
```

**mechanics_schema JSONB Structure:**
```json
{
  "rep_detection": {
    "primary_angle": "left_knee_flexion",
    "bottom_threshold": 90.0,
    "top_threshold": 160.0
  },
  "form_rules": [
    {
      "id": "depth_check",
      "checkpoint": "knee",
      "rule_type": "angle_threshold",
      "joint_angle_key": "left_knee_flexion",
      "operator": ">",
      "threshold": 110.0,
      "severity": "warning",
      "weight": 1.5,
      "message": "Partial depth -- lower until knees reach 90 degrees",
      "nasm_overactive": ["Hip flexor complex"],
      "nasm_underactive": ["Gluteus maximus"]
    },
    {
      "id": "knee_valgus",
      "checkpoint": "knee",
      "rule_type": "landmark_deviation",
      "landmark_pairs": [[25, 27], [26, 28]],
      "axis": "x",
      "threshold": 0.05,
      "severity": "error",
      "weight": 2.0,
      "message": "Knee caving inward -- push knee over 2nd/3rd toe"
    }
  ],
  "corrective_mapping": {
    "knee_valgus": true,
    "anterior_lean": false,
    "heel_rise": true
  }
}
```

### UX Design (Gemini 3.1 Pro Design Authority)

#### Split-Pane Live Workspace
- **Left Pane:** 4-step vertical accordion wizard
  1. **Metadata & NASM Mapping** -- Name, category, kinetic chain checkpoints
  2. **Rep Mechanics** -- Primary joint selection (interactive SVG body map), ROM thresholds
  3. **Form Rules** -- Block-based NASM-aligned rule builder (not code)
  4. **Review & Publish** -- Test validation gate before going live

- **Right Pane:** Persistent video player/webcam with live MediaPipe skeleton overlay
  - Threshold adjustments on left instantly update visual overlays on right
  - Angle arcs rendered in Swan Cyan (#00FFFF)
  - Rule triggers flash Cosmic Purple (#7851A9)

#### Rule Builder UX: Block-Based Templates (NOT Drag-and-Drop)
Trainers select from **NASM Kinetic Chain Checkpoints:**
- **Foot/Ankle:** Heel lift, Foot turn-out
- **Knee:** Valgus, Varus, Tracking
- **LPHC:** Anterior pelvic tilt, Lateral shift, Rotation
- **Shoulders/Thoracic:** Rounding, Elevation, Asymmetry
- **Head/Neck:** Forward head, Cervical alignment

Each rule block has:
- **Threshold Slider** with real-time visual feedback on skeleton
- **Severity Toggle** (Minor/Major)
- **Cue Text** (what the client sees/hears)
- **NASM Muscle Mapping** (optional: overactive/underactive muscles)

#### MediaPipe Validation Sandbox
- Trainer uploads 5-second reference video or uses webcam
- MediaPipe runs client-side in browser
- Swan Cyan skeleton overlay with interactive angle arcs
- **Validation Gate:** Exercise cannot be published until rep-counter fires at least once in sandbox

#### Versioning: Append-Only Immutable Records
- Editing a published exercise creates a NEW version (INSERT, not UPDATE)
- Old versions remain linked to historical analysis sessions
- Clients never see retroactive score changes

#### Multi-Device Strategy
| Screen | Experience |
|--------|-----------|
| Desktop & Large Tablets (1024px+) | Full Biomechanics Studio -- split-pane layout |
| Standard Tablets (768-1023px) | Left pane full-width + floating PiP video sandbox |
| Mobile (320-767px) | **Read-only / Quick Tweak** -- view exercises, duplicate templates, adjust thresholds only |

### Integration: Custom Exercises in the Analysis Pipeline

When `POST /analyze-exercise` receives an exercise name:
1. Check built-in registry (81 exercises, instant lookup)
2. If not found, query `custom_exercises` table (WHERE name = ? AND is_latest = TRUE)
3. Hydrate a `DynamicRuleEngine` from the `mechanics_schema` JSONB
4. Run through the same pipeline: pose -> angles -> patterns -> rules -> reps -> corrections -> Gemini feedback

**DynamicRuleEngine class** (to be implemented in Phase 6):
```python
class DynamicRuleEngine(ExerciseRuleEngine):
    """Rule engine hydrated from JSONB mechanics_schema."""

    def __init__(self, schema: dict):
        self.exercise_name = schema.get("name", "custom")
        self.rep_angle_key = schema["rep_detection"]["primary_angle"]
        self.rep_bottom_threshold = schema["rep_detection"]["bottom_threshold"]
        self.rep_top_threshold = schema["rep_detection"]["top_threshold"]
        self._rules = schema.get("form_rules", [])

    def evaluate(self, joint_angles: dict, landmarks: list[dict]) -> list[FormCue]:
        cues = []
        for rule in self._rules:
            if rule["rule_type"] == "angle_threshold":
                self._eval_angle_rule(rule, joint_angles, cues)
            elif rule["rule_type"] == "landmark_deviation":
                self._eval_landmark_rule(rule, landmarks, cues)
        return cues
```

### Template System
Trainers can duplicate any built-in exercise and modify it:
1. Select exercise from library (e.g., "squat")
2. Click "Create Variation"
3. System pre-populates all rules from SquatRules
4. Trainer adjusts thresholds, adds/removes rules
5. Saves as "Pause Squat" or "Tempo Squat" etc.

### Implementation Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | 81 built-in exercises (current) | COMPLETE |
| 6a | CustomExercises Sequelize model + migration | PLANNED |
| 6b | DynamicRuleEngine (JSONB -> Python rule engine) | PLANNED |
| 6c | REST API: CRUD endpoints for custom exercises | PLANNED |
| 6d | Biomechanics Studio frontend (React + styled-components) | PLANNED |
| 6e | Live MediaPipe sandbox with threshold visualization | PLANNED |
| 6f | Template system (duplicate + modify built-in exercises) | PLANNED |
| 6g | Validation gate (must test before publish) | PLANNED |
| 6h | Multi-device responsive adaptation | PLANNED |

---

## API Reference

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/analyze-exercise` | Full analysis pipeline (video + exercise name) |
| `POST` | `/analyze-image` | Single-frame pose + angles |
| `POST` | `/analyze-video` | Multi-frame pose + angles |
| `GET` | `/exercises` | List all exercises with categories |
| `GET` | `/health` | Health check |
| `GET` | `/ready` | Readiness check |

### Exercise Input
The `/analyze-exercise` endpoint accepts exercise names in any format:
- Underscores: `romanian_deadlift`
- Spaces: `romanian deadlift`
- Hyphens: `romanian-deadlift`
- Aliases: `rdl`
- Case-insensitive: `Romanian_Deadlift`

All inputs are normalized to underscore_lowercase before registry lookup.

### Response Structure
```json
{
  "exercise": "squat",
  "total_reps": 8,
  "avg_score": 82.5,
  "rep_scores": [95.0, 90.0, 85.0, 82.0, 80.0, 78.0, 75.0, 73.0],
  "reps": [
    {
      "rep_number": 1,
      "score": 95.0,
      "min_angle": 88.5,
      "max_angle": 172.0,
      "eccentric_duration": 2.1,
      "concentric_duration": 1.3,
      "cues": [
        {"rule": "good_depth", "message": "Full depth -- hip crease below knee", "severity": "good"}
      ]
    }
  ],
  "fatigue_detected": true,
  "fatigue_onset_rep": 5,
  "tempo_analysis": {
    "avg_eccentric_sec": 2.0,
    "avg_concentric_sec": 1.4,
    "tempo_ratio": 1.43
  },
  "compensations": [
    {"type": "knee_valgus", "severity": "warning", "frequency": 0.4, "frames": [12, 15, 18]}
  ],
  "corrective_recommendations": [
    {
      "for_compensation": "knee_valgus",
      "severity": "warning",
      "protocol_name": "Knee Valgus (medial knee collapse)",
      "overactive_muscles": ["Adductor complex", "TFL / IT band"],
      "underactive_muscles": ["Gluteus medius", "VMO"],
      "corrective_continuum": {
        "1_inhibit": [{"exercise": "Foam roll adductors", "duration": "30-60 sec each side"}],
        "2_lengthen": [{"exercise": "Adductor stretch", "duration": "30 sec each side"}],
        "3_activate": [{"exercise": "Side-lying hip abduction", "sets_reps": "2x15 each side"}],
        "4_integrate": [{"exercise": "Banded bodyweight squat", "sets_reps": "2x10"}]
      }
    }
  ],
  "coaching_feedback": {
    "source": "gemini_flash",
    "feedback": "Good set overall. Your depth is solid on the first few reps..."
  }
}
```

---

## Equipment Profile System (Phase 7)

### Overview
Location-based equipment inventories with AI photo recognition. Enables the system to know what equipment is available where, so workout programming and the variation engine can make smart location-aware suggestions.

### Default Profiles (Built-in)
| Profile | Description | Default Exercises |
|---------|-------------|-------------------|
| **Move Fitness** | Sean's primary gym, full commercial equipment | All 81 exercises available |
| **Park / Outdoor** | Minimal/no equipment | Bodyweight calisthenics, lunges, squats |
| **Home Gym** | Basic home setup | Dumbbell exercises, band exercises, bodyweight |
| **Client Home** | Varies per client | Assessed on first visit, custom inventory |

### Equipment Photo + AI Recognition Flow
1. Trainer photographs equipment at location
2. Gemini Flash Vision API identifies: name, category, supported exercises, bounding box
3. Glassmorphic bottom sheet shows AI suggestion with bounding box overlay
4. Trainer approves/edits/rejects
5. Approved equipment mapped to exercises automatically
6. **Admin dashboard widget** shows pending approvals with pulsing badge

### Equipment Categories
`free_weights` | `machines` | `cables` | `bands` | `bodyweight` | `cardio` | `accessories` | `stability` | `plyometric` | `other`

### Design Spec
Full design by Gemini 3.1 Pro: `AI-Village-Documentation/gemini-consults/latest.md`
Full technical spec: `docs/ai-workflow/blueprints/EQUIPMENT-VARIATION-ENGINE-DESIGN.md`

---

## Workout Variation Engine (Phase 8)

### Sean Swan's 2-Week Rotation Principle
Based on 20+ years of training experience. Keeps workouts fresh while maintaining progressive overload.

```
Pattern: BUILD -> BUILD -> SWITCH -> BUILD -> BUILD -> SWITCH...

BUILD: Same exercises (progressive overload, strength building)
SWITCH: Different exercises targeting SAME muscles (shock the system, keep interest)
```

### How It Works
1. Trainer creates workout template (e.g., "Chest Day") with target muscles
2. System tracks rotation position (BUILD or SWITCH)
3. On SWITCH days, the Variation Engine:
   - Finds exercises targeting the same muscles
   - Filters by equipment available at client's training location
   - Excludes exercises conflicting with client's compensations
   - Excludes recently used exercises (last 2 sessions)
   - Matches NASM progression level
   - Presents SwapCard UI with NASM confidence badges

### Equipment-Aware Substitution Example
```
Original: Bench Press (at Move Fitness, full equipment)
Client trains at Park → System suggests: Push-up, Dips
Client trains at Home → System suggests: Dumbbell Floor Press, Band Chest Press
Client trains at Move Fitness → System suggests: Cable Crossover, Incline DB Press
```

### NASM Priority Protocol
1. **NASM CES is PRIMARY authority** -- corrective programming NEVER compromised
2. Squat University is secondary reference
3. SWITCH exercises must target SAME muscle groups as BUILD exercises
4. Corrective continuum stays consistent even when exercises rotate
5. If client has compensations, ALL variations must still address them

### Configurable Rotation Patterns
| Pattern | Ratio | Description |
|---------|-------|-------------|
| **Standard** | 2:1 | BUILD-BUILD-SWITCH (default) |
| **Aggressive** | 1:1 | BUILD-SWITCH-BUILD-SWITCH |
| **Conservative** | 3:1 | BUILD-BUILD-BUILD-SWITCH |

### AI Village Validation Results (8/8 PASS)
Key feedback incorporated:
- **Security:** Rate limiting on AI scans (10/hr per trainer), JWT/RBAC on all endpoints, JSON schema validation
- **Architecture:** Optimistic locking on variation suggestions, soft-delete for profiles, pagination
- **Competitive:** NASM clinical logic is key differentiator vs Trainerize/TrueCoach; AI equipment scanning is unique
- **UX:** "Cosmic Scanning" animation, haptic feedback, bounding box reveal, SwapCard with NASM badges

---

## File Structure

```
backend/services/form-analysis/
  analyzers/
    exercise_rules/
      __init__.py
      base.py              # ExerciseRuleEngine base class + FormCue
      registry.py           # Master registry (81 exercises, 150+ aliases)
      squat.py              # Squat, goblet, front, overhead, sumo, split
      deadlift.py           # Conventional, sumo deadlift
      pushup.py             # Push-up (all variants)
      lunge.py              # Forward, reverse, walking, lateral, BSS, step-up
      hip_hinge.py          # RDL, good morning, KB swing, hip thrust, glute bridge
      press.py              # OH press, push press, bench press, incline, dips, DB press
      pull.py               # Bent-over row, pull-up, chin-up, lat pulldown, cable row, face pull
      core.py               # Plank, side plank, dead bug, crunch, Russian twist, mountain climber, leg raise
      isolation.py          # Bicep curl, tricep ext, lateral raise, calf raise, leg ext/curl, chest fly, shrug
      stability_ball.py     # Ball crunch, hamstring curl, pushup, back ext, plank, wall squat
      band.py               # Banded squat, pull-apart, kickback, lateral walk, hip thrust, row
      cable.py              # Crossover, woodchop, kickback, lateral raise, curl, pushdown, pull-through
      calisthenics.py       # Burpee, jump squat, box jump, pistol, pike pushup, wall sit, superman, etc.
    angle_calculator.py     # 15 joint angle calculations
    corrective_recommendations.py  # NASM CES 4-step continuum (8 protocols)
    pattern_detector.py     # Compensatory pattern detection (6 detectors)
    pose_estimator.py       # MediaPipe Pose wrapper
    rep_counter.py          # State machine rep detection + fatigue analysis
  feedback/
    gemini_feedback.py      # Gemini Flash coaching integration
    prompts.py              # System prompts for Gemini + Claude
  main.py                   # FastAPI app with all endpoints
  models.py                 # Pydantic response models
  config.py                 # Configuration (Pydantic Settings)
  EXERCISE-LIBRARY.md       # This file
```
