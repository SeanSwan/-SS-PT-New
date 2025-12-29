# NASM Integration - Consolidated AI Village Review

**Review Date:** 2025-11-12
**Reviewers:** Kilo Code, Gemini/Minmax, Senior AI Architecture Consultant
**Status:** ⏳ AWAITING USER APPROVAL FOR REMEDIATION PLAN
**Consensus Vote Required:** 4/6 minimum (emergency) OR 5/6 standard (per Phase 0 protocol)

---

## 🎯 EXECUTIVE SUMMARY

**Current State:** Phase 0 Complete - Database foundation and frontend components are production-ready
**Critical Finding:** Backend API implementation required before any features can function
**Overall Grade:** A- (Strong foundation with implementation gaps)

**Unanimous Agreement Across All AIs:**
1. ✅ Database schema is comprehensive and well-designed
2. ✅ Frontend components are production-ready (Admin, Trainer, Client dashboards)
3. ❌ Backend APIs are completely missing (45 endpoints needed)
4. ❌ Seed data is missing (exercise library, templates, protocols)
5. ⚠️ MUI components conflict with MUI-elimination mandate
6. ⚠️ Component file sizes exceed 300-line limit
7. ⚠️ styled-components dedupe issue needs resolution

---

## 📊 REVIEW SYNTHESIS BY DOMAIN

### 1. Kilo Code Review - NASM Protocol & Logic ✅

**Strengths Identified:**
- ✅ Deep NASM OPT™ model integration with accurate acute variables
- ✅ Complete 4-step CEx Continuum (Inhibit/Lengthen/Activate/Integrate)
- ✅ Gamification system with XP, streaks, and compliance tracking
- ✅ Workout generation logic framework

**Critical Enhancements Required:**

#### A. Phase Transition Validation (HIGH PRIORITY)
**Current:** Basic phase advancement tracking
**Enhancement:** Automated validation of progression criteria

```typescript
// backend/services/nasmValidationService.mjs
function validatePhaseTransition(
  currentPhase: string,
  clientMetrics: ClientMetrics
): boolean {
  const phaseRequirements = {
    'phase_1_stabilization': {
      minWeeks: 4,
      requiredMetrics: ['loadIncreased5Percent', 'formImproved', 'noPain']
    },
    'phase_2_strength_endurance': {
      minWeeks: 2,
      requiredMetrics: ['supersetCompliance', 'enduranceImproved', 'formMaintained']
    }
    // ... other phases
  };

  return phaseRequirements[currentPhase].requiredMetrics.every(
    metric => clientMetrics[metric] === true
  );
}
```

**Database Addition:**
```sql
CREATE TABLE phase_transition_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id),
  from_phase VARCHAR(50),
  to_phase VARCHAR(50),
  automated_approval BOOLEAN,
  trainer_override BOOLEAN,
  override_reason TEXT,
  criteria_met JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### B. Client-Specific Exercise Modifications (MEDIUM PRIORITY)
**Enhancement:** Allow trainers to add client-specific notes/modifications

```sql
CREATE TABLE exercise_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercise_library(id),
  client_id UUID REFERENCES users(id),
  modifications JSONB, -- { "tempo": "3/1/1", "notes": "Modified for knee pain" }
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### C. Advanced Compensation Detection (MEDIUM PRIORITY)
**Enhancement:** Add severity scoring (1-5) for each compensation
**Integration:** TensorFlow.js + MediaPipe for real-time video feedback

---

### 2. Gemini/Minmax Review - UX & Architecture ✅

**Strengths Identified:**
- ✅ Complete UI/UX design with professional wireframes
- ✅ Business model alignment (4-tier user hierarchy)
- ✅ Clear conversion funnel strategy
- ✅ Client education and engagement features

**Critical Gaps:**

#### A. MUI Components Conflict (CRITICAL)
**Issue:** New NASM components use MUI, violating MUI-elimination mandate
**Impact:** Conflicts with platform styling standards
**Resolution Required:** Convert to SwanStudios UI Kit (styled-components)

**Action Plan:**
1. Audit all MUI imports in NASM components
2. Map MUI components to UI Kit equivalents
3. Refactor all NASM dashboards to use styled-components
4. Apply Galaxy-Swan theme tokens

#### B. Component Size Violations (HIGH PRIORITY)
**Issue:** NASM components exceed 300-line limit
**Files Exceeding Limit:**
- `NASMAdminDashboard.tsx` (~450 lines)
- `NASMTrainerDashboard.tsx` (~480 lines)
- `NASMClientDashboard.tsx` (~420 lines)

**Refactor Plan:**
```
frontend/src/components/Admin/NASM/
├── index.tsx (container, <100 lines)
├── ComplianceDashboard.panel.tsx (<200 lines)
├── TemplateBuilder.panel.tsx (<200 lines)
├── ExerciseLibrary.panel.tsx (<200 lines)
├── CertificationVerification.panel.tsx (<200 lines)
├── types.ts
├── hooks.ts
└── api.ts
```

