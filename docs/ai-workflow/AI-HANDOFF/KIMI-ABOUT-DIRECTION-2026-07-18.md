# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-ABOUT-DIRECTION-SEED-2026-07-18.md
**Seed:** (none)
**Tokens:** 1515 in / 10446 out · **Cost:** ~$0.1612 · **Wall:** 314.3s

---

# K3 DESIGN REVIEW — About V-next Creative Direction

## (a) VERDICT
**SHIP-WITH-CHANGES** — governance is Home-grade, but the signature hero violates the brand thesis it's sworn to, and the brief silently drops half the binding rules it exists to enforce.

**Credit where due (then we attack):** the freeze + contract-test discipline, the kill-switch ordering (runtime → env → false, absolute over QA override), consuming the *shipped* Crystallize instead of rebuilding, the reduced-motion lesson carried from Home ("framer entrance disabled, not just CSS"), and banning Galaxy channel forms. This is a competent brief. That's exactly why its failures are dangerous — Opus will trust it.

---

## (b) Design weaknesses — most severe first

1. **The signature moment contradicts the thesis.** "Optics, not creatures" — then the #1 ask is a **swan silhouette**. A drawn swan with caustics behind it is a *picture of a swan with a light effect*: the most generic agency-hero move there is. Home's hero worked because the form WAS the optics. This is a logo reveal wearing a lab coat.

2. **The hero is about the wrong subject.** This is an About page for a *person*, and the brief never once addresses Sean visually — no portrait, no treatment, no human anchor. As specced, this ships a crypto-protocol landing page with a trainer's résumé attached. People hire trainers they can see.

3. **"Stats as crystalline count-up?" is a template tell** — the exact move in every $49 Tailwind kit. Worse, "26+ years" is contract-tested: a naive counter animates 0→26 and mangles the "+", and reduced-motion needs the final string in the DOM. The brief green-lights it with a question mark and zero guardrails.

4. **The restraint rule is stated, then broken.** "Hero = THE moment + ONE secondary" — followed by brainstormed upgrades for Timeline, Stats, *and* Philosophy, with the ONE secondary never chosen. Home worked because someone *decided*. This punts the deciding to Opus. Expect three half-polished moments instead of one.

5. **Seven Philosophy cards, zero layout direction.** Seven is prime: 3-col leaves a hole, 2-col leaves an orphan. "Facets?" is not an answer. And abstract concepts ("Fair Always", "Your Data Your Story") with unspecified iconography is exactly where a cheap stock-icon row sneaks in and murders the premium feel.

6. **No type system.** A text-dense story page whose entire typographic direction is "keep brand-appropriate" guarantees uniform card type = template feel. The credential line needs a deliberate treatment (spaced capitals, label register); the name needs display scale. Unspecified.

7. **Contrast trap, unaddressed.** Bright animated caustics behind hero text with no scrim / elev-surface discipline = guaranteed 4.5:1 failures at peak caustic luminance. The binding contrast rule appears nowhere in the brief.

8. **The cyan trap.** Caustics' default aesthetic is cyan-white light on deep blue — one tired engineer away from *visually* shipping the banned Galaxy trio regardless of token hygiene. The doc bans channel forms but gives no positive guardrail for the light itself (should be: accent→white ramp, never full-sat cyan).

9. **CTA section abandoned.** The page's actual job — booking Sean — gets no elevation note and no restatement of Dual-Button Glow. It ends on whatever the default section happens to look like.

---

## (c) Implementation-fidelity attacks

