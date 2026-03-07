# Cross-Component Intelligence Layer
## SwanStudios AI Form Analysis — Phase 9 Design Document

### AI Village Review Request
This document defines the integration layer connecting all 9 SwanStudios subsystems into a unified, intelligent workout programming platform.
Please review for: security, architecture, code quality, UX, performance, and competitive gaps.

---

## Overview

The Cross-Component Intelligence Layer is the nervous system of SwanStudios. It connects:

1. **Pain Management** (ClientPainEntry, BodyMap)
2. **Movement Analysis** (7-step NASM wizard)
3. **Workout Plans** (WorkoutPlan hierarchy, LongTermProgramPlan, ProgramMesocycleBlock)
4. **Session Packages** (StorefrontItem, SessionPackage — duration maps to plan horizon)
5. **Daily Workout Form** (DailyWorkoutForm — RPE, form ratings, pain levels)
6. **Admin Command Center** (Dashboard metrics, health stats)
7. **AI Form Analysis** (81-exercise library, MediaPipe, compensations, corrective recommendations)
8. **Equipment Profiles** (Location-based inventories, AI photo recognition)
9. **Workout Variation Engine** (2-week rotation, equipment-aware substitution)

---

## A. Data Flow Architecture

### The Intelligence Graph

```
                    ┌─────────────────────────────────┐
                    │   INTELLIGENT WORKOUT BUILDER    │
                    │   (Consumes ALL context below)   │
                    └──────────┬──────────────────────┘
                               │
        ┌──────────┬───────────┼───────────┬──────────┐
        ▼          ▼           ▼           ▼          ▼
   ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │  PAIN   │ │ COMPEN-│ │EQUIP-  │ │WORKOUT │ │SESSION │
   │  DATA   │ │SATIONS │ │MENT    │ │HISTORY │ │PACKAGE │
   └────┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
        │          │          │          │          │
   ClientPain  FormAnalysis  Equipment  WorkoutPlan  StorefrontItem
   Entry       Results       Profiles   Day/Exercise SessionPackage
   BodyMap     Compensations Items/Map  DailyForm   Session
   Movement    Correctives   ExerciseMap VariationLog
   Analysis    RepData
```

### Data Flow Rules

1. **Pain → Exercise Exclusion**
   - ClientPainEntry severity >= 7 → AUTO-EXCLUDE exercises targeting that region for 72 hours
   - Severity 4-6 → WARN trainer, suggest modifications (reduced ROM, lighter load)
   - Severity 1-3 → LOG only, no restrictions
   - PosturalSyndrome (upper/lower crossed) → inject corrective exercises into warmup

2. **Compensations → Exercise Selection**
   - Detected compensations (knee valgus, forward lean, etc.) feed into variation engine
   - NASM CES continuum (Inhibit → Lengthen → Activate → Integrate) auto-inserted
   - Compensation trend (improving/worsening over sessions) adjusts corrective intensity

3. **Equipment → Exercise Constraints**
   - Active equipment profile filters available exercises
   - Equipment-to-exercise mapping determines what's possible at each location
   - If client trains at multiple locations, plan includes location-specific variants

4. **History → Progressive Overload + Novelty**
   - Past 4 weeks of workout data analyzed for volume/intensity trends
   - Variation engine checks last 2 sessions to avoid repeats during SWITCH
   - RPE trends inform load progression (RPE consistently < 6 → increase, > 8 → decrease)

5. **Package → Plan Horizon**
   - 10-24 session package → 3-month LongTermProgramPlan
   - 6-month package → 6-month LongTermProgramPlan
   - 12-month package → 12-month LongTermProgramPlan
   - Session frequency (sessions/week) derived from package size / horizon weeks

6. **Form Scores → Quality Feedback Loop**
   - DailyWorkoutForm scores < 3/5 for an exercise → flag for review
   - Consistent poor form on exercise → suggest regression or corrective focus
   - FormAnalysis video scores feed back into compensation database

---

## B. Shared Services Layer

### Backend Service: ClientIntelligenceService

