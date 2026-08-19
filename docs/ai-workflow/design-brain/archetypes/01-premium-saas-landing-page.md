<!-- GENERATED from website-archetypes.md @ 4fb0805d87dd — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 1. Premium SaaS landing page

- **Use when:** selling the SwanStudios platform (or any SaaS) to cold traffic; the page must earn trust and a signup in one scroll.
- **Feel:** dark-room-lit-by-glowing-objects; confident, product-forward, zero clip-art.
- **Arc:** Mkt 4-act. **Hero:** C1 video hero (product-in-motion footage, not stock office). **Motion:** M2.
- **Sections in order:** C1 hero (product truth + CTA pair) → C10 divider → Act 2: C3 sticky feature walk (3–5 features) + C6 flip cards for proof detail → C10 → Act 3: C9 media-anchored impact numbers + C2 parallax story beat → C10 → Act 4: embedded #10 pricing module + final GlowButton CTA + short FAQ.
- **Conversion goal:** trial/demo signup. **Trust:** real product screenshots/loops, named client outcomes (IDs/consented), security posture line, "26+ years training experience" where the founder story appears — never "NASM-certified" (say "NASM workshop-trained" / "NASM-protocol").
- **Mobile:** hero video → poster (lean tier); C3 collapses to stacked panels; CTA pair stacks full-width at 44px+.
- **A11y:** text over video needs the vignette layer to hold 4.5:1; focus order follows the arc; skip-to-pricing link.
- **Components:** `GlowButton` (Dual-Button Glow), `GlassPanel` (C12 base), `SheenCard` for feature/sell cards, `NarrativeDivider`, `ChartEnvironment` if a proof chart appears.
- **Anti-patterns:** centered-hero-two-buttons-blob; equal 4-up feature grid; testimonial-carousel-with-avatars template; pricing hidden behind a "contact us" wall.
- **Fable brief:** "SaaS landing for [product]. Audience: [who]. One-sentence promise: [X]. Give 2–3 concept directions: name each act's emotional beat, hero treatment, signature moment, and the Act-2 proof strategy. Palette stays Crystalline Swan."
- **Builder brief:** "Implement direction [n]. B2.1 arc written in-thread first. styled-components only, tokens from design.md, C1 hero with tier-2 poster + tier-3 static in the same file, pricing module reuses #10. Rule 26 receipt before touching any mounted route."
- **Harness QA:**
  - [ ] hero paints < 2.5s with poster-first
  - [ ] CTA visible without scroll at 375px
  - [ ] reduced-motion kills video + parallax
  - [ ] all CTAs ≥44px
  - [ ] Act-4 CTA reachable without scroll-back
- **Village questions:**
  - Does Act 2 prove capability with product truth or with adjectives?
  - Would a competitor's logo swap survive here (if yes, it's generic)?
  - Is the signup path ≤2 clicks from hero?
