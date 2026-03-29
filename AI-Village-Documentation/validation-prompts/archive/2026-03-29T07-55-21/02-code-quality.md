# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 58.6s
> **Files:** backend/migrations/20260328140000-add-companion-pet.cjs, backend/routes/creatorEconomyRoutes.mjs, backend/routes/liveStreamRoutes.mjs, backend/services/gamification/CompanionPetService.mjs, backend/controllers/gamificationController.mjs
> **Generated:** 3/29/2026, 12:55:21 AM

---

# Code Review: SwanStudios Gamification System

## Executive Summary
Reviewed 5 backend files (1 migration, 2 route files, 1 service, 1 controller). Found **3 CRITICAL**, **8 HIGH**, **12 MEDIUM**, and **7 LOW** priority issues. Primary concerns: massive monolith controller (2480+ lines), missing TypeScript types, DRY violations, and inconsistent error handling.

---

## CRITICAL Issues

### 1. **Monolith Controller Anti-Pattern** 
**File:** `backend/controllers/gamificationController.mjs`  
**Severity:** CRITICAL  
**Lines:** Entire file (2480+ lines)

**Problem:**
- Single file contains 25+ methods violating single responsibility principle
- Mixes concerns: settings, points, achievements, rewards, milestones, leaderboards
- Makes testing, maintenance, and code review extremely difficult
- Self-documented as "EXCEEDS 300-line rule"

**Recommendation:**
```javascript
// Decompose into domain-specific controllers:
// - gamificationSettingsController.mjs (2 methods)
// - gamificationPointsController.mjs (3 methods)
// - gamificationAchievementsController.mjs (7 methods)
// - gamificationRewardsController.mjs (6 methods)
// - gamificationMilestonesController.mjs (5 methods)
// - gamificationLeaderboardController.mjs (2 methods)
```

---

### 2. **Missing TypeScript Types**
**Files:** All `.mjs` files  
**Severity:** CRITICAL  

**Problem:**
- All files use `.mjs` extension but lack TypeScript type safety
- No interfaces for request bodies, responses, or domain models
- Runtime errors likely from typos/incorrect property access
- Example from `CompanionPetService.mjs`:

```javascript
// Current (no type safety):
static async adoptPet(userId, species, petName) {
  const record = await Gamification.findOne({ where: { userId } });
  // What if record.petState is malformed? No validation!
}

// Should be:
interface PetState {
  evolutionStage: number;
  health: number;
  mood: string;
  happiness: number;
  birthDate: string;
  lastInteraction: string;
  appearanceMods: string[];
  activityCounters: Record<string, number>;
  totalInteractions: number;
}

static async adoptPet(
  userId: string, 
  species: keyof typeof PET_SPECIES, 
  petName: string
): Promise<PetData> {
  // Type-safe implementation
}
```

**Recommendation:**
- Convert all `.mjs` to `.ts`
- Define interfaces for all domain models
- Use discriminated unions for transaction types, pet moods, etc.

---

### 3. **SQL Injection Risk via Dynamic Model Import**
**Files:** `creatorEconomyRoutes.mjs`, `liveStreamRoutes.mjs`  
**Severity:** CRITICAL  
**Lines:** `creatorEconomyRoutes.mjs:27-34`, `liveStreamRoutes.mjs:27-34`

**Problem:**
```javascript
// Repeated in both files:
async function getModels() {
  const mod = await import('../models/social/enhanced/CreatorEconomy.mjs');
  return {
    CreatorProfile: mod.CreatorProfile,
    BrandPartnership: mod.BrandPartnership,
    // ...
  };
}
```

- Dynamic imports on every request (performance penalty)
- No validation that models exist before use
- Inconsistent with rest of codebase (other controllers import statically)

**Recommendation:**
```javascript
// Top of file (static import):
import { 
  CreatorProfile, 
  BrandPartnership, 
  CreatorSubscription, 
  CreatorAnalytics 
} from '../models/social/enhanced/CreatorEconomy.mjs';

// Remove getModels() helper entirely
```

---

## HIGH Priority Issues

### 4. **Unsafe Error Message Exposure**
**File:** `gamificationController.mjs`  
**Severity:** HIGH  
**Lines:** Multiple catch blocks (e.g., 89, 134, 180)

**Problem:**
```javascript
// Current:
catch (error) {
  logger.error('Error fetching creators', { error: error.message });
  res.json({ creators: [], message: 'Creator economy coming soon' });
}
```

- Inconsistent error handling (some return 500, some return 200 with empty data)
- Some endpoints expose raw `error.message` to clients (info leak)
- `safeError()` helper exists but not used consistently

