# GEMINI IMPLEMENTATION PROMPT: Client Workout Data & Analytics System

## CONTEXT

You are implementing a comprehensive workout data management and analytics system for **SwanStudios PT**, a NASM-aligned personal training platform with AI-powered coaching and gamification.

**Primary Objective:** Build a system where trainers/admins can enter client workout data, clients can view beautiful analytics and "cool facts" about their training, and the system proactively tracks session renewals.

**Read This First:** `docs/systems/CLIENT-WORKOUT-DATA-SYSTEM-BLUEPRINT.md` (contains complete architecture, wireframes, API specs)

---

## YOUR MISSION

Build **Phase 1** of the Client Workout Data System with these deliverables:

### 1. Backend Components

#### A. RenewalAlert Model & Migration
**File:** `backend/models/RenewalAlert.mjs`
**Migration:** `backend/migrations/20260102000001-create-renewal-alerts.cjs`

Create a Sequelize model to track clients approaching session exhaustion:

```javascript
{
  id: UUID (primary key),
  userId: UUID (foreign key → Users),
  sessionsRemaining: INTEGER,
  lastSessionDate: DATE,
  daysSinceLastSession: INTEGER,
  urgencyScore: INTEGER (1-10),
  status: ENUM ['active', 'contacted', 'renewed', 'dismissed'],
  contactedAt: DATE,
  contactedBy: UUID (foreign key → Users),
  notes: TEXT,
  renewedAt: DATE,
  dismissedAt: DATE
}
```

**Urgency Score Algorithm:**
```javascript
// CRITICAL (10): 0 sessions + 14+ days inactive
// HIGH (7-9): 0-2 sessions + 5-13 days inactive
// MEDIUM (4-6): 3 sessions + 3-7 days inactive
// LOW (1-3): Monitoring

function calculateUrgencyScore(sessionsRemaining, daysSinceLastSession) {
  let score = 0;

  // Sessions component (0-5 points)
  if (sessionsRemaining === 0) score += 5;
  else if (sessionsRemaining === 1) score += 4;
  else if (sessionsRemaining === 2) score += 3;
  else if (sessionsRemaining === 3) score += 2;

  // Inactivity component (0-5 points)
  if (daysSinceLastSession >= 14) score += 5;
  else if (daysSinceLastSession >= 10) score += 4;
  else if (daysSinceLastSession >= 7) score += 3;
  else if (daysSinceLastSession >= 5) score += 2;
  else if (daysSinceLastSession >= 3) score += 1;

  return Math.min(score, 10);
}
```

#### B. Workout Session Controller
**File:** `backend/controllers/workoutSessionController.mjs`

Implement these functions:
- `createWorkoutSession()` - POST /api/workout-sessions
- `getClientWorkoutHistory()` - GET /api/workout-sessions/:userId
- `getWorkoutSessionDetails()` - GET /api/workout-sessions/details/:sessionId
- `updateWorkoutSession()` - PUT /api/workout-sessions/:id
- `deleteWorkoutSession()` - DELETE /api/workout-sessions/:id

**Key Logic for createWorkoutSession:**
1. Validate userId, exerciseIds exist
2. Create WorkoutSession record
3. For each exercise, create WorkoutExercise record
4. For each set in exercise, create Set record
5. Calculate totalWeight, totalReps, totalSets, experiencePoints
6. Update ProgressData aggregate stats
7. Update ClientProgress NASM levels based on exercise categories
8. Check for achievement unlocks (e.g., "100 squats total")
9. Return complete response with XP earned and achievements

#### C. Analytics Controller
**File:** `backend/controllers/analyticsController.mjs`

Implement:
- `getClientAnalyticsSummary()` - GET /api/client/analytics-summary/:userId
  - Returns: exerciseTotals, volumeStats, milestoneStats, nasmProgress, coolFacts, chartData
  - Use eager loading to minimize queries
  - Implement Redis caching (5 min TTL)

- `getExerciseTotals()` - GET /api/client/exercise-totals/:userId
  - Query all WorkoutExercises for user
  - Group by exerciseId
  - Sum reps, sets, weight
  - Return sorted by totalReps DESC

