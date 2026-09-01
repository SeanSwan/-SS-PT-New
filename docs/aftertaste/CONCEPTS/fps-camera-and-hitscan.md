# The FPS camera and hitscan — shooting like Overwatch actually works

**The one idea:** a first-person shooter is three small systems agreeing about one pair of numbers.
Your AIM is just yaw (spin) and pitch (tilt); the camera renders it, movement steers by it, and the
gun fires along it. Everything that feels like magic in an FPS is those two numbers being shared.

## The aim is two numbers, and that is a feature

Storing the aim as yaw + pitch (see `aim.js`) instead of a rotation object buys three things:

1. **Clamping is one line.** You cannot look past straight-up because pitch is `Math.min`'d.
   Clamping a quaternion is genuinely hard; clamping a number is trivial.
2. **Roll cannot happen.** A rolled FPS camera reads as being drunk. With only two numbers there is
   no way to express roll, so no bug can introduce it.
3. **Movement can reuse the yaw.** W means "the way I am facing" — that is one 2D rotation of the
   input by yaw (`movement.js`), and deliberately NOT by pitch: looking at the floor must not make
   walking drive you into it.

The camera applies the two numbers in **YXZ order** — spin first, then tilt. Any other order makes
diagonal looking roll the horizon.

## Pointer lock — why mouse-look needs permission

A normal cursor stops at the screen edge, so "keep turning right" is impossible. The browser's
`requestPointerLock()` hides the cursor and switches the mouse to reporting RELATIVE motion
(`movementX/Y`) — exactly what an aim wants. Two rules the browser enforces: it must be requested
from a real user gesture (our click), and Esc always exits — the player can always leave. Lock
gates LOOKING only; firing works without it, which is also what keeps the game testable in
headless browsers, where lock is refused.

## Hitscan — the shot is a ray test, the tracer is decoration

When you fire in Overwatch or Battlefield, most guns do not launch a simulated bullet. The game
draws a straight line from your eye THE INSTANT you click, and whatever that line crosses first is
hit. That is **hitscan**. The alternative — a real projectile with travel time — is an object
simulated every frame. Start with hitscan; earn projectiles.

The mathematics is ray-vs-sphere and it is three lines (see `combat.js`): project the vector to
the monster's centre onto the ray (one dot product) to find the closest approach, compare that
distance to a radius, take the nearest along the ray. Enemies behind you have a negative
projection and are skipped — a gun does not shoot backwards.

The trigger itself is a FRAME SYSTEM, not a click handler: mousedown only records intent, and the
frame loop fires — first shot instantly, then one per interval while held. That is what "automatic
weapon" means in code.

## The feedback pair: crosshair and hitmarker

The crosshair is plain HTML at 50%/50% — honest for free, because the hitscan ray and the screen
centre both derive from the same camera; they cannot disagree. The hitmarker is the Overwatch ✕
that flashes only when a shot CONNECTS (white = hit, red = kill). It is keyed by the hit's
timestamp so React re-mounts it each hit and the fade animation replays. Without it, at range you
genuinely cannot tell whether you are hitting — the monster is 40 pixels tall.

## What eye height broke, and what fixed it

Dropping the camera from y=13 to y=1.6 broke the floor twice over: the GridHelper's line
primitives now crossed behind the camera from a standstill (the clipping failure from
`debugging-by-elimination.md`, instantly), and the floor's edge sat in plain view. The fixes are
both worth stealing: the grid became a **repeating texture painted on the floor** — a textured
triangle cannot lose its stripes to line clipping, because there are no lines — and **fog** the
colour of the background now swallows the distance before the floor edge could show. Monsters also
gained a faint emissive ember: at eye height you mostly see the unlit side of things, and a threat
that fades into darkness is not difficulty, it is a missing render.

## What you can now DO

Wire an FPS control scheme from parts: keep aim as clamped yaw/pitch, drive the camera in YXZ from
it, rotate movement input by yaw only, request pointer lock from a click, and resolve shots with a
ray-sphere hitscan fired from the camera by a frame-loop trigger. And when someone says "make the
shooting feel like Overwatch," you know the checklist hiding inside that sentence.
