# Input → state → render (and why delta matters)

**The one idea:** a key press does not move anything. It changes a *value*. The game loop reads
that value each frame and decides what it means.

## The three habits this buys you

**1. Never move things from a key handler.** `keydown` fires at the operating system's key-repeat
rate — irregular, and different on every machine and every OS. Movement driven from it is jittery.
Movement driven from a per-frame read of *"is W currently down?"* is smooth everywhere. That is why
`useKeyboard.js` only records booleans and never touches a position.

**2. Multiply by `delta`, always.** `delta` is how many seconds passed since the last frame. If you
add a fixed amount per frame instead, your player moves **twice as fast on a 120 Hz monitor** as on
a 60 Hz one. Multiplying by delta makes speed "units per second", identical on every machine. This
is why every engine hands you a delta, and why `SPEED = 5` in `movement.js` means 5 units per
second, not 5 per frame.

**3. Normalise diagonals.** Holding W and D naively adds 1 to both axes. The length of (1,1) is
1.414, so the diagonal is 41% faster than straight — the "strafe-running" bug that shipped in real,
famous games. Dividing the direction by its own length fixes it. There is a test for exactly this in
`tests/movement.test.mjs`, because it is the kind of bug you cannot see by looking.

## Why the movement rule is a plain function

`step(position, keys, delta) -> position` lives in `src/player/movement.js` with no React in it.
That means it can be tested in milliseconds with no browser, and you can read the entire rule on one
screen. **Rules of the game go in files like this. Components just draw the result.**

## Why the third-person camera lagged — and why the FPS camera must NOT

The top-down slices' follow camera (`cameraFollow.js`, retired with the FPS pivot) moved a
*fraction* of the way toward its target each frame; the lag read as "smooth" and is behind almost
every third-person camera you have used. The first-person camera does the OPPOSITE — it snaps to
the eye and to the aim, 1:1, every frame (`FpsRig` in App.jsx) — because in first person the
camera IS your head: any smoothing between your hand and your view reads as swimming aim, and
enough of it reads as motion sickness. Same lesson, opposite conclusions: smoothing is a choice
about what the camera *is*, not a default you sprinkle on.

## You understand this when

You can add a "run" key by changing `movement.js` alone, without touching a component — and say why
that is the right file to change.

## Watch

`zwNF1-lsia8` from 8:00 (Wawa Sensei) — the state-management half.