```javascript
// backend/services/clientIntelligenceService.mjs
// Central aggregation service — queries all subsystems for a client

export class ClientIntelligenceService {

  /**
   * Get complete client context for workout generation.
   * This is the PRIMARY input to the Intelligent Workout Builder.
   */
  async getClientContext(clientId, profileId = null) {
    const [
      painData,
      compensations,
      equipment,
      workoutHistory,
      activePackage,
      formScores,
      movementAnalysis
    ] = await Promise.all([
      this.getActivePainEntries(clientId),
      this.getCompensationProfile(clientId),
      this.getEquipmentProfile(profileId),
      this.getRecentWorkoutHistory(clientId, 28), // last 4 weeks
      this.getActiveSessionPackage(clientId),
      this.getFormScoreHistory(clientId, 14),     // last 2 weeks
      this.getMovementAnalysisFindings(clientId)
    ]);

    return {
      clientId,
      painData: {
        activeEntries: painData,
        excludedRegions: this.getExcludedRegions(painData),
        warnRegions: this.getWarnRegions(painData),
        posturalSyndromes: this.getPosturalSyndromes(painData)
      },
      compensations: {
        active: compensations,
        trending: this.getCompensationTrend(compensations),
        correctiveNeeds: this.mapToCESContinuum(compensations)
      },
      equipment: {
        profileId: equipment?.id,
        profileName: equipment?.name,
        availableExercises: equipment?.exercises || [],
        availableCategories: equipment?.categories || []
      },
      workoutHistory: {
        recentSessions: workoutHistory,
        volumeTrend: this.calculateVolumeTrend(workoutHistory),
        exercisesUsedRecently: this.getRecentExercises(workoutHistory, 2),
        averageRPE: this.calculateAverageRPE(workoutHistory),
        rotationPosition: this.getRotationPosition(workoutHistory)
      },
      packageContext: {
        packageId: activePackage?.id,
        packageName: activePackage?.name,
        totalSessions: activePackage?.totalSessions,
        sessionsUsed: activePackage?.sessionsUsed,
        sessionsRemaining: activePackage?.sessionsRemaining,
        planHorizonMonths: this.mapPackageToHorizon(activePackage),
        suggestedFrequency: this.calculateFrequency(activePackage)
      },
      formQuality: {
        recentScores: formScores,
        flaggedExercises: this.getFlaggedExercises(formScores),
        overallTrend: this.getFormTrend(formScores)
      },
      movementAnalysis: {
        findings: movementAnalysis?.assessmentFindings,
        nasmPhase: movementAnalysis?.recommendedPhase || 1,
        lastAssessmentDate: movementAnalysis?.date
      }
    };
  }

  // Pain exclusion logic
  getExcludedRegions(painEntries) {
    const now = new Date();
    const cutoff72h = new Date(now - 72 * 60 * 60 * 1000);
    return painEntries
      .filter(e => e.painLevel >= 7 && new Date(e.createdAt) > cutoff72h)
      .map(e => ({
        region: e.bodyRegion,
        severity: e.painLevel,
        muscleGroups: REGION_TO_MUSCLE_MAP[e.bodyRegion] || [],
        expiresAt: new Date(new Date(e.createdAt).getTime() + 72 * 60 * 60 * 1000)
      }));
  }

  getWarnRegions(painEntries) {
    return painEntries
      .filter(e => e.painLevel >= 4 && e.painLevel < 7)
      .map(e => ({
        region: e.bodyRegion,
        severity: e.painLevel,
        muscleGroups: REGION_TO_MUSCLE_MAP[e.bodyRegion] || [],
        suggestion: 'reduce_rom_or_load'
      }));
  }

  // Package to plan horizon mapping
  mapPackageToHorizon(pkg) {
    if (!pkg) return 3;
    const total = pkg.totalSessions;
    if (total <= 24) return 3;   // 10-24 pack = 3 months
    if (total <= 48) return 6;   // ~48 sessions = 6 months
    return 12;                   // 96+ sessions = 12 months
  }

  // Compensation trend analysis
  getCompensationTrend(compensations) {
    // Compare last 2 weeks vs previous 2 weeks
    // Returns: 'improving', 'stable', 'worsening'
    const recent = compensations.filter(c => c.age <= 14);
    const older = compensations.filter(c => c.age > 14 && c.age <= 28);
    const recentAvg = recent.reduce((s, c) => s + c.severity, 0) / (recent.length || 1);
    const olderAvg = older.reduce((s, c) => s + c.severity, 0) / (older.length || 1);
    if (recentAvg < olderAvg - 0.5) return 'improving';
    if (recentAvg > olderAvg + 0.5) return 'worsening';
    return 'stable';
  }

  // NASM CES continuum mapping
  mapToCESContinuum(compensations) {
    return compensations.map(comp => ({
      compensation: comp.type,
      continuum: {
        inhibit: CES_MAP[comp.type]?.inhibit || [],
        lengthen: CES_MAP[comp.type]?.lengthen || [],
        activate: CES_MAP[comp.type]?.activate || [],
        integrate: CES_MAP[comp.type]?.integrate || []
      }
    }));
  }
}
```

### Body Region to Muscle Group Mapping

