# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-19T09:00:00Z
- **Slice:** PRISM CAPTURE — canonical surface receipt + reshaped plan (money path)

## What I did / learned
- Started PRISM CAPTURE (speed-to-lead, Sean's #1 money epic). Recon-before-code (Rule 26 receipt) found the
  scope was wrong in Kimi's spec. Committed receipt `3bac8943b` on `claude/build-swan-lens` (NOT pushed). No code.

## Why it matters to Hermes (transferable architecture decision)
- **The public lead-capture backend ALREADY EXISTS — do not rebuild it.** `POST /api/contact` (contactRoutes.mjs:80)
  is public + rate-limited (`contactLimiter`), calls `captureLeadFromContact` (:130) with UTM attribution, and
  fires admin notification + SendGrid email + Twilio SMS owner alerts (:118-152). The `Lead` model
  (models/Lead.mjs:11-78) is rich: email/source/status/**referredByUserId**/**SMS-consent**/tags/lifecycle.
  `leadCaptureShared.mjs` has scoring + helpers.
- **`POST /api/leads` is admin/trainer-ONLY** (leadRoutes.mjs:16-17) — staff manual entry, NOT public capture.
- Kimi's "new leadRoutes + leadAlertService + full schema migration" would DUPLICATE the contact capture path
  (Rule 27) → REJECTED. PRISM CAPTURE reshaped to BIND-ONLY: thin email-only public endpoint reusing
  `leadCaptureService` + the net-new frontend + acquisition-events taxonomy. Backend delta is now small/additive.
- Lesson: Kimi (and any spec author) works without repo knowledge — always run the receipt before a money-path
  build; the biggest win here was NOT writing the duplicate.

## State right now
- Receipt committed `3bac8943b`, unpushed. Kimi adapting the vision to the real pipeline (consult `bsja1dx7p`
  running). No backend/frontend code yet. Gallery agent still live in the shared tree.

## Sean owes / blockers (PRISM forks, after Kimi returns)
- A. endpoint shape (thin `/api/leads/capture` reuse — recommended — vs email-only mode on contact path).
- B. ref_code (nullable columns vs tags for v1). C. acquisition_events (new table vs reuse LeadActivity v1).
- D. owner alert SMS number + sender domain (env; build works flag-off without it).
