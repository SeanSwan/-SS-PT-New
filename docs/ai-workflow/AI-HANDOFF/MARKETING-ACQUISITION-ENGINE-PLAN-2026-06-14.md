# Marketing Acquisition Engine — Build Plan (Tier 1)

**Date:** 2026-06-14  ·  **For:** Sean  ·  **Source:** acquisition-engine-design workflow (recon + adversarial stress) + MARKETING-COMMAND-CENTER-AUDIT-2026-06-14. Re-synthesized clean (not from the secret-contaminated workflow output, per the 2026-06-14 incident).
**Context:** Lead CAPTURE of existing traffic shipped today (contact + signup → CRM). The #1 gap now (Chromie verdict) is NEW reach: an email list (zero today) + an AI content engine (demo-only).

## Reality (verified recon)
- **No list exists.** No Subscriber/Newsletter/Campaign model. The ONLY opt-in store is `GalleryVisitor.newsletterOptIn` (`backend/models/GalleryVisitor.mjs:14`), written ONLY at the gallery (`galleryRoutes.mjs:240`), **defaulting to `true`** (pre-checked = opt-OUT by default → a CASL/CAN-SPAM problem). Not deduped (unique per `(email, event_id)`).
- **No unsubscribe anywhere.** GalleryPage says "unsubscribe anytime" (`GalleryPage.tsx:1780`) but there is **no opt-out column, token, route, or suppression list** — an unbacked legal promise.
- **Sending is transactional-only.** `sendgridService.mjs:32` (`@sendgrid/mail`) is single-recipient; no SendGrid Marketing/Contacts API, no batch, no list. Used for booking/receipt/reset/contact.
- **EmailDigestBuilder is a demo shell** (`workspaces/marketing/EmailDigestBuilder.tsx`) — real composer/preview UI, hardcoded data, send button has no handler/fetch.
- **AI content panels are all demo** (BlogWriter/EmailDigest/Keyword/SEO/Competitor). LLM infra to reuse: backend Gemini (`@google/generative-ai`) + aiChatRoutes.

## Adversarial stress — the traps to design around
1. **DELIVERABILITY (HIGH):** never blast marketing from the transactional SendGrid sender/domain — it can wreck reputation and break booking/receipt/reset emails. Marketing must use a SEPARATE sender (subdomain/from-address) and ideally a separate API key. → the SEND sub-slice is LAST + needs a sender decision.
2. **COMPLIANCE (HIGH):** CAN-SPAM/CASL/PIPEDA require: explicit consent (not pre-checked), one-click unsubscribe in every send, a physical mailing address, and a consent record (timestamp+source+IP). Double opt-in is the safe default (esp. given Canada/CASL). The current default-`true` checkbox + missing unsubscribe are live gaps.
3. **SPAM/ABUSE (MED):** public subscribe form needs rate-limit + honeypot/CAPTCHA, and must not let someone subscribe a third party's email without confirmation (double opt-in solves this too).
4. **PRIVACY (MED):** the AI content engine must send ZERO client PII to the LLM (rule 8) — topic/keywords/brand-voice only.
5. **DUPLICATION (LOW):** reuse `sendgridService`, the `Lead`/`Contact` tables as contact sources, and the `EmailDigestBuilder` UI shell — don't rebuild them.

## The build — ranked tight sub-slices (smallest shippable units)
1. **[RECOMMENDED FIRST] Subscriber foundation + double-opt-in + one-click unsubscribe (NO blast send).**
   - `Subscriber` model + migration: `email` (unique, deduped), firstName/lastName (opt), `status` (pending|confirmed|unsubscribed), `source`, `consentAt`/`consentSource`/`consentIp`, `confirmToken`, `unsubscribeToken`, `confirmedAt`/`unsubscribedAt`.
   - `POST /api/newsletter/subscribe` (public, rate-limited + honeypot) → creates `pending` + sends a confirm email via existing `sendgridService` (1:1 transactional confirm — fine on the transactional sender).
   - `GET /api/newsletter/confirm/:token` → `confirmed` + consent record.
   - `GET /api/newsletter/unsubscribe/:token` → `unsubscribed` (fixes the unbacked "unsubscribe anytime" promise — a real compliance fix).
   - TDD-able with mocked model + SendGrid. No mass send, so deliverability risk = zero. **This is the legal, reusable backbone everything else needs.**
2. **Public subscribe form** (footer + homepage) — reuse the ContactV3 form pattern + Crystalline styling, 44px; POSTs to #1.
3. **Backfill gallery opt-ins → Subscriber**, CASL-cautiously (pre-checked = weak consent → import as `pending` and re-confirm, don't assume).
4. **AI content generate endpoint** — `POST /api/marketing/generate-content` (admin-gated, zero-PII) via existing Gemini; wire ONE panel first (caption or blog draft).
5. **[LAST] Broadcast/campaign send** — separate marketing sender + SendGrid Marketing API or batched send, feature-flagged (like the cron). Only after #1-#3 + a deliverability/sender decision.

## Open decisions for Sean (needed before/at build)
- **Double opt-in?** Recommend YES (CASL/CAN-SPAM safe). Single opt-in is more signups but legally riskier given Canada.
- **Where does the subscribe form live?** Recommend footer (site-wide) + homepage hero.
- **Marketing sender identity** — a separate from-address/subdomain for newsletters (e.g. `news@`) to protect transactional deliverability. Sean to decide/set up before the SEND sub-slice (#5), not needed for #1.
- **Migrate existing gallery opt-ins, or start fresh?** Recommend import-as-pending + re-confirm.

## Next slice (rule 60)
Build sub-slice #1 (Subscriber foundation + double-opt-in + unsubscribe) — the compliance backbone, lowest-risk (no mass send), highest-leverage (unlocks everything + fixes the live unsubscribe gap), once Sean answers the double-opt-in decision.
