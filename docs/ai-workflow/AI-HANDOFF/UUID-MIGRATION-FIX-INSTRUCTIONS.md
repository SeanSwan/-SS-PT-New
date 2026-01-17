# UUID → INTEGER MIGRATION FIX INSTRUCTIONS

**Date:** 2026-01-15
**Issue:** Systemic UUID foreign key mismatches in 19+ migration files
**Root Cause:** Migrations using `Sequelize.UUID` for foreign keys while `users.id` is `INTEGER`

---

## ✅ FIXED SO FAR

1. ✅ `20260102000001-create-renewal-alerts.cjs` + `RenewalAlert.mjs`
2. ✅ `20260102000002-create-body-measurements.cjs` + `BodyMeasurement.mjs`

---

## 🚨 REMAINING FILES TO FIX

Based on `grep -l "type: Sequelize.UUID"` scan, these migrations need fixing:

### Priority 1: Blocking Phase 0.2 (Fix Immediately)
1. `20260102000003-create-measurement-milestones.cjs`
2. `20260102000004-create-progress-reports.cjs`
3. `20260102000005-create-workout-templates.cjs`
4. `20260102000006-add-sessiontype-to-workout-sessions.cjs`

### Priority 2: Will Block Future Migrations
5. `20240115000000-update-orientation-model.cjs`
6. `20250212060728-create-user-table.cjs` (may be the source table - CHECK FIRST)
7. `20250506000001-create-orders.cjs`
8. `20250506000002-create-food-scanner.cjs`
9. `20250508123457-create-notifications.cjs`
10. `20250601000003-create-enhanced-social-media-platform.cjs`
11. `20250714000001-create-workout-sessions-table.cjs`
12. `20250714000002-create-daily-workout-forms.cjs`
13. `20251112000000-create-nasm-integration-tables.cjs`
14. `20251113000000-create-exercise-library-table.cjs`
15. `20251118000000-create-exercise-videos-table.cjs`
16. `20251118000001-create-video-analytics-table.cjs`
17. `20251118000003-enhance-exercise-library-table.cjs`

### Special Cases
- `DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs` (review - may be previous fix attempt)
- `UUID-INTEGER-TYPE-MISMATCH-FIX.cjs` (review - appears to be comprehensive fix migration)

---

## 📋 FIX PATTERN

For EACH migration file:

### 1. Change Primary Key
```diff
- id: {
-   type: Sequelize.UUID,
-   defaultValue: Sequelize.UUIDV4,
-   primaryKey: true,
- },
+ id: {
+   type: Sequelize.INTEGER,
+   autoIncrement: true,
+   primaryKey: true,
+ },
```

### 2. Change Foreign Keys
```diff
- userId: {
-   type: Sequelize.UUID,
-   allowNull: false,
-   references: {
-     model: 'Users',
-     key: 'id',
-   },
- },
+ userId: {
+   type: Sequelize.INTEGER,
+   allowNull: false,
+   references: {
+     model: 'users',
+     key: 'id',
+   },
+ },
```

**Note:** Also change `model: 'Users'` → `model: 'users'` (lowercase table name)

### 3. Update Corresponding Model File

Find the model in `backend/models/` and apply the same changes using `DataTypes.INTEGER`.

---

## 🎯 IMMEDIATE ACTION PLAN

**ChatGPT-5:** Execute this plan to unblock Phase 0.2:

### Option A: Fix Next 4 Migrations Manually (Fastest for Phase 0)
Fix only the migrations blocking Phase 0.2 (Priority 1 list above):
1. `20260102000003-create-measurement-milestones.cjs` + model
2. `20260102000004-create-progress-reports.cjs` + model
3. `20260102000005-create-workout-templates.cjs` + model
4. `20260102000006-add-sessiontype-to-workout-sessions.cjs` (may only ALTER existing table)

Then run `npm run migrate` to get past these and reach the `client_*` tables.

### Option B: Use Existing UUID-INTEGER-TYPE-MISMATCH-FIX.cjs (If It Works)
1. Review `UUID-INTEGER-TYPE-MISMATCH-FIX.cjs` to see what it fixes
2. If it's comprehensive, rename it to run BEFORE problem migrations:
   ```bash
   mv UUID-INTEGER-TYPE-MISMATCH-FIX.cjs 20260101000000-uuid-integer-fix.cjs
   ```
3. Run `npm run migrate`

### Option C: Fix All 19+ Migrations (Most Thorough)
Fix all UUID migrations now to prevent future issues. This is time-consuming but prevents repeated blockers.

---

## ✅ RECOMMENDATION

**Use Option A** to unblock Phase 0.2 immediately. We can fix the remaining Priority 2 migrations later as a dedicated cleanup task.

**Estimated Time:**
- Option A: 30-40 minutes (fix 4 migrations + models)
- Option B: 10 minutes (if existing fix works)
- Option C: 2-3 hours (fix all 19+ migrations)

---

## 📝 NEXT STEPS AFTER FIX

1. Run `npm run migrate`
2. Verify all client_* tables created
3. Continue with Phase 0.3-0.5
4. Mark Phase 0 COMPLETE
5. Schedule Priority 2 UUID fix for later (create ticket in CURRENT-TASK.md)

---

**END OF FIX INSTRUCTIONS**
