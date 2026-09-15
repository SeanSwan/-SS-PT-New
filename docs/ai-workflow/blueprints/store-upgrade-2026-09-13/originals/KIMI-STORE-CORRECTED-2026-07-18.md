# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-STORE-BLUEPRINT-2026-07-17.md
**Seed:** docs/ai-workflow/AI-HANDOFF/KIMI-STORE-REGROUND-SEED-2026-07-18.md
**Tokens:** 12578 in / 16000 out · **Cost:** ~$0.2777 · **Wall:** 536.3s

---

# KIMI K3 — HOSTILE DESIGN + FRONT-END REVIEW: Store V4 "The Crystal Case"

---

## (a) VERDICT

**SEND-BACK** — the design system work is genuinely strong, but the binding layer (tokens, flags, gate, Crystallize, price mapping) was authored against a substrate that doesn't exist. A build-exact blueprint with hallucinated bindings is not build-exact. The seed corrections are correct and non-negotiable; what's below is what the seed *didn't* catch, plus the design critique nobody asked for and everybody needs.

---

## (b) DESIGN WEAKNESSES — most severe first

**D1 — There is no pedestal. The flagship "hierarchy" is a sticker.**
The doc's own H3 diagnoses "flat merchandising — a $175 single and a 12-month block presented as equals," then prescribes… an equal-size card in an equal 3-up grid with a 24px gold tag and a border-glow stop. That is flat merchandising with glitter. A jeweler's case has exactly one piece under the light and the rest in the drawer. The central metaphor of the document — the thing the closing paragraph promises ("stops listing packages, starts *presenting* them") — is structurally betrayed by its own layout. The grid is the drawer; nothing in this blueprint builds the pedestal.

**D2 — Template spine in a tuxedo.**
Hero → trust bar → grid → 3-step how-it-works → testimonials → why-us → final CTA is the stock SaaS landing skeleton. Every Webflow template ships this exact IA. The surface treatment is luxe; the architecture is generic. Surface luxury over stock IA reads as "template in a tuxedo" — the precise failure mode the concept was supposed to kill.

**D3 — The signature moment is attached to the wrong trigger, and it violates the doc's own rarity law.**
The Crystallize fires on *scroll-reveal, once per mount* — meaning it re-fires on every page load for every user. DO-NOT #16 says "Rarity is the point"; motion #4 makes the signature effect a per-visit firework. Worse, the emotional peak of a store page is the moment of *commitment* (add-to-cart), which currently gets a pill bump — while a card the user hasn't even decided about gets a 980ms four-stage choreographed sequence (340 + 140/560 + 420/620 + 700/280). Luxury motion lives in the 200–450ms perceived window; ~1s of sequenced ring/sweep/bloom on a price you're trying to read is theme-park, not jeweler.

**D4 — Wing eyebrow fails WCAG on the card's lightest stop. My math: ~4.47:1.**
`#8E6FE8` at 11px/700 on `--store-card-1` `#111B3D`: L(8E6FE8) ≈ 0.2294, L(111B3D) ≈ 0.0125 → (0.2794)/(0.0625) ≈ **4.47:1**. The duration eyebrow sits at the card top — exactly where the 165° gradient is card-hi. It passes on the darker stops (≈4.9:1) and fails where it actually renders. A hair under is still a fail, and it's a fail on the *smallest text on the page*. Fix: brighten wing-as-text to a tint (`#A78BFA` ≈ 6.3:1) or move eyebrows to ice and restrict wing to borders/graphics. "Verify with axe in Slice 1" is not a substitute for doing the arithmetic in the blueprint — axe would have caught this after the builder already painted 258 lines.

**D5 — Proof is repeated, not layered.**
"26+ years" appears in hero micro-trust, trust bar item 1, *and* WhySwan pillar 1. "NASM OPT™" appears in hero sub, trust bar item 2, *and* pillar 2. The same two claims stated three times each on one page reads as padding, not proof. And the trust bar — a 4-item icon strip — is the single most templated component in existence; here it duplicates the hero micro-trust line almost verbatim. Cut the trust bar or make it earn its slot with quantified, non-duplicated facts.

