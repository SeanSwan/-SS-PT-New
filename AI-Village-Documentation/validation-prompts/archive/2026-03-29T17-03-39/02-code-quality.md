# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 57.4s
> **Files:** frontend/src/components/AdvancedGamification/components/GhostMode/GhostModeBanner.tsx, frontend/src/components/AdvancedGamification/components/GhostMode/GhostModeStyles.ts, frontend/src/components/AdvancedGamification/components/GhostMode/useGhostMode.ts, frontend/src/components/AdvancedGamification/components/GhostMode/GhostModeTypes.ts, frontend/src/components/DashBoard/Pages/admin-gamification/components/RPGFeaturesPanel.tsx, frontend/src/components/DashBoard/Pages/content-studio/NanoBananaBadgeCreator.tsx, backend/routes/contentStudioRoutes.mjs
> **Generated:** 3/29/2026, 10:03:39 AM

---

# Code Review: SwanStudios Ghost Mode & Content Studio Components

## 1. TypeScript Best Practices

### ❌ CRITICAL: Missing Type Safety in contentStudioRoutes.mjs
**File:** `backend/routes/contentStudioRoutes.mjs`
```mjs
router.put('/api-keys', protect, adminOnly, async (req, res) => {
  const { keys } = req.body; // No validation
  const validKeys = ['kling', 'elevenlabs', 'blotato'];
  const envMap = {
    kling: 'KLING_API_KEY',
    elevenlabs: 'ELEVENLABS_API_KEY',
    blotato // INCOMPLETE - file truncated
```
**Issues:**
- `.mjs` file lacks TypeScript type checking
- No runtime validation schema (Zod/Joi)
- Incomplete code (truncated `blotato` key)

**Fix:**
```typescript
// Convert to .ts and add validation
import { z } from 'zod';

const ApiKeysSchema = z.object({
  keys: z.object({
    kling: z.string().optional(),
    elevenlabs: z.string().optional(),
    blotato: z.string().optional(),
  }),
});

router.put('/api-keys', protect, adminOnly, async (req, res) => {
  const parsed = ApiKeysSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ 
      success: false, 
      error: parsed.error.flatten() 
    });
  }
  // ...
});
```

---

### ✅ HIGH: Proper Discriminated Union Usage
**File:** `GhostModeTypes.ts`
```typescript
export interface GhostComparisonResult {
  result: 'victory' | 'close' | 'defeat' | 'no_comparison'; // ✅ Good
  ghostVolume?: number;
  currentVolume?: number;
  ratio?: number;
  bonusXP: number;
  bonuses: GhostBonus[];
  exerciseComparisons?: ExerciseComparison[];
}
```
**Good:** Uses string literal union for `result` status.

**Improvement:** Make it a true discriminated union:
```typescript
type GhostComparisonResult =
  | { result: 'victory'; ghostVolume: number; currentVolume: number; ratio: number; bonusXP: number; bonuses: GhostBonus[]; exerciseComparisons: ExerciseComparison[] }
  | { result: 'close'; ghostVolume: number; currentVolume: number; ratio: number; bonusXP: number; bonuses: GhostBonus[] }
  | { result: 'defeat'; ghostVolume: number; currentVolume: number; ratio: number; bonusXP: number; bonuses: GhostBonus[] }
  | { result: 'no_comparison'; bonusXP: 0; bonuses: [] };
```

---

### ⚠️ MEDIUM: Loose Error Typing
**File:** `useGhostMode.ts` (lines 91, 103)
```typescript
} catch (err) {
  if (mountedRef.current) {
    setError(err instanceof Error ? err.message : 'Failed to load ghost');
  }
}
```
**Issue:** `err` is implicitly `any`. TypeScript 5.0+ supports typed catch clauses.

**Fix:**
```typescript
} catch (err: unknown) {
  if (mountedRef.current) {
    setError(err instanceof Error ? err.message : 'Failed to load ghost');
  }
}
```

---

## 2. React Patterns

### ❌ HIGH: Stale Closure in useEffect Dependencies
**File:** `GhostModeBanner.tsx` (lines 95-97, 100-102)
```tsx
useEffect(() => {
  onGhostLoaded?.(ghostData);
}, [ghostData, onGhostLoaded]); // ❌ onGhostLoaded not memoized

useEffect(() => {
  onToggle?.(isActive);
}, [isActive, onToggle]); // ❌ onToggle not memoized
```
**Issue:** Parent may pass inline functions → infinite re-render loop.

