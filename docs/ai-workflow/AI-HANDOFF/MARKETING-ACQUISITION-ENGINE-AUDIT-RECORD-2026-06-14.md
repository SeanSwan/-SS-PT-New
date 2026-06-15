# Marketing Acquisition Engine — Phase Audit Record (Rule 48)

> Self-contained closeout for the SwanStudios lead-acquisition phase. A future
> reviewer (Sean / Codex / Gemini / a later AI) should be able to read THIS file
> alone and produce useful security / performance / UX feedback without
> re-reading the plan, the audit, or the source tree.

---

## 1. Phase header

- **Phase name:** Marketing Command Center — Acquisition Engine (capture → nurture → convert).
- **Scope:** Make the marketing tab actually generate money by (a) auto-capturing every first-party acquisition event into the CRM Lead pipeline, (b) standing up a consented newsletter list with public signup forms, (c) turning the Leads tab into an actionable workspace, (d) wiring a default-OFF follow-up automation engine. Explicitly NOT a paid-ads / outbound / social-scheduler build (see §6).
- **Dates:** 2026-06-14 (single-session phase, built on top of the 2026-06-14 Marketing Command Center audit).
- **Reviewers:** Claude (builder + slice-internal hostile review, rule 61) · Codex (hostile cross-review, rule 46 — APPROVE on Tier-0 capture + extraction; checkout-capture co-authored by Codex in the storefront lane) · Sean (CEO, directional approval + scope decisions).
- **Final verdict:** SHIPPED to `origin/main`, Render auto-deployed. Production verified GREEN prior to the final rule-4 extraction (`qa:smoke:prod` 61 pass / 3 skip, `/api/health` healthy). Final commit `0445faf80` (rule-4 split) auto-deploying at time of writing.

---

## 2. Files involved

### Backend — created
| File | Lines | Purpose |
|---|---|---|
| `backend/services/leadCaptureService.mjs` | 244 | Contact/signup/newsletter capture fns + barrel re-export (public API). |
| `backend/services/leadCaptureShared.mjs` | 57 | Shared scoring constants + pure helpers (name split, tag merge, cart-info parse). |
| `backend/services/leadCaptureCheckout.mjs` | 103 | Paid-checkout → converted-Lead capture (idempotent). |
| `backend/services/newsletterService.mjs` | ~99 | Double-opt-in subscribe / confirm / unsubscribe DB logic (crypto tokens). |
| `backend/services/automationCron.mjs` | ~120 | Default-OFF follow-up + renewal scheduler with re-entrancy guards + kill switch. |
| `backend/routes/newsletterRoutes.mjs` | ~135 | Public POST `/subscribe` (rate-limit + honeypot), GET `/confirm/:token`, GET `/unsubscribe/:token`. |
| `backend/models/Subscriber.mjs` | 57 | `subscribers` model (email-unique, status enum, consent fields, tokens, tags). |
| `backend/migrations/20260614120000-create-subscribers.cjs` | 47 | Idempotent + reversible `subscribers` table migration. |

### Backend — modified
| File | Change |
|---|---|
| `backend/routes/contactRoutes.mjs` | Calls `captureLeadFromContact` post-submit (best-effort, non-blocking). |
| `backend/controllers/authController.mjs` | Calls `captureLeadFromSignup` post-commit (excludes Move Fitness + admin/trainer). |
| `backend/routes/v2PaymentRoutes.mjs` | Calls `captureLeadFromCheckout` on verified paid checkout (Codex storefront lane). |
| `backend/core/routes.mjs` | Mounts newsletter router at `/api/newsletter`. |
| `backend/core/startup.mjs` | Registers `automationCron` scheduler (dynamic import, try/catch, after sessionReminder). |
| `backend/services/cartCheckoutFulfillmentService.mjs`, `checkoutStockAvailabilityService.mjs` | Stock-hardening bundled with checkout-capture commit (Codex). |

