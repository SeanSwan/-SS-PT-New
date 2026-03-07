# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 62.0s
> **Files:** backend/models/CustomExercise.mjs, backend/routes/customExerciseRoutes.mjs, frontend/src/hooks/useCustomExerciseAPI.ts, frontend/src/components/FormAnalysis/BiomechanicsStudio.tsx
> **Generated:** 3/6/2026, 3:36:47 PM

---

# Code Review: SwanStudios Custom Exercise Builder

## 1. TypeScript Best Practices

### ❌ CRITICAL: Missing Error Types in API Hook
**File:** `frontend/src/hooks/useCustomExerciseAPI.ts`
```typescript
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...getHeaders(), ...options?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
```
**Issue:** Generic `Error` thrown; no typed error responses. Consumers can't discriminate error types.

**Fix:**
```typescript
interface APIError {
  success: false;
  error: string;
  code?: string;
}

interface APISuccess<T> {
  success: true;
  data: T;
}

type APIResponse<T> = APISuccess<T> | APIError;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { ...getHeaders(), ...options?.headers } });
  const data: APIResponse<T> = await res.json();
  if (!data.success) {
    throw new APIError(data.error, res.status, data.code);
  }
  return data.data;
}

class APIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

---

### ⚠️ HIGH: Unsafe Type Assertions in BiomechanicsStudio
**File:** `frontend/src/components/FormAnalysis/BiomechanicsStudio.tsx` (lines 600+)
```typescript
updateRule(idx, { min: parseFloat(e.target.value) } as any)
```
**Issue:** Multiple `as any` casts bypass type safety when updating discriminated union members.

**Fix:** Use type guards or helper functions:
```typescript
function updateAngleThresholdRule(
  rule: AngleThresholdRule,
  updates: Partial<AngleThresholdRule>
): AngleThresholdRule {
  return { ...rule, ...updates };
}

// In component:
if (rule.type === 'angle_threshold') {
  const updated = updateAngleThresholdRule(rule, { min: parseFloat(e.target.value) });
  setSchema(prev => ({
    ...prev,
    formRules: prev.formRules.map((r, i) => i === idx ? updated : r)
  }));
}
```

---

### ⚠️ HIGH: Incomplete Discriminated Union Handling
**File:** `frontend/src/hooks/useCustomExerciseAPI.ts`
```typescript
export type FormRule =
  | AngleThresholdRule
  | LandmarkDeviationRule
  | BilateralSymmetryRule;
```
**Issue:** No exhaustiveness checking when consuming `FormRule`. Missing `never` checks.

**Fix:**
```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected rule type: ${JSON.stringify(x)}`);
}

function validateFormRule(rule: FormRule): string[] {
  switch (rule.type) {
    case 'angle_threshold':
      return validateAngleThreshold(rule);
    case 'landmark_deviation':
      return validateLandmarkDeviation(rule);
    case 'bilateral_symmetry':
      return validateBilateralSymmetry(rule);
    default:
      return assertNever(rule);
  }
}
```

---

### 🔶 MEDIUM: Loose Tuple Types
**File:** `frontend/src/hooks/useCustomExerciseAPI.ts`
```typescript
landmarks: [number, number, number];
```
**Issue:** Runtime validation missing; could receive `[1, 2]` or `[1, 2, 3, 4]`.

**Fix:**
```typescript
type LandmarkTriple = readonly [number, number, number];

// Runtime validator
function isLandmarkTriple(arr: unknown): arr is LandmarkTriple {
  return Array.isArray(arr) && arr.length === 3 && arr.every(n => Number.isInteger(n));
}
```

---

## 2. React Patterns

### ❌ CRITICAL: Stale Closure in updateRuleLandmark
**File:** `BiomechanicsStudio.tsx` (line ~570)
```typescript
const updateRuleLandmark = (ruleIdx: number, lmIdx: 0 | 1 | 2, value: number, field: string = 'landmarks') => {
  setSchema(prev => ({
    ...prev,
    formRules: prev.formRules.map((r, i) => {
      if (i !== ruleIdx) return r;
      const arr = [...((r as any)[field] || [23, 25, 27])] as [number, number, number];
      arr[lmIdx] = value;
      return { ...r, [field]: arr } as FormRule;
    }),
  }));
};
```
**Issue:** Function recreated on every render; not memoized. Causes child re-renders.

