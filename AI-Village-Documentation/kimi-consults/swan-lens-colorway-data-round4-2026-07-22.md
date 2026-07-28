# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** C:/tmp/ss-swan-lens-gallery-20260722/docs/ai-workflow/brainstorms/swan-lens-kimi-round4-colorway-data-2026-07-22.md
**Seed:** AI-Village-Documentation/kimi-consults/swan-lens-colorway-specs-round3-2026-07-22.md
**Tokens:** 5288 in / 5495 out · **Cost:** ~$0.0983 · **Wall:** 239.2s

---

# Kimi K3 — HOSTILE DESIGN + FRONT-END REVIEW (Round 4 Brief)

## (a) VERDICT: **SHIP-WITH-CHANGES**

Credit where due: this round genuinely absorbed my round-3 send-back — gradient/glass/glow/focus/chart fields exist, the cyan ban is numeric, ΔE gates are in, the full contrast matrix is restored, states are required, ids redirect instead of shelving. But it now commits a new class of sin: it demands **computed color-science numbers from a generator that cannot compute them**, pins one gate that is **mathematically unsatisfiable for a dark-first brand**, references a button-label token that **doesn't exist in the schema**, and sets tray math that **cannot close**. Ship it — after four surgical fixes, not after another full cycle.

---

## (b) DESIGN WEAKNESSES (most severe first)

**1. The brief asks an LLM to fabricate audit math and present it as ground truth.**
"Report the min ΔE per new row." "Every new colorway passes ALL [nine contrast checks]." OKLab ΔE and WCAG sRGB contrast ratios are *computed quantities* — no language model generates `minΔE: 17.3` by doing OKLab transforms; it generates a plausible-looking number. You have replaced the round-3 "vibe audit" with **fabricated precision**, which is worse: a wrong number with two decimals ships with more authority than an admitted estimate. The fix is not to trust harder — it's to make the deliverable **self-verifying**: the TS registry block must ship with a runnable validation script (culori or colorjs.io; pin the library — different libs disagree on OKLab edge behavior) that recomputes every claimed ΔE and contrast ratio and fails CI on violation. The LLM proposes; the script disposes. Without this, Table 2's numbers are decorative.

**2. The ≥15 ΔE-on-`bg` gate is unsatisfiable for dark families — it will either be violated silently or force light-leaning "darks."**
OKLab near-blacks cluster in a tiny perceptual volume. `#10070A` vs `#0A0A14` vs `#0D0D0F` are ~2–6 ΔE apart. Requiring every *new* colorway's `bg` to sit ≥15 ΔE from **every kept colorway's bg** — including crystalline-dark, obsidian-black, carbon-fiber, pearl-noir, graphite-luxe — means no new dark bg can exist; the only compliant "new" themes would drift to L≈0.35+ surfaces, which is not an Apex Dark. The gate as written bans the brand's own family. Repin: **`bg` ΔE ≥ 8 + `primary` ΔE ≥ 15** (or a weighted composite, e.g., `0.4·ΔE(bg) + 0.6·ΔE(primary) ≥ 14`). The current spec guarantees either a violated gate or a broken family — pick before generating, not after.

**3. The contrast matrix tests `[button-label]/primary ≥ 4.5` against a token that does not exist.**
There is no `onPrimary`, no `textOnAccent`, no label token in the 17 base fields or the new optionals. So "button-label" is… `text`? White? `#0a0a1a`? Every colorway's most-viewed contrast pair is audited against an undefined value — the builder decides per-theme, which is precisely the improvisation surface this program exists to eliminate. Add **`onPrimary` (and ideally `onAccent`)** to the schema. One field. This is the same class of hole as round-3's missing glow tokens, one layer deeper.

**4. `glowPrimary`/`glowSecondary` are required but semantically unbound — the Dual-Button Glow rule still can't be derived from the data.**
House rule: blue bg → purple glow, purple bg → cyan glow. The brief mandates the two fields but never says **which maps to which condition**. For Ruby Forge — a red colorway — what is its "blue-bg button" and what glows purple? Undefined binding means the builder assigns by feel, and a competitor's Ruby Forge glows Crystalline purple (brand bleed) or hardcodes (rule breach). Pin it: `glowPrimary` = glow on `primary`-filled interactive elements; `glowSecondary` = glow on `secondary`/`primaryBlue`-filled elements — and state that both must be **in-family hues** (a Ruby Forge glow is warm rose/amber, never Crystalline purple). Data without semantics is a palette, not a system.