**Fix:**
```tsx
// In parent component:
const handleGhostLoaded = useCallback((ghost: GhostData | null) => {
  // ...
}, []);

// OR wrap in useEffect with ref:
const onGhostLoadedRef = useRef(onGhostLoaded);
useEffect(() => { onGhostLoadedRef.current = onGhostLoaded; });

useEffect(() => {
  onGhostLoadedRef.current?.(ghostData);
}, [ghostData]);
```

---

### ⚠️ MEDIUM: Missing Memoization for Expensive Computation
**File:** `GhostModeBanner.tsx` (line 109)
```tsx
const buildFullPrompt = useCallback(() => {
  // 6 string concatenations + filtering
  return [base, style, rarity, custom, theme, format].filter(Boolean).join(' ');
}, [achievementName, prompt, stylePreset, rarityPreset]);
```
**Issue:** `buildFullPrompt` is called in render (line 283) AND in `handleGenerate`. Should be memoized value, not callback.

**Fix:**
```tsx
const fullPrompt = useMemo(() => {
  const base = `Create a premium fitness achievement badge icon for "${achievementName || 'Achievement'}".`;
  // ...
  return [base, style, rarity, custom, theme, format].filter(Boolean).join(' ');
}, [achievementName, prompt, stylePreset, rarityPreset]);
```

---

### ✅ GOOD: Proper Memoization of Child Component
**File:** `GhostModeBanner.tsx` (lines 66-82)
```tsx
const ExerciseCompRow = memo(({ name, ghostVol, currentVol }: ExerciseCompRowProps) => {
  const delta = ghostVol > 0 ? ((currentVol - ghostVol) / ghostVol) * 100 : 0;
  const status = currentVol > ghostVol ? 'beat' : currentVol === ghostVol ? 'tied' : 'lost';
  return (
    <ExerciseRow $status={status}>
      {/* ... */}
    </ExerciseRow>
  );
});
ExerciseCompRow.displayName = 'ExerciseCompRow'; // ✅ Good for debugging
```

---

## 3. Styled-Components

### ❌ CRITICAL: Hardcoded Color Values (Violates Theme System)
**File:** `GhostModeStyles.ts` (lines 91, 95, 99, 103, 107, 111)
```typescript
export const GhostBannerContainer = styled.div<{ $isActive: boolean }>`
  background: var(--bg-surface, #1A1A24); // ❌ Hardcoded fallback
  border: 1px solid ${({ $isActive }) =>
    $isActive ? 'rgba(96, 192, 240, 0.3)' : 'rgba(224, 236, 244, 0.08)'}; // ❌ Hardcoded
```
**Issue:** Hardcoded hex values instead of theme tokens. Violates CLAUDE.md requirement: "no hardcoded values."

**Fix:**
```typescript
// Create theme tokens file:
// frontend/src/styles/theme.ts
export const theme = {
  colors: {
    midnightSapphire: '#002060',
    royalDepth: '#003080',
    iceWing: '#60C0F0',
    arcticCyan: '#50A0F0',
    gildedFern: '#C6A84B',
    frostWhite: '#E0ECF4',
    swanLavender: '#4070C0',
    wingPurple: '#8B5CF6',
  },
  surfaces: {
    elevated: '#141419',
    surface: '#1A1A24',
  },
};

// Then use:
export const GhostBannerContainer = styled.div<{ $isActive: boolean }>`
  background: ${({ theme }) => theme.surfaces.surface};
  border: 1px solid ${({ $isActive, theme }) =>
    $isActive 
      ? `${theme.colors.iceWing}4D` // 30% opacity
      : `${theme.colors.frostWhite}14`}; // 8% opacity
```

---

### ⚠️ MEDIUM: Inconsistent Transient Prop Usage
**File:** `GhostModeStyles.ts`
```typescript
export const GhostStatBlock = styled.div<{ $side: 'ghost' | 'current' }>`
  // ✅ Uses $side (transient)

export const GhostStatLabel = styled.span<{ $variant?: 'ghost' | 'current' }>`
  // ✅ Uses $variant (transient)

export const ExerciseRow = styled.div<{ $status: 'beat' | 'tied' | 'lost' | 'skipped' }>`
  // ❌ Missing $ prefix
```
**Issue:** `$status` should be transient to avoid DOM warnings.

**Fix:**
```typescript
export const ExerciseRow = styled.div<{ $status: 'beat' | 'tied' | 'lost' | 'skipped' }>`
```
(Already correct in code, but verify in usage)

---

### ⚠️ LOW: Magic Numbers in Animations
**File:** `GhostModeStyles.ts` (lines 18-20)
```typescript
const ghostPulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;
```
**Issue:** Magic opacity values. Should be theme constants.

**Fix:**
```typescript
// In theme.ts
export const animations = {
  ghostPulse: {
    minOpacity: 0.6,
    maxOpacity: 1,
  },
};

// Then:
const ghostPulse = keyframes`
  0%, 100% { opacity: ${({ theme }) => theme.animations.ghostPulse.minOpacity}; }
  50% { opacity: ${({ theme }) => theme.animations.ghostPulse.maxOpacity}; }
`;
```

---

## 4. DRY Violations

### ❌ HIGH: Duplicated API Fetch Logic
**File:** `useGhostMode.ts` (lines 28-40, 42-56)
```typescript
async function fetchGhost(userId: number, category?: string): Promise<GhostResponse> {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Ghost fetch failed: ${res.status}`);
  const data = await res.json();
  return data.success ? data.data : data;
}

