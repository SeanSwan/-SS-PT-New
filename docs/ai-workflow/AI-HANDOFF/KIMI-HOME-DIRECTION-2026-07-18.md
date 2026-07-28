# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-HOME-DIRECTION-SEED-2026-07-18.md
**Seed:** (none)
**Tokens:** 1646 in / 9520 out · **Cost:** ~$0.1477 · **Wall:** 330.7s

---

# HOSTILE DESIGN + FRONT-END REVIEW — "HOME upgrade creative direction"

## (a) VERDICT

**SHIP-WITH-CHANGES** — the constraint discipline (token hygiene, banned channel forms, "reduced-motion = designed static frame, never blank," copy-freeze) is genuinely elite, but the brief dodges its three hardest keep/kill calls and omits the acceptance criteria that separate a premium build from a pretty CodePen demo.

---

## (b) Design weaknesses, most-severe first

1. **Weak hierarchy / unclear CTA — the brief preserves a broken hero uncritically.** Eight interactive elements in the first viewport (2 CTAs + 6 capsules) is not a hero, it's a sitemap with a video behind it. "Trainer Staff Review" and "Waiver" are staff-tooling links wearing consumer-hero real estate. You cannot have a "signature resolve that ignites the CTA" while six capsules compete for the same eye. Copy-freeze does NOT mean layout-freeze: keep all six labels verbatim, demote them to a utility rail below the hero fold. The brief should have said this. It didn't. That's the single biggest design failure.

2. **Generic/template feel — the prescribed mechanic is the current trope.** "Scattered light resolves + caustics + iridescent facets" is the 2024–25 AI-startup template. Every Raycast/Linear/Awwwards clone ships it. What makes this SwanStudios and not "AI gradient site #4,000" is binding the facet geometry to the **shipped Crystallize lens** — the hero must be the *first charge* of `--lens-crystallize-charge-ms`/`settle-ms`, i.e. the origin point of a site-wide material system, not a one-off effect. The brief gestures at "consume Crystallize" but never states it as the differentiator. State it or we ship a costume.

3. **Unresolved keep/kill: the typewriter.** Typewriter headlines are the single most generic "AI-built site" tell in existence, an aria-live nightmare, and a direct fight with the resolve mechanic. The brief lists it under "today" and never rules on it. Ruling: **it dies.** The facet resolve IS the headline entrance. One entrance, not two.

4. **Ethos vs. deliverable mismatch: the "signature interactive moment" isn't interactive.** The caliber target demands one moment that "feels alive," then Deliverable 1 specifies a *passive* load/scroll animation. Kinetic ≠ interactive. Mandate: pointer-refractive facet field on `(pointer: fine)` via `useMotionValue` (transform-only, 60fps-trivial), scroll-progress drive on touch. Without this, we fail our own stated bar.

5. **No motion budget → noisy-motion risk.** Twelve sections × "one or two moves each" = up to 24 micro-moves. That's not an experience, that's a slot machine. The brief must designate: hero = THE moment; one secondary (Stats crystalline count-up); all other sections default to `essential` tier rest. Restraint is the premium signal.

6. **Unreadable mobile density — unaddressed.** 375px: headline + 2 CTAs + 6 capsules + canvas + poster. Nothing in the brief covers mobile composition. Mandate: capsules become a 44px-row scroll-snap rail below 768px, canvas at 0.5× backing store on mobile, parallax off on coarse pointers.

7. **Contrast floor missing.** Animated light caustics behind the headline is a guaranteed 4.5:1 failure *at some frame*. Require a resolve end-state scrim (`--lens-elev-1` at ~65% behind text block), verified at worst-frame, not average-frame.

8. **Elevation language unspecified → cheap shadows sneak in.** The brief never says "shadows come from `--lens-elev-1..3` + `--lens-fx-glow-primary` only, ad-hoc `box-shadow` is banned." Without that line, the builder hand-rolls shadows and we're back to flat/cheap surfaces.

---

## (c) Implementation-fidelity attacks

