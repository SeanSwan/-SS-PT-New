# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** .ai-workflow/fusion/cancellation-workstream-review-and-next.md
**Seed:** .ai-workflow/fusion/_full-diff.txt
**Tokens:** 9060 in / 8624 out · **Cost:** ~$0.0000 · **Wall:** 261.0s · **finish:** stop

---

## VERDICT

REVISE — the fail-closed instinct is right and the mount-walk discipline is exemplary, but the server-derivation fix introduces a new silent money-corruption path (cross-order rate misattribution with active override), the forfeit stamp appears unreachable or unscoped, and the "unknown has no handler" critique only partially survives the patch.

## BLOCKERS

1. **P1 — Cross-order rate misattribution, now *worse* than pre-patch because the server actively overwrites correct figures.** `getClientPackagePricing` reads only the **most recent completed order** (`backend/utils/cancellationPricing.mjs:44-52` — `findOne`, `order: [['createdAt','DESC']]`). The ambiguity guard at :78-108 only inspects packages *within that one order*. Scenario: client buys a $175/60-min pack in March (Order 1, partly unused), then a $110/30-min pack in June (Order 2, completed). They book a 60-minute session and cancel late. Operator correctly enters full charge $175 → `applyServerDerivedChargeAmount` resolves `pricePerSession = 110` from Order 2 → `chargeType === 'full'` branch **overrides** the operator's correct $175 with $110 (`session.service.mjs`, applied computation in the :1752 hunk). Before this patch, the operator's number stood; now the server replaces a right number with a wrong one and logs it as "server-derived." The guard was built to prevent exactly this and misses the most common real-world case (clients buy multiple packs over time). Fix: aggregate session packages across the client's open/completed orders, or treat any multi-rate population across orders as `isFallback`/`requiresAdminReview`.

2. **P1 — The forfeit stamp is either dead code or misfires; both readings are bad.** The condition is `!billingOptions && !creditRestored && session.sessionDeducted` (`session.service.mjs:~1820-1827`). But `billingOptions` is produced by `normalizeCancellationBillingOptions(user, cancellationOptions)` invoked **unconditionally** at :~1752, and a "normalize" function conventionally returns an object. If it never returns falsy for the client role, `!billingOptions` is never true and the entire forfeit fix — fix #9, the one that makes late client cancels visible to admins — never executes. If it *does* return falsy for clients, the block still lacks any `hoursUntilSession < 24` predicate: an **on-time** client cancellation where `creditRestored` ends up false for any incidental reason (e.g., `sessionCreditRestored` already true from a prior operation) gets stamped `decision: 'forfeited', reason: 'client_late_cancel_credit_forfeit'` — fabricating a penalty event that didn't happen, in the exact record you just built for dispute accuracy.

3. **P2 — The invented-number class is not closed; instance #6 lives in the file the workstream started from.** Inside the newly gated branch of `useSessionPackagePricing.ts:64-70`: `const fullCharge = data.pricePerSession || data.defaultChargeAmount || DEFAULT_FULL_CHARGE;` and `const lateFee = data.lateFeeAmount || Math.round(fullCharge * 0.5);`. Two problems: (a) `DEFAULT_FULL_CHARGE` — a hardcoded constant — is still reachable if a non-fallback payload omits both price fields; (b) the `||` on `lateFeeAmount` swallows a legitimate **0** (a waived fee) and substitutes half-charge — precisely the `||`-vs-`??` bug this same patch fixed correctly in `mapLateCancelWarning` (`SessionDetailModal.actions.ts:77-83`). The team fixed the symptom in one consumer and left the same pattern in the sibling.

4. **P2 — The forfeit record writes a value nothing live reads.** Per your own §7.4 framing: every existing consumer of `cancellationDecision` lives in the **unmounted** legacy file. So the stated payoff — "visible to every admin report" — is currently false: live admin reporting reads nothing, because the readers are dead code. The write side was fixed; the read side is a ghost. Until a mounted consumer exists, fix #9 changes no observable behavior except the DB row.

## ATTACKS