**D6 — Mobile merchandising latency: first price is ~2 viewports deep at 320/375.**
Hero min-h 560 (on a 568px-tall SE, that's the whole screen) + trust bar 2×2 + grid eyebrow/H2/sub → the first actual price sits around 900–1100px down on the device most buyers hold. The case opens late. Fix is free: kill the trust bar on mobile (it duplicates the hero micro-trust anyway — see D5) and let the grid header ride directly on the hero.

**D7 — Minor motion noise.**
The scroll cue runs `infinite alternate` forever — after first scroll it's dead noise and a 2016 pattern; self-terminate on first scroll event. The pill bump at `scale 1.22` is bouncy-app language; a jeweler doesn't jump. 1.08–1.10 with the gold ring reads expensive; 1.22 reads Duolingo.

**Passes (stated once, then back to hostile):** spacing rhythm is a coherent clamp system, not arbitrary px soup — pass. Shadow tokens are deep and correct, not `rgba(0,0,0,0.5)` mud — pass. The 4-stop gradient border at those alphas is tasteful chrome, not rainbow — pass, but hold the builder to the alphas; saturated stops would flip this to cheap instantly. Typography scale is disciplined. No 4th column on ultrawide — correct taste. Gold-twice law and the no-literal-swan law are the two best sentences in the document.

---

## (c) IMPLEMENTATION-FIDELITY ATTACKS

**F1 — The entire token chain is dead on arrival.** Every invented slot (`--lens-ice`, `--world-bg-deep`, `--world-card-hi`, `--world-font-display`, `--world-shadow-1`…) fails to resolve, so every `--store-*` silently falls back to its literal — *forever*. The page renders, which is what makes this dangerous: it will look right in review and be permanently un-skinnable. The Appearance Studio re-worlds the whole app and the store stays frozen in 2024 Crystalline. The canvas reads the same dead vars via `getComputedStyle`, so the hero optics freeze too. Remap per Correction 1, exactly, including shadows → `--lens-elev-1/2`, easings → `--lens-ease-standard/--lens-ease-crystallize`, z → `--lens-z-*`, and gold as a store-local literal. And add a fourth CI check the blueprint missed: **no file outside `storeV4.tokens.ts` may name `--world-*`/`--lens-*`** — `check-token-discipline.mjs` as specced only polices hex.

**F2 — `StoreGate.tsx` as written breaks the blueprint's own revert story and its own perf budget.** (1) `import StoreV4 from './StoreV4'` is static → the cinematic layer ships in the store chunk with the flag OFF. There goes the ≤70KB budget for 100% of users during the entire dark-launch period. `React.lazy()` is mandatory, per Correction 4. (2) `resolveFlag` reading only `import.meta.env` + localStorage means "instant revert" is a rebuild-and-redeploy — the actual instant lever is the shipped runtime `/api/config/public-flags` chain (Correction 3). Mirror `DashboardV2RouteGate`/`DashboardGate`/`flags.ts`; add the store key to the existing endpoint. (3) The seam is `main-routes.tsx:148-153` (`SwanStudiosStore` lazyLoadWithErrorHandling), gating `/store` + `/swanstudios-store` + `/shop` together — the blueprint's generic `<Route path="/store">` diff is the right idea aimed at the wrong file.

**F3 — Hand-rolled Crystallize = a second dialect of a shipped behavior.** The lens owns `useCrystallizeTransition` + `CrystallizeOverlay` (body portal, no children, `phase/variant/chargeMs/settleMs/announcement` props) and owns the timing tokens (`--lens-crystallize-charge-ms/settle-ms`). The blueprint re-times it by hand (340/560/620/280) with pseudo-elements. Two Crystallizes will drift within a quarter, and the hand-roll silently drops the `announcement` prop — i.e., the *accessible* part. Delete motion-table row 4 as specced; consume the lens via a `store-v4/lensBindings.ts` mirror of DashBoard/v2's.

**F4 — Money mapping drift, three ways.** (a) Real payload is `price` **DECIMAL-as-string** — `priceCents` must be derived by string-split integer math, never `parseFloat × 100` (float dust on a money page is a parity-test flake waiting to happen). (b) The server already sends `pricePerSession` — deriving `Math.round(priceCents / sessionsIncluded)` risks a rounding mismatch against V3's displayed value, which fails the blueprint's own money-parity test. Use the server field verbatim; derive only when absent. (c) `pricingVisibility` is not a client predicate to "extract from V3" — the server computes it (`priceVisibilityService.mjs`) and returns `pricesVisible` in the payload. Consume the field; delete the predicate-extraction language before a builder reimplements auth logic on the client. **And the silent revenue hole: `data.activeSpecials` is in the real payload and appears nowhere in V4.** If V3 renders specials and V4 doesn't, flipping the flag *removes a selling surface*. Handle specials or write the explicit exclusion rationale into the blueprint — silently dropping them is not a decision a design doc gets to make by omission.

**F5 — The Swan card is unbuildable as written: overflow contradiction.** The refraction sweep (`::after`, `translateX(-140%→140%)`, `rotate(18deg)`) requires `overflow: hidden` + radius clipping. The flagship tag (`position: absolute; top: -12px`) requires `overflow: visible`. One element cannot be both. As specced, the builder will either clip the tag or let the sweep bleed past the radius. Fix in the blueprint: an inner clip layer (inner wrapper, `overflow:hidden`, radius 19px) owns the sweep; the shell keeps visible overflow and owns the tag.

**F6 — z-index: 60 is a magic number in a system that ships `--lens-z-base/raised/sticky/overlay/modal/toast`.** Bind the pill to `var(--lens-z-sticky)` (or `raised`) and *verify against the real mobile chrome* — if the app shell has a bottom tab bar, a hardcoded 60 plus `bottom: 16px` is how the cart pill ends up underneath navigation on the exact device where the pill is full-width.

**F7 — A11y gaps the spec forgot.** (a) The cart pill's `aria-live="polite"` region is conditionally mounted *with* content — a live region that appears already-populated is not reliably announced. Mount the live region persistently (visually hidden at count 0), toggle only the visible pill. (b) "Explore Training Blocks" smooth-scrolls to `#packages` but never moves focus — keyboard/AT users get a viewport jump with focus stranded in the hero. Add focus handoff (`tabindex="-1"` + `.focus({preventScroll:true})` after scroll) or it's an AA-shaped bug on the page's primary CTA. (c) The mobile testimonial snap carousel specifies `scroll-snap-type: x mandatory` and `min-width: 82%` but omits `scroll-padding` — first card snaps to the container edge, killing the side-pad rhythm. Add `scroll-padding-inline` matching the viewport's side pad.

**F8 — Line budgets and test fragility.** `SwanPackageCard` is budgeted at 258 lines while carrying: shell + border-gradient + hover/press/focus + flagship variant + ask variant + error state with a 2400ms auto-reset timer + per-type bullet keying + Crystallize binding. That overruns 300 the moment a builder writes it honestly. Pre-split now: `swanPackageCard.styles.ts` + `SwanPackageCardAsk.tsx`. And the parity test's `page.locator('text=${row.p}')` will match the per-session anchor string as readily as the price — plus any format drift ("$175.00" vs "$175") fails on formatting, not value. Scope the locator to V3's price node and compare parsed values, not strings.

**Responsive/44px/keyboard audit result:** the matrix is the most complete I've seen in a blueprint — 8 viewports, resolved px, honest about clamps; 48/56px targets clear 44 everywhere stated; DPR ≤ 2; mobile-first breakpoints sane. Two debts only: D6's mobile price latency and F7c's snap padding. Reduced-motion design (hidden-start only under `no-preference`, 1200ms force-reveal, IO-undefined fallback) is genuinely fail-closed — the one place this doc is better than the app it's joining. De-Galaxy grep must extend past hex: `rgba(0,255,255,…)`, `rgb(120,81,169)`, and `hsl(180, 100%, 50%)` — cyan wears three costumes.

---

## (d) THE ONE HIGHEST-IMPACT CHANGE

**Build the pedestal, not the tag.**

Pull the flagship (deterministic: highest `price`) out of the grid into a full-width "under the light" panel at the top of the packages section ≥1024px — roughly 2/3 width content, deeper elevation (`--lens-elev-2` rest / custom shadow), the only persistent gold light on the page, per-session anchor given typographic weight, and the bullet story allowed to breathe. Below it, the grid is explicitly "the drawer": the remaining blocks, 2-up. On mobile the pedestal is simply the first card, un-min-height'd — DOM order unchanged, no a11y reordering. The Crystallize moves with it: no more scroll-reveal firework. The pedestal is lit *steadily*, and the shipped `CrystallizeOverlay` fires exactly once that matters — **on add-to-cart success** for the flagship, with its `announcement` prop doing the a11y work the hand-roll dropped.

Why this is the one: it's the only change that simultaneously (1) makes the jeweler's-case metaphor structural instead of decorative, (2) fixes D1/D3 — hierarchy and signature-moment timing — with one decision, (3) gives the canvas a focal point (concentrate the caustic light above the pedestal instead of diffusing 48 prisms across the hero), and (4) costs one new component (`StoreV4FlagshipPedestal.tsx`, ~190 lines) and a grid filter. A tag says "this one costs more." A pedestal says "this one is why the case exists." Only the second is premium.

---

## (e) WHAT A DESIGN-SAVVY COMPETITOR OUT-BUILDS HERE

1. **Pointer-reactive optics.** The hero canvas ignores the mouse entirely — the crystal doesn't respond to the hand. Light that tracks pointer position (even 8px of gradient-shift parallax, transform-only, pointer:fine only) is the single strongest "this is real" tell in cinematic web design, and it's nearly free. A competitor's crystal case *moves when you reach into it*.
2. **Specific, quantified proof.** "Client — 12-Month Block" is honest but weightless. A competitor ships "Down 18 lb across the 6-month block — travels weekly, trains 2×" — outcome + timeframe + constraint. Role labels protect PII; outcomes sell. Get Sean's curated quotes to carry one number each.
3. **Visceral savings math.** One 13px anchor line vs. a competitor's per-session delta against the single-session rate ("$175/session single → $131/session here") with the delta shown, not implied. Money made tangible converts; money merely displayed does not.
4. **Honest scarcity.** It's a private one-coach studio — capacity is *real*. "3 training slots open this month" beats a BEST VALUE sticker every day of the week, and it's the only scarcity
