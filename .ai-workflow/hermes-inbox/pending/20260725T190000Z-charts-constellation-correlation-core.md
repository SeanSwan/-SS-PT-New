# Charts Constellation C-a: honest correlation core SHIPPED (SWA-68)

- **When:** terminal VS Claude /loop, worktree C:/tmp/ss-charts-g3. Commit 9362e2500.

## What shipped
The load-bearing math for the "Metric Constellation" (which of a client's OWN logged
metrics move together). Pure module correlationInsights.ts:
- computeCorrelations(series, {minOverlap, minAbsR}) -> ranked pairwise Pearson r over
  the metrics' SHARED x (time points).
- topCorrelation(...) -> strongest or null.
The canonical charts bundle exposes 7 directly-correlatable ChartPoint[] series
(workoutFrequency, weeklyVolume, durationTrend, intensityRpeTrend, recoverySignal,
weightTrend, bodyFatTrend) - the data the constellation reads.

## Honesty guards (the point of this slice)
correlation != causation. A flat/zero-variance series yields NO insight (denominator
guard). Pairs below minOverlap shared points or below |r|=0.5 are dropped (a correlation
on 3 points is noise). Only genuinely overlapping x points are correlated (non-finite y
dropped). So the constellation can NEVER invent a relationship - consumers MUST label
results "move together", never "causes".

## Split rationale
Constellation is the largest net-new chart feature. Shipping it as C-a (this tested math
core) then C-b (the visual + mount) keeps each unit small, proven, and independently
revertable, and de-risks the honesty math before any pixels.

## Proof
correlationInsights 7/7 (perfect +1/-1, flat->null, threshold + overlap guards, honest
shared-x alignment, ranking); build exit 0; guards clean. DRY x2.

## Loop state / next
C-b next: MetricConstellation visual (insight rows + strength + "correlation not
causation" microcopy) mounted where the canonical bundle is available (client grid).
Then Ring-facet, Weekly Digest, Proof Reel. chart->Coach still blocked on SWA-65.