**Correctness**
- **Unknown-still-has-no-handler, narrowed but alive:** when `pricing.isFallback` (no package found) or lookup throws, the server *defers to whatever the frontend sent* and logs a warning (`session.service.mjs`, UNVERIFIED branch). The original defect — a stale frontend placeholder persisted as a real charge — survives on this path for any client without a completed order. The layering went from "both layers trust each other" to "server trusts frontend with a log line." Coherent only if you accept log-as-audit, which you shouldn't (below).
- **Ambiguity guard inverts the security posture:** a clean single-rate client gets server-verified charges; a multi-rate client — the *riskier* case — gets `isFallback`, which disables frontend derived options *and* makes the server defer to raw operator input. Verification strength is anti-correlated with risk.
- **Boundary complement is correct now** (`< 24` vs `>= 24`) — verified against both hunks. No finding.
- **Floating-point rate equality:** `rateOf` rounds to cents, so `distinctRates` dedup is mostly safe, but two packages priced to yield e.g. 174.995 vs 175.00 post-rounding edge cases could spuriously trigger ambiguity. Low probability, worth one test.

**Security**
- **IDOR on `GET /:id/cancel-warning`** (`routes/sessions.mjs:2873+`): the diff shows `protect` but no visible ownership check between `findByPk` and response. If a client can read another client's session warning (which now leaks package rate via `lateFeeAmount`), that's a tenant-scope leak. Cannot confirm from the diff — see Confidence.
- **Log-only audit trail for money (§7.3): no.** Render stdout is ephemeral, unindexed, and rotates. `chargeAmountSubmitted`/`chargeAmountSource` are mutated onto an in-memory object and never persisted to a column. Six months from now, a disputed $150-vs-$110 clamp is unreconstructable. This needs two nullable columns on the cancellation record, not `logger.info`.
- Replay/idempotency: double-submit of the cancel action isn't addressed anywhere in the diff; if the endpoint isn't idempotent, a double-tap on mobile could double-apply credit restoration or duplicate forfeit stamps.

**Data-truth / schema drift**
- The new comment in `routes/sessions.mjs:~2879` claims `getSessionPackagePricing` "is duration-aware." **It cannot be** — §5.A establishes `StorefrontItem` has no duration field. A $110-package client cancelling a 60-min session is told "a fee of up to $55.00 may apply." It's copy-only today (no fee is charged), but you just spent nine fixes purging invented numbers from client-facing copy and then wrote a comment asserting a property the schema forbids.
- The service comment cites "`core/routes.mjs:286`" for the shadowing claim; your verified mount walk says :355/:744. Stale line numbers in fresh comments are how the last panel got fed a dead file.
- `'forfeited'` fits `STRING(20)`; `'client_late_cancel_credit_forfeit'` (33 chars) goes into `cancellationReviewReason` — length unverified. JS-level validators don't stop raw-SQL writers or future seeds.

**House rules:** no violations found in the supplied diffs — no MUI/Recharts, no token violations visible, no yoga/meditation language, and the diff actually *deletes* the "NASM movement screen" feature text. Nothing to flag.

## HIGHEST RISK

**Blocker 1: the server-derivation override corrupting correct charges via cross-order misattribution.** It's silent, it lands in the financial record, it fires on the happy path (multi-pack clients are your best clients), and it's a regression *caused by* the fix. Cheapest de-risk before ship: one integration test — client with two completed orders at $175 and $110, cancel a 60-min session, assert the applied charge — plus, until proper Session→OrderItem attribution exists (Decision A below), extend the ambiguity check to consider all of a client's recent orders, not just the newest. Roughly an afternoon.

Runner-up everyone should keep awake for: **local dev pointing at the production `DATABASE_URL`** (§5.C). That's a `sequelize-cli db:seed:all` away from catastrophe and costs ~30 minutes to fix (rotate the URL, give dev its own database). Do it before anything else touches a migration.

## CONFIDENCE

What I could **not** verify from the document alone, and what settles each:

