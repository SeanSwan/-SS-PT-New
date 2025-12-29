# NASM-Aligned Training System × 4-Tier User Hierarchy
## SwanStudios Complete Integration Blueprint

**Version**: 4.0 - NASM + 4-Tier Architecture
**Date**: November 12, 2025
**Status**: Comprehensive Implementation Plan
**AI Village Contributors**: Claude Code, Kilo Code, Gemini Code Assist

---

## 🎯 Executive Summary

This blueprint integrates NASM's evidence-based OPT™ (Optimum Performance Training) model with SwanStudios' 4-tier user hierarchy (User → Client → Trainer → Admin). This creates a competitive advantage through:

1. **Scientific Credibility**: NASM-aligned programming across all tiers
2. **Clear Value Progression**: Free tier (Phase 1 only) → Paid tier (Full OPT access)
3. **Trainer Quality Assurance**: Certification-gated features and compliance monitoring
4. **Business Model Alignment**: NASM methodology drives User → Client conversion

---

## 📊 NASM × 4-Tier Access Matrix

### Tier 1: User (Free - Social Media Only) 🆓

**NASM Access**:
- ✅ Phase 1 (Stabilization Endurance) workouts only
- ✅ Generic workout templates (1 per week)
- ✅ Basic self-assessment tool (posture screening)
- ✅ Educational content (OPT model overview)
- ❌ No personalized phase progression
- ❌ No corrective exercise protocols
- ❌ No trainer interaction

**Rationale**: Phase 1 is safest for unsupervised training (low intensity, focus on form). Limits injury risk while demonstrating NASM value.

**Conversion Strategy**:
- Show Phase 2-5 teasers ("Unlock Power Training with a Client Plan")
- Offer free movement assessment consultation (lead generation)
- Display "NASM-Trained Client" badges on social profiles

**Dashboard Features**:
- `/dashboard/user` → "NASM Workout of the Week" widget
- Self-assessment tool with CTA: "Get a full professional assessment"
- Educational cards: "What is the OPT™ Model?"

---

### Tier 2: Client (Paid - Personal Training) 💰

**NASM Access**:
- ✅ **Full OPT Model Access** (Phases 1-5)
- ✅ **Personalized Phase Progression** (trainer-guided)
- ✅ **Corrective Exercise Protocols** (CEx Continuum)
- ✅ **Movement Assessments** (OHS, Single-Leg Squat, Push/Pull)
- ✅ **Homework Assignments** (corrective exercises with compliance tracking)
- ✅ **Phase-Contextual Progress Charts** (volume in P3, 1RM in P4, power in P5)

**Rationale**: Paid tier unlocks the full NASM system with professional oversight. Justifies premium pricing through science-backed programming.

**Success Metrics**:
- **Phase Adherence**: 90%+ workouts align with current phase acute variables
- **Progression Rate**: 85%+ clients advance through phases on schedule
- **Injury Rate**: <2% report pain flags during training
- **Satisfaction**: 90%+ rate training as "effective and safe"

**Dashboard Features**:
- `/dashboard/client` → "My Training Phase" widget (current phase, purpose, progress)
- Workout display with exercise rationale ("Why this exercise?")
- Corrective homework tracker with gamification (streaks, XP rewards)
- Phase progression timeline (visual OPT journey)

---

### Tier 3: Trainer (Employee - Service Provider) 💼

**NASM Access**:
- ✅ **All Client Features** (can train themselves)
- ✅ **Client Management Tools** (assign phases, track progression)
- ✅ **Workout Builder** (phase-aware, auto-validates acute variables)
- ✅ **Assessment Module** (digital OHS/SL squat forms, AI compensation detection)
- ✅ **Corrective Protocol Library** (UCS, LCS, PDS templates)
- ✅ **Certification-Gated Features**:
  - **NASM-CPT (Required)**: Access to Phases 1-3
  - **NASM-CES (Advanced)**: Unlock Corrective Exercise Builder
  - **NASM-PES (Elite)**: Access to Phases 4-5 (Max Strength & Power)

**Rationale**: Trainers need tools to efficiently create NASM-compliant programs. Certification requirements ensure quality and incentivize professional development.

**Compliance Metrics** (Admin tracks):
- **Phase Adherence Score**: % of workouts with correct acute variables
- **Corrective Usage Rate**: % of clients with compensations receiving CEx
- **Client Progression Rate**: % of clients advancing on schedule
- **Pain Flag Rate**: % of sessions with reported discomfort

**Dashboard Features**:
- `/dashboard/trainer` → Client Phase Progression Tracker (timeline for each client)
- Movement Assessment Module (upload photos/videos, tag compensations)
- Intelligent Workout Builder (phase selector, exercise library auto-filters)
- Session Logging (track tempo, rest, RPE, pain flags)

---

### Tier 4: Admin (Platform Owner - Full Control) 🔐

**NASM Access**:
- ✅ **All Trainer Features** (can manage own training)
- ✅ **Global Template Builder** (create OPT-aligned workout templates)
- ✅ **Exercise Library Management** (add exercises, tag phases/equipment/contraindications)
- ✅ **NASM Compliance Dashboard** (platform-wide metrics)
- ✅ **Trainer Certification Management** (upload certs, auto-unlock features)
- ✅ **Protocol Governance** (approve templates, set phase rules)

**Rationale**: Admin ensures NASM integrity across the platform. Monitors quality, manages risk, and maintains competitive differentiation.

**Compliance Dashboard Metrics**:
- **Platform Phase Adherence**: 92% (Target: ≥90%)
- **Corrective Usage**: 78% (Target: ≥75%)
- **Client Progression Rate**: 85% (Target: ≥80%)
- **Pain Flag Rate**: 5% (Target: <10%)
- **Trainer Compliance Leaderboard**: Sarah (98%), Mike (94%), John (89% ⚠️)

**Dashboard Features**:
- `/dashboard/admin` → NASM Compliance Dashboard (real-time metrics)
- Workout Template Builder (phase-aware, dynamic acute variable suggestions)
- Exercise Library UI (searchable, filterable, video uploads)
- Trainer Certification Manager (track CPT/CES/PES status, send renewal reminders)

---

## 🗄️ Database Schema (NASM + 4-Tier Integration)

### Core Tables

