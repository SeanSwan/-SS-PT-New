# Collision without a physics engine

**The one idea:** the instinct is to install a physics engine. Ask what question you are actually
asking first — ours is *"is this box within X units of that box?"*, and that is one line of maths.

## What a physics engine actually does

`rapier`, `cannon`, `ammo` simulate **rigid-body dynamics**: arbitrary shapes colliding, stacking,
sliding, bouncing, joints, friction, restitution — solved every frame, for everything. That is a
genuinely hard problem, brilliantly solved, and it costs you a WASM download, memory, a simulation
step per frame, and a whole second world model to keep in sync with your own.

## What we need instead

> Is this enemy near enough to touch me? Does my aim line pass near that monster?

```js
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
touched = dist2(enemy, player) <= TOUCH_RADIUS ** 2;   // waves.js — contact
// and combat.js answers the aim question with the same idea along a ray (ray-vs-sphere hitscan)
```

Subtractions, multiplies, a comparison. **Note there is no square root** — comparing squared
distances gives the same answer, and `Math.sqrt` is the expensive part. That trick is worth
remembering; it appears everywhere in game code. (The top-down slices used the identical test for
click-to-shoot — `hits`/`fireAt`, deleted with that mechanic in the FPS slice; the maths survived
the control scheme because it was never about the mouse.)

## When you genuinely need the engine

Switch when the question changes, not when the enemy count grows:

- things must **stack** or rest on each other,
- you need **bouncing, sliding or friction** that feels physical,
- **arbitrary shapes** matter (a bullet through a doorway, not a blob near a blob),
- **ragdolls**, joints, or vehicles,
- you want the player **blocked** by walls rather than walking through them.

Aftertaste has none of those today. It is an open floor with boxes. The moment there are walls the
player must not walk through, revisit this page.

## The broad-phase, for when it gets big

Right now every shot checks every enemy, and separation checks every enemy against every other:
that grows with the SQUARE of the flock. Honest numbers at honest scales: at the wave cap of 40,
all-pairs is 1,600 comparisons — microseconds, nothing, and the reason the cap is safe. At 500 it
would be 250,000 per frame, which is where you would START measuring (not where the frame rate
automatically dies — JS does hundreds of millions of simple ops a second; rendering usually falls
over first). The lesson is the quadratic GROWTH, not a scary number.

The fix is a **spatial hash grid**: divide the floor into cells, put each enemy in its cell, and only
compare against neighbours in nearby cells. It turns "check everything" into "check the nine cells
around me". That is the next optimisation when the flock grows, and `SimonDev`'s spatial hash grids
video (`sx4IIQL0x7c`) is the clearest explanation of it.

## Why everything here is a pure function

`damage()` returns a **new** enemy instead of editing the one you passed in. That is not
fussiness: the enemy flock steers against a **snapshot** each frame, and a mutating `damage()` would
edit the objects inside that snapshot mid-loop. The bug would show up as enemies occasionally
lurching, with nothing in the code obviously wrong.

## You understand this when

You can say what would have to become true for rapier to be the right call — and why "we have 40
enemies now" is not on that list.
