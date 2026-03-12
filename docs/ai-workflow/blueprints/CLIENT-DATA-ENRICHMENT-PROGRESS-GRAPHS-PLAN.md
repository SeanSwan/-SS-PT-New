# SwanStudios: Granular Client Data Enrichment + Progress Graphs Blueprint

## Executive Summary

Enhance the AI workout generation pipeline to be **maximally granular** about client data — every relevant data point the platform has should flow into the AI's context when generating or advising on workout plans. Additionally, build a **client-facing progress dashboard** with Recharts graphs connected to real workout history, showing measurable progress with precision.

---

## PART 1: AI CLIENT DATA ENRICHMENT (Backend)

### Current State Analysis

**What masterPromptBuilder.mjs already collects (v3.0):**
- Client profile (name, DOB, gender, weight, height)
- Goals (primary + secondary from onboarding questionnaire)
- Fitness background (experience level, preferred/disliked exercises)
- Health (concerns, injuries, PAR-Q, medical clearance)
- Movement assessment (NASM score, OHSA, postural, corrective strategy)
- Equipment profiles (items + location types)
- Training history (last 10 sessions, exercise count)
- Baseline measurements (weight, body fat %, BMI)

**What aiChatService.mjs enrichWithUserData already fetches (17 sources):**
- All of the above PLUS: gamification, streaks, goals, client notes, client progress (NASM levels), macro logs, movement profile, waiver records, form analysis, pain entries

**GAPS — Data that EXISTS but is NOT flowing into workout generation:**
1. Pain entries (only in chat context, NOT in workout generation pipeline)
2. Form analysis scores (exercise-specific form quality from video analysis)
3. Body measurement history/trends (only latest, not trajectory)
4. Macro/nutrition compliance (not considered when planning workout intensity)
5. Sleep/recovery data (User model has no field yet)
6. Workout consistency/compliance (7d/30d/90d windows — only in chat)
7. Exercise-specific 1RM history (actual calculated values, not mock data)
8. Client notes from trainer (severity-tagged, could modify exercise selection)
9. Movement profile (mobility scores, strength balance ratios)
10. Goal progress tracking (% toward goals, milestones hit)

### Enhancement Plan

#### 1A. Enhance masterPromptBuilder.mjs — Add Missing Data Sources

**File:** `backend/services/masterPromptBuilder.mjs`

Add these parallel fetches to `buildMasterPromptFromUserData()`:

```javascript
// NEW data sources (add to Promise.all)
ClientPainEntry?.findAll({
  where: { userId, isActive: true },
  order: [['painLevel', 'DESC']],
  limit: 10,
  attributes: ['bodyRegion', 'side', 'painLevel', 'painType', 'aggravatingMovements', 'relievingFactors', 'aiNotes', 'posturalSyndrome']
}).catch(() => []),

FormAnalysis?.findAll({
  where: { userId },
  order: [['createdAt', 'DESC']],
  limit: 20,
  attributes: ['exerciseName', 'formScore', 'symmetryScore', 'romScore', 'fatigueDetected', 'compensationsDetected', 'recommendations']
}).catch(() => []),

BodyMeasurement?.findAll({
  where: { userId },
  order: [['measuredAt', 'DESC']],
  limit: 5,
  attributes: ['measuredAt', 'weight', 'bodyFatPercentage', 'muscleMassPercentage', 'progressScore', 'milestonesAchieved']
}).catch(() => []),

MacroLog?.findAll({
  where: { userId, logDate: { [Op.gte]: thirtyDaysAgo } },
  order: [['logDate', 'DESC']],
  limit: 30,
  attributes: ['logDate', 'totalCalories', 'protein', 'carbs', 'fat', 'fiber']
}).catch(() => []),

ClientNote?.findAll({
  where: { clientId: userId, severity: ['critical', 'high'] },
  order: [['createdAt', 'DESC']],
  limit: 5,
  attributes: ['noteType', 'severity', 'content', 'category']
}).catch(() => []),

MovementProfile?.findOne({
  where: { userId },
  order: [['updatedAt', 'DESC']],
  attributes: ['mobilityScores', 'strengthBalance', 'compensationPatterns', 'exerciseCompetencyScores']
}).catch(() => null),

Goal?.findAll({
  where: { userId, status: ['active', 'in_progress'] },
  limit: 5,
  attributes: ['goalType', 'targetValue', 'currentValue', 'unit', 'deadline', 'progressPercentage']
}).catch(() => []),
```

Add new sections to the master prompt output:

