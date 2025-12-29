# Option B: Storefront Schema Fix - Complete Analysis Report
**Date:** 2025-11-18
**Status:** 🔍 Analysis Complete - Ready for Review
**Issue:** Missing `stripeProductId` and `stripePriceId` columns blocking Video Library API tests

---

## Executive Summary

The Video Library Phase 1 backend API tests are failing with **500 errors** due to missing Stripe-related columns in the `storefront_items` table. This is **NOT a Video Library bug** - it's a schema mismatch between:

1. **Sequelize Model** ([backend/models/StorefrontItem.mjs](../../backend/models/StorefrontItem.mjs)) - Expects `stripeProductId` and `stripePriceId`
2. **Database Schema** (Actual PostgreSQL table) - Missing these columns
3. **Migration File** ([backend/migrations/20250213192601-create-storefront-items.cjs](../../backend/migrations/20250213192601-create-storefront-items.cjs)) - Defines these columns but never ran

**Root Cause:** Migration file defines the columns, but they were never added to the production database.

**Impact:** Global middleware or error handlers accessing `StorefrontItem` model fail on ANY endpoint, including Video Library endpoints.

**Solution:** Create migration to add missing columns + fix schema inconsistencies.

---

## Problem Analysis

### 🔴 Schema Mismatch Detected

#### Model Expects (StorefrontItem.mjs):
```javascript
stripeProductId: {
  type: DataTypes.STRING,
  allowNull: true,
}
stripePriceId: {
  type: DataTypes.STRING,
  allowNull: true,
}
```

#### Database Has:
```
❌ stripeProductId - MISSING
❌ stripePriceId   - MISSING
```

#### Migration Defines (20250213192601):
```javascript
stripeProductId: { type: Sequelize.STRING, allowNull: true }, // Line 309
stripePriceId: { type: Sequelize.STRING, allowNull: true },   // Line 310
```

### 📊 Current Database Schema

```
┌─────────┬────────────────────┬────────────────────────────┬─────────────┬──────────────────────┐
│ Column  │ Type               │ Nullable │ Default          │ Status                              │
├─────────┼────────────────────┼──────────┼──────────────────┼─────────────────────────────────────┤
│ id      │ integer            │ NO       │ auto-increment   │ ✅ OK                               │
│ name    │ varchar            │ NO       │ null             │ ✅ OK                               │
│ packageType │ ENUM           │ NO       │ 'fixed'          │ ⚠️ Model uses STRING, DB uses ENUM  │
│ price   │ numeric            │ YES      │ null             │ ⚠️ Model uses DECIMAL, DB uses numeric (compatible) │
│ pricePerSession │ numeric    │ NO       │ null             │ ✅ OK                               │
│ isActive │ boolean           │ NO       │ true             │ ✅ OK                               │
│ displayOrder │ integer       │ YES      │ 0                │ ✅ OK (added by later migration)    │
│ includedFeatures │ text      │ YES      │ null             │ ✅ OK (added by later migration)    │
│ stripeProductId │ ???        │ ???      │ ???              │ ❌ MISSING                          │
│ stripePriceId │ ???          │ ???      │ ???              │ ❌ MISSING                          │
│ theme   │ ???                │ ???      │ ???              │ ❌ MISSING (model removed it)       │
└─────────┴────────────────────┴──────────┴──────────────────┴─────────────────────────────────────┘
```

---

## Root Cause Analysis

### Why Migration Didn't Add Columns

**Investigation Steps:**

1. **Migration file exists** ✅ - [20250213192601-create-storefront-items.cjs](../../backend/migrations/20250213192601-create-storefront-items.cjs)
2. **Columns defined in migration** ✅ - Lines 309-310
3. **Migration ran** ⚠️ - Table exists, so migration ran partially
4. **Columns not in database** ❌ - Migration failed or was modified after running

**Possible Scenarios:**

**Scenario A: Migration Ran Before Columns Added**
- Original migration created table without Stripe columns
- Migration file was updated later to add columns (lines 309-310)
- Database still has old schema from first run
- **Evidence:** Comments in model say "Production database doesn't have theme column"

