# Brainstorm: Special Client Pricing / Bonus Sessions

**Date:** 2026-07-04  ·  **Status:** extraction complete · Phase-2 catalog delivered · pending Codex→Fable review  ·  **For:** net-new monetization component spanning storefront page, admin dashboard session logic, checkout, and messaging.

**Artifacts produced:** Fable packet → `docs/ai-workflow/AI-HANDOFF/SPECIAL-PRICING-FABLE-REVIEW-PACKET-2026-07-04.md`; 51-idea enhancement catalog → `docs/ai-workflow/AI-HANDOFF/SPECIAL-PRICING-ENHANCEMENT-CATALOG-2026-07-04.md`. Review sequence: Codex hostile review → Fable final build prompt → Opus 4.8 builds.

## Summary
Sean wants a way to give specific clients a better *effective* deal WITHOUT ever lowering the $175/session headline price. Instead of discounting, the system grants **bonus/extra sessions** so the effective per-session cost lands around $60–$100. Sean (admin) needs presets/options at his disposal to present a client with a "special," deliver it via the existing messaging system (a link) and/or a client-specific storefront view, and re-offer it month over month. This is an *additional* monetization option, not the core product (core = trainer/user/nutrition/AI features).

## Key Decisions (stated as firm by Sean)
- **$175/session headline price is fixed — never lower it.** Rationale: 26 years of experience; price signals worth; low prices repel high-end (millionaire/billionaire) clients and cheapen the product. A peer trainer suggested $50–60/session; Sean rejects that as against his protocol.
- **Deliver value as bonus/extra sessions, not price cuts.** Target effective tiers: ~$60 / $70 / $80 / $90 / $100 per session.
- **Admin needs presets/options at his disposal** to hand a client a special quickly.
- **Delivery (two ideas, possibly both):** (a) send the client a message/link via the existing messaging system that opens their upgraded/discounted package; (b) client-specific storefront view — when that client goes to buy, they see their special ("limited-time special SwanStudios is giving you") instead of / alongside the standard $175 package.
- **Re-offerable monthly** — keep a client on the same deal month over month instead of forcing them into a new, more expensive package each time.
- **Recurrence is a REQUIRED create-time gate, default OFF (fail-closed).** Reuse only if admin explicitly enables it. Validity menu: one-time · 2×/3×/4× · 6-month · 1-year · ongoing auto-approve. Gate is asked right after setting effective price → bonus sessions, before the special is created/approved. (2026-07-04, Sean)
- **Chosen delivery: all three** — in-store personalized card + bell notification w/ deep link + shareable one-time link. (2026-07-04, Sean)
- **Chosen pricing input: type effective $/session** → system computes bonus; paid rate stays $175. (2026-07-04, Sean)
- **Chosen mechanism: BOTH** — buyable special package (main build) + keep existing gift tool. (2026-07-04, Sean)
- **Recurring = BOTH types** — client re-buy + true EFT auto-billing; **trust > EFT** → auto-billing requires explicit "charged $X on <date>" consent + visibility + cancel. (2026-07-04, Sean)
- **Client session ledger** — client always sees bought/bonus/used/gifted/expired. (2026-07-04, Sean)
- **Client→friend gifting** — client can transfer sessions to friends/family to try training. (2026-07-04, Sean)
- **Review routing (2026-07-04, Sean):** Opus 4.8 synthesizes the best logical plan + flags the most-complex items with recommendations; package **token-LIGHT for Fable (Final Decider)** review; Fable returns the final build prompt; then Opus 4.8 builds. Do NOT run chromie/paid Village (cost). Keep the Fable packet lean + high-signal.
- **Strategic frame:** serve affordable "build-me-up" clients now (better than empty hours) AND premium clients later; long-term goal = train only 4–5 hrs/day for more money / less time. Best of both worlds via price integrity + selective specials.
- **Scope discipline:** this is *another option*, not the milk of the app. Do not over-invest at the expense of core trainer/user/nutrition/AI features.