#### C. Mobile Responsiveness (MEDIUM PRIORITY)
**Issue:** Desktop-first design without mobile optimization
**Enhancement:** Mobile-specific workout logging and homework tracking

---

### 3. Senior AI Architecture Review - Technical Implementation 🔴

**Critical Findings:**

#### A. Backend API Implementation (CRITICAL - BLOCKS ALL FEATURES)
**Status:** ❌ 0 of 45 endpoints implemented
**Impact:** Frontend components are non-functional without APIs
**Estimated Time:** 40-50 hours

**API Endpoints Required:**

**Admin APIs (16 endpoints):**
```typescript
GET    /api/admin/nasm/compliance-metrics
POST   /api/admin/nasm/refresh-compliance-view
POST   /api/admin/workout-templates
GET    /api/admin/workout-templates
PUT    /api/admin/workout-templates/:id/approve
DELETE /api/admin/workout-templates/:id
POST   /api/admin/exercise-library
GET    /api/admin/exercise-library
PUT    /api/admin/exercise-library/:id
DELETE /api/admin/exercise-library/:id
POST   /api/admin/trainer-certifications
GET    /api/admin/trainer-certifications
PUT    /api/admin/trainer-certifications/:id/verify
```

**Trainer APIs (12 endpoints):**
```typescript
GET    /api/trainer/my-certifications
GET    /api/trainer/my-clients
POST   /api/trainer/movement-assessments
GET    /api/trainer/movement-assessments/:clientId
POST   /api/trainer/corrective-protocols
POST   /api/trainer/workouts
POST   /api/trainer/session-logs
GET    /api/trainer/clients/:id/opt-phase
PUT    /api/trainer/clients/:id/opt-phase/advance
GET    /api/trainer/exercises?phase={phaseNum}
```

**Client APIs (10 endpoints):**
```typescript
GET    /api/client/my-opt-phase
GET    /api/client/my-workout-today
POST   /api/client/log-set
POST   /api/client/pain-flag
GET    /api/client/corrective-homework
POST   /api/client/corrective-homework/complete
GET    /api/client/progress
GET    /api/client/phase-history
```

**User APIs (3 endpoints):**
```typescript
GET    /api/user/workout-of-the-week
POST   /api/user/self-assessment
GET    /api/user/self-assessment-results/:id
```

**AI Coach APIs (4 endpoints):**
```typescript
POST   /api/ai/generate-workout
POST   /api/ai/detect-compensations
POST   /api/ai/suggest-substitution
GET    /api/ai/coach-tip
```

#### B. Seed Data Missing (CRITICAL)
**Status:** ❌ No seed files created
**Impact:** System cannot function without exercise library
**Estimated Time:** 8-12 hours

**Required Seed Files:**
1. `backend/seeds/nasm-exercise-library-seed.mjs` (150+ exercises)
2. `backend/seeds/nasm-workout-templates-seed.mjs` (5 templates)
3. `backend/seeds/corrective-protocols-seed.mjs` (UCS, LCS, PDS)

#### C. Core Services Missing (HIGH PRIORITY)
**Status:** ❌ Not implemented
**Estimated Time:** 20-25 hours

**Required Services:**
1. `backend/services/nasmValidationService.mjs` - Phase-aware validation
2. `backend/services/gamificationService.mjs` - XP, streaks, badges
3. `backend/services/aiCoachService.mjs` - OpenAI/Claude integration
4. `backend/services/nasmStorageService.mjs` - Video/cert uploads

#### D. Security & Privacy (HIGH PRIORITY)
**Issues:**
- No signed URLs for assessment videos
- No virus scanning for uploads
- Missing RBAC middleware for NASM routes
- No audit logging for sensitive actions

**Required Implementation:**
```typescript
// backend/middleware/nasmSecurity.mjs
export const requireCertification = (certType: string) => {
  return async (req, res, next) => {
    const certs = await TrainerCertification.findAll({
      where: {
        trainer_id: req.user.id,
        certification_type: certType,
        status: 'active',
        expiration_date: { [Op.gt]: new Date() }
      }
    });

    if (certs.length === 0) {
      return res.status(403).json({
        error: `${certType} certification required for this feature`
      });
    }

    next();
  };
};
```

#### E. Database Optimizations (MEDIUM PRIORITY)
**Missing Indexes:**
```sql
-- Performance optimization indexes
CREATE INDEX idx_client_opt_phases_phase_client
  ON client_opt_phases(current_phase, client_id);

CREATE INDEX idx_session_logs_client_date
  ON session_logs(client_id, session_date DESC);

CREATE INDEX idx_movement_assessments_client_date
  ON movement_assessments(client_id, assessment_date DESC);

CREATE INDEX idx_corrective_homework_protocol_date
  ON corrective_homework_logs(protocol_id, completion_date);
```

