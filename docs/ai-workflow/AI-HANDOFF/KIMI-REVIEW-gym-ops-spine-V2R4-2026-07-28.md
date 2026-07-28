# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/GYM-OPS-SPINE-BUILD-BLUEPRINT-V2-2026-07-28.md
**Seed:** docs/ai-workflow/AI-HANDOFF/KIMI-REVIEW-gym-ops-spine-V2R3-2026-07-28.md
**Tokens:** 21444 in / 8998 out | **Cost:** ~$0.1993 | **Wall:** 259.2s

---

# ROUND 4 HOSTILE REVIEW — Gym Ops Spine v2, draft 3 (SWA-74)

**Posture:** the round-3 fixes are the new attack surface. Each was traced against §2.3, the Stripe state machine, and the generator, not against §0.2's claims.

---

## PART 1 — ROUND-3 FINDING AUTOPSY

| ID | Verdict |
|---|---|
| R8 (`eventType` lacks `expired`) | **FIXED.** ENUM has `expired`/`cancellation_requested`/`orphan_subscription_refunded`; parity check now covers every enumerated column. |
| R7 (no cancel flag; double-fire) | **FIXED.** `cancelRequestedAt` added; path 2 is a NO-OP when terminal. |
| R1 (checkout race) | **STILL BROKEN — the fix is the insufficient half.** See F1. |
| R3/R14 (status-blind ORDER; suspended escape) | **FIXED.** Live-status-first ORDER is correct against every row combination the index permits; `suspended` in the 409 guard closes the dunning bypass. |
| R2 (`periodStart` rollover) | **FIXED.** Clamped, UTC, four tests pin the exact bug. |
| R6 (cancelled rows block regeneration) | **FIXED as stated — and it broke something else.** See F2. |
| R5 (check-in lock order) | **FIXED.** `advisory → slot → booking`, stated, cycle-freedom argued. |
| R4 (`isStaff(actorUserId)`) | **FIXED.** `actorRole` from `req.user.role`, comment warns against the old call. |
| R9 (orphan replay re-refund) | **FIXED.** `membershipId` nullable, dedup row writable. |
| R10 (class-cancel strands `booked`) | **FIXED as stated.** `cancelClassSlot` spec'd — but see F4/F2. |
| R11 (`notifyAfterCommit` undefined) | **FIXED.** Helper spec'd, drain contract stated, success path notifies. |
| R12 (cron expires frozen) | **FIXED as stated — and it broke something else.** See F3. |

---

## PART 2 — NEW BUGS THE ROUND-3 FIXES INTRODUCED

### F1 — [HIGH] R1's advisory lock serializes a check whose witness never changes — the double-checkout race is still open, and the mandated test still cannot pass

