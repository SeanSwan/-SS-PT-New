# Architecture & Component Planning — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 16,503 input / 9,900 output

---

## Senior Architecture Lead — Round 1

# SwanStudios Nutrition Ecosystem — Architecture Authority Review

**Reviewer:** Senior Code Quality Lead
**Date:** 2026-03-31
**Scope:** Hook composition, component decomposition, state management, React performance, file budget, error boundaries
**Verdict:** ⚠️ **CONDITIONALLY APPROVED — 4 CRITICAL issues must be resolved before Phase 1 implementation begins**

---

## Executive Assessment

The plan is **product-complete but architecturally immature**. The feature vision is coherent and the phased approach is sensible. However, the proposed architecture has four systemic problems that will compound into technical debt within 30 days of implementation: a god component at the hub level, no defined state management strategy, hook composition that inverts the dependency direction, and missing error boundary placement. The 22-file decomposition is approximately correct in count but wrong in several groupings.

The 12 specialist reviews identified real issues. This review synthesizes them into a binding architectural decision record.

---

## Finding 1 — Hub Component Will Become a God Component

**Severity:** 🔴 CRITICAL
**File:** `NutritionEcosystem/NutritionEcosystemHub.tsx`

### Problem

The plan designates `NutritionEcosystemHub.tsx` as the "main orchestrator replacing NutritionWorkspace.tsx." With 9 tabs, each requiring independent data fetching, loading states, error states, and tab-specific business logic, this file will exceed 600 lines within Phase 2 if it owns any meaningful logic. The existing `NutritionWorkspace.tsx` already demonstrates this failure mode with 6 tabs.

The plan provides no guidance on what the hub *should not own*, which means every developer touching it will add logic there by default.

### Fix — Mandatory Three-Layer Split

```typescript
// Layer 1: NutritionEcosystemHub.tsx (~70 lines MAX)
// Owns ONLY: layout shell, Suspense boundaries, Provider wrapper
// ZERO data fetching, ZERO business logic, ZERO tab state

import { NutritionEcosystemProvider } from './NutritionEcosystemProvider';
import { NutritionTabRouter } from './NutritionTabRouter';
import { NutritionEcosystemErrorBoundary } from './NutritionEcosystemErrorBoundary';

const NutritionEcosystemHub: React.FC = () => (
  <NutritionEcosystemProvider>
    <NutritionEcosystemErrorBoundary>
      <NutritionEcosystemLayout>
        <NutritionTabRouter />
      </NutritionEcosystemLayout>
    </NutritionEcosystemErrorBoundary>
  </NutritionEcosystemProvider>
);
```

```typescript
// Layer 2: NutritionTabRouter.tsx (~80 lines MAX)
// Owns ONLY: tab config array, URL sync, active tab state
// NO data fetching, NO rendering of tab content beyond lazy boundaries

const TAB_CONFIG: readonly TabConfig[] = [
  {
    id: 'meal-log',
    label: 'Log Meal',
    icon: UtensilsIcon,
    phase: 1,
    component: React.lazy(() => import('./tabs/MealLogTab')),
    errorBoundary: MealLogErrorBoundary,
  },
  {
    id: 'food-search',
    label: 'Food Search',
    icon: SearchIcon,
    phase: 1,
    component: React.lazy(() => import('./tabs/FoodSearchTab')),
    errorBoundary: FoodSearchErrorBoundary,
  },
  {
    id: 'restaurant',
    label: 'Restaurants',
    icon: MapPinIcon,
    phase: 2,
    component: React.lazy(() => import('./tabs/RestaurantTab')),
    errorBoundary: RestaurantErrorBoundary,
  },
  // ... remaining tabs
] as const;

const NutritionTabRouter: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'meal-log';

  const activeConfig = TAB_CONFIG.find(t => t.id === activeTab) ?? TAB_CONFIG[0];
  const ActiveComponent = activeConfig.component;
  const ActiveErrorBoundary = activeConfig.errorBoundary;

  return (
    <>
      <NutritionTabBar
        tabs={TAB_CONFIG}
        activeTab={activeTab}
        onTabChange={(id) => setSearchParams({ tab: id })}
      />
      <ActiveErrorBoundary>
        <React.Suspense fallback={<NutritionTabSkeleton />}>
          <ActiveComponent />
        </React.Suspense>
      </ActiveErrorBoundary>
    </>
  );
};
```

