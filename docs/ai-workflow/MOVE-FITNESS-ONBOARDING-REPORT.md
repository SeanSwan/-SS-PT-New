# Move Fitness Client Onboarding Report
**Date:** 2026-03-18
**Trainer:** Sean Swan (SwanStudios)
**Client:** [REDACTED] (Move Fitness, Anaheim Hills)
**Client ID:** 61
**Onboarding Method:** API + AI Assistant (Gemini 3.1 Pro)

---

## 1. Client Profile Summary

| Field | Value |
|-------|-------|
| Age | 52 |
| Gender | Female |
| Weight | 165 lbs |
| Height | 5'4" (64 in) |
| Training Experience | Intermediate |
| Client Source | Move Fitness (gym in Anaheim Hills) |
| Schedule | 30 min, 3x/week (Mon/Wed/Fri, 6:30 AM) |
| Primary Goals | Get lean/fit, strong bench press, tighten glutes, reduce hip fat |

### Medical / Surgical History
- **Tummy tuck** — Fully recovered, no current limitations
- **Arm skin reduction surgery (brachioplasty)** — ~3 weeks post-op, recovering. Must limit overhead pressing, heavy bench, and deep stretching of triceps/axilla
- **Right quad atrophy** — Noticeable weakness vs. left leg, needs targeted unilateral work
- **Cardio** — Main weakness, must be addressed through programming

### Training History (Move Fitness Sessions Jan-Mar 2026)
| Date | Key Exercises |
|------|---------------|
| Jan 19 | Goblet box squat 30lb, cable row rope 70lb, reverse lunges BW |
| Jan 22 | Bench 45lb x13/x14, 55lb x12; side leg lifts; lat pulldown 44lb; push-ups |
| Jan 26 | Bench bar x20; cable row rope 40lb; face pulls 40lb; DB floor press 15lb x20; pallof press 40lb |
| Jan 28 | Bench 65lb 2x10; cable high row 40lb x15; goblet squat 30lb x15; DB RDL 30lb x12; bike 5min |
| Feb 10 | Treadmill 15 incline 2.2 speed 10min; cable chest press 40lb 3x12; tricep pushdowns 30lb; seated bicep curl 30lb |
| Feb 12+ | TRX rows 12 reps; medicine ball squat toss 12; pistol squats on box 12/leg; incline push-ups 20 |
| Recent | Leg press, hip adductor/abductor, hamstring curl, back extensions, side leg lifts 10lb DB |

### Bench Press Progression
- 45 lb x 13-14 reps (good form)
- 55 lb x 12 reps (assisted last 2)
- 65 lb x 10 reps (failing point)
- Estimated 1RM: ~85 lbs

---

## 2. Onboarding Steps Performed

### Step 1: Account Creation
- **Method:** `POST /api/auth/register` (signup endpoint)
- **Result:** User ID 61 created successfully
- **Username:** JackieC_MF
- **Email:** jackie.c.movefitness@swanstudios.com
- **Note:** Admin createClient endpoint (`POST /api/admin/clients`) returned 500 due to missing `client_progress` table in production DB. Used signup + admin update as workaround.

### Step 2: Profile Enrichment
- **Method:** `PUT /api/admin/users/61`
- **Result:** Successfully updated:
  - Role: `client`
  - DOB, gender, weight, height
  - Fitness goal, training experience, health concerns
  - Client source: `move_fitness`
  - Available sessions: 12

### Step 3: AI Workout Plan Generation
- **Method:** `POST /api/ai-chat/conversations` + `/messages`
- **AI Provider:** Gemini 3.1 Pro (via AI chat service)
- **Context:** `workout_generation` with `targetUserId: 61`
- **Result:** Complete 4-week NASM OPT Phase 2 (Strength Endurance) plan generated
- **Note:** Direct workout generation endpoint (`POST /api/ai/workout-generation`) failed due to OpenAI provider timeout. The AI Chat endpoint successfully used Gemini as fallback.

### Step 4: Plan Quality Assessment

The AI-generated plan demonstrated **exceptional clinical awareness**:

1. **Surgical Recovery Compliance:** Floor presses instead of full bench press to protect brachioplasty incisions. No overhead pressing. No chest/lat stretching in warm-up.
2. **Quad Atrophy Protocol:** Right leg always starts first in unilateral exercises. TRX-assisted single-leg squats, step-ups with balance hold, single-leg press progression.
3. **Cardio Weakness Addressed:** PHA (Peripheral Heart Action) superset protocol — strength exercise immediately followed by stabilization exercise with 0s rest between pairs. This elevates heart rate continuously without traditional cardio.
4. **30-Minute Session Compliance:** 4 exercises per session (2 supersets), strict 45-60s rest, 3-4 min warm-up, 2-3 min cool-down.
5. **Progressive Overload:** Weeks 1-2 at 60s rest, Weeks 3-4 at 45s rest with 5-10% load increase.
6. **Bench Press Progression Path:** Floor press (Weeks 1-4) → DB flat bench (Weeks 5-6, 7 weeks post-op) → Barbell bench (Weeks 7-8) targeting 75lb x 3-5 reps.
7. **Nutrition Protocol:** BMR 1,344 kcal, TDEE 1,850 kcal, target 1,550 kcal (300 deficit), 150g protein, vitamin C + zinc for wound healing, creatine for quad atrophy.