```javascript
// Pain & injury context (CRITICAL for exercise selection safety)
painAndInjuries: {
  activePainEntries: painEntries.map(p => ({
    region: p.bodyRegion,
    side: p.side,
    level: p.painLevel,         // 1-10
    type: p.painType,           // sharp, dull, aching, etc.
    avoid: p.aggravatingMovements,  // exercises to skip
    helps: p.relievingFactors,
    aiGuidance: p.aiNotes,      // trainer-written AI instructions
    syndrome: p.posturalSyndrome // upper_crossed, lower_crossed
  })),
  totalActiveIssues: painEntries.length,
},

// Form quality history (adjust exercise selection based on execution quality)
formAnalysis: {
  exerciseScores: formAnalyses.map(f => ({
    exercise: f.exerciseName,
    formScore: f.formScore,           // 0-100
    symmetry: f.symmetryScore,        // 0-100
    rom: f.romScore,                  // 0-100
    fatigueDetected: f.fatigueDetected,
    compensations: f.compensationsDetected,
    recommendations: f.recommendations,
  })),
  averageFormScore: formAnalyses.length > 0
    ? formAnalyses.reduce((sum, f) => sum + (f.formScore || 0), 0) / formAnalyses.length
    : null,
},

// Body composition trajectory (not just latest, but TREND)
bodyCompositionTrend: {
  measurements: bodyMeasurements.map(m => ({
    date: m.measuredAt,
    weight: m.weight,
    bodyFat: m.bodyFatPercentage,
    muscleMass: m.muscleMassPercentage,
    progressScore: m.progressScore,
  })),
  weightTrend: calculateTrend(bodyMeasurements, 'weight'),     // 'gaining', 'losing', 'stable'
  bodyFatTrend: calculateTrend(bodyMeasurements, 'bodyFatPercentage'),
  muscleTrend: calculateTrend(bodyMeasurements, 'muscleMassPercentage'),
},

// Nutrition compliance context (affects workout intensity recommendations)
nutritionCompliance: {
  last30Days: macroLogs.length,
  averageDailyCalories: avg(macroLogs, 'totalCalories'),
  averageProtein: avg(macroLogs, 'protein'),
  averageCarbs: avg(macroLogs, 'carbs'),
  averageFat: avg(macroLogs, 'fat'),
  proteinAdequacy: assessProteinAdequacy(macroLogs, targetUser.weight),
  isTrackingConsistently: macroLogs.length >= 20, // 20+ of 30 days
},

// Trainer notes flagged for AI (high/critical severity only)
trainerFlags: {
  criticalNotes: trainerNotes.map(n => ({
    type: n.noteType,
    severity: n.severity,
    content: n.content,
    category: n.category,
  })),
},

// Movement profile (strength balance ratios, mobility limitations)
movementProfile: movementProfileData ? {
  mobilityScores: movementProfileData.mobilityScores,
  strengthBalance: movementProfileData.strengthBalance,        // e.g., quad:hamstring ratio
  compensationPatterns: movementProfileData.compensationPatterns,
  exerciseCompetency: movementProfileData.exerciseCompetencyScores, // per-exercise skill level
} : null,

// Active goals with progress tracking
activeGoals: goals.map(g => ({
  type: g.goalType,
  target: g.targetValue,
  current: g.currentValue,
  unit: g.unit,
  deadline: g.deadline,
  progress: g.progressPercentage,
})),

// Workout consistency (derived from session history)
consistency: {
  sessionsLast7Days: recentSessions.filter(s => isWithinDays(s.date, 7)).length,
  sessionsLast30Days: recentSessions.filter(s => isWithinDays(s.date, 30)).length,
  averageSessionsPerWeek: calculateWeeklyAverage(recentSessions),
  longestStreak: targetUser.streakDays || 0,
  lastWorkoutDate: recentSessions[0]?.date || null,
  daysSinceLastWorkout: recentSessions[0] ? daysBetween(recentSessions[0].date, new Date()) : null,
},
```

#### 1B. Enhance aiWorkoutController.mjs — Use All New Data

**File:** `backend/controllers/aiWorkoutController.mjs`

The controller already calls `buildMasterPromptFromUserData()` and `buildUnifiedContext()`. The new data will automatically flow through once masterPromptBuilder is enhanced. However, we need to add **explicit AI instructions** about how to use each data point:

Add to the system prompt builder in `contextBuilder.mjs`:

```javascript
// Pain-aware exercise selection
if (masterPrompt.painAndInjuries?.activePainEntries?.length > 0) {
  contextSections.push(`
ACTIVE PAIN/INJURY CONSTRAINTS (MANDATORY — DO NOT IGNORE):
${masterPrompt.painAndInjuries.activePainEntries.map(p =>
  `- ${p.region} (${p.side}): Pain level ${p.level}/10, type: ${p.type}
   AVOID: ${p.avoid || 'N/A'}
   HELPS: ${p.helps || 'N/A'}
   ${p.aiGuidance ? `TRAINER GUIDANCE: ${p.aiGuidance}` : ''}
   ${p.syndrome ? `POSTURAL SYNDROME: ${p.syndrome}` : ''}`
).join('\n')}
RULE: Any exercise that loads a pain region at level 6+ MUST be substituted. For levels 3-5, reduce load by 30% and note modification.`);
}

// Form quality-based progression
if (masterPrompt.formAnalysis?.exerciseScores?.length > 0) {
  contextSections.push(`
FORM QUALITY DATA (use for exercise selection and progression):
${masterPrompt.formAnalysis.exerciseScores.map(f =>
  `- ${f.exercise}: Form ${f.formScore}/100, Symmetry ${f.symmetry}/100, ROM ${f.rom}/100${f.fatigueDetected ? ' [FATIGUE DETECTED]' : ''}${f.compensations ? ` [COMPENSATIONS: ${f.compensations}]` : ''}`
).join('\n')}
Average form score: ${masterPrompt.formAnalysis.averageFormScore?.toFixed(1)}/100
RULE: Do NOT progress load on exercises with form score <70. For scores <50, regress to corrective variation.`);
}

// Nutrition-aware intensity planning
if (masterPrompt.nutritionCompliance) {
  const nc = masterPrompt.nutritionCompliance;
  contextSections.push(`