```javascript
// Maps BodyMap 49 regions to NASM muscle taxonomy
const REGION_TO_MUSCLE_MAP = {
  // Head/Neck
  'neck_front': ['sternocleidomastoid', 'scalenes'],
  'neck_back': ['upper_trapezius', 'levator_scapulae'],

  // Shoulders
  'shoulder_left_front': ['anterior_deltoid', 'pectoralis_minor'],
  'shoulder_right_front': ['anterior_deltoid', 'pectoralis_minor'],
  'shoulder_left_back': ['posterior_deltoid', 'rotator_cuff'],
  'shoulder_right_back': ['posterior_deltoid', 'rotator_cuff'],

  // Chest
  'chest_left': ['pectoralis_major', 'pectoralis_minor'],
  'chest_right': ['pectoralis_major', 'pectoralis_minor'],

  // Upper Back
  'upper_back_left': ['rhomboids', 'mid_trapezius', 'latissimus_dorsi'],
  'upper_back_right': ['rhomboids', 'mid_trapezius', 'latissimus_dorsi'],
  'mid_back': ['erector_spinae', 'latissimus_dorsi'],

  // Arms
  'bicep_left': ['biceps_brachii', 'brachialis'],
  'bicep_right': ['biceps_brachii', 'brachialis'],
  'tricep_left': ['triceps_brachii'],
  'tricep_right': ['triceps_brachii'],
  'forearm_left': ['wrist_flexors', 'wrist_extensors'],
  'forearm_right': ['wrist_flexors', 'wrist_extensors'],

  // Core
  'abdomen_upper': ['rectus_abdominis', 'transverse_abdominis'],
  'abdomen_lower': ['rectus_abdominis', 'transverse_abdominis', 'hip_flexors'],
  'oblique_left': ['internal_oblique', 'external_oblique'],
  'oblique_right': ['internal_oblique', 'external_oblique'],
  'lower_back': ['erector_spinae', 'multifidus', 'quadratus_lumborum'],

  // Hips
  'hip_left_front': ['hip_flexors', 'tensor_fasciae_latae'],
  'hip_right_front': ['hip_flexors', 'tensor_fasciae_latae'],
  'hip_left_back': ['gluteus_maximus', 'gluteus_medius'],
  'hip_right_back': ['gluteus_maximus', 'gluteus_medius'],
  'groin_left': ['adductors'],
  'groin_right': ['adductors'],

  // Upper Legs
  'quad_left': ['quadriceps'],
  'quad_right': ['quadriceps'],
  'hamstring_left': ['hamstrings'],
  'hamstring_right': ['hamstrings'],
  'it_band_left': ['tensor_fasciae_latae', 'vastus_lateralis'],
  'it_band_right': ['tensor_fasciae_latae', 'vastus_lateralis'],

  // Knees
  'knee_left': ['quadriceps', 'hamstrings', 'gastrocnemius'],
  'knee_right': ['quadriceps', 'hamstrings', 'gastrocnemius'],

  // Lower Legs
  'calf_left': ['gastrocnemius', 'soleus'],
  'calf_right': ['gastrocnemius', 'soleus'],
  'shin_left': ['anterior_tibialis'],
  'shin_right': ['anterior_tibialis'],

  // Feet/Ankles
  'ankle_left': ['gastrocnemius', 'soleus', 'peroneals'],
  'ankle_right': ['gastrocnemius', 'soleus', 'peroneals'],
  'foot_left': ['intrinsic_foot'],
  'foot_right': ['intrinsic_foot']
};
```

### CES Compensation Continuum Map