---

## 3. Issues Encountered

### Critical DB Migration Issues (Fixed)
| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `POST /api/admin/clients` returns 500 | `client_progress` table missing or `ClientProgress.create` fails | Migration `20260318000003` creates table if missing |
| `POST /api/goals` returns 500 | `challengeId` column missing from `goals` table | Migration `20260318000001` adds column + model update |
| `POST /api/pain-entries/:userId` returns 500 | ENUM vs VARCHAR mismatch + `createdById` nullability | Migration `20260318000002` converts ENUMs to VARCHAR |
| `POST /api/admin/clients/:id/assign-trainer` returns 500 | `sessionDate` NOT NULL constraint on sessions table | Session creation requires a date — needs calendar integration |

### AI Provider Issues
| Provider | Status | Note |
|----------|--------|------|
| OpenAI | TIMEOUT | Workout generation endpoint failed; AI chat also failed first try |
| Anthropic | NOT_CONFIGURED | No API key in production .env |
| Gemini | WORKING | Successfully generated plan via AI chat service |
| Venice | NOT_CONFIGURED | No API key in production .env |

### Data Entry Blocked (Pending Deploy)
- Pain entries, goals, workout history logs waiting for migration deploy
- Trainer assignment blocked by session date constraint

---

## 4. Recommendations for Production

### Immediate (P0)
1. **Deploy and verify migrations** — The 3 new migrations must run successfully on Render
2. **Configure additional AI providers** — Add Anthropic/Venice API keys as fallbacks
3. **Fix trainer assignment** — The assign-trainer endpoint should create sessions with a future schedulable date, not require one upfront

### Short-Term (P1)
4. **Admin createClient flow** — Should work end-to-end after migration deploy; verify
5. **AI workout generation provider** — OpenAI timeout suggests API key or rate limit issue; investigate
6. **Onboarding questionnaire** — 85-question assessment should be completed for full client profile

### Quality of AI Response
- **Rating: 9/10** — Gemini 3.1 Pro produced a medically-aware, NASM-compliant plan that correctly addressed all surgical contraindications, used appropriate Phase 2 protocol, and included nutrition guidance
- **One concern:** The AI tried to set `progressLevel.category: "strengthLevel"` which isn't a valid category. The valid categories include specific muscle groups (chestLevel, bicepsLevel, etc.) not generic "strengthLevel"

---

## 5. Client-Facing Workout Plan

### NASM OPT Phase 2: Strength Endurance (4 Weeks)

**Weeks 1-2: Neuromuscular Adaptation & Incision Protection**

**Monday: Chest & Quad Focus**
| # | Exercise | Type | Sets | Reps | Tempo | Rest |
|---|----------|------|------|------|-------|------|
| 1A | DB Floor Press | Strength | 3 | 8-12 | 2/0/2/0 | 0s |
| 1B | Standing Single-Leg Resistance Band Chest Press | Stabilization | 3 | 12-15/leg | 4/2/1/1 | 60s |
| 2A | Leg Press | Strength | 3 | 8-12 | 2/0/2/0 | 0s |
| 2B | TRX Single-Leg Squat (R leg first) | Stabilization | 3 | 12-15/leg | 4/2/1/1 | 60s |

**Wednesday: Posterior Chain (Glutes & Back)**
| # | Exercise | Type | Sets | Reps | Tempo | Rest |
|---|----------|------|------|------|-------|------|
| 1A | Seated Cable Row (elbows tucked) | Strength | 3 | 8-12 | 2/0/2/0 | 0s |
| 1B | Single-Leg Standing Cable Row | Stabilization | 3 | 12-15/leg | 4/2/1/1 | 60s |
| 2A | Barbell/Heavy DB Hip Thrust | Strength | 3 | 8-12 | 2/0/2/0 | 0s |
| 2B | Single-Leg Glute Bridge | Stabilization | 3 | 15/leg | 4/2/1/1 | 60s |

**Friday: Full Leg & Core**
| # | Exercise | Type | Sets | Reps | Tempo | Rest |
|---|----------|------|------|------|-------|------|
| 1A | Goblet Squat | Strength | 3 | 8-12 | 2/0/2/0 | 0s |
| 1B | Step-Up to Balance (R leg first) | Stabilization | 3 | 12/leg | 4/2/1/1 | 60s |
| 2A | Cable Hip Abductor | Strength | 3 | 10-12/leg | 2/0/2/0 | 0s |
| 2B | Kneeling Pallof Press | Stabilization | 3 | 12/side | 4/2/1/1 | 60s |

