---
decision: SwanStudios can displace Mindbody for a single-location gym only after a 6-item "operational spine" is built; the wedge is coaching depth, not feature parity
status: open
supersedes: none
---

# Mindbody Displacement Audit — What SwanStudios Must Build to Replace a $1,600/mo Gym Stack

**Date:** 2026-07-27
**Author:** Claude (Opus 5)
**Trigger:** Sean's boss pays ~$1,600/mo for Mindbody. Target: switch his gym to SwanStudios.
**Method:** Live web research on Mindbody's 2026 pricing/feature set + direct code audit of this repo.
**Status:** Audit complete. Build plan proposed. **Not started — awaiting Sean's Phase 0 answers (§7).**

> **Scope honesty:** this document proves what the *code* does and does not contain, with file:line
> evidence. It does **not** prove what Sean's boss actually uses day-to-day — that requires §7
> discovery and is the single highest-leverage unknown in this entire plan.

---

## 1. What the $1,600/mo actually buys

Mindbody does not publish real pricing; the number is assembled from tiers + add-ons + percentages.

| Component | 2026 rate |
|---|---|
| Starter | $99–159/mo **per location** |
| Accelerate | $259–279/mo per location |
| Ultimate | ~$499/mo per location |
| Ultimate Plus | $699+/mo per location |
| Branded mobile app | $249–299/mo (bundled in Ultimate Plus) |
| Payment processing | 2.99–3.60% |
| **Marketplace commission** | **~20%** on Mindbody-sourced clients (~23.5% effective) |
| Data export at cancellation | ~$499–500 one-time |
| Typical contract | 24 months, auto-renew |

**Reading the $1,600.** It does not match one plan. It is almost certainly one of:
- **(a) Multi-location** — e.g. 2–3 sites on Accelerate/Ultimate. *If this is the case, §3 gap #1 is a hard blocker.*
- **(b) Ultimate Plus + add-ons + processing volume** on a single busy site.
- **(c) A number that includes processing fees**, which SwanStudios does **not** eliminate — Stripe charges ~2.9% + $0.30 regardless of platform.

> ⚠ **Do not promise "$1,600/mo saved."** Payment processing follows the money, not the software.
> The honest, defensible savings claim is **the software subscription + the 20% marketplace
> commission**, not the processing. Overpromising here is how the pitch dies in month two.

`[LIKELY]` — the $1,600 includes processing. `[UNKNOWN]` until Sean produces an actual invoice (§7).

---

## 2. The strategic read (most important section)

**SwanStudios and Mindbody are not the same category of product.**

- **Mindbody is facility-operations software.** Its job is the front desk: who is coming, did they pay,
  did the door open, did the class fill, did the retail sell, did staff get paid.
- **SwanStudios is a coaching-intelligence platform.** Its job is the training outcome: what did the
  client do, is it working, what is the next best action, does the client stay engaged.

They overlap maybe 30%. **SwanStudios is dramatically deeper than Mindbody on coaching and
dramatically thinner on operations.** That is the entire finding of this audit.

The $1,600 is not buying intelligence. It is buying **boring, reliable, money-correct plumbing.**

### What this means for strategy

**Do not try to clone Mindbody.** That is a multi-year, low-margin, high-liability race against an
incumbent with 90+ integrations. It also throws away the actual advantage.

**Do this instead:** build the *minimum operational spine* that lets a gym run its front desk without
embarrassment, then win on everything Mindbody cannot do at all. The pitch is not "we're cheaper
Mindbody." The pitch is:

> "Your front desk works the same. But now every member has a real training record, an AI coach,
> progress they can see, and a reason to keep showing up — and you stop paying 20% on your own clients."

Retention is the gym's actual P&L problem. Mindbody does not solve it. SwanStudios can.

---

## 3. Gap matrix — verified against code

Legend: ❌ missing · ⚠ partial · ✅ strong (meets or beats Mindbody)

### ❌ P0 BLOCKERS — a gym cannot operate without these (7)