NUTRITION CONTEXT:
- Tracking consistency: ${nc.isTrackingConsistently ? 'Good (20+ days/month)' : 'Inconsistent'}
- Avg daily: ${nc.averageDailyCalories} kcal, ${nc.averageProtein}g protein, ${nc.averageCarbs}g carbs, ${nc.averageFat}g fat
- Protein adequacy: ${nc.proteinAdequacy}
RULE: If protein intake is <1.4g/kg and goal is hypertrophy, recommend increasing protein before adding volume. If caloric intake suggests deficit, cap session volume to prevent overtraining.`);
}

// Body composition trend context
if (masterPrompt.bodyCompositionTrend?.measurements?.length > 1) {
  const bct = masterPrompt.bodyCompositionTrend;
  contextSections.push(`
BODY COMPOSITION TREND:
- Weight trend: ${bct.weightTrend} (${bct.measurements.map(m => `${m.date}: ${m.weight}lbs`).join(' → ')})
- Body fat trend: ${bct.bodyFatTrend}
- Muscle mass trend: ${bct.muscleTrend}
RULE: If weight is increasing but body fat is also increasing, shift emphasis to metabolic conditioning. If muscle mass is stagnating despite strength training, increase volume or check nutrition.`);
}

// Goal-aware programming
if (masterPrompt.activeGoals?.length > 0) {
  contextSections.push(`
ACTIVE CLIENT GOALS:
${masterPrompt.activeGoals.map(g =>
  `- ${g.type}: ${g.current}/${g.target} ${g.unit} (${g.progress}% complete${g.deadline ? `, deadline: ${g.deadline}` : ''})`
).join('\n')}
RULE: Prioritize exercises and rep schemes that directly support the primary goal. If deadline is approaching and progress is behind, increase frequency of goal-specific training.`);
}

// Consistency-based volume adjustment
if (masterPrompt.consistency) {
  const c = masterPrompt.consistency;
  contextSections.push(`
WORKOUT CONSISTENCY:
- Last 7 days: ${c.sessionsLast7Days} sessions
- Last 30 days: ${c.sessionsLast30Days} sessions
- Weekly average: ${c.averageSessionsPerWeek?.toFixed(1)}
- Days since last workout: ${c.daysSinceLastWorkout ?? 'No data'}
- Current streak: ${c.longestStreak} days
RULE: If >7 days since last workout, reduce intensity by 20% for re-entry. If <2 sessions/week average, keep volume moderate to prevent DOMS-related dropout. If 4+ sessions/week, can program higher volume splits.`);
}
```

#### 1C. Add Exercise-Specific 1RM Tracking (Replace Mock Data)

**File:** `backend/routes/dailyWorkoutFormRoutes.mjs` — enhance the `/client/:clientId/progress` endpoint

Currently `processOneRepMaxData()` in `ClientProgressCharts.tsx` returns HARDCODED mock data. Fix:

**Backend changes:**
```javascript
// In the progress endpoint handler, calculate actual 1RM from workout logs
async function calculateOneRepMaxData(userId, timeRange) {
  const workoutForms = await DailyWorkoutForm.findAll({
    where: { userId, createdAt: { [Op.gte]: timeRangeToDate(timeRange) } },
    include: [{ model: WorkoutFormExercise, as: 'exercises',
      include: [{ model: WorkoutFormSet, as: 'sets' }]
    }],
    order: [['createdAt', 'DESC']]
  });

  // Group by exercise, find heaviest set, calculate Epley 1RM
  const exerciseMaxes = {};
  for (const form of workoutForms) {
    for (const exercise of (form.exercises || [])) {
      for (const set of (exercise.sets || [])) {
        if (set.weight && set.reps && set.reps > 0) {
          // Epley formula: 1RM = weight × (1 + reps/30)
          const estimated1RM = set.reps === 1 ? set.weight : set.weight * (1 + set.reps / 30);
          const key = exercise.exerciseName;
          if (!exerciseMaxes[key] || estimated1RM > exerciseMaxes[key].max) {
            exerciseMaxes[key] = {
              exercise: key,
              max: Math.round(estimated1RM),
              actualWeight: set.weight,
              actualReps: set.reps,
              date: form.createdAt,
              category: exercise.category || 'General'
            };
          }
        }
      }
    }
  }

  // Calculate improvement vs previous period
  // ... (compare to older records)

  return Object.values(exerciseMaxes)
    .sort((a, b) => b.max - a.max)
    .slice(0, 10); // Top 10 exercises by 1RM
}
```

#### 1D. Add Sleep/Recovery Field to User Model

**File:** New migration + User model update

