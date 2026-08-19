<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 11. Onboarding funnel

- **Use when:** post-conversion activation — account setup, role-specific first-run (trainer: first template + first client invite; trainee: first workout logged + first coach touch within 7 days).
- **Feel:** guided, generous, momentum-building; one decision per screen.
- **Arc:** compressed act PER STEP: micro-hook (why this step) → action → progress acknowledgment. Whole funnel = Act 3→4 of the parent surface. **Hero:** none — single focused `GlassPanel` per step. **Motion:** M1 (step transitions + progress indicator only).
- **Sections in order (per step):** progress indicator → step promise (one line) → the ONE input/action → skip/back affordances → forward CTA. Funnel order: identity → role fork → the role's activation action → first-win celebration → land on portal Phase 1.
- **Conversion goal:** activation completion — measured by the role-specific first win, not screens viewed.
- **Trust:** say why each datum is needed at ask-time; consent explicit for health-adjacent data (sensitive-by-design rule); skippable everything except essentials.
- **Mobile:** the primary funnel IS mobile; keyboard-type-aware inputs; one thumb; progress persists across abandonment.
- **A11y:** focus moves to step heading on transition; errors inline + announced; no time limits.
- **Components:** `GlassPanel`, `GlowButton`, form patterns from `components.md`, milestone badge on first win.
- **Anti-patterns:** 12-field first screen; asking for data the product won't use this week; forced tour before first win; celebration before anything was actually accomplished.
- **Fable brief:** "Onboarding for [role]. Activation definition: [first win]. Directions: step count + order, what gets deferred to later, the first-win moment design."
- **Builder brief:** "Direction [n]. Steps as a data-driven state machine (no page-per-step copies); resume-on-return; each write hits verified endpoints; consent copy exact."
- **Harness QA:**
  - [ ] full funnel completable on 375px
  - [ ] abandon-and-resume works
  - [ ] back doesn't lose data
  - [ ] first-win state lands on portal correctly
  - [ ] skip paths don't dead-end
- **Village questions:**
  - What's the minimum steps to the role's first win?
  - Which asks can move to post-activation?
  - Where will real users bail?