| # | Capability | Evidence in this repo | Verdict |
|---|---|---|---|
| 1 | **Multi-location / sites** | `Session.location` is a free-text `DataTypes.STRING` ([Session.mjs:80-84](backend/models/Session.mjs#L80-L84)). **No `Location`/`Site`/`Facility` model exists anywhere** in `backend/models/`. | ❌ MISSING |
| 2 | **Group class scheduling with capacity** | `Session` is strictly 1:1 — `userId` "Client who booked the session" ([Session.mjs:69-74](backend/models/Session.mjs#L69-L74)) and `trainerId` ([:75-79](backend/models/Session.mjs#L75-L79)), both singular. **No capacity field on `Session`.** | ❌ MISSING |
| 3 | **Class booking / roster ("reserve my spot")** | No attendee join table exists. `BootcampClassLog.actualParticipants` is an INTEGER the trainer logs *after* class ([BootcampClassLog.mjs:30](backend/models/BootcampClassLog.mjs#L30)) — a count, not a roster. `BootcampTemplate.maxParticipants` ([:76](backend/models/BootcampTemplate.mjs#L76)) is a **layout/equipment planning input**, not a booking limit. | ❌ MISSING |
| 4 | **Waitlist + auto-promote** | `waitlist` appears only in `models/social/enhanced/EventManagement.mjs` — the social events feature, not the booking schedule. | ❌ MISSING for classes |
| 5 | **Member check-in / attendance** | No check-in, attendance, or visit model found. `TimeClockPage.component.jsx` is **staff** clock-in, not member check-in. | ❌ MISSING |
| 6 | **Door access control** | Nothing. No integration surface. | ❌ MISSING |
| 7 | **Gym membership contracts** | `Subscription.mjs` is **not** a gym membership model — it is the SwanStudios **AI feature-tier gate**: `tier` is `free`/`pro`/`elite` ($0 / donation / $24.99), and its instance methods are `hasFullAIAccess()`, `isInTrial()`, `trialDaysRemaining()` ([Subscription.mjs:23-72](backend/models/Subscription.mjs#L23-L72)). No term length, no freeze/pause, no cancellation policy, no per-location membership type. | ❌ MISSING |

> **Gap #2 + #3 together are the decisive finding.** SwanStudios can *design* a group class in
> remarkable depth — stations, space profiles, equipment profiles, overflow plans
> (`BootcampStation`, `BootcampSpaceProfile`, `BootcampOverflowPlan`) — but **a member cannot book a
> spot in one, and the gym cannot see who is coming.** For a gym whose schedule is group classes,
> that is not a missing feature. It is a missing product.
>
> This is a **data-model** gap, not a UI gap. It cannot be patched at the route layer.

### ⚠ PARTIAL — exists, depth unproven

| # | Capability | Evidence | Verdict |
|---|---|---|---|
| 8 | Failed payment / dunning | `payment_failed` handled in `webhooks/stripeWebhook.mjs` + `subscriptionRoutes.mjs`; Stripe subscription API calls confined to `subscriptionRoutes.mjs` | ⚠ plumbing exists but is wired to the **AI tier**, not gym memberships; retry ladder + access-suspension unproven |
| 9 | Retail POS + inventory | Real inventory: `StorefrontItem.stockQuantity` ([:186](backend/models/StorefrontItem.mjs#L186)), `ProductVariant.stockQuantity` ([:40](backend/models/ProductVariant.mjs#L40)) | ⚠ e-commerce yes; **front-desk/card-present POS unproven** |
| 10 | Payroll / commission | `CommissionService.mjs`, `TrainerCommission.mjs`, SWA-62 trainer-economics work in flight | ⚠ commission yes; **payroll export (ADP/Paychex) missing** |
| 11 | Staff scheduling | `TrainerAvailability.mjs`, `availabilityService.mjs`, `TimeClockPage` | ⚠ trainer-shaped, not floor-staff-shaped |
| 12 | Branded mobile app | PWA components present | ⚠ PWA ≠ App Store presence |

### ✅ STRONG — meets or beats Mindbody

Reporting/analytics (extensive `analytics*` service layer) · Marketing automation (`AutomationSequence`,
`Lead`, `MarketingCalendarItem`, SendGrid + Twilio) · Digital waivers (`WaiverRecord`,
`WaiverVersion`, `PublicWaiverPage`) · Lead capture & CRM.

### 🏆 SwanStudios-only — Mindbody has no equivalent

Swan Coach AI · real workout logging → progress charts from first-party data · NASM movement &
form analysis · gamification/RPG · nutrition + food scanner · video library + content studio ·
social/community · Plaud audio → session notes · commission engine.

**This column is the reason to switch. Everything above it is the reason a switch is *possible*.**

### 🤔 The one "gap" that is actually a feature

Mindbody's consumer **marketplace** drives discovery — and charges **~20% forever on clients it
sources**. SwanStudios has no marketplace. For a gym that already has its members, *not* paying 20%
is a win, not a loss. **Sell this as a benefit.** But be honest: if the boss genuinely acquires new
members from the Mindbody app, that acquisition channel disappears on switch day, and §7 must
quantify it.

---

## 4. Build plan

### Phase 0 — Discovery (BEFORE writing any code) 🔴 BLOCKING
Cheapest, highest-leverage phase. See §7. **Most gyms use ~20% of Mindbody.** Building all of
Mindbody because nobody asked which 20% is the single most likely way this fails.

### Phase 1 — Operational spine (the seven P0s)
1. **`Location` model** + FK from `Session`, staff, inventory, and reporting. Migrate the existing
   free-text `Session.location` values. *Do this first — it is the deepest schema change and
   everything else inherits from it.*
2. **`ClassSlot`** (or extend `Session` with a class shape) carrying `capacity`, `locationId`,
   `instructorId`, recurrence, and substitute-instructor support.
3. **`ClassBooking`** join table — member ↔ slot, with status (`booked` / `attended` / `no-show` /
   `late-cancel`) and the cancellation-window policy the gym actually enforces.
4. **Waitlist + auto-promote** on cancellation, with notification.
5. **Member check-in** — kiosk/QR/front-desk, writing attendance rows. This is also the data that
   feeds retention alerts, which is where SwanStudios starts beating Mindbody.
6. **`Membership` — a genuinely new model** (do *not* extend `Subscription`; that is the AI feature
   tier and conflating the two will corrupt both). Needs: membership type, price, term length,
   start/end, freeze/pause with reason, cancellation policy + notice period, proration, per-location
   scope, and what it entitles (unlimited classes / N per month / open gym only).
7. **Dunning ladder against `Membership`** — retry schedule → notify → suspend door access +
   booking → recover. The Stripe `payment_failed` plumbing in `webhooks/stripeWebhook.mjs` is a
   starting point, but it currently resolves to AI-tier access, not gym entry.

### Phase 2 — Front desk
Card-present POS, walk-in/day-pass sale, retail checkout, door-access integration surface, payroll
export.

### Phase 3 — Migration
Export from Mindbody early (CSV: members, contacts, contracts) **before** notifying them of
cancellation. Import + reconcile. **Cards do not transfer — PCI rule, not a software limit.**
Every member must re-enter payment. Plan the re-consent campaign; this is the #1 churn risk in any
gym-software migration, in every platform's own migration guide.

### Phase 4 — Parallel run, then switch
**Run both systems 60–90 days.** Reconcile billing nightly. Never hard-cut a gym's revenue.

---

## 5. Risks Sean should weigh before committing

1. **This is a B2B SaaS pivot, not a feature add.** Different product, different support burden
   (a gym calls at 5am when the door won't open), different liability.
2. **It is Sean's boss and Sean's job.** If billing breaks, it is the boss's revenue *and* Sean's
   employment. The bar here is uptime and money-correctness, **not feature count.**
3. **Mindbody contract lock-in** — 24-month auto-renew, ~$499 export fee. The boss may not be free
   to leave for months. Confirm the renewal date **first** (§7).
4. **PCI / card re-entry churn** — see Phase 3.
5. **Merchant of record.** If SwanStudios bills the gym's members, decide now: Stripe Connect
   (gym is the merchant, Sean is the platform) vs. direct. This is a legal/tax posture, not a
   config toggle. **Stripe Connect is almost certainly correct** — it keeps the gym's revenue and
   chargeback liability on the gym.
6. **Gym-specific liability** — injury waivers, minors, insurance requirements differ from a
   personal-training practice.
7. **Scope discipline (Rule 62).** Every hour on Mindbody parity is an hour not spent on the
   coaching wedge. The spine must be *sufficient*, not *impressive*.

---

## 6. Recommendation

**Conditional go — scoped to a single-location pilot, on the seven-item spine only.**

- If the boss is **single-location**: the spine is a realistic build and the coaching wedge is a
  genuinely strong pitch.
- If the boss is **multi-location**: gap #1 becomes a deep schema migration touching sessions,
  staff, inventory, and every report. Still doable — but it is a materially larger commitment and
  should be priced and sequenced as such, not absorbed silently.

**Do not pitch the boss until Phase 1 is real and Phase 4 (parallel run) is agreed.** A demo that
over-promises to your own boss is worse than no demo.

---

## 7. Phase 0 — questions only Sean can answer 🔴

**Operational**
1. **How many locations?** *(Decides whether this is a pilot or a platform build.)*
2. What % of the schedule is **group classes** vs 1:1 personal training?
3. Does the gym use **door access / badge entry**? Which hardware?
4. Is there a **front desk with a card reader** (card-present), or is everything online?
5. Retail — supplements, apparel, drinks? Real inventory or a few SKUs?
6. How many members, how many staff?

**Commercial**
7. Can Sean get the **actual Mindbody invoice**? (Splits software vs processing vs commission — this
   is what makes or breaks the savings claim.)
8. When does the **contract renew**? Is there an early-termination penalty?
9. Does the boss get real new members from the **Mindbody marketplace**? Roughly how many/month?

**The decisive one**
10. **Which screens does the boss and his front-desk staff open every single day?** A 20-minute
    screen-share is worth more than every remaining item on this list. Build those. Ignore the rest.

---

## 8. Evidence log

| Claim | Evidence | Confidence |
|---|---|---|
| No Location/Site model | `ls backend/models/` — no match for location/site/facility/branch | `[VERIFIED]` |
| `Session.location` is free text | [Session.mjs:80-84](backend/models/Session.mjs#L80-L84) `DataTypes.STRING` | `[VERIFIED]` |
| Session is 1 client : 1 trainer | [Session.mjs:69-79](backend/models/Session.mjs#L69-L79) singular `userId`/`trainerId` | `[VERIFIED]` |
| No capacity on Session | Field enumeration of `Session.mjs` — absent | `[VERIFIED]` |
| Bootcamp is programming, not booking | [BootcampClassLog.mjs:30](backend/models/BootcampClassLog.mjs#L30) `actualParticipants` INTEGER, post-hoc | `[VERIFIED]` |
| No class waitlist | `waitlist` matches only `social/enhanced/EventManagement.mjs` | `[VERIFIED]` |
| No member check-in model | No match for checkin/attendance/visit/door in `backend/models/` | `[VERIFIED]` |
| Inventory exists | [StorefrontItem.mjs:186](backend/models/StorefrontItem.mjs#L186), [ProductVariant.mjs:40](backend/models/ProductVariant.mjs#L40) | `[VERIFIED]` |
| `Subscription` is an AI feature tier, **not** a gym membership | [Subscription.mjs:23-72](backend/models/Subscription.mjs#L23-L72) — `hasFullAIAccess()`, tiers `free`/`pro`/`elite`, header states "gate AI features behind subscription tiers" | `[VERIFIED]` |
| Dunning partially exists | `payment_failed` in `webhooks/stripeWebhook.mjs`, `routes/subscriptionRoutes.mjs` | `[VERIFIED]` present; depth `[UNKNOWN]` |
| Mindbody pricing/fees | Web research, §9 sources | `[VERIFIED]` as published 2026-07 |
| Boss's actual usage | — | `[UNKNOWN]` — Phase 0 blocks on this |

**Not verified in this pass:** depth of the dunning retry ladder; whether card-present POS exists in
the frontend; payroll export; whether any group-booking path exists at the route layer that bypasses
the models audited. These are Phase 0/1 tasks, not claims made here.

---

## 9. Sources

- [Mindbody pricing 2026 — Koalendar](https://koalendar.com/blog/mindbody-pricing-costs)
- [Mindbody cost, hidden fees & alternatives — FitBudd](https://www.fitbudd.com/post/how-much-does-mindbody-cost)
- [Mindbody pricing & feature breakdown — Pabau](https://pabau.com/blog/mindbody-pricing/)
- [Mindbody features — Gymdesk](https://gymdesk.com/blog/mindbody-features)
- [Is Mindbody worth it? Real costs — Gymdesk](https://gymdesk.com/blog/is-mindbody-worth-it)
- [Switching from Mindbody: what Reddit recommends — Vibefam](https://vibefam.com/switching-from-mindbody-reddit-2026/)
- [Exporting from Mindbody — Gymdesk docs](https://docs.gymdesk.com/en/help/docs/mindbodyexports)
- [Migrating from Mindbody, the honest guide — Class Booking](https://class-booking.com/blog/migrating-from-mindbody-honest-guide)
- [Mindbody contracts, cancellation & data exports — Mindbody](https://www.mindbodyonline.com/business/education/blog/mindbody-contracts-cancellation-data)
- [Best gym management systems compared — Kisi](https://www.getkisi.com/blog/best-gym-management-systems-compared)