```javascript
// Migration: add-recovery-fields-to-users.cjs
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'averageSleepHours', {
      type: Sequelize.FLOAT, allowNull: true
    });
    await queryInterface.addColumn('Users', 'recoveryRating', {
      type: Sequelize.INTEGER, allowNull: true, // 1-10 self-reported
      validate: { min: 1, max: 10 }
    });
    await queryInterface.addColumn('Users', 'stressLevel', {
      type: Sequelize.INTEGER, allowNull: true, // 1-10 self-reported
      validate: { min: 1, max: 10 }
    });
  }
};
```

Add to masterPromptBuilder output:
```javascript
recovery: {
  averageSleep: targetUser.averageSleepHours,
  recoveryRating: targetUser.recoveryRating,
  stressLevel: targetUser.stressLevel,
},
```

AI rule: "If sleep <6 hours or recovery <4/10 or stress >7/10, reduce training volume by 20% and avoid max-effort sets."

---

## PART 2: CLIENT PROGRESS GRAPHS (Frontend)

### Current State

**Existing charts (ClientProgressCharts.tsx):**
1. Volume Over Time (AreaChart) — works but uses old Galaxy-Swan theme colors
2. 1-Rep Max Projections (BarChart) — **USES MOCK DATA** (hardcoded exercises)
3. Form Quality Trend (LineChart) — works
4. NASM Category Radar — works

**Theme issues:** All charts use `#3b82f6` (Tailwind blue) instead of Crystalline Swan palette.

### Enhancement Plan

#### 2A. Fix 1RM Chart — Replace Mock Data with Real Calculated Values

**File:** `frontend/src/components/ClientProgressCharts/ClientProgressCharts.tsx`

Replace `processOneRepMaxData()`:
```typescript
const processOneRepMaxData = (workoutHistory: any[]) => {
  // Backend now returns calculated 1RM data via the progress endpoint
  if (!workoutHistory || workoutHistory.length === 0) return [];

  // Data comes pre-processed from backend with Epley formula applied
  return workoutHistory.map(entry => ({
    exercise: entry.exercise,
    max: entry.max,
    label: `${entry.max} lbs`,
    improvement: entry.improvement || 0,
    category: entry.category || 'General',
    date: entry.date,
  }));
};
```

#### 2B. Add New Charts — Body Composition, Strength Progression, Consistency

Add 4 new chart components:

**Chart 5: Body Composition Timeline**
```
frontend/src/components/ClientProgressCharts/charts/BodyCompositionChart.tsx
```
- Dual-axis ComposedChart (Recharts)
- Left Y-axis: Weight (lbs) — AreaChart fill
- Right Y-axis: Body Fat % — LineChart overlay
- X-axis: Date
- Shows weight trend + body fat trend on same timeline
- Milestone markers (weight goals hit)

**Chart 6: Strength Progression Per Exercise**
```
frontend/src/components/ClientProgressCharts/charts/StrengthProgressionChart.tsx
```
- Multi-line LineChart
- Each line = one compound lift (Bench, Squat, Deadlift, OHP, Row)
- Y-axis: Estimated 1RM (lbs)
- X-axis: Date
- Toggle exercise visibility
- Shows actual progression over weeks/months

**Chart 7: Workout Consistency Heatmap**
```
frontend/src/components/ClientProgressCharts/charts/ConsistencyHeatmap.tsx
```
- Calendar heatmap (similar to GitHub contribution graph)
- Color intensity = workout volume that day
- Shows gaps, streaks, patterns
- Crystalline Swan palette: empty=transparent, light=#003080/20, medium=#50A0F0/60, heavy=#8B5CF6

**Chart 8: Muscle Group Balance Radar**
```
frontend/src/components/ClientProgressCharts/charts/MuscleGroupRadar.tsx
```
- RadarChart with muscle groups as axes (Chest, Back, Shoulders, Arms, Core, Legs)
- Shows volume distribution across muscle groups
- Highlights imbalances (e.g., too much chest, not enough back)
- Overlays: current period vs previous period for comparison

#### 2C. Create New Progress API Endpoint

**File:** `backend/routes/dailyWorkoutFormRoutes.mjs`

Add enhanced progress endpoint:
```
GET /api/workout-forms/client/:clientId/progress-detailed
```

Returns:
```json
{
  "progressData": {
    "volumeProgression": [...],
    "oneRepMaxes": [...],         // Real calculated 1RM data (Epley formula)
    "formTrends": [...],
    "nasmCategories": [...],
    "bodyComposition": [...],     // NEW: from BodyMeasurement model
    "strengthProgression": [...], // NEW: per-exercise 1RM over time
    "consistencyData": [...],     // NEW: daily workout counts for heatmap
    "muscleGroupVolume": {...},   // NEW: volume by muscle group
    "summary": {
      "totalWorkouts": number,
      "totalVolume": number,
      "averageFormScore": number,
      "strongestLift": { exercise, max },
      "mostImproved": { exercise, improvement },
      "currentStreak": number,
      "weeklyAverage": number,
    }
  }
}
```

#### 2D. Theme Alignment — Crystalline Swan Palette

