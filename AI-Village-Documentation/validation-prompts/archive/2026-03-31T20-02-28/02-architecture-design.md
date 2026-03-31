# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 76.0s
> **Files:** docs/ai-workflow/blueprints/NUTRITION-ECOSYSTEM-MASTER-PLAN.md
> **Generated:** 3/31/2026, 1:02:28 PM

---

# SwanStudios Nutrition Ecosystem — Architectural Review

**Reviewer:** Senior React/TypeScript Architect
**Plan Version:** 2026-03-31
**Scope:** Frontend architecture, state management, data flow, React patterns, file budget, hook design, error boundaries

---

## Executive Assessment

The plan is **strategically sound but architecturally underspecified**. The feature vision is coherent and the phased approach is sensible. However, the proposed file structure has several critical gaps: hook composition is not defined (only file names are listed), state management strategy is absent, and several proposed files will significantly exceed the 300-line budget. The plan reads as a product specification that was promoted to an architecture document without the architectural layer being filled in.

---

## Finding 1 — Component Decomposition

### 1.1 NutritionEcosystemHub.tsx Will Become a God Component

**Severity:** 🔴 CRITICAL

**File:** `NutritionEcosystem/NutritionEcosystemHub.tsx`

**Issue:** The plan describes this as the "main orchestrator" replacing `NutritionWorkspace.tsx`. With 9 tabs (6 existing + 3 new), each requiring its own data fetching hooks, loading states, and error states, plus tab routing logic, the hub will exceed 500+ lines if it owns any meaningful logic. The current `NutritionWorkspace.tsx` is already a 6-tab hub — upgrading it without decomposition will compound existing debt.

**Recommended Fix:**

```typescript
// PROPOSED SPLIT:

// NutritionEcosystemHub.tsx (~80 lines)
// Owns ONLY: tab routing, lazy boundary wrappers, top-level layout
// NO data fetching, NO business logic

// NutritionTabRouter.tsx (~60 lines)
// Owns: tab state, URL sync (useSearchParams), tab config array

// NutritionEcosystemProvider.tsx (~100 lines)
// Owns: shared context (userId, activeDate, unitPreference)
// Prevents prop drilling across 9 tabs

// Pattern:
const TAB_CONFIG: TabConfig[] = [
  {
    id: 'meal-log',
    label: 'Log Meal',
    component: React.lazy(() => import('./tabs/MealLogTab')),
    requiredContext: ['userId', 'activeDate'],
  },
  // ...9 tabs
];
```

---

### 1.2 MealLogTab.tsx Conflates Three Distinct Responsibilities

**Severity:** 🔴 CRITICAL

**File:** `NutritionEcosystem/tabs/MealLogTab.tsx`

**Issue:** The plan states this tab handles "manual + barcode + photo" entry. These are three separate input modalities with completely different state machines, error paths, and async flows. A single component handling all three will exceed 400 lines and will be untestable.

**Recommended Fix:**

```
tabs/
├── MealLogTab.tsx                    # ~100 lines: mode switcher + shared meal state
├── meal-log/
│   ├── ManualEntryForm.tsx           # ~150 lines: existing FoodIntakeForm upgrade
│   ├── BarcodeEntryMode.tsx          # ~120 lines: scanner trigger + result handler
│   └── PhotoEntryMode.tsx            # ~100 lines: Phase 6, stub with coming-soon UI
```

```typescript
// MealLogTab.tsx — owns ONLY mode switching
type EntryMode = 'manual' | 'barcode' | 'photo';

const MealLogTab: React.FC = () => {
  const [mode, setMode] = useState<EntryMode>('manual');
  const { submitMeal } = useMealSubmission(); // single shared submission hook

  return (
    <MealLogLayout>
      <EntryModeSelector mode={mode} onChange={setMode} />
      {mode === 'manual' && <ManualEntryForm onSubmit={submitMeal} />}
      {mode === 'barcode' && <BarcodeEntryMode onSubmit={submitMeal} />}
      {mode === 'photo' && <PhotoEntryMode onSubmit={submitMeal} />}
    </MealLogLayout>
  );
};
```

---

### 1.3 FarmMap.tsx Will Exceed Budget Significantly

**Severity:** 🟠 HIGH

**File:** `NutritionEcosystem/farm/FarmMap.tsx`

**Issue:** Any Leaflet or Mapbox integration component that handles map initialization, marker rendering, popup management, filter state, and geolocation will exceed 300 lines. Map components are notoriously difficult to decompose after the fact.

**Recommended Fix:**

