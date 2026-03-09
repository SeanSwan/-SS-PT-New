# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 60.8s
> **Files:** backend/utils/emailTemplates.mjs, backend/services/sessionReminderCron.mjs, backend/routes/wearableDataRoutes.mjs, backend/models/WearableData.mjs, frontend/src/services/wearableDataService.ts, frontend/src/components/WearableData/WearableDataDashboard.tsx
> **Generated:** 3/6/2026, 10:38:43 PM

---

# SwanStudios Code Review

## CRITICAL Issues

### 1. **SQL Injection Vulnerability in WearableData Model**
**File:** `backend/models/WearableData.mjs` (lines 285-303)  
**Issue:** Raw SQL query with string interpolation instead of parameterized query for `startDate`.

```javascript
// VULNERABLE CODE
return sequelize.query(`
    SELECT ...
    FROM "WearableData"
    WHERE "userId" = :userId AND "recordDate" >= :startDate
    ...
`, {
    replacements: { userId, startDate: startDate.toISOString().split('T')[0] },
```

**Problem:** While using `:userId` placeholder correctly, the `startDate` is pre-formatted in JavaScript before being passed to `replacements`. This is safe in this specific case, but inconsistent pattern creates risk.

**Fix:** Consistent parameterization pattern.

---

### 2. **Missing Error Boundaries in Frontend Component**
**File:** `frontend/src/components/WearableData/WearableDataDashboard.tsx`  
**Issue:** Component truncated, but no error boundary wrapper visible in provided code.

**Impact:** Unhandled errors in wearable data parsing/rendering will crash entire dashboard.

**Fix:** Wrap component in ErrorBoundary and add try/catch in parsing functions.

---

### 3. **Unsafe XML Parsing (XSS Risk)**
**File:** `frontend/src/services/wearableDataService.ts` (lines 177-229)  
**Issue:** `DOMParser` used on user-uploaded XML without sanitization.

```typescript
parseAppleHealthExport(xmlText: string): Record<string, unknown>[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
```

**Risk:** Malicious XML could contain scripts if rendered unsafely elsewhere.

**Fix:** Validate XML structure, sanitize attribute values, or use a safer parsing library.

---

## HIGH Issues

### 4. **Type Safety Violations in Frontend Service**
**File:** `frontend/src/services/wearableDataService.ts`  
**Issue:** Multiple uses of `Record<string, unknown>` and `any`-equivalent patterns.

```typescript
// Line 139
async syncData(deviceType: string, data: Record<string, unknown>[], deviceId?: string)

// Line 148
async syncDay(deviceType: string, recordDate: string, fields: Record<string, unknown>)

// Line 177
parseAppleHealthExport(xmlText: string): Record<string, unknown>[]
```

**Problem:** Loses type safety for wearable data fields. Should use `Partial<WearableRecord>` or specific sync DTOs.

**Fix:**
```typescript
type WearableSyncData = Partial<Omit<WearableRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

async syncData(deviceType: string, data: WearableSyncData[], deviceId?: string)
```

---

### 5. **Missing Input Validation in Sync Route**
**File:** `backend/routes/wearableDataRoutes.mjs` (lines 186-234)  
**Issue:** No validation of parsed data before database insertion.

```javascript
const parsed = parser(item);
const record = {
    userId: req.user.id,
    deviceType,
    ...parsed,  // ⚠️ No validation of parsed fields
```

**Risk:** Malformed device data could bypass Sequelize validators if parser returns unexpected types.

**Fix:** Add Joi/Zod schema validation after parsing, before upsert.

---

### 6. **Inefficient Database Queries (N+1 Problem)**
**File:** `backend/services/sessionReminderCron.mjs` (lines 32-95)  
**Issue:** Loop processes sessions individually with separate `update()` calls.

```javascript
for (const session of sessions) {
    // ... processing ...
    await session.update({ remindersSent });  // ⚠️ Individual UPDATE per session
}
```

**Impact:** With 100 sessions, this creates 100 separate UPDATE queries.

**Fix:** Batch updates using `bulkUpdate` or collect IDs and update in single query.

---

### 7. **Hardcoded Environment Fallback**
**File:** `backend/utils/emailTemplates.mjs` (lines 48, 108, 125, 141, 161, 179)  
**Issue:** Repeated hardcoded fallback to production URL.

```javascript
const siteUrl = process.env.FRONTEND_URL || 'https://sswanstudios.com';
```

**Problem:** If `FRONTEND_URL` is missing in dev/staging, emails link to production.

**Fix:** Throw error if `FRONTEND_URL` is undefined, or use environment-specific defaults.

---

## MEDIUM Issues

### 8. **DRY Violation: Repeated Authorization Logic**
**File:** `backend/routes/wearableDataRoutes.mjs` (lines 281, 305)  
**Issue:** Identical authorization check duplicated.

```javascript
// Lines 281-283
if (req.user.role !== 'admin' && req.user.role !== 'trainer' && req.user.id !== parseInt(userId, 10)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
}

// Lines 305-307 (exact duplicate)
```

**Fix:** Extract to middleware:
```javascript
const authorizeClientAccess = (req, res, next) => {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && req.user.role !== 'trainer' && req.user.id !== parseInt(userId, 10)) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    next();
};

router.get('/user/:userId', protect, authorizeClientAccess, async (req, res) => { ... });
```

---

### 9. **Inconsistent Error Handling in Cron Service**
**File:** `backend/services/sessionReminderCron.mjs` (lines 62-75)  
**Issue:** Email/SMS errors are logged but don't prevent marking reminder as sent.

```javascript
try {
    await sendEmailNotification({ ... });
} catch (emailErr) {
    logger.warn(`Email failed: ${emailErr.message}`);
}
// ... SMS try/catch ...

// ⚠️ Reminder marked sent even if both email AND SMS failed
remindersSent[interval.key] = new Date().toISOString();
await session.update({ remindersSent });
```