## Q&A Log
### Q0: Vision dump (Sean, unprompted)
Captured above in Summary + Key Decisions. Grill begins at Q1.

### Q1: Core mechanism — buyable special package vs gift-on-top vs both?
- **Recommended:** Buyable special package (Mechanism B) as the main build; noted Gift tool (Mechanism A) already exists.
- **Sean's answer:** **BOTH.** Build the buyable personalized special package (main new work) AND keep the existing 🎁 Gift-sessions button as the comp/goodwill tool. Ship buyable-package first (gift already works). Matches Sean's "best of both worlds."
- **Implication:** Mechanism A = essentially done (converge grants on `/api/sessions/add-to-user`; optional "special/comp" framing later). Mechanism B = the build: finish CustomPackage admin UI + buy flow + wire `bonusSessions` into `SessionGrantService` grant + client-scoped targeting + delivery + recurring.

### Economics reality-check (Phase-2 insight surfaced inline)
Because the $175 paid/sticker rate never moves and the discount is 100% bonus sessions, hitting a low effective price requires many free sessions. On a 10-session buy ($1,750): $100/sess≈+8, $90≈+9, $80≈+12, $70≈+15, $60≈+19 bonus. Sean accepts this is the intended trade (bonus-only, no paid-rate cut). Base-bundle size is a variable to confirm.

### Q2: How does Sean SET the deal (pricing input model)?
- **Recommended:** Type the effective $/session; system keeps paid rate at $175 and computes bonus sessions to hit it, with a live free-session readout. (Preset quick-picks can sit on top.)
- **Sean's answer:** **Type the effective $/session** (system keeps paid $175, computes bonus to hit target, live free-session readout). Preset quick-picks fine on top.
- **Implication:** admin "create special" UI leads with an effective-price field; `pricePerSession` pinned at 175, `bonusSessions` derived to hit `effectiveHourlyRate`.

### Q3: How does the client RECEIVE / redeem the special (delivery surface)?
- **Recommended:** All three — auto "★ Your Special" card in their store on login + a fire-able in-app notification with deep link + a shareable one-time link (text/email/DM). Ship in-store card + notification first (backend-ready), link next (reuse claim-token pattern).
- **Sean's answer:** **All three** (in-store "★ Your Special" card + fire-able bell notification w/ deep link + shareable one-time link). Build card+notification first, link next.
- **Implication:** redemption plumbing needed; all delivery rails exist except pre-filled discounted checkout (build client-scoped special → cart → Stripe → grant).

### Q3b (Sean, unprompted): Recurrence/reuse must be a REQUIRED create-time gate
Sean: the create-special flow must ASK, as a gate before approving anything, whether the deal is reusable — reuse only if the admin toggles it on (default OFF). Validity options: **one-time / 2× / 3× / 4× / 6-month / 1-year / ongoing auto-approve for next purchases.** → firm Key Decision; Q4 resolves the one build-scoping fork.

### Q4: "Ongoing/recurring" — client re-buys, or card auto-charges?
- **Recommended:** Deal stays available for the client to re-buy themselves within the limit (this IS "auto-approve for next purchases" — pre-approved, they click each time). No auto-charging. Reuses existing checkout; true auto-billing can be a later upgrade.
- **Sean's answer:** **BOTH** — client-initiated re-buy AND true auto-billing (EFT/subscription). Sean values the recurring "higher money path" (EFT), BUT **"client trust is MORE important than EFT."** Both offered per-deal.
- **Implication:** v1 scope includes an EFT/subscription path (complex — flag for Fable) alongside the simpler re-buy path; both must be crystal-clear to the client.

### Q4b (Sean, unprompted): Auto-billing trust requirements (MANDATORY)
Any auto-charge/EFT deal: client must **clearly know it will happen and WHEN** (explicit consent + "you'll be charged $X on <date>"), and be able to see/cancel it. Trust > revenue.

### Q4c (Sean, unprompted): Client-facing session ledger (NEW REQUIREMENT)
Client must **always see where all their sessions went** — purchased, bonus, used (per session), gifted, expired. Full transparency ledger, client side.

