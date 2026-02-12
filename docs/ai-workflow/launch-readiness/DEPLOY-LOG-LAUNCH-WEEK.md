# Deploy Log — Launch Week

**Protocol:** Controlled Continuous-Deploy (no freeze)
**Started:** 2026-02-12
**Rollback-ready commit:** `4728591a` (verified stable)

---

## Deploy Classification

| Class | Scope | Rule |
|-------|-------|------|
| **Critical** | Auth, payments, sessions, security, outages | Immediate deploy. Playwright smoke + API health before/after. |
| **Non-critical** | UI polish, refactor, content | Allowed. Use feature flags when possible. |

## Post-Deploy Verification Loop (10-15 min)

Every deploy, run all 5 checks:
1. `GET /api/health` — status healthy, DB connected, store ready
2. Login/logout — admin, trainer, client accounts
3. Purchase flow — store packages load, checkout requires auth, session attribution
4. Schedule — create/book/cancel session
5. Admin dashboard — loads, shows stats, user list accessible

If any P0 regression: **rollback immediately**, document root cause below.

---

## Rollback Procedure

```bash
# 1. Identify last known good commit
git log --oneline -10

# 2. Reset to last stable
git revert HEAD --no-edit   # preferred: creates forward-fix commit
# OR for emergencies:
# git reset --hard <LAST_GOOD_COMMIT> && git push --force origin main

# 3. Verify Render redeploy (2-5 min)
curl https://sswanstudios.com/api/health

# 4. Run smoke loop (see POST-DEPLOY-SMOKE-RESULTS.md)
```

**Current last known good:** `4728591a` docs(launch): add launch readiness audit deliverables

---

## Deploy History

### Deploy #0 — Stabilization Sprint (baseline)
| Field | Value |
|-------|-------|
| **Date** | 2026-02-12 |
| **Commit** | `714cfa03` security(auth): block inactive users at login before token issuance |
| **Class** | Critical |
| **Scope** | Auth — prevent deactivated users from receiving JWT tokens |
| **Risk** | Low — additive guard, no existing behavior changed for active users |
| **Smoke result** | PASS — inactive login returns 401 + no token, active logins unaffected |
| **Rollback needed** | No |

### Deploy #0.1 — Docs only
| Field | Value |
|-------|-------|
| **Date** | 2026-02-12 |
| **Commit** | `4728591a` docs(launch): add launch readiness audit deliverables |
| **Class** | Non-critical |
| **Scope** | Documentation only — no code changes |
| **Risk** | None |
| **Smoke result** | N/A (docs only) |
| **Rollback needed** | No |

---

### Deploy #N — TEMPLATE
| Field | Value |
|-------|-------|
| **Date** | YYYY-MM-DD HH:MM UTC |
| **Commit** | `<hash>` <message> |
| **Class** | Critical / Non-critical |
| **Scope** | What changed and why |
| **Risk** | Low / Medium / High + rationale |
| **Smoke result** | PASS / FAIL — link to POST-DEPLOY-SMOKE-RESULTS.md entry |
| **Rollback needed** | No / Yes — if yes, document root cause below |
| **Root cause** | (if rollback) |

---

*Updated after every deploy. This is the single source of truth for launch week changes.*
