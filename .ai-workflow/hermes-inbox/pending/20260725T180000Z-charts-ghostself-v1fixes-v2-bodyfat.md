# Charts Ghost-Self: v1 hostile-review (6 fixes) + v2 on body fat SHIPPED (SWA-68)

- **When:** terminal VS Claude /loop, worktree C:/tmp/ss-charts-g3.
- **Shipped:** 1d42a191a (v1 review fixes) + 44c36a58d (v2 BodyFat).

## v1 hostile review found 6 real defects in the just-shipped overlay (fixed)
1. Faded/earlier half had NO hover tooltip (only the vivid line carried labels; the
   Voronoi container fired nothing on the ghost half) - a silent regression of documented
   behavior. Label BOTH lines.
2. Sub-rounding delta -> signed zero "-0 %" + FALSE "improved" tone. Derive sign + improved
   from the ROUNDED delta, not the raw one.
3. Empty-state guard checked RAW payload length; an all-NaN payload rendered a blank frame.
   Guard on the SANITIZED length.
4. Area(full series) + split lines(half each) both used `natural` spline -> stroke bows off
   its own fill + kinks at the join. Use `linear` on all layers.
5. Delta badge could wrap into a distorted pill on mobile. flex-shrink:0 + white-space:nowrap.
6. aria-label on a role-less <span> is unreliably announced. Use a visually-hidden text prefix.
Plus reuse caveat: GhostPoint.x widened string|number + filter aligned with sanitizeChartData
so a future numeric/time-axis reuse won't silently drop every point.

## v2: same module, direction-KNOWN metric (body fat)
Extended the reusable ghostSelf to BodyFatTrendLine. Because body fat is lower-is-better
(a strong convention, unlike weight's 50/50 gain-vs-lose), this chart HONESTLY earns the
pieces withheld from weight: a gold personal-best marker at the LOWEST reading + a tone-
aware badge (drop = success-green, rise/flat = neutral, never punitive). One import + a
direction flag - validating the module as reusable.

## Transferable lessons
- A shared Voronoi tooltip container only labels the series that DECLARE labels; adding a
  second (unlabeled) line silently kills tooltips on its region. Label every line.
- Round the value BEFORE deriving sign/tone, or you get "-0" and false "improved".
- Sanitize BEFORE the empty-state guard; raw length lies when all points are invalid.
- Split-series line + full-series area only align under `linear` interpolation.
- "Personal best" needs a KNOWN good direction: honest for body fat (lowest), NOT for
  weight (gain vs lose is client-specific).

## Proof
v1: ghostSelf 6/6 + WeightProgressionLive 4/4; DRY x2 (rounds:3). v2: BodyFat 3/3; 77
consumer tests; both build exit 0 + guards clean. 276 client-dashboard consumer tests green.

## Loop state
Remaining net-new: Constellation (cross-metric correlation - large, own iteration),
Ring-facet, Weekly Digest, Proof Reel. chart->Coach still blocked on SWA-65.