### Q4d (Sean, unprompted): Client→friend/family session gifting (NEW REQUIREMENT)
Client can **give some of their sessions to relatives/family/friends** to come try training. Existence unknown (Sean unsure) — verifying. Its own sub-feature (abuse/fraud/eligibility/recipient-onboarding design needed). Likely most-complex item → Fable.

## Key Highlights
- The entire feature is a **price-integrity-preserving discount mechanism**: value flows as extra sessions, sticker stays $175.
- Sean is a "give me options at my disposal" operator — least-clicks / preset-driven UX matters.

## Architecture Notes (parent / children / whole)
_All file:line below from the storefront Explore mapper (2026-07-04). Subagent findings — re-verify personally before code (rule 30)._
- **Parent surfaces (mapper-VERIFIED, file:line):**
  - Buyer storefront: `frontend/src/pages/shop/StoreV3.tsx` — canonical, JSX-mounted via `frontend/src/routes/main-routes.tsx` lines 471/478/486 (`/store`, `/swanstudios-store`, `/shop`). Fetches `GET /api/storefront`, renders `PackagesGrid` → `PackageCard.tsx`. (`OptimizedGalaxyStoreFront.tsx` = legacy, NOT mounted.)
  - Admin specials UI: `frontend/src/components/DashBoard/Pages/admin-specials/AdminSpecialsManager.tsx` (LIVE).
  - Archived per-client admin UI: `CustomPackageCreator.tsx` (in `archive/pending-deletion/2026-05-17/…`); dead "VIP Packages" tab at `StoreWorkspace.tsx` line 10 → `/dashboard/store/custom-packages` (no resolving route).
- **Session-grant choke point (mapper-VERIFIED):** `backend/services/SessionGrantService.mjs` — `grantSessionsForCart` (line 158) → `calculateCartSessionCredits` (32-57) → `user.increment('availableSessions', { by: sessionsToAdd })` (198). Transactional + idempotent on `cart.sessionsGranted`. **Single place bonus sessions must be added.** Called by Stripe webhook (`cartRoutes.mjs` 852) + verify-session (`v2PaymentRoutes.mjs` 708).
- **Checkout (mapper-VERIFIED):** active = `POST /api/v2/payments/create-checkout-session` (`v2PaymentRoutes.mjs` 267) → Stripe Checkout, `allow_promotion_codes: true` (513). Legacy `/api/cart/checkout` = HTTP 410 retired.
- **Storefront pricing unit:** `StorefrontItem.mjs` — `pricePerSession` required atomic unit; `sessions`/`totalSessions`/`totalCost` derived by `beforeValidate` hook. No `field:` mappings (1:1 camelCase columns). `packageType ∈ {fixed, monthly, custom}`.
- **Fit with Product Core Loop / dashboards:** monetization/acquisition layer feeding admin proof-of-value; keeps affordable clients in the funnel without diluting premium positioning. Scope-guard: additional option, not the core.

## Existing Infrastructure — CRITICAL DISCOVERY (2026-07-04)
**Feature is ~70% pre-built in the backend across TWO overlapping half-finished systems; NEITHER grants bonus sessions at checkout. Do NOT build a third — consolidate.**