**5. `gradientFrom/To/Angle` have no usage contract — "gradient-forward" will become gradient-everywhere, which reads cheap, not premium.**
The fields exist; their *application surface* doesn't. Is the gradient for heroes? CTAs? Card fills? Text? A gradient-forward theme with gradients on every surface is a 2016 Dribbble shot. Premium is restraint: **one signature gradient application per colorway** (my recommendation: primary CTA fill + the swan-mark sheen at ≤15% opacity on hero surfaces, flat everywhere else). Without a pinned role, the builder splashes it everywhere and the Jewel Gradients family becomes the garish family. The schema can express the gradient; the brief must express the *discipline*.

**6. The cyan ban's lightness floor is a gameable loophole.**
Hue 175–200° banned only at L ≥ 0.60. A `#0E4A56`-anchored "dark teal lagoon" colorway — same cyan family identity, just dimmer — sails through. The retired brand crime was the *hue family reading as Galaxy-Swan*, not only its brightness. Either extend the window (chroma ≥ 0.10, L ≥ 0.35, with the ΔE<12-to-`#00FFFF` clause still catching bright cases) or state explicitly that dark teals are in-brand. Right now `twilight-lagoon` and `deep-jade` verdicts are judgment calls wearing a numeric costume.

**7. Tray math contradicts family minimums — the arithmetic cannot close as specified.**
5 families × ≥4 members = 20 minimum kept… and the curated tray target is 16–20 **including 6–8 new**. So kept-from-38 must be 8–14, meaning **24–30 of the 38 legacy colorways get archived** — but Archive only accepts dup-consolidations and compliant heritage pieces, and crystalline-dark is never archived. Either the archive criteria quietly expand to "whatever makes the count work," or the tray ships at 26+. Give per-family archive targets, or admit the tray lands at 22–24 and amend the round-2 pin. Do the math in the brief before making the generator do it live.

**8. Light-glass audited "over `#000000` worst case" guarantees a dead glass aesthetic.**
Compositing every glass surface against pure black forces `glassOpacity` toward 0.9+ to pass text contrast — which is a solid card wearing a blur filter. The worst-case-black rule was my round-2 *fallback* contract (`@supports` → 92% opaque), not the primary design target. Audit glass twice: composited over own `bg` (primary) and over `#000000` (fallback state), and label which state each ratio belongs to. Otherwise the Frost Glass family ships as Frost Plastic.

---

## (c) IMPLEMENTATION-FIDELITY ATTACKS

1. **The deliverable target violates the ≤300-line house rule on arrival.** 38 existing + 8 new specs × 24+ fields in `UniversalThemePremiumThemes.ts` is 1,500+ lines. BLOCK 4 names this file as the paste target with zero splitting plan. Require: per-family modules (`themes/apex-darks.ts`, `themes/jewel-gradients.ts`, …) + a barrel `index.ts`, each ≤300 lines. The registry architecture is unspecified and the specified destination is already non-compliant.

2. **The ΔE comparison basis is ambiguous.** "Compare on `primary` and `bg`" — min of the two? Both must pass? A composite? Three auditors, three verdicts — the exact failure I called out in round 3 for the cyan rule, reintroduced one section later. Pin: `min(ΔE(bg), ΔE(primary))` reported separately, both thresholds explicit.

3. **Alpha-in-alpha compositing is still unresolved.** `textSecondary: rgba(255,241,243,.84)` rendered on `surface: rgba(38,12,20,.82)` over `bg` is a *double composite*. "Alpha surfaces composited over own bg" handles one layer; stacked glass on glass (a modal over a glass card — a real pattern) is unaudited. Pin the evaluation order: flatten surface-over-bg first, then composite text over the result. My round-3 hex8/alpha-step normalization suggestion also still stands — mixed hex6/rgba parsing in one schema is two code paths forever.

