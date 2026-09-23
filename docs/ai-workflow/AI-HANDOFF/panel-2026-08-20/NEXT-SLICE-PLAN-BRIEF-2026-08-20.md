# PANEL BRIEF — What is the right NEXT SLICE for the SwanStudios front page?

**You are a hostile reviewer.** Attack this plan. Rank findings by severity. Be specific about
what is wrong, missing, or mis-ordered. You are reviewing a PLAN, not pixels — the board itself
was render-verified (facts below).

## Where the program stands (2026-08-20, all verified)

1. Fifteen prior front-page designs were rejected by the owner. Root cause was mechanism, not
   taste: tier-C references only, no custom creative, no rendering before presenting. A render
   gate (rule 76) now exists and is enforced: real-Chromium render + measured ink/overflow/
   tap-targets + the agent must view the PNGs before presenting.
2. A Mobbin 55-site sweep + owner grill locked 8 style decisions: cinematic scroll-journey hero
   on the REAL Swans.mp4 footage (owner directive: original footage now, generated 15s worlds
   later); dark-chrome/warm-footage hybrid; community-first ordering + trainer fast-lane strip;
   map+groups+events community pattern; liquid-chrome display type; before/after result chips;
   live CTA pair ("Join the Community" / "Find a Trainer"); serif stats vault.
3. Copy is solved: 40 verbatim blocks; fee numbers stripped (P0 fix), ownership claim softened,
   credentials moved off headline copy. 107/107 fidelity-checked.
4. ONE board now exists — "The Surface and the Depth" — built under the gate: 0% dead space,
   0 horizontal overflow at 414px, 0 tiny text, 0 broken images at 1440+414; viewed twice by the
   building agent; 15 defects caught and fixed pre-owner. **The owner has NOT yet approved the
   direction — verdict pending.**
5. A parallel agent (mediasync) owns the MiniMax H3 video pipeline; it owes a 60fps interpolated
   master + frame sequence for scroll-scrubbing. Its two 15s generated worlds are parked until
   the owner returns to video work.
6. The live production homepage is HomePage.V4 (13 sections, React + styled-components), deployed
   on Render from main. The board lives in scripts/design-brain (design artifact, not product).

## The PROPOSED plan (attack this)

- **Slice A (proposed next): Scroll-scrub hero MVP in React.** New hero component behind a
  feature flag on a V5 route: Swans.mp4 scroll-driven (technique open: canvas frame-scrub from
  extracted frames vs `video.currentTime` scrubbing), liquid-chrome headline, CTA pair,
  waterline fast-lane strip. Non-hero sections keep V4 initially. `prefers-reduced-motion`
  fallback = static hero + normal scroll.
- **Slice B: Port the board's sections** into styled-components incrementally (community aurora
  world, event cards, proof chips, stats vault, golf plate), each slice render-gated.
- **Slice C: 60fps master + frame pipeline** from the mediasync agent lands; upgrade hero scrub.
- **Slice D: Data truth** — events/groups are SAMPLE-tagged mocks today; wire to real APIs when
  community events exist, or keep the surface honest about being illustrative.
- Standing gates per slice: rule 76 render+look, responsive matrix 320→3840, reduced-motion,
  tsc/vitest/build, batch-push cadence.

## Questions the panel must answer

1. Is Slice A the right next move **given the owner has not yet approved the board direction**?
   Or must approval come first / in parallel? What is the cheapest de-risk?
2. Scrub technique: extracted-frames-on-canvas vs video currentTime scrubbing — which do you
   back for a 15s 1280×704 (later 60fps) film on mobile Safari/Chrome, and why? What perf
   budget and kill-switch would you demand?
3. What is mis-ordered or missing in Slices A–D? (Think: SEO/LCP on a video-first hero,
   accessibility, analytics/conversion measurement, the fee page the copy now points nowhere to,
   rollback story, the parallel-agent merge risk on a shared unpushed branch 25+ commits ahead.)
4. Absence-first: what should exist in this plan that nobody has mentioned at all?
5. Rank your findings: P0 (blocks Slice A), P1 (must land during A/B), P2 (backlog).

Format: numbered findings, severity-tagged, each with a one-line concrete remedy. No praise.