**Fix:**
```typescript
const updateRuleLandmark = useCallback((
  ruleIdx: number,
  lmIdx: 0 | 1 | 2,
  value: number,
  field: 'landmarks' | 'leftLandmarks' | 'rightLandmarks' = 'landmarks'
) => {
  setSchema(prev => ({
    ...prev,
    formRules: prev.formRules.map((r, i) => {
      if (i !== ruleIdx) return r;
      const arr = [...((r as any)[field] || [23, 25, 27])] as [number, number, number];
      arr[lmIdx] = value;
      return { ...r, [field]: arr } as FormRule;
    }),
  }));
}, []);
```

---

### ⚠️ HIGH: Missing Keys in Template Grid
**File:** `BiomechanicsStudio.tsx` (line ~380)
```tsx
<TemplateGrid>
  {templates.map(t => (
    <TemplateCard key={t.key} onClick={() => onTemplateSelect(t.key)}>
```
**Issue:** Keys are present, but `onClick` creates new function on every render.

**Fix:**
```typescript
const handleTemplateSelect = useCallback((key: string) => {
  onTemplateSelect(key);
}, [onTemplateSelect]);

// In JSX:
<TemplateCard key={t.key} onClick={() => handleTemplateSelect(t.key)}>
```
Or better, extract to memoized component:
```typescript
const TemplateItem = React.memo<{ template: ExerciseTemplate; onSelect: (key: string) => void }>(
  ({ template, onSelect }) => (
    <TemplateCard onClick={() => onSelect(template.key)}>
      <TemplateName>{template.name}</TemplateName>
      <TemplateInfo>{template.category.replace(/_/g, ' ')} | {template.ruleCount} rules</TemplateInfo>
    </TemplateCard>
  )
);
```

---

### ⚠️ HIGH: Unused AbortController Ref
**File:** `useCustomExerciseAPI.ts`
```typescript
const abortRef = useRef<AbortController | null>(null);
```
**Issue:** Declared but never used. Requests can't be cancelled.

**Fix:**
```typescript
const listExercises = useCallback(async (params?: { ... }) => {
  abortRef.current?.abort();
  abortRef.current = new AbortController();
  
  const qs = new URLSearchParams();
  // ... build query string
  
  return apiFetch<{ ... }>(
    `${API_BASE}?${qs.toString()}`,
    { signal: abortRef.current.signal }
  );
}, []);

// Cleanup on unmount
useEffect(() => {
  return () => abortRef.current?.abort();
}, []);
```

---

### 🔶 MEDIUM: Inline Object Creation in Render
**File:** `BiomechanicsStudio.tsx` (line ~600+)
```tsx
<Button $variant="danger" onClick={() => removeRule(idx)} style={{ padding: '4px 10px', minHeight: 'auto', fontSize: 12 }}>
```
**Issue:** Inline `style` object causes re-render of styled-component.

**Fix:**
```typescript
const removeButtonStyle = { padding: '4px 10px', minHeight: 'auto', fontSize: 12 };

// Or create a styled variant:
const SmallButton = styled(Button)`
  padding: 4px 10px;
  min-height: auto;
  font-size: 12px;
`;
```

---

## 3. styled-components Best Practices

### ⚠️ HIGH: Hardcoded Color Values
**File:** `BiomechanicsStudio.tsx` (lines 100-400)
```typescript
background: linear-gradient(180deg, #002060 0%, #001040 100%);
color: #e0ecf4;
border: 1px solid rgba(96, 192, 240, 0.4);
```
**Issue:** 50+ hardcoded color values; theme tokens not used.

**Fix:**
```typescript
// theme.ts
export const theme = {
  colors: {
    background: {
      primary: '#002060',
      secondary: '#001040',
      overlay: 'rgba(0, 32, 96, 0.5)',
    },
    text: {
      primary: '#e0ecf4',
      secondary: 'rgba(224, 236, 244, 0.5)',
    },
    accent: {
      cyan: '#60C0F0',
      purple: '#7851A9',
      green: '#00FF88',
      red: '#FF4757',
      yellow: '#FFB800',
    },
    border: {
      default: 'rgba(96, 192, 240, 0.1)',
      active: 'rgba(96, 192, 240, 0.4)',
    },
  },
};

// Usage:
const PageWrapper = styled.div`
  background: linear-gradient(180deg, ${p => p.theme.colors.background.primary} 0%, ${p => p.theme.colors.background.secondary} 100%);
  color: ${p => p.theme.colors.text.primary};
