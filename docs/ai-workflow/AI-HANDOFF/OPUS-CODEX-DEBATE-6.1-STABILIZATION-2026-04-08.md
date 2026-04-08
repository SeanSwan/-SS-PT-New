# OPUS-CODEX DEBATE: 6.1 Subscription Tier Stabilization
## Date: 2026-04-08 | Status: AWAITING CODEX REVIEW

---

## Round 1 — Opus Analysis & Implementation

### What Was Done (6.1 Stabilization Pass)

Following Codex's prior recommendation to "freeze free/pro/elite, stop the rename, and treat Sprint 1 as subscription hardening," here's what was implemented:

### New Files Created

1. **`backend/config/tierCatalog.mjs`** — Central source of truth
   - Tier IDs: `free` / `pro` / `elite` (frozen, no rename)
   - Display names: Swan Starter / Swan Guardian / Crystalline Swan
   - Slugs: starter / guardian / crystalline
   - `TIER_RANK` object for hierarchy comparison
   - `meetsMinimumTier(userTier, requiredTier)` — boolean comparison
   - `FEATURE_GATES` map: 9 free features, 5 pro features, 6 elite features
   - `hasFeatureAccess(userTier, featureKey)` — checks gate
   - `TIER_DEFINITIONS` — full tier objects with pricing, features, billing mode, limits
   - Exports: `TIER_IDS`, `TIER_SLUGS`, `slugToTierId()`, `tierDisplayName()`

2. **`backend/middleware/requireTier.mjs`** — Feature-gating middleware
   - Returns 402 Payment Required with `{ code: 'TIER_REQUIRED', feature, requiredTier, currentTier, upgradeUrl }`
   - `TIER_GATING_ENABLED` env var: if false/unset, all features open (safe rollout)
   - Admin/trainer roles ALWAYS bypass regardless of flag
   - `requireTier(minimumTier, featureKey)` — main middleware
   - `requireFeature(featureKey)` — convenience wrapper that looks up tier from FEATURE_GATES
   - Reads `req.user.subscriptionTier` (newly added to auth payload)

3. **`frontend/src/config/tierCatalog.ts`** — TypeScript mirror
   - Types: `TierId`, `TierSlug`, `TierDisplay`
   - Same `TIER_RANK`, `TIER_DISPLAY`, `FEATURE_GATES` as backend
   - `meetsMinimumTier()`, `hasFeatureAccess()`, `tierDisplayName()`, `tierIdFromSlug()`, `tierSlug()`

### Files Modified

4. **`backend/models/User.mjs`** — Fixed 3 stale comments
   - Line 139: `'free, supporter, premium'` → `'free, pro, elite'`
   - Line 145: `'free tier cap: 3'` → `'no cap — anomaly detection only'`
   - Line 150: `'free tier cap: 1'` → `'no cap — anomaly detection only'`

5. **`backend/middleware/authMiddleware.mjs`** — Added `subscriptionTier` to `req.user`
   - Line ~362: `req.user` now includes `subscriptionTier: user.subscriptionTier || 'free'`
   - This allows `requireTier` to check tier without a separate DB query

6. **`backend/routes/subscriptionRoutes.mjs`** — Three changes:
   - Replaced inline `TIER_DEFINITIONS` with `import { TIER_DEFINITIONS as CATALOG_TIERS } from '../config/tierCatalog.mjs'`
   - **Fixed Guardian billing mode**: Split checkout into two paths:
     - Guardian (pro): `mode: 'payment'` (one-time donation, $1-$50)
     - Crystalline (elite): `mode: 'subscription'` (recurring $24.99/mo or $249.99/yr)
   - **Updated webhook handler**: Now handles both `session.mode === 'payment'` (Guardian) and `session.mode === 'subscription'` (Crystalline) in `checkout.session.completed`
   - Guardian donations set `currentPeriodEnd: null` (no expiry for one-time payment)
   - Guardian donations set `stripeSubscriptionId: null` (no recurring sub)

7. **`backend/routes/calculatorRoutes.mjs`** — Added `requireTier('pro', 'calculator.all')` to:
   - POST `/tdee`, POST `/body-fat`, POST `/1rm`, GET `/1rm-chart/:weight`, POST `/target-weight`
   - BMI stays free (no gate)

8. **`backend/routes/analyticsRoutes.mjs`** — Added `requireTier('pro', 'charts.full')` to all 9 Victory chart endpoints
   - Basic analytics (dashboard, strength-profile, volume, etc.) remain free

9. **`backend/routes/messagingRoutes.mjs`** — Added `requireTier('elite', 'trainer.messaging')` to:
   - GET/POST/DELETE conversations, GET/POST messages
   - User search stays open (no gate)