**JSONB Validation:**
```typescript
// backend/services/jsonbValidator.mjs
const acuteVariablesSchema = {
  type: 'object',
  required: ['reps', 'sets', 'tempo', 'rest_sec'],
  properties: {
    reps: { type: 'string', pattern: '^\\d+-\\d+$' },
    sets: { type: 'integer', minimum: 1, maximum: 10 },
    tempo: { type: 'string', pattern: '^\\d/\\d/\\d$' },
    rest_sec: { type: 'integer', minimum: 0, maximum: 300 }
  }
};
```

#### F. styled-components Dedupe (CRITICAL - BLOCKING ADMIN DASHBOARD)
**Issue:** Current vite.config.ts has dedupe but admin dashboard still errors
**Root Cause:** Multiple styled-components instances in bundle
**Status:** Needs ADR-001 hybrid approach

---

## 🚨 CRITICAL GOVERNANCE ISSUES

### Issue 1: Consensus Threshold Inconsistency
**Problem:** CURRENT-TASK.md shows "4/6 emergency" but Phase 0 mandate is 5/6
**Resolution Required:**
- Option A: Use 5/6 standard (per Phase 0 golden rules)
- Option B: Document 4/6 emergency exception explicitly in handbook

**Recommendation:** Use **5/6 standard** for NASM integration (not emergency)

### Issue 2: Encoding Artifacts in Documentation
**Problem:** Corrupted glyphs in AI handoff files (dY…, �o.)
**Files Affected:**
- `AI-VILLAGE-REVIEW-REQUEST.md`
- `DISTRIBUTION-INSTRUCTIONS.md`
- `CURRENT-TASK.md`
- `AI-VILLAGE-CONSOLIDATED-DASHBOARD-REVIEW.md`

**Action:** Scrub and save as UTF-8 without BOM

---

## ✅ PRIORITIZED REMEDIATION PLAN

### PHASE A: GOVERNANCE & CLEANUP (1-2 hours)

#### A1. Normalize Consensus Threshold
- [ ] Update CURRENT-TASK.md: Use 5/6 standard for NASM
- [ ] Document emergency exception rules in handbook
- [ ] Update all AI status files with correct threshold

#### A2. Fix Encoding Issues
- [ ] Scrub corrupted glyphs from all AI handoff files
- [ ] Resave as UTF-8 without BOM
- [ ] Validate all files load correctly

#### A3. Component File Splitting
- [ ] Create refactor plan for 3 NASM dashboards
- [ ] Split into <300 line subcomponents
- [ ] Apply container/view/model pattern

### PHASE B: STYLING & UI CONVERSION (8-12 hours)

#### B1. MUI Elimination for NASM Components
**Action:** Convert all NASM dashboards to SwanStudios UI Kit

**Component Mapping:**
```
MUI Component → UI Kit Equivalent
=====================================
<Box>         → styled.div with theme
<Container>   → PageContainer (from UI Kit)
<Grid>        → FlexGrid (styled-components)
<Card>        → GlassCard (Galaxy-Swan theme)
<Button>      → PrimaryButton, SecondaryButton
<TextField>   → StyledInput
<Select>      → StyledSelect
<Chip>        → Badge (custom styled-component)
<Alert>       → AlertBox (custom)
```

**File Structure After Conversion:**
```
frontend/src/components/Admin/NASM/
├── index.tsx (container, uses styled-components)
├── panels/
│   ├── ComplianceDashboard.panel.tsx
│   ├── TemplateBuilder.panel.tsx
│   ├── ExerciseLibrary.panel.tsx
│   └── CertificationVerification.panel.tsx
├── components/
│   ├── ComplianceMetricsCard.tsx
│   ├── TemplateApprovalTable.tsx
│   └── ExerciseApprovalRow.tsx
├── styles/
│   ├── admin-nasm.styles.ts (Galaxy-Swan themed)
│   └── shared.styles.ts
├── types.ts
├── hooks.ts
└── api.ts
```

#### B2. Apply Galaxy-Swan Theme Tokens
```typescript
// frontend/src/components/Admin/NASM/styles/admin-nasm.styles.ts
import styled from 'styled-components';
import { theme } from '@/styles/theme';

export const ComplianceDashboard = styled.div`
  background: ${theme.colors.background.primary};
  border: 1px solid ${theme.colors.border.subtle};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};

  /* Glass effect */
  backdrop-filter: blur(10px);
  background: rgba(13, 17, 30, 0.8);
`;

export const MetricCard = styled.div`
  background: linear-gradient(135deg, ${theme.colors.primary.main}, ${theme.colors.primary.dark});
  color: white;
  padding: ${theme.spacing.lg};
  border-radius: ${theme.borderRadius.md};

  /* Focus ring for accessibility */
  &:focus-visible {
    outline: 2px solid ${theme.colors.focus.ring};
    outline-offset: 2px;
  }