**Cool Facts Generation Logic:**
```javascript
function generateCoolFacts(stats) {
  const facts = [];

  // Volume comparisons
  if (stats.totalWeightLifted >= 40000) {
    facts.push("That's equivalent to lifting a compact car!");
  }

  // Rep comparisons
  const avgPushupsPerYear = 250; // national average
  const yearEquivalent = Math.floor(stats.pushupTotal / avgPushupsPerYear);
  if (yearEquivalent > 1) {
    facts.push(`You've done more pushups than the average person does in ${yearEquivalent} years`);
  }

  // Workout consistency
  if (stats.currentStreak >= 14) {
    facts.push(`${stats.currentStreak} day streak! You're in the top 5% of users 🔥`);
  }

  // NASM progress
  if (stats.nasmProgress.core >= 500) {
    facts.push("Your core strength is at advanced athlete level!");
  }

  return facts.slice(0, 5); // Return top 5
}
```

#### D. Renewal Alert Controller
**File:** `backend/controllers/renewalAlertController.mjs`

Implement:
- `getAllRenewalAlerts()` - GET /api/admin/renewal-alerts
  - Query RenewalAlerts with status='active'
  - Join with Users table for client details
  - Join with Sessions to get last session date
  - Sort by urgencyScore DESC
  - Return grouped by urgency level (critical, high, medium)

- `markAlertContacted()` - POST /api/admin/renewal-alerts/:id/contact
  - Update status to 'contacted'
  - Set contactedAt, contactedBy
  - Add notes

- `dismissAlert()` - POST /api/admin/renewal-alerts/:id/dismiss
  - Update status to 'dismissed'
  - Set dismissedAt

#### E. Routes Registration
**Files:**
- `backend/routes/workoutSessionRoutes.mjs`
- `backend/routes/analyticsRoutes.mjs`
- `backend/routes/renewalAlertRoutes.mjs`
- `backend/core/routes.mjs` (register new routes)

Follow existing route patterns in the codebase. Use JWT auth middleware.

#### F. Scheduled Jobs
**File:** `backend/jobs/dailyRenewalAlertCheck.mjs`

Create a cron job (runs daily at 6am):
1. Query all Users with role='client'
2. For each client:
   - Count availableSessions
   - Find last Session.sessionDate where userId=client.id
   - Calculate daysSinceLastSession
   - Calculate urgencyScore
   - If urgencyScore >= 4, create/update RenewalAlert
3. Delete RenewalAlerts for clients with urgencyScore < 4

Register this job in your existing cron setup.

---

### 2. Frontend Components

#### A. Admin Workout Data Entry Component
**File:** `frontend/src/components/DashBoard/Pages/admin-dashboard/WorkoutDataEntry.tsx`

Build a comprehensive workout entry form with:

**Features:**
- Client selector (dropdown with search/filter)
- Display recent 3 workouts for context
- Exercise search/add from Exercise library
- Dynamic set/rep/weight entry grid
- RPE (Rate of Perceived Exertion) slider (1-10)
- Form quality score slider (1-10)
- Session duration and intensity inputs
- Trainer notes textarea
- Auto-save drafts to localStorage
- Responsive mobile layout

**TypeScript Interfaces:**
```typescript
interface WorkoutDataEntryProps {
  onWorkoutSaved?: (workoutId: string) => void;
}

interface WorkoutDataEntryState {
  selectedClient: User | null;
  workoutDate: Date;
  exercises: WorkoutExerciseEntry[];
  duration: number; // minutes
  intensity: number; // 1-10
  trainerNotes: string;
  isDraft: boolean;
  autoSaveStatus: 'saved' | 'saving' | 'error';
}

interface WorkoutExerciseEntry {
  exerciseId: string;
  exercise: Exercise; // from library
  sets: SetEntry[];
  notes: string;
  orderInWorkout: number;
}

interface SetEntry {
  setNumber: number;
  reps: number;
  weight: number;
  rpe: number; // 1-10
  formQualityScore: number; // 1-10
  restSeconds: number;
}
```

**UI Layout (match wireframe in blueprint):**
```tsx
<div className="workout-data-entry">
  <div className="header">
    <h2>Workout Data Entry</h2>
    <div className="actions">
      <GlowButton theme="cosmic" onClick={handleSave}>Save</GlowButton>
    </div>
  </div>

  <div className="client-selection">
    <Autocomplete
      options={clients}
      value={selectedClient}
      onChange={handleClientChange}
      renderOption={(client) => (
        <div className="client-option">
          <Avatar src={client.profilePictureUrl} />
          <span>{client.name}</span>
        </div>
      )}
    />
  </div>

  <div className="recent-workouts">
    {/* Show 3 recent workouts */}
  </div>

  <div className="exercise-search">
    <Autocomplete
      options={exercises}
      onChange={handleAddExercise}
      placeholder="Search exercises..."
    />
  </div>

  <div className="exercises-list">
    {workoutExercises.map((exercise, index) => (
      <ExerciseCard
        key={exercise.exerciseId}
        exercise={exercise}
        onUpdate={handleUpdateExercise}
        onRemove={handleRemoveExercise}
      />
    ))}
  </div>

  <div className="session-summary">
    <TextField
      label="Duration (min)"
      type="number"
      value={duration}
      onChange={handleDurationChange}
    />
    <Slider
      label="Intensity"
      min={1}
      max={10}
      value={intensity}
      onChange={handleIntensityChange}
    />
    <div className="calculated-stats">
      <span>Total Volume: {totalVolume} lbs</span>
      <span>Total Reps: {totalReps}</span>
    </div>
  </div>

  <TextField
    label="Trainer Notes"
    multiline
    rows={3}
    value={trainerNotes}
    onChange={handleNotesChange}
  />

  <div className="form-actions">
    <GlowButton theme="purple" variant="outline" onClick={handleSaveDraft}>
      Save Draft
    </GlowButton>
    <GlowButton theme="emerald" onClick={handleCompleteWorkout}>
      Save & Complete Workout
    </GlowButton>
  </div>
