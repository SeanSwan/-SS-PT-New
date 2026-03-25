# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 70.9s
> **Files:** frontend/src/components/DashBoard/Pages/client-dashboard/ClientOverviewPage.tsx, frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx, frontend/src/components/DashBoard/Pages/client-dashboard/ClientCommunityPage.tsx, frontend/src/components/DashBoard/Pages/client-dashboard/ClientRewardsPage.tsx, frontend/src/components/DashBoard/Pages/client-dashboard/ClientWorkoutForgePage.tsx, frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerOverviewPage.tsx
> **Generated:** 3/24/2026, 11:55:33 PM

---

# Deep Code Review: SwanStudios Client Dashboard

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 8 |
| MEDIUM | 11 |
| LOW | 6 |

---

## 1. Bug Detection

### CRITICAL: XP Level Calculation Inconsistency Across Files

**File:** `ClientOverviewPage.tsx` (Line 148) & `ClientRewardsPage.tsx` (Lines 174-176)

**What's Wrong:** The XP-to-next-level formula is implemented differently in two files, producing inconsistent results:

```tsx
// ClientOverviewPage.tsx line 148
const nextLevelXp = Math.ceil((((level + 1) / 0.1) ** 2));

// ClientRewardsPage.tsx lines 174-176
const nextLevelXp = Math.ceil(((level + 1) / 0.1) ** 2);
const currentLevelXp = Math.ceil((level / 0.1) ** 2);
const pct = nextLevelXp > currentLevelXp ? ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100 : 0;
```

At level 1 with 0 XP:
- **OverviewPage:** `nextLevelXp = 400` (level 2 threshold)
- **RewardsPage:** `currentLevelXp = 100`, `nextLevelXp = 400`, so `pct = ((0-100)/(400-100))*100 = -33.33%` — **negative progress bar**

**Fix:** Unify the XP calculation into a shared utility:

```tsx
// shared/utils/gamification.ts
export const calculateLevelXp = (level: number): number => 
  Math.ceil((level / 0.1) ** 2);

export const calculateNextLevelXp = (level: number): number => 
  Math.ceil(((level + 1) / 0.1) ** 2);

export const calculateXpProgress = (level: number, xp: number): number => {
  const current = calculateLevelXp(level);
  const next = calculateNextLevelXp(level);
  const progress = next > current ? ((xp - current) / (next - current)) * 100 : 0;
  return Math.max(0, Math.min(100, progress)); // Clamp to 0-100%
};
```

---

### CRITICAL: Total Workouts Display Bug

**File:** `ClientOverviewPage.tsx` (Line 149)

**What's Wrong:** 
```tsx
const totalWorkouts = gamData?.totalWorkouts || recentWorkouts.length || 0;
```

The fallback uses `recentWorkouts.length` which is capped at 5 (API params: `{ limit: 5 }`). A user with 100 workouts would see "5" on their dashboard.

**Fix:**
```tsx
const totalWorkouts = typeof gamData?.totalWorkouts === 'number' 
  ? gamData.totalWorkouts 
  : recentWorkouts.length;
```

---

### HIGH: Race Condition in Community Feed Refresh

**File:** `ClientCommunityPage.tsx` (Lines 112-118)

**What's Wrong:** After posting, `handlePost` calls `fetchFeed` with potentially stale filter values:

```tsx
const handlePost = useCallback(async () => {
  // ...
  fetchFeed(filters.category, filters.hashtag); // ← Stale closure if filters changed during posting
}, [postText, authAxios, fetchFeed, filters.category, filters.hashtag]);
```

If user changes hashtag filter between POST and refresh, the new post won't appear in the newly filtered feed.

**Fix:** Use refs to capture current filter values:

```tsx
const filtersRef = useRef({ category: filters.category, hashtag: filters.hashtag });
useEffect(() => {
  filtersRef.current = { category: filters.category, hashtag: filters.hashtag };
}, [filters]);

const handlePost = useCallback(async () => {
  // ...
  const { category, hashtag } = filtersRef.current;
  fetchFeed(category, hashtag);
}, [postText, authAxios, fetchFeed]);
```

---

### HIGH: Tier Definitions Duplicated with Different Values

**Files:** `ClientOverviewPage.tsx` (Lines 142-147) & `ClientRewardsPage.tsx` (Lines 52-58)

**What's Wrong:** Two different tier systems are used:

```tsx
// ClientOverviewPage.tsx
const TIER_NAMES: Record<number, string> = {
  1: 'Bronze Forge', 2: 'Silver Edge', 3: 'Titanium Core', 4: 'Obsidian Warrior', 5: 'Crystalline Swan'
};

// ClientRewardsPage.tsx
const TIERS = [
  { name: 'Bronze Forge', min: 1, max: 10, color: '#CD7F32' },
  { name: 'Silver Edge', min: 11, max: 25, color: '#C0C0C0' },
  // ...
];
```

The first uses level thresholds (1, 11, 26, 51, 100) while the second uses different ranges (1-10, 11-25, 26-50, 51-99, 100+). This will cause UI inconsistency.

**Fix:** Create single source of truth in `shared/constants/gamification.ts`:

```tsx
export const TIERS = [
  { name: 'Bronze Forge', minLevel: 1, maxLevel: 10, color: '#CD7F32' },
  { name: 'Silver Edge', minLevel: 11, maxLevel: 25, color: '#C0C0C0' },
  // ...
] as const;

export const getTierForLevel = (level: number) => 
  TIERS.find(t => level >= t.minLevel && level <= t.maxLevel) || TIERS[0];
```