1. **`CustomPackage`** (`backend/models/CustomPackage.mjs`, routes `/api/custom-packages`): per-client (`clientId`, `createdByAdminId`), has `paidSessions` + **`bonusSessions`** + **`pricePerSession` (min $100 guardrail)** + `effectiveHourlyRate` + `expiresAt` + `status`. Route enforces $175 recommended / $120 warn / $100 floor — **encodes Sean's "never cheapen" protocol.** Admin UI archived; **NOT purchasable** (cart/checkout never ingest it; StoreV3 never fetches it).
2. **`AdminSpecial`** (`backend/models/AdminSpecial.mjs`, routes `/api/admin/specials`): **`bonusSessions`** + `bonusDuration` + `applicablePackageIds[]` + `assignedClientIds[]` (empty=all) + date window. **Live admin UI** (`AdminSpecialsManager.tsx`). Public catalog surfaces `activeSpecial.bonusSessions` cosmetically, **filtered by `applicablePackageIds` only — `assignedClientIds` is IGNORED**, and `/api/storefront` is public/unauthenticated (can't target a logged-in client).
3. **CRITICAL BUG / trust gap:** `calculateCartSessionCredits` credits base `sessions`/`totalSessions` ONLY — **never adds `bonusSessions`**. Store advertises bonus; checkout doesn't grant it. [VERIFIED code path via mapper] · [UNKNOWN whether an active special currently misleads live users — needs prod check]. Guarded by tests `StoreV3.pricingTrust.contract.test.tsx`, `StoreV3.fallbackTruth.test.tsx`.
4. **Absent:** coupon/promo DB model; per-client cart price override. **Stripe-side only:** promotion codes (`allow_promotion_codes: true`).

**Consolidation decision = Q1 (per-client `CustomPackage` vs promo `AdminSpecial` vs unify).**

## Admin Session-Grant Infrastructure (2026-07-04 admin mapper)
**Balance source of truth = `User.availableSessions`** (integer counter, `User.mjs:176-181`) — NOT Session rows. `Session` rows (`Session.mjs`) are scheduling instances.
- **Direct admin gift ALREADY WORKS TODAY:** `AddSessionsDialog.tsx` (🎁 Gift icon, presets +1/+5/+10/+20, required reason e.g. "Complimentary / Package upgrade") in the Client Hub billing card (`ClientDetailsPanel.tsx:855` → `BillingSessionsCard`). Two more admin surfaces also add sessions (`SessionAllocationManager` @ `/session-allocation`, `EnhancedAdminSessionsView` @ `/admin-sessions`).
- **Canonical grant endpoint:** `POST /api/sessions/add-to-user` (`routes/sessions.mjs:832`, `protect, adminOnly`) — the ONLY grant path with append-only audit (`manual_session_grant`) + realtime broadcast. **Converge all grants here** (fragmentation: 3 UIs → 2 endpoints + 1 orphan service `SessionAllocationService.addSessionsToUser`).
- **Purchase-grant path:** `SessionGrantService.grantSessionsForCart` → `user.increment('availableSessions')`; credits from `StorefrontItem.sessions||totalSessions`, **never `bonusSessions`** (the bug).
- **Non-deducting client guard (MUST preserve):** `isNonDeductingClient` (`sessionBillingPolicy.mjs:96`) — `move_fitness`/`external` clientSource or `sessionBillingMode='no_session_required'` never grant/deduct; gift dialog hidden for them.
- **Per-client billing view:** `GET /clients/:clientId/billing-overview` (`adminClientRoutes.mjs:400`, `authorize(['admin'])`).

## The Q1 fork — two mechanisms
- **Mechanism A (gift-on-top):** admin drops bonus sessions into the balance; client paid full $175 sticker. **~90% built** (AddSessionsDialog + add-to-user). Max price integrity; deal is invisible on paper; recurring = re-gift each month.
- **Mechanism B (buyable personalized special package):** per-client discounted bundle the client *purchases* via a messaged link / personalized storefront card; bonus baked in + granted on purchase; can rebill monthly. **CustomPackage backend exists; needs admin UI + buy wiring + the bonus-grant fix.** The "come try this deal" enticement hook Sean described.

## Delivery / Messaging Infrastructure (2026-07-04 messaging mapper)
Rails that can carry an offer to a specific client — several already backend-ready:
- **Admin→client DM: WORKS today** — `CommunicationCenter.tsx` (admin client hub) POSTs `/api/messaging/conversations {type:'direct', participantIds:[clientId]}` then `{content}`. BUT messages are **plain text only** (no rich link/CTA card) — a URL rides as raw text. Admin/trainer bypass the tier gate.
- **★ In-app notification w/ deep link: BACKEND-READY, unused by UI** — `POST /api/admin/notifications/broadcast` (`adminNotificationsRoutes.mjs:189`, `protect, adminOnly`) accepts `audience:'specific'` + `userIds[]` + **`link`** + `image`. `Notification.link` (`Notification.mjs:58`) renders in the bell; bell does `navigate(notification.link)` on click (`EnhancedNotificationSection.tsx:627`). No frontend calls it yet (Broadcast FAB hard-disabled). Cleanest in-app carrier for "claim your special."
- **★ One-time token link: PROVEN pattern (reusable)** — `claimTokenService.mjs` + `claimRoutes.mjs`: admin `POST /api/claim/generate-token {clientId}` → `claimUrl=${FRONTEND_URL}/claim/${token}`, 30-day expiry, public verify/activate, frontend `/claim/:token` → `ClaimAccountPage.tsx`. Built for account activation; directly reusable as "admin mints special → client redeems via link."
- **Email/SMS: present** — Nodemailer (`emailService.mjs`), SendGrid (`sendgridService.mjs`, HTML), Twilio SMS (`twilioService.mjs`).
- **Recurring automation: exists** — `AutomationSequence.mjs` / `automationService.mjs` could schedule monthly re-offers.
- **GAP — pre-filled discounted checkout: ABSENT.** No token-gated or client-scoped checkout landing a client on a client-specific price; no per-client cart price override. This is the redemption plumbing to build (recommend: materialize the special as a client-scoped StorefrontItem/variant → reuse existing cart → Stripe → grant, + the bonus-grant fix).
- **Redeemable per-client record: `CustomPackage`** already models it (`clientId`, `status` active→redeemed→expired, `expiresAt`).

## The real build (revised scope, pending Q1 + remaining maps)
1. Pick/unify one mechanism (Q1).
2. Wire bonus-session granting into `SessionGrantService` choke point — idempotently, and make the tests pass truthfully.
3. Add an authenticated, client-scoped pricing/catalog path so a special targets a specific logged-in client (public `/api/storefront` can't).
4. Reconcile admin UI (finish one entry point; kill the dead VIP tab).
5. Delivery: messaging link + client-specific storefront card (pending messaging map).
6. Recurring/monthly re-offer (pending Q).

## Suggestions & Enhancements (Phase 2 — DELIVERED 2026-07-04)
Full synthesis → **`docs/ai-workflow/AI-HANDOFF/SPECIAL-PRICING-FABLE-REVIEW-PACKET-2026-07-04.md`**. Key recommendations:
- **Build on `CustomPackage`, retire `AdminSpecial` from this feature** (+ fix its advertise-but-don't-grant truth bug).
- **`sessions=total` trick:** represent the special as a client-scoped hidden `StorefrontItem` with `sessions`=paid+bonus → existing grant credits full total, **no risky new billing code, bonus-grant bug bypassed.**
- **Reuse the whole pipeline** (cart→Stripe→grant); deliver via 3 surfaces off ONE record.
- **New `SessionTransaction` ledger** = shared backbone for the client ledger + gifting + EFT transparency (trust).
- **Stage the two hardest (EFT auto-billing S6, friend-gifting S7) later**; ship the valuable core (S1–S5) first.
- 6 flagged-complex items routed to Fable for arbitration (see packet §6).

## Minimal-Click Opportunities
- **Apply a special: ≤3 taps** — open client → type effective $ → pick validity → send.
- **Client redeems: 1 tap** — store card or link → pay (reuses existing checkout).
- **Notification nudge: 1 tap** for admin (fire "★ your special" bell push) using the already-built broadcast endpoint.

## Open Flags
- [ ] Exact bonus-session math per tier + whole-session rounding rule (needs Sean's numbers / preference).
- [ ] Trailing transcription phrase "so maybe the charger with the phone in here — look into that" is unclear; confirm what Sean meant (possibly nothing, possibly about the payment charge / Stripe). Do not act on it until clarified.
- [ ] Whether specials are Stripe-backed recurring (subscription) or manually re-created monthly — depends on current checkout/Stripe wiring (Explore mapper checking).
