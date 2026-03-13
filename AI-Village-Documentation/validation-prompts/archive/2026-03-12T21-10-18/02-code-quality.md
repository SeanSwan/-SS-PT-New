# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 48.7s
> **Files:** frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx
> **Generated:** 3/12/2026, 2:10:18 PM

---

# Code Review: UniversalMasterSchedule.tsx

## CRITICAL Issues

### 1. **Missing Error Boundaries Around Async Operations**
**Severity:** CRITICAL  
**Location:** `handleCreateSession`, `handleBookSession`, `handleReschedule`, `handleQuickBookConfirm`

```tsx
const handleCreateSession = async () => {
  try {
    // ... async operations
  } catch (error: any) {
    console.error('Error creating session:', error);
    toastError(errorMessage);
  }
  // ❌ No finally block to reset loading states
  // ❌ No error boundary to catch render errors from state updates
};
```

**Issue:** Async handlers lack proper cleanup in finally blocks. If an error occurs, loading states may remain stuck. Additionally, the component relies on a single top-level ErrorBoundary but doesn't handle errors from async state updates that could cause render failures.

**Fix:**
```tsx
const handleCreateSession = async () => {
  setIsCreating(true); // Add loading state
  try {
    // ... operations
  } catch (error: any) {
    console.error('Error creating session:', error);
    const errorMessage = error?.response?.data?.message || error?.message || 'Error creating session';
    toastError(errorMessage);
  } finally {
    setIsCreating(false); // Always cleanup
  }
};
```

---

### 2. **Type Safety Violations with `any`**
**Severity:** CRITICAL  
**Location:** Multiple locations throughout component

```tsx
const [detailSession, setDetailSession] = useState<any | null>(null);
const [bookingTarget, setBookingTarget] = useState<any | null>(null);
const handleSelectSession = useCallback((session: any) => { /* ... */ }, []);
```

**Issue:** Extensive use of `any` defeats TypeScript's purpose. Sessions, clients, and trainers should have proper interfaces.

**Fix:**
```tsx
// types.ts
export interface Session {
  id: string | number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  location: string;
  status: 'available' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  trainerId?: string | number;
  userId?: string | number;
  clientName?: string;
  notes?: string;
  recurringGroupId?: string;
  notifyClient?: boolean;
}

export interface Client {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Trainer {
  id: string | number;
  firstName: string;
  lastName: string;
}

// Component
const [detailSession, setDetailSession] = useState<Session | null>(null);
const [bookingTarget, setBookingTarget] = useState<Session | null>(null);
const handleSelectSession = useCallback((session: Session) => { /* ... */ }, []);
```

---

### 3. **Unsafe Type Coercion in Filters**
**Severity:** CRITICAL  
**Location:** `scopedSessions` useMemo

```tsx
const scopedSessions = useMemo(() => {
  if (mode === 'admin' && adminViewScope === 'my' && userId) {
    return sessions.filter((s: any) =>
      s.trainerId === userId ||
      s.trainerId?.toString() === userId?.toString()
    );
  }
  return sessions;
}, [sessions, mode, adminViewScope, userId]);
```

**Issue:** Comparing mixed types (string/number) without normalization can cause silent filter failures. The `userId` could be string `"123"` while `trainerId` is number `123`, causing the first comparison to fail.

**Fix:**
```tsx
const scopedSessions = useMemo(() => {
  if (mode === 'admin' && adminViewScope === 'my' && userId) {
    const normalizedUserId = String(userId);
    return sessions.filter((s: Session) => 
      String(s.trainerId) === normalizedUserId
    );
  }
  return sessions;
}, [sessions, mode, adminViewScope, userId]);
```

---

## HIGH Issues

### 4. **Stale Closure in `handleReschedule`**
**Severity:** HIGH  
**Location:** `handleReschedule` callback

```tsx
const handleReschedule = useCallback(async (
  drop: DragDropResult,
  options: { conflictOverride?: boolean } = {}
) => {
  const session = sessions.find((item) => String(item.id) === String(drop.sessionId));
  // ❌ Uses `sessions` from closure - could be stale during async operation
}, [sessions, refreshData]);
```

**Issue:** The `sessions` array is captured in the closure. If the component re-renders during the async operation, the session data may be stale.