---

### MEDIUM: Null Check Missing in Workout Forge

**File:** `ClientWorkoutForgePage.tsx` (Line 165)

**What's Wrong:**
```tsx
const selectedPhase = OPT_PHASES.find(p => p.id === phase)!;
```

Non-null assertion assumes phase always matches. If state becomes corrupted, this throws.

**Fix:**
```tsx
const selectedPhase = OPT_PHASES.find(p => p.id === phase) ?? OPT_PHASES[0];
```

---

### MEDIUM: Set ID Type Mismatch

**File:** `ClientMyWorkoutsPage.tsx` (Line 87)

**What's Wrong:** Interface declares `id: number` but API returns `id: string` (line 90: `id: string`). The expandedIds Set uses strings:

```tsx
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
// ...
toggleExpand(workout.id) // workout.id is string
```

But the key in map uses `workout.id` which could be either type depending on API response shape.

**Fix:** Normalize ID type at fetch time:

```tsx
const list = (payload.workouts || payload || []).map((w: any) => ({
  ...w,
  id: String(w.id)
}));
```

---

## 2. Architecture Flaws

### HIGH: God Component - ClientCommunityPage.tsx

**File:** `ClientCommunityPage.tsx` (~280 lines)

**What's Wrong:** Single component handles:
- Filter state management
- Three separate API calls (challenges, feed, leaderboard)
- Post creation
- Feed filtering
- Fallback data management

**Fix:** Split into smaller components:

```tsx
// components/DashBoard/Pages/client-dashboard/ClientCommunityPage.tsx
const ClientCommunityPage: React.FC = () => {
  return (
    <PageWrap>
      <CommunityFilters />
      <QuickPost />
      <TwoCol>
        <ChallengesSection />
        <LeaderboardSection />
      </TwoCol>
      <SocialFeed />
    </PageWrap>
  );
};
```

---

### MEDIUM: Prop Drilling in Action Buttons

**File:** `ClientOverviewPage.tsx` (Lines 167-169)

**What's Wrong:** Navigation is hardcoded with `console.warn` TODOs:

```tsx
<ActionBtn onClick={() => console.warn('TODO: navigate to booking')}><Calendar size={18} /> Book Session</ActionBtn>
<ActionBtn onClick={() => console.warn('TODO: navigate to progress')}><TrendingUp size={18} /> View Progress</ActionBtn>
<ActionBtn onClick={() => console.warn('TODO: navigate to workout log')}><Dumbbell size={18} /> Log Workout</ActionBtn>
```

**Fix:** Use proper navigation:

```tsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
// ...
<ActionBtn onClick={() => navigate('/dashboard/book-session')}>
  <Calendar size={18} /> Book Session
</ActionBtn>
```

---

### MEDIUM: Duplicate fetchData Logic

**Files:** All dashboard pages

**What's Wrong:** Each page implements its own fetch pattern with `useEffect`, loading states, error handling. This is repeated 5+ times.

**Fix:** Create a custom hook:

```tsx
// hooks/useDashboardData.ts
export const useDashboardData = <T>(fetchFn: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setData(await fetchFn());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [fetchFn]);
  
  return { data, loading, error, refetch: useCallback(() => {...}, []) };
};
```

---

## 3. Integration Issues

### HIGH: Inconsistent API Response Shape Handling

**Files:** Multiple files

**What's Wrong:** Each file handles API responses differently:

```tsx
// ClientOverviewPage.tsx - uses .value?.data?.data
setGamData(gamRes.value?.data?.data || gamRes.value?.data);

// ClientMyWorkoutsPage.tsx - uses .data?.data with nested .workouts
const payload = res.data?.data;
const list = Array.isArray(payload?.workouts) ? payload.workouts : ...

// ClientCommunityPage.tsx - tries multiple paths
setChallenges(cRes.value?.data?.data || cRes.value?.data?.challenges || []);
```

**Fix:** Create standardized API response wrapper:

```tsx
// lib/api.ts
export const extractApiData = <T>(response: AxiosResponse): T => {
  const data = response.data?.data ?? response.data;
  if (Array.isArray(data)) return data as T;
  if (data?.data) return data.data as T;
  return data as T;
};
```

---

### MEDIUM: Missing Loading State for Individual API Calls

**File:** `ClientOverviewPage.tsx` (Lines 103-117)

**What's Wrong:** Two separate API calls are made with `Promise.allSettled`, but there's no way to show partial loading. If gamification API fails but workouts succeed, user sees loading state until both complete.

**Fix:** Track individual loading states:

```tsx
const [gamLoading, setGamLoading] = useState(true);
const [workoutLoading, setWorkoutLoading] = useState(true);

useEffect(() => {
  const fetchGam = async () => {
    setGamLoading(true);
    try { /* ... */ } finally { setGamLoading(false); }
  };
  const fetchWorkouts = async () => {
    setWorkoutLoading(true);
    try { /* ... */ } finally { setWorkoutLoading(false); }
  };
  Promise.all([fetchGam(), fetchWorkouts()]);
}, []);
```

---

### MEDIUM: No Error Boundary Around Async Operations

**Files:** All dashboard pages

**What's Wrong:** If an API call fails inside useEffect, there's no error boundary to catch the error and prevent white screen.

**Fix:** Wrap in error boundary or add try-catch with user feedback:

```tsx
useEffect(() => {
  const fetchData = async () => {
    try {
      // fetch logic
   

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