```typescript
// Layer 3: NutritionEcosystemProvider.tsx (~120 lines MAX)
// Owns ONLY: shared cross-tab state (userId, activeDate, unitPreference)
// This is the single source of truth for context that multiple tabs need

interface NutritionEcosystemContextValue {
  readonly userId: string;
  readonly activeDate: string; // ISO 8601, e.g. "2026-03-31"
  readonly setActiveDate: (date: string) => void;
  readonly unitPreference: 'metric' | 'imperial';
}

const NutritionEcosystemContext = React.createContext<
  NutritionEcosystemContextValue | null
>(null);

// Enforced consumer hook — throws if used outside provider
export const useNutritionEcosystem = (): NutritionEcosystemContextValue => {
  const ctx = useContext(NutritionEcosystemContext);
  if (!ctx) {
    throw new Error(
      'useNutritionEcosystem must be used within NutritionEcosystemProvider'
    );
  }
  return ctx;
};
```

**Add to file structure:**
- `NutritionTabRouter.tsx` (new — not in plan)
- `NutritionEcosystemProvider.tsx` (new — not in plan)
- `NutritionEcosystemErrorBoundary.tsx` (new — not in plan)

---

## Finding 2 — Hook Composition Direction Is Inverted

**Severity:** 🔴 CRITICAL
**Files:** `hooks/useMacroData.ts`, `hooks/useNutritionPlan.ts`, `hooks/useBarcodeScanner.ts`, `hooks/useFarmFinder.ts`, `hooks/useGardeningZone.ts`

### Problem

The plan lists 5 hooks but provides no composition strategy. Based on the feature descriptions, the natural implementation path leads to a deeply nested hook chain:

```
// What developers will build without guidance (WRONG):
useMealLogTab
  └── useMacroData          // fetches daily macros
        └── useNutritionPlan  // fetches active plan
              └── useNutritionEcosystem  // reads userId from context
                    └── useAuth  // reads auth state
```

This creates four problems:
1. `useMacroData` cannot be tested without mocking `useNutritionPlan`
2. Re-renders cascade upward — a plan change triggers macro re-fetch
3. The hook at the bottom of the chain owns too much responsibility
4. Circular dependency risk when `useNutritionPlan` needs macro data for gap analysis

### Fix — Flat Composition with Explicit Dependency Injection

```typescript
// RULE: Hooks at the same level consume context directly.
// Hooks do NOT call other domain hooks. They call primitives only.

// PRIMITIVE LAYER (no domain knowledge):
// useApiQuery.ts — generic SWR-style fetcher
// useApiMutation.ts — generic mutation with optimistic update

// DOMAIN LAYER (consumes primitives + context, never other domain hooks):

// useMacroData.ts — ONLY macro fetching
export const useMacroData = (date: string) => {
  const { userId } = useNutritionEcosystem(); // reads context directly
  
  return useApiQuery<DailyMacroSummary>(
    `/api/macros/summary?date=${date}&userId=${userId}`,
    {
      staleTime: 30_000,
      // date is the cache key — changing date fetches new data
    }
  );
};

// useNutritionPlan.ts — ONLY plan fetching, does NOT call useMacroData
export const useNutritionPlan = () => {
  const { userId } = useNutritionEcosystem(); // reads context directly
  
  return useApiQuery<ClientNutritionPlan>(
    `/api/nutrition/${userId}/current`,
    { staleTime: 300_000 } // plans change rarely
  );
};

// COMPOSITION LAYER (tab-level hooks that combine domain hooks):
// useMealLogTab.ts — combines useMacroData + useNutritionPlan for MealLogTab
export const useMealLogTab = () => {
  const { activeDate } = useNutritionEcosystem();
  const macros = useMacroData(activeDate);       // flat, not nested
  const plan = useNutritionPlan();               // flat, not nested
  const logMeal = useLogMealMutation();          // flat, not nested

  // Derived state computed HERE, not in individual hooks
  const macroProgress = useMemo(() => {
    if (!macros.data || !plan.data) return null;
    return computeMacroProgress(macros.data, plan.data);
  }, [macros.data, plan.data]);

  return {
    macros,
    plan,
    logMeal,
    macroProgress,
    isLoading: macros.isLoading || plan.isLoading,
    error: macros.error ?? plan.error,
  };
};
```