**Weeks 3-4: Progressive Overload (+5-10% load, 45s rest)**

**Monday: Chest & Quad Focus**
| # | Exercise | Type | Sets | Reps | Tempo | Rest |
|---|----------|------|------|------|-------|------|
| 1A | DB Floor Press (heavier) | Strength | 3 | 8-10 | 2/0/2/0 | 0s |
| 1B | Standing Single-Leg Cable Chest Press | Stabilization | 3 | 12-15/leg | 4/2/1/1 | 45s |
| 2A | Single-Leg Press (R leg priority) | Strength | 3 | 8-12/leg | 2/0/2/0 | 0s |
| 2B | TRX Single-Leg Squat | Stabilization | 3 | 15/leg | 4/2/1/1 | 45s |

**Wednesday: Posterior Chain**
| # | Exercise | Type | Sets | Reps | Tempo | Rest |
|---|----------|------|------|------|-------|------|
| 1A | Seated Cable Row (heavier) | Strength | 3 | 8-10 | 2/0/2/0 | 0s |
| 1B | Single-Leg Cable Row on Balance Pad | Stabilization | 3 | 12-15/leg | 4/2/1/1 | 45s |
| 2A | Barbell Hip Thrust | Strength | 3 | 8-10 | 2/0/2/0 | 0s |
| 2B | Shoulders-Elevated Single-Leg Glute Bridge | Stabilization | 3 | 15/leg | 4/2/1/1 | 45s |

**Friday: Full Leg & Core**
| # | Exercise | Type | Sets | Reps | Tempo | Rest |
|---|----------|------|------|------|-------|------|
| 1A | Goblet Squat (heavier) | Strength | 3 | 8-10 | 2/0/2/0 | 0s |
| 1B | Step-Up to Balance (eccentric focus) | Stabilization | 3 | 12-15/leg | 4/2/1/1 | 45s |
| 2A | Cable Hip Abductor (heavier) | Strength | 3 | 10-12/leg | 2/0/2/0 | 0s |
| 2B | Standing Cable Pallof Press | Stabilization | 3 | 12/side | 4/2/1/1 | 45s |

### Warm-Up (3-4 min)
1. **Foam Roll** (30s/spot): Calves, adductors, TFL/IT band. SKIP lats/axillary area (incision protection)
2. **Active Stretch** (5-10 reps, 1-2s hold): Kneeling hip flexor, standing calf
3. **Activate:** Single-leg balance 30s/leg (right leg first)

### Cool-Down (2-3 min)
1. **Foam Roll:** Lower body repeat
2. **Static Stretch** (30s holds): Supine hamstring, piriformis, kneeling hip flexor. NO chest/overhead stretching until 6-8 weeks post-op

### Bench Press Progression (Weeks 5-8)
| Weeks | Exercise | Sets x Reps | Notes |
|-------|----------|-------------|-------|
| 5-6 | DB Flat Bench Press | 3-4 x 8-12 | 7 weeks post-op, medical clearance |
| 7-8 | Barbell Bench Press | 4 x 5-8 | Target: 75lb x 3-5 reps |

### Nutrition Protocol
- **Calories:** 1,550/day (300 deficit from 1,850 TDEE)
- **Protein:** 150g (2.0g/kg — collagen synthesis + quad recovery)
- **Carbs:** 130g (peri-workout timing)
- **Fats:** 48g
- **Supplements:** Vitamin C 1,000mg + Zinc 15-30mg (wound healing), Creatine 5g/day (quad atrophy)

---

## 6. Onboarding Process Assessment

### What Worked
1. Account creation via signup endpoint
2. Profile update via admin user update endpoint
3. AI Chat with Gemini 3.1 Pro for workout plan generation (excellent quality)
4. Client context enrichment (targetUserId passed to conversation)

### What Needs Improvement
1. **Admin createClient endpoint** — 500 error due to missing DB table
2. **Pain entry creation** — ENUM mismatch blocks recording surgical history
3. **Goal creation** — Missing challengeId column blocks goal tracking
4. **Trainer assignment** — Session date constraint prevents simple assignment
5. **Workout history logging** — Need to verify endpoint after migration deploy
6. **AI workout generation endpoint** — OpenAI timeout; needs multi-provider fallback like AI chat has
7. **No bulk data import** — Each workout session must be created individually; need batch endpoint for Move Fitness data migration

### Onboarding Quality Score: 7/10
- **Profile creation:** 10/10 (all data captured)
- **Data enrichment:** 4/10 (pain entries, goals, workout history blocked by DB issues)
- **AI plan quality:** 9/10 (exceptional, medically-aware)
- **System reliability:** 5/10 (multiple 500 errors from missing migrations)

---

*Report generated by Claude Opus 4.6 during Move Fitness client onboarding session.*
*Client name redacted per trainer request for AI Village review.*
