# Debugging by elimination — the grid that stopped drawing

**The one idea:** when a renderer misbehaves, do not theorize at the screenshot. Design pairs of
runs that differ in exactly ONE thing, and let the differences pin the cause. This card walks the
real hunt from Slice 6, because the defect it found was invisible to every test we have.

## The symptom

Drive forward for two seconds and the floor grid mostly vanishes: one family of lines gone, the
scene reading broken. Every unit test green. Every browser test green. The scene graph unchanged —
the grid was *in the scene* the whole time. It just was not being *drawn*.

## The eliminations, in order

Each run changed one variable. Write yours down as you go — the list IS the diagnosis.

1. **Same wait, no driving** → clean. So it is movement-triggered, not time-triggered. (This
   killed half the hypothesis space in one run: nothing that accumulates over time — mixers,
   memory, shadows re-rendering — can be the cause.)
2. **Same drive, previous slice's code** (work stashed) → still broken. So the new slice did not
   introduce it; it was always there, waiting for someone to drive and then *look*.
3. **Probe the camera numbers** → position and pitch relative to the player identical in clean and
   broken states. So it is not the camera. Whatever breaks depends on *absolute world position* —
   the only thing that differs between the two states.
4. **Lift the grid half a unit** (live, in the console) → no visible change. Surprise: the lines
   still on screen are NOT the grid. (A probe that surprises you is worth three that confirm.)
5. **Paint the grid red** → the surviving lines turn red. Revision: they ARE the grid — but only
   the lines running left-right. The lines running *away from the camera* are the missing family.
6. **The pin:** the missing family's endpoints sit far BEHIND the camera after driving (the grid
   is fixed at the origin; the camera moved into it). Lines that cross behind the camera must be
   *clipped* by the GL layer — and on Windows the browser's GL-to-Direct3D translation visibly
   fails at exactly this, once the crossing is deep enough. Left-right lines never cross behind
   the camera, which is why they survived. Everything observed, explained.

## The fix follows from the cause

If the breakage depends on absolute position, make absolute position stop mattering: the floor,
grid, and sun now FOLLOW the player (`Ground.jsx`, `SunLight` in `App.jsx`). The scene becomes
translation-invariant — geometry relative to the camera is forever the arrangement that provably
renders correctly. Bonus: the floor is now effectively infinite, and the shadow box can no longer
be walked out of.

One subtlety worth stealing: the grid follows in **whole-unit snaps**, not continuously. Its whole
job is to be a fixed feature your eye measures motion against; a grid that glides with you destroys
the exact thing it exists for. Snapping to its own cell size keeps every line exactly where an
infinite grid's lines would be.

## Why no test caught it, and what guards it now

"The grid rasterized its lines" is not reachable from JavaScript — the scene graph looked perfect
while the picture was wrong. This class of defect is caught by **looking at screenshots**, which is
why the slice checklist has a screenshot-review step that a green suite cannot replace.
`tests/world.spec.js` guards the *fix* (the anchors follow the player) so it cannot quietly revert.

## What you can now DO

Given a "sometimes it renders wrong" report: reproduce it, then bisect the CONDITIONS (time vs
input vs code version vs position) with single-variable runs before touching any code — and when
you meet a bug that depends on absolute coordinates, reach for translation-invariance as a fix
rather than a bigger world.