</div>
```

**Key Behaviors:**
- Auto-save to localStorage every 30 seconds
- Validate all inputs before submission
- Show toast notifications for success/error
- Calculate total volume and reps in real-time
- Disable submit while saving
- Clear form after successful save
- Optimistic UI updates

#### B. ExerciseCard Sub-Component
**File:** `frontend/src/components/DashBoard/Pages/admin-dashboard/WorkoutDataEntry/ExerciseCard.tsx`

Reusable card for each exercise in the workout:

```tsx
<Card className="exercise-card">
  <CardHeader>
    <h3>{exercise.name}</h3>
    <IconButton onClick={onRemove}>
      <CloseIcon />
    </IconButton>
  </CardHeader>
  <CardContent>
    <Chip label={exercise.exerciseType} />
    <div className="muscles">
      Primary: {exercise.primaryMuscles.join(', ')}
    </div>

    <div className="sets-grid">
      {sets.map((set, idx) => (
        <div key={idx} className="set-row">
          <TextField
            label="Lbs"
            type="number"
            value={set.weight}
            onChange={(e) => handleSetChange(idx, 'weight', e.target.value)}
          />
          <TextField
            label="Reps"
            type="number"
            value={set.reps}
            onChange={(e) => handleSetChange(idx, 'reps', e.target.value)}
          />
          <Slider
            label="RPE"
            min={1}
            max={10}
            value={set.rpe}
            onChange={(value) => handleSetChange(idx, 'rpe', value)}
          />
          <Slider
            label="Form"
            min={1}
            max={10}
            value={set.formQualityScore}
            onChange={(value) => handleSetChange(idx, 'formQualityScore', value)}
          />
        </div>
      ))}
    </div>

    <GlowButton theme="cosmic" variant="outline" onClick={handleAddSet}>
      + Add Set
    </GlowButton>

    <TextField
      label="Exercise Notes"
      value={exercise.notes}
      onChange={handleNotesChange}
      placeholder="e.g., Great depth, knees tracking well"
    />
  </CardContent>
</Card>
```

#### C. Stats Ticker Bar Component
**File:** `frontend/src/components/DashBoard/Pages/client-dashboard/StatsTickerBar.tsx`

Animated horizontal ticker showing client's workout stats:

**Features:**
- Auto-rotates through stats every 3 seconds
- Smooth fade in/out animations (Framer Motion)
- Pause on hover
- Click to open detailed stats modal
- Responsive (stacks vertically on mobile)
- Cosmic gradient background with glow effects

**TypeScript Interfaces:**
```typescript
interface StatsTickerBarProps {
  userId: string;
}

