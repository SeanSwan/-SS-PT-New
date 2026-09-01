# Game feel — why a correct game can still be un-fun

**The one idea:** every rule in the round works, and the game is still bad. "Feel" is not polish
sprinkled on at the end — it is a small number of *timing* decisions, each of which is one constant
you can change today.

## The moment this becomes obvious

Slice 5 gave the round contact damage: an enemy touching you costs a life. That rule is correct, and
on its own it makes the game unplayable — because it runs **once per frame**. At 60fps a single bump
is 60 lives a second. Three hit-points last you 50 milliseconds.

Nothing is broken. The rule is exactly what it says. It simply has no *feel*.

```js
/** Seconds of mercy after a hit, so one touch is not three instant deaths. */
const INVULN_SECONDS = 1.0;
```

That constant is the whole fix, and every game with contact damage has one. Mario flashes. Doom
flashes red. Dark Souls gives you invulnerability frames on the roll — "i-frames" is the term, and
it is the same idea.

## The four numbers that ARE the feel of Aftertaste

| Constant | Where | Now | Turn it up and… | Turn it down and… |
|---|---|---|---|---|
| `INVULN_SECONDS` | `state/store.js` | 1.0 | you can wade through a crowd | one mistake is the whole round |
| `ENEMY_SPEED` | `enemies/steering.js` | 2.2 | you are cornered, tense | you are never threatened |
| `waveSize(n)` | `systems/waves.js` | `1 + n*2` | the ramp bites early | it never gets hard |
| `spawnRing` radius | `state/store.js` | 18 | you get breathing room between waves | waves land on your head |

**`SPEED` (5) vs `ENEMY_SPEED` (2.2) is the most important relationship in the game.** The ratio,
not either number, decides whether the game is about *dodging* or about *positioning*. Make enemies
faster than the player and there is no game left — only a countdown.

## The honest test: play it for two minutes

There is no automated test for fun. The suite proves the round *works*; only playing proves it is
worth playing. That is why this slice is called the **fun probe** — its purpose is to reach a state
you can actually play, early, while changing a number is still cheap.

When you play, watch for exactly these:

- Do you ever feel **cornered**, and does escaping feel like *you* did it?
- Is dying ever a **surprise**? (If so, the feedback is missing, not the difficulty.)
- Is wave 3 different from wave 1 in any way that matters?
- Do you want **one more go** after dying? That question is the whole test.

## Feedback is half of feel

A hit the player does not *see* reads as the game cheating. Aftertaste's feedback is deliberately
the cheapest possible version of each:

- Damaged enemies go **darker** (`hp > 1 ? '#C4462F' : '#7A2418'`) — you can see what is nearly dead.
- The HUD shows **HP, Wave, Kills, Remaining** — four numbers, no menus.
- Death is a **screen**, not a silent reset, with the score you reached and one button.

Each is one line. None needs art. When you add sound later, it slots into these same moments —
which is why they exist now rather than "after the art".

## The bug this slice actually taught

Both round rules were unit-tested and correct. The game was still unloseable, because `tick`
suppressed damage during the mercy window by handing the round rules an **empty enemy list** — and
an empty list also means *"wave cleared"*. So every hit advanced the wave and respawned the flock
far away.

Neither unit test could see it. The defect was in the **seam** between two correct units, and only a
test written at the level where they compose (`tests/store.test.mjs`) catches it.

> **Suppress the consequence, never the input.** The moment you fake a function's input to change
> its output, you change every *other* thing that function derives from that input too.

## What you can now do

Open `state/store.js`, change `INVULN_SECONDS` to `0.2`, play a round, and change it back. You will
feel the difference immediately — and you will have changed the feel of the game by editing one
number, which is the point of keeping all four of them named and in one place.
