# Phase 1B Production Smoke Test Results

**Date:** 2026-02-22T09:37Z
**Environment:** https://sswanstudios.com (Render production)
**Admin JWT:** user id=2 (SeanSwan, role=admin)
**Target client:** id=35 (Vickie Valdez, role=client)
**Deploy commit:** `a2f87698` (startup migration 6: post-sync FK repair)

---

## Results: 7/7 PASS

| Step | Endpoint | Method | Expected | Got | Status |
|------|----------|--------|----------|-----|--------|
| 1 | `/api/admin/clients/35/onboarding` | GET | 404 (no questionnaire) | 404 | PASS |
| 2 | `/api/admin/clients/35/onboarding` | POST | 200 (draft created) | 200 | PASS |
| 3 | `/api/admin/clients/35/onboarding` | GET | 200 (returns draft) | 200 | PASS |
| 4 | `/api/admin/clients/35/onboarding` | DELETE | 200 (reset) | 200 | PASS |
| 5 | `/api/admin/clients/35/workouts` | POST | 201 (workout logged) | 201 | PASS |
| 6 | `/api/admin/clients/35/workouts` | GET | 200 (history returned) | 200 | PASS |
| 7 | `/api/admin/clients/35/workouts` | POST | 400 (future date rejected) | 400 | PASS |

## Step 2 Response (Onboarding Draft)
```json
{
  "success": true,
  "questionnaire": {
    "id": 4,
    "userId": 35,
    "status": "in_progress",
    "completionPercentage": 4,
    "primaryGoal": "Weight Loss",
    "trainingTier": null,
    "commitmentLevel": null,
    "healthRisk": "low"
  }
}
```

## Step 5 Response (Workout Log)
```json
{
  "success": true,
  "workout": {
    "id": "d24d50e3-c8f5-4237-99b4-e8c29e9d7988",
    "userId": 35,
    "title": "Smoke Test Workout",
    "date": "2026-02-21T09:37:37.910Z",
    "duration": 45,
    "intensity": 7,
    "totalSets": 2,
    "totalReps": 18,
    "totalWeight": 2590,
    "exerciseCount": 1
  }
}
```

## Step 6 Response (Workout History with Logs)
```json
{
  "success": true,
  "workouts": [{
    "id": "d24d50e3-c8f5-4237-99b4-e8c29e9d7988",
    "title": "Smoke Test Workout",
    "duration": 45,
    "intensity": 7,
    "status": "completed",
    "totalSets": 2,
    "totalReps": 18,
    "totalWeight": 2590,
    "logs": [
      { "id": 1, "exerciseName": "Bench Press", "setNumber": 1, "reps": 10, "weight": 135 },
      { "id": 2, "exerciseName": "Bench Press", "setNumber": 2, "reps": 8, "weight": 155 }
    ]
  }],
  "pagination": { "total": 2, "limit": 20, "offset": 0 }
}
```

## Bugs Fixed During Smoke Testing

| # | Severity | Bug | Root Cause | Fix Commit |
|---|----------|-----|------------|------------|
| 1 | HIGH | `commitmentLevel` validation fails on null | Sequelize v6 runs `min`/`max` on null with `allowNull: true` | `e4baefce` |
| 2 | HIGH | `commitmentLevel: 0` fails custom validator | `Number(null) === 0`, `toNumber(null)` returned 0 not null | `e856897a` |
| 3 | CRITICAL | FK constraint violation on INSERT | Model referenced `"users"` but table is `"Users"` (case-sensitive); `sync()` recreated broken FKs after migration fix | `06522f63` + `a2f87698` |

## Verification Method
Tests executed via Playwright MCP browser automation — `fetch()` calls from authenticated admin session on `sswanstudios.com` against `ss-pt-new.onrender.com` API.