`;
```

#### B3. styled-components Dedupe Resolution (ADR-001)
**Action:** Implement hybrid approach with acceptance gates

**Step 1: Lock Version**
```json
// frontend/package.json
{
  "dependencies": {
    "styled-components": "6.1.19" // Exact version, no caret
  },
  "resolutions": {
    "styled-components": "6.1.19"
  }
}
```

**Step 2: Vite Config Enhancement**
```typescript
// frontend/vite.config.ts
export default defineConfig({
  resolve: {
    dedupe: ['styled-components', 'react', 'react-dom'],
    alias: {
      'styled-components': path.resolve(__dirname, 'node_modules/styled-components')
    }
  },
  optimizeDeps: {
    include: ['styled-components'],
    force: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'styled-vendor': ['styled-components', 'react', 'react-dom']
        }
      }
    }
  }
});
```

**Step 3: CI Validation**
```bash
# Add to CI pipeline
npm ls styled-components | grep -q "styled-components@6.1.19" && \
  echo "✅ Single styled-components instance" || \
  (echo "❌ Multiple instances detected" && exit 1)
```

**Acceptance Gates:**
- [ ] `npm ls styled-components` shows exactly one version
- [ ] Admin dashboard renders without "we.div..." error
- [ ] Feature-flagged canary deployment succeeds
- [ ] 24h staging run with zero errors

### PHASE C: BACKEND API IMPLEMENTATION (40-50 hours)

#### C1. Admin APIs (Priority 1 - 12-16 hours)

**Create Controllers:**
```typescript
// backend/controllers/admin/nasmController.mjs
import { ClientOptPhase, TrainerCertification } from '../../models/index.mjs';

export const getComplianceMetrics = async (req, res) => {
  try {
    // Refresh materialized view
    await sequelize.query('REFRESH MATERIALIZED VIEW admin_nasm_compliance_metrics');

    const metrics = await sequelize.query(
      'SELECT * FROM admin_nasm_compliance_metrics',
      { type: QueryTypes.SELECT }
    );

    res.json(metrics[0]);
  } catch (error) {
    console.error('Error fetching compliance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};

export const createWorkoutTemplate = async (req, res) => {
  // Implementation with validation
};

export const approveWorkoutTemplate = async (req, res) => {
  // Implementation with audit logging
};
```

**Create Routes:**
```typescript
// backend/routes/admin/nasmRoutes.mjs
import express from 'express';
import {
  getComplianceMetrics,
  createWorkoutTemplate,
  approveWorkoutTemplate
} from '../../controllers/admin/nasmController.mjs';
import { checkRole } from '../../middleware/auth.mjs';

const router = express.Router();

router.get('/nasm/compliance-metrics', checkRole(['admin']), getComplianceMetrics);
router.post('/workout-templates', checkRole(['admin']), createWorkoutTemplate);
router.put('/workout-templates/:id/approve', checkRole(['admin']), approveWorkoutTemplate);

export default router;
```

**Integrate into Core Routes:**
```typescript
// backend/core/routes.mjs
import nasmAdminRoutes from '../routes/admin/nasmRoutes.mjs';

app.use('/api/admin', checkRole(['admin']), nasmAdminRoutes);
```

#### C2. Trainer APIs (Priority 2 - 16-20 hours)

**Key Services:**
```typescript
// backend/services/nasmValidationService.mjs
export const validateAcuteVariables = (phase, reps, tempo, rest) => {
  const rules = {
    phase_1_stabilization: {
      reps: { min: 12, max: 20 },
      tempo: /^4\/2\/1$/,
      rest: { min: 0, max: 90 }
    },
    phase_2_strength_endurance: {
      reps: { min: 8, max: 12 },
      tempo: /^[2-3]\/0\/[1-2]$/,
      rest: { min: 30, max: 90 }
    }
  };

  const rule = rules[phase];
  if (!rule) throw new Error(`Unknown phase: ${phase}`);

  return {
    valid:
      reps >= rule.reps.min &&
      reps <= rule.reps.max &&
      rule.tempo.test(tempo) &&
      rest >= rule.rest.min &&
      rest <= rule.rest.max,
    errors: [] // Collect specific errors
  };
};
```

**Certification Gating:**
```typescript
// backend/middleware/nasmSecurity.mjs
export const requireCES = requireCertification('NASM-CES');
export const requirePES = requireCertification('NASM-PES');

// Usage in routes:
router.post('/corrective-protocols', requireCES, createCorrectiveProtocol);
router.post('/workouts', checkPhaseAccess, createWorkout);

async function checkPhaseAccess(req, res, next) {
  const { opt_phase } = req.body;

  if (['phase_4_maximal_strength', 'phase_5_power'].includes(opt_phase)) {
    return requirePES(req, res, next);
  }

  next();
}
```

