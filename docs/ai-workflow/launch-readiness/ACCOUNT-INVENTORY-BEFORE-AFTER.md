# Account Inventory: Before & After Cleanup

## Date: 2026-02-12
## Engineer: Claude Opus 4.6 (Launch Stabilization QA)

---

## BEFORE Cleanup (30 active accounts)

| ID | Username | Email | Role | Sessions | Origin |
|----|----------|-------|------|----------|--------|
| 1 | admin | admin@swanstudios.com | admin | 0 | System seed |
| 2 | SeanSwan | ogpswan@yahoo.com | admin | 0 | **Real owner** |
| 3 | client@swanstudios.com | client@swanstudios.com | client | 5 | Dev seed |
| 4 | trainer | trainer@swanstudios.com | trainer | 0 | Dev seed |
| 5 | Jazzypoo | loveswanstudios@protonmail.com | admin | 0 | **Real admin** |
| 6 | testclient_1769476642999 | testclient_...@test.com | client | 0 | Auto-test |
| 7 | testclient_1769476700866 | testclient_...@test.com | client | 0 | Auto-test |
| 8-25 | testclient_176947* (18 accts) | testclient_...@test.com | client | 10 ea | Auto-test batch |
| 28 | client | client@test.com | client | 5 | Dev seed |
| 29 | user | user@test.com | user | 0 | Dev seed |
| 30 | smoketest_1770850875607 | smoketest_...@test.com | user | 0 | Smoke test |
| 31 | phase2test_1770850989514 | phase2test_...@test.com | user | 0 | Phase 2 test |
| 32 | pwtest_1770851002738 | pwtest_...@test.com | user | 0 | Playwright test |

**Breakdown:** 3 admin, 1 trainer, 22 client, 4 user

---

## AFTER Cleanup (6 active accounts)

| ID | Username | Email | Role | Sessions | Status |
|----|----------|-------|------|----------|--------|
| 1 | admin | admin@swanstudios.com | admin | 0 | **ACTIVE** |
| 2 | SeanSwan | ogpswan@yahoo.com | admin | 0 | **ACTIVE** (Owner) |
| 4 | trainer | trainer@swanstudios.com | trainer | 0 | **ACTIVE** (Test trainer) |
| 5 | Jazzypoo | loveswanstudios@protonmail.com | admin | 0 | **ACTIVE** (Jazzy) |
| 28 | client | client@test.com | client | 5 | **ACTIVE** (Test client) |
| 29 | user | user@test.com | user | 0 | **ACTIVE** (Test user) |

**Breakdown:** 3 admin, 1 trainer, 1 client, 1 user

---

## Deactivated Accounts (24 — soft-deactivated via isActive: false)

| IDs | Pattern | Count | Method |
|-----|---------|-------|--------|
| 3 | client@swanstudios.com | 1 | Duplicate test client |
| 6-25 | testclient_* | 20 | Auto-generated test batch |
| 30 | smoketest_* | 1 | Smoke test residue |
| 31 | phase2test_* | 1 | Phase 2 test residue |
| 32 | pwtest_* | 1 | Playwright test residue |

---

## Safety Verification

- [x] No deactivated account had session bookings (sessions only linked to IDs 2, 4, 5)
- [x] No deactivated account had orders or shopping carts
- [x] All 4 kept test accounts verified login post-cleanup (admin/trainer/client/user)
- [x] Real owner accounts (Sean ID=2, Jazzy ID=5) untouched and active
- [x] Deactivation is reversible: set isActive: true via admin PUT /api/auth/users/:id

## Rollback Procedure

```bash
# To reactivate any account:
curl -X PUT https://ss-pt-new.onrender.com/api/auth/users/{ID} \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```