- **styled-components: total silence.** "Builder freedom" + no restatement of the house rule = someone writes `hero.css` or inline style objects. Restate it. Dynamic motion values go through CSS vars on styled components, not class toggling.
- **Fonts vs "zero new deps" is unresolved.** Variable/novel display type requires font *files* — assets, not npm deps, but the brief must say so explicitly: self-hosted woff2 in `/public/fonts`, one `@font-face` block in the ONE tokens file feeding `--world-title-font`, `font-display: swap`, `size-adjust`-corrected fallback, preload the display weight. Otherwise: FOIT, CLS, or a builder who "plays safe" with system fonts and fails the caliber target.
- **LCP strategy for the default hero: missing.** A JS-hydrated canvas as first paint is an LCP trap. The SSR'd static prismatic frame (SVG facets + CSS gradient) must BE the LCP element AND the reduced-motion frame — one artifact, three jobs. Video layer: `preload="none"`, gated on `Save-Data`/`effectiveType`, fades in as pure enhancement, never blocking.
- **Canvas rules need teeth.** "Hand-rolled caustics pass" with builder freedom = someone writes a per-pixel `getImageData` sim that melts mid-Android. Forbid per-pixel ops explicitly: pre-rendered radial/conic gradient sprites, `globalCompositeOperation: 'screen'`, integer-scaled drift via translate. Add `document.visibilitychange` pause (brief only has IntersectionObserver). Cap backing store (~2560×1440 max) and let **vector SVG facets carry 4K crispness for free** at 2560/3840 — canvas blurs, vectors don't.
- **Scroll:** mandate `useScroll` + `useSpring` (rAF-driven, passive) — "no scroll listeners on the hot path" needs the named mechanism or someone adds one.
- **44px:** never mentioned. Capsules and both CTAs, ≥44×44, including at 320/414.
- **Focus/keyboard:** focus-visible ring = `--lens-fx-glow-primary`, 2px + offset, no naked `outline: none`. Canvas `aria-hidden="true"`; headline stays real selectable text; honeypot `website` field gets `aria-hidden` + `tabindex="-1"`, not just visual hiding. Do NOT fork `CrystallizeOverlay` or duplicate its `announcement` live region — the brief states this correctly; enforce it.
- **DOM/nesting:** canvas layer `pointer-events: none` so it never swallows CTA clicks; capsule rail must not become `<a>`-in-`<a>`; Trainers cards must not be link-wrapped cards containing buttons.
- **300-line cap:** this hero will balloon. Mandate the split now: `HeroSection.tsx`, `OpticsCanvas.tsx` (loop only), `useCausticField.ts` (pure painter), `Facets.svg.tsx` (geometry data), `hero.tokens.ts`.
- **Dual-Button Glow: secondary unspecified.** Primary = blue bg→purple glow ✓. "Find a Trainer" is just "accent" — specify its glow pairing per the dual rule or make it ghost/outline with glow-on-hover only. An unpaired accent button breaks the rhythm.
- **Stats:** if any sparkline/chart appears during "elevation," it's Victory or nothing. One line closes the loophole.

---

## (d) The ONE highest-impact change

**Make the resolve terminate in the brand system and ignite exactly one element.** The crystallize charge sequence IS the hero: scattered facets → charge per `--lens-crystallize-charge-ms` → settle into the Crystalline lattice behind "Health First. Community Always." → the final refracted streak travels down and *lights* "Join the Community" (blue→purple glow fires once, not looping). Everything else on screen stays dark and quiet. This one move simultaneously kills the typewriter, fixes hierarchy (one ignited element, capsules visibly secondary), makes the hero un-clonable (it's our shipped lens language, not borrowed particles), and delivers the "alive" moment. Corollary it forces: capsules demoted to a rail. That's the premium version. Everything else is decoration.

---

## (e) What a design-savvy competitor out-builds here

They ship the same prism hero — it's a trope — but with WebGL refraction (no zero-dep constraint), a pointer-reactive generative facet field, and **a system**: every section transition a crystallize beat, so the whole site reads as one material. Our only durable moat is that we already own Crystallize site-wide — if our hero is a disconnected one-off instead of the system's origin, they out-build us in a weekend with a shader. They'd also trivially out-detail us where this brief is silent: 4K-crisp vector facets, a designed static frame, real optical-size typography, and a homepage that doesn't put "Trainer Staff Review" in the hero. One free move they're NOT making that we could: session/time-of-day re-skin via the single `--home-*` tokens file — zero deps, near-zero cost, feels genuinely alive. Add it.