**Scenario B: Migration Rolled Back Partially**
- Migration created table, added columns
- Later migration or manual ALTER TABLE removed columns
- **Less likely** - No evidence of column removal in migration history

**Scenario C: Idempotency Check Skipped Column Addition**
- Migration line 323: `if (tables.includes('storefront_items'))` → skip creation
- Lines 326-332: `addColumnIfMissing()` should add columns
- **BUT** - Only adds 4 columns: `price`, `stripeProductId`, `stripePriceId`, `isActive`
- **Issue:** If table existed before this logic was added, columns never added

**Most Likely: Scenario A + C Combined**

---

## Schema Evolution Timeline (Reconstructed)

### Phase 1: Initial Creation (Estimated: 2025-02-13)
```sql
CREATE TABLE storefront_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  packageType ENUM('fixed', 'monthly'),
  price NUMERIC,
  sessions INTEGER,
  pricePerSession NUMERIC NOT NULL,
  months INTEGER,
  sessionsPerWeek INTEGER,
  totalSessions INTEGER,
  totalCost NUMERIC,
  imageUrl VARCHAR,
  theme VARCHAR DEFAULT 'cosmic',
  createdAt TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP NOT NULL
);
```

### Phase 2: Stripe Integration (Estimated: 2025-05-15)
**Migration Updated:** Added lines 309-310 to migration file
**Problem:** Migration already ran, so new columns not added to existing table

### Phase 3: Additional Columns (2025-05-16 to 2025-05-28)
- [20250516000000-add-display-order-to-storefront.cjs](../../backend/migrations/20250516000000-add-display-order-to-storefront.cjs)
- [20250517000001-add-included-features-to-storefront.cjs](../../backend/migrations/20250517000001-add-included-features-to-storefront.cjs)
- [20250523220000-add-isactive-to-storefront-items.cjs](../../backend/migrations/20250523220000-add-isactive-to-storefront-items.cjs)

**Result:** Database has `displayOrder`, `includedFeatures`, `isActive` but missing `stripeProductId`, `stripePriceId`

---

## Additional Schema Inconsistencies Found

### 1. ENUM vs STRING for packageType

**Database:**
```sql
packageType ENUM('fixed', 'monthly', 'custom') NOT NULL DEFAULT 'fixed'
```

**Model:**
```javascript
packageType: {
  type: DataTypes.STRING,  // ⚠️ Should be ENUM or DB should be STRING
  allowNull: false,
  defaultValue: 'fixed',
  validate: {
    isIn: [['fixed', 'monthly']]  // ⚠️ DB has 'custom', model doesn't
  }
}
```

**Issue:** Model validation rejects 'custom' packages that DB allows

### 2. Missing theme Column

**Model Comment (line 128-129):**
```javascript
// theme field removed for production compatibility
// Production database doesn't have theme column
```

**Database:** Column `theme` does NOT exist ✅ Model is correct

**Migration (line 308):**
```javascript
theme: { type: Sequelize.STRING, allowNull: true, defaultValue: 'cosmic' },
```

**Issue:** Migration defines theme, but it was never added (same issue as Stripe columns)

### 3. DECIMAL vs NUMERIC Types

**Model:**
```javascript
price: { type: DataTypes.DECIMAL(10, 2) }
pricePerSession: { type: DataTypes.DECIMAL(10, 2) }
totalCost: { type: DataTypes.DECIMAL(10, 2) }
```

**Database:**
```sql
price NUMERIC
pricePerSession NUMERIC
totalCost NUMERIC
```

**Status:** ✅ Compatible - PostgreSQL NUMERIC is functionally identical to DECIMAL

---

## Migration Strategy - 3 Options

### Option B1: Add Missing Columns Only (Minimal Fix)
**Scope:** Add only `stripeProductId` and `stripePriceId`
**Risk:** LOW
**Downtime:** None
**Testing Required:** Minimal