**Recommendation:**
```javascript
// Standardize all error responses:
catch (error) {
  logger.error('Error fetching creators', { 
    error: error.message, 
    stack: error.stack,
    userId: req.user?.id 
  });
  
  return res.status(500).json({
    success: false,
    message: req.user?.role === 'admin' 
      ? error.message 
      : 'Failed to fetch creators. Please try again.'
  });
}
```

---

### 5. **Race Condition in Point Awards**
**File:** `gamificationController.mjs`  
**Severity:** HIGH  
**Lines:** 550-650 (awardPoints method)

**Problem:**
```javascript
// Current idempotency check:
const existingTransaction = await PointTransaction.findOne({
  where: {
    userId,
    source: source || 'manual',
    createdAt: { [Op.gte]: startOfToday }
  },
  transaction
});
```

- Only checks same-day duplicates (allows multiple awards per day)
- `sourceId` is optional, so same action can be awarded multiple times
- No unique constraint in database to enforce idempotency

**Recommendation:**
```javascript
// Add unique constraint in migration:
await queryInterface.addConstraint('PointTransactions', {
  fields: ['userId', 'source', 'sourceId', 'createdAt'],
  type: 'unique',
  name: 'unique_point_transaction_per_day'
});

// Enforce sourceId requirement:
if (!sourceId) {
  return res.status(400).json({
    success: false,
    message: 'sourceId is required for idempotency'
  });
}
```

---

### 6. **Missing Input Validation**
**Files:** All route files  
**Severity:** HIGH  

**Problem:**
```javascript
// creatorEconomyRoutes.mjs:96
const profile = await CreatorProfile.applyToJoin?.({
  userId: req.user.id,
  displayName: req.body.displayName, // No validation!
  bio: req.body.bio,                 // Could be 10MB string
  primaryCategory: req.body.primaryCategory || 'fitness_trainer',
});
```

- No validation for string lengths, allowed characters, or required fields
- Could cause database errors or performance issues

**Recommendation:**
```javascript
// Add validation middleware:
import { body, validationResult } from 'express-validator';

router.post('/apply', 
  authenticateToken,
  [
    body('displayName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-zA-Z0-9\s]+$/),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('primaryCategory')
      .isIn(['fitness_trainer', 'nutritionist', 'wellness_coach', 'content_creator'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... rest of handler
  }
);
```

---

### 7. **Hardcoded Business Logic in Service**
**File:** `CompanionPetService.mjs`  
**Severity:** HIGH  
**Lines:** 40-90 (PET_SPECIES, EVOLUTION_STAGES, PET_MOODS)

**Problem:**
- Pet species, evolution stages, and moods are hardcoded constants
- Cannot be modified without code deployment
- Inconsistent with gamification settings pattern (which uses database config)

**Recommendation:**
```javascript
// Create PetConfig model:
// backend/models/PetConfig.mjs
export default sequelize.define('PetConfig', {
  species: { type: DataTypes.JSONB },
  evolutionStages: { type: DataTypes.JSONB },
  moods: { type: DataTypes.JSONB },
  appearanceTriggers: { type: DataTypes.JSONB }
});

// Load from database:
static async adoptPet(userId, species, petName) {
  const config = await PetConfig.findOne();
  if (!config.species[species]) {
    throw new Error(`Invalid species: ${species}`);
  }
  // ...
}
```

---

### 8. **Missing Transaction Rollback**
**File:** `CompanionPetService.mjs`  
**Severity:** HIGH  
**Lines:** 155-200 (adoptPet method)

**Problem:**
```javascript
static async adoptPet(userId, species, petName) {
  const record = await Gamification.findOne({ where: { userId } });
  if (!record) throw new Error('Gamification record not found');
  
  if (record.petSpecies) {
    throw new Error('User already has a pet. Release current pet first.');
  }
  
  await record.update({
    petSpecies: species,
    petName: petName || PET_SPECIES[species].name,
    petState: initialState,
    petInventory: { unlockedMods: [], equippedMods: [] },
  });
  // No transaction wrapper! If update fails, database is inconsistent.
}
```