```sql
-- ============================================================
-- USER TIER SYSTEM (4-Tier Hierarchy)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS user_tier VARCHAR(50) NOT NULL DEFAULT 'user';
-- Values: 'user' (free), 'client' (paid), 'trainer' (employee), 'admin' (owner)

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paid_tier BOOLEAN DEFAULT FALSE;
-- TRUE for 'client', 'trainer', 'admin'; FALSE for 'user'

-- ============================================================
-- NASM OPT PHASE TRACKING (Client Tier Only)
-- ============================================================

CREATE TABLE client_opt_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id), -- user_tier must be 'client'
  current_phase VARCHAR(50) NOT NULL, -- 'phase_1_stabilization', 'phase_2_strength_endurance', etc.
  phase_start_date TIMESTAMP NOT NULL,
  phase_target_weeks INTEGER DEFAULT 4, -- P1/P2: 4-6 weeks, P3: 6-8 weeks, P4/P5: 4-6 weeks
  weeks_completed INTEGER DEFAULT 0,
  progression_criteria_met JSONB, -- {"perfect_form_sessions": 3, "stability_maintained": true, ...}
  ready_for_next_phase BOOLEAN DEFAULT FALSE,
  trainer_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast client queries
CREATE INDEX idx_client_opt_phases_client_id ON client_opt_phases(client_id);
CREATE INDEX idx_client_opt_phases_current_phase ON client_opt_phases(current_phase);

-- ============================================================
-- MOVEMENT ASSESSMENTS (CES Protocol)
-- ============================================================

CREATE TABLE movement_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id),
  assessment_type VARCHAR(100) NOT NULL, -- 'overhead_squat', 'single_leg_squat', 'push', 'pull', 'static_posture'
  assessment_date TIMESTAMP NOT NULL,
  assessor_trainer_id UUID REFERENCES users(id), -- Trainer who performed assessment

  -- Compensation Tracking (JSONB for flexibility)
  compensations_identified JSONB,
  -- Example: {"knee_valgus": true, "forward_head": true, "heels_rise": true, "rounded_shoulders": true}

  -- Media Uploads
  video_url TEXT, -- Full assessment video
  photo_urls JSONB, -- Array of image URLs (front/side/back views)

  -- AI-Suggested Protocol (auto-generated)
  suggested_protocol VARCHAR(100), -- 'UCS', 'LCS', 'PDS', 'UCS+PDS'
  protocol_confidence DECIMAL(5,2), -- 0-100% confidence score

  trainer_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_movement_assessments_client_id ON movement_assessments(client_id);
CREATE INDEX idx_movement_assessments_date ON movement_assessments(assessment_date DESC);

-- ============================================================
-- CORRECTIVE EXERCISE PROTOCOLS (4-Step CEx Continuum)
-- ============================================================

CREATE TABLE corrective_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id),
  assessment_id UUID REFERENCES movement_assessments(id), -- Link to assessment that triggered this
  protocol_type VARCHAR(100) NOT NULL, -- 'UCS', 'LCS', 'PDS', 'custom'

  -- 4-Step CEx Continuum (JSONB for flexibility)
  inhibit_exercises JSONB,
  -- Example: [{"exercise": "SMR Pecs", "duration_seconds": 60, "video_url": "..."}]

  lengthen_exercises JSONB,
  -- Example: [{"exercise": "Pec Minor Doorway Stretch", "duration_seconds": 30, "video_url": "..."}]

  activate_exercises JSONB,
  -- Example: [{"exercise": "Band Face-Pull", "sets": 2, "reps": 12, "video_url": "..."}]

  integrate_exercises JSONB,
  -- Example: [{"exercise": "Wall Slides", "sets": 2, "reps": 10, "video_url": "..."}]

  -- Assignment & Compliance
  assigned_by_trainer_id UUID REFERENCES users(id),
  assigned_date TIMESTAMP DEFAULT NOW(),
  homework_assigned BOOLEAN DEFAULT FALSE, -- Client must do daily
  daily_completion_required BOOLEAN DEFAULT TRUE, -- Morning + Evening routine

  -- Compliance Tracking
  total_days_assigned INTEGER DEFAULT 0,
  days_completed INTEGER DEFAULT 0,
  compliance_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_days_assigned > 0
    THEN (days_completed::DECIMAL / total_days_assigned::DECIMAL * 100)
    ELSE 0 END
  ) STORED,

  -- Gamification
  xp_earned INTEGER DEFAULT 0, -- +10 XP per completed day
  current_streak INTEGER DEFAULT 0, -- Days in a row
  longest_streak INTEGER DEFAULT 0,

  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'reassessed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_corrective_protocols_client_id ON corrective_protocols(client_id);
CREATE INDEX idx_corrective_protocols_status ON corrective_protocols(status);

-- ============================================================
-- CORRECTIVE HOMEWORK COMPLETIONS (Daily Tracking)
-- ============================================================

CREATE TABLE corrective_homework_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID REFERENCES corrective_protocols(id),
  client_id UUID REFERENCES users(id),
  completion_date DATE NOT NULL,
  time_of_day VARCHAR(50), -- 'morning', 'evening', 'both'
  exercises_completed JSONB, -- Track which exercises were done
  notes TEXT,
  xp_awarded INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_corrective_homework_client_date
ON corrective_homework_logs(client_id, protocol_id, completion_date);

-- ============================================================
-- WORKOUT TEMPLATES (NASM-Aligned, Admin-Created)
-- ============================================================

CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(255) NOT NULL,
  opt_phase VARCHAR(50) NOT NULL, -- 'phase_1_stabilization', etc.

  -- Session Details
  session_goal TEXT, -- "Full body strength endurance, posterior chain focus"
  session_length_minutes INTEGER, -- 30, 45, 60, 75
  difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'

  -- Equipment & Constraints
  equipment_required JSONB, -- ["dumbbells", "cables", "trx", "stability_ball"]
  equipment_optional JSONB, -- ["med_ball", "agility_ladder"]
  space_requirements VARCHAR(100), -- 'minimal', 'standard', 'large'

  -- Contraindications
  contraindications JSONB, -- ["shoulder_impingement", "lower_back_pain", "knee_injury"]
  special_populations JSONB, -- ["pregnancy", "older_adult", "youth"]

  -- Workout Structure (JSONB for flexibility)
  warmup_protocol JSONB,
  -- Example: {"corrective": "UCS", "dynamic": ["arm_circles", "leg_swings"], "duration_minutes": 10}

  main_workout_blocks JSONB,
  -- Example: [
  --   {"block": "A", "type": "superset", "exercises": [
  --     {"name": "DB Goblet Squat", "sets": 3, "reps": 10, "tempo": "2/0/2", "rest_seconds": 60, "rpe": 7},
  --     {"name": "Single-Leg Balance Reach", "sets": 3, "reps": 12, "tempo": "slow", "rest_seconds": 0}
  --   ]},
  --   {"block": "B", ...}
  -- ]

  finisher_protocol JSONB,
  -- Example: {"type": "EMOM", "duration_minutes": 4, "exercises": [...]}

  cooldown_protocol JSONB,
  -- Example: {"stretches": ["full_body_static"], "breathing": "90/90", "duration_minutes": 5}

  -- Governance
  created_by_admin_id UUID REFERENCES users(id),
  approved BOOLEAN DEFAULT FALSE,
  approval_date TIMESTAMP,
  approved_by_admin_id UUID REFERENCES users(id),

  -- Usage Tracking
  times_assigned INTEGER DEFAULT 0,
  avg_client_rating DECIMAL(3,2), -- 1.00-5.00 stars

  -- Tier Availability
  available_to_free_users BOOLEAN DEFAULT FALSE, -- Only true for Phase 1 templates

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workout_templates_phase ON workout_templates(opt_phase);
CREATE INDEX idx_workout_templates_approved ON workout_templates(approved);
CREATE INDEX idx_workout_templates_free_users ON workout_templates(available_to_free_users);

-- ============================================================
-- EXERCISE LIBRARY (NASM-Tagged, Admin-Managed)
-- ============================================================

CREATE TABLE exercise_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_name VARCHAR(255) NOT NULL,

  -- NASM Classification
  opt_phases JSONB NOT NULL, -- [1, 2, 3] (which phases it's appropriate for)
  exercise_type VARCHAR(100) NOT NULL, -- 'strength', 'stabilization', 'power', 'corrective'

  -- Anatomical Tags
  primary_body_part VARCHAR(100), -- 'chest', 'back', 'legs', 'shoulders', 'core'
  secondary_body_parts JSONB, -- ['core', 'glutes']
  movement_pattern VARCHAR(100), -- 'squat', 'hinge', 'push', 'pull', 'lunge', 'carry', 'rotation'

  -- Equipment
  primary_equipment VARCHAR(100), -- 'dumbbell', 'cable', 'trx', 'bodyweight', 'machine', 'band'
  alternative_equipment JSONB, -- ['band', 'cable'] (substitutions)

  -- Safety
  contraindications JSONB, -- ["shoulder_impingement", "lower_back_pain", "knee_injury"]
  special_population_modifications JSONB,
  -- Example: {"pregnancy": "Avoid supine after trimester 1", "older_adult": "Reduce ROM if needed"}

  -- Acute Variables (Phase-Specific Defaults)
  acute_variables_defaults JSONB,
  -- Example: {
  --   "phase_1_stabilization": {"reps": "12-20", "sets": "2-4", "tempo": "4/2/1", "rest_seconds": 60, "intensity": "50-70% 1RM"},
  --   "phase_2_strength_endurance": {"reps": "8-12", "sets": "3-4", "tempo": "2/1/1", "rest_seconds": 45, "intensity": "70-80% 1RM"},
  --   ...
  -- }

  -- Instructional Media
  demo_video_url TEXT, -- YouTube, Vimeo, or internal CDN
  demo_image_urls JSONB, -- Array of setup/execution images

  -- Coaching
  coaching_cues JSONB, -- ["Chest proud", "Knees track over toes", "Ribs down"]
  common_mistakes JSONB, -- ["Knees cave inward", "Back rounds"]

  -- Progressions & Regressions
  progression_exercise_id UUID REFERENCES exercise_library(id), -- Harder version
  regression_exercise_id UUID REFERENCES exercise_library(id), -- Easier version

  -- Governance
  created_by_admin_id UUID REFERENCES users(id),
  approved BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_exercise_library_phases ON exercise_library USING GIN(opt_phases);
CREATE INDEX idx_exercise_library_type ON exercise_library(exercise_type);
CREATE INDEX idx_exercise_library_body_part ON exercise_library(primary_body_part);
CREATE INDEX idx_exercise_library_equipment ON exercise_library(primary_equipment);
CREATE INDEX idx_exercise_library_approved ON exercise_library(approved);

-- ============================================================
-- SESSION LOGS (Acute Variable Tracking)
-- ============================================================

CREATE TABLE session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id),
  trainer_id UUID REFERENCES users(id),
  session_date TIMESTAMP NOT NULL,

  -- Phase Context
  opt_phase_during_session VARCHAR(50), -- Client's phase at time of session
  workout_template_id UUID REFERENCES workout_templates(id), -- If using template

  -- Corrective Warm-up
  corrective_warmup_completed BOOLEAN DEFAULT FALSE,
  corrective_protocol_id UUID REFERENCES corrective_protocols(id),

  -- Exercises Performed (JSONB for flexibility)
  exercises_performed JSONB,
  -- Example: [
  --   {"exercise_id": "uuid", "exercise_name": "DB Goblet Squat",
  --    "sets_logged": [
  --      {"set_number": 1, "reps": 10, "weight_lbs": 25, "tempo": "2/0/2", "rest_seconds": 60, "rpe": 6},
  --      {"set_number": 2, "reps": 10, "weight_lbs": 25, "tempo": "2/0/2", "rest_seconds": 60, "rpe": 7},
  --      ...
  --    ]
  --   },
  --   ...
  -- ]

  -- Compliance Metrics
  acute_variables_adherence DECIMAL(5,2),
  -- % adherence to prescribed sets/reps/tempo/rest (auto-calculated)

  -- Pain & Safety
  pain_flags JSONB,
  -- Example: [{"body_part": "shoulder", "intensity_1_10": 3, "type": "sharp", "notes": "During overhead press"}]

  -- Readiness & RPE
  client_readiness_pre_session INTEGER, -- 1-10 scale (how ready did client feel?)
  session_rpe_overall INTEGER, -- 1-10 scale (overall session difficulty)

  -- Notes
  trainer_notes TEXT,
  client_notes TEXT,

  -- Session Outcome
  session_completed BOOLEAN DEFAULT TRUE,
  session_duration_minutes INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_session_logs_client_id ON session_logs(client_id);
CREATE INDEX idx_session_logs_trainer_id ON session_logs(trainer_id);
CREATE INDEX idx_session_logs_date ON session_logs(session_date DESC);
CREATE INDEX idx_session_logs_phase ON session_logs(opt_phase_during_session);

-- ============================================================
-- TRAINER CERTIFICATIONS (NASM Tracking)
-- ============================================================

CREATE TABLE trainer_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES users(id), -- user_tier must be 'trainer' or 'admin'
  certification_type VARCHAR(100) NOT NULL, -- 'NASM-CPT', 'NASM-CES', 'NASM-PES', 'NASM-FNS'
  certification_number VARCHAR(255),
  issue_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'pending_renewal'

  -- Document Upload
  certificate_url TEXT, -- PDF or image of actual certificate

  -- Auto-Status Update (trigger to mark as expired)
  -- Trigger: UPDATE status = 'expired' WHERE expiration_date < CURRENT_DATE

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trainer_certifications_trainer_id ON trainer_certifications(trainer_id);
CREATE INDEX idx_trainer_certifications_type ON trainer_certifications(certification_type);
CREATE INDEX idx_trainer_certifications_status ON trainer_certifications(status);
CREATE INDEX idx_trainer_certifications_expiration ON trainer_certifications(expiration_date);

-- Auto-expire certifications trigger
CREATE OR REPLACE FUNCTION auto_expire_certifications()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trainer_certifications
  SET status = 'expired'
  WHERE expiration_date < CURRENT_DATE AND status = 'active';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_expire_certifications
AFTER INSERT OR UPDATE ON trainer_certifications
FOR EACH ROW
EXECUTE FUNCTION auto_expire_certifications();

-- ============================================================
-- NASM COMPLIANCE ANALYTICS (Admin Dashboard)
-- ============================================================

CREATE MATERIALIZED VIEW nasm_compliance_metrics AS
SELECT
  -- Platform-Wide Metrics
  (SELECT COUNT(*) FROM users WHERE user_tier = 'user') AS total_free_users,
  (SELECT COUNT(*) FROM users WHERE user_tier = 'client') AS total_clients,
  (SELECT COUNT(*) FROM users WHERE user_tier = 'trainer') AS total_trainers,

  -- Phase Distribution
  (SELECT COUNT(*) FROM client_opt_phases WHERE current_phase = 'phase_1_stabilization') AS clients_phase_1,
  (SELECT COUNT(*) FROM client_opt_phases WHERE current_phase = 'phase_2_strength_endurance') AS clients_phase_2,
  (SELECT COUNT(*) FROM client_opt_phases WHERE current_phase = 'phase_3_hypertrophy') AS clients_phase_3,
  (SELECT COUNT(*) FROM client_opt_phases WHERE current_phase = 'phase_4_maximal_strength') AS clients_phase_4,
  (SELECT COUNT(*) FROM client_opt_phases WHERE current_phase = 'phase_5_power') AS clients_phase_5,

  -- Compliance Rates
  (SELECT AVG(acute_variables_adherence) FROM session_logs WHERE session_date >= NOW() - INTERVAL '30 days') AS avg_phase_adherence_30d,

  (SELECT COUNT(DISTINCT cp.client_id)::DECIMAL / NULLIF(COUNT(DISTINCT ma.client_id), 0) * 100
   FROM movement_assessments ma
   LEFT JOIN corrective_protocols cp ON ma.client_id = cp.client_id
   WHERE ma.assessment_date >= NOW() - INTERVAL '90 days'
  ) AS corrective_usage_rate_90d,

  (SELECT COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM session_logs WHERE session_date >= NOW() - INTERVAL '30 days'), 0) * 100
   FROM session_logs
   WHERE session_date >= NOW() - INTERVAL '30 days'
   AND pain_flags IS NOT NULL
   AND jsonb_array_length(pain_flags) > 0
  ) AS pain_flag_rate_30d,

  -- Certification Stats
  (SELECT COUNT(*) FROM trainer_certifications WHERE certification_type = 'NASM-CPT' AND status = 'active') AS active_cpt_certs,
  (SELECT COUNT(*) FROM trainer_certifications WHERE certification_type = 'NASM-CES' AND status = 'active') AS active_ces_certs,
  (SELECT COUNT(*) FROM trainer_certifications WHERE certification_type = 'NASM-PES' AND status = 'active') AS active_pes_certs,

  CURRENT_TIMESTAMP AS last_updated
;

CREATE UNIQUE INDEX idx_nasm_compliance_metrics_refresh ON nasm_compliance_metrics(last_updated);

-- Refresh every 15 minutes
CREATE OR REPLACE FUNCTION refresh_nasm_compliance_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY nasm_compliance_metrics;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (requires pg_cron extension or application-level scheduler)
-- SELECT cron.schedule('refresh-nasm-compliance', '*/15 * * * *', 'SELECT refresh_nasm_compliance_metrics()');
```