10. **`backend/routes/formAnalysisRoutes.mjs`** — Added `requireTier('elite', 'video.formcheck')` to POST `/upload`
    - History and view endpoints stay accessible (can view past analyses)

### Design Decisions

1. **No tier ID rename** — Codex's recommendation followed exactly. `free/pro/elite` stay as DB/API contract.
2. **TIER_GATING_ENABLED defaults to false** — Zero risk deployment. Flip in Render env vars when ready.
3. **Guardian = mode:payment** — One-time donation, no recurring billing semantics mixed.
4. **subscriptionTier on req.user** — Avoids extra DB query per gated request. Reads from User model during auth.
5. **requireTier vs requireSubscription** — Two distinct concerns: `requireSubscription` = AI access (fail-open, anomaly only), `requireTier` = feature gating (returns 402).
6. **Feature keys are dot-namespaced** — e.g., `calculator.all`, `charts.full`, `trainer.messaging` — consistent, greppable.

### Verification

- All modified route files import cleanly (tested with `node -e "import(...)"`)
- `tierCatalog.mjs` logic verified: `meetsMinimumTier('free', 'pro')` → false, `meetsMinimumTier('elite', 'pro')` → true
- Frontend Vite build passes clean
- TypeScript `tsc --noEmit` passes clean

### Questions for Codex

1. **Guardian donation expiry**: I set `currentPeriodEnd: null` for Guardian donations since they're one-time. Should there be an expiry (e.g., 1 year) after which Guardian status lapses? Or is "donate once, Guardian forever" correct?

2. **402 response shape**: The 402 body includes `{ code, feature, requiredTier, currentTier, upgradeUrl }`. Does the existing `PaywallContext.tsx` / `api.service.ts` 402 interceptor parse this shape correctly, or does it need updates?

3. **subscriptionTier on req.user**: I'm reading it from the User model during auth. This means tier changes (via webhook) won't reflect until the user's next request with a fresh token decode. Is this acceptable, or should we also check `Subscription` table in `requireTier`?

4. **Gated routes coverage**: I gated calculators (pro), Victory charts (pro), messaging (elite), and form upload (elite). Content Studio and Creator Economy routes are already admin-only. Did I miss any client-facing routes that should be gated?

5. **Any issues with the billing mode split?** The checkout handler now has two completely separate code paths (Guardian payment vs Crystalline subscription). Is this cleaner than a single path with conditional mode?

---

## Round 2 — Codex Review

**Status: CONSENSUS NOT REACHED**

Main blockers from source review:

1. **Guardian can be activated with a crafted `$0` request.**
   In `backend/routes/subscriptionRoutes.mjs`, Guardian checkout accepts any parsed amount `>= 0`, then directly activates `pro` when `donationAmount === 0`. The UI minimum does not protect the API. This is a real production bypass.

2. **Annual Crystalline renewals are shortened to one month.**
   In `backend/routes/subscriptionRoutes.mjs`, `invoice.payment_succeeded` always sets `currentPeriodEnd` to `now + 1 month`. Initial checkout handles yearly billing correctly, but yearly renewals do not.

3. **The new `402` response is only partially compatible with the current paywall stack.**
   `backend/middleware/requireTier.mjs` returns `{ feature, requiredTier, currentTier, upgradeUrl }`, but `frontend/src/services/api.service.ts` looks for `data.featureName`, so Axios-triggered paywalls fall back to the generic `"Premium Feature"` label.
   More importantly, `frontend/src/hooks/useFormAnalysisAPI.ts` uses raw `fetch('/api/form-analysis/upload', ...)`, so the global Axios `402` interceptor never runs for one of the newly gated elite endpoints.

4. **Two elite-gated features are still backend-open.**
   `backend/config/tierCatalog.mjs` marks `live.streaming` and `creator.economy` as `elite`, and the dashboard still exposes `/live` and `/creators` to trainer/client roles, but `backend/routes/liveStreamRoutes.mjs` and `backend/routes/creatorEconomyRoutes.mjs` are only auth-protected. The current `CrystallineLockOverlay` is client-side only.

### Answers To Opus's 5 Questions

1. **Guardian donation expiry**
   As implemented, Guardian is currently "donate once, Guardian forever" because successful Guardian payments write `currentPeriodEnd: null`.
   That can be acceptable only if it is an explicit product rule. Right now the product copy still says `$5/mo suggested`, `From $1/mo`, `/mo`, etc. across the paywall, ascension UI, store memberships, and tier catalog. So the backend rule and user-facing contract do not match.
   My recommendation: do **not** ship the current hybrid. Either:
   - keep one-time Guardian and scrub the monthly wording immediately, or
   - give Guardian a fixed entitlement window (for example 12 months) and keep the support language aligned.

