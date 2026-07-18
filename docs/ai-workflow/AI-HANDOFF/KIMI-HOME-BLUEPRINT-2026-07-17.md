# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** .ai-workflow/fusion/kimi-home.md
**Seed:** (none)
**Tokens:** 1439 in / 12271 out · **Cost:** ~$0.1884 · **Wall:** 387.4s

---

# KIMI K3 — HOSTILE DESIGN + FRONT-END REVIEW
**Document: SwanStudios HOMEPAGE — build-exact refactor blueprint**

---

## (a) VERDICT

**SEND-BACK** — a disciplined *process* brief masquerading as a build-exact blueprint: it demands "ZERO decisions left to the builder" while making zero design decisions itself — typography, rhythm, CTA hierarchy, the signature moment, and the performance budget are all delegated, and its one hard ban (Galaxy palette) ships without the replacement values that would make it enforceable.

Credit where earned before I take it apart: additive-only/revert-by-flag discipline, the "banned *including as var() fallbacks*" instinct, the thin-orchestrator preservation, and the no-mocks law are all correct. The skeleton is professional. The design is absent.

---

## (b) Design weaknesses — most severe first

**1. The signature moment is delegated, not designed (missing signature moment — fatal).** "The ONE impossible phenomenon (optics)" and "the Crystallize" appear as aspirations with zero mechanics: no trigger offset, no render tech (canvas caustics? SVG facets? shader?), no facet/particle budget, no designed reduced-motion state. The single thing that makes this page SwanStudios instead of *dark SaaS template #4,000* is left to builder imagination. Delegated signatures ship as generic particle fields with a lens flare. This alone justifies SEND-BACK.

**2. No conversion hierarchy — the CTA is unnamed (weak hierarchy / unclear CTA).** The doc routes to "store/booking" but never picks a primary, never writes a label, never places it per breakpoint, and — unforgivably — never invokes the **Dual-Button Glow** law that governs exactly this two-button state. Two equal-weight destinations with no glow spec = split attention + off-brand buttons, the two most expensive homepage mistakes. Same hole for copy: "trust/credentials" is demanded with zero lexicon guardrails (26+ years / NASM-protocol phrasing, banned terms) — the doc requires "exact copy" as output and supplies none as input.

**3. Typography doesn't exist (guaranteed template feel).** No display face, no fluid scale, no tracking rules. "Enchanted Apex" is a *type-driven* voice. Without pinned values — display at `clamp(44px, 8vw, 96px)`, tracking −0.02em, line-height 1.05 — the builder grabs 32px bold system-ui and the luxury claim dies on first paint.

