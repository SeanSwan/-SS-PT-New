# Fable Review Packet — Special Client Pricing / Bonus Sessions

**Date:** 2026-07-04 · **From:** Opus 4.8 (Claude) · **For:** Fable (Final Decider) · **Then:** Opus 4.8 builds
**Intent doc (depth):** `docs/ai-workflow/brainstorms/special-client-pricing-bonus-sessions-2026-07-04.md`
**Ask of Fable:** validate/adjust the recommended architecture, arbitrate the 6 flagged-complex items, return ONE final build prompt. Kept lean on purpose — spend tokens on §FLAGGED, not the recap.

---

## 1. Goal (1 paragraph)
Give specific clients a better *effective* deal WITHOUT lowering the $175/session sticker. Discount is delivered as **bonus sessions** (effective ~$60–$100/sess). Sean (admin) crafts a per-client "special," delivers it (in-store card + notification + shareable link), can make it reusable/recurring under a required gate, and everyone can see a transparent session ledger. Additional monetization option — NOT the core product.

## 2. Locked decisions (from the grill — do not re-litigate)
- **$175 paid/sticker rate never moves.** Discount = bonus sessions only. (Price integrity is the whole point.)
- **Mechanism: BOTH** — (A) the existing 🎁 admin gift-sessions tool stays as comp/goodwill; (B) NEW buyable per-client special package = the main build. Ship B first.
- **Pricing input:** admin types **effective $/session** → system computes bonus to hit it (paid pinned $175), live free-session readout.
- **Delivery: all three** — auto "★ Your Special" in-store card + fire-able bell notification w/ deep link + shareable one-time link.
- **Recurrence: REQUIRED create-time gate, default OFF (fail-closed).** Validity menu: one-time · 2×/3×/4× · 6-month · 1-year · ongoing. Reuse only if admin toggles it.
- **Recurring = both types:** client-initiated re-buy AND true EFT auto-billing. **Trust > EFT** → auto-billing needs explicit "charged $X on <date>" consent + visibility + one-click cancel.
- **Client session ledger (NEW):** client always sees bought / bonus / used / gifted / expired.
- **Client→friend/family gifting (NEW):** client can transfer sessions to friends/family to try training.
- **Privacy (Rule 8):** IDs/roles only; zero PII to LLMs.

## 3. Ground truth (verified by 3 read-only mappers + grep, 2026-07-04)
- **Balance source of truth:** `User.availableSessions` (integer counter). Grants converge best on `POST /api/sessions/add-to-user` (audited `manual_session_grant` + realtime).
- **Purchase→grant choke point:** `SessionGrantService.grantSessionsForCart` → `user.increment('availableSessions')`, credits `StorefrontItem.sessions||totalSessions`, **transactional + idempotent** on `cart.sessionsGranted`.
- **~70% pre-built, TWO half-finished systems, NEITHER grants bonus at checkout:**
  - `CustomPackage` (`/api/custom-packages`): per-client, `bonusSessions` + `pricePerSession` **$100 floor** + `expiresAt` + `status`(active/redeemed/expired/cancelled). **Admin UI archived; not purchasable.** ← best spine.
  - `AdminSpecial` (`/api/admin/specials`): broadcast promo, `assignedClientIds` **stored but ignored**; live admin UI; **advertises bonus on store but checkout never grants it** (trust bug; guarded by `StoreV3.pricingTrust.contract.test.tsx`).
- **Canonical store:** `StoreV3.tsx` (`/store`), fetches public `GET /api/storefront`. **Checkout:** `POST /api/v2/payments/create-checkout-session` (Stripe, `allow_promotion_codes:true`).
- **Delivery rails ready:** admin→client DM works (text-only); `POST /api/admin/notifications/broadcast` (`audience:'specific'` + `userIds` + `link`) backend-ready but **no UI calls it**; `claimTokenService` one-time-link pattern (`/claim/:token`) reusable for offers; Nodemailer/SendGrid/Twilio present.
- **ABSENT:** per-client cart price override; coupon/promo DB model; **client→client session transfer** (grep-confirmed); **unified session-transaction ledger** (grep-confirmed — only the bare counter + audit logs).

