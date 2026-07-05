# Swan Aura / Unity Weaver Alpha Review — 2026-07-02

**Branch:** `aura-social-current`  
**Status:** Recursive hostile fixes applied; merge/deploy still blocked until branch is reconciled with `main` and local/CI tests pass.

---

## Alpha review purpose

This review gates the Swan Aura / Unity Weaver work before the next implementation slice continues. It covers the work from the prior slices:

- User Dashboard Swan Aura panel
- deterministic nudge selector
- local Quick Post good-energy guidance
- backend-owned prosocial XP awards
- backend-owned social-action XP orchestration
- avatar economy blueprint
- SwanCoin soft-currency bridge
- marketplace SwanCoin API/UI aliases

This review supersedes older hostile-review status rows that said the branch started from current main.

---

## Alpha / hostile blockers found

### A1 — Branch is behind current `main`

**Severity:** High before merge/deploy  
**Finding:** `aura-social-current` is ahead of `main` but also behind current `main`. This shifted during review as `main` moved; latest connector compare showed the branch diverged and was behind by 75 commits. The newer `main` commits appear to include Body Map / Global Client Context work, but the branch still needs a local rebase or merge before deployment.

**Status:** Not fixable through this connector without a proper merge/rebase operation.  
**Required local action:**

```bash
git fetch origin
git checkout aura-social-current
git merge origin/main
# or: git rebase origin/main
```

Then run the verification commands below.

---

### A2 — SwanCoin bridge was missing from code

**Severity:** High for avatar economy readiness  
**Finding:** Prior slices documented XP versus SwanCoins, but there was no actual backend service connecting Unity Weaver rewards to the avatar marketplace spend currency.

**Fix applied:** Added:

```txt
backend/services/avatarEconomy/swanCoinService.mjs
```

The service awards SwanCoins through the legacy `AvatarHome.crystalBalance` field while exposing product language as:

```txt
currencyName: SwanCoins
legacyField: crystalBalance
```

XP remains permanent progression and is not spent.

---

### A3 — Prosocial XP and SwanCoins could desync

**Severity:** High  
**Finding:** If XP and SwanCoins are awarded in separate flows, a partial failure could leave the user with XP but no spend currency, or vice versa.

**Fix applied:** Updated:

```txt
backend/services/unityWeaver/prosocialXPService.mjs
```

The service now wraps the central XP ledger award and SwanCoin award in one Sequelize transaction. Duplicate, cooldown, daily-limit, and validation-only paths award neither SwanCoins nor additional XP.

---

### A4 — Unity Weaver response lacked SwanCoin result fields

**Severity:** Medium  
**Finding:** Social action responses only exposed XP data, so future UI could not display SwanCoin earnings.

**Fix applied:** Updated:

```txt
backend/services/unityWeaver/socialActionProsocialMiddleware.mjs
```

`unityWeaverXP` now includes optional:

```txt
swanCoinsAwarded
swanCoinBalance
currencyName
legacyField
```

---

### A5 — Avatar marketplace still exposed “Crystals” as primary language

**Severity:** Medium  
**Finding:** Avatar Home already used `crystalBalance`, but the product direction is SwanCoins. Keeping “Crystals” as user-facing language would fragment the economy.

**Fix applied:** Updated:

```txt
backend/utils/avatarHomeMarketplaceRoutes.mjs
backend/utils/avatarHomeMarketplaceState.mjs
frontend/src/components/AvatarHome/CrystallineMarketplace.tsx
```

Backend now exposes `/api/avatar-home/swan-coins` as an alias while keeping `/api/avatar-home/crystals` for backward compatibility. Frontend now displays SwanCoins. Purchase helper error copy now says SwanCoins, and purchase responses include `swanCoins` / `balance` aliases.

---

### A6 — `useSocialFeed` could insert malformed post payloads

**Severity:** Medium  
**Finding:** If a social post response ever returned success without a `post`, the hook could insert `undefined` into feed state.

**Fix applied:** Updated:

```txt
frontend/src/hooks/social/useSocialFeed.ts
```

The hook now guards missing post/comment payloads, keeps Unity Weaver XP backend-owned, and displays Swan Aura XP/SwanCoin bonus text only when the backend says an award happened.

---

### A7 — Unit tests did not cover SwanCoin bridge

**Severity:** Medium  
**Finding:** XP tests covered point awards but not SwanCoin awards.

**Fix applied:** Added/updated:

```txt
backend/tests/unit/swanCoinService.test.mjs
backend/tests/unit/unityWeaverProsocialXPService.test.mjs
backend/tests/unit/unityWeaverSocialActionProsocialMiddleware.test.mjs
backend/tests/unit/avatarHomeMarketplaceState.test.mjs
```

Coverage now includes SwanCoin service validation, creation of missing AvatarHome wallets, balance increments, atomic XP+SwanCoin award expectations, duplicate behavior, validation-only safety paths, marketplace purchase payload aliases, and response summary fields.