4. **`chart1..chart3` tops out at three series with no distinguishability rule.** Victory charts with 4+ categories either recycle (series 1 ≡ series 4 — data corruption by color) or hardcode (token breach). And nothing requires the three chart hues to be separable from *each other* on `surface`, or CVD-safe — a red/green/brown triple passes every stated check and is illegible to 8% of male users. Minimum: 5 series tokens + a mutual ΔE ≥ 10 requirement + a deuteranopia simulation pass.

5. **`accent/surface ≥ 3.0` sanctions sub-WCAG text if `accent` ever renders as type** — links, stat highlights, eyebrow labels. House rule is 4.5:1, no asterisk. Either bind `accent` to non-text roles only (and say so), or raise the gate to 4.5. The brief is silent on accent's role — same semantic-gap disease as the glow fields.

6. **`focusRing` is tested against `surface` only.** Focus rings live on `elevated` (cards) and inside glass. A ring passing 3.0 on `surface` can vanish on `elevated`. Add `focusRing/elevated ≥ 3.0`.

7. **No theme-transition or reduced-motion contract.** 46 selectable themes implies a theme switcher; the switch itself (crossfade? instant? does the swan mark re-tint with a GPU-safe opacity/transform tween, and does it collapse to instant under `prefers-reduced-motion`?) is undesigned. The most delightful moment in the whole feature is unspecified.

8. **Rename-on-keep has no collision check against the new names** and no uniqueness constraint across display names — only ids. Two themes named "Velvet Hour" (one kept-rename, one new) is a live possibility the brief can't catch.

---

## (d) THE ONE HIGHEST-IMPACT CHANGE

**Bind every new token to a semantic role and declare each colorway's ONE signature surface — in the schema, not in prose.** Add to the spec: `signature: { surface: 'primary-cta' | 'hero-sheen' | 'card-edge', gradientApplied: boolean }` and a written binding table — `glowPrimary`→glow on primary-filled controls, `glowSecondary`→glow on blue/secondary-filled controls, both in-family; `gradientFrom/To`→the signature surface *only*; `borderSubtle`→hairline separators and glass rims, never decorative boxes.

Why this one: the schema can now *hold* depth, but premium is not the presence of gradient/glow/glass fields — it's the **restraint of their application**. Twenty-four tokens with no roles is a paint aisle; eight tokens with pinned roles is a design system. The difference between a colorway gallery that feels like Crystalline Swan and one that feels like a ThemeForest bundle is that every Crystalline theme has exactly one luminous moment — the glowing CTA against the deep surface, the swan mark catching the gradient — and everything else is disciplined dark. Generate data with roles pinned and the builder literally cannot make it gaudy. Generate without them and you've shipped 46 ways to improvise.

---

## (e) WHAT A DESIGN-SAVVY COMPETITOR OUT-BUILDS HERE

1. **They render a contact sheet, not a table.** Every colorway shown on the real component kit — Dual-Button pair, glass card, Victory chart, focused input, danger state — at 375px and 1440px, audited by eyes *and* numbers. This brief's entire quality assurance is hex arithmetic no human ever sees rendered. You cannot audit premium in a spreadsheet.
2. **Their registry validates itself in CI.** The TS block ships with the test that recomputes ΔE and contrast; a bad hex fails the build, not a review round. This brief's verification plan is "the generator said it passes."
3. **Their charts are colorblind-audited.** Deuteranopia/protanopia simulation on every chart triple is table stakes for an analytics product. Absent here entirely.
4. **They spec the switch, not just the states.** A 300ms GPU-safe crossfade with reduced-motion collapse makes the theme gallery itself a signature moment. Here, 46 themes and zero motion design.
5. **They know dark themes cluster and design gates accordingly.** Their distinctness metric is tuned to the actual OKLab volume dark palettes occupy (weighted primary-forward); this brief's flat 15-on-bg gate would reject their entire dark family — proof nobody test-fit the numbers before writing them.

**Bottom line:** add `onPrimary`, fix the bg-gate to a dark-feasible weighted composite, bind glow/gradient to semantic roles with one signature surface per colorway, split the registry into per-family modules, and require the validation script *in* the deliverable. Then generate. The schema is finally capable — don't let the acceptance math and the missing semantics waste it.