## 4. Recommended architecture (my best logical design — Fable: confirm or adjust)
- **Spine = `CustomPackage`** (extend it). Leave `AdminSpecial` out of this feature (see FLAG #4).
- **Represent the buyable special as a client-scoped, hidden `StorefrontItem`** where `sessions = totalSessions = paid+bonus` and `price = paid total`. → the EXISTING grant credits the full total automatically; **no change to the grant choke point, and the bonus-grant bug is bypassed for the buyable path** (bonus baked into `sessions`, framed in UI as "10 paid + 12 bonus"). See FLAG #6.
- **Reuse the whole pipeline:** client-scoped special → existing cart → existing Stripe checkout → existing grant.
- **Delivery = one record, three surfaces:** authenticated client-scoped catalog call → in-store card; `notifications/broadcast` + `link` → bell nudge; `claimTokenService`-style link → outside-app share.
- **Recurrence:** add `validityType` / `maxRedemptions` / `remainingRedemptions` / `validUntil` / `autoBill`. Re-buy model = keep special active + enforce limit server-side, client re-buys each cycle. EFT = Stripe subscription (FLAG #1).
- **Ledger:** new `SessionTransaction` event log (type/delta/balanceAfter/ref) written at every balance change; client view reads it; becomes the audit backbone for gifting + EFT + comp (FLAG #5).
- **Gifting:** built on the ledger; recipient onboarded via claim-token; capped/audited (FLAG #2 — v2).

## 5. Build slices (recommended order, simplest/highest-value first)
- **S1 — Foundation + security:** CustomPackage-as-spine; client-scoped hidden StorefrontItem (sessions=total); **server-side IDOR guard** on add-to-cart (`req.user.id === special.clientId` + validity/expiry/limit); reconcile/retire AdminSpecial + fix/kill its advertise-but-don't-grant truth bug.
- **S2 — Admin "Create Special" UI:** effective-price input → live bonus/total readout → required validity gate (default one-time) → create. Rebuild archived `CustomPackageCreator` on existing routes; kill dead VIP tab.
- **S3 — Client redemption:** "★ Your Special" store card + buy flow + notification-with-link + shareable claim-link.
- **S4 — Re-buy recurrence:** validity/redemption tracking + client re-buy within limit.
- **S5 — Session ledger:** `SessionTransaction` log + client-facing "where my sessions went" view.
- **S6 — EFT auto-billing (fast-follow, complex):** Stripe subscription + consent/cancel/visibility.
- **S7 — Client→friend gifting (v2, most complex):** on top of the ledger.

## 6. FLAGGED-COMPLEX items — Fable, spend tokens HERE (my rec + the decision I need)
1. **EFT / Stripe subscription + trust consent UX.** Rec: **S6 fast-follow**; re-buy (S4) ships first. *Decision:* approve deferring EFT to S6? Minimum consent+cancel bar for "trust > EFT"?
2. **Client→friend/family gifting** (ABSENT today). Rec: **v2 / S7**; design the ledger now so it slots in. *Decision:* approve v2 timing + guardrails (transfer caps, recipient onboarded via claim-token, reversibility window, interaction with `isNonDeductingClient`, tax/liability)?
3. **Client-scoped discounted checkout SECURITY (IDOR).** Rec: hidden client-owned StorefrontItem + server-side `req.user.id===clientId` + validity checks at BOTH add-to-cart AND grant. *Decision:* bless as canonical guard; add rate-limit / token-binding?
4. **Consolidation.** Rec: **CustomPackage = spine; retire AdminSpecial from this feature + fix its truth bug** (advertise-but-don't-grant). *Decision:* approve, or keep AdminSpecial alive for true broadcast promos in parallel?
5. **Session ledger model.** Rec: **new `SessionTransaction` event log** (vs reconstructing from scattered audit logs). *Decision:* approve new table + its write-sites (grant/deduct/gift/refund/expire)?
6. **The `sessions=total` representation trick.** Baking bonus into `StorefrontItem.sessions` makes the existing grant credit the full total and sidesteps the bonus-grant bug for the buyable path. *Decision:* bless this, OR require properly fixing `calculateCartSessionCredits` to add `bonusSessions` (cleaner model, more surface + must satisfy the pricingTrust tests)?

## 7. Minimal-click / non-goals
- **Target:** apply a special in ≤3 taps (open client → type $ → pick validity → send); client redeems in 1 tap.
- **Non-goals:** lowering the $175 rate; a general public coupon engine; auto-billing before the consent UX exists; gifting before the ledger exists.

## 8. Open flags (Sean to confirm later, non-blocking)
- Base-bundle size per tier (previews assumed 10). Whole-session rounding rule.
- Trailing transcription "charger with the phone" — unclear; ignored pending clarification.

## 9. Enhancement Idea Catalog (folded in — full doc alongside)
Full menu: **`SPECIAL-PRICING-ENHANCEMENT-CATALOG-2026-07-04.md`** — 51 data-grounded ideas across 8 themes (92 raw → 51 kept, 7 cut), every idea tied to a real `Table.column`. Top 10 must-do:
1. **Effective-Rate Floor Guardrail** — recompute the client's blended effective rate on every grant, hard-block <$100/hr. **→ pull into S1 (safety spine).**
2. **Offer-Propensity Suggestion Inbox** — nightly-scored, pre-drafted one-tap-approve specials from existing signals. (later slice, L effort)
3. **Client Session Ledger** (paid vs bonus, reconciled) — **= S5.**
4. **One-Tap EFT Pause/Cancel** (real Stripe cancel + consent log) — gates S6.
5. **Urgency-Scored Renewal Bonus Ladder** — wires `RenewalAlert.urgencyScore` into an auto win-back.
6. **Points → Bonus-Session Redemption Store** — activates the dormant loyalty ledger.
7. **Milestone-Celebration Renewal Bonus** (verified progress → renewal peak).
8. **Two-Sided Referral Bonus Session** (referral graph → acquisition).
9. **Prepay Volume → Bonus-Session Ladder** (AOV lift, S effort).
10. **Idle-Capacity Bonus-Session Auto-Fill** (giveaway costs dead inventory, not cash).

Themes: Margin Guardrails(3) · Retention/Churn-Save(10) · Progress/Milestone(4) · Gamification/Loyalty(8) · Acquisition/Referral(7) · Prepay Depth(5) · Trust/Transparency(11) · Admin-Ops(3).

**Plan changes the catalog implies:** (a) add a margin-governance spine (Floor Guardrail + audit trail) to **S1**; (b) confirm **ledger-first** sequencing (S5 unblocks loyalty redemption + gifting); (c) the Trust theme's 11 ideas become the **gate on S6 (EFT)** — no auto-billing without consent receipt + one-tap cancel + next-charge card; (d) the Suggestion Inbox is the flagship post-core automation slice.

**For Fable:** which top-picks are v1-core vs later? Is the margin-governance spine a hard S1 blocker as I recommend? Any catalog idea to elevate or cut?

## 10. Review sequence (Sean's routing, 2026-07-04)
Opus 4.8 (done) → **Codex hostile review FIRST** (rule-46 hostile reviewer — attack the architecture, the §6 flags, and catalog feasibility; enforce money-path/IDOR safety, rule-58 schema-drift, rule-8 zero-PII, $175 integrity) → **then Fable (Final Decider)** returns ONE consolidated final build prompt → Opus 4.8 builds. Do NOT run the paid Village (cost). Codex + Fable read ONLY these two files (this packet + the catalog); Codex reads CLAUDE.md first per the debate protocol.