#### C3. Client APIs (Priority 3 - 12-16 hours)

**Gamification Service:**
```typescript
// backend/services/gamificationService.mjs
export const calculateHomeworkRewards = async (protocolId, completionDate) => {
  const protocol = await CorrectiveProtocol.findByPk(protocolId);

  // Base XP
  let xpEarned = 10;

  // Check streak
  const yesterday = new Date(completionDate);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayLog = await CorrectiveHomeworkLog.findOne({
    where: {
      protocol_id: protocolId,
      completion_date: yesterday.toISOString().split('T')[0],
      completed: true
    }
  });

  let newStreak = yesterdayLog ? protocol.current_streak + 1 : 1;

  // Streak bonuses
  if (newStreak === 7) xpEarned += 50;
  if (newStreak === 15) xpEarned += 100;
  if (newStreak === 30) xpEarned += 250;

  // Update protocol
  await protocol.update({
    current_streak: newStreak,
    longest_streak: Math.max(newStreak, protocol.longest_streak),
    xp_earned: protocol.xp_earned + xpEarned,
    days_completed: protocol.days_completed + 1
  });

  return { xpEarned, newStreak };
};
```

**Idempotency for Daily Homework:**
```typescript
export const completeHomework = async (req, res) => {
  const { protocol_id, completion_date } = req.body;
  const client_id = req.user.id;

  // Check if already completed today
  const existing = await CorrectiveHomeworkLog.findOne({
    where: {
      protocol_id,
      client_id,
      completion_date: new Date(completion_date).toISOString().split('T')[0]
    }
  });

  if (existing) {
    return res.status(200).json({
      message: 'Already completed today',
      alreadyCompleted: true,
      xp_earned: 0
    });
  }

  // Create new log and calculate rewards
  const rewards = await calculateHomeworkRewards(protocol_id, completion_date);

  await CorrectiveHomeworkLog.create({
    protocol_id,
    client_id,
    completion_date,
    completed: true,
    xp_earned: rewards.xpEarned,
    streak_bonus_xp: rewards.xpEarned > 10 ? rewards.xpEarned - 10 : 0
  });

  res.json({ ...rewards, alreadyCompleted: false });
};
```

### PHASE D: SEED DATA CREATION (8-12 hours)

#### D1. Exercise Library Seed (6-8 hours)

**Create Comprehensive Seed File:**
```javascript
// backend/seeds/nasm-exercise-library-seed.mjs
export const nasmExercises = [
  // PHASE 1: STABILIZATION ENDURANCE
  {
    exercise_name: 'Ball Squat',
    opt_phases: [1],
    exercise_type: 'stabilization',
    primary_body_part: 'legs',
    movement_pattern: 'squat',
    primary_equipment: 'stability_ball',
    alternative_equipment: ['bodyweight', 'trx'],
    contraindications: ['knee_injury_acute', 'low_back_pain_severe'],
    acute_variables_defaults: {
      phase_1_stabilization: {
        reps: '12-20',
        sets: '2-3',
        tempo: '4/2/1',
        rest_sec: 30,
        intensity: '50-70%'
      }
    },
    demo_video_url: 'https://storage.swanstudios.com/exercises/ball-squat.mp4',
    coaching_cues: [
      'Keep chest up',
      'Maintain neutral spine',
      'Control descent (4 seconds)',
      'Pause at bottom (2 seconds)',
      'Drive through heels'
    ],
    approved: true
  },

  // PHASE 2: STRENGTH ENDURANCE
  {
    exercise_name: 'Barbell Bench Press',
    opt_phases: [2, 3, 4],
    exercise_type: 'strength',
    primary_body_part: 'chest',
    movement_pattern: 'push',
    primary_equipment: 'barbell',
    alternative_equipment: ['dumbbells', 'smith_machine'],
    contraindications: ['shoulder_impingement', 'rotator_cuff_injury'],
    acute_variables_defaults: {
      phase_2_strength_endurance: {
        reps: '8-12',
        sets: '2-4',
        tempo: '2/0/2',
        rest_sec: 60,
        intensity: '70-80%'
      },
      phase_3_hypertrophy: {
        reps: '6-12',
        sets: '3-6',
        tempo: '2/0/2',
        rest_sec: 60,
        intensity: '75-85%'
      },
      phase_4_maximal_strength: {
        reps: '1-5',
        sets: '4-6',
        tempo: 'X/X/X',
        rest_sec: 180,
        intensity: '85-100%'
      }
    },
    demo_video_url: 'https://storage.swanstudios.com/exercises/barbell-bench-press.mp4',
    coaching_cues: [
      'Retract scapulae',
      'Lower bar to mid-chest',
      'Elbows 45 degrees',
      'Drive through chest',
      'Full lockout at top'
    ],
    approved: true
  },

  // ... 148 more exercises
];

export const seedExerciseLibrary = async () => {
  await ExerciseLibrary.bulkCreate(nasmExercises);
  console.log('✅ Seeded 150 NASM exercises');
};
```

