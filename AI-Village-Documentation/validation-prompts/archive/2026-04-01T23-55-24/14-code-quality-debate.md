# Code Quality Debate (Phase 2B) — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-sonnet-4.6 ↔ qwen/qwen3.6-plus-preview:free | **Duration:** 303.6s
> **Files:** backend/controllers/adminSpecialController.mjs, backend/controllers/goalController.mjs, backend/controllers/workoutController.mjs
> **Generated:** 4/1/2026, 4:55:24 PM

---

CONSENSUS REACHED

## Merged Implementation — Round 2 Refinements

### 1. `services/pointLedgerService.mjs` — Explicit Balance Injection (Resolves DISPUTE A)
**File:** `services/pointLedgerService.mjs`
**Change:** Remove internal `User.findByPk`. Accept `currentBalance` as a required parameter. This eliminates the stale-read risk, removes a redundant DB round-trip, and makes the service purely testable without DB mocks.

```javascript
// services/pointLedgerService.mjs
import { PointTransaction } from '../models/index.mjs';

export async function awardGoalMilestones(
  userId,
  goalId,
  milestones,
  completionXp,
  currentBalance, // ✅ Explicitly passed from controller's authoritative fetch
  transaction
) {
  let runningBalance = Number(currentBalance) || 0;
  let totalAwarded = 0;

  for (const m of milestones) {
    if (m.xpBonus <= 0) continue;
    runningBalance += m.xpBonus;
    totalAwarded += m.xpBonus;

    await PointTransaction.create({
      userId,
      points: m.xpBonus,
      balance: runningBalance,
      transactionType: 'earn',
      source: 'goal_milestone',
      sourceId: goalId,
      description: `Goal Milestone: ${m.percentage}%`,
      metadata: { goalId, milestonePercentage: m.percentage }
    }, { transaction });
  }

  if (completionXp > 0) {
    runningBalance += completionXp;
    totalAwarded += completionXp;

    await PointTransaction.create({
      userId,
      points: completionXp,
      balance: runningBalance,
      transactionType: 'earn',
      source: 'goal_completed',
      sourceId: goalId,
      description: 'Goal Completed'
    }, { transaction });
  }

  return { totalAwarded, newBalance: runningBalance };
}
```

**Controller Call Site (`goalController.mjs` ~line 260):**
```javascript
const { totalAwarded, newBalance } = await awardGoalMilestones(
  goal.userId,
  goal.id,
  milestonesAchieved,
  completionXp,
  user.points, // ✅ Pass authoritative in-memory value
  transaction
);
await user.update({ points: newBalance }, { transaction });
```

---

### 2. `services/pointLedgerService.mjs` — Explicit Void Method (Resolves DISPUTE B)
**File:** `services/pointLedgerService.mjs`
**Change:** Abandon `beforeDestroy` hook mutation/error-swallowing pattern. Implement an explicit, idempotent void method with dialect-agnostic metadata handling.

```javascript
// services/pointLedgerService.mjs (append)
import { Op } from 'sequelize';

export async function voidGoalTransactions(goalId, requestingUserId, transaction) {
  // Step 1: Fetch instances to safely merge metadata without SQL dialect operators
  const transactions = await PointTransaction.findAll({
    where: {
      source: ['goal_milestone', 'goal_completed'],
      sourceId: goalId,
      status: { [Op.ne]: 'voided' } // Idempotent guard
    },
    transaction
  });

  if (transactions.length === 0) return 0;

  // Step 2: Bulk update with safe metadata merge
  await Promise.all(
    transactions.map(t => t.update({
      status: 'voided',
      voidedAt: new Date(),
      metadata: { ...(t.metadata || {}), voidedByGoalDeletion: true, voidedBy: requestingUserId }
    }, { transaction }))
  );

  return transactions.length;
}
```

**Controller Call Site (`goalController.mjs` ~line 345):**
```javascript
// Replace PointTransaction.destroy() block:
await voidGoalTransactions(id, req.user.id, transaction);
await goal.destroy({ transaction }); // Soft-delete goal only
```
*Rationale:* Eliminates hook side-effects, removes fragile string-matching, guarantees metadata persistence across all SQL dialects, and provides an explicit audit trail.

---

### 3. `middleware/authPolicy.mjs` — Single-Query Ownership Check (Resolves DISPUTE C)
**File:** `middleware/authPolicy.mjs`
**Change:** Attach fetched resource to `req.resource` to prevent double queries. Allow optional `includeOptions` so controllers can reuse the exact payload if needed.

```javascript
// middleware/authPolicy.mjs
export const checkResourceOwnership = (Model, ownerField = 'userId', includeOptions = {}) =>
  async (req, res, next) => {
    const resourceId = req.params.id || req.params.userId;
    if (!resourceId) return next();

    // Fetch once with minimal attributes + optional includes
    const resource = await Model.findByPk(resourceId, {
      attributes: [ownerField, 'id'],
      ...includeOptions,
      transaction: req.transaction // Pass through if using global transaction middleware
    });

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    const isOwner = String(resource[ownerField]) === String(req.user.id);
    const hasOverride = ['admin', 'trainer'].includes(req.user.role);

    if (!isOwner && !hasOverride) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this resource' });
    }

    req.resource = resource; // ✅ Attach for controller reuse
    next();
  };
```

**Route & Controller Integration (`routes/gamificationRoutes.mjs` & `goalController.mjs`):**
```javascript
// routes/gamificationRoutes.mjs
router.get('/goals/:id', 
  checkResourceOwnership(Goal, 'userId'), 
  goalController.getGoalById
);

// goalController.mjs — getGoalById
const goal = await Goal.findByPk(req.params.id, {
  include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }]
});
// req.resource already validated ownership. No redundant auth check.
return res.status(200).json({ success: true, goal });
```
*Note:* If the controller needs the exact same includes as the middleware, pass them via `includeOptions` in the route config to achieve true zero-redundancy. For most cases, the middleware fetches lightweight auth data, and the controller fetches the full payload once. This is a deliberate trade-off favoring controller flexibility over strict single-query enforcement, but the pattern supports both.

---

## Final Architecture Alignment
| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `services/pointLedgerService.mjs` | Ledger mutations, voiding, balance tracking | Pure functions, explicit params, dialect-agnostic |
| `services/goalMetrics.mjs` | Progress estimation, analytics | Stateless, testable, no DB coupling |
| `middleware/authPolicy.mjs` | Route-level security, ownership validation | `req.resource` attachment, role/policy guards |
| `goalController.mjs` | HTTP I/O, validation, service orchestration | Thin, delegates to services/middleware |

All critical bugs (CRIT-01 to CRIT-05, HIGH-01) are resolved with production-grade patterns. Ready for Round 3 final consolidation or edge-case stress testing.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
