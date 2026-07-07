# Production Data Reset — Step-1 READ-ONLY Inventory (Rule-8-clean repo copy)

**Date:** 2026-07-07 · **Status:** AWAITING SEAN'S APPROVAL — nothing deleted; nothing will be until every gate below clears
**Produced by:** Fable 5 (launch-charter loop) · Method: read-only SQL inventory against prod (READ ONLY transaction; redaction at source per Rules 8/47/59)
**Full identity-hint packet (masked names/emails so Sean can recognize accounts) is LOCAL-ONLY:** `c:/tmp/PROD-DATA-RESET-APPROVAL-PACKET-2026-07-07.md` + raw digest `c:/tmp/prod-user-inventory.out.txt`. This repo copy carries numeric IDs, roles, and counts only — no identity hints (repo-goes-public safe).

---

## ⚠️ 0. HEADLINE LANDMINE — do NOT wipe test accounts before reading this

**Life-critical data is FK-chained to a TEST ACCOUNT with ON DELETE CASCADE.** [VERIFIED live 2026-07-07]

- `immigration_documents` (41 rows) and `immigration_tasks` (53 rows) both carry `user_id = 2` and their FK references the **legacy lowercase `users` table** with `ON DELETE CASCADE`.
- In canonical `"Users"`, id 2 = the real primary admin. But in **lowercase `users`** — the table the FK actually validates against — **id 2 is a test admin account**.
- The app wrote these rows using the canonical `"Users"` id; inserts only passed FK validation because a test row coincidentally exists at lowercase id 2.
- **Consequence:** deleting lowercase test user id 2 (an obvious candidate in any naive test-account wipe) would CASCADE-DELETE all 94 immigration rows — irreplaceable.
- Same trap class (all `ON DELETE CASCADE` → lowercase `users`): `notifications.userId` (11 rows at ids 2/5), `ai_interaction_logs.userId` (6 rows at id 2), `equipment_profiles.trainerId` (3 rows at id 2), `measurement_milestones.userId` (1 row at lowercase id 3 = test trainer).

**Required remediation BEFORE any delete executes:** re-point these FK constraints from `users(id)` to `"Users"(id)` (data is semantically owned by canonical rows; standing repo gotcha "FK constraints must reference \"Users\""). This is Step 4 in the sequence below and is worth doing regardless of the reset.

## 1. Roster summary

| Table | Rows | Notes |
|---|---|---|
| `"Users"` (canonical) | **30** | live user table |
| `users` (legacy lowercase) | **9** | different records at overlapping ids (1,2,3,4,5,6,55,56,57); **58 FK columns still target it** |

Roles in `"Users"`: 5 admin, 15 client, 4 trainer, 6 user. Email-domain classes: 15 obviously synthetic (test/QA/internal domains), 7 real-looking, 8 internal-brand domains needing per-row confirmation.

## 2. Classification (identity hints in the LOCAL packet only)

- **Keep-candidates (name-matched to the 6 real people):** ids **2, 5, 35, 84, 89, 108** — plus three ambiguous twins: **34** (soft-deleted synthetic twin of the admin), **88** (soft-deleted twin of 89), **107** (possibly Sean's own client-role account — keep/delete is Sean's call).
- **Delete-candidates (21):** ids 3, 4, 33, 55, 56, 57, 61, 87, 90, 91, 92, 93, 94, 96, 97, 98, 99, 102, 103, 104, 105. Note: **id 33** is the old test user already flagged for deletion in SECURITY-REMEDIATION-2026-04-19; **id 105** has a real-looking personal email — confirm not a real person before deleting.
- **Legacy lowercase `users` rows (9):** deletable ONLY after the §0 FK re-point (ids 1–6, 55–57; includes twins of real accounts at 1 and 6).

## 3. Data-volume truth

Small DB — scalpel job, not bulk purge: `daily_workout_forms` 213 (108 keep-owned as clients) · `workout_sessions` 20 · `sessions` 11 · `workout_plans` 11 · `daily_hydrations` 23 (20 keep) · `daily_macro_logs` 1 · `messages` 14 (10 keep) · `shopping_carts` 20 (8 keep) · `subscriptions` 7 (3 keep) · `orders` 0 · `financial_transactions` 0 (no real payment history at risk) · `immigration_documents` 41 + `immigration_tasks` 53 (all real, see §0). 193 FK columns reference `"Users"`/`users` with mixed delete rules — NO ACTION/RESTRICT children need explicit ordered deletes inside the transaction.

## 4. Safe execution sequence (each step gated on Sean)

1. ✅ **DONE — this inventory** (re-runnable: `node c:/tmp/prod-user-inventory.mjs`).
2. **Sean approves:** literal keep-id list (esp. 107/88-vs-89/34), delete-id list (incl. lowercase rows + id 105 ruling), hard-delete vs soft-deactivate, and whether seeded demo/mock non-user data is in scope.
3. **Render PG backup/snapshot** — verified restore point before anything mutates.
4. **FK re-point migration (§0):** move lowercase-targeting FK constraints to `"Users"(id)` — additive, reversible, fixes the landmine independent of the reset.
5. **Dry-run cascade preview:** exact per-table death counts for the approved ids (zero PII) → Sean approves the preview.
6. **Transactional delete** honoring FK order, dual-table aware; commit only if post-delete counts match the preview.
7. **Verify:** roster = approved keep-list; immigration rows intact (41/53); app smoke (login, dashboards, charts from real data).

## 5. Sean decision checklist

- [ ] Keep-ids confirmed (107? 88 vs 89? 34 delete?)
- [ ] Id 105: delete or keep?
- [ ] Hard-delete vs soft-deactivate (recommendation: hard-delete; step-3 backup is the safety net)
- [ ] Seeded demo/mock non-user data in scope? (recommendation: separate follow-up pass, same discipline)
- [ ] Approve FK re-point migration (recommend YES regardless)