**Recommendation:**
```javascript
static async adoptPet(userId, species, petName) {
  const transaction = await db.transaction();
  try {
    const record = await Gamification.findOne({ 
      where: { userId },
      transaction,
      lock: transaction.LOCK.UPDATE 
    });
    
    // ... validation ...
    
    await record.update({ /* ... */ }, { transaction });
    await transaction.commit();
    return this.getPetData(userId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

---

### 9. **Unprotected Admin Routes**
**Files:** `creatorEconomyRoutes.mjs`, `liveStreamRoutes.mjs`  
**Severity:** HIGH  

**Problem:**
```javascript
// liveStreamRoutes.mjs:88
router.post('/', authenticateToken, async (req, res) => {
  const user = req.user;
  if (!['admin', 'trainer'].includes(user.role)) {
    return res.status(403).json({ message: 'Only trainers and admins can create streams' });
  }
  // Role check is inline, not middleware
});
```

- Role checks are inconsistent (some routes have them, some don't)
- Easy to forget role check when adding new routes
- Should use reusable middleware

**Recommendation:**
```javascript
// middleware/requireRole.mjs
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ 
      message: 'Insufficient permissions' 
    });
  }
  next();
};

// Usage:
router.post('/', 
  authenticateToken, 
  requireRole('admin', 'trainer'), 
  async (req, res) => {
    // No inline role check needed
  }
);
```

---

### 10. **Unsafe JSONB Field Access**
**File:** `CompanionPetService.mjs`  
**Severity:** HIGH  
**Lines:** 225-250 (getPetData method)

**Problem:**
```javascript
const state = record.petState || {};
const health = this._calculateHealthFromNeeds(record.needsState);
// What if needsState is malformed JSON? No validation!

const appearanceMods = this._getActiveAppearanceMods(state.activityCounters || {});
// What if activityCounters is a string instead of object?
```

- JSONB fields are untyped and unvalidated
- Could cause runtime errors if data is corrupted

**Recommendation:**
```javascript
// Add schema validation:
import Ajv from 'ajv';

const petStateSchema = {
  type: 'object',
  required: ['evolutionStage', 'health', 'mood'],
  properties: {
    evolutionStage: { type: 'number', minimum: 0, maximum: 5 },
    health: { type: 'number', minimum: 0, maximum: 100 },
    mood: { type: 'string' },
    activityCounters: { 
      type: 'object',
      additionalProperties: { type: 'number' }
    }
  }
};

const ajv = new Ajv();
const validate = ajv.compile(petStateSchema);

static async getPetData(userId) {
  const record = await Gamification.findOne({ where: { userId } });
  const state = record.petState || {};
  
  if (!validate(state)) {
    logger.error('Invalid pet state', { errors: validate.errors });
    // Return default state or throw error
  }
  // ...
}
```

---

### 11. **Pagination DoS Vector**
**File:** `gamificationController.mjs`  
**Severity:** HIGH  
**Lines:** 420-430 (getLeaderboard method)

**Problem:**
```javascript
// Current (FIXED in code):
const limit = Math.min(parseInt(rawLimit) || 10, 100);

// But other routes don't have this protection:
// creatorEconomyRoutes.mjs:48
const creators = await CreatorProfile.getTopCreators?.() || [];
// No limit! Could return 100k records.
```

**Recommendation:**
- Apply pagination cap to ALL list endpoints
- Add default limit of 20, max limit of 100

---

## MEDIUM Priority Issues

### 12. **DRY Violation: Duplicate getModels() Helper**
**Files:** `creatorEconomyRoutes.mjs`, `liveStreamRoutes.mjs`  
**Severity:** MEDIUM  
**Lines:** Both files have identical helper function

**Problem:**
- Same 8-line function copy-pasted in two files
- If import path changes, must update both

**Recommendation:**
- Remove dynamic imports (see CRITICAL #3)
- Or extract to shared utility if dynamic import is required

---

### 13. **Inconsistent Response Formats**
**Files:** All route files  
**Severity:** MEDIUM  

**Problem:**
```javascript
// creatorEconomyRoutes.mjs:55
res.json({ creators: [], message: 'Creator economy coming soon' });

// liveStreamRoutes.mjs:50
res.json({ streams: [], message: 'Live streaming coming soon' });

// gamificationController.mjs:89
return res.status(200).json({ success: true, settings });

// gamificationController.mjs:134
return res.status(500).json({
  success: false,
  message: 'Failed to get gamification settings',
  error: error.message
});
```

- Some responses have `success` field, some don't
- Some wrap data in named keys (`creators`, `streams`), some don't
- Inconsistent error response structure

**Recommendation:**
```javascript
// Standardize all responses:
// Success:
{ success: true, data: { ... }, meta: { ... } }

// Error:
{ success: false, error: { message: '...', code: 'ERR_CODE' } }

// Create response helper:
export const apiResponse = {
  success: (data, meta = {}) => ({ success: true, data, meta }),
  error: (message, code = 'INTERNAL_ERROR') => ({ 
    success: false, 
    error: { message, code } 
  })
};
```

---

### 14. **Missing Indexes on JSONB Queries**
**File

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
