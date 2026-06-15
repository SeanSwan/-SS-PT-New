# Marketing Acquisition — Attribution & Measurement Phase Audit Record (Rule 48)

> Sub-phase of the acquisition engine. The capture backbone is covered by
> `MARKETING-ACQUISITION-ENGINE-AUDIT-RECORD-2026-06-14.md`; THIS record covers the
> 2026-06-15 attribution + measurement + hardening work. Self-contained for future
> security/perf/UX re-audit.

## 1. Phase header
- **Phase:** Acquisition channel attribution + measurement (capture → measure half of capture→measure→activate→convert).
- **Scope:** Record WHICH channel sent every lead (all public funnels), surface "which channel produces leads + clients" in the Marketing Command Center, and harden the result.
- **Dates:** 2026-06-15 (single session).
- **Reviewers:** Claude (builder + per-slice hostile review, rule 61) · 4-angle adversarial-verify workflow (PII/RBAC/correctness/frontend) · Codex (review requests filed, async).
- **Verdict:** SHIPPED to origin/main (5 commits). Adversarially verified; high findings fixed or flagged.

## 2. Files involved
**Backend**
- `services/leadCaptureShared.mjs` — `deriveChannel`/`channelToLeadSource`/`channelTags` + `aggregateLeadChannels` (rollup w/ converted count). ~155L.
- `services/leadCaptureService.mjs` — contact/signup/newsletter capture accept `attribution`→channel. 263L.
- `routes/newsletterRoutes.mjs` — /subscribe derives channel + sanitizes utm_campaign; /confirm passes channel.
- `routes/contactRoutes.mjs`, `controllers/authController.mjs` — forward utm/referrer to capture.
- `routes/leadRoutes.mjs` — GET /stats `byChannel`; PUT /:id `assignedTrainerId` admin-gated (security fix). ~378L (pre-existing multi-handler debt).
- `__tests__/leadCaptureShared.test.mjs`, `__tests__/leadCaptureService.test.mjs` — channel/aggregation/conversion tests.

**Frontend**
- `utils/acquisitionAttribution.ts` (new) — shared `readAcquisitionParams()` (utm + cross-site referrer).
- `hooks/useNewsletterSubscribe.ts`, `pages/contactpage/ContactV3.tsx`, `context/AuthContext.tsx` — send attribution (one injection point each).
- `components/DashBoard/workspaces/marketing/MarketingCommandOverview.{tsx,styles.ts,test.tsx}` — "Leads by Channel" rollup + conversion + tests.
- `components/.../marketing/LeadPipelinePanel.{tsx,styles.ts}` — channel badge; 44px touch targets.

**Commits:** `1b4f9d63f` (newsletter attribution) · `7ffdff37f` (rollup) · `9c9bbe795` (contact+signup attribution) · `ea4632a14` (conversion-by-channel) · `0c5da2686` (adversarial-verify hardening).

## 3. Architecture & runtime flow
```
Public form (newsletter / contact / signup)
  → readAcquisitionParams() reads utm_* + cross-site referrer (browser, non-PII)
  → POST includes utm/referrer
  → backend route forwards to captureLeadFrom{Newsletter,Contact,Signup}
  → deriveChannel(utm/referrer) → { channel, leadSource } (sanitized, hostname-matched)
  → Lead: source=leadSource (valid ENUM), sourceDetail "· via <channel>", tags ['channel:<x>'],
    LeadActivity.metadata.channel. Existing leads: tag-only, no source/score overwrite.
Admin reads: GET /api/leads/stats → aggregateLeadChannels(rows) → byChannel[{channel,count,converted}]
  → MarketingCommandOverview "Leads by Channel" bars (+ gold "N won"); LeadPipelinePanel per-lead badge.
```
Newsletter channel persists on `Subscriber.source` at subscribe time → flows to confirm-time lead capture.

## 4. Security logic & posture
| Control | What / Why | How it could break |
|---|---|---|
| **utm/referrer sanitization** (`sanitizeChannelToken`, `cleanCampaign`) | Strips attacker input to `[a-z0-9_-]`≤40 before it enters tags/sourceDetail/consentSource | If a new persistence path interpolates a raw utm/referrer without the allowlist (the utm_campaign→consentSource case was the 0c5da2686 fix). |
| **Only derived channel persists** (raw referrer never stored) | Rule 8 / privacy — the full referrer URL could carry PII | A future change storing `req.body.referrer` directly would regress this. |
| **No LLM in the capture path** | Rule 8 — zero PII to LLMs | An "AI lead scoring" feature must route via the privacy proxy. |
| **Lead.source ENUM safety** (`channelToLeadSource` only returns gallery/walk_in/website/referral/social_media/other) | Channel labels live in tags, never in the ENUM column | Putting a raw channel string in `source` would be schema drift (R58). |
| **RBAC PUT gate** (`assignedTrainerId` admin-only) | A trainer must not reassign/unassign leads outside their scope (data-isolation) | If `assignedTrainerId` is added back to the generic `allowedFields`, the bypass returns. **NO automated test yet** — see hooks. |
| **RBAC read scope** (`where.assignedTrainerId = req.user.id` for trainers on GET / + /stats byChannel) | Trainers only see/aggregate their own leads | A new lead query missing the trainer `where` would leak cross-trainer. |
| **Best-effort capture** (try/catch, never throws) | A CRM failure must never break signup/contact/newsletter | Moving capture before the user response / `await`ing it into the critical path. |

