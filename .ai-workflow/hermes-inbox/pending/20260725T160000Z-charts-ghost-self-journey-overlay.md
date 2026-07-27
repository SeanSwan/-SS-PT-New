# Charts Ghost-Self "Your Journey" overlay SHIPPED (SWA-68)

- **When:** terminal VS Claude, fresh worktree C:/tmp/ss-charts-g3. Commit 3ec9763dc.

## What shipped
A reusable "Your Journey" (Ghost-Self) overlay for trend charts. The client's OWN real
series is split into a faded/dashed "earlier you" segment flowing into a vivid "present
you" segment - same real timeline + axis, no fabricated comparison - with a neutral
"+X since <start>" delta badge. First host: WeightProgressionLive. Graceful fallback to
the plain line for < 4 points; honest empty state kept.

- ghostSelf.ts: pure buildGhostSelf(series, {unit, higherIsBetter}) -> {ghost, current
  (share the split point), startPoint, bestPoint, latestPoint, direction-aware
  startDeltaLabel, improved} | null. Drop-in for body fat / est-1RM / any trend.

## Key honesty decisions (transferable)
1. **Don't fake the "racing ghost."** The blueprint's vision was a 90-days-ago past-you
   racing current-you. A single logged series can't honestly show that (needs a prior-
   window endpoint). So v1 = faded-past->vivid-present on the ONE real line (no misleading
   x-axis, no invented data); the true two-window overlay is a v2 gated on a comparison
   endpoint. When the vision needs data you don't have, ship the honest subset + name the
   gap - don't fabricate.
2. **Direction-neutral metrics have no "best."** Internal hostile pass caught it: I first
   rendered a gold "personal best" marker at the MAX weight - but for a weight-LOSS client
   the max is their WORST point. Removed the marker on the direction-neutral weight chart;
   bestPoint stays in the module only for direction-KNOWN metrics. Lesson: a "best"/"peak"
   marker requires a known good direction; weight/measurements without a stated goal don't
   have one.

## Proof
ghostSelf 5/5 + WeightProgressionLive 3/3; 311 consumer tests (Charts+Social+client-dash);
build exit 0; guards clean. DRY-LOOP CLEAN x2 (rounds: 3).

## Loop state
Shipped this arc on charts: Rule 76 upgrade, G1/G4/G5/Gravity/G3a, a full 3-reviewer
hostile review (8 fixes), and now Ghost-Self. Remaining net-new (Sean sequences):
Constellation correlation, Milestone->Ring-facet, Weekly Proof Digest, Proof Reel video,
and the chart->Coach hive-mind link (still blocked on the parallel SWA-65 intent log).