### Frontend — created
| File | Lines | Purpose |
|---|---|---|
| `frontend/src/hooks/useNewsletterSubscribe.ts` | ~75 | Shared subscribe hook; same-origin-relative API base (staging-safe). |
| `frontend/src/pages/HomePage/components/sections/NewsletterSection.tsx` | ~230 | Homepage email-only signup w/ honeypot, success state, booking CTA + resend. |
| `frontend/src/components/Footer/FooterNewsletter.tsx` | ~126 | Compact footer email signup. |
| `frontend/src/components/DashBoard/workspaces/marketing/LeadPipelinePanel.tsx` | ~235 | Actionable Leads workspace (status edit, follow-up date, mailto/tel, filter). |
| `frontend/src/components/DashBoard/workspaces/marketing/LeadPipelinePanel.styles.ts` | ~176 | Extracted styled-components (rule 4). |

### Frontend — modified
| File | Change |
|---|---|
| `frontend/src/components/DashBoard/workspaces/MarketingWorkspace.tsx` | Deep-link state + `openLeads(filter)` → Leads tab. |
| `frontend/src/components/DashBoard/workspaces/marketing/MarketingCommandOverview.tsx` | Hot/Follow-up metrics now keyboard+click actionable. |
| `frontend/src/pages/HomePage/components/HomePage.V4.tsx` | Mounts `NewsletterSection` (canonical homepage). |
| `frontend/src/components/Footer/Footer.tsx` | Mounts `FooterNewsletter` (rendered via `Layout/layout.tsx`). |
| `frontend/src/components/NewCheckout/SuccessPage.tsx` (+ `.stateViews.tsx`) | Auth-refresh + state views bundled w/ checkout-capture (Codex). |

### Tests — created
`backend/__tests__/leadCaptureService.test.mjs`, `backend/__tests__/contactRoutesLeadCapture.test.mjs`, `backend/__tests__/automationCron.test.mjs`, `backend/__tests__/newsletterRoutes.test.mjs`, `backend/__tests__/newsletterService.test.mjs`, `backend/tests/api/checkoutLeadCapture.contract.test.mjs`, `frontend/src/.../NewsletterSection.test.tsx`, `frontend/src/.../LeadPipelinePanel.test.tsx`.

### Docs — created
`docs/ai-workflow/AI-HANDOFF/MARKETING-COMMAND-CENTER-AUDIT-2026-06-14.md`, `MARKETING-ACQUISITION-ENGINE-PLAN-2026-06-14.md`, `SECRET-EXPOSURE-INCIDENT-2026-06-14.md`, and this record.

---

## 3. Architecture & runtime flow

**Capture (write path — all best-effort, non-blocking):**
```
Contact form  → POST /api/contact      → contactRoutes      → captureLeadFromContact   ┐
Signup        → POST /api/auth/register → authController     → captureLeadFromSignup    ├→ Lead.findOrCreate (dedupe by lower(email))
Checkout paid → POST /api/v2/payments…  → v2PaymentRoutes    → captureLeadFromCheckout  │   + LeadActivity.create (audit trail)
Newsletter ✔  → GET /api/newsletter/confirm/:token → newsletterRoutes → captureLeadFromNewsletter ┘
```
Every capture fn returns a status object (`{leadId, created}` / `{skipped}` / `{error}`) and **never throws** — a CRM write failure can never break the user-facing flow that triggered it. Dedupe is by lowercased email, so multiple touchpoints converge on ONE lead. Score ladder: contact 30 (+15 repeat), signup 50, newsletter 25, checkout 100 (converted). A hotter existing lead is never downgraded by a colder touchpoint.

**Newsletter (consent path):**
```
POST /subscribe → newsletterService.subscribe → Subscriber(status=pending) + email confirm link (token)
GET /confirm/:token → status=confirmed → captureLeadFromNewsletter + sendWelcomeEmail (both non-blocking)
GET /unsubscribe/:token → status=unsubscribed (one-click, no auth)
```

**Nurture (automation):** `automationCron` (default OFF) runs follow-up + renewal ticks on a scheduler registered in startup; only literal `SWAN_AUTOMATION_CRON_ENABLED=true` arms it. Re-entrancy guards prevent overlapping ticks.

