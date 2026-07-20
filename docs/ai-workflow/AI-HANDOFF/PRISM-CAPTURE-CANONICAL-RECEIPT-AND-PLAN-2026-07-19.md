# PRISM CAPTURE — Canonical Surface Receipt + reshaped plan (2026-07-19)

> Money-path build. Rule 26 receipt BEFORE code. **Key finding: the public lead-capture backend already exists.**
> Kimi's marketing deep-dive assumed a net-new `POST /api/leads` + `leadAlertService` + full schema migration.
> Recon proves that would DUPLICATE a live public capture pipeline (Rule 27 competing surface). PRISM CAPTURE is
> reshaped to bind to what exists; the net-new value is the FRONTEND + measurement, not a backend rebuild.

## Canonical Surface Receipt — the lead/capture surface (file:line evidence)
| Concern | Reality | Evidence |
|---|---|---|
| Lead model | Rich, already has email/source/status/**referredByUserId**/**SMS-consent**/tags/lifecycle | `backend/models/Lead.mjs:11-78` |
| `POST /api/leads` | EXISTS but **admin/trainer-only** (`protect`+`trainerOrAdminOnly`) — staff manual entry, NOT public | `backend/routes/leadRoutes.mjs:16-17,182-221` |
| **Public capture** | EXISTS: `POST /api/contact` is **public + rate-limited** (`contactLimiter`) | `backend/routes/contactRoutes.mjs:80` |
| Capture → CRM lead | contact POST calls `captureLeadFromContact({contact, formData, consultationType, attribution:{utm*,referrer}})` (non-critical) | `contactRoutes.mjs:130-143` |
| Owner alert loop | Already fires: `createAdminNotification` + `tryEmailNotification` (SendGrid) + SMS (Twilio) on every submission | `contactRoutes.mjs:118-152` |
| Shared capture helpers | scoring consts, `mapClientSourceToLeadSource`, `splitLeadName`, `mergeLeadTags` | `backend/services/leadCaptureShared.mjs:6-52` |
| Rate limiting | `contactLimiter` middleware available | `backend/middleware/rateLimiter.mjs` |
| Alert services | `sendgridService`, `smsService`, `twilioService`, `notificationService` all present | `backend/services/*` |

**Classification (Rule 27):** the public contact capture = **canonical** public lead path. A brand-new
`/api/leads` public POST + `leadAlertService` = **would-be duplicate** → REJECTED. PRISM CAPTURE **binds to the
canonical path**.

## Real gaps (what PRISM CAPTURE actually adds)
1. **Email-ONLY public capture** — the canonical path requires `name`+`email`+`message`; `Lead.firstName` is
   NOT NULL. Kimi's capture is one field (email). Need an email-only entry that reuses `captureLeadFromContact`
   (or a thin sibling) with a derived `firstName` (email local-part) — no schema change to the NOT-NULL column.
2. **Guaranteed-alert hardening** — the alert fires but is best-effort; verify boot-time env-presence check +
   `alerted_at`/`ack_sent_at` stamping (Kimi's audit columns) — additive nullable columns if missing.
3. **Referral seed** — `Lead.referredByUserId` is USER-only; lead→lead `?ref=<code>` needs a per-lead `ref_code`
   + a `referred_by` link (additive nullable). Kimi: no rewards economy at seed — just the data.
4. **Refraction success state** — book (OrientationForm prefilled) / trainer-intent (`/contact?intent=trainer`)
   / share — all FRONTEND.
5. **Acquisition-events taxonomy** — per `MEASUREMENT-CHARTER.md` (funnel baseline); reuse `LeadActivity`+`tags`
   where possible before adding `acquisition_events`.
6. **The whole PrismCapture UI** — net-new (`components/marketing/PrismCapture/*`), house gate pattern, flag-off.

## Reshaped backend delta (SMALL, additive, no duplicate)
- **Thin public endpoint** for email-only capture reusing `leadCaptureService`/`captureLeadFromContact`
  (public, `contactLimiter`, `source:'website'`, derived firstName, `intent`+`ref` in tags/fields). Path TBD
  with Kimi/Sean — NOT a second CRM.
- **Additive nullable columns** only if the audit/ref data isn't already carryable in `tags`: `alerted_at`,
  `ack_sent_at`, `ref_code`, `referred_by`. Rule 58 information_schema prod check first; no destructive change.
- Existing admin `/api/leads` + the contact POST stay byte-equivalent.

## Open decisions (Kimi adapts the vision → then Sean)
- **A. Endpoint shape:** new thin `POST /api/leads/capture` reusing the service, vs extend the contact path with
  an email-only mode. (Recommend: thin sibling endpoint — keeps contact byte-equivalent, one clear public
  capture verb.)
- **B. ref_code:** add nullable `ref_code`/`referred_by` columns, vs carry ref in `tags` JSONB for v1.
- **C. acquisition_events:** new table now, vs reuse `LeadActivity` for v1 and add the table with the funnel
  transport (Wave-2). 
- **D. Sean Decision-Pack input:** owner alert SMS number + sender domain (env-presence; build works flag-off
  without it).

## Sequence
Receipt (this doc) → **Kimi adapts the vision to the real pipeline** (consult running) → present A/B/C to Sean →
build backend-thin first (bind-only, additive) → PrismCapture frontend (flag-off, house gate) → hostile-to-dry →
triangle (money path) → Rule 42 backend audit → **Sean-gated push**. Coordinate commit timing with the live
Gallery agent (shared tree; explicit-path staging).