1. **Whether `normalizeCancellationBillingOptions` can return falsy** — this single fact determines whether Blocker 2 is "dead code" or "misfiring stamp." Evidence needed: the function body (`session.service.mjs:~120-135`) and the call-site's surrounding role check.
2. **Whether `creditRestored` is in scope** at the forfeit block — the diff hunk shows `shouldRestoreCredit` defined but the new condition reads `creditRestored`. If that's a typo'd identifier, it's a `ReferenceError` on every client cancellation. Evidence: full post-patch function listing.
3. **Ownership scoping on `/cancel-warning` and the cancel mutation** — need the route handlers' authz lines, not just the diff hunks.
4. **Whether the pricing endpoint consumed by `useSessionPackagePricing` returns `isFallback` at the top level of `data`** — the gate assumes it; if that endpoint is a different resolver than `getClientPackagePricing`'s callers, the gate checks a field that never arrives and always passes.
5. **Whether any *mounted* code reads `cancellationDecision`** — grep across mounted routes/services/controllers, excluding the three files your mount walk condemned.
6. **Actual current line numbers** — I've anchored to diff hunk headers; they drift against the working tree.

I am deliberately uncertain on 1 and 2 rather than guessing: both determine whether a shipped "fix" functions at all, and a confident wrong call there is worse than the flag.

---

## JOB 2 — DECISION (appended; the five mandated headings above are untouched)

**Pick: Deploy what is built — this week — gated on two cheap unblocks: (a) sever dev-from-prod `DATABASE_URL`, (b) answer the migration-runner question. Nothing else starts until the deploy ships.**

Defense against the acquisition priority: the sitting branch **is** acquisition work. The corrected pricing sheet (`config/pricing.ts`) is the artifact a trainer physically hands a prospect; right now it advertises a nonexistent $200 tier and a fake "Save $200" discount — a live mis-quote in front of exactly the people he's trying to acquire. Every week those 13 commits sit unshipped, the highest-leverage acquisition asset he owns is lying to prospects. Deploy-first is not a deprioritization of acquisition; it's the fastest acquisition move on the table.

Explicitly deprioritized, in order:
- **SWA-214 step 1** — blocked on C anyway, and building demand-data infrastructure before the revenue-integrity layer underneath it (attribution, expiry) exists means the waitlist's "paid-but-unused at risk" proxy is computed on the same broken counters. Second, not first.
- **Referral-attributed milestone shares** — attractive, but build sharing mechanics on top of a deployed, trustworthy milestone pipeline, not in parallel with an undeployed one.
- **FK drift (E)** — do it *immediately after* deploy and *before* SWA-214, because `ClientAvailability` will add FKs and you don't want new tables inheriting the `users`/`Users` split. It's a day of mechanical work, not a project.

**Decision A: link `Session` → the `OrderItem` that funded it.** A duration column on `StorefrontItem` tells you what the product was, not which purchase covers *this* session — it fixes duration and nothing else, while attribution generalizes to expiry (B), waitlist priority, and per-package LTV. Backfill existing rows best-effort; sessions that can't be attributed fall through to the ambiguity guard, which is the correct fail-closed behavior you already built.

**Decision B: yes, expire — gently.** 12-month validity from purchase, 60- and 30-day reminders, then a 30-day grace window during which the trainer can extend with one tap. After grace: balance marked `expired`, never deleted, redeemable only by explicit trainer action. Rationale: expiry is a fill mechanism (urgency drives booking, which serves the $175-slot economics), but hard forfeiture of prepaid money from a client who paid $8,400 is a referral-killer, and referrals are the acquisition channel. Punitive expiry optimizes the slot and torches the flywheel.

**Decision D: no fee on top of the forfeit.** The forfeited session *is* the penalty — up to $175 of prepaid value, already recorded. Stacking a fee double-punishes, invites card disputes on a solo-trainer business with no dispute department, and contradicts the honest copy you just shipped. Instead: three late cancels in a rolling 90 days triggers a trainer-initiated conversation, not an automatic charge. Keep the forfeit record; it's the data that makes that conversation factual.
