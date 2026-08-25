# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** .ai-workflow/fusion/pricing-hardening-review-2.md
**Seed:** .ai-workflow/fusion/_live-diff.txt
**Tokens:** 5339 in / 4943 out · **Cost:** ~$0.0000 · **Wall:** 186.8s · **finish:** stop

---

## VERDICT
REVISE — the fail-closed direction is correct and the mount-walk discipline is genuinely good work, but the new server-side money override fails silently by design, mutates financial state with no audit trail, and nobody has proven it ever fires on the live path.

## BLOCKERS

1. **P1 — The server-derived charge guard can be dead code with zero signal, and the team just lived this exact failure mode.**
   Scenario: `session.userId` doesn't exist on the canonical session model (e.g. the column is `clientId`/`client_id`, or the association exposes `UserId` only via an include that isn't loaded at the `cancelSession` call site). Then `getClientPackagePricing(undefined, …)` either throws (swallowed by the `catch` → `logger.warn` → `return`) or returns `isFallback` (→ `return`). Result: a $110 client gets charged the frontend-supplied $175 forever, and the only trace is a warn log nobody alerts on. This is structurally identical to the unmounted-`sessionRoutes.mjs` incident the orchestrator opened with — reasoning from code that isn't in the live path — except here the failure is *silent by construction*. Evidence: `backend/services/sessions/session.service.mjs` diff hunk at ~line 141–160 (`catch { logger.warn; return }` and `if (!pricing || pricing.isFallback) return`). The disclosed "NOT done: no live API-failure simulation" confirms no positive control exists through the mounted path.

2. **P1 — Silent financial override with no audit record of operator intent.**
   Scenario: Trainer enters `partial` charge of $150 on a $110-rate client (e.g. covering a missed double-block). `applyServerDerivedChargeAmount` clamps to $110 in place (`billingOptions.chargeAmount = Math.min(...)`). The DB, the receipt, and any notification built downstream from `billingOptions` all say $110. When the client disputes, there is no record that the operator authorized $150 and the system reduced it — the audit trail shows the operator "chose" $110. For a money path, mutating the operator's validated input without persisting `{requested, applied, reason}` is a dispute-resolution defect, not a style nit. Evidence: `session.service.mjs` diff ~line 180–183 (in-place assignment); call site ~line 1731 occurs before the session update and any notification build.

