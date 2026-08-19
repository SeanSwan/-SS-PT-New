<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 10. Pricing page

- **Use when:** standalone /pricing or the Act-4 module inside #1/#4/#16. Composition note: build once, mount both places.
- **Feel:** calm clarity at the moment of money; luxury without pressure.
- **Arc:** Mkt Act-4 module (standalone version gets a compressed 4-act: brief value re-hook → tiers → proof → FAQ/CTA). **Hero:** C5 tier shelf — plans as objects, recommended tier physically forward. **Motion:** M1.
- **Sections in order:** one-line value re-anchor → C5 tier shelf (3–5 tiers; recommended visually elevated, not just badged) → per-tier `SheenCard` with price, cadence, what's-included truth → comparison expander (not a wall) → guarantee/terms plainly → FAQ → final CTA.
- **Conversion goal:** plan selected. **Trust:** real prices visible (SwanStudios: $175/session, packages at true totals — no fake strikethroughs), Guardian donation semantics stated honestly, cancellation terms upfront.
- **Mobile:** shelf → vertical stack with recommended tier FIRST; sticky selected-tier CTA.
- **A11y:** price differences readable by screen reader (full sentences, not grid-position implication); toggle (monthly/annual) keyboard-operable.
- **Components:** `SheenCard` (sell treatment allowed), `GlowButton` per tier obeying Dual-Button Glow, `GlassPanel` luxury variant on the flagship tier only, `FrostedPaywall` semantics for locked-feature previews.
- **Anti-patterns:** fake anchor pricing; 40-row comparison tables above the fold; "most popular" on the most expensive tier without data; hiding the free tier; countdown timers.
- **Fable brief:** "Pricing for [tiers + real prices]. Business intent: [which tier should win]. Directions: shelf composition, recommended-tier elevation, how the donation/Guardian mechanic reads honestly."
- **Builder brief:** "Direction [n]. Tier data from a single source array (matches backend storefront truth — verify against seeded packages, rule 58); checkout CTA path verified end-to-end incl. `/api/cart/add`."
- **Harness QA:**
  - [ ] every tier CTA reaches checkout
  - [ ] prices match backend seed data
  - [ ] mobile stack order correct
  - [ ] toggle states persist
  - [ ] no dead "contact sales" links
- **Village questions:**
  - Is the recommended tier the right business call?
  - Does anything here erode trust for a $2,800/month client?
  - Price-to-value story airtight?
