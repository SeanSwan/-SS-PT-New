# [Component Name] - Business Logic Flowchart

**Component:** [Component Name]
**Created:** [Date]
**Last Updated:** [Date]
**Assigned To:** Claude Code (Business Logic Specialist)

---

## 📋 OVERVIEW

This file documents all business logic, decision trees, and error handling for [Component Name].

**Purpose:** Ensure every code path is documented before implementation begins.

---

## 🎯 USER FLOW: HAPPY PATH

```
START: User opens [Component Name]
│
├─ Step 1: [First Action]
│  └─ What happens: [Description]
│
├─ Step 2: [Second Action]
│  └─ What happens: [Description]
│
├─ Step 3: [Third Action]
│  └─ What happens: [Description]
│
└─ END: [Success State]
   └─ User sees: [What's displayed]
```

**Example:**
```
START: User opens ProgressChart
│
├─ Step 1: Component mounts
│  └─ Show skeleton loading UI
│
├─ Step 2: Fetch progress data from API
│  └─ Call GET /api/users/:id/progress
│
├─ Step 3: Render chart with data
│  └─ Use Recharts to display workout completion
│
└─ END: Chart visible
   └─ User sees: 30-day progress chart with interactive tooltips
```

---

## 🔀 DECISION TREE: ALL PATHS

### **Decision Point 1: Authentication**

```
Is user authenticated?
├─ YES → Continue to Decision Point 2
└─ NO → Redirect to /login
   └─ END: User must log in first
```

---

### **Decision Point 2: Feature Flag**

```
Is feature flag "[feature_name]" enabled?
├─ YES → Continue to Decision Point 3
└─ NO → Show fallback UI
   └─ What fallback shows: [Description]
   └─ END: User sees old version
```

---

### **Decision Point 3: Permissions**

```
Does user have permission to view this component?
├─ YES → Continue to Decision Point 4
└─ NO → Show "Access Denied" message
   └─ What message says: [Exact text]
   └─ What actions available: [None / Contact Admin / etc.]
   └─ END: User cannot access
```

---

### **Decision Point 4: Data Loading**

```
Call API: GET /api/[endpoint]
│
├─ Response: 200 OK
│  ├─ Is data valid?
│  │  ├─ YES → Parse data → Render component → END: Success
│  │  └─ NO → Show error "Invalid data received" → END: Error state
│  │
├─ Response: 401 Unauthorized
│  └─ Redirect to /login → END: User must log in again
│
├─ Response: 403 Forbidden
│  └─ Show "Access Denied" → END: User lacks permission
│
├─ Response: 404 Not Found
│  └─ Show "No data yet" + CTA → END: Empty state
│
├─ Response: 500 Server Error
│  └─ Show "Server error, please retry" + Retry button → END: Error state
│
└─ Network Error (timeout, no internet)
   └─ Show "Connection failed, please check internet" + Retry button → END: Error state
```

---

## 🚨 ERROR HANDLING: ALL SCENARIOS

### **Error 1: API Returns 500 (Server Error)**

**What user sees:**
```
┌─────────────────────────────────┐
│ ⚠️ Something went wrong        │
│                                 │
│ Our servers are experiencing    │
│ issues. Please try again in a   │
│ few moments.                    │
│                                 │
│ [Retry] [Dismiss]               │
└─────────────────────────────────┘
```

**What happens behind the scenes:**
1. Log error to Sentry with stack trace
2. Track analytics event: `[component]_error_500`
3. Show error banner (red background, warning icon)
4. Provide "Retry" button (calls API again)
5. Provide "Dismiss" button (closes banner, component stays in error state)

**Retry behavior:**
- Retry limit: 3 attempts
- Exponential backoff: 1s, 2s, 4s delays
- After 3 failures: Show "Please contact support" message

---

### **Error 2: API Returns 404 (Not Found)**

**What user sees:**
```
┌─────────────────────────────────┐
│      [Illustration]             │
│                                 │
│   No [Data] Yet                 │
│                                 │
│   You haven't [action] yet.     │
│   [Benefit of action].          │
│                                 │
│   [+ Add First [Data]]          │
└─────────────────────────────────┘
```

**What happens behind the scenes:**
1. Track analytics event: `[component]_empty_state`
2. Show empty state illustration (swan constellation with no stars)
3. Show friendly message (not alarming)
4. Show CTA button (primary style, action-oriented)