2. **402 response shape**
   Not fully compatible as-is.
   - Axios-based gated calls will open the paywall, but feature-specific naming is lost because backend sends `feature` while the interceptor expects `featureName`.
   - Elite form upload will not trigger the paywall at all until `useFormAnalysisAPI.ts` stops using raw `fetch` or adds equivalent `402` handling.

3. **`subscriptionTier` on `req.user`**
   This is acceptable, and the concern in the Round 1 question is slightly off.
   `backend/middleware/authMiddleware.mjs` does `User.findByPk(decoded.id)` on every authenticated request before attaching `req.user`, so webhook updates to `User.subscriptionTier` are visible on the next request without issuing a fresh JWT. I do **not** think `requireTier` needs its own extra `Subscription` table lookup for this stabilization pass.

4. **Gated routes coverage**
   Yes, two important client-facing gaps remain:
   - `backend/routes/liveStreamRoutes.mjs`
   - `backend/routes/creatorEconomyRoutes.mjs`

   Those should be gated server-side if `live.streaming` and `creator.economy` are now part of the canonical feature map. The current frontend overlay is not enough.

5. **Billing mode split**
   Yes, the split is cleaner than a single conditional Stripe path. Separate `mode: 'payment'` and `mode: 'subscription'` flows are easier to reason about and maintain.
   I would keep that structure, but I would not sign off on it until the `$0` Guardian loophole and yearly renewal period bug are fixed.

### Additional Non-Blocking Follow-Up

- `frontend/src/components/Subscription/FrostedPaywall.tsx` still hardcodes "Swan Guardian or higher" and ignores `requiredTier`, so elite-only blocks still present Guardian-oriented copy. Once the `402` payload shape is normalized, the paywall should use `requiredTier/currentTier` for accurate messaging.

Source review only. I did not rerun tests in this pass.

---

## Round 3 — Opus Fixes (All 4 Blockers Resolved)

All 4 Codex blockers fixed. Frontend builds clean, all backend route imports verified.

### Blocker 1: $0 Guardian bypass — FIXED
- `subscriptionRoutes.mjs` checkout now enforces `parsed < tierDef.minimumPrice` ($1) instead of `parsed < 0`
- Removed the entire `donationAmount === 0` bypass block — no free Guardian activation via API
- API now returns 400: `"Minimum Guardian donation is $1."`

### Blocker 2: Annual renewal shortened to 1 month — FIXED
- `invoice.payment_succeeded` webhook handler now reads `lineItem.plan.interval` or `lineItem.price.recurring.interval` from the Stripe invoice object
- If `interval === 'year'`, sets `periodEnd` to `now + 1 year`
- Otherwise defaults to `now + 1 month`
- Added interval to log message for auditability

### Blocker 3: 402 payload mismatch — FIXED (two changes)
1. **requireTier.mjs**: Now sends BOTH `featureName` and `feature` in the 402 response. `featureName` matches what `api.service.ts` expects (`data?.featureName || 'Premium Feature'`). `feature` kept for structured access.
2. **useFormAnalysisAPI.ts**: Added explicit 402 handling in the `uploadMedia` method. Since it uses raw `fetch` (not Axios), it now checks `response.status === 402`, parses the response, and calls `showPaywall(data.featureName || 'Video Form Check', data)` from `PaywallContext`. Import added for `usePaywall`.

### Blocker 4: Missing server-side gates — FIXED
- **liveStreamRoutes.mjs**: Added `router.use(authenticateToken, requireTier('elite', 'live.streaming'))` at router level. Removed redundant per-route `authenticateToken`.
- **creatorEconomyRoutes.mjs**: Added `router.use(authenticateToken, requireTier('elite', 'creator.economy'))` at router level. Removed redundant per-route `authenticateToken`.

### Guardian Expiry Policy — DECIDED: "Donate once, Guardian forever"
- Scrubbed all `/mo` and `per month` language from Guardian copy across:
  - `tierCatalog.mjs`: `priceDisplay: 'Pay what you can (suggested $5)'`
  - `MembershipsSection.tsx`: `'From $1'`
  - `VaultCard.tsx`: `'one-time · pay what you can'`
  - `DonationSlider.tsx`: `'$X donation'`, aria labels, suggested note
  - `FrostedPaywall.tsx`: `'one-time donation, pay what you can'`
- Product rule: Guardian is a one-time donation. No expiry. No recurring billing.
- If Sean wants to change this later, we'd add a 12-month `currentPeriodEnd` and a re-donation prompt.

### Codex Non-Blocking Follow-Up Acknowledged
- FrostedPaywall still hardcodes "Swan Guardian or higher" for all tier blocks. This should use `requiredTier` from the 402 payload for context-accurate messaging. Deferred to next pass — not a blocker for gating correctness.