```
farm/
├── FarmMap.tsx                       # ~120 lines: map container, marker layer only
├── FarmMapControls.tsx               # ~80 lines: filter panel, distance slider
├── FarmMapPopup.tsx                  # ~60 lines: marker popup content
├── FarmListView.tsx                  # ~100 lines: list toggle view
└── hooks/
    └── useMapMarkers.ts              # ~80 lines: marker data transformation
```

```typescript
// FarmMap.tsx — map concerns only
const FarmMap: React.FC<FarmMapProps> = ({ farms, onFarmSelect }) => {
  const mapRef = useLeafletMap(MAP_CONFIG);
  const markers = useMapMarkers(farms); // transformation hook

  return (
    <MapContainer ref={mapRef}>
      <MarkerLayer markers={markers} onSelect={onFarmSelect} />
      <FarmMapPopup /> {/* portal-rendered */}
    </MapContainer>
  );
};
// Controls live in FarmFinderTab.tsx, not in FarmMap.tsx
```

---

### 1.4 SupplementStore.tsx Is Two Unrelated Features

**Severity:** 🟡 MEDIUM

**File:** `NutritionEcosystem/supplements/SupplementStore.tsx`

**Issue:** The plan describes both a product catalog (affiliate store) and an AI gap analysis engine in the same component tree. These have different data sources, different update frequencies, and different user intents. Merging them creates a component that is simultaneously a commerce UI and an analytics dashboard.

**Recommended Fix:**

```
supplements/
├── SupplementStorePage.tsx           # ~80 lines: layout, tab between store/gaps
├── SupplementCatalog.tsx             # ~150 lines: product grid, affiliate links
├── SupplementCategories.tsx          # ~100 lines: category navigation
├── GapAnalysis.tsx                   # ~150 lines: AI-powered gap display
└── AG1FeaturedCard.tsx               # ~60 lines: hero affiliate card (isolated for A/B)
```

---

### 1.5 ContainerPlanner.tsx Scope Risk

**Severity:** 🟡 MEDIUM

**File:** `NutritionEcosystem/gardening/ContainerPlanner.tsx`

**Issue:** The plan describes "drag-and-drop planter layouts." Drag-and-drop in React requires either a library (`@dnd-kit/core`) or significant custom pointer event handling. Either path adds 200+ lines of interaction logic before any domain logic is written. This component will exceed 400 lines.

**Recommended Fix:** For Phase 4, implement as a **grid-based click-to-place** system (not drag-and-drop). Defer true drag-and-drop to Phase 6 when the feature has validated user demand. Document this explicitly in the plan to prevent scope creep during implementation.

```typescript
// Phase 4: Grid-based planter (achievable in ~150 lines)
// Phase 6: Upgrade to @dnd-kit/core drag-and-drop
```

---

## Finding 2 — State Management

### 2.1 No Shared State Strategy Defined

**Severity:** 🔴 CRITICAL

**Files:** All `NutritionEcosystem/` components

**Issue:** The plan lists 5 hooks but defines no state management architecture. With 9 tabs sharing: `activeDate`, `userId`, `unitPreference` (metric/imperial), `activeNutritionPlan`, and `dailyMacroSummary`, prop drilling will emerge immediately. There is no mention of Context, Zustand, or React Query — the plan is silent on this entirely.

**Recommended Fix:** Define a two-layer state architecture before implementation begins:

```typescript
// Layer 1: NutritionEcosystemContext — shared stable state
// (changes infrequently, all tabs need it)
interface NutritionEcosystemContextValue {
  userId: string;
  activeDate: string;           // ISO date string, controlled by date picker
  unitPreference: 'metric' | 'imperial';
  activePlan: ClientNutritionPlan | null;
  setActiveDate: (date: string) => void;
}

const NutritionEcosystemContext = createContext<NutritionEcosystemContextValue | null>(null);

export const useNutritionEcosystem = () => {
  const ctx = useContext(NutritionEcosystemContext);
  if (!ctx) throw new Error('useNutritionEcosystem must be used within NutritionEcosystemProvider');
  return ctx;
};

// Layer 2: React Query (TanStack Query) — server state per tab
// Each tab owns its own useQuery calls
// No prop drilling of server data

// Layer 3: Local useState — ephemeral UI state (form inputs, modal open, etc.)
// Lives in the component that owns it, never lifted unnecessarily
```

---

### 2.2 Hook Composition Chain Is Undefined

**Severity:** 🔴 CRITICAL

**Files:** `hooks/useMacroData.ts`, `hooks/useNutritionPlan.ts`, `hooks/useBarcodeScanner.ts`, `hooks/useFarmFinder.ts`, `hooks/useGardeningZone.ts`

**Issue:** The plan lists hook file names but provides zero information about what each hook returns, what it depends on, or how hooks compose. The prompt references a `useCoachAssistant → useAIChat → useConversationSidebar` chain from a different feature — the nutrition hooks have no equivalent specification. Without this, implementers will make inconsistent decisions.

