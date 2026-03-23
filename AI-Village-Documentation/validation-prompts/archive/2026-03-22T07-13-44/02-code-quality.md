# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 62.9s
> **Files:** backend/controllers/chartDataController.mjs, frontend/src/components/Charts/ExerciseHistoryChart.tsx, frontend/src/components/Charts/charts/live/WorkoutFrequencyBar.tsx, frontend/src/components/Charts/charts/live/WeightProgressionLive.tsx, frontend/src/components/Charts/charts/live/MuscleGroupFocusRadar.tsx, frontend/src/components/Charts/charts/live/MacroSplitDonut.tsx, frontend/src/components/Charts/charts/live/CardioEnduranceLine.tsx, frontend/src/components/Charts/charts/live/SessionFrequencyArea.tsx, frontend/src/components/Charts/charts/live/BodyFatTrendLine.tsx, frontend/src/components/Charts/charts/live/MuscleRecoveryHeatmap.tsx, frontend/src/components/Charts/charts/live/RPEByExerciseScatter.tsx, frontend/src/components/ClientProgressCharts/ClientAnalyticsPanel.tsx
> **Generated:** 3/22/2026, 12:13:44 AM

---

# Code Review: SwanStudios Chart System

## CRITICAL Issues

### 1. **SQL Injection Vulnerability in `safeQuery`**
**File:** `backend/controllers/chartDataController.mjs`  
**Location:** Lines 18-23

```mjs
const safeQuery = async (sequelize, sql, replacements) => {
  try {
    const [rows] = await sequelize.query(sql, { replacements });
    return rows || [];
  } catch { return []; }
};
```

**Problems:**
- **Silent error swallowing** — returns empty array on ANY error (network, auth, SQL syntax)
- **No error logging** — debugging impossible in production
- **No validation** of `replacements` parameter

**Fix:**
```mjs
const safeQuery = async (sequelize, sql, replacements, context = 'query') => {
  try {
    const [rows] = await sequelize.query(sql, { 
      replacements,
      type: sequelize.QueryTypes.SELECT 
    });
    return rows || [];
  } catch (error) {
    console.error(`[${context}] Query failed:`, error.message, { sql, replacements });
    throw new Error(`Database query failed: ${error.message}`);
  }
};
```

**Rating:** **CRITICAL**

---

### 2. **Missing Authentication/Authorization Checks**
**File:** `backend/controllers/chartDataController.mjs`  
**Location:** All endpoint functions

```mjs
export async function getWorkoutFrequencyChart(req, res) {
  try {
    const { userId } = req.params; // ❌ No verification that req.user.id === userId
```

**Problems:**
- Any authenticated user can access ANY user's data via `/api/analytics/123/chart-*`
- No role-based access control (trainer vs client)
- GDPR/HIPAA violation risk

**Fix:**
```mjs
export async function getWorkoutFrequencyChart(req, res) {
  try {
    const { userId } = req.params;
    const requesterId = req.user?.id;
    
    // Verify authorization
    if (!requesterId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    // Allow access if: user is viewing own data OR user is assigned trainer
    const isAuthorized = 
      String(requesterId) === String(userId) ||
      await isTrainerForClient(requesterId, userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    // ... rest of logic
  }
}
```

**Rating:** **CRITICAL**

---

### 3. **Type Safety Violations — `any` Usage**
**File:** Multiple Victory chart files  
**Location:** All `labels` callbacks

```tsx
labels={({ datum }: any) => `${datum.y} workouts`}
```

**Problems:**
- Defeats TypeScript's purpose
- No autocomplete/IntelliSense
- Runtime errors if Victory changes API

**Fix:**
```tsx
// Create proper type
interface VictoryDatum {
  x: string | number;
  y: number;
  [key: string]: unknown;
}

// Use in all charts
labels={({ datum }: { datum: VictoryDatum }) => `${datum.y} workouts`}
```

**Rating:** **CRITICAL** (TypeScript best practice violation)

---

## HIGH Priority Issues

### 4. **Unvalidated User Input in SQL Queries**
**File:** `backend/controllers/chartDataController.mjs`  
**Location:** `getCardioEnduranceChart` (lines 132-165)

```mjs
WHERE ws."userId" = :userId AND ws.status = 'completed'
  AND (
    LOWER(e.name) LIKE '%running%' OR LOWER(e.name) LIKE '%run%'
    // ... 8 more LIKE clauses
  )
```

**Problems:**
- Hardcoded exercise name matching is brittle
- Will break with typos ("Runing" vs "Running")
- Should use `e."bodyPartCategory" = 'cardio'` or exercise tags

**Fix:**
```mjs
// Add to Exercises table migration
ALTER TABLE "Exercises" ADD COLUMN "isCardio" BOOLEAN DEFAULT FALSE;

// Update query
WHERE ws."userId" = :userId 
  AND ws.status = 'completed'
  AND (e."isCardio" = TRUE OR e."bodyPartCategory" = 'cardio')
```

