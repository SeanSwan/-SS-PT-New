# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** .ai-workflow/fusion/failclosed-pricing-review.md
**Seed:** .ai-workflow/fusion/_diff.txt
**Tokens:** 4549 in / 5730 out · **Cost:** ~$0.0000 · **Wall:** 201.4s · **finish:** stop

---

## VERDICT

REVISE — the fail-closed instinct is correct and the diff is clean, but it ships a fail-open default prop, a stale-defaults race the author himself documents and then doesn't fix, a `restoreCredit: false` pairing that looks copy-pasted rather than reasoned, and — decisively — it polishes the display layer while the server still moves real money based on client-supplied numbers.

## BLOCKERS

1. **P1 — Fail-closed branch pairs `chargeType: 'none'` with `restoreCredit: false`.**
   Scenario: pricing fetch is slow or fails → admin opens cancel panel on a non-early-cancel-eligible session → defaults are `{ chargeType: 'none', chargeAmount: '', restoreCredit: false }` → admin confirms. Client is charged nothing **and receives no session credit back**. Compare the early-cancel branch two lines above: `'none'` is paired with `restoreCredit: true`. The asymmetry strongly suggests `false` was inherited from the `full`-charge branch (`restoreCredit: false` meaning "you're being charged, so no credit") without re-deriving it for the no-charge case. If `restoreCredit` flows into the cancel payload as written, the "safe" fail-closed default silently confiscates a paid session. Evidence: `SessionDetailModal.actions.ts` diff hunks at old lines ~118–131 (new lines ~121–135).

2. **P1 — Defaults never re-arm when pricing resolves; the panel then lies in the opposite direction.**
   The document concedes this ("it does NOT re-arm when pricing arrives") but treats it as a transient open-window problem. It isn't transient. Once the fetch succeeds, `pricingUnavailable` flips false → radios enable, `$175.00` renders, the caption reverts to *"Charge the full session rate based on client's package"*, and the radio is labeled **"(Default)"** — while the actual submitted state is still `chargeType: 'none'`. An admin who glances at the now-normal-looking panel and confirms gets a free cancellation. The fix replaced "placeholder presented as real" with "real presented as armed-but-isn't." Evidence: `buildCancelPanelDefaults` is a pure function called once (per the diff and the doc's own attack item #2); no effect in the diff re-derives defaults on the `pricingUnavailable` transition.

3. **P1 — The server still honors client-supplied `chargeAmount` for `late_fee` and `partial` with zero validation.**
   `backend/routes/sessionRoutes.mjs:2239–2246`: `parseFloat(chargeAmount) || ...`. Concrete failures: (a) `chargeAmount: "-500"` → `parseFloat` yields `-500`, truthy → a **negative charge**, i.e., a refund/credit injection; (b) `chargeAmount: "99999"` → arbitrary overcharge; (c) `chargeAmount: "0"` → falsy → silently becomes 50% of session rate, so an admin legitimately entering $0 custom gets billed half a session. The entire commit gates what the frontend *seeds*; the wire protocol still accepts whatever arrives. A frontend-only fix here is repainting the door on a vault with the lock removed.

4. **P2 — `pricingUnavailable?: boolean` with default `false` is a fail-open contract.**
   The whole point of the change is that unknown pricing must disable charging affordances. The component's signature says the opposite: any future consumer that omits the prop gets the pre-fix behavior, and TypeScript will not warn. The parent's hook state is required; the child's should be too (or default `true`). Evidence: `SessionDetailCancelOptionsPanel.tsx` diff, props interface line ~41 and destructuring line ~60.

## ATTACKS

**Correctness**
- **Stale-response race in `useSessionPackagePricing` (unverified, likely):** nothing in the diff shows an AbortController or request-sequence guard keyed on `clientId`. Admin viewing client A's modal, quick-switches to client B; A's slow response resolves last → `pricingUnavailable: false` with **client A's price rendered on client B's panel**. Wrong-client pricing driving a charge decision is worse than a placeholder. Needs `clientId` in the dependency/effect-cleanup story; the document never addresses it.
- **Custom Amount path is not gated:** only full and late-fee radios get `disabled={pricingUnavailable}`. Selecting Custom seeds `''`, and the server's `parseFloat('') || sessionRate * 0.5` then charges 50% — a number the panel showed as blank. State/display mismatch on a money field.
- **Test-name lie:** the pre-existing test *"falls back to full and late charge defaults when pricing fails"* is kept green, but the behavior it names was deliberately removed at the consumer level. Only the inert hook numbers make it "true." Future readers will trust the name. Rename or delete it; "0 assertions rewritten" is spin, not virtue.
- **`tsconfig.json` excludes `**/*.test.tsx`:** disclosed, but it means the new optional-prop contract has *zero* static checking anywhere it matters most — tests are exactly where a forgotten prop would first appear.

