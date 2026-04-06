# CODEBASE AUDIT REVIEW ONLY - 2026-04-05

> PURPOSE: Compact handoff for Claude review and approval before Codex applies fixes.
> AUTHOR: Codex | LAST MODIFIED: 2026-04-05
> STATUS: Review only. No code changes requested from Claude.

## What This File Does

This file captures the current codebase audit in a token-efficient format so another model can review the findings without re-scanning the entire repository.

This is not a fix plan and not an implementation doc. It is a review handoff for Claude to:

1. verify the findings,
2. assess severity and likely fix direction,
3. flag any false positives or missing context,
4. approve or refine the fix approach,
5. avoid making any code changes.

## How It Fits In The Workflow

1. Codex audits the repo and records findings here.
2. Claude reviews this file and the cited code locations only.
3. Claude responds with approval, objections, or fix guidance only.
4. Codex performs the implementation in a later step.
5. For future work, create a new sibling `.md` file for each task instead of overloading one giant doc.

## Scope

- Repo: `SS-PT`
- Audit date: `2026-04-05`
- Change policy: report only, no code changes performed

## Validation Summary

### Commands Run

- `cd frontend && npm run build`
- `cd frontend && npm test -- --run --reporter verbose`
- `cd backend && npm test`
- `cd frontend && npx tsc --noEmit`

### Results

- Frontend build passed, with chunk-size and dynamic import warnings.
- Frontend tests did not run because no matching test files were found.
- Backend tests failed in 6 files / 9 tests, and those failures align with several findings below.
- Frontend type-check did not complete because Node ran out of heap at roughly 4 GB.

## Findings

### 1. CRITICAL - Production CORS is effectively open with credentials

**Why this matters**

The backend reflects arbitrary `Origin` values on multiple paths and also allows all origins in the main CORS callback, while session cookies are configured for cross-site use in production. That materially weakens origin-based protection for cookie-backed routes.

**Primary references**

- `backend/core/app.mjs:72`
- `backend/core/app.mjs:75`
- `backend/core/app.mjs:112`
- `backend/core/app.mjs:125`
- `backend/core/app.mjs:138`
- `backend/core/app.mjs:152`
- `backend/core/app.mjs:165`
- `backend/core/app.mjs:169`
- `backend/core/app.mjs:173`
- `backend/core/app.mjs:178`
- `backend/config/session.mjs:127`
- `backend/config/session.mjs:135`

**Review question for Claude**

Confirm whether the deployed CORS/session combination creates a real cross-origin abuse or CSRF-class risk for this app's authenticated routes.

### 2. HIGH - Stored XSS path in storefront content

**Why this matters**

Storefront descriptions are accepted from `req.body`, persisted, returned by the API, and rendered in the frontend with `dangerouslySetInnerHTML`. If admin-entered HTML is not sanitized before storage or before rendering, shoppers can receive executable markup.

**Primary references**

- `backend/routes/storefrontRoutes.mjs:86`
- `backend/routes/storefrontRoutes.mjs:320`
- `backend/routes/storefrontRoutes.mjs:382`
- `backend/routes/storefrontRoutes.mjs:445`
- `frontend/src/components/Shop/ProductDetail.tsx:543`

**Review question for Claude**

Verify whether there is any sanitization layer elsewhere, and if not, confirm this as a stored-XSS issue rather than a theoretical sink.

### 3. HIGH - AI rate-limiter behavior is regressed and inconsistent with tests

**Why this matters**

The middleware assumes `res.on/removeListener` exists, auto-releases concurrent locks on response completion, and the controller also releases the same lock in `finally`. Tests are failing around this area, which means the security control is not stable or internally consistent.

**Primary references**

- `backend/middleware/aiRateLimiter.mjs:44`
- `backend/middleware/aiRateLimiter.mjs:50`
- `backend/middleware/aiRateLimiter.mjs:51`
- `backend/middleware/aiRateLimiter.mjs:52`
- `backend/middleware/aiRateLimiter.mjs:54`
- `backend/middleware/aiRateLimiter.mjs:55`
- `backend/services/ai/rateLimiter.mjs:75`
- `backend/services/ai/rateLimiter.mjs:133`
- `backend/controllers/aiWorkoutController.mjs:1006`

**Review question for Claude**

Confirm the root cause: double-release, middleware contract fragility, threshold drift from test expectations, or a combination of all three.

### 4. HIGH - Privacy aliasing contract regressed

**Why this matters**

The de-identification service ignores a provided `spiritName` and always falls back to `Client` or `Client #ID`. The onboarding controller's alias generator also ignores `preferredAlias`. This breaks the current privacy behavior and already fails backend tests.

**Primary references**

- `backend/services/deIdentificationService.mjs:148`
- `backend/services/deIdentificationService.mjs:160`
- `backend/services/deIdentificationService.mjs:163`
- `backend/controllers/onboardingController.mjs:24`
- `backend/controllers/onboardingController.mjs:254`
- `backend/controllers/onboardingController.mjs:263`

**Review question for Claude**

Determine whether the current code intentionally removed alias support or accidentally broke a still-required privacy contract.

### 5. MEDIUM - Token refresh flow is split across incompatible frontend paths

**Why this matters**

The main API service stores and uses a refresh token with `/api/auth/refresh-token`, but `AuthContext` calls `/api/auth/refresh` and sends only the access token. Any path relying on the context refresh method is likely to fail once the access token expires.

**Primary references**