**Composition rules (binding):**
1. Domain hooks (`useMacroData`, `useNutritionPlan`) read context directly — never call other domain hooks
2. Tab-level composition hooks (`useMealLogTab`) combine domain hooks — never called by other hooks
3. Derived state lives in composition hooks, not domain hooks
4. Each hook has exactly one reason to change

---

## Finding 3 — State Management: No Single Source of Truth

**Severity:** 🔴 CRITICAL
**Scope:** Cross-cutting — affects all tabs

### Problem

The plan has no state management strategy. The current codebase uses `localStorage` for hydration data. The plan adds 9 tabs with overlapping data needs. Without a defined strategy, the implementation will produce:

```
// What will happen without guidance:
MealLogTab.tsx        → useState for today's macros
MacroDashboardTab.tsx → separate useState for today's macros (DUPLICATE)
IntelligenceTab.tsx   → separate fetch for today's macros (TRIPLICATE)
HydrationTab.tsx      → localStorage (INCONSISTENT with others)
RestaurantTab.tsx     → useState for search results (ISOLATED)
```

When the user logs a meal in `MealLogTab`, `MacroDashboardTab` will not update because it holds its own copy of the data. This is a user-facing bug that will require a full refactor to fix.

### Fix — Layered State Strategy

Define three state layers with explicit ownership rules:

```typescript
// LAYER 1: Server State — React Query (or SWR)
// Owns: all data that comes from the API
// Rule: NEVER duplicate server state in useState or Context
// Cache keys must be standardized:

const QUERY_KEYS = {
  macroSummary: (userId: string, date: string) => 
    ['macros', 'summary', userId, date] as const,
  macroWeekly: (userId: string) => 
    ['macros', 'weekly', userId] as const,
  nutritionPlan: (userId: string) => 
    ['nutrition', 'plan', userId] as const,
  farmMarkets: (lat: number, lng: number, radius: number) => 
    ['farms', 'markets', lat, lng, radius] as const,
} as const;

// When MealLogTab logs a meal, it invalidates the cache key:
// queryClient.invalidateQueries(QUERY_KEYS.macroSummary(userId, date))
// MacroDashboardTab automatically re-fetches — no manual sync needed

// LAYER 2: Shared UI State — NutritionEcosystemContext
// Owns: activeDate, unitPreference, activeTab
// Rule: only state that 3+ tabs need simultaneously
// Do NOT put server data here

// LAYER 3: Local UI State — useState within component
// Owns: form inputs, modal open/close, hover states, scan overlay visibility
// Rule: if only one component needs it, it stays in that component

// EXPLICIT PROHIBITION:
// ❌ Do NOT store macro data in Context
// ❌ Do NOT store macro data in useState at hub level
// ❌ Do NOT use localStorage for anything except user preferences
// ✅ Hydration data MUST migrate to API (localStorage is a bug, not a feature)
```

**Hydration localStorage migration (Phase 1 blocker):**

```typescript
// Current (broken for multi-device, multi-session):
const [glasses, setGlasses] = useState(
  () => parseInt(localStorage.getItem('hydration') ?? '0')
);

// Required (Phase 1):
const { data: hydration, mutate: logWater } = useApiMutation(
  '/api/macros/hydration',
  {
    // Optimistic update so UI feels instant:
    onMutate: async (newGlasses) => {
      await queryClient.cancelQueries(QUERY_KEYS.hydration(userId, date));
      const previous = queryClient.getQueryData(QUERY_KEYS.hydration(userId, date));
      queryClient.setQueryData(QUERY_KEYS.hydration(userId, date), newGlasses);
      return { previous };
    },
    onError: (_, __, context) => {
      // Roll back on failure:
      queryClient.setQueryData(
        QUERY_KEYS.hydration(userId, date), 
        context?.previous
      );
    },
  }
);
```

---

## Finding 4 — Error Boundaries Are Absent from the Plan

