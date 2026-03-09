# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 63.6s
> **Files:** frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx, frontend/src/components/UniversalMasterSchedule/UniversalMasterScheduleTheme.ts, frontend/src/services/schedule-service.ts
> **Generated:** 3/6/2026, 10:07:39 PM

---

# Code Review: Universal Master Schedule

## CRITICAL Issues

### 1. **Missing Type Definitions for Core Data Structures**
**Location:** `UniversalMasterSchedule.tsx` lines 60-100  
**Severity:** CRITICAL

```tsx
const [detailSession, setDetailSession] = useState<any | null>(null);
const [bookingTarget, setBookingTarget] = useState<any | null>(null);
const [formData, setFormData] = useState({...});
```

**Issues:**
- Extensive use of `any` types defeats TypeScript's purpose
- `formData` has no interface, making it error-prone
- Session objects lack proper type definitions

**Fix:**
```tsx
interface SessionFormData {
  sessionDate: string;
  duration: number;
  location: string;
  notes: string;
  notifyClient: boolean;
  trainerId?: string | number;
  clientId?: string | number;
  manualClientName?: string;
  sessionTypeId?: number;
  bufferBefore?: number;
  bufferAfter?: number;
}

interface Session {
  id: string | number;
  sessionDate: string;
  start: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'available' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'blocked';
  trainerId?: string | number;
  userId?: string | number;
  location?: string;
  notes?: string;
  notifyClient?: boolean;
  recurringGroupId?: string;
  // ... other fields
}

const [detailSession, setDetailSession] = useState<Session | null>(null);
const [bookingTarget, setBookingTarget] = useState<Session | null>(null);
const [formData, setFormData] = useState<SessionFormData>({...});
```

---

### 2. **Unsafe Type Coercion in User ID Resolution**
**Location:** `UniversalMasterSchedule.tsx` lines 183-186  
**Severity:** CRITICAL

```tsx
const resolvedUserId = userId
  ? (typeof userId === 'string' ? parseInt(userId, 10) || null : userId)
  : null;
```

**Issues:**
- `parseInt` can return `NaN`, which becomes `null` via `||` operator
- No validation that the result is actually a number
- Type is `number | null` but could be `NaN` at runtime

**Fix:**
```tsx
const resolvedUserId = useMemo((): number | null => {
  if (!userId) return null;
  
  if (typeof userId === 'number') return userId;
  
  const parsed = parseInt(userId, 10);
  return Number.isFinite(parsed) ? parsed : null;
}, [userId]);
```

---

### 3. **Race Condition in Admin Scope Change**
**Location:** `UniversalMasterSchedule.tsx` lines 159-176  
**Severity:** CRITICAL

```tsx
const handleAdminScopeChange = useCallback((scope: 'my' | 'global') => {
  setAdminViewScope(scope);
  // ... localStorage update
  const newTrainerId = scope === 'my' ? null : selectedTrainerId;
  if (scope === 'my') {
    setSelectedTrainerId(null); // State update 1
  }
  refreshData(false, {...}); // Async operation using potentially stale state
}, [refreshData, selectedTrainerId]);
```

**Issues:**
- `setSelectedTrainerId` is async, but `refreshData` is called immediately
- `refreshData` may use stale `selectedTrainerId` value
- No guarantee of state consistency

**Fix:**
```tsx
const handleAdminScopeChange = useCallback((scope: 'my' | 'global') => {
  setAdminViewScope(scope);
  if (typeof window !== 'undefined') {
    localStorage.setItem('adminScheduleViewScope', scope);
  }
  
  const effectiveTrainerId = scope === 'my' ? null : selectedTrainerId;
  
  if (scope === 'my') {
    setSelectedTrainerId(null);
  }
  
  // Use computed value, not state
  refreshData(false, {
    adminScope: scope,
    trainerId: effectiveTrainerId?.toString() || '',
    clientId: '',
    status: 'all',
    dateRange: 'all',
    location: '',
    searchTerm: ''
  });
}, [refreshData, selectedTrainerId]);
```

---

### 4. **Missing Error Boundaries Around Async Operations**
**Location:** `UniversalMasterSchedule.tsx` lines 208-260  
**Severity:** CRITICAL