**CTA behavior:**
- Clicking CTA → Navigate to creation flow
- Example: "Add First Workout" → Navigate to /workouts/create

---

### **Error 3: Network Timeout (>30 seconds)**

**What user sees:**
```
┌─────────────────────────────────┐
│ ⚠️ Request Timed Out           │
│                                 │
│ The request took too long.      │
│ Please check your internet      │
│ connection and try again.       │
│                                 │
│ [Retry]                         │
└─────────────────────────────────┘
```

**What happens behind the scenes:**
1. Abort API request after 30 seconds
2. Log timeout to Sentry
3. Track analytics event: `[component]_timeout`
4. Show timeout error message
5. Provide "Retry" button

---

### **Error 4: Invalid Data Received (Validation Failed)**

**What user sees:**
```
┌─────────────────────────────────┐
│ ⚠️ Invalid Data                │
│                                 │
│ The data we received doesn't    │
│ look right. Our team has been   │
│ notified.                       │
│                                 │
│ [Retry] [Report Issue]          │
└─────────────────────────────────┘
```

**What happens behind the scenes:**
1. Validate API response against expected schema
2. If validation fails:
   - Log to Sentry with received data (sanitized)
   - Track analytics event: `[component]_invalid_data`
   - Show error message
3. Provide "Retry" button (maybe data is fixed)
4. Provide "Report Issue" button (opens support form)

**Validation rules:**
```javascript
// Example for ProgressChart
const isValidProgressData = (data) => {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true; // Empty is valid (404 handled separately)

  return data.every(item => {
    return (
      item.date && typeof item.date === 'string' &&
      item.value && typeof item.value === 'number' &&
      item.value >= 0 && item.value <= 100
    );
  });
};
```

---

## 🔄 STATE TRANSITIONS

### **State Machine:**

```
[Idle] → (User opens component) → [Loading]

[Loading] → (Data received & valid) → [Success]
[Loading] → (No data returned) → [Empty]
[Loading] → (API error) → [Error]

[Success] → (User refreshes) → [Refreshing]
[Success] → (User edits data) → [Updating]
[Success] → (User navigates away) → [Idle]

[Refreshing] → (Refresh successful) → [Success]
[Refreshing] → (Refresh failed) → [Error]

[Updating] → (Update successful) → [Success]
[Updating] → (Update failed) → [Error]

[Error] → (User clicks retry) → [Loading]
[Error] → (User dismisses) → [Idle]

[Empty] → (User clicks CTA) → Navigate to creation flow
[Empty] → (User navigates away) → [Idle]
```

---

## 🎬 USER INTERACTIONS

### **Interaction 1: User Clicks "Refresh" Button**

**Trigger:** User clicks refresh icon
**Pre-conditions:** Component in Success state
**Expected behavior:**
1. Show refreshing spinner (overlay on existing data)
2. Call API again (GET /api/[endpoint])
3. If successful: Update data, remove spinner
4. If failed: Show error banner, keep old data visible

**Code path:**
```javascript
const handleRefresh = async () => {
  setIsRefreshing(true);

  try {
    const response = await fetch(`/api/users/${userId}/progress`);

    if (response.ok) {
      const newData = await response.json();
      setData(newData);
      trackEvent('[component]_refreshed');
    } else {
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    showError('Failed to refresh data. Please try again.');
    logError(error);
  } finally {
    setIsRefreshing(false);
  }
};
```

---

### **Interaction 2: User Clicks "Retry" After Error**

**Trigger:** User clicks "Retry" button in error banner
**Pre-conditions:** Component in Error state
**Expected behavior:**
1. Dismiss error banner
2. Transition to Loading state
3. Retry API call
4. Handle response (same as initial load)

**Retry strategy:**
- Track retry count (max 3 attempts)
- Exponential backoff delays
- After 3 failures: Show "Contact support" message

---

### **Interaction 3: User Hovers Over Data Point (Desktop Only)**

**Trigger:** User hovers mouse over chart data point
**Pre-conditions:** Component in Success state, device is desktop (not mobile)
**Expected behavior:**
1. Show tooltip with detailed information
2. Highlight data point (scale 1.2x)
3. On mouse leave: Hide tooltip, reset scale

**Not applicable on mobile:**
- Mobile uses tap instead of hover
- Tap opens modal with details

---

## 🔐 SECURITY CHECKS

### **Security Check 1: Validate User Owns Data**

