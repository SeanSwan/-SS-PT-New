# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 60.4s
> **Files:** backend/controllers/movementAnalysisController.mjs, backend/core/routes.mjs, backend/migrations/20260305000001-create-movement-analysis-tables.cjs, backend/models/MovementAnalysis.mjs
> **Generated:** 3/5/2026, 9:39:57 AM

---

# Code Review: Movement Analysis System

## CRITICAL Issues

### C1. Missing Authentication & Authorization
**Location:** `movementAnalysisController.mjs` - All endpoints  
**Severity:** CRITICAL

```mjs
export const createMovementAnalysis = async (req, res) => {
  // ❌ No authentication check
  // ❌ No authorization check (who can create assessments?)
  // ❌ req.user.id used without verifying req.user exists
  conductedBy: req.user.id, // Will crash if req.user is undefined
```

**Impact:** 
- Unauthenticated users could create/modify assessments
- `req.user.id` will throw if middleware not applied
- No role-based access control (should trainers/admins only create these?)

**Fix:**
```mjs
export const createMovementAnalysis = async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  // Add role check
  if (!['admin', 'trainer'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  
  // ... rest of logic
}
```

---

### C2. SQL Injection Risk in Search Query
**Location:** `listMovementAnalyses` line 130-135  
**Severity:** CRITICAL

```mjs
if (search) {
  where[Op.or] = [
    { fullName: { [Op.iLike]: `%${search}%` } }, // ❌ Unsanitized user input
    { email: { [Op.iLike]: `%${search}%` } },
    { phone: { [Op.iLike]: `%${search}%` } },
  ];
}
```

**Impact:** Potential SQL injection if Sequelize doesn't properly escape `search` parameter

**Fix:**
```mjs
if (search) {
  const sanitized = search.trim().substring(0, 100); // Limit length
  where[Op.or] = [
    { fullName: { [Op.iLike]: `%${sanitized}%` } },
    { email: { [Op.iLike]: `%${sanitized}%` } },
    { phone: { [Op.iLike]: `%${sanitized}%` } },
  ];
}
```

---

### C3. Race Condition in Auto-Match Logic
**Location:** `updateMovementAnalysis` lines 111-121  
**Severity:** CRITICAL

```mjs
// Auto-match if switching from no-userId to having contact info
if (!analysis.userId && !updateData.userId) {
  const email = updateData.email || analysis.email;
  const phone = updateData.phone || analysis.phone;
  if (email || phone) {
    const PendingMatch = getModel('PendingMovementAnalysisMatch');
    const existingMatches = await PendingMatch.count({ where: { movementAnalysisId: analysis.id } });
    if (existingMatches === 0) {
      await autoMatchProspect(analysis, User); // ❌ No transaction, race condition
    }
  }
}
```

**Impact:** 
- Concurrent updates could create duplicate matches
- `analysis.update()` happens before auto-match, so `analysis` object has stale data
- No transaction wrapping the update + auto-match

**Fix:**
```mjs
const transaction = await sequelize.transaction();
try {
  await analysis.update(updateData, { transaction });
  
  if (!analysis.userId && (email || phone)) {
    const existingMatches = await PendingMatch.count({ 
      where: { movementAnalysisId: analysis.id },
      transaction 
    });
    if (existingMatches === 0) {
      await autoMatchProspect(analysis, User, transaction);
    }
  }
  
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

---

## HIGH Issues

### H1. Missing Input Validation
**Location:** `createMovementAnalysis`, `updateMovementAnalysis`  
**Severity:** HIGH

```mjs
const {
  userId, fullName, email, phone, dateOfBirth, address,
  source, parqScreening, medicalClearanceRequired,
  // ... 10+ more fields
} = req.body;

if (!fullName) {
  return res.status(400).json({ success: false, message: 'Full name is required' });
}
// ❌ No validation for email format, phone format, dateOfBirth range, etc.
```

**Impact:** 
- Invalid data could be stored (malformed emails, future birth dates)
- No sanitization of text fields (XSS risk in `trainerNotes`, `address`)
- JSONB fields not validated (could store arbitrary data)

**Fix:**
```mjs
import Joi from 'joi';

const createSchema = Joi.object({
  fullName: Joi.string().min(1).max(200).required(),
  email: Joi.string().email().allow(null, ''),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow(null, ''),
  dateOfBirth: Joi.date().max('now').allow(null),
  parqScreening: Joi.object().allow(null),
  // ... validate all fields
});