```tsx
const handleCreateSession = async () => {
  try {
    // ... validation
    const result = await universalMasterScheduleService.createAvailableSessions([...]);
    
    if (result.sessions || result) { // Weak validation
      success('Session created successfully!');
      // ... state updates
    } else {
      toastError('Session may have been created but could not be confirmed.');
    }
  } catch (error: any) {
    console.error('Error creating session:', error);
    const errorMessage = error?.response?.data?.message || error?.message || 'Error creating session.';
    toastError(errorMessage);
  }
};
```

**Issues:**
- No cleanup if component unmounts during async operation
- State updates after unmount will cause warnings/errors
- `result.sessions || result` is too permissive (accepts any truthy value)

**Fix:**
```tsx
const handleCreateSession = async () => {
  const abortController = new AbortController();
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      warning('Please log in to create sessions.');
      return;
    }

    if (!formData.sessionDate) {
      warning('Please select a date and time.');
      return;
    }

    // ... validation logic

    const result = await universalMasterScheduleService.createAvailableSessions(
      [{...}],
      { signal: abortController.signal }
    );

    // Strict validation
    if (!result || (!Array.isArray(result.sessions) && !result.data)) {
      throw new Error('Invalid response from server');
    }

    if (!abortController.signal.aborted) {
      success('Session created successfully!');
      setShowCreateDialog(false);
      // ... other state updates
      refreshData(true);
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return; // Component unmounted, ignore
    }
    
    console.error('Error creating session:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Error creating session. Please try again.';
    
    if (!abortController.signal.aborted) {
      toastError(errorMessage);
    }
  }
  
  return () => abortController.abort();
};
```

---

## HIGH Issues

### 5. **Hardcoded API URL in Component**
**Location:** `UniversalMasterSchedule.tsx` line 73  
**Severity:** HIGH

```tsx
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';
```

**Issues:**
- API URL should be in service layer, not component
- Duplicated in `schedule-service.ts` with different default port (5000 vs 10000)
- Inconsistent fallback values across codebase

**Fix:**
```tsx
// Remove from component entirely
// Use service layer for all API calls
```

---

### 6. **Massive Props Drilling to ScheduleModals**
**Location:** `UniversalMasterSchedule.tsx` lines 536-596  
**Severity:** HIGH

```tsx
<ScheduleModals
  mode={mode}
  showCreateDialog={showCreateDialog}
  setShowCreateDialog={setShowCreateDialog}
  // ... 40+ props
/>
```

**Issues:**
- 40+ props passed to single component
- Violates component composition principles
- Makes refactoring extremely difficult
- Props changes require updates in 3+ files

**Fix:**
```tsx
// Create context for modal state
interface ScheduleModalsContextValue {
  modals: {
    create: { isOpen: boolean; data: SessionFormData };
    booking: { isOpen: boolean; target: Session | null };
    // ... other modals
  };
  actions: {
    openCreate: (data?: Partial<SessionFormData>) => void;
    closeCreate: () => void;
    // ... other actions
  };
}

const ScheduleModalsContext = createContext<ScheduleModalsContextValue | null>(null);

// In component:
<ScheduleModalsProvider>
  <ScheduleModals />
</ScheduleModalsProvider>
```

---

### 7. **Inline Object Creation in Render**
**Location:** `UniversalMasterSchedule.tsx` lines 159-176, 178-187  
**Severity:** HIGH

```tsx
refreshData(false, {
  adminScope: scope,
  trainerId: newTrainerId?.toString() || '',
  clientId: '',
  status: 'all',
  dateRange: 'all',
  location: '',
  searchTerm: ''
});
```

**Issues:**
- New object created on every render
- Causes unnecessary re-renders in child components
- `refreshData` dependency array may not be stable

**Fix:**
```tsx
const defaultFilters = useMemo(() => ({
  clientId: '',
  status: 'all' as const,
  dateRange: 'all' as const,
  location: '',
  searchTerm: ''
}), []);

const handleAdminScopeChange = useCallback((scope: 'my' | 'global') => {
  // ...
  refreshData(false, {
    ...defaultFilters,
    adminScope: scope,
    trainerId: effectiveTrainerId?.toString() || ''
  });
}, [refreshData, selectedTrainerId, defaultFilters]);
```

---

### 8. **Unsafe Error Type Handling**
**Location:** `schedule-service.ts` lines 150-180  
**Severity:** HIGH

```tsx
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        ...error, // Spreading unknown error object
        message: 'Network error...',
      });
    }
    // ... mutation of error object
    error.message = 'Server error...';
    return Promise.reject(error);
  }
);
```

**Issues:**
- Mutating error objects is unsafe
- Spreading `error` can include non-serializable properties
- No type guard for axios errors