## 5. Best practices applied
R3 surgical (each touch minimal; pre-existing large files left alone) · R4 (new files <300; helpers extracted) · R6 (color-mix/token styles) · R8 (non-PII attribution, no LLM) · R17/R61 (per-slice + adversarial hostile review) · R42 (pre-push backend audit) · R52 (pre-existing debt disclosed, not silently re-flagged) · R56 (baseline disclosed: leadRoutes pre-existing over-cap) · R58 (ENUM-safe source) · R67 (explicit-path commits; no overlap with Codex/fusion). OWASP A01 (the RBAC gate).

## 6. Known limitations / non-goals
- **Checkout-first conversions** (paid without a prior attributed lead) get `source='website'` — channel not captured at the Stripe verify step (no utm there). Codex storefront lane. Rare (buyers usually sign up/contact first → already attributed).
- **ContactV2 / EnhancedContactPage** still use the old `origin.includes(...)` API base (legacy fallbacks; ContactV3 is canonical/mounted).
- **`leadRoutes` has no supertest harness** — the RBAC fix is logic-verified only.
- Channel rollup capped at top-8 + 5000-row fetch (early-stage volume).
- Drill-down (click channel → filter Leads) NOT built (marginal value vs client-side bucketing complexity).
- Nurture/activation (the "convert" half) deliberately NOT built — needs Sean's outward-send arming decision (see §10).

## 7. Performance & UX
- One-click attribution is invisible to users (no extra fields). Channel rollup is read-only, capped, RBAC-scoped.
- "Leads by Channel" + per-lead badge + gold "N won" make channel ROI scannable in one glance → least-clicks decision surface.
- Capture stays non-blocking (no added latency to the user flow). 44px targets on the Leads controls (fixed in 0c5da2686).

## 8. Test coverage
- Backend: `leadCaptureShared.test.mjs` (deriveChannel aliases/referrer/sanitization, channelToLeadSource, channelTags, aggregateLeadChannels count+converted+topN) + `leadCaptureService.test.mjs` (newsletter/contact/signup channel attribution, dedupe, non-blocking). 45+ green.
- Frontend: `MarketingCommandOverview.test.tsx` (rollup render, conversion "won", empty, offline) + `LeadPipelinePanel.test.tsx` + `NewsletterSection.test.tsx`. All green; tsc 0; build OK.
- **NOT tested:** leadRoutes RBAC PUT (no harness); readAcquisitionParams "with utm" path (jsdom window mocking brittle — backend deriveChannel covers derivation).

## 9. Rollback plan
- Channel attribution is additive + non-blocking — reverting any slice degrades gracefully (leads bucket as `direct`). `git revert` the relevant SHA(s) from §2 (marketing-only; no migration to undo).
- RBAC fix (0c5da2686) is a hardening — do NOT revert it without re-introducing the bypass.

## 10. Future review hooks (most important)
- [ ] **Re-audit the RBAC PUT gate** — confirm `assignedTrainerId` stays admin-only; build a `leadRoutes` supertest harness asserting a trainer PUT cannot set it (currently untested).
- [ ] **Close the checkout-first attribution gap** (Codex storefront lane): thread attribution into `captureLeadFromCheckout` / persist channel at session-create so paid-first leads aren't `source='website'`.
- [ ] **Fix or retire ContactV2 / EnhancedContactPage** API-base bug (same-origin) — they're legacy fallbacks but reachable if ContactV3 lazy-load fails.
- [ ] **Re-check utm/referrer sanitization** against any NEW persistence path (the utm_campaign→consentSource leak was found here — look for siblings).
- [ ] **Verify `/api/leads` GET returns `tags`** so the per-lead channel badge renders (graceful if not).
- [ ] **When lead volume grows past ~5000**, move `aggregateLeadChannels` to a JSONB SQL aggregation (current capped fetch).
- [ ] **Confirm no raw referrer is ever persisted** as new capture paths are added.

## 11. AI review log
- Per-slice hostile review (rule 61) on each of the 5 commits (caught: metadata column, invalid CSS earlier; here: leadRoutes over-cap → helper extraction).
- 4-angle adversarial-verify workflow (PII/RBAC/correctness/frontend), 0 critical / 6 high / 11 total. High findings → fixed (utm_campaign sanitize, RBAC gate, ContactV3 base, 44px) or flagged (checkout gap, legacy contact bases). Rule-30/52 applied: by-design/low findings noted not fixed.
- Codex review requests filed in `review-queue.md` (REQ 07:10, 07:40 + today's slices).

## 12. Sign-off
- **Status:** SHIPPED + adversarially verified. Measurement half of the acquisition engine COMPLETE.
- **Commit SHAs:** `1b4f9d63f` · `7ffdff37f` · `9c9bbe795` · `ea4632a14` · `0c5da2686`.
- **Next phase:** ACTIVATION/nurture (the "convert" half) — gated on Sean's decision to arm outward sending (`SWAN_AUTOMATION_CRON_ENABLED`) + nurture-content review. Not buildable autonomously without that gate.