**Before loading data:**
```javascript
// Ensure user can only access their own data
if (userIdFromToken !== userIdFromParams) {
  return res.status(403).json({ error: 'Forbidden: Cannot access another user\'s data' });
}
```

---

### **Security Check 2: Sanitize User Input**

**Before saving data:**
```javascript
import DOMPurify from 'dompurify';

// Sanitize all user-provided strings
const sanitizedData = {
  ...data,
  userInput: DOMPurify.sanitize(data.userInput)
};
```

---

### **Security Check 3: Rate Limiting**

**API endpoint protection:**
```
Rate limit: 10 requests per minute per user
Exceeded: Return 429 Too Many Requests
Client behavior: Show "Too many requests, please wait [X] seconds"
```

---

## 🧪 EDGE CASES

### **Edge Case 1: User Has Zero Data**

**Scenario:** New user, never created any data
**Expected behavior:** Show empty state (not error state)
**What user sees:** Friendly empty state with CTA
**API response:** 200 OK with empty array `[]`

---

### **Edge Case 2: User Has Extremely Large Dataset (>10,000 items)**

**Scenario:** Power user with years of data
**Expected behavior:** Paginate or limit results
**API response:** Return only last 100 items (or last 30 days)
**Client behavior:** Show "Viewing last 30 days" message with option to view more

---

### **Edge Case 3: API Returns Partial Data (Some Fields Missing)**

**Scenario:** Database schema changed, old data doesn't have new fields
**Expected behavior:** Use default values for missing fields
**Example:**
```javascript
const chartData = rawData.map(item => ({
  date: item.date,
  value: item.value,
  label: item.label || 'No label', // Default if missing
  category: item.category || 'uncategorized' // Default if missing
}));
```

---

### **Edge Case 4: User Loses Internet Mid-Load**

**Scenario:** Component is loading, network disconnects
**Expected behavior:**
1. Detect network error (fetch promise rejects)
2. Show offline banner: "You're offline. Check your connection."
3. When online again: Auto-retry API call
4. Track analytics: `[component]_offline_detected`

---

## 📊 ANALYTICS TRACKING

### **Events to Track:**

| Event Name | When Triggered | Properties |
|------------|----------------|------------|
| `[component]_loaded` | Component successfully rendered with data | `userId`, `dataCount`, `loadTime` |
| `[component]_error_500` | API returns 500 error | `userId`, `errorMessage` |
| `[component]_error_403` | User lacks permission | `userId`, `attemptedAction` |
| `[component]_empty_state` | No data available (404 or empty array) | `userId`, `isNewUser` |
| `[component]_refreshed` | User manually refreshed data | `userId`, `previousDataCount`, `newDataCount` |
| `[component]_retry_clicked` | User clicked retry after error | `userId`, `errorType`, `retryCount` |
| `[component]_cta_clicked` | User clicked CTA in empty state | `userId`, `ctaAction` |
| `[component]_timeout` | API request timed out | `userId`, `timeoutDuration` |

**Implementation:**
```javascript
import { trackEvent } from '@/analytics';

trackEvent('[component]_loaded', {
  userId: user.id,
  dataCount: data.length,
  loadTime: performance.now() - startTime
});
```

---

## ✅ IMPLEMENTATION CHECKLIST

**Before marking this file as complete, verify:**

- [ ] All decision points documented (authentication, permissions, feature flags)
- [ ] All API responses handled (200, 401, 403, 404, 500, network error)
- [ ] All error messages user-friendly (no technical jargon)
- [ ] All retry logic specified (limits, delays, fallback)
- [ ] All state transitions defined (loading → success/error/empty)
- [ ] All user interactions documented (clicks, hovers, inputs)
- [ ] All security checks specified (auth, sanitization, rate limiting)
- [ ] All edge cases covered (zero data, large datasets, partial data)
- [ ] All analytics events tracked (success, errors, user actions)
- [ ] All validations specified (data schema, input rules)

**Assigned AI:** Claude Code
**Review Status:** [ ] In Progress [ ] Complete [ ] Needs Revision
**Completion Date:** [Date]

---

## 📝 NOTES

**Design Decisions:**
- [Any rationale for specific flows or error handling]
- [Tradeoffs made (e.g., UX vs. performance)]
- [Future improvements to consider]

**Dependencies:**
- [Other components this depends on]
- [APIs this calls]
- [Third-party libraries used]

**Assumptions:**
- [What we assume about user behavior]
- [What we assume about data quality]
- [What we assume about API reliability]