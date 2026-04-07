# Coach Assistant Onboarding QA Audit

Date: 2026-04-06
Mode: Review only
Requested scope: Coach Assistant client onboarding, claim/login handoff, and first-use account access flow
AI Village: Not used
Code changes: None

## What I Checked

- Read the Coach Assistant client-creation output flow in:
  - `backend/routes/aiChatRoutes.mjs`
  - `backend/routes/clientOnboardRoutes.mjs`
  - `backend/routes/claimRoutes.mjs`
  - `backend/controllers/authController.mjs`
  - `frontend/src/components/DashBoard/Pages/coach-assistant/CoachMessage.tsx`
  - `frontend/src/pages/ClaimAccountPage.tsx`
  - `frontend/src/pages/EnhancedLoginModal.tsx`
  - `frontend/src/routes/main-routes.tsx`
- Ran read-only Playwright QA against:
  - `http://localhost:5173/dashboard/admin/coach-assistant`
  - `http://localhost:5173/claim/SWAN-TEST`

## Important Constraint

- I did **not** create a test client, consume a real claim token, or activate an account.
- This repo’s local dev environment is configured to use the production database, so a full write-path QA pass would create or mutate real user records.
- Because of that, this audit is a code-backed and browser-backed review, not a destructive end-to-end creation run.

## Findings

### 1. HIGH
File: `backend/routes/aiChatRoutes.mjs:489`
File: `backend/routes/aiChatRoutes.mjs:498`
File: `backend/routes/aiChatRoutes.mjs:499`
File: `backend/routes/aiChatRoutes.mjs:500`
File: `backend/routes/aiChatRoutes.mjs:633`
File: `backend/routes/aiChatRoutes.mjs:634`
File: `backend/routes/aiChatRoutes.mjs:635`
File: `backend/controllers/authController.mjs:669`
File: `backend/controllers/authController.mjs:764`
File: `backend/controllers/authController.mjs:1359`
File: `backend/controllers/authController.mjs:1396`
File: `backend/routes/claimRoutes.mjs:183`
File: `backend/routes/claimRoutes.mjs:185`
File: `backend/routes/claimRoutes.mjs:186`
Issue: Coach Assistant-created clients are issued **both** a temporary password and a claim token/URL, but the auth flow does not appear to block `invited` or `stub` accounts from logging in directly. The login path checks credentials and then goes straight into `forcePasswordChange`; the forced-password-change endpoint clears only `forcePasswordChange`, not `accountStatus`, `claimTokenHash`, or `claimTokenExpires`. The claim flow, by contrast, does clear those fields and activates the account properly. That creates two competing first-use paths, and the direct temp-password path can bypass claim-state cleanup.
Fix: Pick one activation model and enforce it. Either:
- Block `stub`/`invited` accounts from normal login until claim is completed, or
- Make forced first-login password change fully activate the account and invalidate the claim token exactly like `/api/claim/activate`.

### 2. HIGH
File: `frontend/src/pages/ClaimAccountPage.tsx:368`
File: `backend/routes/claimRoutes.mjs:189`
File: `backend/routes/claimRoutes.mjs:191`
File: `backend/routes/aiChatRoutes.mjs:489`
Issue: The claim page tells the client `Email (optional — use your own email)`, but the backend only allows email replacement when `accountStatus === 'stub'`. Coach Assistant-created accounts are currently created as `invited`, not `stub`, so that UI promise is false for the exact flow being audited.
Fix: Align the UI and backend contract. Either:
- Let `invited` accounts update email during claim if that is intended, or
- Change the claim page copy to clearly state when email changes are allowed.

### 3. MEDIUM
File: `frontend/src/components/DashBoard/Pages/coach-assistant/CoachMessage.tsx:170`
File: `frontend/src/components/DashBoard/Pages/coach-assistant/CoachMessage.tsx:176`
File: `frontend/src/components/DashBoard/Pages/coach-assistant/CoachMessage.tsx:182`
File: `frontend/src/pages/ClaimAccountPage.tsx:414`
Issue: The trainer-facing Coach Assistant result card displays `Claim Code`, `Claim URL`, and `Temp Password` with equal weight and no instruction about which artifact the client should actually use first. The public claim page also includes `Already have an account? Log in`, which reinforces the ambiguous dual-path behavior instead of guiding the client through one canonical first-use flow.
Fix: Make the handoff explicit. For example:
- Show a single primary next step based on account type
- De-emphasize or hide unused credentials
- Add exact instructions such as `Use the claim link first, then log in afterward`

### 4. MEDIUM
File: `backend/routes/claimRoutes.mjs:158`
File: `backend/controllers/authController.mjs:1359`
File: `backend/controllers/authController.mjs:434`
File: `backend/controllers/authController.mjs:1160`
File: `backend/controllers/authController.mjs:1536`
File: `frontend/src/pages/ClaimAccountPage.tsx:263`
File: `frontend/src/pages/EnhancedLoginModal.tsx:576`
Issue: First-use password setup is weaker than the main auth policy. Claim activation and forced first-login password change only enforce a minimum length of 8 characters, while registration, normal password change, and reset-password use `validatePasswordStrength(...)`. That means the onboarding path can create weaker passwords than the rest of the auth system allows.
Fix: Reuse the same password-strength validation for claim activation and forced first-login password changes so first-use accounts follow the same policy as standard accounts.

### 5. LOW
File: `frontend/src/routes/main-routes.tsx:382`
File: `frontend/src/routes/main-routes.tsx:464`
File: `frontend/src/routes/main-routes.tsx:472`
Issue: The public claim page is mounted inside the global `Layout`, not an isolated auth/claim shell. In the browser pass, opening a claim link while already authenticated showed normal signed-in chrome, dashboard access, profile controls, and logout. That does not break the public route itself, but it makes trainer-side QA misleading and muddies the client-first feel of the claiming experience.
Fix: Consider rendering claim routes in an auth-style or standalone layout so claim links stay visually and behaviorally isolated from an existing signed-in session.

## Playwright Notes

- `http://localhost:5173/claim/SWAN-TEST` correctly showed the invalid-token message and did not expose password fields before token verification.
- `http://localhost:5173/dashboard/admin/coach-assistant` loaded successfully in the current local browser context and exposed historical onboarding conversations plus the trainer-facing client-creation card structure.
- I did not submit new onboarding prompts or click through real claim activation because that would write to production-backed data from this local environment.

## Verdict

The flow is **not** something I would call “100 percent flawless” yet.

The main issue is not front-end crashing. The main issue is that the product currently has **two different first-use activation models** competing with each other:

- `claim code / claim URL / activate account`
- `temp password / log in / forced password change`

Right now those paths are not cleanly unified, and the UI messaging does not resolve the ambiguity.

## Claude Review Prompt

```text
Review only. Do not edit code.

Read:
- docs/ai-workflow/AI-HANDOFF/COACH-ASSISTANT-ONBOARDING-QA-AUDIT-2026-04-06.md

Task:
- Confirm whether each finding is legitimate
- Adjust severity if needed
- State whether Coach Assistant onboarding should use:
  1. claim-first activation only
  2. temp-password login only
  3. a unified hybrid flow with explicit state cleanup

Important constraints:
- No AI Village
- No code changes
- This audit intentionally did not create or claim a real client because local dev points at the production DB

Reply format:
1. Finding verdict: APPROVED / REJECTED / ADJUST SEVERITY
2. Short reason
3. Recommended canonical first-use flow
4. Any missing issue that should be added
```