- **The brief forgets the boring half of the binding rules.** It lovingly restates the fun constraints (zero deps, DPR≤2, IO, kill switch) and never mentions: styled-components only, Victory only, Dual-Button Glow, 44px targets, 4.5:1, ≤300-line cap. Violations happen in the gaps, and this brief leaves six of them.
- **"Prefer ZERO hex" conflicts with the binding `var(--token,#fallback)` rule.** Resolve explicitly or Opus fails review one of two ways: hex lives in exactly ONE tokens file; every component reads `var(--about-*, var(--lens-slot, #crystalline-fallback))`. "Zero hex" as written invites stripped fallbacks.
- **The contract test is asserted, never specified.** Path? Pattern? It must catch "NASM-certified", "NASM certified", en/em/Unicode hyphens, case variants, and JSX-split strings (`"NASM-" + "certified"`). Consequence: **forbid per-letter/per-word reveal splitting of the credential line** — which is also an a11y requirement (screen readers read split text letter-by-letter without aria-labeling). The "how does the credential line reveal" ask is a compliance minefield: transform/opacity on whole containers only.
- **CPU caustics at DPR≤2 full-bleed will not hold 60fps on mid-Android.** The budget is recited but the technique isn't: render the field at 0.25–0.5 res to an offscreen canvas, `drawImage` upscale (smoothing = free blur), cap the buffer (~≤1600px wide) regardless of 2560/3840 viewport, sin LUT, zero per-pixel allocations. `useAnimationTier` is named but **never mapped** — the brief needs a tier→(resolution, octaves, fps) table, plus rAF halt on `visibilitychange` (IO alone isn't enough).
- **LCP silence.** The hero is the LCP candidate; a canvas that starts black and choreographs an entrance delays paint. Spec a static first frame (settled mark painted pre-hydration, canvas fades in over it).
- **Reduced-motion is covered for the hero only.** Count-ups, timeline scrub, facet entrances need the same "disabled in JS, not just CSS" treatment, final values in DOM.
- **Responsive: nothing.** 320/375/414 hero mark scale + credential-line wrap; the 7-card grid at 768/1024; timeline axis (horizontal scrub is a mobile disaster — vertical ray); the 100vh mobile-chrome trap (use `svh`); 4K canvas cap. All unaddressed.
- **300-line cap vs hero scope.** SVG geometry + caustic engine + choreography + token mapping in one file = instant breach. Mandate the split: tokens file / `SwanMark.svg.tsx` / `useCaustics` engine hook / `CausticCanvas` presentational / `HeroSection` orchestrator. Say it or the first PR bounces.
- **Interaction a11y unstated.** If the timeline ray is interactive: 44px nodes, arrow-key support, token-driven visible focus ring. If it's not interactive, *say it's not*.
- **DOM integrity:** name/title/credential reveals routinely produce split `<h1>`s and block-in-inline junk. One clean h1, aria intact.

---

## (d) The ONE highest-impact change

**Kill the drawn swan. The swan is what the light bends around.**

Never draw the mark. Render the caustic field on the low-res canvas, then multiply it by a swan-shaped **occluder stencil** (one SVG path → ImageData mask). The swan appears as a calm, dark, glass-edged *absence*, rimmed by brighter caustic filaments that bunch along its contour — total-internal-reflection rim light. The Crystallize charge = field-intensity ramp with facet seams converging from the screen edges toward the occluder; settle = amplitude decaying to near-still "moonlit water," and in that exact beat Sean's name / title / credential line fade-rise inside the clear zone the occluder protects. Reduced-motion = render one frame of the same pipeline at t=settle and stop — free, because the static frame *is* the engine.

This one change: resolves the thesis violation (pure optics — the swan exists only as bent light), kills the cyan trap (dark glass + accent rim, no neon fill), makes reduced-motion trivial, keeps CPU cheap (one stencil multiply on a quarter-res buffer), and is genuinely ownable — any competitor can draw a swan; no template ships a swan made of absence. Then declare the ONE secondary explicitly: **the Timeline light ray**. Everything else rests at essential tier — including Stats, final values in DOM, no count-up.

---

## (e) What a design-savvy competitor out-builds here

- **The human anchor.** They put Sean's portrait in a facet-masked, caustic-rimmed frame mid-page, and their About page *converts*. Ours is a Dribbble shot; theirs is a business.
- **The 7-card problem.** Featured 1 + 6 asymmetric editorial grid with hand-cut facet glyphs — versus our 3+3+1 orphan grid with whatever stock icons wander in.
- **Stats fused into the Timeline ray** — milestones carry the numbers *on the ray*, one narrative spine instead of two generic sections.
- **Type.** They spec a display cut with real scale and a spaced-caps credential label; "keep brand-appropriate" buys us same-size card type at every breakpoint.
- **Paint discipline.** Static first frame on screen <1s, caustics hydrate behind it; ours choreographs an entrance while LCP rots.
- **Mobile composition.** Vertical ray, sticky mini-mark, `svh` hero — none of which this brief mentions.

**Bottom line:** fix the swan (absence, not silhouette), pick the secondary (the ray), and restate the six boring binding rules — then let Opus build it.