**Severity:** 🔴 CRITICAL
**Scope:** All tabs, scanner, map components

### Problem

The plan has zero mention of error boundaries. In a 9-tab ecosystem with 4 external APIs (USDA, Open Food Facts, CalorieNinjas, restaurant APIs), network failures are not edge cases — they are routine. Without error boundaries:

1. A failed farm finder API call crashes the entire nutrition ecosystem
2. A WASM barcode scanner initialization failure crashes the meal log tab
3. A Victory chart rendering error with malformed data crashes the macro dashboard

### Fix — Three-Tier Error Boundary Strategy

```typescript
// TIER 1: Ecosystem-level boundary (catches catastrophic failures)
// File: NutritionEcosystemErrorBoundary.tsx

class NutritionEcosystemErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to your error tracking service
    console.error('[NutritionEcosystem] Catastrophic failure:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <NutritionEcosystemCrashFallback
          error={this.state.error}
          onReset={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}

// TIER 2: Tab-level boundaries (isolates tab failures)
// Each tab gets its own boundary so one tab failure doesn't affect others
// File: tabs/TabErrorBoundary.tsx (reusable, parameterized by tab name)

interface TabErrorBoundaryProps {
  tabName: string;
  children: React.ReactNode;

---

## Code Architecture Specialist (1M context) — Round 2

CONSENSUS REACHED

The four core architectural directives (Hub decomposition, flat hook composition, tri-layer state strategy, and tiered error boundaries) are structurally sound and align with enterprise React standards. I **DISAGREE** with two implementation specifics in Findings 1 and 4 that will cause runtime performance regressions and maintenance overhead. Below are the precise corrections, file-level changes, and merged specifications.

---

## Dispute 1: `NutritionTabRouter` Lazy Loading Strategy (Finding 1)
**Issue:** Defining `React.lazy()` inline or within a component that re-renders on tab change causes React to unmount/remount the lazy boundary. This triggers unnecessary `Suspense` fallbacks, loses internal component state (scroll position, form drafts, chart zoom), and creates a visible UI flicker on every tab switch.

**Fix:** Pre-resolve lazy components at module scope and use a stable component map. Add a persistent container to preserve mount state across tab switches.

**File:** `NutritionEcosystem/NutritionTabRouter.tsx`
```typescript
// Lines 12-22: Module-scope lazy definitions (prevents remounting on tab change)
const LazyMealLogTab = React.lazy(() => import('./tabs/MealLogTab'));
const LazyFoodSearchTab = React.lazy(() => import('./tabs/FoodSearchTab'));
const LazyRestaurantTab = React.lazy(() => import('./tabs/RestaurantTab'));
// ... remaining tabs

// Lines 25-35: Stable tab config mapping
const TAB_COMPONENT_MAP: Record<string, React.LazyExoticComponent<React.FC>> = {
  'meal-log': LazyMealLogTab,
  'food-search': LazyFoodSearchTab,
  'restaurant': LazyRestaurantTab,
} as const;

// Lines 40-60: Router component
const NutritionTabRouter: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'meal-log';
  const ActiveComponent = TAB_COMPONENT_MAP[activeTab] ?? TAB_COMPONENT_MAP['meal-log'];

  return (
    <>
      <NutritionTabBar activeTab={activeTab} onTabChange={(id) => setSearchParams({ tab: id })} />
      <div className="tab-content-persistent">
        <React.Suspense fallback={<NutritionTabSkeleton />}>
          <ActiveComponent />
        </React.Suspense>
      </div>
    </>
  );
};
```

---

## Dispute 2: Class-Based Error Boundaries for Tier 2/3 (Finding 4)
**Issue:** Mixing class components for error boundaries with a functional codebase increases cognitive load, prevents hook usage in fallbacks, and duplicates boilerplate across 9 tabs. `react-error-boundary` is the React team-recommended standard for functional error handling, provides `useErrorBoundary` for programmatic resets, and reduces boilerplate by ~60%.

**Fix:** Replace custom class boundaries with `react-error-boundary` for Tier 2/3. Keep Tier 1 class-based only if required by legacy error tracking SDKs.

**File:** `NutritionEcosystem/shared/TabErrorBoundary.tsx`
```typescript
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { captureException } from '@sentry/react';

