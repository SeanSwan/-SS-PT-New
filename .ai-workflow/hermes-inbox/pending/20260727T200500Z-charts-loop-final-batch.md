# Charts /loop FINAL BATCH — Proof Facet Rail + Latest Movement + Proof Reel (SWA-68)

- **When:** terminal VS Claude /loop, worktree C:/tmp/ss-charts-g3.
- **Commits on main:** Facet Rail d45a91456 (pushed) ; Digest 7fdb7a2ef + Reel fa3e87ae3
  (batch-pushed d45a91456..fa3e87ae3). Frontend-only; backend untouched (health stayed 200).
  Render deploy IN FLIGHT at close (new grid chunk 404 = still building) — compile-time
  wiring VERIFIED, live-chunk verification is the one pending step.

## What shipped (all real-data, honest-empty, Swan-Lens tokened, DRYx2)
1. **Proof Facet Rail** (proofFacetLadder.ts + ProofFacetRail.tsx): the earned proof-tier
   ladder (Spark/Momentum/Apex/Legendary) lit ONLY from real populated-chart count.
2. **Latest Movement digest** (chartMovementDigest.ts + LatestMovementDigest.tsx): one-glance
   week-over-week deltas from the chart bundle; neutral metrics never colored good/bad.
3. **Proof Reel** (proofReel.ts + ProofReelStrip.tsx): swipeable montage of the client's OWN
   real proof moments (level/PR/gain), share-caption-ready via existing buildChartMomentCaption.

## Three honest scope calls worth carrying (Rule 76/74/75 in action)
- **Ring-facet -> Proof Facet Rail:** a NEW chart-milestone ring would have DUPLICATED/fought
  the mature level-indexed CrystalProgressRing (Sean+Kimi mandated index-to-LEVEL). Grounding
  caught it; built the earned-ladder view instead. Lesson: ground before building a "ring/
  milestone" thing — a signature one already exists.
- **Weekly Digest -> Latest Movement:** WeeklyRecapCard already shows weekly GAMIFICATION
  stats. Built a distinct chart-MOVEMENT lens instead, titled truthfully ("Latest movement",
  not over-claimed "this week"). Lesson: two "weekly" cards is duplication; find the missing lens.
- **Proof Reel is NOT a Seedance video.** A rendered video needs a backend Seedance->R2
  pipeline (out of a chart slice's lane, collision-prone). Faking "generated a video" = a false
  done. Shipped a real montage of real proof cards; flagged the video-render as a genuine
  FUTURE backend hook. Lesson: when the named feature needs infra you can't truthfully stand
  up, ship the honest in-lane version and flag the rest — never fake the "done".

## Recurring gotcha (carry this)
Case-only filename collision: proofFacetRail.ts (core) vs ProofFacetRail.tsx (component) differ
only by first-letter case -> on Windows the .ts SHADOWED the .tsx (component import = undefined),
and two case-variant files is a Render-Linux landmine. Fix + convention: core and component get
DISTINCT names (correlationInsights.ts + MetricConstellation.tsx), never case-variants.

## UX note for Sean (not a defect)
Top of the progress grid now has several summary surfaces (cockpit, facet rail, movement
digest, proof reel) that each derive from the same proof data via different lenses. All honest
+ distinct-job, but the density is worth a look — a future consolidation could merge some.

## Proof
Per-slice: Facet Rail (proofFacetLadder 7/7 + ProofFacetRail 3/3), Digest (chartMovementDigest
8/8 + LatestMovementDigest 3/3), Reel (proofReel 5/5 + ProofReelStrip 3/3). Each: 249 grid-
consumer tests, build exit 0, token + degalaxy guards clean, DRY-LOOP CLEANx2.