```javascript
// NASM CES 4-step continuum for each detected compensation
const CES_MAP = {
  knee_valgus: {
    inhibit: ['TFL/IT Band foam roll', 'Adductor foam roll'],
    lengthen: ['TFL static stretch', 'Adductor static stretch'],
    activate: ['Side-lying hip abduction', 'Clamshell'],
    integrate: ['Single-leg squat with band', 'Step-up to balance']
  },
  forward_lean: {
    inhibit: ['Hip flexor foam roll', 'Calf foam roll'],
    lengthen: ['Hip flexor kneeling stretch', 'Calf wall stretch'],
    activate: ['Floor bridge', 'Prone cobra'],
    integrate: ['Overhead squat', 'Step-up to overhead press']
  },
  hip_shift: {
    inhibit: ['Adductor foam roll', 'Piriformis foam roll'],
    lengthen: ['Adductor stretch', 'Piriformis stretch'],
    activate: ['Single-leg glute bridge', 'Side-lying hip abduction'],
    integrate: ['Single-leg Romanian deadlift', 'Lateral tube walk']
  },
  shoulder_elevation: {
    inhibit: ['Upper trapezius foam roll', 'Levator scapulae foam roll'],
    lengthen: ['Upper trap stretch', 'Levator scapulae stretch'],
    activate: ['Ball combo I (lower trap)', 'Ball combo II (mid trap)'],
    integrate: ['Squat to row', 'Single-leg cable row']
  },
  excessive_forward_lean: {
    inhibit: ['Gastrocnemius foam roll', 'Hip flexor foam roll'],
    lengthen: ['Soleus stretch', 'Hip flexor stretch'],
    activate: ['Anterior tibialis activation', 'Glute bridge'],
    integrate: ['Multi-directional lunge', 'Step-up to balance']
  },
  arms_fall_forward: {
    inhibit: ['Lat foam roll', 'Pec minor foam roll'],
    lengthen: ['Lat ball stretch', 'Pec doorway stretch'],
    activate: ['Floor slide (wall angel)', 'Prone Y raise'],
    integrate: ['Overhead squat with band', 'Cable overhead press']
  },
  heel_rise: {
    inhibit: ['Calf foam roll (gastrocnemius + soleus)'],
    lengthen: ['Calf stretch (straight + bent knee)'],
    activate: ['Anterior tibialis raise', 'Single-leg balance'],
    integrate: ['Multi-directional hop to stabilize', 'Step-up to balance']
  },
  bilateral_asymmetry: {
    inhibit: ['Foam roll dominant-side overactive muscles'],
    lengthen: ['Static stretch dominant-side tight muscles'],
    activate: ['Unilateral activation on weak side'],
    integrate: ['Single-leg exercises emphasizing weak side']
  }
};
```

---

## C. REST API Endpoints

### Client Intelligence API

```
GET  /api/client-intelligence/:clientId
     → Returns full ClientContext (all 9 subsystems aggregated)
     → Query params: ?profileId=X (optional equipment profile)
     → Auth: admin, trainer, or self (client viewing own data)

GET  /api/client-intelligence/:clientId/pain-constraints
     → Returns excluded regions, warned regions, postural syndromes
     → Used by workout builder to filter exercises

GET  /api/client-intelligence/:clientId/compensation-profile
     → Returns active compensations with CES continuum
     → Includes trend (improving/stable/worsening)

GET  /api/client-intelligence/:clientId/workout-readiness
     → Composite "readiness score" factoring pain, RPE, form scores, sleep
     → Returns: { score: 0-100, factors: [], recommendation: string }
```

### Intelligent Workout Builder API

```
POST /api/workout-builder/generate
     Body: {
       clientId,
       profileId,         // equipment profile
       type: 'single' | 'plan',
       planHorizonMonths,  // 3, 6, or 12 (auto-derived from package if omitted)
       bodyParts: [],      // target body parts
       nasmPhase: 1-5,     // OPT model phase
       preferences: {}     // trainer overrides
     }
     → Returns: generated workout or plan with AI explanations
     → Each exercise includes: { exercise, reason, alternatives[], constraints[] }

POST /api/workout-builder/regenerate
     Body: {
       planId,
       exerciseId,        // specific exercise to regenerate
       reason: string     // why trainer wants different option
     }
     → Returns: new exercise suggestion with NASM confidence

GET  /api/workout-builder/ai-explanations/:planId
     → Returns all AI decision explanations for a generated plan
     → "Why was X excluded?", "Why was Y chosen over Z?"
```

### Admin Intelligence API

```
GET  /api/admin/intelligence/overview
     → Dashboard overview: pain alerts, pending approvals, form analysis stats
     → Auth: admin only

GET  /api/admin/intelligence/pain-alerts
     → All clients with pain severity >= 7 in last 72 hours
     → Includes: client name, region, severity, affected exercises

GET  /api/admin/intelligence/compensation-trends
     → Compensation trends across all clients
     → Aggregate: most common compensations, improving vs worsening

GET  /api/admin/intelligence/plan-adherence
     → Plan adherence metrics: sessions completed vs planned
     → Per-client and aggregate

GET  /api/admin/intelligence/session-utilization
     → Package utilization: sessions used vs remaining, burn rate
     → Alerts for packages nearing expiration

GET  /api/admin/intelligence/form-analysis-activity
     → Recent form analysis: videos processed, avg scores, flagged exercises
```

---

## D. Admin Dashboard Widgets (Gemini 3.1 Pro Specs)

### Layout: 12-Column CSS Grid

```css
.admin-intelligence-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  padding: 24px;
}
```

### Widget 1: "The Pulse" — Pain & Compensation Alerts (4 columns)