- `frontend/src/services/api.service.ts:40`
- `frontend/src/services/api.service.ts:77`
- `frontend/src/services/api.service.ts:142`
- `frontend/src/services/api.service.ts:152`
- `frontend/src/services/api.service.ts:364`
- `frontend/src/services/api.service.ts:367`
- `frontend/src/context/AuthContext.tsx:111`
- `frontend/src/context/AuthContext.tsx:116`
- `frontend/src/context/AuthContext.tsx:117`
- `backend/routes/authRoutes.mjs:363`
- `backend/routes/authRoutes.mjs:369`

**Review question for Claude**

Confirm whether both refresh paths are meant to coexist or whether `AuthContext` is simply stale and broken.

### 6. MEDIUM - Trainer access branch likely throws in auth route

**Why this matters**

`GET /api/auth/users/:id` uses `TrainerClient.findOne(...)` in a trainer authorization branch, but the route file does not appear to import or define `TrainerClient` locally. That would turn an authorization check into a 500.

**Primary references**

- `backend/routes/authRoutes.mjs:746`

**Review question for Claude**

Verify whether `TrainerClient` is actually missing in this file scope or injected indirectly somewhere non-obvious.

### 7. MEDIUM - AI consent status defaults the wrong user for trainer/admin callers

**Why this matters**

The controller comments imply admin/trainer callers should specify a target user, but the actual logic falls back to the requester's own ID when `userId` is omitted. Tests are already failing on this mismatch.

**Primary references**

- `backend/controllers/aiConsentController.mjs:38`
- `backend/controllers/aiConsentController.mjs:128`
- `backend/controllers/aiConsentController.mjs:192`
- `backend/controllers/aiConsentController.mjs:204`
- `backend/controllers/aiConsentController.mjs:289`

**Review question for Claude**

Confirm whether the intended contract is "explicit target required" or "silent self-default," and whether tests correctly represent the intended behavior.

### 8. MEDIUM - Parse-error HTTP status is inconsistent across controllers

**Why this matters**

One controller maps `parse_error` to `503` while another maps the same failure class to `502`. That creates an unstable API contract and is already visible in failing tests.

**Primary references**

- `backend/controllers/aiWorkoutController.mjs:808`
- `backend/controllers/aiWorkoutController.mjs:813`
- `backend/controllers/longHorizonController.mjs:461`
- `backend/controllers/longHorizonController.mjs:466`

**Review question for Claude**

Confirm the intended canonical status code for upstream AI parse failures and whether both controllers should match.

### 9. MEDIUM - Session configuration has insecure production fallbacks

**Why this matters**

The app falls back to a hardcoded session secret and to default `MemoryStore` behavior when Redis setup fails. If those paths are reachable in production, session integrity and multi-instance consistency are weaker than intended.

**Primary references**

- `backend/config/session.mjs:117`
- `backend/config/session.mjs:127`
- `backend/config/session.mjs:135`

**Review question for Claude**

Assess whether these fallbacks are acceptable only for local/dev or whether current production startup could silently degrade into them.

### 10. LOW - Additional unsafe HTML sink exists in shared UI

**Why this matters**

There is another `dangerouslySetInnerHTML` usage in a shared component. I did not confirm exploitability because the data source may be internal/static, but it should be checked rather than ignored.

**Primary references**

- `frontend/src/components/Shared/TeachMeToggle.tsx:206`

**Review question for Claude**

Check whether this sink is fed only trusted static content or whether it deserves elevation.

## Suggested Claude Review Output

Ask Claude to return:

1. `Confirmed findings`
2. `Rejected or downgraded findings`
3. `Missing findings`
4. `Fix strategy approval`
5. `Priority order for implementation`

Keep the response review-only. No edits, no patch suggestions in code form, no file modifications.

## Copy-Paste Prompt For Claude

```md
Review this handoff file only first, then inspect only the cited code locations it references:

docs/ai-workflow/AI-HANDOFF/CODEBASE-AUDIT-REVIEW-ONLY-2026-04-05.md

Task:
- Review the audit findings and cited files/lines.
- Confirm which findings are real, which are overstated, and which are missing context.
- Tell me what the fixes should be at a high level, but do NOT write or change any code.
- Do NOT apply patches.
- Do NOT propose a full implementation.
- This is approval/review only. Codex will do the fixes after your review.

Output requirements:
- Start with findings, ordered by severity.
- Use this structure:
  1. Confirmed findings
  2. Rejected or downgraded findings
  3. Missing findings
  4. Recommended fix direction
  5. Approval status for Codex to implement
- For each item, cite the exact repo file and line references from the handoff.
- If you disagree with a finding, explain why.
- If you think the risk is conditional, state the condition explicitly.
- Keep token use low by staying focused on the cited locations rather than re-auditing unrelated parts of the codebase.

Important constraints:
- Review only.
- No code edits.
- No "I fixed it" actions.
- No broad repo rewrite suggestions unless they are necessary to resolve a confirmed critical issue.
```

## Future Use Pattern

For future tasks, create a new sibling markdown file in `docs/ai-workflow/AI-HANDOFF/` using a name like:

- `TASK-NAME-REVIEW-ONLY-YYYY-MM-DD.md`
- `TASK-NAME-IMPLEMENTATION-HANDOFF-YYYY-MM-DD.md`
- `TASK-NAME-VERIFICATION-REPORT-YYYY-MM-DD.md`

Keep each file small and task-specific. That is the token-saving strategy:

- one task,
- one compact markdown handoff,
- one review prompt,
- one later implementation step.