interface TickerStat {
  icon: string;
  label: string;
  value: string | number;
  suffix?: string;
  category: 'exercise' | 'volume' | 'milestone' | 'nasm' | 'coolFact';
}
```

**Implementation:**
```tsx
const StatsTickerBar: React.FC<StatsTickerBarProps> = ({ userId }) => {
  const [currentStatIndex, setCurrentStatIndex] = useState(0);
  const [stats, setStats] = useState<TickerStat[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await authAxios.get(`/api/client/analytics-summary/${userId}`);
        const data = response.data;

        const formattedStats: TickerStat[] = [
          // Exercise totals (top 5)
          ...data.exerciseTotals.slice(0, 5).map(ex => ({
            icon: getExerciseIcon(ex.exerciseName),
            label: ex.exerciseName.toUpperCase(),
            value: ex.totalReps,
            suffix: 'TOTAL REPS',
            category: 'exercise' as const
          })),

          // Volume stats
          {
            icon: '🏋️',
            label: 'TOTAL WEIGHT LIFTED',
            value: data.volumeStats.totalWeightLifted.toLocaleString(),
            suffix: 'LBS',
            category: 'volume'
          },
          {
            icon: '💪',
            label: 'TOTAL REPS COMPLETED',
            value: data.volumeStats.totalReps.toLocaleString(),
            suffix: '',
            category: 'volume'
          },

          // Milestone stats
          {
            icon: '🔥',
            label: 'CURRENT STREAK',
            value: data.milestoneStats.currentStreak,
            suffix: 'DAYS',
            category: 'milestone'
          },
          {
            icon: '🏆',
            label: 'WORKOUTS THIS YEAR',
            value: data.volumeStats.totalWorkouts,
            suffix: '',
            category: 'milestone'
          },
          {
            icon: '⚡',
            label: 'STRENGTH LEVEL',
            value: data.milestoneStats.level,
            suffix: '',
            category: 'milestone'
          },

          // NASM progress (top 3 categories)
          {
            icon: '🎯',
            label: 'CORE STRENGTH',
            value: `${data.nasmProgress.core}/1000`,
            suffix: 'LEVEL',
            category: 'nasm'
          },

          // Cool facts
          ...data.coolFacts.map(fact => ({
            icon: '✨',
            label: fact,
            value: '',
            suffix: '',
            category: 'coolFact' as const
          }))
        ];

        setStats(formattedStats);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  // Auto-rotate stats
  useEffect(() => {
    if (isPaused || stats.length === 0) return;

    const interval = setInterval(() => {
      setCurrentStatIndex((prev) => (prev + 1) % stats.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused, stats.length]);

  if (isLoading) {
    return <div className="stats-ticker-loading">Loading your stats...</div>;
  }

  if (stats.length === 0) {
    return <div className="stats-ticker-empty">No workout data yet. Start training!</div>;
  }

  const currentStat = stats[currentStatIndex];

  return (
    <div
      className="stats-ticker-bar"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={handleOpenDetailsModal}
    >
      <div className="ticker-background" />
      <div className="ticker-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStatIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="stat-display"
          >
            <span className="stat-icon">{currentStat.icon}</span>
            {currentStat.value && (
              <span className="stat-value">{currentStat.value}</span>
            )}
            <span className="stat-label">{currentStat.label}</span>
            {currentStat.suffix && (
              <span className="stat-suffix">{currentStat.suffix}</span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="ticker-indicator">
        {currentStatIndex + 1} / {stats.length}
      </div>
    </div>
  );
};
```

**Styling (SwanStudios Brand):**
```css
.stats-ticker-bar {
  position: relative;
  width: 100%;
  height: 80px;
  background: linear-gradient(
    90deg,
    rgba(139, 92, 246, 0.2) 0%,
    rgba(6, 182, 212, 0.2) 100%
  );
  border-radius: 12px;
  border: 1px solid rgba(6, 182, 212, 0.3);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stats-ticker-bar:hover {
  border-color: rgba(6, 182, 212, 0.6);
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
}

.ticker-background {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(139, 92, 246, 0.1) 0%,
    transparent 70%
  );
  animation: pulse 3s ease-in-out infinite;
}

.ticker-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  padding: 0 24px;
}

.stat-icon {
  font-size: 32px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  color: #06B6D4;
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
}

.stat-label {
  font-size: 16px;
  font-weight: 600;
  color: #F8FAFC;
  letter-spacing: 1px;
}

.stat-suffix {
  font-size: 14px;
  color: rgba(248, 250, 252, 0.7);
}

.ticker-indicator {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 12px;
  color: rgba(248, 250, 252, 0.5);
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .stats-ticker-bar {
    height: 100px;
  }

  .ticker-content {
    flex-direction: column;
    gap: 4px;
  }

  .stat-value {
    font-size: 24px;
  }

  .stat-label {
    font-size: 14px;
  }
}
```

#### D. Workout Progress Charts Component
**File:** `frontend/src/components/DashBoard/Pages/client-dashboard/WorkoutProgressCharts.tsx`

Container for 4 chart types:

```tsx
const WorkoutProgressCharts: React.FC<{ userId: string }> = ({ userId }) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('6M');

  useEffect(() => {
    fetchChartData(userId, timeRange).then(setChartData);
  }, [userId, timeRange]);

  return (
    <div className="workout-progress-charts">
      <div className="chart-controls">
        <GlowButton
          theme={timeRange === '1M' ? 'cosmic' : 'purple'}
          variant={timeRange === '1M' ? 'solid' : 'outline'}
          onClick={() => setTimeRange('1M')}
        >
          1 Month
        </GlowButton>
        {/* Repeat for 3M, 6M, 1Y */}
      </div>

      <div className="charts-grid">
        <VolumeOverTimeChart data={chartData?.volumeData} />
        <ExerciseFrequencyHeatmap data={chartData?.frequencyData} />
        <NASMCategoryRadar data={chartData?.nasmData} />
        <TopExercisesBarChart data={chartData?.topExercises} />
      </div>
    </div>
  );
};
```

#### E. Volume Over Time Chart
**File:** `frontend/src/components/DashBoard/Pages/client-dashboard/VolumeOverTimeChart.tsx`

Line chart using Recharts:

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const VolumeOverTimeChart: React.FC<{ data: VolumeData[] }> = ({ data }) => {
  return (
    <div className="volume-chart-container">
      <h3>Total Volume Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="date"
            stroke="#94A3B8"
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis
            stroke="#94A3B8"
            tickFormatter={(value) => `${value} lbs`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E293B',
              border: '1px solid #06B6D4',
              borderRadius: '8px'
            }}
            formatter={(value) => [`${value} lbs`, 'Volume']}
          />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="#06B6D4"
            strokeWidth={3}
            dot={{ fill: '#06B6D4', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

#### F. Exercise Frequency Heatmap
**File:** `frontend/src/components/DashBoard/Pages/client-dashboard/ExerciseFrequencyHeatmap.tsx`

GitHub-style contribution heatmap:

```tsx
const ExerciseFrequencyHeatmap: React.FC<{ data: FrequencyData[] }> = ({ data }) => {
  // data structure: [{ date: '2025-12-01', workoutCount: 2 }, ...]

  const getColorIntensity = (count: number) => {
    if (count === 0) return 'rgba(15, 23, 42, 0.5)'; // Dark gray
    if (count === 1) return 'rgba(6, 182, 212, 0.3)'; // Light cyan
    if (count === 2) return 'rgba(6, 182, 212, 0.6)'; // Medium cyan
    return 'rgba(6, 182, 212, 1)'; // Full cyan
  };

  return (
    <div className="frequency-heatmap">
      <h3>Workout Frequency (Last 12 Weeks)</h3>
      <div className="heatmap-grid">
        {data.map((day) => (
          <div
            key={day.date}
            className="heatmap-cell"
            style={{ backgroundColor: getColorIntensity(day.workoutCount) }}
            title={`${day.date}: ${day.workoutCount} workout${day.workoutCount !== 1 ? 's' : ''}`}
          />
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        <div className="legend-squares">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="legend-square"
              style={{ backgroundColor: getColorIntensity(i) }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
};
```

**CSS:**
```css
.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr); /* 7 days per week */
  grid-auto-rows: 20px;
  gap: 4px;
}

.heatmap-cell {
  border-radius: 3px;
  transition: transform 0.2s;
}

.heatmap-cell:hover {
  transform: scale(1.2);
}
```

#### G. Top Exercises Bar Chart
**File:** `frontend/src/components/DashBoard/Pages/client-dashboard/TopExercisesBarChart.tsx`

Horizontal bar chart of top 10 exercises:

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TopExercisesBarChart: React.FC<{ data: ExerciseTotal[] }> = ({ data }) => {
  // data: [{ exerciseName: 'Pushups', totalReps: 1247, category: 'calisthenics' }, ...]

  const getCategoryColor = (category: string) => {
    const colors = {
      'core': '#8B5CF6',      // Purple
      'balance': '#06B6D4',   // Cyan
      'stability': '#10B981', // Emerald
      'calisthenics': '#F59E0B', // Amber
      'compound': '#EF4444',  // Red
      'isolation': '#EC4899'  // Pink
    };
    return colors[category] || '#94A3B8';
  };

  return (
    <div className="top-exercises-chart">
      <h3>Top 10 Exercises by Total Reps</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data.slice(0, 10)}
          layout="horizontal"
          margin={{ left: 100 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis type="number" stroke="#94A3B8" />
          <YAxis
            type="category"
            dataKey="exerciseName"
            stroke="#94A3B8"
            width={90}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E293B',
              border: '1px solid #06B6D4',
              borderRadius: '8px'
            }}
          />
          <Bar
            dataKey="totalReps"
            fill="#06B6D4"
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

#### H. Renewal Alert Widget (Admin)
**File:** `frontend/src/components/DashBoard/Pages/admin-dashboard/RenewalAlertWidget.tsx`

Display clients needing renewal outreach:

```tsx
const RenewalAlertWidget: React.FC = () => {
  const [alerts, setAlerts] = useState<RenewalAlert[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');

  useEffect(() => {
    fetchRenewalAlerts().then(setAlerts);
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'critical') return alert.urgencyScore >= 9;
    if (filter === 'high') return alert.urgencyScore >= 7 && alert.urgencyScore < 9;
    if (filter === 'medium') return alert.urgencyScore >= 4 && alert.urgencyScore < 7;
    return true;
  });

  const getUrgencyBadge = (score: number) => {
    if (score >= 9) return { color: 'red', label: 'CRITICAL' };
    if (score >= 7) return { color: 'orange', label: 'HIGH' };
    if (score >= 4) return { color: 'yellow', label: 'MEDIUM' };
    return { color: 'gray', label: 'LOW' };
  };

  return (
    <Card className="renewal-alert-widget">
      <CardHeader>
        <h2>🚨 Session Renewal Alerts</h2>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Alerts</option>
          <option value="critical">Critical Only</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
        </Select>
      </CardHeader>

      <CardContent>
        {filteredAlerts.length === 0 ? (
          <p>No renewal alerts at this time.</p>
        ) : (
          <div className="alerts-list">
            {filteredAlerts.map(alert => {
              const badge = getUrgencyBadge(alert.urgencyScore);
              return (
                <div key={alert.id} className="alert-item">
                  <div className="alert-header">
                    <Avatar src={alert.user.profilePictureUrl} />
                    <div className="alert-details">
                      <h4>{alert.user.name}</h4>
                      <span className={`urgency-badge urgency-${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  <div className="alert-stats">
                    <span>{alert.sessionsRemaining} sessions remaining</span>
                    <span>{alert.daysSinceLastSession} days inactive</span>
                    <span>Score: {alert.urgencyScore}/10</span>
                  </div>

                  <div className="alert-actions">
                    <GlowButton
                      theme="cosmic"
                      size="small"
                      onClick={() => handleMarkContacted(alert.id)}
                    >
                      Mark Contacted
                    </GlowButton>
                    <GlowButton
                      theme="emerald"
                      size="small"
                      onClick={() => handleBookSession(alert.user.id)}
                    >
                      Book Session
                    </GlowButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

#### I. Integration into Dashboards

**Admin Dashboard:** `frontend/src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-view.tsx`

Add two new tabs:
1. "Workout Entry" tab containing `<WorkoutDataEntry />`
2. Add `<RenewalAlertWidget />` to Analytics tab

```tsx
// In admin-dashboard-view.tsx

const tabs = [
  'Schedule',
  'Analytics',
  'Users',
  'Trainers',
  'Workout Entry', // NEW
  'Clients',
  // ... other tabs
];

// In tab content rendering:
{activeTab === 'Workout Entry' && (
  <Suspense fallback={<LoadingSpinner />}>
    <WorkoutDataEntry />
  </Suspense>
)}

{activeTab === 'Analytics' && (
  <div className="analytics-grid">
    <RevenueAnalyticsPanel />
    <UserAnalyticsPanel />
    <RenewalAlertWidget /> {/* NEW */}
    <AIMonitoringPanel />
    {/* ... other panels */}
  </div>
)}
```

**Client Dashboard:** `frontend/src/components/DashBoard/Pages/client-dashboard/client-dashboard-view.tsx`

Add ticker bar above main content and charts in main grid:

```tsx
// In client-dashboard-view.tsx

return (
  <div className="client-dashboard">
    <DashboardHeader user={user} />

    <StatsTickerBar userId={user.id} /> {/* NEW - Place here */}

    <div className="dashboard-content">
      <div className="stats-grid">
        {/* Existing stats components */}
      </div>

      <WorkoutProgressCharts userId={user.id} /> {/* NEW */}

      {/* Existing content */}
    </div>
  </div>
);
```

---

### 3. Integration & Tab Analysis

**DO NOT DUPLICATE EXISTING FEATURES:**

Based on the blueprint, here's what already exists and where to integrate:

#### Admin Dashboard Tabs (existing):
- ✅ **Schedule** - Session booking/management (keep as-is)
- ✅ **Analytics** - Revenue, user metrics, AI monitoring (ADD renewal widget here)
- ✅ **Users** - User management (keep as-is)
- ✅ **Trainers** - Trainer management (keep as-is)
- ⭐ **Workout Entry** - NEW TAB (create this)
- ✅ **Clients** - Client management (keep as-is)
- ✅ **Packages** - Package management (keep as-is)
- ✅ **Content** - Content moderation (keep as-is)

#### Client Dashboard (existing):
- ✅ Main view with stats, achievements, recommendations
- ✅ Schedule tab (UnifiedCalendar)
- ⭐ ADD: StatsTickerBar component (above main content)
- ⭐ ADD: WorkoutProgressCharts component (in main content area)

#### Trainer Dashboard (existing - framework only):
- ✅ TrainerSessions.tsx (scaffold)
- ✅ TrainerClients.tsx (scaffold)
- ⭐ ADD: TrainerWorkoutEntry.tsx (reuse admin component with trainer-specific filtering)
- ⭐ ADD: TrainerRenewalWidget.tsx (filtered to trainer's clients only)

**IMPORTANT:** Do NOT create duplicate scheduling, user management, or session booking features. Integrate workout data entry as a NEW tab. Integrate renewal alerts into EXISTING Analytics tab.

---

## TECHNICAL REQUIREMENTS (2026 Best Practices)

### 1. TypeScript
- Use strict mode
- Define interfaces for ALL data structures
- Use generics for reusable components
- No `any` types (use `unknown` with type guards if needed)
- Use branded types for UUIDs

### 2. React Patterns
- Functional components with hooks
- Use React.memo() for expensive components
- Use useCallback() for handlers passed to children
- Use useMemo() for expensive calculations
- Implement proper loading/error states
- Use Suspense for lazy-loaded components

### 3. State Management
- Use React Context for global state (user, auth)
- Use local state for component-specific data
- Implement optimistic UI updates
- Use react-query or SWR for server state caching

### 4. Performance
- Implement Redis caching for analytics (5 min TTL)
- Use database indexes on userId, exerciseId, sessionDate
- Lazy load chart components
- Debounce search inputs
- Virtualize long lists (if >100 items)

### 5. Error Handling
- Use try/catch in all async functions
- Show user-friendly error messages (toast notifications)
- Log errors to console for debugging
- Implement error boundaries for React components

### 6. Accessibility (WCAG AA)
- Use semantic HTML
- Add ARIA labels to interactive elements
- Ensure keyboard navigation works
- Maintain 4.5:1 contrast ratio for text
- Add focus indicators

### 7. Security
- Validate all inputs on backend
- Use parameterized queries (Sequelize handles this)
- Implement rate limiting on API endpoints
- Sanitize user-generated content (notes fields)
- Use HTTPS-only cookies for auth

### 8. Testing (Not required for Phase 1, but document test strategy)
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for workout entry flow
- Snapshot tests for UI components

---

## SWANSTUDIOS BRAND GUIDELINES

### Colors (Use these exact values)
```css
--cosmic-purple: #8B5CF6;
--neon-cyan: #06B6D4;
--emerald: #10B981;
--deep-space: #0F172A;
--slate-900: #0F172A;
--slate-800: #1E293B;
--slate-700: #334155;
```

### Gradients
```css
/* Cosmic gradient (primary) */
background: linear-gradient(90deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%);

/* Neon glow effect */
box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);

/* Glass morphism */
background: rgba(15, 23, 42, 0.8);
backdrop-filter: blur(12px);
border: 1px solid rgba(6, 182, 212, 0.3);
```

### Typography
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Headers */
font-weight: 700;
letter-spacing: -0.025em;

/* Stats (monospace for numbers) */
font-family: 'Courier New', Courier, monospace;
```

### GlowButton Usage
```tsx
<GlowButton theme="cosmic" onClick={handleSave}>Save</GlowButton>
<GlowButton theme="emerald" onClick={handleSubmit}>Submit</GlowButton>
<GlowButton theme="purple" variant="outline" onClick={handleCancel}>Cancel</GlowButton>
```

**Theme Options:**
- `cosmic` - Purple/cyan gradient (primary actions)
- `emerald` - Green (success, complete)
- `purple` - Solid purple (secondary)

**Variants:**
- `solid` (default) - Full color background
- `outline` - Transparent with colored border

### Animation Standards
- Transition duration: 300-500ms
- Easing: `ease-in-out` or `cubic-bezier(0.4, 0, 0.2, 1)`
- Use Framer Motion for complex animations
- Respect `prefers-reduced-motion` media query

---

## DELIVERABLES CHECKLIST

### Backend Files
- [ ] `backend/models/RenewalAlert.mjs`
- [ ] `backend/migrations/20260102000001-create-renewal-alerts.cjs`
- [ ] `backend/controllers/workoutSessionController.mjs`
- [ ] `backend/controllers/analyticsController.mjs`
- [ ] `backend/controllers/renewalAlertController.mjs`
- [ ] `backend/routes/workoutSessionRoutes.mjs`
- [ ] `backend/routes/analyticsRoutes.mjs`
- [ ] `backend/routes/renewalAlertRoutes.mjs`
- [ ] `backend/core/routes.mjs` (update to register new routes)
- [ ] `backend/jobs/dailyRenewalAlertCheck.mjs`
- [ ] `backend/services/analyticsService.mjs`
- [ ] `backend/services/renewalAlertService.mjs`

### Frontend Files
- [ ] `frontend/src/components/DashBoard/Pages/admin-dashboard/WorkoutDataEntry.tsx`
- [ ] `frontend/src/components/DashBoard/Pages/admin-dashboard/WorkoutDataEntry/ExerciseCard.tsx`
- [ ] `frontend/src/components/DashBoard/Pages/admin-dashboard/RenewalAlertWidget.tsx`
- [ ] `frontend/src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-view.tsx` (update)
- [ ] `frontend/src/components/DashBoard/Pages/client-dashboard/StatsTickerBar.tsx`
- [ ] `frontend/src/components/DashBoard/Pages/client-dashboard/WorkoutProgressCharts.tsx`
- [ ] `frontend/src/components/DashBoard/Pages/client-dashboard/VolumeOverTimeChart.tsx`
- [ ] `frontend/src/components/DashBoard/Pages/client-dashboard/ExerciseFrequencyHeatmap.tsx`
- [ ] `frontend/src/components/DashBoard/Pages/client-dashboard/TopExercisesBarChart.tsx`
- [ ] `frontend/src/components/DashBoard/Pages/client-dashboard/client-dashboard-view.tsx` (update)

### Documentation
- [ ] Update API documentation with new endpoints
- [ ] Document component props and usage
- [ ] Add inline code comments for complex logic
- [ ] Create migration instructions for database changes

---

## TESTING STRATEGY

### Manual Testing Checklist
1. **Workout Entry Flow:**
   - Select client
   - Add 3 different exercises
   - Enter sets/reps/weight for each
   - Save draft (verify localStorage)
   - Complete workout (verify API call)
   - Check database records created

2. **Client Dashboard:**
   - Load dashboard as client
   - Verify ticker displays and rotates stats
   - Verify all 4 charts render
   - Test time range filters (1M, 3M, 6M, 1Y)
   - Test responsive design on mobile

3. **Renewal Alerts:**
   - Manually create test clients with 0-3 sessions
   - Run renewal check job
   - Verify alerts appear in admin dashboard
   - Test "Mark Contacted" action
   - Test urgency score calculation

### API Testing (Use Postman or curl)
```bash
# Create workout session
POST /api/workout-sessions
{
  "userId": "...",
  "exercises": [...]
}

# Get analytics summary
GET /api/client/analytics-summary/:userId

# Get renewal alerts
GET /api/admin/renewal-alerts?status=active
```

---

## ENHANCEMENT OPPORTUNITIES (Bonus Points)

If you finish early, consider these enhancements:

1. **Workout Templates:**
   - Save common workout structures as templates
   - Quick load template when entering data

2. **Exercise Video Integration:**
   - Display exercise.videoUrl in ExerciseCard
   - Embedded video player for form reference

3. **Mobile Optimizations:**
   - Swipe gestures for ticker rotation
   - Mobile-specific input types (number pad)

4. **Real-time Updates:**
   - WebSocket notifications when workout is logged
   - Live update client dashboard without refresh

5. **Export Feature:**
   - Export workout history to CSV/PDF
   - Share progress charts as images

---

## QUESTIONS TO ASK IF BLOCKED

If you encounter any ambiguity or need clarification:

1. **Database Schema:** "Should I add any additional indexes beyond userId, exerciseId?"
2. **Caching Strategy:** "Should analytics cache be per-user or global aggregates?"
3. **Chart Performance:** "How many data points should I limit charts to for performance?"
4. **Mobile UX:** "Should ticker be swipeable on mobile or auto-rotate only?"
5. **Permissions:** "Can trainers enter workout data for ANY client or only their assigned clients?"

---

## FINAL NOTES

**Code Quality Expectations:**
- Clean, readable code with proper spacing
- Descriptive variable/function names
- No console.log() in production code (use proper logging)
- Follow existing codebase patterns
- Consistent formatting (Prettier if available)

**Git Commit Strategy:**
- Make small, focused commits
- Use descriptive commit messages
- Commit backend changes separately from frontend
- Test before each commit

**Collaboration Protocol:**
- When done, notify for code review
- Document any deviations from this prompt
- List any features not completed
- Suggest future improvements

---

**READY TO START?**

You have all the context you need. Refer to:
- `docs/systems/CLIENT-WORKOUT-DATA-SYSTEM-BLUEPRINT.md` (architecture reference)
- Existing models in `backend/models/` (follow patterns)
- Existing components in `frontend/src/components/` (match styling)

Build this system with excellence. The users (trainers, clients, admins) are counting on you to deliver a polished, performant, and delightful experience.

**Let's build something amazing! 🚀**