```
+-----------------------------------------------+
|  The Pulse                    [3 active]        |
|  Pain & Compensation Alerts                     |
|------------------------------------------------|
|  ⚠ John D. — Level 8 Shoulder Pain            |
|    AI locked upper-body pushing (72h)           |
|    Expires: Mar 8, 2:15 PM                      |
|                                                 |
|  ⚠ Sarah M. — Knee Valgus WORSENING           |
|    CES continuum intensified                    |
|    Trend: ▼ 3 sessions                          |
|                                                 |
|  ✓ Mike R. — Lower Back Pain RESOLVED          |
|    Cleared for full programming                 |
|    Resolved: 2 days ago                         |
+-----------------------------------------------+
```

- Background: `rgba(255, 51, 102, 0.05)` for active alerts
- Border-left: `4px solid #FF3366` (alert items)
- Border-left: `4px solid #00FF88` (resolved items)
- Scrollable feed, max-height 400px
- Pulsing red badge when severity >= 8

### Widget 2: Form Analysis Queue (4 columns)

```
+-----------------------------------------------+
|  Form Analysis                [12 today]        |
|  AI Video Processing                            |
|------------------------------------------------|
|                                                 |
|  [====●====] 87% avg score today               |
|                                                 |
|  Recent:                                        |
|  * John D. — Squat: 92/100 (excellent)         |
|  * Sarah M. — Deadlift: 68/100 (needs work)    |
|  * Mike R. — Bench Press: 85/100 (good)        |
|                                                 |
|  Flagged:                                       |
|  * Sarah M. — 3 exercises below 70             |
|  * New client — No analysis yet                |
+-----------------------------------------------+
```

- Circular progress SVG for daily average score
- Track: `rgba(255,255,255,0.1)`
- Progress: `#00FFFF` with `filter: drop-shadow(0 0 8px rgba(0,255,255,0.6))`
- Score color: >= 80 cyan, 60-79 purple, < 60 red

### Widget 3: NASM Adherence Radar (4 columns)

```
+-----------------------------------------------+
|  NASM Adherence               Phase 2           |
|  Training Balance                               |
|------------------------------------------------|
|                                                 |
|           Flexibility                           |
|              /\                                 |
|    SAQ  /        \  Core                        |
|        /    ●     \                             |
|        \          /                             |
|    Plyo \        / Balance                      |
|           \/                                    |
|          Resistance                             |
|                                                 |
|  Overall Balance: 78% (Good)                    |
+-----------------------------------------------+
```

- Custom SVG radar chart (no chart library)
- Axes: Flexibility, Core, Balance, Plyometric, SAQ, Resistance
- Fill: `rgba(0, 255, 255, 0.15)` with `stroke: #00FFFF`
- Neon glow via `feDropShadow` SVG filter

### Widget 4: Equipment Intelligence (4 columns)

```
+-----------------------------------------------+
|  Equipment Intelligence       [3 pending]       |
|------------------------------------------------|
|  Move Fitness    | 47 items | 2 pending         |
|  Park / Outdoor  | 0 items  | Setup needed      |
|  Home Gym        | 12 items | All approved       |
|  Client Home     | 8 items  | 1 pending          |
|------------------------------------------------|
|  Recent: Sean scanned 3 items (2m ago)          |
+-----------------------------------------------+
```

- Pulsing Swan Cyan badge for pending count
- GlassCard with `backdrop-filter: blur(12px)`

### Widget 5: Plan Adherence (4 columns)

```
+-----------------------------------------------+
|  Plan Adherence               92% avg           |
|------------------------------------------------|
|  John D.   ████████████░░  85% (12/14)         |
|  Sarah M.  ██████████████  100% (14/14)         |
|  Mike R.   ██████████░░░░  71% (10/14)          |
|  Lisa K.   ████████████░░  86% (12/14)          |
|------------------------------------------------|
|  ⚠ Mike R. missed 4 sessions this cycle        |
+-----------------------------------------------+
```

- Progress bars with gradient fill (cyan → purple)
- Alert for clients below 75% adherence

### Widget 6: Session Utilization (4 columns)

```
+-----------------------------------------------+
|  Session Utilization          4 active pkgs     |
|------------------------------------------------|
|  John D.   24-pack  18/24 used  (6 remaining)  |
|             ████████████████░░░░  75%           |
|             Burn rate: 4.5/week — expires ~2wk  |
|                                                 |
|  Sarah M.  6-month  32/48 used  (16 remaining) |
|             ████████████░░░░░░░░  67%           |
|             On track                             |
|                                                 |
|  ⚠ John D. may exhaust package in 2 weeks      |
+-----------------------------------------------+
```