All chart components must use:
```typescript
const chartTheme = {
  primary: '#60C0F0',      // Ice Wing — primary data line
  secondary: '#8B5CF6',    // Wing Purple — secondary data / accents
  tertiary: '#50A0F0',     // Arctic Cyan — tertiary data
  gold: '#C6A84B',         // Gilded Fern — highlights, PRs, milestones
  surface: 'rgba(0,48,128,0.80)',  // Royal Depth — card backgrounds
  grid: 'rgba(96,192,240,0.1)',    // Ice Wing at low opacity — grid lines
  text: '#E0ECF4',         // Frost White — labels
  textMuted: '#b8c9db',    // Muted text (WCAG AA compliant)
  tooltip: {
    bg: 'rgba(0,32,96,0.95)',       // Midnight Sapphire
    border: 'rgba(96,192,240,0.3)', // Ice Wing border
  },
  gradients: {
    volume: ['rgba(96,192,240,0.4)', 'rgba(96,192,240,0.05)'], // Ice Wing gradient
    bodyFat: ['rgba(139,92,246,0.4)', 'rgba(139,92,246,0.05)'], // Wing Purple gradient
  }
};
```

Replace all instances of:
- `#3b82f6` → `#60C0F0` (Ice Wing)
- `#06b6d4` → `#50A0F0` (Arctic Cyan)
- `#10b981` → `#C6A84B` (Gilded Fern)
- `rgba(15, 23, 42, ...)` → `rgba(0, 32, 96, ...)` (Midnight Sapphire)
- `rgba(30, 41, 59, ...)` → `rgba(0, 48, 128, ...)` (Royal Depth)
- `rgba(148, 163, 184, 0.2)` → `rgba(96, 192, 240, 0.2)` (Ice Wing border)
- `#e2e8f0` → `#E0ECF4` (Frost White)
- `#94a3b8` → `#b8c9db` (WCAG AA muted text)
- Font family: add `'Fira Code'` for data labels, `'Plus Jakarta Sans'` for titles

#### 2E. Client Detail Page Integration

**File:** `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientProgressDashboard.tsx`

Wire the enhanced `ClientProgressCharts` component into the admin client detail view:
- Full 8-chart dashboard when viewing individual client
- Summary cards above charts: Total Workouts, Current Streak, Strongest Lift, Most Improved
- Time range selector (7d, 30d, 90d, 1y, All Time)
- Export button (download progress report as PDF)
- Compare toggle (overlay previous period)

#### 2F. Client Self-Service Progress View

**File:** `frontend/src/components/DashBoard/Pages/client-dashboard/ClientProgressPanel.tsx`

Clients should see their own progress with:
- Same 8 charts but with motivational framing
- "Personal Records" highlight cards (animated when PR is hit)
- Goal progress bars with deadline countdown
- "Share Progress" button (generates shareable image)
- Weekly/monthly progress summary cards

---

## PART 3: Data Flow Architecture

```
CLIENT JOURNEY:
┌─────────────────────────────────────────────────────────────┐
│ Onboarding → Waiver → Movement Assessment → First Workout  │
└────┬────────────┬───────────────┬──────────────────┬────────┘
     │            │               │                  │
     ▼            ▼               ▼                  ▼
┌─────────┐ ┌──────────┐ ┌─────────────┐ ┌──────────────────┐
│ Goals   │ │ Health   │ │ NASM Score  │ │ Workout Logs     │
│ Prefs   │ │ Injuries │ │ OPT Phase   │ │ Sets/Reps/Weight │
│ Tier    │ │ PAR-Q    │ │ Correctives │ │ Form Scores      │
└────┬────┘ └────┬─────┘ └──────┬──────┘ └───────┬──────────┘
     │           │               │                │
     ▼           ▼               ▼                ▼
┌──────────────────────────────────────────────────────────┐
│              masterPromptBuilder.mjs (v4.0)              │
│  Collects ALL data sources into unified context JSON     │
│  NEW: pain entries, form analysis, body comp trends,     │
│  nutrition compliance, trainer notes, movement profile,  │
│  goal progress, consistency metrics, recovery state      │
└────────────────────────┬─────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
┌──────────────────────┐ ┌─────────────────────────┐
│ AI Workout Generator │ │ AI Chat Assistant       │
│ (aiWorkoutController)│ │ (aiChatService)         │
│                      │ │                         │
│ Uses ALL context for:│ │ Uses ALL context for:   │
│ - Exercise selection │ │ - Answering questions   │
│ - Load prescription  │ │ - Nutrition advice      │
│ - Pain avoidance     │ │ - Form corrections      │
│ - Volume adjustment  │ │ - Goal coaching         │
│ - OPT phase match   │ │ - Progress review       │
└──────────┬───────────┘ └─────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│              Frontend Progress Dashboard                  │
│  8 Charts (Recharts) connected to real workout data:     │
│  1. Volume Over Time        5. Body Composition          │
│  2. 1RM Projections (REAL)  6. Strength Progression      │
│  3. Form Quality Trend      7. Consistency Heatmap       │
│  4. NASM Category Radar     8. Muscle Group Balance      │
│                                                           │
│  Summary cards: PRs, Streaks, Goals, Compliance          │
│  Crystalline Swan theme throughout                        │
└──────────────────────────────────────────────────────────┘
```

---

## Files to Modify