---

## 🎨 UI/UX Wireframes (NASM × 4-Tier)

### Admin Dashboard: NASM Template Builder

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🏋️ NASM Workout Template Builder                                          │
├────────────────────────────────────────────────────────────────────────────┤
│ Template Name: [Phase 2 - Full Body Strength Endurance_______________]    │
│                                                                            │
│ ┌─ OPT™ PHASE SELECTION ───────────────────────────────────────────────┐  │
│ │ Phase: [Phase 2: Strength Endurance ▼]                               │  │
│ │                                                                       │  │
│ │ ⚙️ Acute Variables (Auto-filled for Phase 2):                        │  │
│ │   Reps: [8-12]  Sets: [3-4]  Tempo: [2/1/1]  Rest: [45-60s]         │  │
│ │   Intensity: [70-80% 1RM or RPE 6-8]                                 │  │
│ │                                                                       │  │
│ │ ✅ Enable for Free Users (Phase 1 only)  ☐                           │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ ┌─ WARM-UP PROTOCOL (10 min) ──────────────────────────────────────────┐  │
│ │ ☑ Include Corrective Exercise Continuum                              │  │
│ │   Suggested Protocol: [Upper Crossed Syndrome (UCS) ▼]               │  │
│ │                                                                       │  │
│ │ Inhibit (SMR):  [+ Add] [Pecs - 60s] [Upper Traps - 60s]             │  │
│ │ Lengthen:       [+ Add] [Pec Minor Doorway - 30s]                    │  │
│ │ Activate:       [+ Add] [Band Face-Pull - 2x12]                      │  │
│ │ Integrate:      [+ Add] [Wall Slides - 2x10]                         │  │
│ │                                                                       │  │
│ │ Dynamic Warm-up: [+ Add Drill] [Arm Circles] [Leg Swings]            │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ ┌─ MAIN WORKOUT BLOCKS (45 min) ───────────────────────────────────────┐  │
│ │                                                                       │  │
│ │ Block A: [Superset - Lower Body ▼]                                   │  │
│ │ ┌────────────────────────────────────────────────────────────────┐   │  │
│ │ │ A1: Strength Exercise                                          │   │  │
│ │ │ Exercise: [DB Goblet Squat ▼] (Filtered: Phase 2, Legs only)  │   │  │
│ │ │ Sets: [3] Reps: [10] Tempo: [2/0/2] Rest: [60s] RPE: [7]      │   │  │
│ │ │ [🎥 View Demo] [+ Add Coaching Cue]                            │   │  │
│ │ │                                                                │   │  │
│ │ │ A2: Stabilization Exercise (Same Pattern - Squat)             │   │  │
│ │ │ Exercise: [Single-Leg Balance Reach ▼] (Auto-filtered)        │   │  │
│ │ │ Sets: [3] Reps: [12 each side] Tempo: [Slow] Rest: [—]        │   │  │
│ │ └────────────────────────────────────────────────────────────────┘   │  │
│ │ [+ Add Exercise to Block A]                                           │  │
│ │                                                                       │  │
│ │ [+ Add New Block]                                                     │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ ┌─ FINISHER (Optional, 4 min) ─────────────────────────────────────────┐  │
│ │ Type: [EMOM ▼]  Duration: [4 min]                                    │  │
│ │ Exercise 1: [Med-ball Chest Pass] Reps: [10]                         │  │
│ │ Exercise 2: [Bear-plank Shoulder Tap] Reps: [12 total]               │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ ┌─ COOL-DOWN (5 min) ──────────────────────────────────────────────────┐  │
│ │ Static Stretching: [+ Add] [Full Body - 30s each]                    │  │
│ │ Breathing: [90/90 Breathing - 60s]                                   │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ Contraindications: [+ Add] [Shoulder Impingement] [Lower Back Pain]       │
│ Special Populations: [+ Add] [Pregnancy] [Older Adult]                    │
│                                                                            │
│ [SAVE TEMPLATE] [PREVIEW WORKOUT] [TEST WITH AI] [SUBMIT FOR APPROVAL]    │
└────────────────────────────────────────────────────────────────────────────┘
```

**Technical Implementation**:
- **Component**: `<NAsmTemplateBuilder />`
- **API**: `POST /api/admin/workout-templates`
- **Validation Logic**:
  ```typescript
  function validateAcuteVariables(phase: string, reps: number, tempo: string): ValidationResult {
    const phaseRules = {
      phase_2_strength_endurance: {
        repsRange: [8, 12],
        tempoPattern: /^[2-3]\/[0-1]\/[1-2]$/,
      },
    };

    const rule = phaseRules[phase];
    if (reps < rule.repsRange[0] || reps > rule.repsRange[1]) {
      return { valid: false, error: `Phase 2 requires 8-12 reps (got ${reps})` };
    }
    if (!rule.tempoPattern.test(tempo)) {
      return { valid: false, error: `Phase 2 tempo must match pattern 2-3/0-1/1-2 (got ${tempo})` };
    }
    return { valid: true };
  }
  ```

---

### Admin Dashboard: NASM Compliance Dashboard

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 📊 NASM Protocol Compliance Dashboard                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌─ PLATFORM-WIDE METRICS (Last 30 Days) ──────────────────────────────┐   │
│ │                                                                       │   │
│ │ 🎯 Phase Adherence Rate: 92%  (Target: ≥90%)  ✅                     │   │
│ │    └─ % of workouts with correct acute variables for client's phase  │   │
│ │                                                                       │   │
│ │ 🩹 Corrective Exercise Usage: 78%  (Target: ≥75%)  ✅                │   │
│ │    └─ % of clients with identified compensations receiving CEx       │   │
│ │                                                                       │   │
│ │ 📈 Client Phase Progression Rate: 85%  (Target: ≥80%)  ✅            │   │
│ │    └─ % of clients advancing to next phase within target weeks       │   │
│ │                                                                       │   │
│ │ ⚠️ Pain Flag Rate: 5%  (Target: <10%)  ✅                            │   │
│ │    └─ % of sessions with pain reported                               │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ TRAINER COMPLIANCE LEADERBOARD ─────────────────────────────────────┐   │
│ │ Trainer           | Cert Level | Adherence | CEx Usage | Progression │   │
│ │ ─────────────────────────────────────────────────────────────────────│   │
│ │ Sarah Johnson     | CES, PES   | 98%       | 95%       | 92%  🥇     │   │
│ │ Mike Rodriguez    | CPT        | 94%       | 82%       | 88%  🥈     │   │
│ │ John Doe          | CPT        | 89%       | 70%       | 79%  ⚠️     │   │
│ │ [View All Trainers...]                                               │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ CLIENT PHASE DISTRIBUTION ──────────────────────────────────────────┐   │
│ │ Phase 1 (Stabilization):     45 clients  █████████░░░ 30%            │   │
│ │ Phase 2 (Strength Endurance): 38 clients  ████████░░░ 25%            │   │
│ │ Phase 3 (Hypertrophy):       35 clients  ███████░░░░ 23%             │   │
│ │ Phase 4 (Max Strength):      22 clients  █████░░░░░ 15%              │   │
│ │ Phase 5 (Power):             10 clients  ███░░░░░░░  7%              │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ CERTIFICATION STATUS ───────────────────────────────────────────────┐   │
│ │ Active NASM-CPT: 12 trainers  ✅                                      │   │
│ │ Active NASM-CES: 5 trainers   ✅                                      │   │
│ │ Active NASM-PES: 2 trainers   ✅                                      │   │
│ │ Expiring Soon (60 days): 3 certifications  ⚠️                         │   │
│ │ [View Certification Details...]                                       │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ [EXPORT COMPLIANCE REPORT] [SET ALERT THRESHOLDS] [REFRESH DATA]          │
└────────────────────────────────────────────────────────────────────────────┘
```