const { error, value } = createSchema.validate(req.body);
if (error) {
  return res.status(400).json({ success: false, message: error.details[0].message });
}
```

---

### H2. Duplicate Score Calculation Logic
**Location:** `createMovementAnalysis` lines 36-45, `updateMovementAnalysis` lines 96-104  
**Severity:** HIGH (DRY Violation)

```mjs
// ❌ Duplicated in both create and update
if (overheadSquatAssessment) {
  nasmAssessmentScore = MovementAnalysis.calculateNASMScore(overheadSquatAssessment);
  correctiveExerciseStrategy = MovementAnalysis.generateCorrectiveStrategy(overheadSquatAssessment);
  if (nasmAssessmentScore !== null) {
    optPhaseRecommendation = MovementAnalysis.selectOPTPhase(nasmAssessmentScore);
    overallMovementQualityScore = nasmAssessmentScore;
  }
}
```

**Fix:**
```mjs
// Extract to helper function
function calculateAssessmentScores(ohsa) {
  if (!ohsa) return {};
  
  const nasmAssessmentScore = MovementAnalysis.calculateNASMScore(ohsa);
  const correctiveExerciseStrategy = MovementAnalysis.generateCorrectiveStrategy(ohsa);
  
  return {
    nasmAssessmentScore,
    correctiveExerciseStrategy,
    optPhaseRecommendation: nasmAssessmentScore !== null 
      ? MovementAnalysis.selectOPTPhase(nasmAssessmentScore) 
      : null,
    overallMovementQualityScore: nasmAssessmentScore,
  };
}

