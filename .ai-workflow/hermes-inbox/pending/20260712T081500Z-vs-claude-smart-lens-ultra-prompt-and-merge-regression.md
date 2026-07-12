# Hermes memo — Smart Lens ultra prompt shipped + merge-regression lesson
- Surface: vs-claude (Fable 5, lens-vision session)
- UTC: 2026-07-12T08:15:00Z

## What happened
- **Canonical Smart Lens build bible shipped to main** @ ed55bb616:
  `docs/ai-workflow/brainstorms/smart-lens-os-ultra-prompt-2026-07-12.md`.
  Synthesis of Codex REVISE verdict + GPT Pro deep-research review + Fable
  corrections, Sean-ratified direction. Key doctrine: Experience Compiler
  (lens = governed experience program, never code injection); dual-track
  roadmap (Track 1 Swan-value-now, Track 2 marketplace = Sean+chromie
  gated); Chart Charter (Big Three identity anchors, data-truth
  lens-immutable, familiarity budget conservative-by-default); real-event
  moment allowlist mapped to EXISTING backend signals; Comfort Lock
  (a11y policy overrides everything, never sold); Golden Pair PR spec is
  the ONLY next code slice (Candy Glass Arcade vs Prism Terminal must
  repaint the same World's interior, >=5 measured axis deltas).
- **Merge-regression caught + restored** @ a2c39b98c: reconciliation merge
  aaa913d8c (storefront-deals branch -> main) silently resolved the 3
  ScheduleDayStrip files to their pre-fix state, reverting the Codex
  REVISE repairs (scrollBy guard, out-of-window re-anchoring) on main.
  Restored verbatim from cf8ac3ea7, 6/6 exit 0, deploy re-verified.

## Why it matters to Hermes
- **Permanent lesson (promote):** after ANY reconciliation merge between
  parallel agent branches, run a file-level diff of every recently-shipped
  batch's touched files vs the merge result (Rule 20 sweep post-merge).
  Merge conflict resolution can silently pick the stale side and history
  still SHOWS the fix commit — grep the WORKING TREE for the fix's marker
  strings, not the log.
- Smart Lens questions from Sean now have one canonical answer doc; any
  agent asked about lenses/Forge/Atelier/charts routes there first.
- §16 of the doc = 6 open taste questions Sean owes (Forge access tiers,
  pricing/rarity, prescription defaults, Big Three trio, admin
  familiarity, naming).

## State right now
- main @ ed55bb616 deployed; lens v5 live (scoped previews, real A/B
  compare, nebula Lab, day strip restored).
- Next slice: free triangle review of the ultra prompt, then Golden Pair
  PR (feat/smart-lens-recipe-v2-golden-pair).

## Sean owes / blockers
- §16 taste answers; triangle-go for the doc review; chromie gate before
  any Track 2 (marketplace) work.