**API Endpoint**: `GET /api/admin/nasm/compliance-metrics`

**Response**:
```json
{
  "platform_metrics": {
    "phase_adherence_rate": 92.4,
    "corrective_usage_rate": 78.2,
    "client_progression_rate": 85.1,
    "pain_flag_rate": 4.8
  },
  "trainer_compliance": [
    {
      "trainer_id": "uuid",
      "trainer_name": "Sarah Johnson",
      "certifications": ["NASM-CES", "NASM-PES"],
      "adherence_score": 98.1,
      "cex_usage_rate": 95.0,
      "client_progression_rate": 92.3
    }
  ],
  "phase_distribution": {
    "phase_1": 45,
    "phase_2": 38,
    "phase_3": 35,
    "phase_4": 22,
    "phase_5": 10
  },
  "certification_summary": {
    "active_cpt": 12,
    "active_ces": 5,
    "active_pes": 2,
    "expiring_soon": 3
  }
}
```

---

### Trainer Dashboard: Movement Assessment Module

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🔍 Movement Assessment: Golden Hawk (Jane Doe)                            │
├────────────────────────────────────────────────────────────────────────────┤
│ Assessment Date: [2025-11-12 ▼]  Assessment Type: [Overhead Squat ▼]     │
│                                                                            │
│ ┌─ VIDEO/PHOTO UPLOAD ─────────────────────────────────────────────────┐  │
│ │ 📷 [Upload Front View] [Upload Side View] [Upload Back View]         │  │
│ │                                                                       │  │
│ │ Front View:  [✓ Uploaded]  Side View: [✓ Uploaded]  Back: [Pending] │  │
│ │ Full Video: [✓ Uploaded - 2:34 duration]                             │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ ┌─ COMPENSATION CHECKLIST (OHS Assessment) ───────────────────────────┐   │
│ │ Lower Body:                                                           │   │
│ │ ☑ Knee Valgus (knees move inward)                                    │   │
│ │ ☐ Knee Varus (knees move outward)                                    │   │
│ │ ☐ Excessive Forward Lean                                             │   │
│ │ ☐ Low Back Arches                                                    │   │
│ │ ☑ Heels Rise                                                         │   │
│ │ ☐ Asymmetric Weight Shift                                            │   │
│ │                                                                       │   │
│ │ Upper Body:                                                           │   │
│ │ ☑ Forward Head                                                       │   │
│ │ ☑ Rounded Shoulders                                                  │   │
│ │ ☐ Arms Fall Forward                                                  │   │
│ │ ☐ Asymmetric Arm Position                                            │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ 🤖 AI-SUGGESTED CORRECTIVE PROTOCOL ────────────────────────────────┐   │
│ │                                                                       │   │
│ │ Based on identified compensations:                                   │   │
│ │ • Knee Valgus + Heels Rise → **Pronation Distortion Syndrome (PDS)**│   │
│ │ • Forward Head + Rounded Shoulders → **Upper Crossed Syndrome (UCS)**│   │
│ │                                                                       │   │
│ │ ✅ Recommended Protocol: **UCS + PDS Combined**                      │   │
│ │    Confidence: 92%                                                   │   │
│ │                                                                       │   │
│ │ [APPLY THIS PROTOCOL] [CUSTOMIZE MANUALLY] [VIEW PROTOCOL DETAILS]   │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ Trainer Notes: [___________________________________________________]      │
│ Client demonstrated good effort. Knee valgus more pronounced on right     │
│ side. Will address with corrective exercises and progress to Phase 2      │
│ once compensations resolve.                                               │
│                                                                            │
│ [SAVE ASSESSMENT] [ASSIGN CORRECTIVE PROTOCOL] [SCHEDULE REASSESSMENT]    │
└────────────────────────────────────────────────────────────────────────────┘
```

**AI Compensation Detection Logic**:
```typescript
interface CompensationMap {
  [key: string]: string[];
}

const PROTOCOL_MAP: CompensationMap = {
  knee_valgus: ['PDS'],
  heels_rise: ['PDS'],
  forward_head: ['UCS'],
  rounded_shoulders: ['UCS'],
  excessive_forward_lean: ['LCS'],
  low_back_arches: ['LCS'],
};

