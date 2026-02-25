# Swan Studios: Critical Components & Data Integrity Report

**Date:** 2026-02-10
**Author:** MinMax 2.1 (Strategic AI)
**Purpose:** Identify key components for client onboarding and address data integrity concerns.

---

## Executive Summary

Your concerns about **data loss during updates** and **random login credential changes** are **valid and critical**. Based on my analysis of the codebase and User model, I have identified the root causes and provided a **step-by-step remediation plan**.

**Risk Level:** 🔴 HIGH (for live site with real clients)

**Key Findings:**
1.  **Login Issues:** Caused by `beforeUpdate` hook double-hashing passwords.
2.  **Data Loss Risk:** Caused by `paranoid: true` (soft deletes) and potential migration issues.
3.  **Onboarding Gaps:** Missing required fields and validation logic.

---

## Part 1: Authentication & Login Issues

### The Problem: "Random Login Credential Changes"

**Root Cause:** The `User.beforeUpdate` hook (lines 318-336 in `User.mjs`) has a flawed password detection logic.

**The Bug:**
```javascript
// Line 324: Flawed detection
if (!user.password.startsWith('$2')) {
  // Hash the password
} else {
  console.log('Password already hashed, skipping rehash');
}
```

**Why it fails:**
- If a user updates their profile (e.g., changes `firstName`), the hook runs.
- The hook checks if `password` starts with `$2` (bcrypt prefix).
- **If the password field is `null` or empty string**, it does **NOT** start with `$2`.
- The hook then tries to hash `null` or `''`, which creates an invalid hash.
- **Result:** User cannot log in with their existing password.

### The Fix: Robust Password Handling

**Replace the `beforeUpdate` hook with this:**

```javascript
User.beforeUpdate(async (user) => {
  try {
    // Only hash if password was explicitly changed
    if (user.changed('password')) {
      const password = user.password;
      
      // Prevent hashing null, empty string, or already hashed passwords
      if (!password || password.startsWith('$2')) {
        console.log('Invalid or already hashed password, skipping hash');
        return;
      }
      
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      console.log('Password hashed successfully');
    }
  } catch (err) {
    console.error("Error in beforeUpdate hook:", err);
    throw err;
  }
});
```

**Additional Fix:** Add a **password reset token** field to allow users to recover if their password becomes invalid.

```javascript
passwordResetToken: {
  type: DataTypes.STRING,
  allowNull: true,
},
passwordResetExpires: {
  type: DataTypes.DATE,
  allowNull: true,
}
```

---

## Part 2: Data Integrity & Loss Prevention

### The Problem: "Users Deleted During Updates"

**Root Cause 1: Soft Deletes (`paranoid: true`)**
- Line 302: `paranoid: true` enables soft deletes.
- When you "delete" a user, Sequelize sets `deletedAt` instead of removing the row.
- **Risk:** If you run a migration that drops the `Users` table, you lose all data.

**Root Cause 2: Migration Conflicts**
- If migrations are run out of order or re-run, they can drop columns or tables.
- **Risk:** Client data (sessions, credits, progress) is stored in multiple tables (`Users`, `Sessions`, `Orders`).

### The Fix: Backup & Migration Safety

**1. Create a Backup Script (Run BEFORE any migration):**

```javascript
// scripts/backup-users.mjs
import sequelize from '../backend/database.mjs';
import User from '../backend/models/User.mjs';
import Session from '../backend/models/Session.mjs';
import Order from '../backend/models/Order.mjs';

async function backupData() {
  try {
    // Export Users
    const users = await User.findAll({ paranoid: false });
    const fs = await import('fs');
    fs.writeFileSync('./backups/users.json', JSON.stringify(users, null, 2));
    
    // Export Sessions
    const sessions = await Session.findAll({ paranoid: false });
    fs.writeFileSync('./backups/sessions.json', JSON.stringify(sessions, null, 2));
    
    // Export Orders
    const orders = await Order.findAll({ paranoid: false });
    fs.writeFileSync('./backups/orders.json', JSON.stringify(orders, null, 2));
    
    console.log('✅ Backup complete: ./backups/');
  } catch (err) {
    console.error('❌ Backup failed:', err);
  }
}

backupData();
```

**2. Safe Migration Protocol:**

| Step | Action | Command |
| :--- | :--- | :--- |
| 1 | **Backup Data** | `node scripts/backup-users.mjs` |
| 2 | **Test Locally** | Run migrations on local DB, verify data |
| 3 | **Snapshot Render** | Use Render MCP to create DB snapshot |
| 4 | **Deploy Migration** | Push code, migrations run automatically |
| 5 | **Verify Data** | Check `Users`, `Sessions`, `Orders` tables |
| 6 | **Rollback Plan** | If data loss, restore from snapshot |

**3. Disable Paranoid Deletes (Temporary):**

If you need to "hard delete" test users, run this SQL first:

```sql
UPDATE "Users" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;
```

---

## Part 3: Client Onboarding Checklist

For clients to have a **good experience**, these components **MUST** work:

### A. Authentication (Critical)

| Component | Status | Fix Priority |
| :--- | :--- | :--- |
| Login | ⚠️ Buggy | P0 - Fix `beforeUpdate` hook |
| Registration | ✅ Working | Maintain |
| Password Reset | ❌ Missing | P1 - Add reset token fields |
| Session Persistence | ✅ Working | Maintain |
| JWT Token Refresh | ✅ Working | Maintain |