async function compareGhost(...): Promise<GhostComparisonResult> {
  const token = localStorage.getItem('token'); // ❌ Duplicate
  const res = await fetch(`${API_BASE}/users/${userId}/ghost/compare`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`, // ❌ Duplicate
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ghostData, currentWorkoutData }),
  });
  if (!res.ok) throw new Error(`Ghost compare failed: ${res.status}`); // ❌ Duplicate
  const data = await res.json();
  return data.success ? data.data : data; // ❌ Duplicate
}
```

**Fix:** Extract to shared API client
```typescript
// frontend/src/api/apiClient.ts
class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async get<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.success ? data.data : data;
  }

  async post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.success ? data.data : data;
  }
}

export const apiClient = new ApiClient();

// Then in useGhostMode.ts:
async function fetchGhost(userId: number, category?: string): Promise<GhostResponse> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  return apiClient.get<GhostResponse>(
    `${API_BASE}/users/${userId}/ghost${params.toString() ? `?${params}` : ''}`
  );
}
```

---

### ⚠️ MEDIUM: Repeated Style Preset Structure
**File:** `NanoBananaBadgeCreator.tsx` (lines 44-85)
```tsx
const BADGE_STYLES = [
  { id: 'glass', name: 'Glass', description: '...', prompt: '...', color: '#60C0F0' },
  { id: 'metallic', name: 'Metallic', description: '...', prompt: '...', color: '#C0C0C0' },
  // ... 6 items
];

const RARITY_PRESETS = [
  { id: 'common', name: 'Common', color: '#4070C0', modifier: '...' },
  { id: 'rare', name: 'Rare', color: '#C6A84B', modifier: '...' },
  // ... 4 items
];
```
**Issue:** These should be in a shared constants file if used elsewhere.

**Fix:**
```typescript
// frontend/src/constants/badgePresets.ts
export const BADGE_STYLES = [...];
export const RARITY_PRESETS = [...];

// Then import:
import { BADGE_STYLES, RARITY_PRESETS } from '@/constants/badgePresets';
```

---

## 5. Error Handling

### ❌ CRITICAL: Silent Error Swallowing
**File:** `useGhostMode.ts` (line 76)
```typescript
useEffect(() => {
  fetchGhostConfig()
    .then(cfg => { if (mountedRef.current) setConfig(cfg); })
    .catch(() => { /* config is optional, don't block */ }); // ❌ Silent fail
}, []);
```
**Issue:** Errors are completely swallowed. User has no visibility into why config failed.

**Fix:**
```typescript
.catch((err) => {
  console.warn('[Ghost Mode] Failed to load config:', err);
  // Optionally set a flag to show degraded mode
});
```

---

### ❌ HIGH: No Error Boundary for Lazy Components
**File:** `RPGFeaturesPanel.tsx` (line 130)
```tsx
<Suspense fallback={<PreviewLoading>Loading preview...</PreviewLoading>}>
  {previewFeature === 'aegis-hud' && (
    <AegisHud userId={userId} showMoodlet />
  )}
  {/* ... */}
</Suspense>
```
**Issue:** If lazy component throws, entire panel crashes. No error boundary.

**Fix:**
```tsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary
  fallback={<PreviewError>Failed to load preview. Check console.</PreviewError>}
  onError={(error) => console.error('[RPG Preview]', error)}
>

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