#### D2. Workout Templates Seed (2-3 hours)

```javascript
// backend/seeds/nasm-workout-templates-seed.mjs
export const nasmTemplates = [
  {
    template_name: 'Phase 1: Total Body Stabilization',
    opt_phase: 'phase_1_stabilization',
    difficulty_level: 'beginner',
    target_duration_minutes: 45,
    equipment_required: ['stability_ball', 'dumbbells', 'bands'],
    workout_structure: {
      warmup: [
        { exercise: 'SMR - IT Band', duration: '90s' },
        { exercise: 'Static Hip Flexor Stretch', duration: '30s x 2' }
      ],
      activation: [
        { exercise: 'Glute Bridge', sets: 2, reps: 15, tempo: '2/2/2' }
      ],
      main_workout: [
        { exercise: 'Ball Squat', sets: 3, reps: '12-20', tempo: '4/2/1', rest: '30s' },
        { exercise: 'Push-Up (Hands on Ball)', sets: 3, reps: '12-20', tempo: '4/2/1', rest: '30s' },
        { exercise: 'Ball Cobra', sets: 3, reps: '12-20', tempo: '4/2/1', rest: '30s' }
      ],
      cooldown: [
        { exercise: 'Static Quad Stretch', duration: '30s x 2' },
        { exercise: 'Static Chest Stretch', duration: '30s x 2' }
      ]
    },
    approved: true,
    created_by_admin_id: null // Seeded, not created by admin
  },

  // ... 4 more templates (one per phase)
];
```

#### D3. Corrective Protocol Templates Seed (1-2 hours)

```javascript
// backend/seeds/corrective-protocols-seed.mjs
export const correctiveTemplates = {
  UCS: {
    protocol_type: 'UCS',
    inhibit_exercises: [
      { exercise: 'SMR Upper Traps', duration_sec: 90, notes: 'Focus on tender spots' },
      { exercise: 'SMR Levator Scapulae', duration_sec: 90, notes: '' }
    ],
    lengthen_exercises: [
      { exercise: 'Static Pec Stretch', duration_sec: 30, reps: 2 },
      { exercise: 'Static Upper Trap Stretch', duration_sec: 30, reps: 2 }
    ],
    activate_exercises: [
      { exercise: 'Floor Cobra', reps: 15, sets: 2, tempo: '2/2/2' },
      { exercise: 'Ball Combo I', reps: 10, sets: 2, tempo: '4/2/1' }
    ],
    integrate_exercises: [
      { exercise: 'Ball Wall Squat', reps: 15, sets: 2, tempo: '4/2/1' },
      { exercise: 'Standing Cable Row', reps: 12, sets: 2, tempo: '4/2/1' }
    ]
  },

  LCS: { /* ... */ },
  PDS: { /* ... */ }
};
```

### PHASE E: DATA MODEL HARDENING (4-6 hours)

#### E1. Add Missing Indexes

```sql
-- Performance optimization
CREATE INDEX idx_client_opt_phases_phase_client
  ON client_opt_phases(current_phase, client_id);

CREATE INDEX idx_session_logs_client_date
  ON session_logs(client_id, session_date DESC);

CREATE INDEX idx_movement_assessments_client_date
  ON movement_assessments(client_id, assessment_date DESC);

CREATE INDEX idx_corrective_homework_protocol_date
  ON corrective_homework_logs(protocol_id, completion_date);

-- Unique constraints
CREATE UNIQUE INDEX idx_homework_log_unique
  ON corrective_homework_logs(protocol_id, client_id, completion_date);

CREATE UNIQUE INDEX idx_trainer_cert_unique
  ON trainer_certifications(trainer_id, certification_type, status)
  WHERE status = 'active';
```

#### E2. JSONB Schema Validation

```typescript
// backend/services/jsonbValidator.mjs
import Ajv from 'ajv';

const ajv = new Ajv();

export const schemas = {
  acuteVariables: {
    type: 'object',
    required: ['reps', 'sets', 'tempo', 'rest_sec'],
    properties: {
      reps: { type: 'string', pattern: '^\\d+-\\d+$|^\\d+$' },
      sets: { type: 'integer', minimum: 1, maximum: 10 },
      tempo: { type: 'string', pattern: '^\\d/\\d/\\d$|^X/X/X$|^explosive$' },
      rest_sec: { type: 'integer', minimum: 0, maximum: 300 },
      intensity: { type: 'string' }
    }
  },

  exercisesPerformed: {
    type: 'array',
    items: {
      type: 'object',
      required: ['exercise_id', 'sets_logged'],
      properties: {
        exercise_id: { type: 'string', format: 'uuid' },
        sets_logged: {
          type: 'array',
          items: {
            type: 'object',
            required: ['set_num', 'reps', 'weight_lbs', 'rpe'],
            properties: {
              set_num: { type: 'integer', minimum: 1 },
              reps: { type: 'integer', minimum: 0 },
              weight_lbs: { type: 'number', minimum: 0 },
              tempo: { type: 'string' },
              rpe: { type: 'integer', minimum: 1, maximum: 10 }
            }
          }
        }
      }
    }
  }
};

export const validateAcuteVariables = ajv.compile(schemas.acuteVariables);
export const validateExercisesPerformed = ajv.compile(schemas.exercisesPerformed);
```