**Recommended Fix:** Define hook contracts before implementation:

```typescript
// useMacroData.ts — DATA FETCHING ONLY
// Depends on: activeDate from context (not prop)
// Returns: server state only, no UI state
interface UseMacroDataReturn {
  summary: DailyMacroSummary | undefined;
  entries: DailyMacroLog[];
  weeklyData: WeeklyMacroSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  logMeal: UseMutationResult<DailyMacroLog, Error, LogMealPayload>;
}

// useBarcodeScanner.ts — UI STATE + DEVICE API ONLY
// No data fetching — fires callback on successful decode
interface UseBarcodeScanner {
  isScanning: boolean;
  hasPermission: boolean | null;
  lastBarcode: string | null;
  error: BarcodeError | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  requestPermission: () => Promise<boolean>;
}
// The component that uses this hook calls the API separately
// Scanner hook does NOT call /api/food-scanner/scan/:barcode

// useFarmFinder.ts — COMPOSES geolocation + data fetching
interface UseFarmFinder {
  farms: Farm[];
  markets: FarmersMarket[];
  userLocation: GeolocationCoordinates | null;
  locationError: GeolocationPositionError | null;
  isLocating: boolean;
  isLoadingFarms: boolean;
  filters: FarmFilters;
  setFilters: (filters: Partial<FarmFilters>) => void;
  requestLocation: () => void;
}
// This hook IS allowed to compose because geolocation and farm data
// are tightly coupled (location is required for farm search)
```

---

### 2.3 MacroDonut Wiring Will Cause Stale State

**Severity:** 🟠 HIGH

**File:** `NutritionEcosystem/charts/` + `MacroDashboardTab.tsx`

**Issue:** Phase 1 says "wire MacroDonut to real API data." The current `MacroDonut.tsx` uses static demo data. If the wiring is done by passing data as props from a parent that fetches once on mount, the chart will show stale data after a user logs a meal in the same session. The plan does not address cache invalidation.

**Recommended Fix:** Use React Query with explicit invalidation:

```typescript
// In MacroDashboardTab.tsx
const { data: summary } = useQuery({
  queryKey: ['macros', 'summary', activeDate],
  queryFn: () => fetchMacroSummary(activeDate),
  staleTime: 30_000, // 30 seconds — macros don't change that fast
});

// In the meal logging mutation (useMacroData.ts)
const logMeal = useMutation({
  mutationFn: postMealLog,
  onSuccess: () => {
    // Invalidate ALL macro queries for today
    queryClient.invalidateQueries({ queryKey: ['macros', 'summary', today] });
    queryClient.invalidateQueries({ queryKey: ['macros', 'entries', today] });
    // MacroDonut will automatically re-render with fresh data
  },
});
```

---

## Finding 3 — Data Flow

### 3.1 Barcode Scan → Product Display → Macro Log Flow Has Race Condition Risk

**Severity:** 🔴 CRITICAL

**Files:** `scanner/CameraScanner.tsx`, `scanner/ProductOverlay.tsx`, `hooks/useBarcodeScanner.ts`

**Issue:** The plan describes: scan → `GET /api/food-scanner/scan/:barcode` → show `ProductOverlay` → user taps "Log It" → `POST /api/macros`. If the user scans rapidly (common behavior — users wave the camera), multiple concurrent API calls will fire. The last response to arrive (not the last scan) will win, potentially showing the wrong product. The plan mentions a 500ms debounce for duplicate scans but does not address concurrent requests for different barcodes.

**Recommended Fix:**

```typescript
// hooks/useBarcodeScanner.ts
const useBarcodeScanner = (onBarcode: (barcode: string) => void) => {
  const lastBarcodeRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleDecode = useCallback((barcode: string) => {
    // Deduplicate same barcode within 500ms
    if (barcode === lastBarcodeRef.current) return;

    // Cancel any in-flight request for a previous barcode
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      lastBarcodeRef.current = barcode;
      onBarcode(barcode); // caller uses abortControllerRef.current.signal
    }, 150); // short debounce for different barcodes, longer for same
  }, [onBarcode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return { handleDecode };
};
```

---

### 3.2 Geolocation → Farm Search Flow Has No Loading State Architecture

**Severity:** 🟠 HIGH

**File:** `hooks/useFarmFinder.ts`, `farm/FarmMap.tsx`

**Issue:** The farm finder requires: (1) request geolocation permission, (2) get coordinates, (3) fetch farms from API. This is a three-step async waterfall. The plan does not define loading states for each step. Users on slow connections or with location permission dialogs will see an indeterminate loading state with no feedback about which

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