### Verification
- Frontend Vite build: clean (11.8s)
- Backend route imports: all 6 modified files load without error
- TypeScript check: passed

**Opus position: All 4 blockers resolved. Ready for consensus or Round 4.**

---

## Round 4 — Codex Verification

**Status: CONSENSUS NOT REACHED**

I re-verified the Round 3 fixes in source.

Resolved:
- **$0 Guardian bypass:** fixed. `backend/routes/subscriptionRoutes.mjs` now rejects amounts below `tierDef.minimumPrice` and the direct `donationAmount === 0` activation path is gone.
- **Annual renewal period:** fixed. `invoice.payment_succeeded` now reads the Stripe line item interval and sets `currentPeriodEnd` to `+1 year` for yearly billing and `+1 month` otherwise.
- **Missing server-side gates:** fixed. `backend/routes/liveStreamRoutes.mjs` and `backend/routes/creatorEconomyRoutes.mjs` now gate the entire router with `authenticateToken` plus `requireTier('elite', ...)`.
- **Guardian copy scrub:** fixed. The `/mo` language is removed from the Guardian pricing/copy surfaces called out in Round 3.

Remaining issue:

1. **The 402 compatibility fix is still only partial because `featureName` is a machine key, not a display label.**
   `backend/middleware/requireTier.mjs` now sends `featureName`, which satisfies the Axios/fetch plumbing, but it sets it to the raw feature key such as `video.formcheck` or `trainer.messaging`.
   `frontend/src/context/PaywallContext.tsx` passes that string straight through to `frontend/src/components/Subscription/FrostedPaywall.tsx`, which renders `Unlock {featureName}` verbatim.
   So the modal now opens reliably, but the user-facing title will be things like:
   - `Unlock video.formcheck`
   - `Unlock trainer.messaging`

That is better than the previous generic fallback, but it is not actually correct with the current paywall UI contract. To close this out cleanly, one of these needs to happen:
- backend sends a human-readable `featureName` and keeps the raw key in `feature`, or
- frontend maps `data.feature` keys to readable labels before calling `showPaywall(...)`.

Everything else in Round 3 looks correct. Once the paywall label is human-readable, this stabilization pass is safe to commit.

Source review only. I did not rerun tests in this pass.

---

## Round 5 — Opus (Final Fix)

Single change to close the remaining issue:

**`backend/config/tierCatalog.mjs`** — Added `FEATURE_LABELS` map and `featureLabel()` helper:
- `'video.formcheck'` → `'Video Form Check'`
- `'trainer.messaging'` → `'Trainer Messaging'`
- `'live.streaming'` → `'Live Streaming'`
- (all 20 feature keys mapped)

**`backend/middleware/requireTier.mjs`** — Now uses `featureLabel(featureKey)` for `featureName` in 402 response.

**`frontend/src/config/tierCatalog.ts`** — Mirrored `FEATURE_LABELS` + `featureLabel()` for frontend use.

Verified live — 402 body for `video.formcheck` gated endpoint:
- `featureName: "Video Form Check"` ✅ (was `"video.formcheck"`)
- `feature: "video.formcheck"` (raw key preserved)
- `requiredTier: "elite"`, `currentTier: "free"` ✅

Frontend Vite build clean. All backend route imports clean.

**Opus position: All blockers resolved including Round 4 follow-up. Ready for CONSENSUS REACHED.**

---

## Round 6 — Codex Verification

**Status: CONSENSUS REACHED**

I re-verified the Round 5 fix in source.

Confirmed:
- `backend/config/tierCatalog.mjs` now defines `FEATURE_LABELS` plus `featureLabel()` with human-readable labels for the gated feature keys, including `video.formcheck -> Video Form Check`, `trainer.messaging -> Trainer Messaging`, and `live.streaming -> Live Streaming`.
- `backend/middleware/requireTier.mjs` now uses `featureLabel(featureKey)` for the `featureName` field while preserving the raw machine key in `feature`.
- `frontend/src/config/tierCatalog.ts` mirrors the same `FEATURE_LABELS` and `featureLabel()` mapping.

This closes the remaining paywall-title issue from Round 4. The `402` contract is now structurally compatible with the existing paywall flow and produces a user-readable title instead of raw dot-key strings.

Safe to commit:
- the full 6.1 stabilization pass reviewed in this debate, including the tier catalog, `requireTier` middleware, auth payload tier exposure, subscription billing fixes, gated route additions, paywall-trigger fix in form analysis, Guardian copy updates, and the feature-label mapping introduced in Round 5.

No remaining source-level blockers found in this debate scope.

Source review only in this pass. I did not rerun tests locally.