**Security**
- **Authz on the charge fields is unexamined.** Roles say clients book and cancel. Does the cancel route reject `chargeType`/`chargeAmount` from non-manage callers, or does any authenticated client cancelling their own (or, worse, an IDOR'd other) session set `late_fee` + arbitrary amount? The document quotes the switch statement but never shows the middleware above it. This is the single biggest unanswered question in the piece.
- **No idempotency/replay discussion:** double-submitted cancel confirmations, or a replayed cancel payload — does the second charge? Nothing in the document.
- **Secrets/PII:** nothing alarming in the diff; commit email redacted. OK.

**Data-truth / schema drift**
- `defaultFullCharge: number` still claims non-null provenance the value doesn't have — the exact disease the commit diagnoses ("the type made 'unknown' unrepresentable"), recreated one level up: `{ defaultFullCharge: 175, pricingUnavailable: true }` is now a representable-invalid state, and the residual at `SessionDetailModal.actions.ts:79` proves the next consumer already bypassed the flag. See HIGHEST RISK framing below.
- `frontend/src/config/pricing.ts` ($200 tier, $160/session volume discount) contradicts declared policy inside a *client-handoff PDF* — a sales-misquote time bomb one import away from live.
- `dashboard-tabs.ts:186` marks a route no router defines as `status: 'real', isNew: true` — metadata lying to admins.
- `fix-storefront-packages.mjs` writes the retired graduated scheme and lacks the `DISABLED_` prefix its siblings have. One typo'd command away from wrong storefront pricing. The fix costs ten characters; deferring it is indefensible.

On the author's five questions, briefly: **(1)** the 175/88 retention is a time bomb — the residual file is the proof-of-concept; **(2)** the race is worse than framed (see Blocker 2); **(3)** yes, the optional prop is a real hazard (Blocker 4); **(4)** yes, the server must stop honoring client amounts — the frontend fix is cosmetic relative to money movement; **(5)** he walked past server-side validation, the store-front seeder, and — given the owner's stated #1 gap is acquisition — spent a full cycle on an internal admin surface while the *client-facing* invented-$88 warning shipped known and unfixed.

## HIGHEST RISK

The server trusting client-supplied `chargeAmount` (`sessionRoutes.mjs:2239–2246`). Every scenario in this document — placeholders, races, disabled radios — only shapes what a *well-meaning admin sees*. This line determines what actually posts, accepts negatives, and possibly accepts them from roles that shouldn't send amounts at all. Cheapest de-risk before ship: ~10 lines in the route handler — derive every amount server-side from `packageInfo.pricePerSession` / `chargeCalc.lateFeeAmount`, reject or clamp any client `chargeAmount` outside `[0, sessionRate]`, and return 403 if a non-manage role sends charge fields at all. While in there, fix the `parseFloat('0')` falsy trap with an explicit `Number.isFinite` check.

## CONFIDENCE

What I could **not** verify from the document alone:
- **Route authz:** whether clients can reach the cancel-charge path, and whether `chargeType`/`chargeAmount` are validated by role. The quoted snippet starts at the switch. Full handler + middleware would settle it — this is the load-bearing unknown behind my HIGHEST RISK call.
- **Whether defaults truly don't re-arm:** inferred from the pure-function signature plus the author's own concession. The `useSessionCancellation` source would settle it; if there's a `useEffect` re-deriving defaults on `pricingUnavailable` transitions, Blocker 2 downgrades to P2.
- **`restoreCredit` semantics:** I'm inferring "credit restoration" from naming and the early-cancel pairing. If `restoreCredit: false` with `'none'` is intentionally "cancel without charge, credit handled elsewhere," Blocker 1 collapses — but then the document should say so, because nothing in it does.
- **Stale-response guard in the pricing hook:** no cleanup/abort code shown; presence of one kills my cross-client race scenario.
- **Server fallback for `packageInfo`:** if `packageInfo` lookup fails server-side, is there a hardcoded fallback upstream of line 2235? Not shown.
- **House-rule compliance:** the diff shows styled-component usage consistent with the rules, but token usage (`var(--token, …)`), touch-target sizes, and contrast on the swapped "Pricing unavailable" text aren't inspectable from these hunks. No violation is *evident*; none is *cleared* either.
- `_diff.txt` was referenced but not provided; my review is based on the inline diff, and any divergence between them is invisible to me.