function suggestCorrectiveProtocol(compensations: string[]): {
  protocol: string;
  confidence: number;
  rationale: string[];
} {
  const protocolCounts = new Map<string, number>();
  const rationale: string[] = [];

  compensations.forEach(comp => {
    const protocols = PROTOCOL_MAP[comp] || [];
    protocols.forEach(protocol => {
      protocolCounts.set(protocol, (protocolCounts.get(protocol) || 0) + 1);
    });

    if (protocols.length > 0) {
      rationale.push(`${comp} → ${protocols.join(', ')}`);
    }
  });

  const sortedProtocols = Array.from(protocolCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  const combinedProtocol = sortedProtocols.map(([protocol]) => protocol).join(' + ');
  const confidence = Math.min(
    (sortedProtocols[0][1] / compensations.length) * 100,
    95
  );

  return {
    protocol: combinedProtocol,
    confidence: Math.round(confidence),
    rationale
  };
}

// Example usage:
const compensations = ['knee_valgus', 'heels_rise', 'forward_head', 'rounded_shoulders'];
const result = suggestCorrectiveProtocol(compensations);
// result.protocol = "UCS + PDS"
// result.confidence = 92
// result.rationale = ["knee_valgus → PDS", "heels_rise → PDS", "forward_head → UCS", "rounded_shoulders → UCS"]
```

---

### Trainer Dashboard: Phase-Aware Workout Builder

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 💪 Workout Builder: Golden Hawk (Jane Doe)                                │
├────────────────────────────────────────────────────────────────────────────┤
│ Client's Current Phase: **Phase 2: Strength Endurance** (Week 3 of 4)     │
│ Last Session: 3 days ago  |  Readiness: 8/10  |  No Pain Flags            │
│                                                                            │
│ Today's Session Goal: [Full Body Strength Endurance ▼]                    │
│ Session Length: [60 min]  Equipment: [Cables ✓] [DBs ✓] [TRX ✓]           │
│                                                                            │
│ ⚠️ Contraindications: Shoulder Impingement (No overhead pressing)          │
│ ✅ Active Corrective Protocol: UCS + PDS (Include in warm-up)             │
│                                                                            │
│ ┌─ WARM-UP (Corrective + Dynamic) ────────────────────────────────────┐   │
│ │ ✅ Client has active CEx protocol (UCS + PDS). Include in warm-up?   │   │
│ │ [✓ YES, INCLUDE] [SKIP TODAY]                                        │   │
│ │                                                                       │   │
│ │ Inhibit: SMR Pecs (60s), SMR Calves (60s)                            │   │
│ │ Lengthen: Pec Minor Doorway (30s), Calf Stretch (30s)                │   │
│ │ Activate: Band Face-Pull (2x12), Glute Bridge (2x15)                 │   │
│ │ Integrate: Wall Slides (2x10), Single-Leg Balance (2x30s)            │   │
│ │ Dynamic: Arm Circles, Leg Swings (60s)                               │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ BLOCK A: Lower Body Superset ──────────────────────────────────────┐   │
│ │ (Phase 2 = Strength → Stabilization superset required)              │   │
│ │                                                                      │   │
│ │ A1: Strength Exercise                                               │   │
│ │ [DB Goblet Squat ▼] (Filtered: Phase 2, Legs, No contraindications) │   │
│ │ Sets: [3] Reps: [10] Tempo: [2/0/2] Rest: [60s] RPE: [7]            │   │
│ │ [🎥 Demo] Cue: "Chest proud, knees track over toes, glutes engaged" │   │
│ │                                                                      │   │
│ │ A2: Stabilization Exercise (Same Pattern - Squat)                   │   │
│ │ [Single-Leg Balance Reach ▼] (Auto-filtered: Stabilization + Squat) │   │
│ │ Sets: [3] Reps: [12 each side] Tempo: [Slow control] Rest: [—]     │   │
│ │ [🎥 Demo] Cue: "Soft bend in knee, hips level, core braced"         │   │
│ │                                                                      │   │
│ │ Rest after superset: [60s]                                          │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ EXERCISE SUBSTITUTION ALERT ────────────────────────────────────────┐  │
│ │ ⚠️ Original exercise "DB Overhead Press" removed due to:             │  │
│ │    • Client contraindication: Shoulder Impingement                   │  │
│ │                                                                       │  │
│ │ Suggested Alternative: [Landmine Press ▼] (Scapular-plane pressing) │  │
│ │ [ACCEPT SUBSTITUTION] [SELECT DIFFERENT EXERCISE]                    │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ [+ ADD BLOCK B] [SAVE WORKOUT] [PREVIEW FOR CLIENT] [ASSIGN TO SESSION]   │
└────────────────────────────────────────────────────────────────────────────┘
```

**Key Technical Features**:

1. **Exercise Auto-Filtering**:
```typescript
async function getPhaseAppropriateExercises(
  clientPhase: string,
  bodyPart: string,
  contraindications: string[]
): Promise<Exercise[]> {
  const exercises = await db.query(`
    SELECT * FROM exercise_library
    WHERE opt_phases @> $1::jsonb
    AND primary_body_part = $2
    AND (
      contraindications IS NULL
      OR NOT (contraindications ?| $3)
    )
    AND approved = true
    ORDER BY exercise_name
  `, [
    JSON.stringify([parseInt(clientPhase.split('_')[1])]), // Extract phase number
    bodyPart,
    contraindications
  ]);

  return exercises.rows;
}
```

2. **Acute Variable Validation**:
```typescript
function validateWorkoutBlock(
  phase: string,
  exercises: WorkoutExercise[]
): ValidationResult {
  const errors: string[] = [];

  if (phase === 'phase_2_strength_endurance') {
    // Phase 2 requires supersets (strength → stabilization)
    if (exercises.length !== 2) {
      errors.push('Phase 2 requires exactly 2 exercises per superset');
    }

    const [exercise1, exercise2] = exercises;
    if (exercise1.exercise_type !== 'strength' || exercise2.exercise_type !== 'stabilization') {
      errors.push('Phase 2 supersets must be Strength → Stabilization');
    }

    if (exercise1.primary_body_part !== exercise2.primary_body_part) {
      errors.push('Superset exercises must target the same body part');
    }

    // Validate acute variables
    exercise1.reps.forEach(rep => {
      if (rep < 8 || rep > 12) {
        errors.push(`Phase 2 strength exercise requires 8-12 reps (got ${rep})`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
```

3. **Contraindication Alert**:
```typescript
function checkContraindications(
  selectedExercise: Exercise,
  clientContraindications: string[]
): { hasConflict: boolean; alternatives: Exercise[] } {
  const conflicts = selectedExercise.contraindications.filter(contra =>
    clientContraindications.includes(contra)
  );

  if (conflicts.length > 0) {
    // Fetch alternative exercises targeting same body part but without contraindication
    const alternatives = await getAlternativeExercises(
      selectedExercise.primary_body_part,
      selectedExercise.movement_pattern,
      clientContraindications
    );

    return { hasConflict: true, alternatives };
  }

  return { hasConflict: false, alternatives: [] };
}
```

---

### Client Dashboard: "My Training Phase" Widget

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🎯 MY CURRENT TRAINING PHASE                                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ **Phase 2: Strength Endurance**                                           │
│                                                                            │
│ ┌─ WHAT THIS MEANS ────────────────────────────────────────────────────┐  │
│ │ We're building your work capacity - your ability to perform high-   │  │
│ │ quality reps while maintaining perfect form and stability. This     │  │
│ │ prepares your muscles and nervous system for heavier loads ahead.   │  │
│ │                                                                       │  │
│ │ Think of it like building an engine before adding horsepower. 💪     │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ ┌─ WHAT TO EXPECT ─────────────────────────────────────────────────────┐  │
│ │ ✓ Moderate weights, 8-12 reps per exercise                          │  │
│ │ ✓ Paired exercises (superset style) with short rests                │  │
│ │ ✓ You'll feel a good "pump" and some muscle fatigue                 │  │
│ │ ✓ Focus: Quality reps + maintaining stability under fatigue         │  │
│ │ ✓ Each workout builds on the last - progressive overload!           │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ ┌─ YOUR PROGRESS ──────────────────────────────────────────────────────┐  │
│ │ Week 3 of 4   ████████████████████░░░░ 75%                          │  │
│ │                                                                      │  │
│ │ Workouts Completed: 10/12  (2 more to go!)                          │  │
│ │ Phase Adherence: 94% ✅  (You're nailing the prescribed reps/tempo) │  │
│ │ Readiness Avg: 8.2/10  💪                                            │  │
│ │                                                                      │  │
│ │ Next Phase: **Phase 3 (Hypertrophy)** - Estimated Nov 26            │  │
│ │ └─ Get ready to build serious muscle! 🏗️                            │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ [LEARN MORE ABOUT OPT™ PHASES] [SEE MY PHASE HISTORY] [MESSAGE TRAINER]  │
└────────────────────────────────────────────────────────────────────────────┘
```

**API Endpoint**: `GET /api/client/my-opt-phase`

**Response**:
```json
{
  "current_phase": "phase_2_strength_endurance",
  "phase_display_name": "Phase 2: Strength Endurance",
  "phase_description": "We're building your work capacity - your ability to perform high-quality reps while maintaining perfect form and stability.",
  "week_number": 3,
  "target_weeks": 4,
  "progress_percentage": 75,
  "workouts_completed": 10,
  "target_workouts": 12,
  "adherence_score": 94.2,
  "avg_readiness": 8.2,
  "next_phase": {
    "phase": "phase_3_hypertrophy",
    "display_name": "Phase 3: Hypertrophy",
    "estimated_start_date": "2025-11-26",
    "teaser": "Get ready to build serious muscle! 🏗️"
  },
  "progression_criteria": {
    "perfect_form_sessions": 3,
    "stability_maintained": true,
    "compensations_resolved": true,
    "ready_to_progress": false
  }
}
```

---

### Client Dashboard: Corrective Homework Tracker

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🩹 MY CORRECTIVE HOMEWORK                                                 │
├────────────────────────────────────────────────────────────────────────────┤
│ Protocol: **Upper Crossed Syndrome (UCS) + Pronation Distortion (PDS)**   │
│ Assigned by: Sarah (Trainer)  |  Started: Oct 29  |  Day 15 of program    │
│                                                                            │
│ ┌─ DAILY ROUTINE (10-15 min) ─────────────────────────────────────────┐   │
│ │                                                                       │   │
│ │ **Morning** (before training):                                       │   │
│ │ ☑ SMR Pecs: 60s  [🎥 Demo]  ✅ Completed 8:15 AM                     │   │
│ │ ☑ Pec Stretch: 30s  [🎥 Demo]  ✅ Completed 8:16 AM                  │   │
│ │ ☑ Band ER: 2x15  [🎥 Demo]  ✅ Completed 8:18 AM                     │   │
│ │ ☑ Short-Foot Drill: 2x20  [🎥 Demo]  ✅ Completed 8:20 AM            │   │
│ │                                                                       │   │
│ │ **Evening** (recovery):                                              │   │
│ │ ☐ Calf Stretch: 30s each  [🎥 Demo]                                  │   │
│ │ ☐ Glute Bridge: 2x15  [🎥 Demo]                                      │   │
│ │                                                                       │   │
│ │ [MARK ALL COMPLETE FOR TODAY] [LOG EVENING SESSION]                  │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ YOUR PROGRESS ──────────────────────────────────────────────────────┐  │
│ │ **This Week**: ⭐⭐⭐⭐⭐ 5/5 days complete  +50 XP                    │  │
│ │ **Overall**: 93% compliance (Last 15 days: 14/15)                    │  │
│ │                                                                       │  │
│ │ 🏆 **Streak: 12 days in a row!**  Keep it up!                        │  │
│ │    Next Badge: "15-Day Streak Master" (3 days away)                 │  │
│ │                                                                       │  │
│ │ 📈 **Trainer Feedback** (Nov 10):                                    │  │
│ │    "Excellent work on your homework! Your shoulder positioning has  │  │
│ │     noticeably improved. Let's reassess next week." - Sarah          │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ [WHY AM I DOING THIS?] [SEE PROGRESS PHOTOS] [MESSAGE TRAINER]            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Gamification Logic**:
```typescript
interface HomeworkGamification {
  xp_per_completion: number;
  streak_bonuses: { days: number; xp_bonus: number; badge: string }[];
  compliance_badges: { threshold: number; badge: string }[];
}

const HOMEWORK_GAMIFICATION: HomeworkGamification = {
  xp_per_completion: 10,
  streak_bonuses: [
    { days: 7, xp_bonus: 50, badge: "7-Day Streak" },
    { days: 15, xp_bonus: 100, badge: "15-Day Streak Master" },
    { days: 30, xp_bonus: 250, badge: "30-Day Consistency Champion" },
  ],
  compliance_badges: [
    { threshold: 70, badge: "Committed to Recovery" },
    { threshold: 85, badge: "Elite Homework Warrior" },
    { threshold: 95, badge: "Perfect Compliance" },
  ],
};

function calculateHomeworkRewards(
  daysCompleted: number,
  currentStreak: number,
  complianceRate: number
): {
  xp_earned: number;
  badges_unlocked: string[];
  next_milestone: { type: string; days_away: number; reward: string };
} {
  let xp_earned = daysCompleted * HOMEWORK_GAMIFICATION.xp_per_completion;
  const badges_unlocked: string[] = [];

  // Check streak bonuses
  HOMEWORK_GAMIFICATION.streak_bonuses.forEach(bonus => {
    if (currentStreak === bonus.days) {
      xp_earned += bonus.xp_bonus;
      badges_unlocked.push(bonus.badge);
    }
  });

  // Check compliance badges
  HOMEWORK_GAMIFICATION.compliance_badges.forEach(badge => {
    if (complianceRate >= badge.threshold) {
      badges_unlocked.push(badge.badge);
    }
  });

  // Calculate next milestone
  const nextStreakBonus = HOMEWORK_GAMIFICATION.streak_bonuses.find(
    bonus => bonus.days > currentStreak
  );

  return {
    xp_earned,
    badges_unlocked,
    next_milestone: nextStreakBonus
      ? {
          type: 'streak',
          days_away: nextStreakBonus.days - currentStreak,
          reward: `${nextStreakBonus.badge} (+${nextStreakBonus.xp_bonus} XP)`,
        }
      : null,
  };
}
```

---

### User (Free Tier) Dashboard: NASM Workout of the Week

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🏋️ FREE NASM WORKOUT OF THE WEEK                                         │
├────────────────────────────────────────────────────────────────────────────┤
│ This Week: **"Stability & Core Foundation"**                              │
│ Phase: **Stabilization Endurance** (Beginner-Friendly, Safe at Home)      │
│                                                                            │
│ ⏱ 30-Minute Bodyweight Workout                                            │
│                                                                            │
│ **Equipment**: None (just you and a mat!)                                 │
│ **Intensity**: Low to Moderate (Focus on form, not speed)                 │
│                                                                            │
│ ┌─ WORKOUT STRUCTURE ──────────────────────────────────────────────────┐  │
│ │ Warm-up (5 min) → 3 Circuits (20 min) → Cool-down (5 min)            │  │
│ │                                                                       │  │
│ │ Circuit (Repeat 3 times):                                             │  │
│ │ • Bodyweight Squat: 15 reps, 4/2/1 tempo                              │  │
│ │ • Plank Hold: 30 seconds                                              │  │
│ │ • Single-Leg Balance: 30 seconds each side                            │  │
│ │ • Bird-Dog: 10 reps each side                                         │  │
│ │ Rest: 60 seconds between circuits                                     │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ [START WORKOUT] [🎥 WATCH FULL DEMO]                                       │
│                                                                            │
│ ┌─ 💡 THE NASM DIFFERENCE ─────────────────────────────────────────────┐  │
│ │ This workout follows the same science-backed protocol our certified  │  │
│ │ trainers use with paying clients. You're getting real results, not  │  │
│ │ random exercises from YouTube.                                        │  │
│ │                                                                       │  │
│ │ **Why Phase 1 (Stabilization)?**                                     │  │
│ │ • Builds a strong foundation (prevents injuries later)               │  │
│ │ • Teaches your body proper movement patterns                         │  │
│ │ • Prepares you for advanced training phases                          │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ ┌─ ⭐ UPGRADE FOR MORE ─────────────────────────────────────────────────┐ │
│ │ **Clients get:**                                                      │ │
│ │ ✓ Personalized NASM programs (all 5 phases)                          │ │
│ │ ✓ Movement assessments + corrective exercises                        │ │
│ │ ✓ 1-on-1 trainer support                                             │ │
│ │ ✓ Custom progression through Phases 2-5 (Strength → Hypertrophy →   │ │
│ │   Max Strength → Power)                                              │ │
│ │                                                                       │ │
│ │ [UPGRADE TO CLIENT - 10% OFF THIS WEEK] →                            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ 📊 After you complete this workout, share it on your feed for +25 XP!     │
└────────────────────────────────────────────────────────────────────────────┘
```

**Conversion Strategy**:
- Only offer **Phase 1** workouts (safest for unsupervised training)
- Limit to **1 new workout per week** (artificial scarcity)
- Show teasers of Phases 2-5 ("Unlock Power Training")
- Gamify completion: +25 XP if shared on social
- CTA placement: After workout completion modal

---

### User (Free Tier): Self-Assessment Tool

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🔍 FREE MOVEMENT SELF-ASSESSMENT                                          │
├────────────────────────────────────────────────────────────────────────────┤
│ Take 5 minutes to check your movement quality                             │
│ (No equipment needed - just a mirror and your phone camera)               │
│                                                                            │
│ ┌─ STEP 1: STATIC POSTURE (Side View) ────────────────────────────────┐   │
│ │ Stand sideways in front of a mirror. Does your head sit:              │   │
│ │ ○ Directly over your shoulders                                        │   │
│ │ ● In front of your shoulders (forward head) ← SELECTED                │   │
│ │ ○ I'm not sure                                                        │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ STEP 2: OVERHEAD SQUAT ─────────────────────────────────────────────┐   │
│ │ Do a squat with arms overhead (like a prisoner squat). Do your knees:│   │
│ │ ○ Stay aligned with your toes                                         │   │
│ │ ● Move inward (toward each other) ← SELECTED                          │   │
│ │ ○ I'm not sure                                                        │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ ┌─ STEP 3: SHOULDER MOBILITY ──────────────────────────────────────────┐   │
│ │ Stand with arms at your sides. Raise both arms overhead. Do your:    │   │
│ │ ○ Arms go straight overhead without arching your back                │   │
│ │ ● Back arches / arms don't reach fully vertical ← SELECTED            │   │
│ │ ○ I'm not sure                                                        │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ [BACK] [GET MY RESULTS →]                                                  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ 📊 YOUR RESULTS                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ Based on your answers, you may have:                                       │
│                                                                            │
│ ⚠️ **Upper Crossed Syndrome (UCS)**                                       │
│    **Common causes**: Desk work, poor posture, smartphone use             │
│    **Can lead to**: Neck pain, shoulder tension, headaches                │
│    **Self-help**: Pec stretches, upper back strengthening                 │
│                                                                            │
│ ⚠️ **Pronation Distortion Syndrome (PDS)**                                │
│    **Common causes**: Flat feet, weak glutes, tight calves                │
│    **Can lead to**: Knee pain, shin splints, plantar fasciitis            │
│    **Self-help**: Calf stretches, glute activation exercises              │
│                                                                            │
│ ┌─ 🎯 WHAT'S NEXT? ────────────────────────────────────────────────────┐  │
│ │ A full professional assessment with one of our **NASM-CES certified**│  │
│ │ trainers will:                                                        │  │
│ │ ✓ Identify the ROOT CAUSE of your movement issues                    │  │
│ │ ✓ Create a personalized corrective exercise plan                     │  │
│ │ ✓ Prevent future injuries and chronic pain                           │  │
│ │ ✓ Get you started on a NASM-aligned training program                 │  │
│ │                                                                       │  │
│ │ **Limited Time Offer**: First assessment FREE with Client signup     │  │
│ │ (Normally $50 - Save 100%)                                            │  │
│ │                                                                       │  │
│ │ [BOOK FREE ASSESSMENT →] [$0 - Limited Spots Available]               │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│ [DOWNLOAD FULL REPORT (PDF)] [SHARE ON SOCIAL] [UPGRADE TO CLIENT]        │
└────────────────────────────────────────────────────────────────────────────┘
```

**Lead Generation Strategy**:
- Offer free self-assessment (low barrier to entry)
- Provide valuable generic results (build trust)
- Create urgency: "CES-trained specialists can fix this"
- Lead magnet: Downloadable PDF report (requires email signup)
- Clear CTA: Free professional assessment (value: $50) with Client upgrade

**Email Capture**:
```
To download your full assessment report (PDF):
Email: [_________________]
☐ Yes, send me tips to improve my movement quality
[DOWNLOAD MY REPORT]
```

---

## 📅 Implementation Roadmap (NASM × 4-Tier Integration)

### **Phase 0: Database Foundation (Week 1)**
**Est. Time**: 8-12 hours

**Tasks**:
- ✅ Implement all NASM database tables (client_opt_phases, movement_assessments, corrective_protocols, etc.)
- ✅ Run migrations and verify schema
- ✅ Seed exercise_library with 150+ NASM-tagged exercises
  - 50 Phase 1 exercises (stabilization)
  - 40 Phase 2 exercises (strength endurance)
  - 30 Phase 3 exercises (hypertrophy)
  - 20 Phase 4 exercises (max strength)
  - 10 Phase 5 exercises (power)
- ✅ Create 5 pre-built workout templates (1 per phase, admin-approved)
- ✅ Seed corrective_protocols with UCS, LCS, PDS templates

**Deliverables**:
- `backend/migrations/20251112000000-create-nasm-tables.cjs`
- `backend/seeds/nasm-exercise-library-seed.mjs`
- `backend/seeds/nasm-workout-templates-seed.mjs`

---

### **Phase 1: Admin Dashboard (Weeks 2-3)**
**Est. Time**: 16-20 hours

**Tasks**:
- ✅ **NASM Template Builder** (`<NAsmTemplateBuilder />`)
  - Phase selector with dynamic acute variable suggestions
  - Exercise library integration (filtered by phase)
  - Corrective protocol selector (UCS/LCS/PDS templates)
  - Superset builder for Phase 2
  - Contraindication warnings
  - Save/approve workflow
- ✅ **Exercise Library Management** (`<ExerciseLibraryManager />`)
  - Searchable, filterable table
  - Add/edit exercises (phase tags, equipment, contraindications)
  - Video upload integration
  - Approve/reject workflow
- ✅ **NASM Compliance Dashboard** (`<NAsmComplianceDashboard />`)
  - Platform-wide metrics (phase adherence, corrective usage, pain flag rate)
  - Trainer compliance leaderboard
  - Client phase distribution chart
  - Certification status summary
- ✅ **Trainer Certification Management** (`<TrainerCertificationManager />`)
  - Upload certificates (NASM-CPT, CES, PES, FNS)
  - Track expiration dates
  - Auto-expire trigger
  - Send renewal reminders (email integration)

**API Endpoints**:
```typescript
POST   /api/admin/workout-templates
GET    /api/admin/workout-templates
PUT    /api/admin/workout-templates/:id/approve
DELETE /api/admin/workout-templates/:id

POST   /api/admin/exercise-library
GET    /api/admin/exercise-library
PUT    /api/admin/exercise-library/:id
DELETE /api/admin/exercise-library/:id

GET    /api/admin/nasm/compliance-metrics
GET    /api/admin/nasm/trainer-compliance/:trainerId

POST   /api/admin/trainer-certifications
GET    /api/admin/trainer-certifications
PUT    /api/admin/trainer-certifications/:id
```

---

### **Phase 2: Trainer Dashboard (Weeks 4-5)**
**Est. Time**: 20-24 hours

**Tasks**:
- ✅ **Movement Assessment Module** (`<MovementAssessmentTool />`)
  - Digital OHS/SL squat assessment forms
  - Photo/video upload (front/side/back views)
  - Compensation checklist (knee valgus, forward head, etc.)
  - AI-suggested corrective protocol (confidence score)
  - Save assessment → auto-create corrective protocol
- ✅ **Phase-Aware Workout Builder** (`<PhaseAwareWorkoutBuilder />`)
  - Client phase selector (auto-loads current phase)
  - Exercise library auto-filtered by phase
  - Acute variables pre-filled (reps, sets, tempo, rest)
  - Contraindication alerts ("Exercise X is contraindicated for this client")
  - Superset builder (Phase 2 hallmark)
  - Substitution suggestions
  - Save workout → assign to client
- ✅ **Session Logging with Acute Variable Tracking** (`<SessionLogger />`)
  - iPad PWA interface (large touch targets)
  - Log sets/reps/weight/tempo/rest/RPE per exercise
  - Pain flag button (quick report discomfort)
  - Readiness pre-session slider (1-10)
  - Overall session RPE post-session
  - Auto-calculate adherence score
- ✅ **Client Phase Progression Tracker** (`<ClientPhaseTimeline />`)
  - Visual timeline (Phase 1 → Phase 2 → Phase 3 → ...)
  - Progress bar (Week 3 of 4)
  - Progression criteria checklist
  - "Ready to Advance?" indicator
  - Advance to Next Phase button

**API Endpoints**:
```typescript
POST   /api/trainer/movement-assessments
GET    /api/trainer/movement-assessments/:clientId
POST   /api/trainer/corrective-protocols
GET    /api/trainer/corrective-protocols/:clientId
PUT    /api/trainer/corrective-protocols/:id

POST   /api/trainer/workouts
GET    /api/trainer/workouts/:clientId
PUT    /api/trainer/workouts/:id

POST   /api/trainer/session-logs
GET    /api/trainer/session-logs/:clientId

GET    /api/trainer/clients/:id/opt-phase
PUT    /api/trainer/clients/:id/opt-phase/advance
GET    /api/trainer/clients/:id/progression-criteria
```

---

### **Phase 3: Client Dashboard (Weeks 6-7)**
**Est. Time**: 16-20 hours

**Tasks**:
- ✅ **"My Training Phase" Widget** (`<MyTrainingPhaseWidget />`)
  - Current phase display (name, purpose, what to expect)
  - Progress bar (Week X of Y)
  - Workouts completed counter
  - Phase adherence score
  - Avg readiness display
  - Next phase teaser
- ✅ **Workout Display with Rationale** (`<WorkoutWithRationale />`)
  - Today's workout layout (warm-up, main blocks, cool-down)
  - Exercise cards with "Why this exercise?" info icons
  - Demo video buttons
  - Set logging interface (weight, reps, RPE)
  - Pain flag button (quick report)
  - Rest timer integration
- ✅ **Corrective Homework Tracker** (`<CorrectiveHomeworkTracker />`)
  - Daily routine display (morning + evening)
  - Exercise checklist with demo videos
  - Mark complete buttons
  - Progress stats (compliance %, streak, XP earned)
  - Gamification badges
  - Trainer feedback display
- ✅ **Phase-Contextual Progress Charts** (`<PhaseProgressCharts />`)
  - P1: Stability score, balance improvements
  - P2: Work capacity (total volume over time)
  - P3: Muscle measurements, total volume per muscle group
  - P4: 1RM progression (squat, deadlift, bench, etc.)
  - P5: Power output (vertical jump, sprint times)

**API Endpoints**:
```typescript
GET    /api/client/my-opt-phase
GET    /api/client/my-workout-today
POST   /api/client/log-set
POST   /api/client/pain-flag

GET    /api/client/corrective-homework
POST   /api/client/corrective-homework/complete
GET    /api/client/corrective-homework/stats

GET    /api/client/progress (returns phase-contextual charts)
```

---

### **Phase 4: User (Free Tier) Dashboard (Week 8)**
**Est. Time**: 8-12 hours

**Tasks**:
- ✅ **"NASM Workout of the Week"** (`<FreeNAsmWorkout />`)
  - Display 1 Phase 1 workout per week
  - Full workout details (warm-up, circuits, cool-down)
  - Demo video links
  - Educational content ("The NASM Difference")
  - Upgrade CTA ("Unlock Phases 2-5")
  - Social share button (+25 XP if completed + shared)
- ✅ **Self-Assessment Tool** (`<FreeSelfAssessment />`)
  - 5-question guided assessment (posture, OHS, shoulder mobility, etc.)
  - AI-generated results (UCS, LCS, PDS insights)
  - Educational content (causes, consequences, self-help tips)
  - Lead magnet: Downloadable PDF report (requires email)
  - CTA: "Book Free Professional Assessment" ($50 value)
- ✅ **"NASM-Trained Client" Badge** (`<NAsmBadge />`)
  - Display on Client profiles (social proof)
  - Visible in User feeds ("@jane is NASM-Trained!")
  - Creates aspirational value for free Users

**API Endpoints**:
```typescript
GET    /api/user/workout-of-the-week
POST   /api/user/self-assessment
GET    /api/user/self-assessment-results/:id
POST   /api/user/self-assessment/download-pdf (email capture)
```

---

### **Phase 5: AI Coach Integration (Week 9)**
**Est. Time**: 12-16 hours

**Tasks**:
- ✅ Integrate NASM Master Prompt into AI Coach system
- ✅ Workout generation endpoint (`/api/ai/generate-workout`)
  - Input: clientId, phase, goal, equipment, compensations
  - Output: NASM-aligned workout JSON
- ✅ AI Coach tips (Client tier only)
  - Free tier: 3 generic tips/week
  - Paid tier: Unlimited personalized tips
- ✅ AI Compensation Detection (from uploaded assessment videos)
  - Use computer vision API (e.g., Pose Estimation) to detect knee valgus, forward head, etc.
  - Auto-populate compensation checklist for trainers
- ✅ AI Exercise Substitution Suggester
  - Input: Original exercise + client contraindications
  - Output: Top 3 alternative exercises (same pattern, no contraindications)

**API Endpoints**:
```typescript
POST   /api/ai/generate-workout
POST   /api/ai/detect-compensations (upload video)
POST   /api/ai/suggest-substitution
GET    /api/ai/coach-tip (rate-limited by user tier)
```

---

### **Phase 6: Testing & QA (Week 10)**
**Est. Time**: 16-20 hours

**Tasks**:
- ✅ **Unit Tests**:
  - Acute variable validation logic
  - Phase progression criteria
  - Corrective protocol assignment
  - Gamification XP calculation
- ✅ **Integration Tests**:
  - Admin creates template → Trainer uses template → Client logs workout
  - Trainer performs assessment → AI suggests protocol → Client gets homework
  - Client completes workout → Adherence score calculated → Admin sees compliance dashboard
- ✅ **User Acceptance Testing**:
  - Admin onboarding (create templates, manage library)
  - Trainer workflows (assess client, build workout, log session)
  - Client experience (view phase, complete workout, log homework)
  - Free user experience (workout of week, self-assessment, upgrade CTAs)

---

### **Phase 7: Documentation & Rollout (Week 11)**
**Est. Time**: 8-12 hours

**Tasks**:
- ✅ Create trainer onboarding guide (NASM system overview, feature tutorials)
- ✅ Create client onboarding guide (understanding OPT phases, using homework tracker)
- ✅ Create admin documentation (template approval workflow, compliance monitoring)
- ✅ Record video tutorials for all dashboards
- ✅ Soft launch with 10 beta clients (1 per phase)
- ✅ Gather feedback and iterate
- ✅ Full platform rollout

---

## 🎯 Success Metrics (NASM × 4-Tier KPIs)

### **User Tier (Free)**
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Activation Rate** | 70% | % of Users who complete onboarding + try 1 free workout |
| **Engagement Rate** | 50% | % of Users who log 3+ workouts in first 2 weeks |
| **Self-Assessment Completion** | 40% | % of Users who complete self-assessment tool |
| **Conversion Rate (User → Client)** | 10% | % of Users who upgrade to paid Client tier within 90 days |

### **Client Tier (Paid)**
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Phase Adherence** | 90% | % of workouts with correct acute variables for client's phase |
| **Corrective Homework Compliance** | 75% | % of clients completing daily corrective exercises |
| **Phase Progression Rate** | 85% | % of clients advancing to next phase within target weeks |
| **Injury Rate** | <2% | % of clients reporting pain flags during training |
| **Client Satisfaction** | 90% | % of clients rating training as "effective and safe" (post-session surveys) |
| **Retention Rate** | 60% | % of clients renewing or purchasing new package after completion |

### **Trainer Performance**
| Metric | Target | Measurement |
|--------|--------|-------------|
| **NASM Certification Rate** | 100% CPT, 40% CES, 15% PES | % of trainers with each certification level |
| **Phase Adherence Score** | 92% | % of trainer's workouts adhering to prescribed acute variables |
| **Corrective Usage Rate** | 78% | % of trainer's clients with compensations receiving CEx protocols |
| **Client Progression Rate** | 85% | % of trainer's clients advancing on schedule |
| **Pain Flag Rate** | <5% | % of trainer's sessions with pain reported (lower is better) |

### **Platform (Admin)**
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Platform Phase Adherence** | 92% | Avg acute variables adherence across all sessions |
| **Corrective Protocol Usage** | 78% | % of clients with compensations receiving CEx |
| **Template Approval Rate** | 95% | % of admin-created templates approved on first submission |
| **Exercise Library Coverage** | 150+ exercises | Total approved exercises across all phases |
| **Trainer Compliance** | 90% | % of trainers meeting all 3 compliance targets |

---

## 🚀 Go-Live Checklist

### **Pre-Launch (Week 0)**
- [ ] All database migrations run successfully
- [ ] Exercise library seeded with 150+ exercises
- [ ] 5 workout templates created and approved (1 per phase)
- [ ] Corrective protocol templates (UCS, LCS, PDS) seeded
- [ ] All API endpoints tested and documented
- [ ] Admin dashboard features QA'd
- [ ] Trainer dashboard features QA'd
- [ ] Client dashboard features QA'd
- [ ] User (free tier) features QA'd

### **Soft Launch (Week 11)**
- [ ] Onboard 10 beta clients (2 per phase)
- [ ] Onboard 3 beta trainers (1 CPT-only, 1 CES, 1 PES)
- [ ] Admin monitors compliance dashboard daily
- [ ] Collect feedback via surveys after each workout
- [ ] Fix critical bugs within 24 hours

### **Full Launch (Week 12)**
- [ ] All beta feedback implemented
- [ ] Performance tested (dashboard load times <3s)
- [ ] Mobile responsiveness verified (iOS + Android)
- [ ] Video tutorials published
- [ ] Marketing materials updated ("NASM-Aligned Training")
- [ ] Press release: "SwanStudios - The Only NASM-Powered Fitness Platform"

---

## 🏁 Conclusion

This comprehensive blueprint integrates **NASM's evidence-based OPT™ model** with **SwanStudios' 4-tier user hierarchy**, creating a competitive advantage through:

1. **Scientific Credibility**: NASM-aligned programming sets SwanStudios apart from generic fitness apps
2. **Clear Value Ladder**: Free tier (Phase 1 only) → Paid tier (Full OPT access) drives conversions
3. **Trainer Quality Assurance**: Certification-gated features ensure high-quality programming
4. **Business Model Alignment**: NASM methodology justifies premium pricing and drives User → Client conversion

**Next Steps**: Begin Phase 0 (Database Foundation) to lay the groundwork for NASM integration across all user tiers.