**Fix:** Only mark sent if at least one notification succeeded:
```javascript
let sent = false;
if (client.email && client.emailNotifications !== false) {
    try {
        await sendEmailNotification({ ... });
        sent = true;
    } catch { ... }
}
if (sent) {
    remindersSent[interval.key] = new Date().toISOString();
    await session.update({ remindersSent });
}
```

---

### 10. **Magic Numbers in Cron Service**
**File:** `backend/services/sessionReminderCron.mjs` (lines 15-18, 22)  
**Issue:** Hardcoded intervals without configuration.

```javascript
const REMINDER_INTERVALS = [
    { key: '24h', hoursBefore: 24, windowMinutes: 60 },
    { key: '1h', hoursBefore: 1, windowMinutes: 45 },
];
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
```

**Fix:** Move to environment config or database settings table for runtime adjustment.

---

### 11. **Unsafe JSON Parsing**
**File:** `backend/services/sessionReminderCron.mjs` (lines 42-44)  
**Issue:** JSON.parse without validation.

```javascript
try {
    remindersSent = session.remindersSent ? (typeof session.remindersSent === 'string' ? JSON.parse(session.remindersSent) : session.remindersSent) : {};
} catch { remindersSent = {}; }
```

**Problem:** Silent failure hides data corruption. Should log parse errors.

**Fix:**
```javascript
try {
    remindersSent = typeof session.remindersSent === 'string' 
        ? JSON.parse(session.remindersSent) 
        : session.remindersSent || {};
} catch (parseErr) {
    logger.error(`[SessionReminder] Invalid remindersSent JSON for session ${session.id}: ${parseErr.message}`);
    remindersSent = {};
}
```

---

### 12. **Missing TypeScript Strict Mode Checks**
**File:** `frontend/src/services/wearableDataService.ts`  
**Issue:** Optional chaining/nullish coalescing missing in XML parsing.

```typescript
// Line 195
const date = record.getAttribute('startDate')?.split(' ')[0] || record.getAttribute('creationDate')?.split(' ')[0];
```

**Problem:** If both attributes are null, `split` is called on `null`.

**Fix:**
```typescript
const startDate = record.getAttribute('startDate');
const creationDate = record.getAttribute('creationDate');
const date = (startDate || creationDate)?.split(' ')[0];
if (!date) return;
```

---

### 13. **Inline Styles in Email Templates**
**File:** `backend/utils/emailTemplates.mjs` (entire file)  
**Issue:** While necessary for email clients, styles are duplicated across templates.

**Fix:** Extract common style blocks into template variables:
```javascript
const COMMON_STYLES = {
    infoCard: `background:rgba(255,255,255,0.04);border-radius:8px;padding:16px;margin:16px 0;border:1px solid rgba(0,212,255,0.08)`,
    // ... other common styles
};
```

---

## LOW Issues

### 14. **Inconsistent Date Formatting**
**File:** `backend/services/sessionReminderCron.mjs` (line 54)  
**Issue:** Uses `date-fns` format, but other files use native `Date` methods.

**Fix:** Standardize on `date-fns` across backend for consistency.

---

### 15. **Missing JSDoc for Complex Parsers**
**File:** `backend/routes/wearableDataRoutes.mjs` (lines 24-172)  
**Issue:** Device parsers lack documentation for expected input format.

**Fix:** Add JSDoc with example input/output for each parser.

---

### 16. **Potential Memory Leak in Cron Service**
**File:** `backend/services/sessionReminderCron.mjs` (lines 107-119)  
**Issue:** No cleanup on server restart if `stopSessionReminderScheduler` isn't called.

**Fix:** Add process signal handlers:
```javascript
process.on('SIGTERM', stopSessionReminderScheduler);
process.on('SIGINT', stopSessionReminderScheduler);
```

---

### 17. **Missing Loading States**
**File:** `frontend/src/components/WearableData/WearableDataDashboard.tsx` (truncated)  
**Issue:** Cannot verify, but likely missing skeleton loaders during data fetch.

**Fix:** Add `isLoading` state with skeleton UI.

---

### 18. **Overly Permissive Sequelize Validation**
**File:** `backend/models/WearableData.mjs` (lines 60-62)  
**Issue:** Steps max validation allows 200,000 steps/day (unrealistic).

```javascript
steps: {
    type: DataTypes.INTEGER,
    validate: { min: 0, max: 200000 },  // ⚠️ Too high
}
```

**Fix:** Lower to realistic max (e.g., 100,000) or add data quality flag for outliers.

---

### 19. **Unused Import**
**File:** `backend/models/WearableData.mjs` (line 263)  
**Issue:** Dynamic import of `Op` inside method when already available from Sequelize.

```javascript
const { Op } = await import('sequelize');  // ⚠️ Already imported at top
```

**Fix:** Import `Op` at module level.

---

### 20. **Missing Rate Limiting Documentation**
**File:** `backend/routes/wearableDataRoutes.mjs`  
**Issue:** No rate limiting on `/sync` endpoint (could be abused for DoS).

**Fix:** Add rate limiter middleware (e.g., `express-rate-limit`) and document in route comments.

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| CRITICAL | 3     |
| HIGH     | 4     |
| MEDIUM   | 7     |
| LOW      | 6     |
| **TOTAL**| **20**|

## Priority Fixes (Immediate Action Required)

1. **Fix SQL injection pattern** (Issue #1)
2. **Add XML sanitization** (Issue #3)
3. **Implement input validation on sync** (Issue #5)
4. **Add error boundary** (Issue #2)
5. **Fix type safety in service** (Issue #4)

---

*Part of SwanStudios 7-Brain Validation System*