### Backend (6 files)
| File | Change |
|------|--------|
| `backend/services/masterPromptBuilder.mjs` | Add 7 new data sources, bump to v4.0 |
| `backend/services/ai/contextBuilder.mjs` | Add AI rules for pain, form, nutrition, goals, consistency |
| `backend/routes/dailyWorkoutFormRoutes.mjs` | Add `/progress-detailed` endpoint with real 1RM, body comp, consistency |
| `backend/controllers/aiWorkoutController.mjs` | Pass new context sections to AI provider |
| `backend/migrations/XXXX-add-recovery-fields.cjs` | Add sleep, recovery, stress fields to Users |
| `backend/models/User.mjs` | Add recovery fields |

### Frontend (10 files)
| File | Change |
|------|--------|
| `frontend/src/components/ClientProgressCharts/ClientProgressCharts.tsx` | Add 4 new charts, fix theme, fix 1RM mock data |
| `frontend/src/components/ClientProgressCharts/charts/BodyCompositionChart.tsx` | NEW: dual-axis weight + body fat timeline |
| `frontend/src/components/ClientProgressCharts/charts/StrengthProgressionChart.tsx` | NEW: multi-line exercise 1RM progression |
| `frontend/src/components/ClientProgressCharts/charts/ConsistencyHeatmap.tsx` | NEW: GitHub-style workout calendar |
| `frontend/src/components/ClientProgressCharts/charts/MuscleGroupRadar.tsx` | NEW: muscle group volume balance |
| `frontend/src/components/ClientProgressCharts/charts/VolumeOverTimeChart.tsx` | Theme fix: Crystalline Swan colors |
| `frontend/src/components/ClientProgressCharts/charts/OneRepMaxChart.tsx` | Theme fix + use real data |
| `frontend/src/components/ClientProgressCharts/charts/FormQualityChart.tsx` | Theme fix |
| `frontend/src/components/ClientProgressCharts/types/ClientProgressTypes.ts` | Add new chart data types |
| `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientProgressDashboard.tsx` | Wire 8-chart dashboard into client detail |

---

## PART 4: TRAINER DASHBOARD — Client Progress Visibility

### Current State

**Infrastructure exists:**
- `ClientTrainerAssignment` model links trainers to clients (active/inactive/pending)
- `ensureClientAccess()` middleware enforces trainer-only-sees-assigned-clients
- `MyClientsView.tsx` shows assigned client list with basic stats
- `ClientProgressView.tsx` exists but uses limited data (weight sparkline, session count)
- `EnhancedClientProgressView.tsx` has advanced analytics stubs but not fully wired

**GAPS:**
1. Trainer cannot see full workout history of assigned clients (only summary)
2. No progress charts in trainer view (ClientProgressCharts not integrated)
3. No side-by-side comparison of client metrics over time
4. No "last workout detail" view (what exercises, sets, reps did the client do?)
5. Trainer notes don't flow back to AI for next workout generation
6. No workout history table with expandable rows showing exercise details

### Enhancement Plan

#### 4A. Integrate ClientProgressCharts into Trainer Dashboard

**File:** `frontend/src/components/TrainerDashboard/ClientProgress/ClientProgressView.tsx`

Wire the same 8-chart `ClientProgressCharts` component used by admin:
```typescript
import ClientProgressCharts from '../../../ClientProgressCharts/ClientProgressCharts';

// Inside the component, when a client is selected:
<ClientProgressCharts
  clientId={selectedClientId}
  isTrainerView={true}
  showControls={true}
  defaultTimeRange="30d"
/>
```

The `isTrainerView` prop:
- Hides admin-only actions (delete client, modify assignments)
- Shows trainer-specific actions (log workout, add note, schedule session)
- Uses `ensureClientAccess()` on the API side to enforce assignment check

#### 4B. Workout History Table with Expandable Detail

**File:** `frontend/src/components/TrainerDashboard/ClientProgress/WorkoutHistoryTable.tsx` (NEW)

Full workout history for assigned clients:
```typescript
interface WorkoutHistoryTableProps {
  clientId: number;
  limit?: number;
}

// Table columns:
// Date | Workout Name | Duration | Total Volume | Exercises | Intensity | Actions
// Expandable row shows: each exercise → sets × reps × weight, RPE, form score, notes

// API: GET /api/workouts/:clientId/history?limit=50&offset=0
// Protected by ensureClientAccess middleware
```

Features:
- Paginated (50 per page)
- Sortable by date, volume, intensity
- Expandable rows showing per-exercise detail (sets, reps, weight, RPE)
- Form quality indicator per exercise (green/yellow/red dot)
- "Repeat Workout" button — copies exercise selection into new session
- Export to CSV

#### 4C. Trainer Quick-Action Panel

**File:** `frontend/src/components/TrainerDashboard/ClientProgress/TrainerQuickActions.tsx` (NEW)

When viewing a client's progress, trainers should have:
- "Log Workout" button → opens WorkoutLogger pre-loaded with client context
- "Add Note" button → adds severity-tagged note (flows to AI via trainerFlags)
- "Update Pain Entry" button → add/modify active pain entries
- "Take Measurements" button → opens body measurement form
- "Generate AI Plan" button → calls `/api/ai/workout-generation` with all client data
- "Schedule Session" button → opens booking for this client

#### 4D. Backend: Trainer-Scoped Progress Endpoint