- Burn rate calculation: sessions_used / weeks_elapsed
- Alert when projected depletion < 2 weeks before plan end

---

## E. Intelligent Workout Builder — Algorithm

### Single Workout Generation

```
Input: ClientContext (from ClientIntelligenceService)

Step 1: DETERMINE CONSTRAINTS
  - excludedMuscleGroups = painData.excludedRegions.flatMap(r => r.muscleGroups)
  - warnMuscleGroups = painData.warnRegions.flatMap(r => r.muscleGroups)
  - availableExercises = equipment.availableExercises
  - recentlyUsedExercises = workoutHistory.exercisesUsedRecently

Step 2: DETERMINE ROTATION POSITION
  - position = workoutHistory.rotationPosition  // 1=BUILD, 2=BUILD, 3=SWITCH
  - If SWITCH: expand exercise pool, prefer novel exercises

Step 3: BUILD WARMUP (NASM CES)
  - If posturalSyndromes detected → inject corrective warmup:
    - Upper Crossed: inhibit pecs/upper traps → lengthen → activate lower traps/deep neck flexors
    - Lower Crossed: inhibit hip flexors/erectors → lengthen → activate glutes/core
  - If active compensations → add targeted CES continuum exercises
  - Standard: 5-10 min progressive warmup

Step 4: SELECT MAIN EXERCISES
  - Filter by: bodyParts, nasmPhase, availableExercises
  - Exclude: exercises targeting excludedMuscleGroups
  - Modify: exercises targeting warnMuscleGroups (reduce volume/intensity)
  - If SWITCH position: use Variation Engine substitution logic
  - If BUILD position: use established exercises from recent sessions
  - Check NASM phase appropriateness (don't give Phase 4 to Phase 1 client)
  - Rank by: form score history (prefer exercises client does well, unless corrective)

Step 5: SET PARAMETERS
  - Sets/reps/rest based on NASM OPT phase:
    - Phase 1 (Stabilization): 1-3 sets, 12-20 reps, slow tempo (4-2-1-0), 0-90s rest
    - Phase 2 (Strength Endurance): 2-4 sets, 8-12 reps, moderate tempo, 0-60s rest
    - Phase 3 (Hypertrophy): 3-5 sets, 6-12 reps, moderate tempo (2-0-2-0), 0-60s rest
    - Phase 4 (Max Strength): 4-6 sets, 1-5 reps, explosive/controlled, 2-4min rest
    - Phase 5 (Power): 3-5 sets, 1-5 reps, explosive (X-X-X-0), 2-4min rest
  - Adjust based on RPE trend (avg RPE > 8 → reduce volume 10%)

Step 6: BUILD COOLDOWN
  - Static stretching for worked muscle groups
  - If compensations detected → additional targeted stretches

Step 7: GENERATE AI EXPLANATIONS
  - For each exercise: why selected, what alternatives exist, what constraints applied
  - For excluded exercises: why excluded (pain, compensation, equipment, phase)
  - Overall plan rationale tied to NASM framework

Output: {
  warmup: [{ exercise, sets, reps, purpose, cesStep }],
  mainWorkout: [{ exercise, sets, reps, rest, tempo, reason, alternatives, constraints, aiOptimized }],
  cooldown: [{ exercise, duration, targetMuscle }],
  metadata: {
    rotationPosition,
    nasmPhase,
    equipmentProfile,
    painConstraints,
    compensationAdjustments,
    aiExplanations: []
  }
}
```

### Long-Term Plan Generation (3/6/12 Months)

```
Input: ClientContext + planHorizonMonths

Step 1: DETERMINE PERIODIZATION
  - Map horizon to mesocycles:
    - 3 months: 3 mesocycles (4 weeks each)
    - 6 months: 6 mesocycles (4 weeks each)
    - 12 months: 12 mesocycles (4 weeks each)
  - Each mesocycle has an NASM OPT phase assignment
  - Standard progression: Phase 1 → 2 → 3 → 2 → 3 → 4 (undulating)

Step 2: ASSIGN MESOCYCLE PHASES
  - Start from client's current nasmPhase (from movement analysis)
  - Progress through OPT model over plan horizon
  - Include deload weeks every 4th week (reduce volume 40-50%)
  - Factor in package sessions: distribute evenly across horizon

Step 3: GENERATE EACH MESOCYCLE BLOCK
  - For each block: define body part split, exercise selection, progression targets
  - Equipment-aware: if client trains at multiple locations, alternate workouts per location
  - Pain-aware: reserve 10% of warmup time for corrective work if compensations exist

Step 4: SET PROGRESSIVE OVERLOAD TARGETS
  - Week-over-week: increase load 2-5% OR volume 5-10% (not both)
  - Deload weeks: reduce to 60% of peak volume
  - Track progression milestones for client motivation

Step 5: GENERATE PLAN DOCUMENT
  - Create LongTermProgramPlan with horizonMonths
  - Create ProgramMesocycleBlock for each mesocycle
  - Create WorkoutPlanDay templates for each training day
  - Create WorkoutPlanDayExercise entries

Output: LongTermProgramPlan with nested mesocycles, each containing workout templates
```

