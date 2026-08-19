<!-- GENERATED from website-archetypes.md @ 4fb0805d87dd — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 12. E-commerce / product page

- **Use when:** the storefront package detail / any buyable object page. Composes with #10 (pricing truth) and #3 (luxury treatment for flagship SKUs).
- **Feel:** product-as-protagonist on a lit stage; everything else supporting cast.
- **Arc:** Mkt 4-act compressed to one screen + supporting scroll. **Hero:** product stage — C1 loop or C5-style object presentation with C7 tilt on the product card. **Motion:** M2.
- **Sections in order:** stage (media + name + price + primary `GlowButton` add-to-cart, all above fold) → Act 2: what's-included truth + C6 flip for details/terms → Act 3: social/usage proof (real outcomes) + related items C5 rail → Act 4: sticky add-to-cart reprise + guarantee.
- **Conversion goal:** add-to-cart → checkout. **Trust:** total price honesty (sessions × rate math shown), included-vs-not clarity, refund/transfer terms.
- **Mobile:** sticky add-to-cart bar; gallery swipes; price never scrolls out of view.
- **A11y:** price + variant changes announced; gallery keyboard-navigable; 44px quantity/variant controls.
- **Components:** `SheenCard` full sell treatment on the stage, `GlowButton`, `GlassPanel`, cart interactions verified against the live cart API (the historical `/api/cart/add` 404 makes this archetype's QA non-optional).
- **Anti-patterns:** carousel-of-everything heroes; shipping/terms surprises at checkout; fake "3 people are viewing this"; related-items rail longer than the product story.
- **Fable brief:** "Product page for [SKU, price]. The desire angle: [X]. Directions: stage treatment, included-truth presentation, Act-3 proof choice."
- **Builder brief:** "Direction [n]. Product data from storefront model (schema-drift check, rule 58); add-to-cart round-trip verified in-session; sticky bar coexists with mobile nav."
- **Harness QA:**
  - [ ] add-to-cart 200-path verified + error state visible on failure
  - [ ] price math matches backend
  - [ ] sticky bar at 375px doesn't cover content
  - [ ] gallery poster fallbacks
- **Village questions:**
  - Is the full cost honest at first glance?
  - Does Act 2 answer the real pre-purchase objections?
  - Cart failure mode graceful?
