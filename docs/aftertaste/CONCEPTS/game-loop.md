# The game loop

**The one idea:** every game, from Pong to Call of Duty, is the same loop running about 60 times a
second:

```
forever:
    read input      (what keys are down, where is the mouse)
    update state    (move things, check hits, spawn things, subtract health)
    draw            (paint the current state onto the screen)
```

That is it. Everything else is detail hung off those three steps.

## Why this matters more than it sounds

Two habits come straight out of it, and both prevent bugs you would otherwise spend days on:

**1. Input never draws anything.** Pressing `W` does not move the box on screen. It changes a
*value* ("the player is holding forward"). The update step reads that value and changes the
player's position. The draw step paints wherever the player now is. If you ever find yourself
changing what is on screen directly from a key handler, that is the bug.

**2. Nothing is "a thing that moves itself".** A monster does not move. Each frame, the update step
moves every monster a little. That sounds pedantic until you need to pause the game, or replay it,
or run it slower — all of which are free if the loop owns the movement, and impossible if each
monster owns a timer.

## Where the loop is in this project

You never write the loop yourself in React Three Fiber. `<Canvas>` (in `src/App.jsx`) starts it for
you. You describe *what is in the world* with components, and the loop draws them.

When you need to do something *every frame* — that is Slice 2 — you use the `useFrame` hook. That
function body IS the update step, for that one object.

## You understand this when

You can point at `<Canvas>` in `src/App.jsx` and say out loud: *"the loop is in there, and my
components are the 'what to draw' half of it."* And you can explain why a key handler should change
a number rather than move a box.

## Watch

`zwNF1-lsia8` (Wawa Sensei — 3D game with R3F), first 8 minutes. Stop when he starts on state
management; that is Slice 2's concept, not this one.
