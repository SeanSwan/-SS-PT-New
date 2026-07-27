# Charts G3a Coach Read SHIPPED + the fresh-worktree collision-avoidance technique

- **When:** terminal VS Claude /loop, fresh worktree C:/tmp/ss-charts-g3 (off origin/main)
- **Linear:** SWA-68. Shipped: 8f5aaf7a8 (G3a) + ead70a33c (ASCII fix).

## G3a Coach Read (self-contained, no SWA-65 dependency)
The charts stated WHAT happened; now they say WHAT TO DO - the "decide the next training
action" beat of the Product Core Loop. A local coachAction is synthesized from the
existing pulse tone + gravity (no backend, no LLM): record -> "keep this stimulus";
rising -> "<gap> from your best, one more quality session closes it"; steady -> "add
progressive overload to break the plateau"; falling -> "check recovery, sleep, volume".
Rendered as an accent-tinted CoachRead line; dropped the now-redundant "Next target" text
(gravity bar + coach read cover it). The one-tap chart->Coach HIVE-MIND handoff is DEFERRED
- it depends on the parallel in-flight SWA-65 intent log; coordinate when that settles.

## TRANSFERABLE TECHNIQUE: fresh-worktree collision avoidance (Rule 67)
Two agents were live-editing the SAME worktree (C:/tmp/ss-trainer-dash) in the SAME area
(progress-proof + a trainer-permissions backend workstream, 132 uncommitted foreign files).
A dirty tree blocks `git rebase` (needed to push when behind), and `git add -A` would sweep
the other agent's WIP (the classic incident). RESOLUTION: cut a FRESH worktree off
origin/main (`git worktree add -b <branch> <path> origin/main`) which already contains ALL
shipped work from BOTH agents, `npm install` it, and continue there - leaving the other
agent's uncommitted work 100% untouched. Clean FF pushes resume immediately. This is the
clean way to keep building when a worktree is contended.

## Sean's reframe (important)
On discovering the collision I over-indexed on "stop, panic." Sean corrected: the question
that matters is "is the other work an UPGRADE and does it coexist?" - not the mechanics.
It was: additive (+25/-5 to my file, my work preserved), a real data-truth feature
(range-distinctness gating), tested (14 backend test files), and my own G5 15-chart fix even
matched their established "15-chart deck" convention. Lesson: assess quality/coexistence
first; the git mechanics are solvable (fresh worktree).

## Proof
vitest CoachRead 6/6; broader consumers 650/134 files; progress-proof 63/63; build exit 0;
guards clean. DRY-LOOP CLEAN x2 (rounds: 4).

## Loop state
Shipped this /loop: G1, G4(+fix), G5, Gravity, G3a - all upgrades to the existing
progress-proof module. Remaining: G3 hive-mind (blocked on SWA-65) + S5/S6 net-new
(Ghost-Self, Constellation, Ring-facet, Weekly Digest, Proof Reel) - these are large
standalone features needing Sean's sequencing, not quick upgrades.