---

## F. Frontend Components

### Intelligent Workout Builder — 3-Pane Layout (Gemini 3.1 Pro Spec)

```
Desktop (1440px+):
┌──────────┬─────────────────────────────┬───────────┐
│          │                             │           │
│ CONTEXT  │     WORKOUT CANVAS          │ AI        │
│ SIDEBAR  │                             │ INSIGHTS  │
│ (300px)  │     (fluid)                 │ (350px)   │
│          │                             │           │
│ ┌──────┐ │  ┌─────────────────────┐    │ "Replaced │
│ │Avatar│ │  │ Warmup              │    │  Barbell  │
│ └──────┘ │  │ CES: Foam Roll TFL  │    │  Squat    │
│          │  │ Stretch: Hip Flexor  │    │  with     │
│ Pain Map │  └─────────────────────┘    │  Goblet   │
│ ┌──────┐ │                             │  Squat.   │
│ │ Body │ │  ┌─────────────────────┐    │           │
│ │ Map  │ │  │ A1. Goblet Squat    │    │  Reason:  │
│ │(mini)│ │  │ 3x12 | 60s rest    │    │  Knee     │
│ └──────┘ │  │ [AI OPTIMIZED ✦]   │    │  Valgus   │
│          │  │ [Revert to Original]│    │  detected │
│ Equip:   │  └─────────────────────┘    │  in last  │
│ Move     │                             │  session" │
│ Fitness  │  ┌─────────────────────┐    │           │
│          │  │ A2. DB Bench Press  │    │           │
│ Phase: 2 │  │ 3x10 | 60s rest    │    │           │
│          │  └─────────────────────┘    │           │
│          │                             │           │
└──────────┴─────────────────────────────┴───────────┘

Mobile (<768px):
  Context collapses to horizontal scroll chips
  AI Insights hidden behind "?" floating button
  Workout canvas takes full width
```

### AI-Optimized Exercise Card

```css
/* When AI has substituted an exercise */
.exercise-card--ai-optimized {
  border: 1px solid rgba(0, 255, 255, 0.4);
  box-shadow: inset 0 0 20px rgba(0, 255, 255, 0.05);
  position: relative;
}

.exercise-card--ai-optimized::before {
  content: 'AI Optimized';
  position: absolute;
  top: -10px;
  right: 16px;
  background: linear-gradient(135deg, #00FFFF 0%, #7851A9 100%);
  color: #000;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 10px;
  letter-spacing: 0.5px;
}
```

### State Management

```javascript
// Zustand store for Workout Builder state
import { create } from 'zustand';

const useWorkoutBuilderStore = create((set) => ({
  // Client context (from ClientIntelligenceService)
  clientContext: null,

  // Builder state
  selectedClient: null,
  selectedProfile: null,
  selectedPhase: 1,
  targetBodyParts: [],

  // Generated plan
  generatedPlan: null,
  aiExplanations: [],

  // UI state
  isGenerating: false,
  showAIInsights: true,

  // Actions
  setClientContext: (ctx) => set({ clientContext: ctx }),
  setSelectedClient: (id) => set({ selectedClient: id }),
  generateWorkout: async (params) => {
    set({ isGenerating: true });
    // API call to /api/workout-builder/generate
    // Update generatedPlan and aiExplanations
    set({ isGenerating: false });
  },
  swapExercise: (exerciseId, newExercise) => {
    // Optimistic update
    set((state) => ({
      generatedPlan: {
        ...state.generatedPlan,
        mainWorkout: state.generatedPlan.mainWorkout.map(ex =>
          ex.id === exerciseId ? { ...newExercise, aiOptimized: true } : ex
        )
      }
    }));
  }
}));
```

---

## G. Event-Driven Cross-Component Updates

### Event Types