**File:** `backend/routes/dailyWorkoutFormRoutes.mjs`

Add trainer-specific access to progress-detailed:
```javascript
// GET /api/workout-forms/trainer/client/:clientId/progress-detailed
// Middleware: auth + ensureClientAccess (checks trainer assignment)
router.get('/trainer/client/:clientId/progress-detailed',
  authenticate,
  async (req, res) => {
    await ensureClientAccess(req, req.params.clientId);
    // Same logic as admin progress-detailed endpoint
    // Returns full 8-chart dataset
  }
);
```

---

## PART 5: ADMIN DASHBOARD — Client Data & Graphs

### Current State

**Exists:**
- `AdminClientManagementView.tsx` — full client list with CRUD
- `ClientAnalyticsPanel.tsx` — analytics with Recharts (AreaChart, BarChart, RadarChart, ScatterChart)
- `ClientProgressDashboard.tsx` — progress dashboard component
- `ClientMeasurementPanel.tsx` — body measurements
- `ClientsWorkspace.tsx` — 11-tab admin workspace (Clients, Users, Trainers, etc.)
- Admin can access ANY client's data (no assignment restriction)

**GAPS:**
1. ClientAnalyticsPanel uses mock/generated data for charts, not real workout data
2. Admin client detail doesn't show the 8-chart progress dashboard
3. No "all clients overview" with aggregate metrics (who's progressing, who's stalling)
4. Workout history view exists but not linked to progress charts
5. No comparison view (compare 2 clients side by side)

### Enhancement Plan

#### 5A. Wire ClientProgressCharts into Admin Client Detail

**File:** `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientProgressDashboard.tsx`

Replace existing stub with full `ClientProgressCharts`:
```typescript
import ClientProgressCharts from '../../../../ClientProgressCharts/ClientProgressCharts';

const ClientProgressDashboard: React.FC<{ clientId: number }> = ({ clientId }) => {
  return (
    <div>
      {/* Summary cards row */}
      <ProgressSummaryCards clientId={clientId} />

      {/* Full 8-chart dashboard */}
      <ClientProgressCharts
        clientId={clientId}
        isTrainerView={false}
        showControls={true}
        defaultTimeRange="30d"
      />

      {/* Workout history table */}
      <WorkoutHistoryTable clientId={clientId} limit={50} />
    </div>
  );
};
```

#### 5B. Progress Summary Cards

**File:** `frontend/src/components/ClientProgressCharts/ProgressSummaryCards.tsx` (NEW)