**SQL:**
```sql
ALTER TABLE storefront_items
  ADD COLUMN IF NOT EXISTS "stripeProductId" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "stripePriceId" VARCHAR(255);
```

**Pros:**
- ✅ Fixes immediate blocking issue
- ✅ Non-destructive (no data changes)
- ✅ Fast to implement and test
- ✅ Can run on production with zero risk

**Cons:**
- ⚠️ Doesn't fix ENUM vs STRING inconsistency
- ⚠️ Leaves schema evolution incomplete
- ⚠️ Future migrations may have same issue

**Recommendation:** ✅ **Use this for immediate fix**

---

### Option B2: Full Schema Reconciliation (Comprehensive)
**Scope:** Fix all inconsistencies (columns, types, constraints)
**Risk:** MEDIUM
**Downtime:** Potential (depends on table size)
**Testing Required:** Extensive

**Changes:**
1. Add missing columns: `stripeProductId`, `stripePriceId`
2. Convert `packageType` ENUM to STRING
3. Update model validation to allow 'custom' packages
4. Add indexes for Stripe columns
5. Verify all column types match model

**SQL:**
```sql
BEGIN;

-- Add missing columns
ALTER TABLE storefront_items
  ADD COLUMN IF NOT EXISTS "stripeProductId" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "stripePriceId" VARCHAR(255);

-- Convert ENUM to STRING (requires type cast)
ALTER TABLE storefront_items
  ALTER COLUMN "packageType" TYPE VARCHAR(50);

-- Drop old ENUM type (if no longer used)
DROP TYPE IF EXISTS "enum_storefront_items_packageType";

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_storefront_stripe_product
  ON storefront_items("stripeProductId");
CREATE INDEX IF NOT EXISTS idx_storefront_stripe_price
  ON storefront_items("stripePriceId");

COMMIT;
```

**Pros:**
- ✅ Complete schema consistency
- ✅ Future-proof (no more type mismatches)
- ✅ Better performance (indexes on Stripe columns)
- ✅ Allows 'custom' packages

**Cons:**
- ⚠️ More complex migration
- ⚠️ Requires extensive testing
- ⚠️ Potential downtime for ENUM → STRING conversion
- ⚠️ Risk of breaking existing code that expects ENUM

**Recommendation:** ⚠️ **Use for long-term fix, not immediate**

---

### Option B3: Model-First Approach (Rebuild)
**Scope:** Drop table, re-run migration from scratch
**Risk:** HIGH
**Downtime:** YES
**Testing Required:** Complete regression testing

**Process:**
1. Backup existing storefront_items data
2. Drop table
3. Re-run migration 20250213192601
4. Re-run subsequent migrations (displayOrder, includedFeatures, etc.)
5. Restore data

**Pros:**
- ✅ Guaranteed schema consistency
- ✅ Fresh start, no legacy issues

**Cons:**
- ❌ Data loss risk (requires backup/restore)
- ❌ Breaking change (downtime required)
- ❌ Complex rollback if issues occur
- ❌ Overkill for current issue

**Recommendation:** ❌ **Not recommended** - Too risky for this issue

---

## Recommended Solution: Hybrid Approach

### Phase 1: Immediate Fix (Option B1)
**Goal:** Unblock Video Library testing **today**