**Rating:** **HIGH**

---

### 5. **Missing Error Boundaries**
**File:** `frontend/src/components/ClientProgressCharts/ClientAnalyticsPanel.tsx`  
**Location:** Lines 70-110

```tsx
<Suspense fallback={skeleton}>
  <WorkoutFrequencyBar userId={userId} />
</Suspense>
```

**Problems:**
- If ANY chart throws during render, entire panel crashes
- No user-facing error message
- No retry mechanism

**Fix:**
```tsx
// Create ChartErrorBoundary.tsx
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; chartName: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.chartName}] Chart error:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ChartCard>
          <ErrorText>Failed to load {this.props.chartName}</ErrorText>
          <RetryButton onClick={() => this.setState({ hasError: false })}>
            Retry
          </RetryButton>
        </ChartCard>
      );
    }
    return this.props.children;
  }
}

// Usage
<ChartErrorBoundary chartName="Workout Frequency">
  <Suspense fallback={skeleton}>
    <WorkoutFrequencyBar userId={userId} />
  </Suspense>
</ChartErrorBoundary>
```

**Rating:** **HIGH**

---

### 6. **Performance: Unnecessary Re-renders**
**File:** `frontend/src/components/Charts/ExerciseHistoryChart.tsx`  
**Location:** Lines 85-95

```tsx
useEffect(() => {
  setCursor(null);
  setHasMore(true);
  setExercises([]);
  fetchExercises(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [userId, muscleFilter, sort]);
```

**Problems:**
- Disabling exhaustive-deps is a red flag
- `fetchExercises` recreated on every render (not in deps)
- Should use `useCallback` with proper deps

**Fix:**
```tsx
const fetchExercises = useCallback(async (append = false) => {
  // ... existing logic
}, [userId, muscleFilter, sort]); // ✅ Now stable

useEffect(() => {
  setCursor(null);
  setHasMore(true);
  setExercises([]);
  fetchExercises(false);
}, [fetchExercises]); // ✅ Proper dependency
```

**Rating:** **HIGH**

---

### 7. **Inline Object Creation in Render**
**File:** Multiple Victory chart files  
**Location:** All `style` props

```tsx
<VictoryBar
  style={{ data: { fill: CHART_COLORS.iceWing } }} // ❌ New object every render
/>
```

**Problems:**
- Causes Victory to re-render even when data unchanged
- Performance degradation with multiple charts

**Fix:**
```tsx
// At component top level
const BAR_STYLE = {
  data: { fill: CHART_COLORS.iceWing }
};

// In JSX
<VictoryBar style={BAR_STYLE} />
```

**Rating:** **HIGH**

---

## MEDIUM Priority Issues

### 8. **Hardcoded Theme Values**
**File:** `frontend/src/components/Charts/ExerciseHistoryChart.tsx`  
**Location:** Lines 250-350 (styled components)

```tsx
const Card = styled.div`
  background: ${({ theme }) => theme?.colors?.surface || '#1A1A24'}; // ❌ Fallback doesn't match theme
  border: 1px solid rgba(80, 160, 240, 0.15); // ❌ Hardcoded Ice Wing
```

**Problems:**
- Fallback `#1A1A24` is old Galaxy-Swan theme (retired)
- Should use Royal Depth `#003080`
- Hardcoded rgba values should use theme tokens

**Fix:**
```tsx
const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.iceWingAlpha15};
  // ... rest
`;

// In theme.ts
export const theme = {
  colors: {
    surface: '#003080', // Royal Depth
    iceWingAlpha15: 'rgba(96, 192, 240, 0.15)',
    // ...
  }
};
```

**Rating:** **MEDIUM**

---

### 9. **Missing Loading States for KPI Cards**
**File:** `frontend/src/components/ClientProgressCharts/ClientAnalyticsPanel.tsx`  
**Location:** Lines 80-95

```tsx
<KPICard key={kpi.label} $loading={dashLoading || prLoading}>
  <KPIValue>{dashLoading || prLoading ? '…' : kpi.value}</KPIValue>