3. **P2 — Client-facing late fee may regress from "invented number" to "always no number."**
   Scenario: if the cancel-warning endpoint never populates `cancellationPolicy.lateFeeAmount` for role=client (plausible, since the old code existed precisely because the server didn't send it and the frontend papered over the gap with `defaultLateFee`), then every client now sees "See cancellation policy" with no number, permanently. That's not honesty, it's a dead-end: the client is mid-decision about eating a fee and is told to go look somewhere the document never proves exists. Evidence: `frontend/src/components/UniversalMasterSchedule/SessionDetailModal.actions.ts` ~line 82 (`?? null`), panel render at `SessionDetailClientCancelWarningPanel.tsx` ~line 129–133. Whether the server actually emits this field for clients is unverifiable from the document — see CONFIDENCE.

## ATTACKS

**Correctness**
- **Lock-hold duration / deadlock (attack #1):** the multi-table read (`Order`, `OrderItem`, `StorefrontItem`) runs while the session row is locked. Deadlock requires a reverse-order writer (something that locks order rows then the session row). I cannot prove one exists from the document — but even absent deadlock, every cancellation now serializes behind a 3-table join for the lock's lifetime, and cancellations cluster (weather days, holidays). At minimum this belongs outside the critical section: derive pricing *before* taking the lock, or accept the derived value post-commit via a correction step. Severity capped at P2 because no counter-example transaction is shown.
- **In-place mutation (attack #2):** beyond the audit problem in Blocker 2 — if anything upstream captured a reference to `billingOptions` before the call (logging middleware, idempotency key construction, retry buffers), it now observes post-mutation state. Aliasing bugs like this are cheap to avoid: return a new object.
- **Re-arm effect defeated (attack #5):** two sequences. (a) User focuses/types-then-clears the Custom Amount field → `chargeTouched` flips true without any meaningful intent → pricing arrives → defaults never re-arm → panel looks armed, submits `'none'`. Exactly the bug the flag was built to kill, reachable by a single stray click. (b) If the modal component stays mounted across session selection (typical master-schedule pattern), `chargeTouched` persists from the previous session, so the next session's defaults never arm at all. Neither is provable from the diff; both are one-test-each findings.
- **Clamping non-`full` types (attack #3):** silently reducing a `late_fee` or `partial` above one session rate is the wrong call *as shipped* — not because the ceiling is wrong, but because it's invisible. Either surface the clamp to the operator in the API response, or reject with "amount exceeds client's session rate; use `full`." Right policy, wrong feedback loop.
- **`isFallback` at exact-rate packages (attack #4):** nothing breaks — fallback results are ignored wholesale, so a real $175 package simply falls through to the validated amount, which equals the real rate. The genuine risk is the inverse: if `cancellationPricing.mjs` sets `isFallback` for reasons other than "not found" (e.g. "matched via default storefront"), real packages get ignored routinely and Blocker 1's silence compounds. The helper's contract is not in the document.

**Security**
- Role gating is asserted present (`canSetBilling`, client input → null) and I take that on faith per the "do not re-report" instruction. One residual: `parseCancellationAmount` coerces garbage to `0`, and the `<= 0` throw then fires — good — but confirm the throw happens *before* any write, not after a partial update.
- No injection/SSRF surface introduced (all inputs are numeric/enum). No secrets in the diff. Zero-PII-to-LLM rule untouched by these changes.

**Data-truth / schema drift**
- `pricing.pricePerSession` (camelCase) vs a possible `price_per_session` column: if the helper doesn't map, `Number(undefined)` → NaN → the `!Number.isFinite` guard returns silently — another flavor of Blocker 1's invisible no-op.
- `result.cancellationPolicy?.lateFeeAmount` assumes the wire shape is camelCase and nested under `cancellationPolicy`; a snake_case or flattened response yields permanent `null` (Blocker 3).
- **Acquisition-sheet math:** "Four sessions per week for three months" = ~52 sessions, listed as 48; 6-month says 96 (≈104 actual); 12-month says 192 (≈208). If 48/96/192 is intentional (vacation buffer), the copy shouldn't claim "four per week"; if unintentional, the prospect-facing totals are understated by ~$700–$2,800. On the exact sheet a trainer hands a prospect, this is a mis-quote in the opposite direction from the one just fixed. `frontend/src/config/pricing.ts`, program entries.

**House rules**
- `backend/services/sessions/session.service.mjs` is 1,700+ lines and `core/routes.mjs` 744+ — both violate the ≤300-lines rule outright. P2 process debt, but the service file's size is precisely why the cancellation logic drifted unnoticed.
- Palette tokens, Dual-Button Glow, 44px targets, WCAG contrast on the *disabled* radio state: not verifiable from the diff. Disabled-state contrast below 4.5:1 is the most likely violation in a fail-closed UI that grays out controls.
- Language rules: clean. Notably the rewrite *removed* the "NASM movement screen" bullet rather than rewording it — correct instinct.

## HIGHEST RISK
The server-derived charge guard never actually executes successfully on the live path (Blocker 1) — the team ships believing the $175-vs-$110 class of bug is fixed when the fix is a silent no-op, which is a strictly worse epistemic position than before, because the frontend gate is the only remaining defense and it was built assuming backup existed. Cheapest de-risk: **one integration test through the mounted route** — seed a client with a $110 package, PATCH cancel with `chargeType:'full'`, assert the persisted `chargeAmount === 110`. Thirty minutes of work converts "should work" into "works," and simultaneously validates `session.userId`, the helper's return shape, and the `isFallback` contract in one shot. Add a staging telemetry counter on each early-return branch so silent skips become visible in production.

## CONFIDENCE
I could not verify from the document alone:
- **Whether `session.userId` is the correct field** on the canonical session model, and whether the associations passed via `getOrder()`/`getOrderItem()`/`getStorefrontItem()` match `getClientPackagePricing`'s expected signature. Settled by: the integration test above, or reading `utils/cancellationPricing.mjs` and the session model definition.
- **Whether the cancel-warning endpoint emits `cancellationPolicy.lateFeeAmount` for clients.** Settled by: one curl as a client-role token against a late-window session, inspecting the raw JSON.
- **Whether a transaction actually wraps the cancel flow and what lock ordering exists** — the orchestrator asserts `LOCK.UPDATE`; I saw no transaction code in the diff. Settled by: the `cancelSession` body between line ~1728 and commit.
- **The `chargeTouched` implementation details** (what counts as a touch, whether it resets on session switch). Settled by: reading the panel component's effect wiring.
- **Frontend visual house rules** (tokens, glow, target sizes, disabled contrast) — no styles were in the diff. Settled by: the component files themselves or a browser pass, which the team correctly disclosed as not done.

Where I've marked things P1 despite uncertainty, it's because the failure mode is silent — and after the unmounted-route incident, "unverified and silent" on a money path should be treated as broken until proven otherwise.
