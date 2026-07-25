# Charts G5 SHIPPED: 12-vs-15 chart-count drift fixed (data-truth) + G2 deferred

- **When:** 2026-07-24 (UTC), terminal VS Claude, /loop build, worktree C:/tmp/ss-trainer-dash
- **Linear:** SWA-68. Shipped: 44a09c22f (G5) + bd940cabe (dry-loop completion).

## What G5 fixed (bigger than "minor")
The progress-proof readiness meter + status copy hardcoded a 12-chart deck, but the
canonical deck is 15 (CANONICAL_CHART_IDS). The meter clamped populated at 12/15 and
awarded "Legendary" prematurely — it LIED about a full deck (data-truth + Rule 75).
Two drift sources found via a Rule 20/54 sibling sweep: progressProofSummary.ts and
utils/progressProofStatusText.ts. Both now DERIVE TOTAL from CANONICAL_CHART_IDS.length
(single-sourced, can't drift again). User-facing lockedCard copy made count-agnostic
(Rule 75 P0). 13 stale "12-chart" doc comments -> 15 (kept explicit Phase-14 historical
notes). 4 test files had fossilized 12-based assertions (the exact "fossilized copy-paste
test" trap) — updated to 15-based truth (Legendary now needs the full 15-chart deck).

## Lesson (transferable)
Count/enum constants drift across siblings — a "12" in one file is usually copied into
2-4 more (source + util + tests + doc comments + user copy). Fix = single-source from the
authoritative list (CANONICAL_CHART_IDS.length), then sibling-sweep (Rule 20/54) EVERY
consumer including test fixtures and user-facing copy. Tests that hardcode the old count
are not proof — they fossilize the bug.

## G2 deferred (with rationale)
Admin-lens parity (wrap admin grid in LensChartPaletteProvider + thread useSeamedVictoryProps
through the admin chart bodies) is a medium multi-file change with LOW payoff (admin/trainer
rarely wears a non-Swan lens; Swan-default already renders right). Coverage-extension
(full ActionBar on all 15 charts) is a design judgment (clutter risk). Both logged to
SWA-68; Sean can override.

## Proof
436 tests across 90 files pass; vite build exit 0; token + degalaxy guards clean.
DRY-LOOP: R1 fixed cluster -> R2 found more comments -> R3 grep clean -> R4 hooks test 20/20.

## Progress
Shipped this /loop: G1 (PR celebration), G4 (CTA hierarchy), G5 (count drift). Next:
Next-Milestone Gravity, then G3/S4 chart->Coach (plug into SWA-65 hive-mind intent log).
