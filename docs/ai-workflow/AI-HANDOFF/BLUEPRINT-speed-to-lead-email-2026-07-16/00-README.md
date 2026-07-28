# BLUEPRINT: Speed-to-Lead Email Epic — Builder Package

**Forged by:** Fable 5 (architect) · 2026-07-16
**Builder target:** any competent AI builder with ZERO repo context beyond this package
**Build order:** read 00 → 01 → 06 (bans) FIRST, then execute 05-slices one at a time using 02/03/04 as reference.

## The Builder Contract (binding)

> You are the builder, not the architect. Follow the package to the letter. Where the
> package decides, you do not re-decide — even if you'd do it differently. Where the
> package is silent on something that matters, STOP and return the question; do not
> improvise. Build ONE slice at a time; after each slice, output the diff + the
> acceptance-criteria evidence (test output, curl results) and WAIT for the checkpoint
> verdict before continuing. Never claim a criterion passed without pasting its output.

## What this feature IS (vision, one breath)

When a prospect submits the public contact form (increasingly: from YouTube CTAs
tagged `?type=assessment&utm_source=youtube`), SwanStudios must reply **by email
within minutes** — a warm, Sean-voiced instant response that books the free
assessment — followed by two gentle follow-ups. Speed-to-lead is the locked first
epic of the Marketing Brain: a lead answered in 5 minutes converts several times
better than one answered next day. Sean is a solo operator; the system is his
first responder.

## What ALREADY EXISTS (do not rebuild — verified 2026-07-16 with file:line)

| Piece | Where | State |
|---|---|---|
| Public contact intake | `backend/routes/contactRoutes.mjs:76` POST `/api/contact` (unauthenticated) | LIVE: stores Contact, notifies admins, captures CRM Lead w/ UTM |
| Lead capture + dedupe | `backend/services/leadCaptureService.mjs:66` `captureLeadFromContact` | LIVE: findOrCreate by email, tags, LeadActivity, auto-enrolls nurture |
| Nurture enrollment | `leadCaptureService.mjs:51` `enrollNewLeadInNurture` → `triggerSequence('lead_captured', null, {leadId, clientName})` | LIVE |
| Drip engine | `backend/services/automationService.mjs` (`triggerSequence`, `processScheduledMessages`, `previewScheduledMessages`) | LIVE but **SMS-only** |
| `lead_nurture` sequence | `automationService.mjs:16-55` DEFAULT_SEQUENCES | Seeded **isActive:false**, steps all `channel:'sms'` — OFF because email sender missing |
| Email channel in processor | `processScheduledMessages` | **GAP: routes email → fail 'channel_not_implemented'** |
| Email primitive | `backend/services/sendgridService.mjs:32` `sendGridEmail({to,subject,text,html})` | LIVE, returns `{success,error?}`, never throws |
| Safety rails | arm gate (`automationArmState.mjs` + `SWAN_AUTOMATION_CRON_ENABLED`), frequency caps, `marketingSuppressionService.mjs`, atomic `processing` claim | LIVE — REUSE, never bypass |
| Cron | `backend/services/automationCron.mjs` | LIVE, default-OFF |
| Admin ops routes | `backend/routes/automationSafetyRoutes.mjs` (`/api/automation-safety`-style mounts via `routes.mjs`) | LIVE: status/preview/test-send/process |
| Admin marketing UI | `frontend/src/components/DashBoard/workspaces/marketing/MarketingWorkspace.tsx` (route `/dashboard/marketing`, `UniversalDashboardLayout.routes.tsx:140`), `LeadPipelinePanel.tsx` | LIVE |
| YouTube CTA tagging | branch `claude/contact-cta-type` (ContactV3 `?type=` allowlist) | BUILT, awaiting main merge |

## What THIS PACKAGE builds (the gap, nothing more)

1. **S1** — Email templates module + lead unsubscribe tokens (compliance).
2. **S2** — Unsubscribe endpoint (public GET, HMAC-verified).
3. **S3** — Email channel wired into the drip processor (behind every existing gate).
4. **S4** — `speed_to_lead` email sequence (day 0 instant / day 2 / day 5) + fast-lane kick after capture.
5. **S5** — Admin visibility card in MarketingWorkspace + safety-route extensions.
6. **S6** — Activation runbook + end-to-end verification (owner-allowlisted test send → arm).

## Prior arc (context — how we got here)
- 2026-07-15/16 YouTube grill locked the content doctrine: channel = client-acquisition
  funnel; CTA = free assessment at `/contact?type=assessment&utm_source=youtube&utm_campaign=<pillar>`.
- The CTA tagging slice shipped to branch `claude/contact-cta-type`.
- This epic is the reply half: the lead the CTA creates must be answered in minutes.

## Package map
- `01-architecture.md` — mermaid flowcharts, sequence diagrams, ER diagram
- `02-wireframes.md` — email layouts (the product surface!) + admin card wireframes, exact copy
- `03-contracts.md` — every function signature, endpoint, env var NAME, template schema
- `04-build-order.md` — file-by-file: path, purpose, imports/exports, pattern to mimic
- `05-slices.md` — the six slices with executable acceptance criteria + STOP lines
- `06-bans.md` — house rules + feature bans + Fable's side-notes and quirks for the builder
- `07-checkpoints.md` — checkpoint protocol + verdict log