| Event | Source | Consumers | Action |
|-------|--------|-----------|--------|
| `pain.created` | Pain Management | Workout Builder, Admin Dashboard | Re-evaluate exclusions, alert admin |
| `pain.resolved` | Pain Management | Workout Builder, Admin Dashboard | Clear exclusions, notify admin |
| `compensation.detected` | Form Analysis | Workout Builder, Variation Engine | Add CES exercises, adjust substitutions |
| `form.scored` | Form Analysis | Admin Dashboard, Workout History | Update avg scores, flag low performers |
| `equipment.approved` | Equipment Profiles | Variation Engine, Workout Builder | Update available exercises |
| `workout.completed` | Workout Session | Variation Engine, Admin Dashboard | Update rotation position, log history |
| `package.purchased` | Session Package | Plan Generator | Auto-suggest plan horizon |
| `assessment.completed` | Movement Analysis | All | Update NASM phase, compensation baseline |

### Implementation: Simple Event Bus

```javascript
// backend/services/eventBus.mjs
import EventEmitter from 'events';

class SwanEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
  }

  emitPainCreated(clientId, painEntry) {
    this.emit('pain.created', { clientId, painEntry, timestamp: new Date() });
  }

  emitCompensationDetected(clientId, compensations) {
    this.emit('compensation.detected', { clientId, compensations, timestamp: new Date() });
  }

  emitWorkoutCompleted(clientId, sessionData) {
    this.emit('workout.completed', { clientId, sessionData, timestamp: new Date() });
  }

  emitEquipmentApproved(profileId, equipmentItem) {
    this.emit('equipment.approved', { profileId, equipmentItem, timestamp: new Date() });
  }
}

export const eventBus = new SwanEventBus();
```

---

## H. Implementation Checklist

### Phase 9a: ClientIntelligenceService (Backend Foundation)
- [ ] Create `backend/services/clientIntelligenceService.mjs`
- [ ] Implement `getClientContext()` with all 7 parallel queries
- [ ] Implement pain exclusion logic (72h auto-exclude for severity >= 7)
- [ ] Implement compensation trend analysis
- [ ] Implement package-to-horizon mapping
- [ ] Add REGION_TO_MUSCLE_MAP constant
- [ ] Add CES_MAP constant (8 compensation types)
- [ ] REST API: `GET /api/client-intelligence/:clientId`

### Phase 9b: Intelligent Workout Builder (Backend)
- [ ] Create `backend/services/workoutBuilderService.mjs`
- [ ] Implement single workout generation algorithm (7-step)
- [ ] Implement long-term plan generation (5-step)
- [ ] Implement NASM OPT phase parameter tables
- [ ] Implement AI explanation generation
- [ ] REST API: `POST /api/workout-builder/generate`
- [ ] REST API: `POST /api/workout-builder/regenerate`

### Phase 9c: Admin Intelligence Widgets (Frontend)
- [ ] Create `GlassCard` base component (if not exists)
- [ ] Create `ThePulseWidget` — Pain & Compensation alerts
- [ ] Create `FormAnalysisQueueWidget` — Video processing stats
- [ ] Create `NASMAdherenceRadar` — Custom SVG radar chart
- [ ] Create `EquipmentIntelligenceWidget` — Equipment status
- [ ] Create `PlanAdherenceWidget` — Session completion tracking
- [ ] Create `SessionUtilizationWidget` — Package burn rate
- [ ] Wire into Admin Command Center with 12-column grid
- [ ] REST API: `GET /api/admin/intelligence/overview`

### Phase 9d: Intelligent Workout Builder (Frontend)
- [ ] Create 3-pane layout (Context / Canvas / AI Insights)
- [ ] Create AI-optimized exercise card with glow effects
- [ ] Create Zustand store for builder state
- [ ] Implement Framer Motion swap animations
- [ ] Mobile responsive (chips + floating ? button)
- [ ] Wire to workout builder API

### Phase 9e: Event Bus + Cross-Component Wiring
- [ ] Create `backend/services/eventBus.mjs`
- [ ] Wire pain creation → workout builder exclusions
- [ ] Wire compensation detection → variation engine
- [ ] Wire workout completion → rotation position update
- [ ] Wire equipment approval → exercise availability update
- [ ] Wire package purchase → plan horizon suggestion

---

## I. NASM OPT Phase Color Coding (Gemini 3.1 Pro Spec)

| Phase | Name | Color | Token |
|-------|------|-------|-------|
| 1 | Stabilization Endurance | `#00FFFF` | Swan Cyan |
| 2 | Strength Endurance | `#7851A9` | Cosmic Purple |
| 3 | Hypertrophy | `#7851A9` | Cosmic Purple |
| 4 | Maximal Strength | `#7851A9` | Cosmic Purple |
| 5 | Power | `#FF3366` | Cosmic Pink |

---

*SwanStudios Cross-Component Intelligence Layer v1.0*
*Designed by: Gemini 3.1 Pro (Lead Design Authority) + Claude (Lead Software Engineer)*