**Fix:**
```tsx
const handleReschedule = useCallback(async (
  drop: DragDropResult,
  options: { conflictOverride?: boolean } = {}
) => {
  // Fetch fresh session data from service instead of relying on stale state
  const session = await universalMasterScheduleService.getSession(drop.sessionId);
  if (!session) {
    toastError('Session not found');
    return;
  }
  // ... rest of logic
}, [refreshData, toastError]);
```

---

### 5. **Missing Dependency in `useEffect`**
**Severity:** HIGH  
**Location:** Auto-layout switching effect

```tsx
useEffect(() => {
  const savedLayout = localStorage.getItem('scheduleLayoutMode');
  if (!savedLayout && isMobile) {
    dispatch(setLayoutMode(suggestedLayout));
    dispatch(setDensity(suggestedDensity));
  }
}, [isMobile, suggestedLayout, suggestedDensity, dispatch]);
// ❌ Missing `savedLayout` in dependency array
```

**Issue:** `savedLayout` is read inside the effect but not included in dependencies. This violates the exhaustive-deps rule and could cause stale reads.

**Fix:**
```tsx
useEffect(() => {
  const savedLayout = localStorage.getItem('scheduleLayoutMode');
  if (!savedLayout && isMobile) {
    dispatch(setLayoutMode(suggestedLayout));
    dispatch(setDensity(suggestedDensity));
  }
}, [isMobile, suggestedLayout, suggestedDensity, dispatch]);
// Note: savedLayout is intentionally not a dependency since it's a one-time read
// Add ESLint disable comment to document this:
// eslint-disable-next-line react-hooks/exhaustive-deps
```

Or refactor to make intent clearer:
```tsx
const [hasCheckedLayout, setHasCheckedLayout] = useState(false);

useEffect(() => {
  if (hasCheckedLayout) return;
  
  const savedLayout = localStorage.getItem('scheduleLayoutMode');
  if (!savedLayout && isMobile) {
    dispatch(setLayoutMode(suggestedLayout));
    dispatch(setDensity(suggestedDensity));
  }
  setHasCheckedLayout(true);
}, [hasCheckedLayout, isMobile, suggestedLayout, suggestedDensity, dispatch]);
```

---

### 6. **Inline Object Creation in Render**
**Severity:** HIGH  
**Location:** `motion.div` style prop

```tsx
<motion.div
  initial={{ opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
  style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}
  // ❌ Inline style object created on every render
>
```

**Issue:** Creates new object reference on every render, causing unnecessary re-renders of motion.div.

**Fix:**
```tsx
const motionStyle = useMemo(() => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%'
}), []);

const motionVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 }
};

const motionTransition = { duration: 0.6, ease: [0.16, 1, 0.3, 1] };

<motion.div
  initial="initial"
  animate="animate"
  variants={motionVariants}
  transition={motionTransition}
  style={motionStyle}
>
```

---

### 7. **Prop Drilling Anti-Pattern**
**Severity:** HIGH  
**Location:** `ScheduleModals` component

```tsx
<ScheduleModals
  mode={mode}
  showCreateDialog={showCreateDialog}
  setShowCreateDialog={setShowCreateDialog}
  // ... 30+ props passed down
  handleCreateSession={handleCreateSession}
  handleBookSession={handleBookSession}
  // ❌ Massive prop drilling
/>
```

**Issue:** Passing 30+ props to a single component is a maintainability nightmare and performance issue (any parent re-render causes child re-render even if only 1 prop changed).

**Fix:**
```tsx
// Create a context for modal state
const ScheduleModalsContext = createContext<ScheduleModalsContextValue | null>(null);

export const useScheduleModals = () => {
  const context = useContext(ScheduleModalsContext);
  if (!context) throw new Error('useScheduleModals must be used within provider');
  return context;
};

// In parent component
<ScheduleModalsContext.Provider value={modalState}>
  <ScheduleModals />
</ScheduleModalsContext.Provider>

// In ScheduleModals
const ScheduleModals = () => {
  const { showCreateDialog, setShowCreateDialog, handleCreateSession } = useScheduleModals();
  // ...
};
```

---

## MEDIUM Issues

### 8. **Hardcoded Theme Values**
**Severity:** MEDIUM  
**Location:** `ScheduleContainer` styled component

```tsx
const ScheduleContainer = styled.div`
  background-color: #002060; /* ❌ Hardcoded Midnight Sapphire */
  background-image:
    radial-gradient(circle at 85% 15%, rgba(139, 92, 246, 0.12) 0%, transparent 40%),
    /* ❌ Hardcoded Wing Purple with opacity */
