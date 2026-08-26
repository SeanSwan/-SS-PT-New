# Cancellation waitlist auto-backfill — grill

**Status:** in progress
**Date:** 2026-08-25
**Origin:** GLM 5.3 and Kimi K3 independently ranked this the top build-next item in the SWA-208 review panels. Both framed it the same way: *the best cancellation feature is filling the slot.*
**Related:** SWA-208 (cancellation pricing hardening), SWA-212 (duration-blindness + build-next roadmap)

---

## Why this is the highest-value item

A cancellation is currently a pure loss. The session is marked `cancelled`, the client either keeps or forfeits their credit, and the time slot evaporates. At $175/session, every filled cancellation is $175 recovered from time that was already paid for and already scheduled.

It is also independent of the two decisions currently blocking SWA-212 (the StorefrontItem duration schema gap, and whether client late-cancels should incur a fee), so it can proceed now.

## What already exists (explored, not assumed)

| Thing | State |
|---|---|
| Waitlist model / routes / service | **None.** Only `models/social/enhanced/EventManagement.mjs`, which is unrelated social-event code |
| Session status `'available'` | Exists — `SESSION_STATUSES` includes it, and it is the model default |
| Cancelled session behaviour | Status becomes `'cancelled'`. The slot does **not** return to `'available'` |
| Email notification | `sendEmailNotification`, plus session-specific helpers |
| SMS notification | `sendSmsNotification` |
| In-app notification | `createNotification` (notificationController) |
| Atomic credit handling | `client.increment('availableSessions', { transaction })` — the pattern for race-safe balance changes already exists |
| Row locking | `findByPk(..., { transaction, lock: transaction.LOCK.UPDATE })` used throughout `cancelSession` |

So the notification plumbing and the atomic-claim primitives are present. What is missing is the waitlist itself and the offer lifecycle.

## Summary

_(to be completed at grill close)_

## Key decisions

_(appended as Sean answers)_

## Q&A log

