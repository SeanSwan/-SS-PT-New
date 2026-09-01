# Steering vs pathfinding — why 40 monsters can't each run a pathfinder

**The one idea:** there are two completely different ways to make something chase you, and picking
the wrong one is how a browser game dies at 20 enemies.

## Pathfinding

**Pathfinding** (usually the A* algorithm) treats the level as a map of connected squares and
*searches* for a route: "from here to the player, avoiding walls, what is the shortest path?" It
gives you genuinely clever behaviour — going around a wall, through a doorway, taking the long way
when the short way is blocked.

It also **costs a search, per monster, per re-plan.** The cost grows with the size of the map. One
monster: free. Forty monsters re-planning as you move: your frame rate is gone.

And there is a second cost nobody mentions: you need a **navmesh** — a hand-authored simplified
floor telling the algorithm where walking is legal. That is a thing you have to build and maintain
for every level.

## Steering

**Steering** asks a much smaller question, every frame, per monster:

> *"Which way is the player, and who am I standing on?"*

No map. No route. No search. Just a direction, computed with a few subtractions. It is
so cheap you can do it for hundreds of monsters and never notice.

The trade: steering is **blind**. It will walk a monster straight into a wall, because it does not
know the wall exists. In an open food court with nothing to route around, that costs you nothing —
which is exactly why it is right for Aftertaste *today*.

## The two rules in `src/enemies/steering.js`

These are the classic pair, from Craig Reynolds' 1987 "boids" work — the same three rules behind
every flock of birds in every film since:

- **SEEK** — move toward the target.
- **SEPARATE** — do not stand inside your neighbour. Closer neighbours dominate the escape
  DIRECTION (the blend weights by 1/distance), but the final push is normalised to constant
  strength — `SEPARATION_WEIGHT` sets the shove, not proximity. Tune the weight.

**Seek alone is not enough**, and this is the bit worth remembering: with only seek, every monster
computes the same direction and they collapse into a single stack — one box wearing 39 hats. It
looks broken. Separation is the entire difference between "a stack" and "a swarm". Two simple rules,
added together, produce behaviour that reads as intelligent. That is the trick.

## When to switch to pathfinding

Do not switch on instinct — switch on a **tripwire**. Aftertaste's is: **walls arrive** (Slice 10,
the food court). And the honest tripwire is wider than "monsters need routes" — walls break FOUR
systems at once, and a plan that fixes only the first ships three holes (GLM-5.3 hostile review):

1. **enemy steering** — the one everyone remembers: seek walks monsters into walls forever;
2. **player movement** — `movement.js` has no collision at all; you would walk through the walls
   that were the point of the slice;
3. **hitscan occlusion** — `hitscan` tests enemies only, so every shot passes through cover:
   one-way cover for the AI, decoration for you;
4. **spawn validity** — a spawn ring does not know about rooms; it will place monsters inside
   walls.

(An agent-COUNT tripwire used to live here — "~30 agents needing real routes." The wave cap is 40
and the game runs fine, because in an OPEN arena no agent needs a route at any count. The count
was never the trigger; geometry is. A wrong threshold you memorised is worse than none.)

Until walls trip it, steering is not a shortcut — it is the correct engineering choice.
Knowing when you do **not** need a tool is a senior skill, and it is worth as much as knowing how to
use one.

## Two traps this code guards against

**Divide by zero.** A direction is computed by dividing by the distance. When a monster is exactly
on the player — which happens — that distance is 0, and the result is `NaN`. A `NaN` position does
not throw an error. It silently removes the monster from the visible world. There are tests for
exactly this in `tests/steering.test.mjs`, because it produces no error message to search for.

**Reading positions while writing them.** Every enemy steers against a *snapshot* taken before any
of them moved. If you updated in place, enemy 2 would react to enemy 1's already-moved position, and
the flock would develop a subtle lean that is almost impossible to diagnose later.

## You understand this when

You can make an enemy **flee** instead of chase by negating one vector — and say why that is a
one-line change here, but would be a real problem with a pathfinder.

## Watch

`apoFCaxUlg8` — Yuka steering behaviours (4 min). Yuka is a library that does what
`steering.js` does, plus more behaviours; worth seeing the vocabulary (seek, flee, arrive, wander).