Top-level summary cards above the charts:
```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ 47 Total   │ │ 12-Day     │ │ Squat      │ │ OHP +15%   │
│ Workouts   │ │ Streak     │ │ 225 lbs    │ │ Most       │
│ +5 this wk │ │ Best: 28   │ │ Strongest  │ │ Improved   │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ 85/100     │ │ 178 lbs    │ │ 3.8/week   │ │ Fat Loss   │
│ Avg Form   │ │ -4 lbs     │ │ Avg Freq   │ │ 68%        │
│ Score      │ │ This Month │ │ Last 30d   │ │ Goal Prog  │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

Each card: animated counter, trend arrow (up/down), color-coded (green=good, gold=PR, purple=milestone).

#### 5C. Admin All-Clients Overview Widget

**File:** `frontend/src/components/DashBoard/Pages/admin-dashboard/AllClientsProgressWidget.tsx` (NEW)

Bird's-eye view on the main admin dashboard:
- Table: Client Name | Workouts (30d) | Streak | Last Workout | Progress Score | Status
- Status: Active (green), Stalling (yellow), At Risk (red — >7 days no workout)
- Sortable/filterable
- Click row → navigates to client detail with full progress dashboard
- API: `GET /api/admin/clients/progress-overview` (aggregates key metrics for all clients)

#### 5D. Backend: Admin Progress Overview Endpoint

**File:** `backend/routes/adminClientRoutes.mjs`

```javascript
// GET /api/admin/clients/progress-overview
// Returns: array of client summary objects for the overview widget
router.get('/progress-overview', authenticate, requireAdmin, async (req, res) => {
  const clients = await User.findAll({ where: { role: 'client' } });
  const overview = await Promise.all(clients.map(async (client) => {
    const [recentSessions, streak, lastWorkout] = await Promise.all([
      WorkoutSession.count({ where: { userId: client.id, date: { [Op.gte]: thirtyDaysAgo } } }),
      client.streakDays || 0,
      WorkoutSession.findOne({ where: { userId: client.id }, order: [['date', 'DESC']] }),
    ]);
    return {
      clientId: client.id,
      name: `${client.firstName} ${client.lastName}`,
      workoutsLast30Days: recentSessions,
      currentStreak: streak,
      lastWorkoutDate: lastWorkout?.date || null,
      daysSinceLastWorkout: lastWorkout ? daysBetween(lastWorkout.date, new Date()) : null,
      status: !lastWorkout || daysBetween(lastWorkout.date, new Date()) > 7 ? 'at_risk'
        : daysBetween(lastWorkout.date, new Date()) > 3 ? 'stalling' : 'active',
    };
  }));
  res.json({ clients: overview });
});
```

---

## PART 6: ROLE-BASED ACCESS MATRIX

| Feature | Client | Trainer | Admin |
|---------|--------|---------|-------|
| Own progress charts | YES | N/A | N/A |
| Assigned client charts | N/A | YES (assigned only) | YES (all clients) |
| Workout history table | Own only | Assigned clients | All clients |
| Log workout for client | N/A | Assigned clients | All clients |
| Add pain entry | N/A | Assigned clients | All clients |
| Generate AI plan | N/A | Assigned clients | All clients |
| All-clients overview | N/A | N/A | YES |
| Export progress PDF | Own only | Assigned clients | All clients |
| Compare clients | N/A | Own assigned only | Any 2 clients |
| Body measurements | View own | Add/view assigned | Add/view all |
| Trainer notes (→ AI) | N/A | Add for assigned | Add for all |

**Enforcement:**
- Frontend: conditional rendering based on `user.role`
- Backend: `ensureClientAccess()` middleware on ALL client-specific endpoints
- `ClientTrainerAssignment` model with `status: 'active'` check
- Admin bypasses all assignment checks

---

## Updated Files to Modify

### Backend (8 files)
| File | Change |
|------|--------|
| `backend/services/masterPromptBuilder.mjs` | Add 7 new data sources, bump to v4.0 |
| `backend/services/ai/contextBuilder.mjs` | Add AI rules for pain, form, nutrition, goals, consistency |
| `backend/routes/dailyWorkoutFormRoutes.mjs` | Add `/progress-detailed` endpoint + trainer-scoped variant |
| `backend/routes/adminClientRoutes.mjs` | Add `/progress-overview` endpoint for all-clients widget |
| `backend/controllers/aiWorkoutController.mjs` | Pass new context sections to AI provider |
| `backend/migrations/XXXX-add-recovery-fields.cjs` | Add sleep, recovery, stress fields to Users |
| `backend/models/User.mjs` | Add recovery fields |
| `backend/utils/clientAccess.mjs` | Verify ensureClientAccess covers new endpoints |

### Frontend (15 files)
| File | Change |
|------|--------|
| `frontend/src/components/ClientProgressCharts/ClientProgressCharts.tsx` | Add 4 new charts, fix theme, fix 1RM mock data |
| `frontend/src/components/ClientProgressCharts/charts/BodyCompositionChart.tsx` | NEW: dual-axis weight + body fat timeline |
| `frontend/src/components/ClientProgressCharts/charts/StrengthProgressionChart.tsx` | NEW: multi-line exercise 1RM progression |
| `frontend/src/components/ClientProgressCharts/charts/ConsistencyHeatmap.tsx` | NEW: GitHub-style workout calendar |
| `frontend/src/components/ClientProgressCharts/charts/MuscleGroupRadar.tsx` | NEW: muscle group volume balance |
| `frontend/src/components/ClientProgressCharts/charts/VolumeOverTimeChart.tsx` | Theme fix: Crystalline Swan colors |
| `frontend/src/components/ClientProgressCharts/charts/OneRepMaxChart.tsx` | Theme fix + use real data |
| `frontend/src/components/ClientProgressCharts/charts/FormQualityChart.tsx` | Theme fix |
| `frontend/src/components/ClientProgressCharts/ProgressSummaryCards.tsx` | NEW: summary cards (streak, PRs, goals) |
| `frontend/src/components/ClientProgressCharts/types/ClientProgressTypes.ts` | Add new chart data types |
| `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientProgressDashboard.tsx` | Wire 8-chart dashboard into admin client detail |
| `frontend/src/components/DashBoard/Pages/admin-dashboard/AllClientsProgressWidget.tsx` | NEW: admin bird's-eye view |
| `frontend/src/components/TrainerDashboard/ClientProgress/ClientProgressView.tsx` | Integrate ClientProgressCharts for trainers |
| `frontend/src/components/TrainerDashboard/ClientProgress/WorkoutHistoryTable.tsx` | NEW: expandable workout history |
| `frontend/src/components/TrainerDashboard/ClientProgress/TrainerQuickActions.tsx` | NEW: quick-action panel |

---

## Verification Criteria

1. `masterPromptBuilder.mjs` fetches ALL 14+ data sources (was 8)
2. AI workout generation includes pain constraints, form quality rules, nutrition context
3. No hardcoded/mock data in any chart — all from real API
4. All charts use Crystalline Swan palette (zero `#3b82f6` references)
5. 1RM calculated via Epley formula from actual workout log data
6. Body composition chart shows weight + body fat trend over time
7. Consistency heatmap renders last 90 days of workout activity
8. Muscle group radar highlights volume imbalances
9. `npm run build` passes with zero errors
10. WCAG AA: all chart text meets 4.5:1 contrast, all controls 44px touch targets
11. Trainer can view full progress dashboard + workout history for assigned clients only
12. Trainer cannot access non-assigned client data (403 from ensureClientAccess)
13. Admin can view all clients' progress and the all-clients overview widget
14. Workout history table shows expandable exercise details (sets, reps, weight, RPE)
15. Progress summary cards show real-time stats (streak, PRs, goals, frequency)
16. All new endpoints protected by auth + role middleware
17. Trainer quick-action panel: log workout, add note, add pain entry, generate AI plan
