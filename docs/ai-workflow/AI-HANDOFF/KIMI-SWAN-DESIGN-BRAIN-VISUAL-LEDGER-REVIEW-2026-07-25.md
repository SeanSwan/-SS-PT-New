# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** .codex-tmp-visual-review-20260725/plan.md
**Seed:** .codex-tmp-visual-review-20260725/brainstorm.md
**Tokens:** 4939 in / 1633 out · **Cost:** ~$0.0393 · **Wall:** 59.3s

---

# KIMI K3 — HOSTILE DESIGN + FRONT-END REVIEW

**(a) VERDICT: SEND-BACK** — the plan is architecturally sound but visually ungoverned: it mandates "deterministic SVG cards" while specifying *zero* visual system for them. You're shipping a renderer with no design.

---

**(b) DESIGN WEAKNESSES, most-severe first**

1. **The renderer has no visual contract — this is the fatal gap.** §3.1 defines *data* fields; §4.5 says "render SVG." Nowhere does the plan say what the card *looks like*: no grid, no type scale, no layout zones, no hierarchy rendering order. "Deterministic" ≠ "designed." Left to a builder, `renderVisualCardSvg` becomes a stack of `<text>` nodes with default black fills on white — a generic receipt, not a Swan pattern card. A learning artifact whose whole purpose is *visual memory* is itself visually unspecified. This is exactly the "generic/template feel" the system exists to prevent.
2. **Missing signature moment.** `swanTranslation.signatureMoment` is a *string field*, but the plan never requires the SVG to actually render one distinctive visual anchor (crystalline facet motif, swan geometry, dual-glow treatment). Every card will look like every other card and like every other ledger's card. Nothing in §4.5 ties the renderer to Enchanted Apex / Crystalline Swan identity.
3. **No theme enforcement in SVG output.** The plan is silent on colors. A hand-rolled SVG renderer is the easiest place in the codebase to hardcode hex. Without a stated rule that fills/strokes/text resolve to Crystalline token fallbacks (SVG can't read CSS custom properties when served as a standalone file — so you need a **single token-map module** injected at render time), someone will ship `#fff`/`#333` defaults. And if the Galaxy-Swan palette ever gets typed into this renderer, it ships to the vault forever — append-authoritative means bad visuals are *auditable forever*.
4. **Dark-mode/legibility unspecified.** Cards are dark-first brand assets; the plan says nothing about contrast budget inside the SVG, minimum text sizes (SVG text at tiny viewBox scales is a classic legibility failure), or WCAG 4.5:1 between text and card background. An SVG embedded in a Markdown vault doc renders over whatever background the viewer uses — you need an explicit card surface with its own guaranteed contrast.
5. **Noisy-to-dead motion spec.** `motion: { intent, reducedMotion }` is stored as text but nothing says how motion *intent* is visually represented on a static card (motion-callout zone? arrows? state strip?). Result: either ignored (dead) or builder improvises (noise).

---

**(c) IMPLEMENTATION-FIDELITY ATTACKS**

1. **Responsive contract is incomplete vs. house rules.** §3.1 requires 320/414/768/1440 and *optional* 375/1024/2560/3840. House review standard spans all eight. Make 375 and 1024 **required** — 375 is the most common iPhone width; skipping it is indefensible for a mobile-first fitness product. The SVG itself must be fluid-width (`viewBox`, no fixed `width`/`height`) or it will clip/letterbox in vault viewers.
2. **Accessibility strings are unverifiable.** `accessibility: 1–8 substantive strings` — "substantive" is unenforceable. RED tests prove nothing about actual a11y of the output. Require the renderer to emit `<title>` and `<desc>` in the SVG, `role="img"`, and meaningful reading order — and add a RED test asserting their presence. An "accessible SVG pattern card" with no `<title>` is a lie.
3. **`prefers-reduced-motion` is stored, never enforced.** If any future card variant gets SMIL/CSS animation, the plan has no gate. Since this slice is static SVG, state explicitly: **no SMIL, no CSS animation in the renderer** — and test for it (scan output for `<animate`, `@keyframes`).
4. **Escaping is necessary but insufficiently specified.** `escapeXml` plus "no foreignObject/image/script/link" is right, but the plan omits the classic hole: **`style` attributes and `<style>` blocks**, which can smuggle `url()` references past your element blacklist. Deny them.
5. **Touch targets / keyboard / nested-interactive: N/A by luck, not by design.** State it: cards are non-interactive (good — no nested interactive elements inside links in the Markdown index), and the index is text links only, which must still respect 44px rows if ever rendered in a dashboard.
6. **File-size rule is asserted, not budgeted.** `visual-renderer.mjs` doing escape + card render + index render + token map + 8-responsive variants will strain 300 lines fast. Split now: `visual-tokens.mjs`, `visual-card-svg.mjs`, `visual-index.mjs`. Don't wait for the hostile round to force it.

---

**(d) THE ONE HIGHEST-IMPACT CHANGE**

**Define the card's visual system as a first-class contract before any renderer code.** One authored SVG template: Crystalline dark surface (deep near-black with a single violet/cyan facet accent line), fixed zone grid — header (directionName + VIS id), hierarchy ladder rendered as a *sized visual stack* (not a bulleted list — bigger type for level 1, literally showing hierarchy), state strip, responsive mini-frames, signature-moment mark (a crystalline swan facet glyph unique to Swan). Token values injected from one `visual-tokens.mjs` using Crystalline fallbacks, zero hardcoded hex elsewhere, byte-deterministic. This turns the card from "database dump as SVG" into a branded artifact an agent actually *learns from* — and it gives RED tests something real to assert (zone order, contrast pairs, token provenance).

---

**(e) WHAT A DESIGN-SAVVY COMPETITOR OUT-BUILDS HERE**

- **A visual template, not a text renderer.** They'd ship the card as a designed composition; you're shipping a schema with a renderer TBD. Their cards are memorable; yours are legible spreadsheets.
- **Anti-copy enforcement.** §8.10 in the seed (visual lineage + anti-copy diff) got deferred. A competitor proves originality; you merely assert it in `antiCopyNotes` free text.
- **Retrieval as contact sheet.** Deferred (§8.8) — but the whole point of visual memory is *skimmable* recall. A flat `VISUAL-INDEX.md` of links is the generic outcome this project claims to kill. At minimum, the index should embed card thumbnails inline so the vault is browsable visually.
- **Cold-mode benchmark** (seed §8.9) — they measure whether cards actually reduce genericness; you have no measure of the card's design quality at all. `hostileReview: pass|fail` in trials is a checkbox, not a rubric.

**Bottom line:** the governance, licensing hygiene, and TDD discipline are excellent. The *design* of the design-artifact is missing. Send back: require a card visual contract (layout zones, token module, contrast budget, signature mark, fluid viewBox, required 375/1024) as RED 0 before renderer code exists.