_(question → my recommendation → Sean's answer → implication)_

## Open flags

_(things Sean needs to look up or decide later)_

---

### Q1 — How should a freed slot reach waiting clients?

**My recommendation:** sequential offer with a claim window — fair, ordered, no double-book race, and Sean controls priority.

**Sean's answer:** Sequential offer with a claim window.

**Implication:**
- Needs an **offer lifecycle**, not just a list: an offer has a holder, an expiry, and a terminal state (claimed / declined / expired).
- Needs a **timer mechanism** to roll an expired offer to the next candidate. Something has to fire when nobody is looking — a scheduled sweep or a delayed job.
- The claim itself must be **atomic**: two people must never both convert an offer, even if a roll and a claim race.
- Fill speed is bounded by window length x chain depth, so window length is a real business lever, not a detail. Comes back in a later question.
- Rules out the simplest "notify everyone, first tap wins" model, so the data model must track per-candidate offer state rather than just waitlist membership.

### Q2 — Who gets offered first?

**My recommendation:** clients whose paid-but-unused sessions are most at risk — protects banked revenue and catches drifting clients.

**Sean's answer:** Sessions at risk of expiring first.

### Q3 — Sessions have no expiry in the data. Which proxy?

**Explored first (not asked):** `User.availableSessions` is a plain counter with no expiry. `StorefrontItem` carries `months` and `sessionsPerWeek` but no validity window, and no per-purchase expiry record exists anywhere. The literal ordering Sean picked is **not implementable on current data** — the same class of gap as the missing `StorefrontItem.duration` on SWA-212.

**My recommendation:** unused balance weighted by days since last session — computable from data that already exists, and it targets the churn risk Sean is actually describing.

**Sean's answer:** Unused balance + days since last session.

**Implication:**
- Priority score is **computed at offer time**, not stored — no new columns, no staleness.
- Needs a query joining `User.availableSessions` with each client's most recent completed session date.
- Both inputs already exist. No schema change, so this does not block on anything.
- A client who is training normally but bought a big package will rank low, which is correct — they are not at risk.
- **Open flag:** real session expiry is probably worth building eventually (it creates genuine urgency to book, which is itself a fill mechanism). Deliberately deferred — it is a schema change plus a policy decision, and it would block this feature. Logged on the roadmap, not in this slice.

### Q4 — How long is the claim window?

**My recommendation:** scale it with time-until-session — a slot 4 hours out cannot afford an hour-long window.

**Sean's answer:** Scales with how soon the session is.

**Starting thresholds (tunable, not final):**

| Time until session | Claim window |
|---|---|
| > 48h | 4 hours |
| 12–48h | 1 hour |
| 4–12h | 20 minutes |
| < 4h | 10 minutes, then broadcast to all matches |

**Implication:** the expiry sweep must handle sub-hour granularity, so a nightly cron is not enough — this needs a job that can fire on the order of minutes.

### Q5 — How does a client get on the waitlist?

**My recommendation:** standing availability on the profile — the only option that makes the automation genuinely automatic, including overnight.

**Sean's answer:** Standing availability on their profile.

**Implication:**
- New data: per-client availability windows (day-of-week + time range, repeating).
- Matching a cancellation means intersecting the freed slot against every client's standing windows — indexable, cheap.
- Needs a real UI to set them. A weekly tap-to-toggle grid, not a form.
- **Second-order benefit worth naming:** aggregated standing availability is demand data. It tells Sean which hours are over-subscribed, which is capacity-planning intelligence he does not currently have from any other source.

---

## Phase 2 — Synthesis and advice

### Gaps the plan does not yet cover

1. **The trainer's own cancellation must not trigger a backfill.** If a trainer cancels because they are ill, auto-offering their slot books them into a session they cannot work. The trigger must distinguish *client cancelled* from *trainer/admin cancelled*, and default to no-backfill for the latter unless explicitly released. **This is a safety gap, not a nicety.**

2. **Channel has to match window length.** A 10-minute window delivered by email is not an offer, it is a formality. Short windows need SMS or push; email alone is only viable for the 4-hour tier. Both channels already exist in `utils/notification.mjs`.

3. **Claiming must go through the same booking path as normal booking.** If backfill writes a `Session` row directly it will bypass `processSessionDeduction` and credit balances will drift. This is the same class of defect as the pricing work just completed — a second path that does not honour the first path's rules.

4. **Backfill must fire AFTER the cancellation transaction commits.** Inside the transaction, a rollback would leave offers already sent for a cancellation that never happened. `cancelSession` already calls notifications post-commit; backfill belongs in the same place.

5. **Re-cancellation loop guard.** A client claims a backfilled slot, then cancels it. Without a guard the slot re-enters the chain and can ping-pong. Cap it: a slot backfills at most once, or at most N times.

6. **Quiet hours.** Do not SMS at 05:00 for an 07:00 slot. Needs a policy — likely a per-client quiet window with an opt-out for people who genuinely want early offers.

7. **What the client sees when they lose.** Under sequential offers most people never see an offer at all, which is fine. But someone who opens a claim link 30 seconds late needs a graceful "this one has gone" rather than an error.

### Minimal-click opportunities

| Action | Naive | Target |
|---|---|---|
| Claim an offered slot | Open app → log in → find schedule → find session → claim = **5 taps** | Tap the link in the SMS → confirm = **2 taps**, no login (signed single-use token) |
| Set standing availability | Form with dropdowns per window = **10+ interactions** | Weekly grid, drag or tap to paint available hours = **3–4 taps** |
| Decline an offer | Open app → navigate → decline = **4 taps** | "Not this time" link in the same message = **1 tap** — and declining fast is valuable, it rolls the chain immediately instead of burning the window |

The decline path is worth as much as the claim path here: a fast decline is what makes a sequential chain fill quickly.

### Parent / children / whole observations

- **This feature's parent is the cancellation flow**, which was hardened all through 2026-08-25. Backfill hangs off `cancelSession` post-commit. Everything learned there applies: fail closed, never invent a number, and honour the honesty flags other layers set.
- **Its sibling is normal booking.** Two paths into the same `Session` state must share deduction, conflict-checking and notification. Any divergence is a future drift bug — see gap 3.
- **App-level:** standing availability is the first piece of *client-declared demand* data in the product. It is worth designing the storage so it can later answer "when should I add capacity" and "which clients want more than they are getting", not just "who do I offer this cancellation to".

### Recommended build order

1. Standing-availability model + the weekly grid UI (no backfill yet — it is independently useful as demand data)
2. Offer lifecycle model + priority scoring, with the sweep job
3. Trigger from `cancelSession` post-commit, with the trainer-cancellation exclusion
4. Claim / decline via signed single-use links, routed through the normal booking path
5. Admin visibility: offers sent, claim rate, slots recovered, revenue recovered
