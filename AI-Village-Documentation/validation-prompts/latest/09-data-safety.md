# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 73.8s
> **Files:** frontend/src/config/dashboard-tabs.ts, frontend/src/components/DashBoard/workspaces/clients-team/MasterDetailLayout.tsx, frontend/src/components/DashBoard/workspaces/clients-team/ClientDetailView.tsx, frontend/src/components/DashBoard/workspaces/clients-team/ClientMiniCard.tsx, frontend/src/components/DashBoard/workspaces/clients-team/tabs/OverviewTabContent.tsx, frontend/src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabContent.tsx
> **Generated:** 4/1/2026, 7:10:00 PM

---

# DATA SAFETY AUDIT REPORT — SwanStudios Frontend Components

**Audit Date:** 2026-03-25 | **Auditor:** Data Safety Auditor | **Platform:** sswanstudios.com

---

## EXECUTIVE SUMMARY

These files are **frontend-only** (React/TypeScript configuration and UI components). They contain **zero direct database operations**, no Sequelize calls, no migrations, and no destructive SQL. However, several findings warrant serious attention from a data safety perspective — particularly around **data exposure**, **unguarded API calls**, **missing authorization checks**, and **architectural patterns that could enable future data destruction**.

**Overall Risk Level: MEDIUM** (no immediate data destruction risk, but several HIGH-severity exposure and safety gaps)

---

## FINDING #1 — UNPROTECTED CLIENT PII EXPOSURE IN RENDERED UI

**Severity:** HIGH
**Data at Risk:** Client email addresses, engagement scores, session counts, tier classification
**Blast Radius:** All clients visible to any user who can access the admin dashboard
**File & Line:** `ClientDetailView.tsx` line ~115, `ClientMiniCard.tsx` line ~95

**What's Wrong:**

```tsx
// ClientDetailView.tsx — email rendered directly with no masking
<DetailSubtext>
  {client.email || 'No email'} · {client.status} · {client.tier || 'starter'}
</DetailSubtext>

// ClientMiniCard.tsx — full name + session count visible in list
<ClientName>{client.firstName} {client.lastName}</ClientName>
<ClientMeta>
  {client.sessionsLeft != null && `${client.sessionsLeft} sessions`}
  {client.workoutCount != null && ` · ${client.workoutCount} wkts`}
</ClientMeta>
```

The `MasterDetailLayout.tsx` fetches up to 100 clients with `includeStats: true`, `includeRevenue: true`, `includeSubscription: true` and stores ALL of that data in React state. This means **every client's PII, revenue data, and subscription status is loaded into browser memory simultaneously** — visible in React DevTools, browser memory dumps, and any XSS attack.

**Fix:**

```tsx
// 1. Limit the fetch to only what the UI actually needs
const response = await authAxios.get('/api/admin/clients', {
  params: { 
    limit: 100, 
    // REMOVE: includeRevenue: true — only fetch when a specific client is selected
    // REMOVE: includeSubscription: true — same reason
    includeStats: true,  // Keep only what the list view needs
  },
});

// 2. Mask email in list view — only show full email in detail view
// ClientMiniCard.tsx — show masked email only
const maskedEmail = client.email 
  ? `${client.email[0]}***@${client.email.split('@')[1]}` 
  : 'No email';

// 3. In ClientDetailView.tsx — only show full email to admin role
// Add role check before rendering full PII
const { user } = useAuth();
const canViewFullPII = user?.role === 'admin';

<DetailSubtext>
  {canViewFullPII ? client.email : maskedEmail} · {client.status}
</DetailSubtext>
```

---

## FINDING #2 — BULK CLIENT DATA LOADED WITHOUT PAGINATION GUARD

**Severity:** HIGH
**Data at Risk:** All client records, revenue data, subscription data
**Blast Radius:** All users (entire client database loaded at once)
**File & Line:** `MasterDetailLayout.tsx` lines ~107-130

**What's Wrong:**

```tsx
// This fetches ALL clients with full financial data in one request
const response = await authAxios.get('/api/admin/clients', {
  params: { 
    limit: 100,           // ← Hard-coded 100 — what if there are 500 clients?
    includeStats: true, 
    includeRevenue: true,  // ← Revenue data for ALL 100 clients simultaneously
    includeSubscription: true 
  },
});
```

