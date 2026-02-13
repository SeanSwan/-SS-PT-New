# Pre-Launch Database Snapshot

**Captured:** 2026-02-12T22:07 UTC
**Production commit at snapshot time:** `4728591a` (includes `714cfa03` inactive-user login block)
**Server uptime:** ~1207s

---

## Users (30 total: 6 active, 24 inactive)

### Active Accounts (6)
| ID | Username | Role | Available Sessions |
|----|----------|------|--------------------|
| 1 | admin | admin | 0 |
| 2 | SeanSwan | admin | 0 |
| 4 | trainer | trainer | 0 |
| 5 | Jazzypoo | admin | 0 |
| 28 | client | client | 5 |
| 29 | user | user | 0 |

### Inactive Accounts (24)
| ID | Username | Role | Available Sessions |
|----|----------|------|--------------------|
| 3 | client@swanstudios.com | client | 5 |
| 6 | testclient_1769476642999 | client | 0 |
| 7 | testclient_1769476700866 | client | 0 |
| 8 | testclient_1769476745698 | client | 10 |
| 9 | testclient_1769476788402 | client | 10 |
| 10 | testclient_1769476804573 | client | 10 |
| 11 | testclient_1769476835745 | client | 10 |
| 12 | testclient_1769476910189 | client | 10 |
| 13 | testclient_1769476952161 | client | 10 |
| 14 | testclient_1769476986815 | client | 10 |
| 15 | testclient_1769477011741 | client | 10 |
| 16 | testclient_1769477032909 | client | 10 |
| 17 | testclient_1769477067068 | client | 10 |
| 18 | testclient_1769477082562 | client | 10 |
| 19 | testclient_1769477108930 | client | 10 |
| 20 | testclient_1769477135919 | client | 10 |
| 21 | testclient_1769477173013 | client | 10 |
| 22 | testclient_1769477201456 | client | 10 |
| 23 | testclient_1769477500597 | client | 10 |
| 24 | testclient_1769477544089 | client | 10 |
| 25 | testclient_1769477700234 | client | 10 |
| 30 | smoketest_1770850875607 | user | 0 |
| 31 | phase2test_1770850989514 | user | 0 |
| 32 | pwtest_1770851002738 | user | 0 |

## Sessions (47 total)
- All sessions linked to userIds 2, 4, 5 (admins/trainer)
- 1 test session (ID 73) created during stabilization verification

## Orders
- **0 orders** in production

## Shopping Carts
- Admin (ID 1) has 1 active cart with 2 test items:
  - SwanStudios 6 Month ($18,900 / 108 sessions)
  - SwanStudios Express ($1,100 / 10 sessions)
  - Total: $20,000 / 118 sessions
- No other carts found

## Rollback Reference
To reactivate any deactivated account:
```bash
curl -X PUT https://sswanstudios.com/api/auth/users/{ID} \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```