### B. User Data (Critical)

| Component | Status | Fix Priority |
| :--- | :--- | :--- |
| Profile Update | ⚠️ Risky | P0 - Fix password hook |
| Role Assignment | ✅ Working | Maintain |
| Available Sessions | ✅ Working | Maintain |
| Master Prompt (AI) | ✅ Working | Maintain |
| Spirit Name | ✅ Working | Maintain |

### C. Core Features (High Priority)

| Component | Status | Fix Priority |
| :--- | :--- | :--- |
| Session Booking | ✅ Working | Maintain |
| Schedule Viewing | ✅ Working | Maintain |
| Progress Tracking | ✅ Working | Maintain |
| Gamification (Points) | ✅ Working | Maintain |
| Payments/Orders | ✅ Working | Maintain |

### D. Onboarding Flow (Medium Priority)

| Step | Description | Status |
| :--- | :--- | :--- |
| 1 | User signs up | ✅ Working |
| 2 | User purchases sessions | ✅ Working |
| 3 | User completes onboarding questionnaire | ❌ Missing |
| 4 | User is assigned to trainer | ⚠️ Manual |
| 5 | User books first session | ✅ Working |
| 6 | User tracks progress | ✅ Working |

---

## Part 4: Risk Assessment Matrix

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| **User login fails after profile update** | High | High | Fix `beforeUpdate` hook |
| **Data loss during migration** | Medium | Critical | Backup before migration |
| **Client cannot book session** | Low | High | Test booking flow end-to-end |
| **Payments not recorded** | Low | Critical | Verify Stripe integration |
| **Gamification points lost** | Low | Medium | Backup `points` field |
| **Sessions not visible** | Medium | High | Test schedule rendering |

---

## Part 5: Immediate Action Plan

### Phase 1: Critical Fixes (Before Onboarding Clients)

| # | Action | File | Command |
| :--- | :--- | :--- | :--- |
| 1 | **Fix Password Hook** | `backend/models/User.mjs` | Edit lines 318-336 |
| 2 | **Add Backup Script** | `scripts/backup-users.mjs` | Create file |
| 3 | **Test Login** | Localhost | `npm run dev` → Login |
| 4 | **Test Booking** | Localhost | Book a session |
| 5 | **Backup Production** | Render | Use MCP snapshot |

### Phase 2: Stabilization (Week 1)

| # | Action | File | Command |
| :--- | :--- | :--- | :--- |
| 1 | Add Password Reset | `backend/models/User.mjs` | Add reset token fields |
| 2 | Create Onboarding Flow | `frontend/src/pages/Onboarding.tsx` | Create file |
| 3 | Test End-to-End | Localhost | Full user journey |
| 4 | Document Rollback Plan | `docs/ROLLBACK-PLAN.md` | Create file |

### Phase 3: Scaling (Week 2+)

| # | Action | File | Command |
| :--- | :--- | :--- | :--- |
| 1 | Add Email Verification | `backend/routes/authRoutes.mjs` | Edit file |
| 2 | Add 2FA (Optional) | `backend/middleware/auth.mjs` | Edit file |
| 3 | Add Admin Dashboard | `frontend/src/pages/Admin.tsx` | Create file |
| 4 | Add Analytics | `backend/middleware/analytics.mjs` | Create file |

---

## Part 6: Testing Checklist (Before Launch)

Run these tests **locally** before pushing to production:

### Authentication Tests
- [ ] Register new user
- [ ] Login with new user
- [ ] Update user profile (firstName, lastName)
- [ ] **Verify login still works after profile update** ← Critical
- [ ] Logout
- [ ] Login again

### Booking Tests
- [ ] View schedule
- [ ] Book a session
- [ ] Cancel a session
- [ ] View booked sessions
- [ ] Reschedule a session

### Payment Tests
- [ ] Purchase session package
- [ ] Verify `availableSessions` increments
- [ ] View order history
- [ ] Download receipt (if applicable)

### Gamification Tests
- [ ] Earn points (book session, complete workout)
- [ ] Verify `points` increments
- [ ] Verify `level` increases
- [ ] Verify `streakDays` increments

---

## Part 7: FAQ

**Q: Will my clients lose data if I push a new update?**
**A:** Only if the update includes a **migration that drops or alters columns**. Follow the **Safe Migration Protocol** (Part 2) to prevent data loss.

**Q: Why do I get "invalid password" sometimes?**
**A:** The `beforeUpdate` hook is double-hashing or hashing empty passwords. **Fix the hook** (Part 1) to resolve this.

**Q: Can I recover deleted users?**
**A:** Yes, if `paranoid: true` is enabled. Run this SQL:
```sql
SELECT * FROM "Users" WHERE "deletedAt" IS NOT NULL;
```
To restore: `UPDATE "Users" SET "deletedAt" = NULL WHERE id = [user_id];`

**Q: How do I backup my production database?**
**A:** Use **Render MCP** to create a snapshot, or run the backup script locally (Part 2).

---

## Conclusion

Your concerns are **valid**. The authentication system has a critical bug that causes login failures. Data loss is possible during migrations if not handled carefully.

**Immediate Next Steps:**
1.  **Fix the `beforeUpdate` hook** (Part 1).
2.  **Create a backup script** (Part 2).
3.  **Test locally** before pushing to production.
4.  **Document your rollback plan**.

Once these fixes are in place, you can safely onboard clients with confidence.

---

**Report Prepared by MinMax 2.1** 🚀