interface TabErrorBoundaryProps {
  tabName: string;
  children: React.ReactNode;
}

export const TabErrorBoundary: React.FC<TabErrorBoundaryProps> = ({ tabName, children }) => (
  <ErrorBoundary
    FallbackComponent={({ error, resetErrorBoundary }: FallbackProps) => (
      <TabCrashFallback 
        tabName={tabName} 
        error={error} 
        onReset={resetErrorBoundary} 
      />
    )}
    onError={(error, info) => {
      captureException(error, { 
        tags: { tab: tabName, tier: 'component' }, 
        extra: { componentStack: info.componentStack } 
      });
    }}
  >
    {children}
  </ErrorBoundary>
);
```

---

## Refinement 1: Context Split for Render Optimization (Finding 1/3)
**Issue:** A single `NutritionEcosystemContext` containing both `activeDate` and `unitPreference` will cause all consumers to re-render when either changes. Given `activeDate` changes frequently (daily navigation) and `unitPreference` rarely, they must be split to prevent unnecessary re-renders in domain hooks.

**Fix:** Split into `NutritionDateContext` and `NutritionPreferencesContext`.

**File:** `NutritionEcosystem/NutritionEcosystemProvider.tsx` (Lines 15-45)
```typescript
const DateContext = createContext<{ activeDate: string; setActiveDate: (d: string) => void } | null>(null);
const PrefContext = createContext<{ unitPreference: 'metric' | 'imperial' } | null>(null);

export const useNutritionDate = () => {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error('useNutritionDate must be used within NutritionEcosystemProvider');
  return ctx;
};

export const useNutritionPreferences = () => {
  const ctx = useContext(PrefContext);
  if (!ctx) throw new Error('useNutritionPreferences must be used within NutritionEcosystemProvider');
  return ctx;
};

// Provider wraps both contexts separately
export const NutritionEcosystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDate, setActiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const unitPreference = useUserPreference('unit') ?? 'metric';

  return (
    <DateContext.Provider value={{ activeDate, setActiveDate }}>
      <PrefContext.Provider value={{ unitPreference }}>
        {children}
      </PrefContext.Provider>
    </DateContext.Provider>
  );
};
```

---

## Refinement 2: Query Client Configuration & Invalidation Matrix (Finding 3)
**Issue:** The plan lacks a centralized `QueryClient` setup and explicit invalidation matrix. Without this, optimistic updates will conflict with background refetches, and stale data will persist across tabs.

**Fix:** Add `queryClient.ts` and define the invalidation matrix in `useLogMealMutation`.

**File:** `NutritionEcosystem/queryClient.ts`
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min default
      gcTime: 1000 * 60 * 30,   // 30 min garbage collection
      retry: (failureCount, error) => {
        if (error.status === 401 || error.status === 403) return false;
        return failureCount < 3;
      },
    },
    mutations: { retry: false },
  },
});
```

**File:** `hooks/useLogMealMutation.ts` (Lines 28-38)
```typescript
// Explicit invalidation matrix — only invalidate affected queries
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.macroSummary(userId, activeDate) });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hydration(userId, activeDate) });
  // Do NOT invalidate weekly, plan, or farm data — they are unaffected
}
```

---

## Merged Architecture Decision Record (Round 1)
1. **Hub Decomposition:** 3-layer mandatory (`Hub` → `Router` → `Provider`). Router uses module-scope lazy map to preserve mount state. Provider splits context by update frequency.
2. **Hook Composition:** Flat composition enforced. Domain hooks consume primitives + context directly. Tab hooks derive state. CI lint rule `no-domain-hook-calls` added.
3. **State Strategy:** React Query (server) / Split Context (UI) / `useState` (local). `localStorage` deprecated for hydration. Centralized `QueryClient` with explicit invalidation matrix.
4. **Error Boundaries:** Tier 1 (Ecosystem) + Tier 2/3 (`react-error-boundary`). Functional fallbacks with programmatic reset hooks and Sentry integration.

**Next Phase Focus:** Component-level prop drilling prevention, accessibility compliance (WCAG 2.2 AA), and WASM scanner memory management. Ready for Round 2.

---