**Read path (admin):** Marketing tab → `MarketingWorkspace` → `MarketingCommandOverview` (metrics) + `LeadPipelinePanel` (`GET /api/leads`, `PUT /api/leads/:id` optimistic-with-revert). Overview Hot/Follow-up metrics deep-link into the Leads tab pre-filtered.

---

## 4. Security logic & posture

| Control | What it blocks | Why | How it breaks (attack surface) |
|---|---|---|---|
| **Best-effort capture (try/catch, never throw)** | CRM failure cascading into signup/checkout/contact failure | A marketing write must never block revenue or auth | If a future edit moves a capture call *inside* the critical transaction or `await`s it before the user response, a CRM outage would take down the flow. Keep it post-commit + swallowed. |
| **Double opt-in (pending→confirmed)** | Spam-trap/abuse list poisoning; CAN-SPAM/CASL/PIPEDA consent violation | Only a verified, consenting human enters the nurture list | If `confirm` ever auto-confirms without the emailed token, or capture fires on `pending`, the consent guarantee is void. Capture must remain gated on `status==='confirmed'`. |
| **Honeypot field (`website`)** | Naive bot signups | Cheap first-line bot filter | A bot that omits the hidden field passes; honeypot is necessary-not-sufficient — rate-limit is the real backstop. |
| **Rate limit (20/hr on `/subscribe`)** | Enumeration / list-flooding / email-bombing | Caps abuse volume per source | Window is per-IP; a botnet rotates IPs. Revisit window if abuse appears (see §10). |
| **Crypto tokens (`crypto.randomBytes(24)`)** | Confirm/unsubscribe forgery | Tokens are unguessable | If token length is reduced or a predictable generator is substituted, forgery becomes feasible. |
| **One-click unsubscribe (no auth)** | Deliverability/reputation damage from trapped users | Legal + sender-reputation requirement | Must stay unauthenticated and idempotent; gating it behind login is a compliance regression. |
| **Default-OFF automation (`SWAN_AUTOMATION_CRON_ENABLED`)** | Accidental real SMS/email blast | Kill-switch: nothing sends until Sean explicitly arms it on Render | Only literal `'true'` enables. Any truthy-coercion (`Boolean(env)`) would arm it on any non-empty value — keep the strict literal check. |
| **Re-entrancy guards (automation ticks)** | Overlapping ticks double-sending | Idempotency for scheduled work | Guard is in-process only; multiple Render instances would each tick. Single-instance assumption documented in §10. |
| **Move Fitness + admin/trainer exclusion** | Free no-poach clients / staff entering the *sales* pipeline | Business rule (no-poach) + clean pipeline | Relies on `clientSource==='move_fitness'` + role set; a new staff role not in `NON_SALES_ROLES` would leak into sales leads. |
| **Zero-PII-to-LLM boundary** | Client PII reaching any model | Rule 8 | Capture writes to the DB only; no LLM in the capture path. A future "AI lead scoring" feature must route through the privacy proxy. |
| **Lead has no `metadata` column** | Silent data loss | Rule 58 schema-drift catch | User link stored in `Lead.notes`; structured data in `LeadActivity.metadata` (real column). Re-adding a `metadata` write to `Lead` would silently drop. |

---

## 5. Best practices applied

- **Rule 4** — every file ≤300 lines (final extraction: 244/57/103; `LeadPipelinePanel` styles extracted).
- **Rule 6** — `color-mix(in srgb, var(--token,#fallback) N%, transparent)` for alpha (no raw rgba; fixed an invalid `var()33` bug).
- **Rule 8** — zero PII to LLMs (no model in the capture path).
- **Rule 17 / 61** — slice-internal hostile review before every report; caught the `metadata` drift, the invalid CSS, and the test render-loop.
- **Rule 26/27** — capture wired only on canonical mounted surfaces (`HomePage.V4`, `Footer.tsx`); dormant cinematic homepage NOT touched.
- **Rule 42** — pre-push backend audit on every push (untracked + modified-uncommitted).
- **Rule 44/59** — write- and read-time secret discipline (incident logged, see §11).
- **Rule 46** — Codex hostile cross-review on Tier-0 + checkout.
- **Rule 56** — slice-clean vs baseline disclosed (2 pre-existing backend test failures flagged, outside scope).
- **Rule 58** — proactive schema-drift check on Lead/Subscriber models.
- **Rule 67** — explicit-path commits only; coordinated checkout co-ownership with Codex.
- **Industry:** CAN-SPAM / CASL / PIPEDA double opt-in + one-click unsubscribe + consent record (consent_at/source/ip); OWASP — rate-limit + honeypot + unguessable tokens; idempotent + reversible migration.