```

**Issue:** Theme colors are hardcoded instead of using theme tokens. Violates the Enchanted Apex theme system.

**Fix:**
```tsx
const ScheduleContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.midnightSapphire};
  background-image:
    radial-gradient(
      circle at 85% 15%, 
      ${({ theme }) => `${theme.colors.wingPurple}1F`} 0%, 
      transparent 40%
    ),
    radial-gradient(
      circle at 15% 85%, 
      ${({ theme }) => `${theme.colors.wingPurple}14`} 0%, 
      transparent 40%
    );
```

---

### 9. **Missing Memoization for Expensive Computations**
**Severity:** MEDIUM  
**Location:** `displaySessions` useMemo

```tsx
const displaySessions = useMemo(() => {
  if (!statusFilter || statusFilter === 'total') return scopedSessions;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isUpcoming = (s: any) => {
    const date = s.sessionDate || s.start || s.startTime;
    if (!date) return true;
    return new Date(date) >= startOfToday;
  };
  // ❌ isUpcoming function recreated on every filter change
  // ❌ Multiple filter branches with duplicated logic
}, [scopedSessions, statusFilter]);
```

**Issue:** The `isUpcoming` helper is recreated on every memo recalculation. Filter logic is duplicated across branches.

**Fix:**
```tsx
// Extract outside component
const isUpcoming = (session: Session, referenceDate: Date): boolean => {
  const date = session.sessionDate || session.start || session.startTime;
  if (!date) return true;
  return new Date(date) >= referenceDate;
};

const filterSessionsByStatus = (
  sessions: Session[], 
  status: string | null, 
  referenceDate: Date
): Session[] => {
  if (!status || status === 'total') return sessions;
  
  const KNOWN_STATUSES = ['available', 'scheduled', 'confirmed', 'completed'];
  
  const filters: Record<string, (s: Session) => boolean> = {
    scheduled: (s) => ['scheduled', 'confirmed'].includes(s.status) && isUpcoming(s, referenceDate),
    available: (s) => s.status === 'available' && isUpcoming(s, referenceDate),
    other: (s) => !s.status || !KNOWN_STATUSES.includes(s.status),
    default: (s) => s.status === status
  };
  
  const filterFn = filters[status] || filters.default;
  return sessions.filter(filterFn);
};

// In component
const displaySessions = useMemo(() => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return filterSessionsByStatus(scopedSessions, statusFilter, startOfToday);
}, [scopedSessions, statusFilter]);
```

---

### 10. **Inconsistent Date Handling**
**Severity:** MEDIUM  
**Location:** Multiple date operations

```tsx
// In handleCreateSession
const startDate = new Date(formData.sessionDate);
const now = new Date();
if (startDate < now && mode !== 'admin') { /* ... */ }

// In handleSelectSlot
const now = new Date();
if (slotDate < now && mode !== 'admin') { /* ... */ }

// ❌ Duplicated date validation logic
// ❌ No timezone handling
```

**Issue:** Date validation logic is duplicated. No consideration for timezones (user's local time vs server time).

**Fix:**
```tsx
// utils/dateValidation.ts
export const isDateInPast = (date: Date, allowPastForAdmin = false, userRole?: string): boolean => {
  if (allowPastForAdmin && userRole === 'admin') return false;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Compare at day level
  
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  
  return compareDate < now;
};

export const validateSessionDate = (
  date: Date, 
  userRole: string
): { valid: boolean; error?: string } => {
  if (isDateInPast(date, true, userRole)) {
    return {
      valid: false,
      error: 'Cannot create sessions in the past. Please select a future date and time.'
    };
  }
  return { valid: true };
};

// In component
const validation = validateSessionDate(startDate, mode);
if (!validation.valid) {
  warning(validation.error!);
  return;
}
```

---

### 11. **Missing Loading States**
**Severity:** MEDIUM  
**Location:** `handleCreateSession`, `handleQuickBookConfirm`

```tsx
const handleCreateSession = async () => {
  try {
    // ❌ No loading state set before async operation
    const result = await universalMasterScheduleService.createAvailableSessions([...]);
    // User sees no feedback during network request
  } catch (error: any) {
    // ...
  }
};
```

**Issue:** No loading indicators during async operations. Poor UX.

**Fix:**
```tsx
const [isCreatingSession, setIsCreatingSession] = useState(false);

const handleCreateSession = async () => {
  setIsCreatingSession(true);
  try {

---

*Part of SwanStudios 7-Brain Validation System*
