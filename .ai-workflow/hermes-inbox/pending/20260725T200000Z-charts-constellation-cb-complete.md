# Charts Constellation COMPLETE (C-a core + C-b visual) SHIPPED (SWA-68)

- **When:** terminal VS Claude /loop, worktree C:/tmp/ss-charts-g3. C-b commit 2e4e7908f.

## What shipped
MetricConstellation - the visible "how your metrics connect" panel. Reads the canonical
charts bundle, runs the C-a correlation core over the 7 correlatable series, renders the
strongest few as plain-language rows ("Training Volume and Body Weight rise and fall
together" / inverse "move in opposite directions") + a strength meter + "N shared points".
Mounted in CanonicalProgressChartsGrid after the composite views.

Honesty by construction: microcopy says "This is correlation - not proof that one causes
the other"; the panel returns null unless a real, well-sampled relationship clears the
C-a guards (flat/thin-overlap/weak-|r| all dropped). It can NEVER show a fake connection.

## HONEST LIMITATION (disclosed, not a code fix) - transferable
Correlations only align metrics that SHARE x-axis labels. The logic + component are proven
with synthetic data (10 tests), but whether REAL production metrics share enough x-labels
to surface a correlation is UNVERIFIED - the canonical series may use different x formats
(week label vs date). The code is correct either way (shows nothing rather than a false
positive), but the FEATURE's real-world visibility needs verification with real logged data,
or a backend change to emit a common time index across metrics. Flagged to Linear as an
open verification hook. Lesson: a correlation/join feature is only as visible as the key
alignment between its inputs - verify the join keys match in production, not just in tests.

## Proof
MetricConstellation 3/3 (together + inverse + renders-nothing-on-flat) + correlationInsights
7/7; 322 grid-consumer tests; build exit 0; guards clean. DRY x2.

## Loop state / next
Shipped this /loop: Ghost-Self v1(+6 fixes) + v2 body-fat + Constellation (C-a + C-b).
Next: Ring-facet (chart milestone -> Crystal Ring facet/companion - touches the ring
system on the client home, cross-cutting), then Weekly Digest, Proof Reel. chart->Coach
still blocked on SWA-65.
