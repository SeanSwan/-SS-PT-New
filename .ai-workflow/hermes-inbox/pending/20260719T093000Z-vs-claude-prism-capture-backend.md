# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-19T09:30:00Z
- **Slice:** PRISM CAPTURE backend shipped (bind-only, flag-off)

## What I did / learned
- Built + committed the PRISM CAPTURE backend `223d795de` on `claude/build-swan-lens` (NOT pushed; flag-off).
  Kimi adapted its own vision to the existing pipeline (consult), rulings: A new thin `POST /api/leads/capture`
  before protected leadRoutes; B ref_code in tags (no column); C no acquisition_events (Lead.source+tags v1);
  D derive firstName from email local-part.

## Why it matters to Hermes (transferable)
- **New public capture endpoint** `POST /api/leads/capture` (leadCaptureRoutes.mjs), mounted at `/api/leads`
  BEFORE the protected leadRoutes in core/routes.mjs — only `/capture` is public, everything else falls through
  unchanged. Public + `contactLimiter` rate-limited, flag-gated `PRISM_CAPTURE_ENABLED` (404 off). Reuses
  `captureLeadFromContact` + canonical alert trio (createAdminNotification/sendGridEmail/sendSmsMessage). ZERO
  schema migration; ref_code = HMAC(leadId, REF_CODE_PEPPER) in Lead.tags via mergeLeadTags. Opaque 201.
- **Owner-alert env already exists** (reused, no new Sean input): OWNER_EMAIL/OWNER_WIFE_EMAIL, OWNER_PHONE/
  OWNER_WIFE_PHONE, SENDGRID_*, TWILIO_*. New optional env: PRISM_CAPTURE_ENABLED, REF_CODE_PEPPER.
- **Hostile-review fix:** captureLeadFromContact returns {error} (doesn't throw) → silent lead-loss risk; added
  a loud PII-free log on no-leadId.
- **ENV GOTCHA (transferable):** backend deps are NOT installed in the VS worktree OR main backend node_modules
  here — vitest/express unresolvable; `npx vitest --version` works only via npx cache. **Backend tests cannot
  run in this environment.** Verified pure algorithm standalone (9/9) + node --check. The vitest suite MUST run
  in CI/provisioned env before the gated push.

## State right now
- `223d795de` local, unpushed. Frontend PrismCapture (8 files) NOT built yet. Gallery agent committed its WIP
  (shared tree now clean). publicConfigRoutes `prismCapture` runtime flag still to add — Gallery agent holds
  that file, coordinate.

## Sean owes / blockers
- Decide: build frontend now? Then triangle review (money path) + run vitest in CI + gated push.
- Optional prod env when ready: PRISM_CAPTURE_ENABLED=true (only at go-live), REF_CODE_PEPPER (unguessable ref codes).