The `limit: 100` is a soft guard, but there is **no server-side enforcement visible here**. If the backend ignores the limit parameter (or if it's overridden), this single API call could return the entire users table with financial data. Additionally, loading revenue data for 100 clients simultaneously is a significant over-fetch — this data is only needed when a specific client is selected.

**Fix:**

```tsx
// MasterDetailLayout.tsx — fetch minimal data for list, load details on demand
const fetchClients = async () => {
  try {
    setLoading(true);
    // Step 1: Fetch ONLY list-view data (no revenue, no subscription)
    const response = await authAxios.get('/api/admin/clients', {
      params: { 
        limit: 50,           // Reduce to reasonable page size
        page: 1,
        fields: 'id,firstName,lastName,email,isActive,availableSessions,totalWorkouts,lastMeasurement',
        // REMOVED: includeRevenue, includeSubscription
      },
    });
    
    // Step 2: Revenue/subscription data fetched separately when client is selected
    // See handleSelectClient below
  }
};

// Fetch full client detail only when selected
const handleSelectClient = useCallback(async (clientId: number | string) => {
  setSelectedClientId(clientId);
  setMobileDetailOpen(true);
  
  // Lazy-load full client detail (revenue, subscription, etc.)
  try {
    const detail = await authAxios.get(`/api/admin/clients/${clientId}`, {
      params: { includeRevenue: true, includeSubscription: true }
    });
    // Update only the selected client's data in state
    setClientDetails(prev => ({ ...prev, [clientId]: detail.data }));
  } catch (err) {
    logger.warn('Failed to fetch client detail:', err);
  }
}, [authAxios, navigate, location.pathname]);
```

---

## FINDING #3 — NO ROLE VERIFICATION BEFORE RENDERING ADMIN CLIENT DATA

**Severity:** HIGH
**Data at Risk:** All client PII, session counts, engagement scores, revenue data
**Blast Radius:** Any authenticated user who navigates to `/dashboard/admin/client-management`
**File & Line:** `MasterDetailLayout.tsx` lines ~90-95

**What's Wrong:**

```tsx
const MasterDetailLayout: React.FC = () => {
  const { authAxios } = useAuth();
  // ← NO role check here. Any authenticated user reaching this component
  //   will immediately trigger the client data fetch.
  
  useEffect(() => {
    if (!authAxios) return;
    const fetchClients = async () => {
      // This fires for ANY authenticated user — trainer, client, admin
      const response = await authAxios.get('/api/admin/clients', ...);
```

The component assumes that if it renders, the user is authorized. But React Router route guards can be bypassed, and there is no in-component role verification. A client-role user who somehow reaches this route would trigger a fetch of all other clients' data.

**Fix:**

```tsx
import { useAuth } from '../../../../context/AuthContext';
import { Navigate } from 'react-router-dom';

const MasterDetailLayout: React.FC = () => {
  const { authAxios, user } = useAuth();
  
  // CRITICAL: Verify admin/trainer role before rendering ANY client data
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'admin' && user.role !== 'trainer') {
    // Log unauthorized access attempt
    logger.warn(`Unauthorized access attempt to client management by user ${user.id} (role: ${user.role})`);
    return <Navigate to="/dashboard" replace />;
  }
  
  // ... rest of component
};
```

---

## FINDING #4 — CLIENT ID EXPOSED IN ARIA LABELS (PII LEAKAGE VECTOR)

**Severity:** MEDIUM
**Data at Risk:** Internal client IDs (database primary keys)
**Blast Radius:** Any user who inspects the DOM
**File & Line:** `ClientMiniCard.tsx` lines ~95-100, `ClientDetailView.tsx` lines ~105-115

**What's Wrong:**

```tsx
// ClientMiniCard.tsx — client name in aria-label (accessible to screen readers + DOM)
aria-label={`Select ${client.firstName} ${client.lastName}`}
aria-label={`Message ${client.firstName}`}
aria-label={`Log workout for ${client.firstName}`}
aria-label={`Record weigh-in for ${client.firstName} (overdue)`}

// ClientDetailView.tsx — tab panel ID contains active tab name (minor)
id={`detail-panel-${activeTab}`}
```

While aria-labels are necessary for accessibility, the combination of full client names in aria-labels + the `key={client.id}` prop means database primary keys are visible in the rendered HTML. An attacker with DOM access (XSS) can enumerate all client IDs and names.

**Fix:**

```tsx
// Use anonymized references in aria-labels where possible
// Or accept this as a necessary accessibility trade-off but document it

// For the key prop — use a non-sequential identifier if possible
// (This requires backend to provide UUIDs instead of sequential integers)

// Minimum fix: ensure client IDs are UUIDs, not sequential integers
// In the mapping code in MasterDetailLayout.tsx:
const mapped: MiniCardClient[] = (response.data.data?.clients || []).map((c: any) => ({
  id: c.uuid || c.id,  // Prefer UUID over sequential integer
  // ...
}));
```

---

## FINDING #5 — ENGAGEMENT SCORE CALCULATION IS LOSSY AND COULD MISREPRESENT CLIENT DATA

**Severity:** MEDIUM
**Data at Risk:** Client engagement records (misrepresentation, not deletion)
**Blast Radius:** All clients
**File & Line:** `MasterDetailLayout.tsx` lines ~118-122

**What's Wrong:**

```tsx
engagementScore: Math.min(100, Math.round(
  ((c.totalWorkouts || 0) * 5 + (c.clientSessions?.length || 0) * 10) / 2
)),
```

This formula is computed **client-side in the frontend** from raw data. Problems:

1. **Integer overflow risk**: A client with 1000 workouts gets `(1000 * 5) / 2 = 2500`, clamped to 100 — but the formula is wrong (dividing by 2 after multiplying both terms separately doesn't normalize correctly)
2. **Data misrepresentation**: A client with 0 workouts but 10 sessions gets score `50`, while a client with 10 workouts and 0 sessions gets score `25` — this asymmetry could cause trainers to deprioritize active clients
3. **`clientSessions?.length`**: This is the length of the sessions array loaded in the API response — if the API paginates sessions, this will always be wrong

**Fix:**

```tsx
// Move engagement score calculation to the backend where it has access to full data
// Frontend should receive pre-computed score from API

// If must compute frontend-side, use a correct formula:
const computeEngagementScore = (workouts: number, sessions: number): number => {
  if (workouts === 0 && sessions === 0) return 0;
  // Weighted score: sessions worth 2x workouts, normalized to 100
  const raw = (workouts * 1) + (sessions * 2);
  const maxExpected = 50; // Adjust based on business logic
  return Math.min(100, Math.round((raw / maxExpected) * 100));
};

engagementScore: computeEngagementScore(
  c.totalWorkouts || 0, 
  c.totalSessions || 0  // Use pre-aggregated count, not array length
),
```

---

## FINDING #6 — WEIGH-IN DATE CALCULATION USES CLIENT-SIDE TIME (TIMEZONE VULNERABILITY)

**Severity:** MEDIUM
**Data at Risk:** Weigh-in overdue status — could incorrectly flag clients as overdue
**Blast Radius:** All clients with weigh-in records
**File & Line:** `ClientMiniCard.tsx` lines ~55-68

**What's Wrong:**

```tsx
const isWeighInOverdue = (lastWeighIn: string | null | undefined): boolean => {
  if (!lastWeighIn) return true;  // ← null treated as overdue — correct
  const last = new Date(lastWeighIn);
  const now = new Date();  // ← Uses CLIENT'S local time, not server time
  const daysSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 30;
};
```

Issues:
1. `new Date()` uses the client's local timezone. A trainer in UTC-8 viewing a client whose weigh-in was recorded in UTC+5 could see incorrect overdue status
2. `new Date(lastWeighIn)` — if `lastWeighIn` is a date string without timezone info (e.g., `"2026-02-20"`), JavaScript parses it as UTC midnight, causing a 1-day offset in some timezones
3. No validation that `lastWeighIn` is a valid date string — `new Date("invalid")` returns `Invalid Date`, and `Invalid Date.getTime()` returns `NaN`, causing `NaN > 30` to be `false` (incorrectly shows as NOT overdue)

**Fix:**

```tsx
const isWeighInOverdue = (lastWeighIn: string | null | undefined): boolean => {
  if (!lastWeighIn) return true;
  
  const last = new Date(lastWeighIn);
  
  // Guard against invalid date strings
  if (isNaN(last.getTime())) {
    logger.warn(`Invalid lastWeighIn date: ${lastWeighIn}`);
    return true; // Treat invalid date as overdue (safer default)
  }
  
  const now = new Date();
  const daysSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 30;
};

// Better: have the backend send a pre-computed boolean
// API response: { ...client, isWeighInOverdue: true, daysSinceWeighIn: 45 }
```

---

## FINDING #7 — DESIGN PLAYGROUND TAB USES `import.meta.env` AT MODULE LOAD TIME

**Severity:** LOW
**Data at Risk:** Potential exposure of dev-only features in production if env var is misconfigured
**Blast Radius:** All admin users
**File & Line:** `dashboard-tabs.ts` lines ~235-245

**What's Wrong:**

```tsx
...(import.meta.env.VITE_DESIGN_PLAYGROUND === 'true' ? [{
  key: 'design-playground',
  // ...
}] : []),
```

This is evaluated at **module load time**, not at runtime. If `VITE_DESIGN_PLAYGROUND=true` is accidentally set in a production build (e.g., copied from a `.env.local` file into a CI/CD pipeline), the design playground tab will appear in production for all admin users. The playground likely contains experimental UI that could confuse or mislead the platform owner.

**Fix:**

```tsx
// Add an additional runtime guard
...(import.meta.env.VITE_DESIGN_PLAYGROUND === 'true' && import.meta.env.DEV ? [{
  key: 'design-playground',
  label: 'Design Playground',
  // ...
}] : []),

// Also add to CI/CD pipeline: explicitly assert VITE_DESIGN_PLAYGROUND is unset in prod builds
// In your build script:
// if [ "$NODE_ENV" = "production" ] && [ "$VITE_DESIGN_PLAYGROUND" = "true" ]; then
//   echo "ERROR: VITE_DESIGN_PLAYGROUND must not be true in production"
//   exit 1
// fi
```

---

## FINDING #8 — DEPRECATED `ADMIN_DASHBOARD_TABS` STILL EXPORTED AND USED

**Severity:** LOW
**Data at Risk:** Route misconfiguration could expose admin routes to wrong roles
**Blast Radius:** Admin users
**File & Line:** `dashboard-tabs.ts` lines ~65-70

**What's Wrong:**

```tsx
/**
 * @deprecated Use WORKSPACE_CONFIG

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
