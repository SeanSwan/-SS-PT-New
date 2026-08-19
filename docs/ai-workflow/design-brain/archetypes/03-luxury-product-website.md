<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 3. Luxury product website

- **Use when:** a high-ticket object/offer (flagship package, premium tier, physical product) needs desire, not feature lists.
- **Feel:** deep-ocean vault; gold on sapphire; slow, deliberate, expensive.
- **Arc:** Mkt 4-act. **Hero:** C1 with macro product footage + Gilded Fern rim light; C5 shelf later for the lineup. **Motion:** M2, may earn M3 for one Act-1 moment.
- **Sections in order:** C1 macro hero → C10 crystalline divider → Act 2: C3 material/detail walk + C6 flip (front: beauty, back: specification) → Act 3: C5 editions shelf (the lineup as objects) + provenance/story C2 beat → Act 4: single luxury-variant `GlassPanel` offer card + inquiry CTA.
- **Conversion goal:** purchase or white-glove inquiry. **Trust:** materials/method specifics, guarantee terms, scarcity stated honestly (never fake counters).
- **Mobile:** shelf → swipeable single-card rail; macro footage → high-res poster; generous spacing preserved (luxury dies when cramped).
- **A11y:** Gilded Fern on dark passes contrast only at sufficient size — verify 4.5:1; hover-revealed detail must have tap equivalent.
- **Components:** `SheenCard` (full sell treatment allowed — this is a showcase surface), `GlassPanel` luxury variant (gold border), `GlowButton`, `NarrativeDivider` crystalline.
- **Anti-patterns:** discount-brand urgency banners; dense spec tables in Act 1; stock lifestyle photography; more than one gold-bordered surface per viewport (gold inflation cheapens).
- **Fable brief:** "Luxury page for [offer, price point]. Desire driver: [craft/scarcity/status/transformation]. 2–3 directions: hero macro subject, shelf treatment, the one luxury signature moment, gold-usage discipline."
- **Builder brief:** "Direction [n]. C12 luxury variant only where specified; SheenCard full treatment on sell cards only; reduced-motion keeps the vignette + composition. Seedance brief for macro hero via storyboarding doc."
- **Harness QA:**
  - [ ] gold-on-dark contrast measured
  - [ ] shelf swipe works by touch at 375px
  - [ ] no hover-only reveals
  - [ ] poster fallback present
  - [ ] single CTA focus in Act 4
- **Village questions:**
  - Does this feel expensive at 320px?
  - Is scarcity/pricing claim verifiable?
  - Where does desire peak, and is the CTA there?