// Use in both endpoints
const scores = calculateAssessmentScores(overheadSquatAssessment);
Object.assign(analysis, scores);
```

---

### H3. Inconsistent Error Handling
**Location:** All controller methods  
**Severity:** HIGH

```mjs
} catch (error) {
  logger.error('[MovementAnalysis] create error:', error);
  return res.status(500).json({ 
    success: false, 
    message: error.message || 'Failed to create assessment' // ❌ Leaks error details
  });
}
```

**Impact:** 
- `error.message` could expose sensitive database details to client
- No distinction between validation errors (400), not found (404), server errors (500)
- Inconsistent error response format

**Fix:**
```mjs
} catch (error) {
  logger.error('[MovementAnalysis] create error:', error);
  
  // Don't leak internal error messages
  const isValidationError = error.name === 'SequelizeValidationError';
  const statusCode = isValidationError ? 400 : 500;
  const message = isValidationError 
    ? error.errors.map(e => e.message).join(', ')
    : 'Failed to create assessment';
  
  return res.status(statusCode).json({ 
    success: false, 
    message,
    ...(process.env.NODE_ENV === 'development' && { debug: error.message })
  });
}
```

---

### H4. Missing Transaction in `rejectMatch`
**Location:** `rejectMatch` lines 226-241  
**Severity:** HIGH

```mjs
export const rejectMatch = async (req, res) => {
  try {
    const PendingMatch = getModel('PendingMovementAnalysisMatch');
    const match = await PendingMatch.findByPk(req.params.matchId);
    // ❌ No transaction (inconsistent with approveMatch which uses transaction)
    await match.update({ status: 'rejected', reviewedByUserId: req.user.id, reviewedAt: new Date() });
```

**Impact:** Inconsistent with `approveMatch` which uses transactions

**Fix:**
```mjs
const transaction = await sequelize.transaction();
try {
  const match = await PendingMatch.findByPk(req.params.matchId, { transaction });
  // ... validation
  await match.update({ 
    status: 'rejected', 
    reviewedByUserId: req.user.id, 
    reviewedAt: new Date() 
  }, { transaction });
  
  await transaction.commit();
  return res.json({ success: true, message: 'Match rejected' });
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

---

## MEDIUM Issues

### M1. Missing Pagination Validation
**Location:** `listMovementAnalyses` lines 125-127  
**Severity:** MEDIUM

```mjs
const { status, search, page = 1, limit = 20 } = req.query;
const offset = (Number(page) - 1) * Number(limit);
// ❌ No validation: page could be -1, limit could be 10000
```

**Fix:**
```mjs
const page = Math.max(1, Math.min(1000, Number(req.query.page) || 1));
const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
const offset = (page - 1) * limit;
```

---

### M2. Inefficient Auto-Match Logic
**Location:** `autoMatchProspect` lines 263-293  
**Severity:** MEDIUM

```mjs
if (analysis.email) {
  const emailMatch = await User.findOne({
    where: { email: { [Op.iLike]: analysis.email } },
    attributes: ['id'],
  });
  if (emailMatch) {
    matches.push({ candidateUserId: emailMatch.id, confidenceScore: 0.95, matchMethod: 'email_exact' });
  }
}

if (analysis.phone) {
  const phoneMatch = await User.findOne({
    where: { phone: analysis.phone },
    attributes: ['id'],
  });
  // ❌ Two separate queries instead of one OR query
```

**Fix:**
```mjs
const whereConditions = [];
if (analysis.email) whereConditions.push({ email: { [Op.iLike]: analysis.email } });
if (analysis.phone) whereConditions.push({ phone: analysis.phone });

if (whereConditions.length > 0) {
  const candidates = await User.findAll({
    where: { [Op.or]: whereConditions },
    attributes: ['id', 'email', 'phone'],
  });
  
  for (const user of candidates) {
    if (user.email && analysis.email && user.email.toLowerCase() === analysis.email.toLowerCase()) {
      matches.push({ candidateUserId: user.id, confidenceScore: 0.95, matchMethod: 'email_exact' });
    } else if (user.phone && analysis.phone && user.phone === analysis.phone) {
      matches.push({ candidateUserId: user.id, confidenceScore: 0.85, matchMethod: 'phone_exact' });
    }
  }
}
```

---

### M3. Missing Model Method Error Handling
**Location:** `MovementAnalysis.mjs` lines 174-181  
**Severity:** MEDIUM

```mjs
MovementAnalysis.calculateNASMScore = function (ohsa) {
  if (!ohsa || !ohsa.anteriorView || !ohsa.lateralView) return null;
  const scoreMap = { none: 100, minor: 70, significant: 40 };
  const checkpoints = [
    ohsa.anteriorView.feetTurnout,
    // ❌ No try/catch - will crash if structure is invalid
```

**Fix:**
```mjs
MovementAnalysis.calculateNASMScore = function (ohsa) {
  try {
    if (!ohsa?.anteriorView || !ohsa?.lateralView) return null;
    // ... rest of logic
  } catch (error) {
    logger.error('[MovementAnalysis] calculateNASMScore error:', error);
    return null;
  }
};
```

---

### M4. Hardcoded Magic Numbers
**Location:** `autoMatchProspect` lines 280, 287  
**Severity:** MEDIUM

```mjs
matches.push({ candidateUserId: emailMatch.id, confidenceScore: 0.95, matchMethod: 'email_exact' });
// ...
matches.push({ candidateUserId: phoneMatch.id, confidenceScore: 0.85, matchMethod: 'phone_exact' });
```

**Fix:**
```mjs
const MATCH_CONFIDENCE = {
  EMAIL_EXACT: 0.95,
  PHONE_EXACT: 0.85,
  NAME_FUZZY: 0.60,
};

matches.push({ 
  candidateUserId: emailMatch.id, 
  confidenceScore: MATCH_CONFIDENCE.EMAIL_EXACT, 
  matchMethod: 'email_exact' 
});
```

---

### M5. Missing Index on Foreign Keys
**Location:** `20260305000001-create-movement-analysis-tables.cjs`  
**Severity:** MEDIUM

```mjs
// ✅ Has indexes on movement_analyses
await queryInterface.addIndex('movement_analyses', ['userId'], { name: 'movement_analyses_userId' });

// ❌ Missing composite index for common query pattern
// listMovementAnalyses queries by status + search (fullName/email/phone)
```

**Fix:**
```mjs
// Add composite index for common filter pattern
await queryInterface.addIndex('movement_analyses', ['status', 'assessmentDate'], { 
  name: 'movement_analyses_status_date' 
});

// Add index for pending matches lookup
await queryInterface.addIndex('pending_movement_analysis_matches', 
  ['movementAnalysisId', 'status'], 
  { name: 'pma_matches_analysis_status' }
);
```

---

### M6. Route Registration Order Risk
**Location:** `routes.mjs` lines 157-158  
**Severity:** MEDIUM

```mjs
app.use('/api/orientation', orientationRoutes);
app.use('/api/movement-analysis', movementAnalysisRoutes);
// ❌ No comment explaining if these routes conflict or have dependencies
```

**Impact:** If `orientationRoutes` has a catch-all route, it could intercept movement-analysis requests

**Fix:** Add documentation and ensure specific routes come before generic ones

---

## LOW Issues

### L1. Inconsistent Naming Convention
**Location:** Multiple files  
**Severity:** LOW

```mjs
// Model uses camelCase
MovementAnalysis.calculateNASMScore

// But table uses snake_case
tableName: 'movement_analyses'

// Controller uses camelCase for variables
const nasmAssessmentScore = ...

//

---

*Part of SwanStudios 7-Brain Validation System*