### PHASE F: TESTING & QUALITY ASSURANCE (16-20 hours)

#### F1. Unit Tests (8-10 hours)

```typescript
// backend/tests/nasm/nasmValidationService.test.mjs
import { validateAcuteVariables, validatePhase2Superset } from '../../services/nasmValidationService.mjs';

describe('NASM Validation Service', () => {
  describe('validateAcuteVariables', () => {
    it('should validate Phase 1 acute variables correctly', () => {
      const result = validateAcuteVariables('phase_1_stabilization', 15, '4/2/1', 30);
      expect(result.valid).toBe(true);
    });

    it('should reject Phase 1 with too few reps', () => {
      const result = validateAcuteVariables('phase_1_stabilization', 8, '4/2/1', 30);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Reps must be 12-20 for Phase 1');
    });

    it('should reject Phase 1 with incorrect tempo', () => {
      const result = validateAcuteVariables('phase_1_stabilization', 15, '2/0/2', 30);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Tempo must be 4/2/1 for Phase 1');
    });
  });

  describe('validatePhase2Superset', () => {
    it('should validate correct Phase 2 superset', () => {
      const exercises = [
        { exercise_type: 'strength', primary_body_part: 'chest' },
        { exercise_type: 'stabilization', primary_body_part: 'chest' }
      ];

      const result = validatePhase2Superset(exercises);
      expect(result.valid).toBe(true);
    });

    it('should reject superset with wrong order', () => {
      const exercises = [
        { exercise_type: 'stabilization', primary_body_part: 'chest' },
        { exercise_type: 'strength', primary_body_part: 'chest' }
      ];

      const result = validatePhase2Superset(exercises);
      expect(result.valid).toBe(false);
    });
  });
});
```

#### F2. Integration Tests (4-6 hours)

```typescript
// backend/tests/nasm/integration/certificationGating.test.mjs
describe('NASM Certification Gating', () => {
  it('should allow CPT-certified trainer to create Phase 1-3 workouts', async () => {
    // Create trainer with NASM-CPT cert
    const trainer = await createTestTrainer({ cert: 'NASM-CPT' });

    const response = await request(app)
      .post('/api/trainer/workouts')
      .set('Authorization', `Bearer ${trainer.token}`)
      .send({ opt_phase: 'phase_2_strength_endurance', exercises: [...] });

    expect(response.status).toBe(201);
  });

  it('should block CPT-only trainer from creating Phase 4 workouts', async () => {
    const trainer = await createTestTrainer({ cert: 'NASM-CPT' });

    const response = await request(app)
      .post('/api/trainer/workouts')
      .set('Authorization', `Bearer ${trainer.token}`)
      .send({ opt_phase: 'phase_4_maximal_strength', exercises: [...] });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('NASM-PES certification required');
  });

  it('should block non-CES trainer from creating corrective protocols', async () => {
    const trainer = await createTestTrainer({ cert: 'NASM-CPT' });

    const response = await request(app)
      .post('/api/trainer/corrective-protocols')
      .set('Authorization', `Bearer ${trainer.token}`)
      .send({ protocol_type: 'UCS', inhibit_exercises: [...] });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('NASM-CES certification required');
  });
});
```

#### F3. E2E Tests (4-6 hours)

```typescript
// frontend/cypress/e2e/nasm/client-homework-flow.cy.ts
describe('Client Homework Completion Flow', () => {
  beforeEach(() => {
    cy.login('client@test.com', 'password');
    cy.visit('/dashboard/client');
  });

  it('should complete corrective homework and earn XP', () => {
    // Click on homework card
    cy.contains('Daily Homework').click();

    // Should show exercise list
    cy.contains('1. Inhibit (SMR/Foam Rolling)').should('be.visible');
    cy.contains('2. Lengthen (Static Stretching)').should('be.visible');

    // Click "Start Homework"
    cy.contains('Start Homework').click();

    // Mark complete
    cy.contains('Mark Complete').click();

    // Should show success and XP earned
    cy.contains('+10 XP').should('be.visible');
    cy.contains('Completed Today!').should('be.visible');

    // Should update streak if applicable
    cy.get('[data-testid="streak-counter"]').should('contain', '1');
  });

  it('should prevent duplicate completion on same day', () => {
    // Complete homework once
    cy.contains('Daily Homework').click();
    cy.contains('Start Homework').click();
    cy.contains('Mark Complete').click();

    // Try to complete again
    cy.contains('Daily Homework').click();
    cy.contains('Mark Complete').should('be.disabled');
    cy.contains('Completed Today!').should('be.visible');
  });
});
```

