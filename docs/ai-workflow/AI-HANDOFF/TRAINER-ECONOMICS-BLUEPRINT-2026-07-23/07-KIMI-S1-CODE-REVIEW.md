# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/8044c7d9-1231-449c-82b3-97570ad6ea78/scratchpad/kimi-s1-code-review-packet.md
**Seed:** (none)
**Tokens:** 8603 in / 2055 out · **Cost:** ~$0.0566 · **Wall:** 92.9s

---

# KIMI K3 — DESIGN/FRONT-END REVIEW: Trainer-Economics S1

## (a) VERDICT
**SEND-BACK (category mismatch)** — this submission contains **zero front-end surface**. No components, no styled-components, no tokens, no routes, no canvas, no motion. I cannot hostile-review design that doesn't exist, and I won't fabricate findings to fill the template. What follows is what a design review *can* legitimately extract: the UI consequences this backend slice is silently locking in.

## (b) Design weaknesses (forward-looking, most-severe first)

1. **The `source` enum is your future badge vocabulary, and it's already bloated.** Six sources — `manual / special / floor_clamp / special_floor_clamp / request / shadow` — will render as near-indistinguishable chips in a Crystalline dark table. `floor_clamp` vs `special_floor_clamp` is a distinction a lawyer loves and a user cannot see. Consolidate to ≤4 visual states with an icon + tooltip, or the economics console ships as rainbow noise. Every one of these must map to a `var(--token, #fallback)` — and nothing here prevents a future builder from hardcoding hex per source. Write the token contract **now**.
2. **Nullable `changedByUserId` = undesignated "System" actor state.** Shadow rows have no actor. Unless the UI spec defines a designed "System" glyph/label, tables will ship with empty cells — dead visual, broken scanning rhythm.
3. **`context` JSONB is schemaless.** The admin console cannot reliably render a freeform blob. S1 already writes `resolverSource / basePrice / shadowFloor / chargedPrice / floorEnforce` — freeze that shape as a versioned contract before S2–S11 each invent their own.
4. **Sequelize DECIMAL returns strings.** `"40.00"` vs `40` will desync every money rendering downstream unless a single money-formatter contract is established before any UI touches this data.

## (c) Implementation-fidelity attacks
- **House-rule violation, verified:** `cartRoutes.mjs` is already at ~line 528 and this patch adds **+85 lines**. The ≤300-lines/file cap is non-negotiable house law — `recordShadowPriceObservation` (75 lines) belongs in `services/economics/shadowObserver.mjs`, not inlined into a route file. This is the one binding rule this submission actually breaks.
- Everything else in (c) — styled-components correctness, 320→3840 behavior, 44px targets, focus/reduced-motion, nested interactives — **is unverifiable. No front-end files were submitted.** No retired Galaxy-Swan palette sighted (nothing to sight). No hardcoded hex (good, but trivially — there's no UI).

## (d) The ONE highest-impact change
**Design the `wouldHaveClamped` surface before S2 builds it.** The shadow data this slice collects has exactly one premium destiny: a **Crystalline clamp-rate Victory chart** — "what the floor *would* have done," rendered as a glowing threshold line at $40 over a time-series of shadow observations, glass panel, Dual-Button Glow on the "Enable Enforcement" action. That is the signature moment of the entire trainer-economics feature. Commit to it now: add an *aggregated* read contract (buckets per day/week), because visualizing raw per-cart-add rows will be unreadable noise-density — thousands of dots, no story.

## (e) What a design-savvy competitor out-builds here
A competitor ships the **invisible made visible**: the same instrumentation, but with a live shadow dashboard on day one — Victory area chart of clamp-rate, KPI stat cards with crystalline depth, a designed "shadow mode" badge state. This slice delivers plumbing whose entire value is latent until S2. Invisible correctness is not a premium product. The data model is good enough to support the signature moment — nothing here blocks it — but nobody has claimed it, and unclaimed signature moments ship as default Victory tooltips and gray tables.

**Bottom line:** the backend judgment call (S1_SHADOW_FLOOR=40) is sound and I'll defer to the code reviewer on it. My blocking items are the file-cap violation and the three UI-contract gaps (source-badge tokens, System actor state, context schema). Fix those and this slice stops quietly sabotaging the console that will eventually render it.

---

## BUILDER RESOLUTION (Opus 4.8, 2026-07-23)

**Kimi's ONE binding blocker — FIXED:** the 75-line `recordShadowPriceObservation` helper was extracted out of `cartRoutes.mjs` into a new dedicated service `backend/services/economics/shadowObserver.mjs` (109 lines, under the cap). The cart route now imports one function (`observeCartAdd`) and calls it — its net addition is ~10 lines (import + call), no self-contained economics logic inlined. Re-verified: `node --check` clean; pure resolver/flags proof 6/6 post-extraction; `S1_SHADOW_FLOOR=40` confirmed in the new module.

**Kimi's forward-looking design contracts (b/d/e) — DEFERRED to the S2 Economics Console design contract, NOT S1 defects:** the source-badge token vocabulary, the "System" actor glyph, the frozen `context` JSON shape, the money-formatter contract, and the signature `wouldHaveClamped` Victory clamp-rate chart (with an *aggregated* daily/weekly read contract, not raw per-cart rows) are all UI decisions for the console that renders this data. They are captured here and will be honored in the S2 per-slice Crystalline design contract (per Sean's "design contract per UI slice" decision). S1 ships no UI, so none of these block it. Kimi explicitly deferred the S1_SHADOW_FLOOR judgment to the code reviewer and it stands.

**S1 status:** SHIP. Blocker fixed, design contracts logged for S2.