```

**Problems:**
- `$loading` prop defined but not used in styled component
- No skeleton animation
- Inconsistent with chart loading states

**Fix:**
```tsx
const KPICard = styled.div<{ $loading: boolean }>`
  // ... existing styles
  ${({ $loading }) => $loading && css`
    pointer-events: none;
    opacity: 0.6;
    
    ${KPIValue} {
      background: linear-gradient(90deg, 
        rgba(96, 192, 240, 0.1) 25%, 
        rgba(96, 192, 240, 0.2) 50%, 
        rgba(96, 192, 240, 0.1) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
  `}
`;
```

**Rating:** **MEDIUM**

---

### 10. **DRY Violation: Repeated Chart Wrapper Pattern**
**File:** All Victory chart files  
**Location:** Every chart component

```tsx
if (loading) return <SkeletonChart height={320} />;
if (error || !data?.data?.length) return (
  <ChartCard role="region" aria-label="..." tabIndex={0}>
    <ChartHeader><ChartTitle>...</ChartTitle><ChartSubtitle>No data yet</ChartSubtitle></ChartHeader>
  </ChartCard>
);
```

**Problems:**
- Duplicated 9 times across chart files
- Inconsistent error messages
- Hard to update globally

**Fix:**
```tsx
// Create ChartWrapper.tsx
interface ChartWrapperProps {
  loading: boolean;
  error: Error | null;
  hasData: boolean;
  title: string;
  emptyMessage?: string;
  children: React.ReactNode;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({
  loading, error, hasData, title, emptyMessage = 'No data yet', children
}) => {
  if (loading) return <SkeletonChart height={320} />;
  
  if (error || !hasData) {
    return (
      <ChartCard role="region" aria-label={title} tabIndex={0}>
        <ChartHeader>
          <ChartTitle>{title}</ChartTitle>
          <ChartSubtitle>{error?.message || emptyMessage}</ChartSubtitle>
        </ChartHeader>
      </ChartCard>
    );
  }
  
  return children;
};

// Usage in WorkoutFrequencyBar.tsx
return (
  <ChartWrapper
    loading={loading}
    error={error}
    hasData={!!data?.data?.length}
    title="Workout Frequency"
  >
    <ChartCard role="region" aria-label="Workout Frequency" tabIndex={0}>
      {/* ... chart JSX */}
    </ChartCard>
  </ChartWrapper>
);
```

**Rating:** **MEDIUM**

---

## LOW Priority Issues

### 11. **Accessibility: Missing ARIA Labels**
**File:** `frontend/src/components/Charts/ExerciseHistoryChart.tsx`  
**Location:** Lines 200-220

```tsx
<FilterChip
  type="button"
  $active={muscleFilter === f}
  onClick={() => setMuscleFilter(f)}
  aria-pressed={muscleFilter === f}
>
  {f}
</FilterChip>
```

**Problems:**
- Missing `aria-label` for screen readers
- No keyboard navigation hints

**Fix:**
```tsx
<FilterChip
  type="button"
  $active={muscleFilter === f}
  onClick={() => setMuscleFilter(f)}
  aria-pressed={muscleFilter === f}
  aria-label={`Filter by ${f} exercises`}
  title={`Show ${f} exercises only`}
>
  {f}
</FilterChip>
```

**Rating:** **LOW**

---

### 12. **Magic Numbers in Queries**
**File:** `backend/controllers/chartDataController.mjs`  
**Location:** Multiple functions

```mjs
LIMIT 50  // Line 66
INTERVAL '12 weeks'  // Line 46
INTERVAL '90 days'  // Line 82
```

**Problems:**
- Hardcoded limits make testing difficult
- Should be configurable constants

**Fix:**
```mjs
// At top of file
const QUERY_LIMITS = {
  WEIGHT_MEASUREMENTS: 50,
  WORKOUT_WEEKS: 12,
  MUSCLE_FOCUS_DAYS: 90,
  SESSION_WEEKS: 24,
  CARDIO_DAYS: 90,
  RPE_SESSIONS: 24,
};

// Usage
LIMIT ${QUERY_LIMITS.WEIGHT_MEASUREMENTS}
```

**Rating:** **LOW**

---

### 13. **Incomplete TypeScript Truncation**
**File:** `frontend/src/components/ClientProgressCharts/ClientAnalyticsPanel.tsx`  
**Location:** Line 150 (end of file)

```tsx
const KPIGrid = styled.div`
  // ...
  @media (max-widt

// ... truncated ...
```

**Problems:**
- File appears truncated mid-declaration
- Likely copy-paste error in submission

**Fix:**
Complete the media query and remaining styled components.

**Rating:** **LOW** (assuming this is submission artifact, not actual code)

---

## Summary Statistics

| Severity | Count | Must Fix Before Production |
|----------|-------|---------------------------|
| CRITICAL | 3 | ✅ YES |
| HIGH | 4 | ✅ YES |
| MEDIUM | 3 | ⚠️ Recommended |
| LOW | 3 | 📋 Nice to have |

---

## Recommended Action Plan

### Phase 1 (Immediate — Block Production)
1. Add authentication checks to all chart endpoints (#2)
2. Fix `safeQuery` error handling (#1)
3. Replace all `any` types with proper Victory types (#3)

### Phase 2 (This Sprint)
4. Add Error Boundaries to chart panel (#5)
5. Fix `useCallback` dependencies (#6)
6. Extract inline styles to constants (#7)

### Phase 3 (Next Sprint)
7. Create `ChartWrapper` component (#10)
8. Update theme fallbacks (#8)
9. Add KPI loading animations (#9)

### Phase 4 (Backlog)
10. Improve cardio exercise detection (#4)
11. Extract query constants (#12)
12. Enhance

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