**Fix:**
```tsx
import { AxiosError } from 'axios';

interface ApiError {
  message: string;
  status?: number;
  code?: string;
  data?: unknown;
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown): Promise<ApiError> => {
    const apiError: ApiError = {
      message: 'An unexpected error occurred'
    };

    if (error instanceof AxiosError) {
      if (!error.response) {
        apiError.message = 'Network error. Please check your internet connection.';
        apiError.code = error.code;
      } else {
        apiError.status = error.response.status;
        apiError.data = error.response.data;
        
        if (error.response.status === 401) {
          localStorage.removeItem('token');
          apiError.message = 'Session expired. Please log in again.';
        } else if (error.response.status >= 500) {
          apiError.message = 'Server error. Please try again later.';
        } else if (error.response.data?.message) {
          apiError.message = error.response.data.message;
        }
      }
    }

    return Promise.reject(apiError);
  }
);
```

---

## MEDIUM Issues

### 9. **Missing Memoization for Expensive Computations**
**Location:** `UniversalMasterSchedule.tsx` lines 113-145  
**Severity:** MEDIUM

```tsx
const scopedSessions = useMemo(() => {
  if (mode === 'admin' && adminViewScope === 'my' && userId) {
    return sessions.filter((s: any) => // 'any' type
      s.trainerId === userId ||
      s.trainerId?.toString() === userId?.toString()
    );
  }
  return sessions;
}, [sessions, mode, adminViewScope, userId]);

const displaySessions = useMemo(() => {
  if (!statusFilter || statusFilter === 'total') return scopedSessions;
  const startOfToday = new Date(); // Created on every call
  startOfToday.setHours(0, 0, 0, 0);
  // ... filtering logic
}, [scopedSessions, statusFilter]);
```

**Issues:**
- `startOfToday` recreated on every filter change
- Type `any` for session objects
- Inefficient double string conversion for ID comparison

**Fix:**
```tsx
const startOfToday = useMemo(() => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}, []); // Only create once

const scopedSessions = useMemo(() => {
  if (mode !== 'admin' || adminViewScope !== 'my' || !userId) {
    return sessions;
  }
  
  const userIdStr = userId.toString();
  return sessions.filter((s: Session) => 
    s.trainerId?.toString() === userIdStr
  );
}, [sessions, mode, adminViewScope, userId]);

const displaySessions = useMemo(() => {
  if (!statusFilter || statusFilter === 'total') return scopedSessions;
  
  const isUpcoming = (s: Session): boolean => {
    const date = s.sessionDate || s.start || s.startTime;
    if (!date) return true;
    return new Date(date) >= startOfToday;
  };
  
  // ... rest of logic with proper types
}, [scopedSessions, statusFilter, startOfToday]);
```

---

### 10. **Theme File Has No TypeScript Types**
**Location:** `UniversalMasterScheduleTheme.ts` entire file  
**Severity:** MEDIUM

```ts
export const stellarColors = {
  deepSpace: '#0a0a0f',
  // ... no type annotations
};
```

**Issues:**
- No type safety for theme values
- Autocomplete won't work in consuming components
- Easy to introduce typos in color names

**Fix:**
```ts
export interface StellarColors {
  readonly deepSpace: string;
  readonly commandNavy: string;
  readonly stellarBlue: string;
  readonly cyberBlue: string;
  readonly arcticBlue: string;
  readonly cosmicPurple: string;
  readonly emeraldGreen: string;
  readonly rubyRed: string;
  readonly amberGold: string;
  readonly stellarWhite: string;
  readonly platinumSilver: string;
  readonly cosmicGray: string;
  readonly darkMatter: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly info: string;
  readonly alpha: {
    readonly 5: string;
    readonly 10: string;
    readonly 20: string;
    readonly 30: string;
    readonly 50: string;
    readonly 70: string;
    readonly 90: string;
  };
}

export const stellarColors: StellarColors = {
  deepSpace: '#0a0a0f',
  // ... rest with type checking
} as const;

// Similar for other theme objects
export interface StellarTheme {
  readonly colors: StellarColors;
  readonly gradients: StellarGradients;
  readonly spacing: StellarSpacing;
  readonly breakpoints: StellarBreakpoints;
  readonly typography: StellarTypography;
  readonly shadows: StellarShadows;
  readonly borderRadius: StellarBorderRadius;
  readonly animations:

---

*Part of SwanStudios 7-Brain Validation System*