---

## 📋 ACCEPTANCE GATES SUMMARY

### Gate 1: Governance & Cleanup ✅
- [ ] Consensus threshold normalized (5/6 standard)
- [ ] Encoding artifacts scrubbed
- [ ] Component files split to <300 lines

### Gate 2: Styling & UI Conversion ✅
- [ ] All MUI components replaced with UI Kit equivalents
- [ ] Galaxy-Swan theme tokens applied consistently
- [ ] styled-components dedupe verified (single instance)
- [ ] Admin dashboard renders without "we.div..." error

### Gate 3: Backend API Implementation ✅
- [ ] All 45 API endpoints implemented and tested
- [ ] RBAC middleware applied to all routes
- [ ] Certification gating enforced (CPT/CES/PES)
- [ ] Idempotency verified for daily homework
- [ ] Phase validation logic working correctly

### Gate 4: Seed Data Creation ✅
- [ ] 150+ exercises seeded with correct metadata
- [ ] 5 workout templates seeded (1 per phase)
- [ ] 3 corrective protocol templates seeded (UCS/LCS/PDS)
- [ ] All seed data approved and admin-verified

### Gate 5: Data Model Hardening ✅
- [ ] All performance indexes created
- [ ] Unique constraints enforced
- [ ] JSONB schemas validated
- [ ] Materialized view refresh working

### Gate 6: Testing & QA ✅
- [ ] Unit tests: 85%+ coverage
- [ ] Integration tests: Certification gating verified
- [ ] E2E tests: Critical paths passing
- [ ] Performance tests: <200ms API response time

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Sprint 1 (Week 1): Foundation
1. **Day 1-2:** Governance cleanup, component splitting, MUI elimination
2. **Day 3-4:** styled-components dedupe resolution
3. **Day 5:** Admin API implementation (compliance metrics, templates)

### Sprint 2 (Week 2): Backend Core
1. **Day 1-2:** Trainer APIs (assessments, protocols, workouts)
2. **Day 3-4:** Client APIs (workouts, homework, gamification)
3. **Day 5:** Seed data creation and deployment

### Sprint 3 (Week 3): Polish & Testing
1. **Day 1:** User APIs and AI Coach service stubs
2. **Day 2-3:** Comprehensive testing (unit, integration, E2E)
3. **Day 4:** Performance optimization and index creation
4. **Day 5:** Staging deployment and QA

### Sprint 4 (Week 4): Production Launch
1. **Day 1-2:** Production deployment with feature flags
2. **Day 3:** Monitoring and bug fixes
3. **Day 4-5:** Documentation and user training

---

## ⚠️ CRITICAL BLOCKERS & DEPENDENCIES

### Blocker 1: styled-components Dedupe (CRITICAL)
**Impact:** Admin dashboard non-functional until resolved
**Dependencies:** Phase B2 (ADR-001 implementation)
**Timeline:** Must be resolved before any dashboard testing

### Blocker 2: Backend APIs Missing (CRITICAL)
**Impact:** All NASM frontend components non-functional
**Dependencies:** Phase C (API implementation)
**Timeline:** Blocks all feature testing and QA

### Blocker 3: Seed Data Missing (HIGH)
**Impact:** System cannot function without exercise library
**Dependencies:** Phase D (seed data creation)
**Timeline:** Needed for Phase C API testing

---

## 🤝 CONSENSUS VOTE REQUIRED

**Question for AI Village:**

Given the comprehensive reviews from Kilo Code, Gemini/Minmax, and Senior AI Architecture, do you approve the following remediation plan?

**Remediation Plan Summary:**
1. ✅ Phase A: Governance & Cleanup (1-2 hours)
2. ✅ Phase B: Styling & UI Conversion (8-12 hours)
3. ✅ Phase C: Backend API Implementation (40-50 hours)
4. ✅ Phase D: Seed Data Creation (8-12 hours)
5. ✅ Phase E: Data Model Hardening (4-6 hours)
6. ✅ Phase F: Testing & QA (16-20 hours)

**Total Estimated Time:** 77-102 hours (10-13 business days)

**Vote Options:**
- **A (Approve):** Proceed with remediation plan as outlined
- **B (Approve with Changes):** Specify changes in status file
- **C (Reject):** Provide alternative proposal in status file

**Voting Threshold:** 5/6 required for approval (per Phase 0 mandate)

---

**Document Prepared By:** Claude Code (Main Orchestrator)
**Review Date:** 2025-11-12
**Status:** ⏳ AWAITING USER CONFIRMATION BEFORE AI VILLAGE VOTE