The lock serializes `createMembershipCheckout` calls. But the guard's witness is *the existence of a membership row*, and **no membership row is written until `checkout.session.completed` fires — minutes later, after payment.** Trace: Tab A acquires `membership-checkout:u:l`, checks (empty), creates the Stripe session, commits, releases. Tab B acquires the same lock one second later, checks — **still empty** — and creates a second session. Both members pay; the unique index fires at webhook time; the orphan path (now correctly dedup'd per R9) cancels and refunds. The lock bought exactly nothing: serialization only helps check-then-act when the first actor writes state the second actor's check can see. Round 3 offered two fixes — advisory lock **or** a pending row the index can see; the revision took the lock *without* the row, which is the half that doesn't work. The S1 acceptance test *"two concurrent `createMembershipCheckout` → second returns 409"* **fails against any literal build of this spec**, on the money path — the same class of unpassable mandated test that R1 itself flagged. Fix: insert a `pending` membership row inside the locked transaction (and add `pending` to the unique-index predicate and the guard's status list), or pass a Stripe idempotency key / dedupe on `client_reference_id`. Mitigation: the refund backstop is now sound, so the member is made whole automatically — this is transient double-charge, not permanent. **HIGH, not BLOCKER.**

### F2 — [HIGH] R6's cancelled-excluded index + the daily generator = staff-cancelled classes silently resurrect

The `(classSeriesId, startsAt)` index now excludes `cancelled` rows. `cancelClassSlot` (the R10 fix) flips a single occurrence to `cancelled`. The generator runs **daily** over the 90-day horizon with `ignoreDuplicates: true`. Next run: the rrule still emits that instant, the index no longer sees a duplicate (the cancelled row is excluded), and a **fresh `scheduled` slot is inserted over the staff cancellation** — the holiday closure, the instructor-sick cancellation quietly comes back to life, with prior bookings gone and no error anywhere. Before R6 the index *protected* one-off cancellations (the cancelled row blocked re-insertion); the fix traded "regeneration silently dropped" for "cancellation silently undone." S2.2's series-reschedule wants resurrection-at-retired-instants; `cancelClassSlot` wants the opposite — the index cannot tell them apart. Fix: generator must skip instants where a `cancelled` row with `cancellationReason != 'series_rescheduled'` exists (or give series-reschedule its own resurrection path and keep one-off cancels tombstoned). **HIGH.**

### F3 — [HIGH] R12's freeze-extends-`endsAt` desyncs Stripe `cancel_at` — path 2 then terminates the member early

Sequence: member cancels (path 1: `endsAt = +30d`, `cancelRequestedAt` set, Stripe `cancel_at = endsAt`). Member then freezes; freeze pauses collection. Unfreeze pushes `endsAt` forward by the frozen duration — **but nothing updates Stripe `cancel_at`**, which is an absolute timestamp `pause_collection` does not move. Stripe cancels the subscription at the *old* date → `customer.subscription.deleted` → path 2 fires, status is `active` (not terminal — the NO-OP guard doesn't save it) → `status='cancelled'` while the extended `endsAt` says weeks of paid term remain. The freeze-extension the member is owed is destroyed by the Stripe-side clock nobody re-armed. Adjacent hole: freeze calls `subscriptions.update` on a subscription that may already have `cancel_at` pending — behavior unexamined. Fix: on unfreeze, if `cancelRequestedAt` is set, push Stripe `cancel_at` to the new `endsAt` in the same operation (or forbid freeze while a cancel is pending — one line, but *decide*). **HIGH.**

### F4 — [MEDIUM] `invoice.paid` writes `status='active'` unconditionally — defeats a live freeze

S1 step 3 and the S5 table both say `invoice.paid` → `status:'active'`, `dunningAttempt=0`. The round-2 fix made the *event* conditional (`payment_recovered` only when `past_due`) but left the *status write* unconditional. A `frozen` member who receives any stray `invoice.paid` (proration at unfreeze, an out-of-band invoice, a replayed-but-distinct event) is flipped to `active` with `frozenUntil` still in the future — door opens, booking opens, freeze defeated without an `unfrozen` event. The status write must be guarded: only `past_due → active`; any other current status → event-only (or alarm). **MEDIUM.**

### F5 — [MEDIUM] The 409 guard + cancel flow = no way to rescind a cancellation, and §2.7 overstates the cancel route

Path 1 says "**Member**/admin cancels," but the S1 route table has `POST /:id/cancel` at `adminOnly` — a member cannot self-cancel, contradicting §2.7's own wording. Compounding: status stays `active` through the notice window, so the R14-hardened 409 guard blocks re-checkout, and **no rescind endpoint or `cancellation_rescinded` event exists** — a member who cancels in a moment of pique and calls the desk the next day has no path back short of staff hand-editing two columns and a Stripe `cancel_at`. The round-3 fixes made this corner airtight in the wrong direction. NIT-sized fix (route guard + rescind endpoint + event), but it's new: R14's guard is what closed the re-buy escape hatch.

### F6 — [NIT] Freeze-extend on NULL `endsAt` (ongoing monthly, no cancel) is unspecified

"Push `endsAt` forward by the frozen duration" — a plain monthly membership has no `endsAt`. Presumably a no-op, but the cron and unfreeze handler must both say so, or a builder writes `NULL + interval` and expires nobody/everbody depending on the ORM. One clause.

---

## PART 3 — SELF-CONTRADICTIONS / STALE TEXT AFTER THREE ROUNDS

1. **§0.2's R1 row claims FIXED; the mechanism cannot fix it (F1).** The doc now ships an acceptance test its own code cannot pass — the exact B4-class code-vs-spec contradiction this revision series exists to eliminate.
2. **S2's parity-check block is now stale-scoped.** It still instructs "grep the doc for `status: '`" while S1's check and §0.2's meta-lesson mandate *every enumerated column*. Two parity checks, two scopes, in one document — the S2 one should point at the doc-wide rule or it will drift again next round.
3. **`unsuspended` and `completed` remain writerless ENUM values** (carried from round 3, still unacknowledged). With the parity check now doc-wide, these are the only two literals that fail "every ENUM value has a writer" — either write them or drop them, or the parity check's next evolution flags its own schema.
4. **§2.5's ORDER comment justifies live-status-first with a coexistence ("suspended `unlimited` + active `limited`") that the R14-hardened guard now makes unreachable via checkout** — reachable only via admin/comped rows. Harmless, but the comment argues for a case the system can no longer produce; next reviewer will re-derive F5's confusion from it.
5. `cancelClassSlot` "flip every row **and notify each member**" sits ambiguously against the after-commit notification law — S3 says notifications fire after commit, S3's own class-cancel paragraph doesn't say *how*. `notifyAfterCommit` presumably, but say it.

---

## PART 4 — REMAINING FORCED GUESSES

1. **Pending-cancel rescind flow** (F5) — undeclared, money path. MEDIUM.
2. **Generator vs. one-off-cancel tombstone semantics** (F2) — the fix requires a decision, not just code. HIGH.
3. **`invoice.paid` status-write conditions** (F4) — builder must guess which statuses may be overwritten. MEDIUM.
4. **Freeze-extend on NULL `endsAt`** (F6). NIT.
5. **Door/check-in membership resolver precedence** — the R3 fix lives in `assertCanBook`; S4's "resolve active membership" and S6's "resolve membership" never say whether they share the live-status-first ORDER. A verbatim-build bot picks `findOne` unordered at the door. NIT.
6. Carried NITs (round 3, Part 4, items 4–6): hours-check tz direction export, `keyId` in prose not the migration column list, `classSlotId` immutability, FIFO ties, `invoice.paid`-before-`checkout.session.completed` false dead-letter.

Declared STOPs (§9.1–9.4) remain honest.

---

## PART 5 — RANKED SUMMARY & VERDICT

| # | Finding | Rank |
|---|---|---|
| F1 | R1's advisory lock has no witness row — checkout race still open, mandated 409 test unpassable | **HIGH** |
| F2 | R6's index fix makes the daily generator resurrect staff-cancelled classes | **HIGH** |
| F3 | R12's freeze-extend never re-arms Stripe `cancel_at` → path 2 terminates paid term early | **HIGH** |
| F4 | `invoice.paid` overwrites any status with `active` → freeze defeated | MEDIUM |
| F5 | No rescind path; §2.7 "member cancels" vs `adminOnly` route | MEDIUM |
| F6 | Freeze-extend on NULL `endsAt` unspecified | NIT |
| — | Stale S2 parity scope, writerless `unsuspended`/`completed`, unreachable-case comment in §2.5, resolver precedence, carried NITs | NIT |

**VERDICT: NOT YET BUILDABLE — one more targeted revision, then ship it.** The enum-drift defect class that killed three consecutive drafts is genuinely dead (doc-wide, both columns, meta-lesson recorded). What remains is smaller and different in kind: **three of the four round-3 money/concurrency fixes repaired the stated bug and broke an adjacent interaction** (lock-without-witness, index-fix-resurrects-cancels, extend-without-re-arm). All three fixes are one-to-five lines, but F2 needs a *decision* (tombstone semantics) before code.

**The class of defect that only running it can find:** Stripe's actual state-machine behavior under composition — whether `pause_collection: 'void'` emits `subscription.deleted`, what `cancel_at` + pause + resume actually do in sequence, real webhook ordering (`invoice.paid` before `checkout.session.completed`), and true Postgres timing on advisory-lock/unique-index interleavings under `Promise.all`. No further static pass will find those; the doc already flags the first honestly. After F1–F3 land, **build it and spend the next review cycle's budget on a live Stripe test-clock integration run instead of a fifth document pass** — static review has hit diminishing returns.