**4. "Full cinematic" permission with zero performance budget (noisy motion + mobile death).** No LCP/INP/CLS targets, no fps floor, no byte budget, no device-tier degradation ladder, no explicit ban on scroll-*hijacking* (scroll-linked ≠ scroll-jacked — the doc doesn't distinguish). Cinematic-without-budget is how you ship 8s LCP at 15fps on a mid-tier Android. Unaddressed landmines: a hero *video loop at 3840px*, and iOS Low Power Mode killing autoplay → blank first viewport.

**5. The Galaxy ban is unenforceable as written.** Right clause, no teeth: it bans `#0a0a1a / #00FFFF / #7851A9` but never publishes the Crystalline fallback sheet. A ban with no replacement is unenforceable — and it's evaded through the side door: `rgba(0,255,255,0.35)` in a glow shadow is Galaxy cyan no hex-grep catches. The blueprint must ship values (e.g., `--world-abyss, #060B18` / `--world-sapphire, #0B1530` / `--lens-cyan, #6FE3F7` / `--lens-violet, #9D6BFF` / `--lens-gold, #E8C15A`) **and** ban channel literals. Bonus irony: the banned hex values are printed inside the document itself — any CI lint grepping for them flags the spec.

**6. Spacing, elevation, and border systems ungoverned (inconsistent rhythm / flat surfaces / cheap borders — pre-authorized).** No spacing scale, no per-breakpoint section rhythm, no container max-widths (full-bleed prose at 3840 = 90ch unreadable measure), no shadow/elevation tokens, no border treatment. Crystalline depth is a *spec*: 1px gradient borders, inner top-glow, layered glass strata. Without it the builder ships flat obsidian cards with a hairline — the exact cheap dark template this brand exists to kill.

**7. Contrast stated as a vibe, not as pairs (weak dark-mode contrast on the mandated accents).** Ice-cyan on midnight passes easily. The killers are:

| Pair | Risk | Required rule |
|---|---|---|
| Wing-purple body text on obsidian | Often < 4.5:1 at 16px | Violet for display ≥ 24px only, or lighten tint |
| Gold eyebrow/label 13–14px on sapphire | ~3:1 | Gold ≥ 16px or 700 weight, measured pair |
| Glow halo behind text | Eats edge contrast | No glow behind text < 18px |

"WCAG AA" as a noun stops nothing. Enumerate approved pairs with measured ratios.

**8. Mobile is a checkbox, not a design (unreadable density risk).** "Mobile + desktop" — that's the entire mobile strategy. No nav pattern, no thumb-zone CTA rule, no density budget (how many scroll-story beats survive at 375px?), no statement on which cinematic layers disable below 768px. Scroll-stories die on mobile by *density*, not width.

**9. Accessibility named, not engineered.** Reduced-motion is "honored" with no fallback *design* (what IS the Crystallize with no motion? Undesigned = amputated). Canvas optics need `aria-hidden` + text equivalents; pinned sections need heading order + focus management; any persisted Swan video needs captions/transcript (WCAG 1.2); and glow ≠ focus indicator — spec a 2px ring at 3:1 adjacency contrast.

**10. Flag combinatorics + version sprawl.** V5 flag × license flag × Seedance-later slot = an undefined 4–6 state matrix with no legality map. Worse, the licensing flag *normalizes shipping an unlicensed asset to prod* behind a flip. And `HomePage.V4` strongly implies V1–V3 still in-tree: reversibility is right, hoarding dead versions is bundle weight and confusion.

---

## (c) Implementation-fidelity attacks

- **The token rule is self-contradictory at the margin.** "Tokens-with-fallback (NO raw hex)" — fallbacks *are* raw hex. The law needs its precise form: hex permitted **only** inside `var(--token, #fallback)` position, never standalone, never as rgba channel literals. Unclarified, builders hardcode and call it a fallback.
- **styled-components discipline unspecified.** No mandate for transient props (`$glow`, `$variant`) — without them props leak to DOM nodes → invalid attributes + React warnings. No statement of *where* tokens live: they must be `:root` custom properties re-skinned by Appearance Studio via a `data-theme` attribute swap — a ThemeProvider re-render breaks the "re-skins cleanly" promise. No ban on inline `style=` escape hatches. Keyframes must be defined once and imported — scroll-story pages duplicate `@keyframes` per section and bloat the bundle.
- **300-line cap vs. reality.** One blueprint covering hero + narrative arc + phenomenon + offer + trust across 8 breakpoints will not fit "sections + thin orchestrator" inside the cap without a mandated file layout: `Section.tsx` ≤150 / `Section.styles.ts` ≤200 / `Section.motion.ts` / `Section.hooks.ts`. "Extract" with no map = builder improvises architecture = violates the doc's own zero-decisions law.
- **Responsive extremes ungoverned.** 320px needs stacked 44px CTAs, 12px gaps, display clamped ≈40px. 2560/3840 need ≈1520px max text measure with full-bleed visuals, and canvas capped at `min(devicePixelRatio, 2)` with resolution-scaling — a naive prism render at 4K melts the GPU.
- **44px targets fail where they always fail.** Not buttons — carousel dots, footer link columns, social icons, modal close buttons, inline links in the credentials strip. Extend the hit-area rule explicitly or the audit dies in the footer.
- **Nested interactives invited by this exact layout.** CTA layered over a clickable video surface; whole-card testimonials containing links. Ban both: video is `pointer-events: none`; a card is one `<a>` *or* contains one link — never both.
- **Reduced-motion mechanics absent.** Must gate: parallax transforms, any smooth-scroll hijack, video autoplay (→ poster), the Crystallize (→ designed static state). And the doc never actually says *transform/opacity only* — without that sentence, someone animates `top`/`width` and janks the whole scroll story.
- **Charts end-run.** Homepage stats should be CSS counters, not charts. If any visualization sneaks in: Victory-only — explicitly ban hand-rolled SVG sparklines as a dodge.

---

## (d) THE ONE highest-impact change

**Design the Crystallize as the conversion hinge — specced to parameters — and make it the default hero.** The video becomes the flagged enhancement, never the foundation.

- **Hero:** code-driven prism field — 7 refracting facets (SVG polygons + CSS gradients, one canvas pass max) on `var(--world-abyss, #060B18)`, ice-cyan caustic strokes `var(--lens-cyan, #6FE3F7)`, wing-purple inner glow `var(--lens-violet, #9D6BFF)`; headline `clamp(44px, 8vw, 96px)`, −0.02em.
- **The impossible phenomenon — scattered light resolves:** scrolling 0→60vh translates/rotates the 7 facets (transform-only) from entropy into alignment; at alignment, a 240ms pulse at `cubic-bezier(0.16, 1, 0.3, 1)` fires a refraction flare across the headline, and the primary CTA ignites Dual-Button Glow (booking primary — blue bg → purple glow; store as ghost secondary).
- **Budget:** 60fps floor on 2019 mid-Android; ≤300 particles/facets; DPR ≤ 2; IntersectionObserver-driven, zero scroll listeners on the hot path.
- **Reduced-motion:** facets render pre-aligned as an *art-directed* static prismatic composition; flare is a static gradient.

One designed system kills the three biggest weaknesses simultaneously: it's the royalty-free hero (zero video by default), the signature moment (light resolving = the Swan thesis, optics-not-creatures), and the conversion fix (the flare *points* at the CTA — attention engineering, not decoration).

---

## (e) What a design-savvy competitor out-builds here

- **Perf as a feature.** They ship cinematic *and* LCP ≤ 2.0s / INP ≤ 200ms on 4G because they budget — and they put Lighthouse budgets in CI, while this doc's acceptance tests are manual checklists.
- **Designed reduced-motion.** Their static states are art-directed; per this doc, ours would be amputated defaults.
- **The re-skin flex.** This doc treats `--world-*/--lens-*` tokenization as plumbing. A competitor weaponizes it: an Appearance Studio switch *on the marketing page* — "watch the world re-skin live" — as a demo moment.
- **SEO/OG craft.** Zero meta/OG/JSON-LD requirements in a document about the site's #1 public surface. Competitor ships LocalBusiness JSON-LD, a crystalline OG-image generator, semantic h1→h2 order through the scroll story.
- **Empty-state taste.** Real-data testimonials with no designed zero/loading/error state = a hole in the narrative the first time the API returns `[]` or 500s. Competitor designs the zero state as a brand moment — role + result cards, human within zero-PII.
- **Ultra-wide art direction + micro-interactions.** Composed 2560/3840 layouts vs. unstated "stretch it"; magnetic CTA on `pointer: fine`, 120ms press-scale 0.98, one easing language across the page — the last 5% that reads as *expensive*.
- **Legal hygiene as brand hygiene.** No competitor with counsel lets the hero hinge on an unlicensed asset behind a flag. Delete it from the default path: Seedance slot or nothing.

**Bottom line:** send it back with one instruction — come back with a palette sheet, a type scale, a perf budget, a named primary CTA, and the Crystallize specced in numbers. Until then this is a permission slip, not a blueprint.