`;
```

---

### 🔶 MEDIUM: Duplicate Media Query Logic
**File:** `BiomechanicsStudio.tsx`
```typescript
const Row = styled.div`
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;
```
**Issue:** Breakpoint hardcoded; duplicated across components.

**Fix:**
```typescript
// theme.ts
export const breakpoints = {
  mobile: '600px',
  tablet: '900px',
  desktop: '1200px',
};

export const media = {
  mobile: `@media (max-width: ${breakpoints.mobile})`,
  tablet: `@media (max-width: ${breakpoints.tablet})`,
  desktop: `@media (min-width: ${breakpoints.desktop})`,
};

// Usage:
const Row = styled.div`
  ${media.mobile} {
    flex-direction: column;
  }
`;
```

---

### 🔷 LOW: Inconsistent Prop Naming
**File:** `BiomechanicsStudio.tsx`
```typescript
<StepCard $active={isActive}>
<RuleTypeBadge $type={rule.type}>
```
**Issue:** Mix of `$` prefixed (transient) and non-prefixed props.

**Fix:** Consistently use `$` for all styled-component-only props:
```typescript
const StepCard = styled(motion.div)<{ $active: boolean }>`
  border: 1px solid ${({ $active, theme }) => 
    $active ? theme.colors.border.active : theme.colors.border.default
  };
`;
```

---

## 4. DRY Violations

### ⚠️ HIGH: Duplicated Slug Generation Logic
**File:** `backend/routes/customExerciseRoutes.mjs` (lines 150, 230, 280, 320)
```javascript
const slug = name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
```
**Issue:** Repeated 4 times across routes.

**Fix:**
```javascript
// utils/slugify.mjs
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// In routes:
import { slugify } from '../utils/slugify.mjs';
const slug = slugify(name);
```

---

### ⚠️ HIGH: Repeated Access Control Logic
**File:** `customExerciseRoutes.mjs` (lines 260, 300, 340, 380)
```javascript
if (exercise.trainerId !== req.user.id && req.user.role !== 'admin') {
  return res.status(403).json({ success: false, error: 'Access denied' });
}
```
**Issue:** Ownership check duplicated 4 times.

**Fix:**
```javascript
// middleware/exerciseOwnership.mjs
export function requireOwnership(req, res, next) {
  const exercise = req.exercise; // Set by previous middleware
  if (exercise.trainerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }
  next();
}

// In routes:
router.put('/:id', authorize('admin', 'trainer'), loadExercise, requireOwnership, async (req, res) => {
  // ... update logic
});
```

---

### 🔶 MEDIUM: Validation Schema Duplication
**File:** `customExerciseRoutes.mjs` (line 450) vs `BiomechanicsStudio.tsx` (implied client-side validation)
**Issue:** Comment says "mirrors DynamicRuleEngine.validate_schema" but validation logic exists in 2+ places.

**Fix:** Share validation via TypeScript schema library (Zod/Yup):
```typescript
// shared/schemas/mechanicsSchema.ts
import { z } from 'zod';

export const MechanicsSchemaValidator = z.object({
  primaryAngle: z.object({
    landmarks: z.tuple([z.number().int().min(0).max(32), z.number().int().min(0).max(32), z.number().int().min(0).max(32)]),
    repPhases: z.object({
      startAngle: z.number().min(0).max(180),
      bottomAngle: z.number().min(0).max(180),
    }).refine(data => data.startAngle > data.bottomAngle, {
      message: 'startAngle must be > bottomAngle'
    }),
  }).optional(),
  formRules: z.array(z.discriminatedUnion('type', [
    // ... rule schemas
  ])),
});

// Backend:
const result = MechanicsSchemaValidator.safeParse(schema);

// Frontend:
const result = MechanicsSchemaValidator.safeParse(schema);
```

---

## 5. Error Handling

### ❌ CRITICAL: No Error Boundaries in BiomechanicsStudio
**File:** `BiomechanicsStudio.tsx`
**Issue:** Component has no error boundary; runtime errors crash entire app.

**Fix:**
```typescript
// ErrorBoundary.tsx
class ExerciseBuilderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state =

---

*Part of SwanStudios 7-Brain Validation System*