---

### A8 — Direct Unity Weaver award route could farm automatic XP/SwanCoins

**Severity:** Critical  
**Finding:** The explicit `POST /api/social/unity-weaver/prosocial-events/award` route could be called directly by an authenticated user for low-risk automatic events such as `encourage_friend` or `positive_progress_post`, bypassing the “real action first” rule.

**Fix applied:** Updated:

```txt
backend/routes/unityWeaverRoutes.mjs
backend/tests/unit/unityWeaverRoutes.test.mjs
```

Direct self-service award requests for automatic events now return 403. Low-risk automatic events can only be awarded through backend-owned social action middleware after a real post/comment/reaction succeeds. The explicit route only allows validation-only events to enter the non-awarding review path.

---

### A9 — Event lookup allowed hostile prototype keys

**Severity:** Medium  
**Finding:** Direct object indexing can treat hostile keys such as `__proto__` as inherited properties instead of unknown event IDs.

**Fix applied:** Updated:

```txt
backend/services/unityWeaver/prosocialXPService.mjs
backend/routes/unityWeaverRoutes.mjs
backend/tests/unit/unityWeaverProsocialXPService.test.mjs
backend/tests/unit/unityWeaverRoutes.test.mjs
```

Event lookup now uses own-property checks before accepting an event ID. Prototype keys are rejected as unknown events before DB or ledger work.

---

### A10 — Marketplace purchase response used a nonexistent balance alias

**Severity:** Medium  
**Finding:** The route attempted to set `swanCoins` from `purchase.data.balance` before the helper returned that field. This could leave SwanCoin aliases undefined in purchase responses.

**Fix applied:** Updated:

```txt
backend/utils/avatarHomeMarketplaceState.mjs
backend/utils/avatarHomeMarketplaceRoutes.mjs
backend/tests/unit/avatarHomeMarketplaceState.test.mjs
```

Purchase helper now returns `crystalBalance`, `swanCoins`, and `balance`. Route response forwards those aliases consistently.

---

## Current gate status

| Gate | Status |
|---|---|
| User Dashboard / Client Dashboard separation preserved | PASS |
| Swan Coach not made responsible for moderation | PASS |
| No AI provider calls | PASS |
| No hide/block/delete moderation behavior | PASS |
| XP remains permanent progression | PASS |
| SwanCoins use legacy `crystalBalance` without migration | PASS |
| Marketplace spends SwanCoins, not XP | PASS |
| Low-risk Unity Weaver events can award XP + SwanCoins only after verified actions | PASS |
| Direct self-service low-risk XP/SwanCoin farming blocked | PASS |
| Validation-only safety events remain non-awarding | PASS |
| Frontend does not decide XP eligibility | PASS |
| Frontend CTA clicks do not award XP | PASS |
| Event lookup rejects prototype keys | PASS |
| Branch reconciled with latest `main` | BLOCKED — behind current `main` |
| Automated backend tests | NOT VERIFIED in connector |
| Automated frontend build/tests | NOT VERIFIED in connector |

---

## Required verification before merge/deploy

Run locally:

```bash
# From repo root
git fetch origin
git checkout aura-social-current
git merge origin/main

cd backend
npm test -- unityWeaver
npm test -- swanCoin
npm test -- avatarHomeMarketplaceState
npm test

cd ../frontend
npm run build
npm run test:run
```

Manual/API smoke targets:

1. `/user-dashboard` renders.
2. Swan Aura panel appears on Home support panels.
3. Quick Post still submits through existing `createPost` path.
4. Neutral drafts show no noisy Swan Aura copy.
5. Tone-risk drafts show private, non-blocking guidance.
6. `GET /api/social/unity-weaver/prosocial-events` returns authenticated event catalog.
7. Direct automatic award request for `encourage_friend` returns 403.
8. Unknown/prototype event IDs return 400 before service calls.
9. Self-awards are rejected.
10. Validation-only events return `requires_validation` and no XP/SwanCoins.
11. Workout/transformation/achievement/challenge post can append Unity Weaver XP + SwanCoins.
12. Swan/heart reaction on another user's post can append Unity Weaver XP + SwanCoins.
13. Gratitude/supportive comment on another user's post can append Unity Weaver XP + SwanCoins.
14. Failed XP/SwanCoin side effect does not break original post/comment/reaction response.
15. `/api/avatar-home/crystals` still works.
16. `/api/avatar-home/swan-coins` works.
17. Avatar marketplace displays SwanCoins.
18. Avatar purchases reduce SwanCoins only; XP/level does not go down.

---

## Alpha verdict

**REVISE BEFORE MERGE / SAFE TO CONTINUE CODING WITH CAUTION**

All code-level hostile issues found in this recursive pass were fixed. The remaining blockers are operational: branch reconciliation with current `main`, then local/CI backend and frontend verification. Do not push to Render until those are complete.