---

## 6. Known limitations / non-goals

- **No outbound/paid acquisition** — no ad-spend integration, no cold outreach, no social scheduler. This phase is inbound capture + owned-list nurture only.
- **Automation engine is dormant** — `automationCron` ships OFF; no message has been sent in production. Arming + content review is a separate slice.
- **Single-instance assumption** for the in-process re-entrancy guard (Render is currently single web instance).
- **No transactional-email deliverability hardening** beyond list isolation (SPF/DKIM/DMARC tuning deferred).
- **Lead scoring is static** (fixed ladder, no decay/recency model) — intentional V1 simplicity.
- **+Add-lead inline (#4)** not built (parked).

---

## 7. Performance & UX considerations

- **Least-clicks:** homepage/footer signup is email-only (firstName removed) — one field, one tap. Overview metric → filtered Leads is one click (was: open Leads, then manually filter).
- **Optimistic UI** on lead edits (status/follow-up) with revert-on-failure — no spinner wait.
- **Non-blocking capture** keeps signup/checkout/contact latency unchanged (CRM write is fire-and-forget post-response path).
- **Success state persists** across resend (`submittedOnce`) so the user never loses the confirmation message.
- **44px targets**, keyboard-operable metrics (`role="button"` + Enter/Space), mailto:/tel: quick actions.
- **Accessibility:** honeypot is visually hidden but not a focus trap; success/empty/error states all rendered.

---

## 8. Test coverage summary

- **Backend:** `leadCaptureService.test.mjs` (all 4 capture fns: create/dedupe/skip/no-downgrade/error-swallow), `contactRoutesLeadCapture.test.mjs`, `automationCron.test.mjs` (default-OFF, re-entrancy, cadence split), `newsletterService.test.mjs` + `newsletterRoutes.test.mjs` (subscribe/confirm/unsubscribe/honeypot), `checkoutLeadCapture.contract.test.mjs`. **Final extraction verified: 29 passed** across the 3 lead/newsletter/checkout suites.
- **Frontend:** `NewsletterSection.test.tsx`, `LeadPipelinePanel.test.tsx` (6/6 incl. filter + deep-link).
- **NOT tested / why:** live SendGrid delivery (no integration env; manual-verify on first arm); multi-instance cron behavior (single-instance assumption); real Stripe webhook end-to-end for checkout capture (contract-tested only).

---

## 9. Rollback plan

Executable without paging the builder:
1. **Disable automation instantly:** ensure `SWAN_AUTOMATION_CRON_ENABLED` is unset/≠`true` on Render (default — nothing to do unless it was armed).
2. **Disable newsletter signup:** revert `HomePage.V4.tsx` + `Footer.tsx` mount lines (2 small diffs) — forms vanish, backend routes stay harmless.
3. **Disable capture:** capture calls are isolated post-commit blocks; comment the 4 call sites (`contactRoutes`, `authController`, `v2PaymentRoutes`, `newsletterRoutes`) — flows continue unaffected (they already ignore capture results).
4. **Full phase revert:** `git revert` the range `d37d4f46d..0445faf80` (marketing commits only; note interleaved Coach/Teach/Progress commits must be excluded — revert by SHA list, not range).
5. **DB:** `subscribers` migration is reversible (`down` drops table + enum). Leads created stay (harmless CRM rows).

---

## 10. Future review hooks (the most important section)

Each is one specific thing to attack/verify on re-audit:
- [ ] **Re-verify capture is still non-blocking** — grep the 4 call sites; confirm none was refactored to `await` before the user response or moved inside a transaction.
- [ ] **Audit the rate-limit window (20/hr/IP) for email-bomb feasibility** once real traffic exists; consider per-email and per-IP combined limits + CAPTCHA escalation.
- [ ] **Confirm `SWAN_AUTOMATION_CRON_ENABLED` still uses the strict literal `=== 'true'` check** after any config-loader refactor (truthy-coercion would arm it accidentally).
- [ ] **Before arming automation:** review every outbound message template, confirm unsubscribe link present, confirm OWNER_EMAIL/Twilio env set, dry-run against a test list.
- [ ] **Multi-instance safety:** if Render scales to >1 web instance, the in-process re-entrancy guard no longer prevents double-sends — move the lock to the DB or a dedicated worker.
- [ ] **Token entropy:** verify `crypto.randomBytes(24)` wasn't reduced; check tokens are single-use (confirm invalidates the confirm token).
- [ ] **`NON_SALES_ROLES` completeness:** when new staff roles are added, confirm they're excluded from signup→Lead capture.
- [ ] **Deliverability isolation:** confirm newsletter sends don't share the transactional sender reputation; check SPF/DKIM/DMARC before volume grows.
- [ ] **SendGrid key rotation** (see §11) — confirm rotated before this list scales.
- [ ] **Lead dedupe race:** `findOrCreate` under concurrent identical-email touchpoints — confirm the unique index on `email` holds (no duplicate leads).

---

## 11. Codex / AI review log

- **Tier-0 capture (`d37d4f46d`)** → Codex hostile review → APPROVE (REQ 08:35/08:45).
- **Contact-capture consolidation (`0478dbbc2`)** → Codex-requested refactor into `leadCaptureService` → APPROVE.
- **Checkout-capture (`2704bbb07`)** → co-authored with Codex (storefront lane); bundled stock-hardening + SuccessPage auth-refresh.
- **Automation cadence (`f8ce4c69c`)** → Codex decoupled renewal to a daily cadence.
- **Slice-internal hostile reviews (Claude, rule 61):** caught (a) `Lead.metadata` schema drift → moved link to `notes` + `LeadActivity.metadata`; (b) invalid `var()33` alpha CSS → `color-mix`; (c) `LeadPipelinePanel.test.tsx` infinite render loop → stable hoisted `authAxios` mock.
- **Rule-4 extraction (`0445faf80`)** → slice-internal hostile review (imports complete, no cycle, API preserved) → 29 tests green. Codex review requested in `review-queue.md`.
- **SECURITY INCIDENT (2026-06-14):** a Workflow recon subagent grepped `.env`, surfacing the SendGrid key into the transcript. **Contained** (gitignored, never committed). Logged in `SECRET-EXPOSURE-INCIDENT-2026-06-14.md`. **Rotation DEFERRED by Sean** (reminder in MEMORY.md). Lesson recorded: recon-agent prompts must forbid grepping `.env` contents (rule 59).

---

## 12. Sign-off

- **Status:** SHIPPED. Phase complete pending (a) Sean's explicit phase-close confirmation, (b) SendGrid rotation, (c) Codex review of `0445faf80`.
- **Commit SHAs (chronological):** `d37d4f46d` · `0478dbbc2` · `069b55cd1` · `2704bbb07` · `f8ce4c69c` · `802aa0d2c` · `a13b04557` · `01447c491` · `2d1795cf6` · `4e11d1469` · `e3f2c966b` · `8eb3817f3` · `0445faf80`.
- **Production:** verified GREEN (`qa:smoke:prod` 61 pass/3 skip, `/api/health` healthy) prior to `0445faf80`; final extraction auto-deploying.
- **Next action pointer:** activation gate — arm `SWAN_AUTOMATION_CRON_ENABLED` after content review (separate slice), OR pivot per Business Priority Order (trainer workout logging → chart-truthfulness). SendGrid rotation outstanding.