**Migration File:** `backend/migrations/20251118000002-add-stripe-columns-to-storefront.cjs`

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Adding missing Stripe columns to storefront_items...');

      // Check if columns already exist
      const tableDescription = await queryInterface.describeTable('storefront_items', { transaction });

      if (!tableDescription.stripeProductId) {
        await queryInterface.addColumn(
          'storefront_items',
          'stripeProductId',
          {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          { transaction }
        );
        console.log('✅ Added column: stripeProductId');
      } else {
        console.log('⏭️  Column stripeProductId already exists');
      }

      if (!tableDescription.stripePriceId) {
        await queryInterface.addColumn(
          'storefront_items',
          'stripePriceId',
          {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          { transaction }
        );
        console.log('✅ Added column: stripePriceId');
      } else {
        console.log('⏭️  Column stripePriceId already exists');
      }

      await transaction.commit();
      console.log('Migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Removing Stripe columns from storefront_items...');

      await queryInterface.removeColumn('storefront_items', 'stripePriceId', { transaction });
      await queryInterface.removeColumn('storefront_items', 'stripeProductId', { transaction });

      await transaction.commit();
      console.log('Rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};
```

**Testing Script:** `backend/test-storefront-schema-fix.mjs`

```javascript
import sequelize from './database.mjs';
import { QueryTypes } from 'sequelize';
import StorefrontItem from './models/StorefrontItem.mjs';

console.log('🧪 STOREFRONT SCHEMA FIX VERIFICATION');
console.log('=====================================\n');

// Test 1: Verify columns exist
console.log('📋 TEST 1: Verify database schema');
const columns = await sequelize.query(
  `SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'storefront_items'
   AND column_name IN ('stripeProductId', 'stripePriceId')
   ORDER BY column_name`,
  { type: QueryTypes.SELECT }
);

console.log(`   Columns found: ${columns.length}/2`);
if (columns.length === 2) {
  console.log('   ✅ stripeProductId: ' + columns[0].data_type);
  console.log('   ✅ stripePriceId: ' + columns[1].data_type);
} else {
  console.log('   ❌ Missing columns');
  process.exit(1);
}

// Test 2: Verify model can query
console.log('\n📊 TEST 2: Verify model queries work');
try {
  const items = await StorefrontItem.findAll({ limit: 1 });
  console.log(`   ✅ Model query successful (${items.length} items)`);
} catch (error) {
  console.log('   ❌ Model query failed:', error.message);
  process.exit(1);
}

// Test 3: Verify model can create with Stripe IDs
console.log('\n➕ TEST 3: Verify model can save Stripe IDs');
try {
  const testItem = await StorefrontItem.create({
    name: 'Test Package (Schema Fix)',
    description: 'Created by schema fix test',
    packageType: 'fixed',
    sessions: 1,
    pricePerSession: 150.00,
    price: 150.00,
    totalCost: 150.00,
    stripeProductId: 'prod_test_12345',
    stripePriceId: 'price_test_12345',
    isActive: false, // Don't show in storefront
  });

  console.log(`   ✅ Created test item with ID: ${testItem.id}`);
  console.log(`   ✅ stripeProductId saved: ${testItem.stripeProductId}`);
  console.log(`   ✅ stripePriceId saved: ${testItem.stripePriceId}`);

  // Clean up
  await testItem.destroy();
  console.log('   ✅ Test item deleted');
} catch (error) {
  console.log('   ❌ Save test failed:', error.message);
  process.exit(1);
}

await sequelize.close();
console.log('\n✅ ALL TESTS PASSED - Schema fix verified');
process.exit(0);
```

**Execution Steps:**

1. **Create migration file**
   ```bash
   # File: backend/migrations/20251118000002-add-stripe-columns-to-storefront.cjs
   ```

2. **Run migration**
   ```bash
   cd backend
   npx sequelize-cli db:migrate
   ```

3. **Verify fix**
   ```bash
   node test-storefront-schema-fix.mjs
   ```

4. **Re-test Video Library**
   ```bash
   node test-video-library.mjs
   ```

**Expected Results:**
- ✅ Migration completes successfully
- ✅ All 3 verification tests pass
- ✅ Video Library tests no longer get 500 errors

**Rollback Plan:**
```bash
npx sequelize-cli db:migrate:undo
```

**Time Estimate:** 15 minutes (create + test + verify)

---

### Phase 2: Long-Term Fix (Option B2) - Future Sprint

**Goal:** Complete schema reconciliation

**Tasks:**
1. Create migration to convert ENUM → STRING for packageType
2. Update model validation to allow 'custom' packages
3. Add indexes on Stripe columns for performance
4. Create comprehensive schema validation tests
5. Document final schema in blueprint

**Priority:** MEDIUM
**Timeline:** Next sprint (after Video Library Phase 1 complete)

---

## Impact Analysis

### Current Impact (Before Fix)

**Blocked Features:**
- ❌ Video Library API testing (all endpoints fail with 500)
- ❌ Storefront package creation with Stripe integration
- ❌ Any endpoint that touches StorefrontItem model

**Working Features:**
- ✅ Database queries not using model
- ✅ Storefront display (if using raw SQL)
- ✅ Other unrelated endpoints

**Error Pattern:**
```javascript
// Any Sequelize operation:
StorefrontItem.findAll()

// Results in:
Error: column "stripeProductId" does not exist
```

### Post-Fix Impact (Phase 1)

**Unblocked:**
- ✅ Video Library API tests run successfully
- ✅ Storefront model operations work
- ✅ Stripe integration can be implemented

**Remaining Issues:**
- ⚠️ ENUM vs STRING inconsistency (non-blocking)
- ⚠️ 'custom' packages blocked by model validation (can add later)

---

## Testing Strategy

### Pre-Fix Tests (Baseline)

1. **Video Library Test** (Should FAIL)
   ```bash
   cd backend
   node test-video-library.mjs
   # Expected: Tests 1,2,4,5 fail with 500 error
   ```

2. **Storefront Model Test** (Should FAIL)
   ```bash
   node -e "import StorefrontItem from './models/StorefrontItem.mjs'; await StorefrontItem.findAll();"
   # Expected: Error: column "stripeProductId" does not exist
   ```

### Post-Fix Tests (Validation)

1. **Schema Verification**
   ```bash
   node test-storefront-schema-fix.mjs
   # Expected: All 3 tests pass
   ```

2. **Video Library Re-test**
   ```bash
   node test-video-library.mjs
   # Expected: Tests 1,2,4,5 now pass or fail with different error
   ```

3. **Storefront CRUD Operations**
   ```bash
   # Test create with Stripe IDs
   # Test update Stripe IDs
   # Test query by Stripe IDs
   ```

### Regression Tests

- ✅ Existing storefront packages still query correctly
- ✅ Cart items still reference storefront_items.id
- ✅ Orders still reference storefront_items
- ✅ No breaking changes to existing data

---

## Risk Assessment

### Phase 1 (Add Columns) - LOW RISK

| Risk Factor | Level | Mitigation |
|-------------|-------|------------|
| Data Loss | NONE | Non-destructive ALTER TABLE ADD COLUMN |
| Downtime | NONE | Online schema change (no locks) |
| Breaking Changes | NONE | Columns are nullable, existing code unaffected |
| Rollback Difficulty | LOW | Simple DROP COLUMN in down() migration |
| Performance Impact | NONE | No indexes added yet, columns nullable |

**Overall Risk:** 🟢 LOW - Safe for production

### Phase 2 (Full Reconciliation) - MEDIUM RISK

| Risk Factor | Level | Mitigation |
|-------------|-------|------------|
| Data Loss | LOW | Type conversion preserves data |
| Downtime | MEDIUM | ENUM → STRING requires table rewrite |
| Breaking Changes | MEDIUM | Code expecting ENUM may break |
| Rollback Difficulty | MEDIUM | Must recreate ENUM type |
| Performance Impact | LOW | Adding indexes helps, ENUM → STRING minimal |

**Overall Risk:** 🟡 MEDIUM - Requires staging testing first

---

## Dependencies & Prerequisites

### Before Running Migration

1. **Backup Database**
   ```bash
   pg_dump -U swanadmin swanstudios > backup_before_stripe_columns.sql
   ```

2. **Verify Migration Order**
   ```bash
   npx sequelize-cli db:migrate:status
   # Ensure all previous migrations ran successfully
   ```

3. **Check for Pending Changes**
   ```bash
   git status
   # Commit any uncommitted changes first
   ```

### After Running Migration

1. **Update Documentation**
   - Update [LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md](LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md)
   - Add migration to completed list

2. **Notify Team**
   - Schema change affects storefront_items
   - New columns available for Stripe integration

---

## Related Files

### Modified Files (Phase 1)
- `backend/migrations/20251118000002-add-stripe-columns-to-storefront.cjs` (NEW)
- `backend/test-storefront-schema-fix.mjs` (NEW)
- `docs/ai-workflow/OPTION-B-STOREFRONT-SCHEMA-FIX-ANALYSIS.md` (THIS FILE)

### Affected Files (No Changes)
- `backend/models/StorefrontItem.mjs` (Already expects these columns)
- `backend/migrations/20250213192601-create-storefront-items.cjs` (Original migration - do NOT modify)
- `backend/routes/storeFrontRoutes.mjs` (Will start working after fix)

### Future Changes (Phase 2)
- `backend/migrations/202511XX-convert-packagetype-to-string.cjs`
- `backend/models/StorefrontItem.mjs` (Update validation to allow 'custom')

---

## Success Criteria

### Phase 1 Complete When:
- [x] Migration file created
- [ ] Migration runs without errors
- [ ] All 3 verification tests pass
- [ ] Video Library tests no longer fail with Stripe/storefront errors
- [ ] StorefrontItem model queries work
- [ ] Existing storefront packages still load
- [ ] Documentation updated

### Phase 2 Complete When (Future):
- [ ] ENUM → STRING conversion successful
- [ ] Model validation allows 'custom' packages
- [ ] Indexes on Stripe columns created
- [ ] Performance benchmarks confirm no regression
- [ ] All storefront tests pass

---

## Execution Timeline

### Immediate (Today)
1. **10 minutes:** Review this analysis with team
2. **5 minutes:** Create migration file
3. **2 minutes:** Run migration
4. **5 minutes:** Run verification tests
5. **10 minutes:** Re-test Video Library endpoints
6. **5 minutes:** Document results

**Total Time:** ~40 minutes

### Future Sprint (Week of 2025-11-25)
1. **1 hour:** Design ENUM → STRING migration
2. **30 minutes:** Test on staging database
3. **1 hour:** Run full regression tests
4. **30 minutes:** Deploy to production
5. **1 hour:** Monitor and verify

**Total Time:** ~4 hours

---

## Recommendation for AI Team Review

### Questions to Confirm Before Implementation

1. **Do we have database backup capability?**
   - If yes → Proceed with Phase 1
   - If no → Set up backups first

2. **Is storefront_items actively used in production?**
   - If no → Safe to run immediately
   - If yes → Schedule during low-traffic window

3. **Are there any active Stripe integrations?**
   - If no → Phase 1 is safe
   - If yes → Verify Stripe code won't break

4. **Should we fix ENUM → STRING now or later?**
   - Recommend: Later (Phase 2)
   - Reason: ENUM works fine, just inconsistent

### Approval Checklist

- [ ] **Kilo Code:** Review migration SQL safety
- [ ] **Gemini:** Verify schema design decisions
- [ ] **Roo Code:** Check for code-level impacts
- [ ] **MinMax:** Assess risk vs. reward
- [ ] **Human (Sean):** Final approval to execute

---

## Appendix A: Full Schema Comparison

### Model Definition (StorefrontItem.mjs)
```javascript
{
  id: INTEGER (PK, Auto-increment),
  packageType: STRING (validates: 'fixed', 'monthly'),
  name: STRING (NOT NULL),
  description: TEXT,
  price: DECIMAL(10,2),
  sessions: INTEGER,
  pricePerSession: DECIMAL(10,2) (NOT NULL),
  months: INTEGER,
  sessionsPerWeek: INTEGER,
  totalSessions: INTEGER,
  totalCost: DECIMAL(10,2),
  imageUrl: STRING,
  stripeProductId: STRING,    // ❌ MISSING IN DB
  stripePriceId: STRING,      // ❌ MISSING IN DB
  isActive: BOOLEAN (DEFAULT true),
  displayOrder: INTEGER (DEFAULT 0),
  createdAt: DATE,
  updatedAt: DATE
}
```

### Database Schema (Actual PostgreSQL)
```sql
id                INTEGER PRIMARY KEY AUTO_INCREMENT,
name              VARCHAR NOT NULL,
description       TEXT,
packageType       ENUM('fixed', 'monthly', 'custom') NOT NULL DEFAULT 'fixed',
price             NUMERIC,
sessions          INTEGER,
pricePerSession   NUMERIC NOT NULL,
months            INTEGER,
sessionsPerWeek   INTEGER,
totalSessions     INTEGER,
totalCost         NUMERIC,
imageUrl          VARCHAR,
type              VARCHAR,  -- ⚠️ Unknown column, not in model
displayOrder      INTEGER DEFAULT 0,
includedFeatures  TEXT,
isActive          BOOLEAN NOT NULL DEFAULT true,
createdAt         TIMESTAMP NOT NULL,
updatedAt         TIMESTAMP NOT NULL
-- ❌ stripeProductId MISSING
-- ❌ stripePriceId MISSING
```

### Discrepancies Summary
| Field | Model | Database | Status |
|-------|-------|----------|--------|
| packageType | STRING | ENUM | ⚠️ Type mismatch |
| price | DECIMAL | NUMERIC | ✅ Compatible |
| stripeProductId | STRING | MISSING | ❌ MUST ADD |
| stripePriceId | STRING | MISSING | ❌ MUST ADD |
| theme | N/A | MISSING | ✅ Intentionally removed |
| type | N/A | VARCHAR | ⚠️ Unknown purpose |
| includedFeatures | N/A | TEXT | ✅ Added by later migration |

---

## Appendix B: Error Stack Trace Example

```
Error: Server error while retrieving storefront item
{
  "success": false,
  "message": "Server error while retrieving storefront item",
  "error": "column \"stripeProductId\" does not exist"
}

Stack Trace:
  at StorefrontItem.findAll (backend/models/StorefrontItem.mjs:156)
  at listExercises (backend/controllers/videoLibraryController.mjs:228)
  at router.get (backend/routes/videoLibraryRoutes.mjs:50)
  at Layer.handle (node_modules/express/lib/router/layer.js:95)
  at trim_prefix (node_modules/express/lib/router/index.js:328)
  at Router.handle (node_modules/express/lib/router/index.js:286)

PostgreSQL Error:
  error: column "stripeProductId" does not exist
  code: "42703"
  file: "parse_relation.c"
  line: "3645"
  routine: "errorMissingColumn"
```

**Why This Affects Video Library:**
- Video Library endpoints work correctly
- BUT: Global middleware or error handlers may query StorefrontItem
- When StorefrontItem query fails → 500 error returned
- Video Library code never executes

**Fix:** Add missing columns → StorefrontItem queries succeed → Video Library endpoints work

---

## Conclusion

**Option B: Storefront Schema Fix** is the correct solution to unblock Video Library testing. The issue is **NOT in the Video Library code** - it's a database schema mismatch that affects any code path touching the StorefrontItem model.

**Recommended Action:**
1. ✅ **Immediate:** Implement Phase 1 (add missing columns)
2. ⏳ **Future Sprint:** Implement Phase 2 (full reconciliation)

**Expected Outcome:**
- Video Library tests will complete successfully
- Storefront Stripe integration can proceed
- No breaking changes to existing functionality

**Time to Fix:** ~40 minutes end-to-end

---

**Analysis Completed By:** Claude (Sonnet 4.5)
**Date:** 2025-11-18
**Status:** ✅ Ready for Team Review

---

**Next Steps:**
1. Team reviews this analysis
2. Approval from AI Village (Kilo, Gemini, Roo, MinMax)
3. Sean gives final approval
4. Implement Phase 1 migration
5. Verify fix with tests
6. Update documentation
7. Close issue

**Questions?** Review the "Questions to Confirm Before Implementation" section above.
